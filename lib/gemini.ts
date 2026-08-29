// ---------------------------------------------------------------------------
// Cliente de Gemini. Todo lo que sabe de la IA vive aquí: cambiar de modelo o
// de proveedor no debería obligar a tocar la ruta ni el resto de la app.
//
// Corre sólo en el servidor: GEMINI_API_KEY nunca llega al navegador.
//
// Dos cosas mandan en el diseño de este archivo:
//  1. Los nombres de los modelos cambian. En vez de adivinar, le preguntamos a
//     Google qué modelos acepta esta key y escogemos entre esos.
//  2. Cuando algo falla queremos saber *qué* falló (sin key, sin cuota, muy
//     lenta…) para poder decírselo a la persona en vez de un "no pude". 😅
// ---------------------------------------------------------------------------

import {
  CATEGORY_LIST,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  categoryOf,
  formatMoney,
  splitBasket,
  type BasketItem,
  type CategoryId,
  type Kind,
} from '@/lib/finance'

/** Configurable para poder probar la cadena de respaldo sin salir a internet. */
const BASE_URL =
  process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta'

/**
 * Orden de preferencia. Para leer facturas va primero un modelo "flash"
 * completo: los "lite" leen bien un texto corto, pero se equivocan más con el
 * total de una foto. Para chat de texto sí preferimos el más rápido.
 *
 * GEMINI_MODEL (variable de entorno) manda sobre todo esto.
 */
/** Los "lite" son más rápidos, pero leyendo fotos de facturas se equivocan más. */
const ES_LITE = /lite/i

/**
 * Para una factura importa acertar, no la velocidad: los modelos completos van
 * primero y los "lite" quedan de último recurso.
 */
const PREFER_VISION = [
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-2.5-flash',
  'gemini-3.1-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
]

/** Para texto suelto ("mercado 120mil") el rápido sobra y se siente mejor. */
const PREFER_TEXT = [
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
]

/** Modelos que existen pero no sirven para esto (audio, imágenes, embeddings). */
const NOT_FOR_CHAT = /embedding|aqa|imagen|image-generation|tts|veo|live|native-audio|learnlm/i

/** Cuánto tiempo total nos damos antes de rendirnos (la ruta muere a los 30s). */
const DEFAULT_BUDGET_MS = 24_000

const VALID_CATEGORIES = new Set(CATEGORY_LIST.map((c) => c.id))

export type Entry = {
  kind: Kind
  amount: number
  category: CategoryId
  note: string
  occurredAt?: string
}

/**
 * Una corrección a un movimiento que YA está guardado. `ref` es el "#3" con el
 * que se le presentó al modelo en la lista de recientes: nunca le pasamos ids
 * de la base, así no puede tocar nada que no le hayamos mostrado.
 */
export type Correction = {
  ref: string
  category?: CategoryId
  amount?: number
  note?: string
}

export type GeminiContext = {
  text: string
  image: { base64: string; mimeType: string } | null
  nick: string
  humor: boolean
  currency: string
  monthlyIncome: number
  spendingCap: number
  monthLabel: string
  spent: number
  income: number
  breakdown: string[]
  recent: string[]
  /** Cómo clasifica esta casa: "corral → Antojos / Calle". Manda sobre las listas. */
  habits: string[]
}

// ---- Errores con nombre ----------------------------------------------------

export type AiFailure =
  | 'sin-key'
  | 'sin-modelo'
  | 'permiso'
  | 'cuota'
  | 'lenta'
  | 'red'
  | 'bloqueada'
  | 'vacia'
  | 'desconocida'

export class GeminiError extends Error {
  readonly failure: AiFailure
  readonly status?: number
  readonly model?: string

  constructor(failure: AiFailure, message: string, extra?: { status?: number; model?: string }) {
    super(message)
    this.name = 'GeminiError'
    this.failure = failure
    this.status = extra?.status
    this.model = extra?.model
  }
}

