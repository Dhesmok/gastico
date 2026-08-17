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
const PREFER_VISION = ['gemini-2.5-flash', 'gemini-3.1-flash', 'gemini-3.1-flash-lite', 'gemini-2.0-flash']
const PREFER_TEXT = ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash']

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
  const preferred = [
    process.env.GEMINI_MODEL,
    ...(wantsVision ? PREFER_VISION : PREFER_TEXT),
  ].filter(Boolean) as string[]
  const unique = [...new Set(preferred)]

  if (available.length === 0) return unique

  const present = unique.filter((m) => available.includes(m))
  if (present.length > 0) return present

  // Ninguno de los que conocemos: usamos lo que haya, empezando por los flash
  // (rápidos y baratos) y dejando los pro de último.
  const flash = available.filter((m) => /flash/.test(m) && !/preview|exp/.test(m))
  const rest = available.filter((m) => !flash.includes(m))
  return [...flash, ...rest].slice(0, 3)
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
        },
        required: ['kind', 'amount', 'category', 'note'],
      },
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

FACTURAS
- La foto puede estar torcida, arrugada o con poca luz: igual busca el TOTAL.
- Saca el TOTAL pagado (el de más abajo, "TOTAL A PAGAR"), no el subtotal, ni los impuestos, ni la suma de los productos.
- Si la foto trae varios recibos, o compras de categorías muy distintas, sepáralas en varias entries.
- En "note" pon el nombre del comercio y un resumen corto ("Éxito · 14 productos").
- Si de verdad no se alcanza a leer el total, deja "entries" vacío y dilo en "reply" pidiendo el dato.

RESPUESTA
- Máximo 2 frases. Puedes usar *asteriscos* para resaltar y algún emoji.
- Confirma lo que anotaste con el valor y la categoría.
- Si con este gasto se pasan del tope, dilo con cariño.

CONTEXTO DE ${ctx.monthLabel.toUpperCase()}
- Nómina del mes: ${formatMoney(ctx.monthlyIncome, ctx.currency)}
- Tope de gasto: ${formatMoney(ctx.spendingCap, ctx.currency)}
- Gastado hasta ahora: ${formatMoney(ctx.spent, ctx.currency)}
- Ingresos registrados: ${formatMoney(ctx.income, ctx.currency)}
- Por categoría: ${ctx.breakdown.length ? ctx.breakdown.join(' · ') : 'todavía nada'}
- Últimos movimientos:
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
function attemptsFor(model: string): { thinking: Record<string, unknown> | null; maxTokens: number }[] {
  if (/^gemini-([3-9]|\d{2})/.test(model)) {
    // Gemini 3 en adelante: se controla con thinkingLevel, no con presupuesto.
    return [
      { thinking: { thinkingLevel: 'low' }, maxTokens: 2048 },
      { thinking: null, maxTokens: 4096 },
    ]
  }
  if (/^gemini-2\.5/.test(model)) {
    return [
      { thinking: { thinkingBudget: 0 }, maxTokens: 2048 },
      { thinking: null, maxTokens: 4096 },
    ]
  }
  return [{ thinking: null, maxTokens: 2048 }]
}

// ---- La llamada ------------------------------------------------------------

export async function askGemini(
  ctx: GeminiContext,
  options?: { budgetMs?: number },
): Promise<{ reply: string; entries: Entry[]; model: string }> {
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
        return { ...normalize(parsed), model }
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
function normalize(raw: any): { reply: string; entries: Entry[] } {
  const reply =
    typeof raw?.reply === 'string' && raw.reply.trim()
      ? raw.reply.trim()
      : 'Listo, lo dejé anotado.'

  const entries: Entry[] = []
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

    entries.push({
      kind,
      amount: Math.round(amount),
      category,
      note: String(item?.note ?? '').slice(0, 200),
      occurredAt,
    })
  }

  return { reply, entries: entries.slice(0, 10) }
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
}

/**
 * Manda una imagen mínima por el mismo camino que una factura. Sirve para
 * responder la pregunta de siempre: ¿el problema es la foto, la key o la
 * cuota?
 */
export async function diagnoseGemini(): Promise<AiDiagnosis> {
  const startedAt = Date.now()
  const base: AiDiagnosis = {
    keyConfigured: Boolean(process.env.GEMINI_API_KEY),
    models: [],
    willTry: [],
    ok: false,
    model: null,
    ms: 0,
    problem: null,
    failure: null,
  }

  if (!base.keyConfigured) {
    return { ...base, ...describeAsProblem(new GeminiError('sin-key', 'sin key')), ms: 0 }
  }

  try {
    base.models = await availableModels(process.env.GEMINI_API_KEY!)
    base.willTry = chooseModels(base.models, true)
  } catch (error) {
    return { ...base, ...describeAsProblem(error), ms: Date.now() - startedAt }
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
      },
      { budgetMs: 20_000 },
    )
    return { ...base, ok: true, model: result.model, ms: Date.now() - startedAt }
  } catch (error) {
    return { ...base, ...describeAsProblem(error), ms: Date.now() - startedAt }
  }
}

function describeAsProblem(error: unknown): { problem: string; failure: AiFailure } {
  const { failure, message } = describeFailure(error)
  return { problem: message, failure }
}
