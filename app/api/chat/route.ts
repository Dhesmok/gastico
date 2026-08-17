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
  byCategory,
  categoryOf,
  formatMoney,
  localReply,
  parseLocally,
  periodRange,
  sumExpenses,
  sumIncome,
} from '@/lib/finance'
import { askGemini, describeFailure, type AiFailure, type Entry } from '@/lib/gemini'
import { toExpense } from '@/lib/mappers'

export const runtime = 'nodejs'
export const maxDuration = 30

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
  let usedModel: string | null = null
  let aiFailure: AiFailure | null = null

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
    usedModel = result.model
  } catch (error) {
    usedAI = false
    const problem = describeFailure(error)
    aiFailure = problem.failure

    // Sin IA todavía podemos anotar lo que venga escrito: el parser local
    // entiende "mercado 120mil". Lo que no puede es leer una foto, así que
    // ahí sí decimos qué fue lo que falló en vez de un "no pude" a secas.
    const parsed = parseLocally(text)
    if (parsed) {
      entries = [parsed]
      reply = localReply(parsed, humor, currency)
    } else {
      entries = []
      reply = image
        ? `No pude leer la factura: ${problem.message}. 😅 Dime el total y la anoto: por ejemplo “mercado 120mil”.`
        : 'Mmm, no le pillé el valor a eso. 🤔 Escríbelo con el monto, por ejemplo: “mercado 120mil”, “uber 18k” o “cena 90.000”.'
    }
    console.error(`[chat] Gemini falló (${problem.failure}), usando parser local:`, error)
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
    aiFailure,
    model: usedModel,
    message: assistantRow ?? null,
    expenses: inserted,
  })
}