/** Una frase corta, en español, para mostrarle a quien está en el chat. */
export function describeFailure(error: unknown): { failure: AiFailure; message: string } {
  const failure = error instanceof GeminiError ? error.failure : 'desconocida'
  const message = {
    'sin-key': 'la IA no está configurada (falta GEMINI_API_KEY en el servidor)',
    'sin-modelo': 'el modelo de IA configurado ya no existe',
    permiso: 'la API key de la IA no es válida o no tiene permisos',
    cuota: 'se acabó la cuota gratis de la IA por ahora',
    lenta: 'la IA se demoró demasiado',
    red: 'no pude conectarme con la IA',
    bloqueada: 'la IA no quiso procesar esta imagen',
    vacia: 'la IA respondió vacío',
    desconocida: 'la IA falló',
  }[failure]
  return { failure, message }
}

function classifyStatus(status: number, detail: string): AiFailure {
  if (status === 429) return 'cuota'
  if (status === 404) return 'sin-modelo'
  if (status === 401 || status === 403) return 'permiso'
  if (status >= 500) return 'red'
  if (status === 400 && /api[ _-]?key|credential|permission/i.test(detail)) return 'permiso'
  return 'desconocida'
}

function classifyThrown(error: unknown, model?: string): GeminiError {
  if (error instanceof GeminiError) return error
  const name = (error as { name?: string })?.name
  if (name === 'TimeoutError' || name === 'AbortError') {
    return new GeminiError('lenta', 'La IA no respondió a tiempo', { model })
  }
  return new GeminiError('red', error instanceof Error ? error.message : String(error), { model })
}

// ---- Qué modelos tiene disponibles esta key --------------------------------

let modelCache: { at: number; models: string[] } | null = null
const MODEL_CACHE_MS = 10 * 60_000

/**
 * Los nombres de los modelos de Google cambian cada pocos meses y una key
 * nueva no siempre tiene acceso a los mismos. Preguntamos una vez cada diez
 * minutos y guardamos la lista en memoria.
 *
 * Si la consulta falla por red devolvemos [] ("no sé") y seguimos con la lista
 * de siempre; pero si falla por key inválida sí reventamos, porque eso hay que
 * decirlo.
 */
export async function availableModels(apiKey: string, timeoutMs = 8_000): Promise<string[]> {
  if (modelCache && Date.now() - modelCache.at < MODEL_CACHE_MS) return modelCache.models

  let response: Response
  try {
    response = await fetch(`${BASE_URL}/models?pageSize=200`, {
      headers: { 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch {
    return []
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    const failure = classifyStatus(response.status, detail)
    if (failure === 'permiso' || failure === 'cuota') {
      throw new GeminiError(failure, `No pude listar los modelos (${response.status})`, {
        status: response.status,
      })
    }
    return []
  }

  const payload = await response.json().catch(() => null)
  const models: string[] = (payload?.models ?? [])
    .filter((m: any) => (m?.supportedGenerationMethods ?? []).includes('generateContent'))
    .map((m: any) => String(m?.name ?? '').replace(/^models\//, ''))
    .filter((name: string) => name && !NOT_FOR_CHAT.test(name))

  modelCache = { at: Date.now(), models }
  return models
}

/** La lista de intentos, en orden, según lo que exista de verdad. */
export function chooseModels(available: string[], wantsVision: boolean): string[] {
  const fallbackList = wantsVision ? PREFER_VISION : PREFER_TEXT
  const candidate = process.env.GEMINI_MODEL?.trim()
  const list = [candidate, ...fallbackList].filter(Boolean) as string[]
  const unique = [...new Set(list)]

  if (available.length === 0) return unique

  const present = unique.filter((m) => available.includes(m))
  if (present.length > 0) return present.slice(0, 8)

  // Si ninguno de los preferidos existe, tirar de lo que haya: primero los
  // flash estables, y para fotos dejando los "lite" de últimos.
  const flash = available.filter((m) => /flash/i.test(m) && !/preview|exp/i.test(m))
  const completos = wantsVision ? flash.filter((m) => !ES_LITE.test(m)) : flash
  const lite = wantsVision ? flash.filter((m) => ES_LITE.test(m)) : []
  const rest = available.filter((m) => !flash.includes(m))
  return [...completos, ...lite, ...rest].slice(0, 8)
}

// ---- El prompt -------------------------------------------------------------

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reply: {
      type: 'string',
      description: 'Respuesta corta y cálida para el chat, en español colombiano.',
    },
    entries: {
      type: 'array',
      description: 'Movimientos detectados. Vacío si el mensaje era una pregunta o un saludo.',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['expense', 'income'] },
          amount: { type: 'number', description: 'Valor positivo en la moneda de la sala.' },
          category: { type: 'string', enum: CATEGORY_LIST.map((c) => c.id) },
          note: { type: 'string', description: 'Descripción corta del movimiento.' },
          date: { type: 'string', description: 'Fecha YYYY-MM-DD si el mensaje la menciona.' },
          items: {
            type: 'array',
            description:
              'Los productos de la compra con su valor, tal como aparecen en la factura o en el mensaje. Obligatorio en compras de supermercado.',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Nombre del producto o del grupo.' },
                amount: { type: 'number', description: 'Lo que costó ese producto.' },
              },
              required: ['name', 'amount'],
            },
          },
        },
        required: ['kind', 'amount', 'category', 'note'],
      },
    },
    updates: {
      type: 'array',
      description:
        'Correcciones a movimientos YA guardados. Sólo lo que cambia; el resto se queda igual.',
      items: {
        type: 'object',
        properties: {
          ref: { type: 'string', description: 'El "#N" del movimiento en la lista de recientes.' },
          category: { type: 'string', enum: CATEGORY_LIST.map((c) => c.id) },
          amount: { type: 'number', description: 'Nuevo valor, sólo si cambia.' },
          note: { type: 'string', description: 'Nueva descripción, sólo si cambia.' },
        },
        required: ['ref'],
      },
    },
    deletes: {
      type: 'array',
      description: 'Los "#N" de los movimientos que hay que borrar porque estaban de más.',
      items: { type: 'string' },
    },
  },
  required: ['reply', 'entries'],
}

