// ---------------------------------------------------------------------------
// Cliente de Gemini. Todo lo que sabe de la IA vive aquí: cambiar de modelo o
// de proveedor no debería obligar a tocar la ruta ni el resto de la app.
//
// Corre sólo en el servidor: GEMINI_API_KEY nunca llega al navegador.
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

/**
 * Modelos a probar, en orden. El primero es el que manda; los siguientes son
 * la red de seguridad para cuando Google retira un nombre, cambia la
 * numeración o la key no tiene acceso a ese modelo todavía.
 *
 * Para cambiar de modelo sin tocar código, basta con poner GEMINI_MODEL en las
 * variables de entorno.
 */
export const GEMINI_MODELS = [
  ...new Set(
    [
      process.env.GEMINI_MODEL,
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
    ].filter(Boolean) as string[],
  ),
]

/** Configurable para poder probar la cadena de respaldo sin salir a internet. */
const BASE_URL =
  process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta'

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
- De una foto saca el TOTAL pagado, no la suma de los productos ni los impuestos por aparte.
- Si en la factura se distinguen compras de categorías muy distintas, puedes separarlas en varias entries.
- En "note" pon el nombre del comercio y un resumen corto ("Éxito · 14 productos").

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

export async function askGemini(
  ctx: GeminiContext,
): Promise<{ reply: string; entries: Entry[]; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY no está configurada')

  const parts: any[] = []
  if (ctx.image) {
    parts.push({ inline_data: { mime_type: ctx.image.mimeType, data: ctx.image.base64 } })
  }
  parts.push({
    text:
      ctx.text.trim() ||
      (ctx.image ? 'Te mando esta factura, anótala por favor.' : 'Hola'),
  })

  let lastError: unknown

  for (const model of GEMINI_MODELS) {
    // Los modelos que razonan por defecto responden más rápido si les
    // apagamos ese paso, que aquí no aporta nada. Pero no todos aceptan el
    // campo, así que si lo rechazan reintentamos igual sin él en vez de
    // descartar el modelo entero.
    const intentos = /^gemini-(2\.5|[3-9])/.test(model) ? [true, false] : [false]

    for (const conThinking of intentos) {
      const generationConfig: Record<string, unknown> = {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.6,
        maxOutputTokens: 1024,
      }
      if (conThinking) generationConfig.thinkingConfig = { thinkingBudget: 0 }

      try {
        const response = await fetch(
          `${BASE_URL}/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: buildSystemPrompt(ctx) }] },
              contents: [{ role: 'user', parts }],
              generationConfig,
            }),
            signal: AbortSignal.timeout(25_000),
          },
        )

        if (!response.ok) {
          const detail = await response.text()
          lastError = new Error(
            `Gemini ${model} respondió ${response.status}: ${detail.slice(0, 300)}`,
          )
          // 400 por un campo que este modelo no conoce: vale la pena
          // reintentar sin él antes de pasar al siguiente modelo.
          if (response.status === 400 && conThinking && /thinking|unknown name|not supported|invalid/i.test(detail)) {
            continue
          }
          // 404 = ese modelo no existe para esta key.
          // 429/5xx = cuota o caída. En ambos casos, siguiente modelo.
          break
        }

        const payload = await response.json()
        const raw = payload?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p.text ?? '')
          .join('')
          .trim()

        if (!raw) throw new Error('Gemini devolvió una respuesta vacía')

        if (model !== GEMINI_MODELS[0]) {
          console.warn(`[chat] "${GEMINI_MODELS[0]}" no respondió; usé "${model}" en su lugar.`)
        }
        return { ...normalize(JSON.parse(raw)), model }
      } catch (error) {
        lastError = error
        break
      }
    }
  }

  throw lastError ?? new Error('No pude contactar a Gemini')
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
