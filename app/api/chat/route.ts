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
  buildCategoryMemory,
  byCategory,
  categoryOf,
  formatMoney,
  localReplyFor,
  memoryHighlights,
  parseAllLocally,
  periodRange,
  sumExpenses,
  sumIncome,
  type Classified,
  type Expense,
} from '@/lib/finance'
import {
  askGemini,
  describeFailure,
  type AiFailure,
  type Correction,
  type Entry,
} from '@/lib/gemini'
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
  const [{ data: monthRows }, { data: historyRows }] = await Promise.all([
    supabase
      .from('expenses')
      .select('*')
      .eq('room_id', roomId)
      .gte('occurred_at', month.start.toISOString())
      .lt('occurred_at', month.end.toISOString())
      .order('occurred_at', { ascending: false }),
    // Historial corto para aprender cómo clasifica esta casa: si para ellos
    // "el corral" es antojo y no ocio, eso pesa más que cualquier lista que
    // traiga la app.
    supabase
      .from('expenses')
      .select('note, category')
      .eq('room_id', roomId)
      .order('occurred_at', { ascending: false })
      .limit(300),
  ])

  const monthExpenses = (monthRows ?? []).map(toExpense)
  const history = (historyRows ?? []) as Classified[]
  const memory = buildCategoryMemory(history)

  // A la IA nunca le pasamos ids de la base: cada movimiento reciente viaja con
  // un "#N" y sólo esos se pueden corregir o borrar. Si se inventa un número,
  // no apunta a ninguna fila y no pasa nada.
  const recent = monthExpenses.slice(0, 10)
  const byRef = new Map(recent.map((e, i) => [`#${i + 1}`, e]))

  let reply: string
  let entries: Entry[]
  let updates: Correction[] = []
  let deletes: string[] = []
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
      recent: recent.map(
        (e, i) =>
          `#${i + 1} · ${e.occurredAt.slice(0, 10)} · ${e.nick} · ${categoryOf(e.category).label} · ${formatMoney(e.amount, currency)} · ${e.note}`,
      ),
      habits: memoryHighlights(history).map(
        (h) => `"${h.word}" → ${h.category.id} (${h.category.label})`,
      ),
    })
    reply = result.reply
    entries = result.entries
    updates = result.updates
    deletes = result.deletes
    usedModel = result.model
  } catch (error) {
    usedAI = false
    const problem = describeFailure(error)
    aiFailure = problem.failure

    // Sin IA todavía podemos anotar lo que venga escrito: el parser local
    // entiende "mercado 120mil". Lo que no puede es leer una foto, así que
    // ahí sí decimos qué fue lo que falló en vez de un "no pude" a secas.
    const parsed = parseAllLocally(text, memory)
    if (parsed.length > 0) {
      entries = parsed
      reply = localReplyFor(parsed, humor, currency)
    } else {
      entries = []
      reply = image
        ? `No pude leer la factura: ${problem.message}. 😅 Dime el total y la anoto: por ejemplo “mercado 120mil”.`
        : 'Mmm, no le pillé el valor a eso. 🤔 Escríbelo con el monto, por ejemplo: “mercado 120mil”, “uber 18k” o “cena 90.000”.'
    }
    console.error(`[chat] Gemini falló (${problem.failure}), usando parser local:`, error)
  }

  // Correcciones a lo que ya estaba guardado. Van antes de insertar porque una
  // corrección típica ("saca los plátanos del mercado") baja el movimiento
  // viejo y crea el nuevo: si fallara la primera parte, no queremos la segunda.
  const deleted: string[] = []
  const updatedRows: any[] = []

  for (const ref of deletes) {
    const target = byRef.get(ref)
    if (!target) continue
    const { error } = await supabase.from('expenses').delete().eq('id', target.id)
    if (error) console.error(`[chat] no pude borrar ${target.id}:`, error.message)
    else deleted.push(target.id)
  }

  for (const correction of updates) {
    const target = byRef.get(correction.ref)
    if (!target || deleted.includes(target.id)) continue

    const patch: Record<string, unknown> = {}
    if (correction.category) {
      patch.category = correction.category
      // Cambiar a una categoría de ingreso convierte el movimiento en ingreso.
      patch.kind = categoryOf(correction.category).kind
    }
    if (correction.amount) patch.amount = correction.amount
    if (correction.note) patch.note = correction.note

    const { data, error } = await supabase
      .from('expenses')
      .update(patch)
      .eq('id', target.id)
      .select()
    if (error) console.error(`[chat] no pude corregir ${target.id}:`, error.message)
    else if (data?.[0]) updatedRows.push(data[0])
  }

  // Escritura de los movimientos detectados.
  let inserted: any[] = []
  const skipped = entries.filter((e) => isDuplicate(e, recent, text))
  entries = entries.filter((e) => !skipped.includes(e))
  if (skipped.length > 0) {
    console.warn(`[chat] ${skipped.length} movimiento(s) ya estaban anotados; no los dupliqué`)
    reply = `${reply} (Eso ya estaba anotado hace un momento, así que no lo dupliqué. Si de verdad fue otra compra, dime “anótalo de nuevo”.)`
  }

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
      // Si sólo hubo corrección, el mensaje muestra el movimiento corregido.
      expense_id: inserted[0]?.id ?? updatedRows[0]?.id ?? null,
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
    updated: updatedRows,
    deleted,
  })
}

/** Cuando alguien insiste, sí queremos anotarlo dos veces. */
const OTRA_VEZ = /(otra vez|de nuevo|nuevamente|repite|repit[eí]|volv[ií] a|dos veces|igual que)/i

/** Cuánto rato consideramos que un gasto idéntico es un duplicado y no otra compra. */
const VENTANA_MS = 5 * 60_000

/**
 * El bot no puede editar lo que ya guardó pidiéndoselo dos veces: antes, cuando
 * le corregían algo, volvía a insertar la misma compra y las cuentas se
 * inflaban solas. Ahora tiene "updates"; esto es el cinturón por si aun así
 * repite. Un gasto idéntico (mismo valor, misma categoría) hecho hace menos de
 * cinco minutos es un duplicado, salvo que la persona diga que fue de verdad
 * otra vez.
 */
function isDuplicate(entry: Entry, recent: Expense[], text: string): boolean {
  if (OTRA_VEZ.test(text)) return false
  const limit = Date.now() - VENTANA_MS
  return recent.some(
    (e) =>
      e.kind === entry.kind &&
      e.category === entry.category &&
      Math.round(e.amount) === Math.round(entry.amount) &&
      new Date(e.createdAt).getTime() >= limit,
  )
}