function buildSystemPrompt(ctx: GeminiContext): string {
  const gastos = EXPENSE_CATEGORIES.map(
    (c) => `- ${c.id} (${c.label}): ${c.hints.slice(0, 8).join(', ') || 'lo que no encaje en otra'}`,
  ).join('\n')
  const ingresos = INCOME_CATEGORIES.map(
    (c) => `- ${c.id} (${c.label}): ${c.hints.slice(0, 6).join(', ')}`,
  ).join('\n')

  return `Eres "Cuenti", el contador de bolsillo de una pareja que lleva sus cuentas del hogar por chat.
Hablas español colombiano, natural y cercano. ${
    ctx.humor
      ? 'Puedes hacer un chiste corto y amable, sin regañar ni juzgar.'
      : 'Mantén un tono neutro y directo, sin chistes.'
  }
Quien te escribe ahora es ${ctx.nick}. La moneda es ${ctx.currency}. Hoy es ${new Date().toISOString().slice(0, 10)}.

TU TRABAJO
1. Si el mensaje (o la foto de factura) menciona uno o más gastos o ingresos, devuélvelos en "entries".
2. Si es una pregunta sobre las cuentas, respóndela con los datos de contexto y deja "entries" vacío.
3. Si es un saludo o algo sin monto, responde breve y pide el dato que falta, con "entries" vacío.

CÓMO LEER LOS MONTOS (Colombia)
- "120mil", "120 mil", "120k" = 120000. "2 palos", "2M", "2 millones" = 2000000. "una luca" = 1000.
- "50.000" y "50,000" son cincuenta mil: el punto y la coma son separadores de miles.
- Nunca inventes un monto. Si no hay monto claro, no crees el movimiento y pídelo.

CATEGORÍAS DE GASTO (usa exactamente estos identificadores)
${gastos}

CATEGORÍAS DE INGRESO
${ingresos}

${
  ctx.habits.length
    ? `CÓMO CLASIFICA ESTA CASA (esto manda sobre las listas de arriba)
Estas palabras ya las clasificaron ellos mismos. Si el mensaje trae alguna, usa esa categoría aunque tu instinto diga otra cosa.
${ctx.habits.map((h) => `- ${h}`).join('\n')}
Ojo: esto sirve para escoger la categoría de una compra, NO para meter todo en una sola. La regla de separar los antojos manda sobre esta memoria.`
    : 'Todavía no hay historial suficiente para saber cómo clasifica esta casa.'
}

REGLA DE ORO: EL MERCADO SE SEPARA
Un mercado casi nunca es sólo mercado: en el mismo carrito van la cerveza, el
helado, la gaseosa, el mecato o una camiseta. Esos NO son mercado y meterlos ahí
es el error más grave que puedes cometer: infla lo necesario y esconde los
gustos, que es justo lo que ellos quieren ver.
- "mercado" es sólo alimentación básica de la casa y aseo del hogar (víveres, frutas, verduras, carnes, lácteos, granos, huevos, pan, jabón, papel higiénico, detergente).
- Antojos: helado, dulces, chocolatinas, galletas, mecato, papitas, gaseosas, energizantes, postres → "calle".
- Licor y cigarrillos: cerveza, vino, aguardiente, ron, whisky → "ocio".
- Ropa, calzado, accesorios, perfumes, maquillaje, tecnología, juguetes → "lujos".
- Concentrado, arena, antipulgas, snacks de mascota → "mascotas".
- Medicamentos, vitaminas, suplementos → "salud".
- Ollas, bombillos, toallas, cortinas, herramientas → "casa".

CÓMO LO REPORTAS (esto es lo importante)
- Siempre que la compra tenga varios productos —factura de supermercado o mensaje escrito— llena "items" con cada producto (o grupo de productos) y su valor, tal como aparece.
- Crea una entry por cada categoría distinta: por ejemplo una de "mercado" y otra de "calle" por las cervezas y el helado. La suma de las entries tiene que dar el total pagado, ni un peso más ni uno menos.
- "mercado 180mil y un helado de 8mil" son DOS entries: 180000 en "mercado" y 8000 en "calle".
- "mercado 200mil, ahí van 20mil de cerveza" es un total de 200000 que se parte: 180000 en "mercado" y 20000 en "ocio".
- Nunca devuelvas una sola entry de "mercado" cuando alcanzas a leer antojos, licor o ropa en la compra.

FACTURAS
- La foto puede estar torcida, arrugada o con poca luz: busca el total y lee los renglones uno por uno.
- Pon en "items" todos los renglones que alcances a leer con su valor. Si sólo alcanzas a leer algunos, pon esos: lo que falte se queda en la categoría base.
- En "note" pon "[Comercio] · [Resumen corto]".
- Si de verdad no se alcanza a leer el total, deja "entries" vacío y dilo en "reply" pidiendo el dato.

CORREGIR LO QUE YA ESTÁ ANOTADO (lee esto con calma)
Los movimientos de "Últimos movimientos" YA ESTÁN GUARDADOS en la base. Cada uno
tiene un número (#1, #2…). Volver a mandarlos en "entries" NO los corrige: los
duplica y les daña las cuentas. Es el segundo error más grave que puedes cometer.
- Para cambiarle la categoría, el valor o la descripción a uno: mándalo en "updates" con su "#N" y sólo los campos que cambian.
- Para borrar uno que sobra: su "#N" en "deletes".
- Para sacar un producto de una compra ya guardada (ej: "los plátanos de 1.690 del mercado son mecato"): baja el valor del movimiento viejo en "updates" (160360 - 1690 = 158670) y crea SÓLO el producto nuevo en "entries" (1690 en "calle"). El total no puede cambiar.
- Si te corrigen algo que acabas de anotar, va en "updates". "entries" es únicamente para gastos nuevos que todavía no están en la lista.
- Si no sabes a cuál "#N" se refieren, no adivines ni anotes nada: pregúntales cuál es.
- No prometas en "reply" un cambio que no mandaste en "updates" o "deletes".

RESPUESTA
- Máximo 2 frases. Puedes usar *asteriscos* para resaltar y algún emoji.
- Confirma lo que anotaste (o lo que corregiste) con el valor y la categoría.
- Si con este gasto se pasan del tope, dilo con cariño.

CONTEXTO DE ${ctx.monthLabel.toUpperCase()}
- Nómina del mes: ${formatMoney(ctx.monthlyIncome, ctx.currency)}
- Tope de gasto: ${formatMoney(ctx.spendingCap, ctx.currency)}
- Gastado hasta ahora: ${formatMoney(ctx.spent, ctx.currency)}
- Ingresos registrados: ${formatMoney(ctx.income, ctx.currency)}
- Por categoría: ${ctx.breakdown.length ? ctx.breakdown.join(' · ') : 'todavía nada'}
- Últimos movimientos (YA GUARDADOS; usa su #N para corregirlos, nunca los repitas en "entries"):
${ctx.recent.length ? ctx.recent.map((r) => `  ${r}`).join('\n') : '  (ninguno)'}`
}

