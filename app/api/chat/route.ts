// ---------------------------------------------------------------------------
// El cerebro del bot. Corre en el servidor para que GEMINI_API_KEY nunca llegue
// al navegador. Verifica la sesión de Supabase, arma el contexto de la sala,
// le pregunta a Gemini y escribe el resultado con los permisos del propio
// usuario (o sea, RLS sigue mandando).
//
// Si Gemini no está disponible (sin API key, sin cuota, sin red) cae al parser
// local de lib/finance: la app nunca deja de registrar gastos.
// ---------------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import {
  CATEGORY_LIST,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  byCategory,
  categoryOf,
  formatMoney,
  localReply,
  parseLocally,
  periodRange,
  sumExpenses,
  sumIncome,
  type CategoryId,
  type Kind,
} from '@/lib/finance'
import { toExpense } from '@/lib/mappers'

export const runtime = 'nodejs'
export const maxDuration = 30

const GEMINI_MODELS = [process.env.GEMINI_MODEL, 'gemini-2.5-flash', 'gemini-2.0-flash'].filter(
  Boolean,
) as string[]

const VALID_CATEGORIES = new Set(CATEGORY_LIST.map((c) => c.id))

type Entry = {
  kind: Kind
  amount: number
  category: CategoryId
  note: string
  occurredAt?: string
}

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) {
    return NextResponse.json({ error: 'Sin sesión' }, { status: 401 })
  }

  let body: {
    roomId?: string
    text?: string
    image?: { base64: string; mimeType: string } | null
    receiptPath?: string | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
  }

  const { roomId, text = '', image, receiptPath } = body
  if (!roomId) {
    return NextResponse.json({ error: 'Falta la sala' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Supabase sin configurar en el servidor' }, { status: 500 })
  }

  // Cliente con el token del usuario: sólo puede ver y escribir lo que RLS
  // le permita. No usamos la service role key en ninguna parte.
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  }
  const userId = auth.user.id

  const [{ data: roomRow }, { data: memberRow }] = await Promise.all([
    supabase.from('rooms').select('*').eq('id', roomId).single(),
    supabase
      .from('room_members')
      .select('nick')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single(),
  ])

  if (!roomRow || !memberRow) {
    return NextResponse.json({ error: 'No perteneces a esta sala' }, { status: 403 })
  }

  const currency: string = roomRow.currency ?? 'COP'
  const humor: boolean = roomRow.humor ?? true
  const nick: string = memberRow.nick

  // Contexto del mes en curso para que el bot pueda responder preguntas
  // ("¿cuánto llevamos en mercado?") y no sólo registrar.
  const month = periodRange('month')
  const { data: monthRows } = await supabase
    .from('expenses')
    .select('*')
    .eq('room_id', roomId)
    .gte('occurred_at', month.start.toISOString())
    .lt('occurred_at', month.end.toISOString())
    .order('occurred_at', { ascending: false })

  const monthExpenses = (monthRows ?? []).map(toExpense)

  let reply: string
  let entries: Entry[]
  let usedAI = true

  try {
    const result = await askGemini({
      text,
      image: image ?? null,
      nick,
      humor,
      currency,
      monthlyIncome: Number(roomRow.monthly_income ?? 0),
      spendingCap: Number(roomRow.spending_cap ?? 0),
      monthLabel: month.label,
      spent: sumExpenses(monthExpenses),
      income: sumIncome(monthExpenses),
      breakdown: byCategory(monthExpenses).map(
        (c) => `${c.category.label}: ${formatMoney(c.total, currency)}`,
      ),
      recent: monthExpenses
        .slice(0, 10)
        .map(
          (e) =>
            `${e.occurredAt.slice(0, 10)} · ${e.nick} · ${categoryOf(e.category).label} · ${formatMoney(e.amount, currency)} · ${e.note}`,
        ),
    })
    reply = result.reply
    entries = result.entries
  } catch (error) {
    usedAI = false
    const parsed = parseLocally(text)
    if (parsed) {
      entries = [parsed]
      reply = localReply(parsed, humor, currency)
    } else {
      entries = []
      reply = image
        ? 'No pude leer la factura en este momento. 😅 Dime el total y la anoto: por ejemplo “mercado 120mil”.'
        : 'Mmm, no le pillé el valor a eso. 🤔 Escríbelo con el monto, por ejemplo: “mercado 120mil”, “uber 18k” o “cena 90.000”.'
    }
    console.error('[chat] Gemini falló, usando parser local:', error)
  }

  // Escritura de los movimientos detectados.
  let inserted: any[] = []
  if (entries.length > 0) {
    const { data, error } = await supabase
      .from('expenses')
      .insert(
        entries.map((e) => ({
          room_id: roomId,
          user_id: userId,
          nick,
          kind: e.kind,
          amount: e.amount,
          category: e.category,
          note: e.note,
          occurred_at: e.occurredAt ?? new Date().toISOString(),
          receipt_path: receiptPath ?? null,
        })),
      )
      .select()
    if (error) {
      console.error('[chat] no pude guardar los movimientos:', error.message)
      reply = 'Entendí el gasto pero no pude guardarlo. Intenta de nuevo en un momento. 🙏'
    } else {
      inserted = data ?? []
    }
  }

  const { data: assistantRow } = await supabase
    .from('messages')
    .insert({
      room_id: roomId,
      role: 'assistant',
      text: reply,
      expense_id: inserted[0]?.id ?? null,
    })
    .select()
    .single()

  return NextResponse.json({
    reply,
    usedAI,
    message: assistantRow ?? null,
    expenses: inserted,
  })
}

// ---- Gemini ----------------------------------------------------------------

type GeminiContext = {
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

async function askGemini(ctx: GeminiContext): Promise<{ reply: string; entries: Entry[] }> {
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
    const generationConfig: any = {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.6,
      maxOutputTokens: 1024,
    }
    // Los modelos 2.5 razonan por defecto; para esta tarea corta no hace falta
    // y así responde más rápido. Los 2.0 no aceptan este campo.
    if (/^gemini-(2\.5|3)/.test(model)) {
      generationConfig.thinkingConfig = { thinkingBudget: 0 }
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
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
        lastError = new Error(`Gemini ${model} respondió ${response.status}: ${detail.slice(0, 300)}`)
        // 404 = ese modelo no existe para esta key; probamos el siguiente.
        // 429/5xx = cuota o caída; también vale la pena reintentar con otro.
        continue
      }

      const payload = await response.json()
      const raw = payload?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text ?? '')
        .join('')
        .trim()

      if (!raw) throw new Error('Gemini devolvió una respuesta vacía')
      return normalize(JSON.parse(raw))
    } catch (error) {
      lastError = error
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