/**
 * Los modelos que razonan gastan tokens antes de escribir. Aquí ese paso no
 * aporta —es leer un número y clasificarlo— y sí puede comerse todo el
 * presupuesto de salida y devolver una respuesta vacía, que era justo lo que
 * dejaba las facturas sin leer.
 *
 * Cada modelo se intenta primero con el razonamiento al mínimo y, si rechaza
 * el campo o se queda corto de tokens, otra vez sin él y con más espacio.
 */
function attemptsFor(_model: string): { thinking: Record<string, unknown> | null; maxTokens: number }[] {
  return [{ thinking: null, maxTokens: 4096 }]
}

// ---- La llamada ------------------------------------------------------------

export async function askGemini(
  ctx: GeminiContext,
  options?: { budgetMs?: number },
): Promise<{
  reply: string
  entries: Entry[]
  updates: Correction[]
  deletes: string[]
  model: string
}> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new GeminiError('sin-key', 'GEMINI_API_KEY no está configurada')

  const startedAt = Date.now()
  const budget = options?.budgetMs ?? DEFAULT_BUDGET_MS
  const timeLeft = () => budget - (Date.now() - startedAt)

  const parts: Record<string, unknown>[] = []
  if (ctx.image) {
    parts.push({
      inlineData: {
        mimeType: ctx.image.mimeType,
        data: ctx.image.base64,
      },
    })
  }
  parts.push({
    text: ctx.text.trim() || (ctx.image ? 'Te mando esta factura, anótala por favor.' : 'Hola'),
  })

  const models = chooseModels(await availableModels(apiKey), Boolean(ctx.image))
  if (models.length === 0) {
    throw new GeminiError('sin-modelo', 'Esta API key no tiene ningún modelo de chat disponible')
  }

  const systemPrompt = buildSystemPrompt(ctx)
  let lastError: GeminiError | null = null

  for (const model of models) {
    const attempts = attemptsFor(model)

    for (let i = 0; i < attempts.length; i++) {
      const { thinking, maxTokens } = attempts[i]
      const hasRetry = i < attempts.length - 1

      // Sin tiempo para otro intento: mejor decir "se demoró" que morir a
      // mitad de camino y dejar a la persona sin respuesta.
      if (timeLeft() < 5_000) {
        throw lastError ?? new GeminiError('lenta', 'Se acabó el tiempo esperando a la IA', { model })
      }

      const generationConfig: Record<string, unknown> = {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.4,
        maxOutputTokens: maxTokens,
      }
      if (thinking) generationConfig.thinkingConfig = thinking

      try {
        const response = await fetch(`${BASE_URL}/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts }],
            generationConfig,
          }),
          signal: AbortSignal.timeout(Math.max(5_000, timeLeft())),
        })

        if (!response.ok) {
          const detail = await response.text().catch(() => '')
          const failure = classifyStatus(response.status, detail)
          lastError = new GeminiError(
            failure,
            `Gemini ${model} respondió ${response.status}: ${detail.slice(0, 300)}`,
            { status: response.status, model },
          )
          console.error(`[gemini] ${model} → ${response.status} (${failure})`, detail.slice(0, 300))

          // 400 por un campo que este modelo no conoce: reintentamos sin él
          // antes de descartar el modelo entero.
          if (response.status === 400 && thinking && hasRetry) continue
          break // 404/429/5xx: siguiente modelo
        }

        const payload = await response.json()
        const candidate = payload?.candidates?.[0]
        const raw: string = (candidate?.content?.parts ?? [])
          .map((p: any) => p?.text ?? '')
          .join('')
          .trim()

        if (!raw) {
          const blocked = payload?.promptFeedback?.blockReason
          if (blocked) {
            lastError = new GeminiError('bloqueada', `Gemini bloqueó la petición (${blocked})`, { model })
            break
          }
          // Sin texto casi siempre significa que se le fueron los tokens
          // razonando: el siguiente intento le da más espacio.
          lastError = new GeminiError(
            'vacia',
            `Gemini ${model} devolvió vacío (${candidate?.finishReason ?? 'sin razón'})`,
            { model },
          )
          console.error(`[gemini] ${model} sin texto, finishReason=${candidate?.finishReason}`)
          if (hasRetry) continue
          break
        }

        let parsed: unknown
        try {
          parsed = JSON.parse(raw)
        } catch {
          // JSON cortado a la mitad: mismo caso que el vacío.
          lastError = new GeminiError('vacia', `Gemini ${model} devolvió un JSON incompleto`, { model })
          if (hasRetry) continue
          break
        }

        if (model !== models[0]) {
          console.warn(`[gemini] "${models[0]}" no respondió; usé "${model}" en su lugar.`)
        }
        return { ...normalize(parsed, ctx.currency), model }
      } catch (error) {
        lastError = classifyThrown(error, model)
        console.error(`[gemini] ${model} falló:`, lastError.message)
        break
      }
    }
  }

  throw lastError ?? new GeminiError('desconocida', 'No pude contactar a Gemini')
}

/** Nunca confiamos de una en lo que devuelve el modelo. */
function normalize(
  raw: any,
  currency = 'COP',
): { reply: string; entries: Entry[]; updates: Correction[]; deletes: string[] } {
  let reply =
    typeof raw?.reply === 'string' && raw.reply.trim()
      ? raw.reply.trim()
      : 'Listo, lo dejé anotado.'

  const entries: Entry[] = []
  /** Lo que el código sacó de la compra base y el modelo no había anunciado. */
  const separated: string[] = []
  for (const item of Array.isArray(raw?.entries) ? raw.entries : []) {
    const amount = Number(item?.amount)
    if (!Number.isFinite(amount) || amount <= 0) continue

    const category: CategoryId = VALID_CATEGORIES.has(item?.category)
      ? item.category
      : item?.kind === 'income'
        ? 'extra'
        : 'otros'

    // Coherencia: una categoría de ingreso implica un ingreso y viceversa.
    const kind: Kind = categoryOf(category).kind

    let occurredAt: string | undefined
    if (typeof item?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
      const parsed = new Date(`${item.date}T12:00:00`)
      // Nada de fechas absurdas ni gastos en el futuro.
      if (!Number.isNaN(parsed.getTime()) && parsed.getTime() <= Date.now() + 86_400_000) {
        occurredAt = parsed.toISOString()
      }
    }

    const note = String(item?.note ?? '').slice(0, 200)
    const basket: BasketItem[] = Array.isArray(item?.items)
      ? item.items.map((p: any) => ({ name: String(p?.name ?? ''), amount: Number(p?.amount) }))
      : []

    // El modelo lee la factura; quién es antojo y quién es mercado lo decide
    // el código, que no cambia de opinión entre una foto y la siguiente.
    if (kind === 'expense' && basket.length > 0) {
      const groups = splitBasket(basket, amount, category)
      // Un solo grupo = no había nada que separar: se queda con su nota tal cual.
      const single = groups.length === 1
      for (const group of groups) {
        entries.push({
          kind,
          amount: group.amount,
          category: group.category,
          note: single ? note : noteForGroup(note, group.category, group.names),
          occurredAt,
        })
        if (group.category !== category) {
          const cat = categoryOf(group.category)
          separated.push(`${cat.emoji} ${formatMoney(group.amount, currency)} en *${cat.label}*`)
        }
      }
      continue
    }

    entries.push({ kind, amount: Math.round(amount), category, note, occurredAt })
  }

  // Si el desglose sacó cosas de la compra base, hay que decirlo: si no, el
  // chat confirma un mercado de 200mil y el resumen muestra otra cosa.
  if (separated.length > 0) {
    const shown = separated.slice(0, 3)
    const list =
      shown.length > 1 ? `${shown.slice(0, -1).join(', ')} y ${shown[shown.length - 1]}` : shown[0]
    reply = `${reply} Ojo: separé ${list}, que no van en la misma bolsa. 😉`
  }

  return {
    reply,
    entries: entries.slice(0, 10),
    updates: normalizeUpdates(raw?.updates),
    deletes: normalizeRefs(raw?.deletes),
  }
}

/** Sólo dejamos pasar un "#N": el servidor decide después a qué fila apunta. */
const REF = /^#?(\d{1,3})$/

function normalizeRefs(raw: unknown): string[] {
  const refs: string[] = []
  for (const value of Array.isArray(raw) ? raw : []) {
    const match = REF.exec(String(value ?? '').trim())
    if (match) refs.push(`#${match[1]}`)
  }
  return [...new Set(refs)].slice(0, 10)
}

function normalizeUpdates(raw: unknown): Correction[] {
  const updates: Correction[] = []
  for (const item of Array.isArray(raw) ? raw : []) {
    const [ref] = normalizeRefs([item?.ref])
    if (!ref) continue

    const correction: Correction = { ref }
    if (VALID_CATEGORIES.has(item?.category)) correction.category = item.category
    const amount = Number(item?.amount)
    if (Number.isFinite(amount) && amount > 0) correction.amount = Math.round(amount)
    if (typeof item?.note === 'string' && item.note.trim()) {
      correction.note = item.note.trim().slice(0, 200)
    }

    // Un "update" que no cambia nada sólo gastaría una escritura.
    if (correction.category || correction.amount || correction.note) updates.push(correction)
  }
  return updates.slice(0, 10)
}

/**
 * La nota de cada pedazo de una compra partida. Sin esto quedarían tres
 * movimientos con el mismo texto y no habría cómo saber qué era cada uno.
 */
function noteForGroup(note: string, category: CategoryId, names: string[]): string {
  const label = categoryOf(category).label
  const head = note || label
  const detail = names.slice(0, 4).join(', ')
  return (detail ? `${head} · ${label}: ${detail}` : `${head} · ${label}`).slice(0, 200)
}

// ---- Diagnóstico -----------------------------------------------------------

/** Un PNG de 1×1 para probar que la key acepta imágenes de verdad. */
const PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

export type AiDiagnosis = {
  keyConfigured: boolean
  models: string[]
  willTry: string[]
  ok: boolean
  model: string | null
  ms: number
  problem: string | null
  failure: AiFailure | null
  rawError: string | null
}

/**
 * Manda una imagen mínima por el mismo camino que una factura. Sirve para
 * responder la pregunta de siempre: ¿el problema es la foto, la key o la
 * cuota?
 */
export async function diagnoseGemini(): Promise<AiDiagnosis> {
  const startedAt = Date.now()
  const apiKey = process.env.GEMINI_API_KEY
  const base: AiDiagnosis = {
    keyConfigured: Boolean(apiKey),
    models: [],
    willTry: [],
    ok: false,
    model: null,
    ms: 0,
    problem: null,
    failure: null,
    rawError: null,
  }

  // Comprobamos apiKey y no base.keyConfigured para que TypeScript sepa que
  // de aquí en adelante la key existe.
  if (!apiKey) {
    return { ...base, ...describeAsProblem(new GeminiError('sin-key', 'sin key')), rawError: 'GEMINI_API_KEY no configurada', ms: 0 }
  }

  try {
    base.models = await availableModels(apiKey)
    base.willTry = chooseModels(base.models, true)
  } catch (error) {
    return { ...base, ...describeAsProblem(error), rawError: error instanceof Error ? error.message : String(error), ms: Date.now() - startedAt }
  }

  try {
    const result = await askGemini(
      {
        text: 'Esto es una prueba de conexión: responde "listo" y no anotes nada.',
        image: { base64: PIXEL_PNG, mimeType: 'image/png' },
        nick: 'prueba',
        humor: false,
        currency: 'COP',
        monthlyIncome: 0,
        spendingCap: 0,
        monthLabel: 'prueba',
        spent: 0,
        income: 0,
        breakdown: [],
        recent: [],
        habits: [],
      },
      { budgetMs: 20_000 },
    )
    return { ...base, ok: true, model: result.model, ms: Date.now() - startedAt }
  } catch (error) {
    return { ...base, ...describeAsProblem(error), rawError: error instanceof Error ? error.message : String(error), ms: Date.now() - startedAt }
  }
}

function describeAsProblem(error: unknown): { problem: string; failure: AiFailure } {
  const { failure, message } = describeFailure(error)
  return { problem: message, failure }
}
