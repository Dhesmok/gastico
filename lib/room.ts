'use client'

// ---------------------------------------------------------------------------
// Todo el acceso a datos vive aquí: salas, miembros, chat, movimientos,
// facturas y sincronización en vivo entre los dos celulares.
// ---------------------------------------------------------------------------

import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase/client'
import type { CategoryId, Expense, Kind, Member, Message, Room } from '@/lib/finance'
import { toExpense, toMember, toMessage, toRoom, type Row } from '@/lib/mappers'

export { toExpense, toMessage }

const RECEIPTS_BUCKET = 'receipts'
const LAST_ROOM_KEY = 'cuentas-claras:last-room'

/** "ABCD1234" -> "ABCD-1234", que es más fácil de dictar por WhatsApp. */
export function formatCode(code: string): string {
  const clean = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  return clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean
}

// ---- Sala recordada --------------------------------------------------------

export function rememberRoom(roomId: string) {
  try {
    localStorage.setItem(LAST_ROOM_KEY, roomId)
  } catch {
    /* modo incógnito */
  }
}

export function forgetRoom() {
  try {
    localStorage.removeItem(LAST_ROOM_KEY)
  } catch {
    /* modo incógnito */
  }
}

export function lastRoomId(): string | null {
  try {
    return localStorage.getItem(LAST_ROOM_KEY)
  } catch {
    return null
  }
}

// ---- Crear / entrar --------------------------------------------------------

export async function createRoom(name: string, password: string, nick: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase.rpc('create_room', {
    p_name: name,
    p_password: password,
    p_nick: nick,
  })
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : data
  rememberRoom(row.room_id)
  return { roomId: row.room_id as string, code: row.room_code as string }
}

export async function joinRoom(code: string, password: string, nick: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase.rpc('join_room', {
    p_code: code,
    p_password: password,
    p_nick: nick,
  })
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : data
  rememberRoom(row.room_id)
  return { roomId: row.room_id as string, code: row.room_code as string }
}

export async function leaveRoom(roomId: string, userId: string) {
  const supabase = getSupabase()
  await supabase.from('room_members').delete().eq('room_id', roomId).eq('user_id', userId)
  forgetRoom()
}

/** Salas a las que ya pertenece este dispositivo. */
export async function myRooms(): Promise<{ id: string; name: string; code: string }[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('room_members')
    .select('room_id, rooms(id, name, code)')
  if (error) return []
  return (data ?? [])
    .map((r: Row) => r.rooms)
    .filter(Boolean)
    .map((r: Row) => ({ id: r.id, name: r.name, code: r.code }))
}

// ---- Carga inicial ---------------------------------------------------------

export type RoomSnapshot = {
  room: Room
  members: Member[]
  messages: Message[]
  expenses: Expense[]
}

/**
 * Trae la sala completa. El chat se limita a los últimos mensajes y los
 * movimientos a los últimos 24 meses: suficiente para todas las estadísticas
 * sin descargar la historia entera en cada apertura.
 */
export async function loadRoom(roomId: string, messageLimit = 200): Promise<RoomSnapshot> {
  const supabase = getSupabase()

  const since = new Date()
  since.setMonth(since.getMonth() - 24)

  const [roomRes, membersRes, messagesRes, expensesRes] = await Promise.all([
    supabase.from('rooms').select('*').eq('id', roomId).single(),
    supabase.from('room_members').select('*').eq('room_id', roomId).order('joined_at'),
    supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(messageLimit),
    supabase
      .from('expenses')
      .select('*')
      .eq('room_id', roomId)
      .gte('occurred_at', since.toISOString())
      .order('occurred_at', { ascending: false }),
  ])

  if (roomRes.error) throw new Error(roomRes.error.message)

  return {
    room: toRoom(roomRes.data),
    members: (membersRes.data ?? []).map(toMember),
    messages: (messagesRes.data ?? []).map(toMessage).reverse(),
    expenses: (expensesRes.data ?? []).map(toExpense),
  }
}

// ---- Ajustes ---------------------------------------------------------------

export async function updateRoom(roomId: string, patch: Partial<Room>) {
  const supabase = getSupabase()
  const row: Row = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.currency !== undefined) row.currency = patch.currency
  if (patch.monthlyIncome !== undefined) row.monthly_income = patch.monthlyIncome
  if (patch.spendingCap !== undefined) row.spending_cap = patch.spendingCap
  if (patch.chatBackground !== undefined) row.chat_background = patch.chatBackground
  if (patch.humor !== undefined) row.humor = patch.humor
  if (patch.keepReceipts !== undefined) row.keep_receipts = patch.keepReceipts
  if (patch.receiptRetentionMonths !== undefined) {
    row.receipt_retention_months = patch.receiptRetentionMonths
  }
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('rooms').update(row).eq('id', roomId)
  if (error) throw new Error(error.message)
}

export async function updateNick(roomId: string, userId: string, nick: string) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('room_members')
    .update({ nick })
    .eq('room_id', roomId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function changeRoomPassword(roomId: string, password: string) {
  const supabase = getSupabase()
  const { error } = await supabase.rpc('set_room_password', {
    p_room_id: roomId,
    p_password: password,
  })
  if (error) throw new Error(error.message)
}

// ---- Chat ------------------------------------------------------------------

export async function insertUserMessage(input: {
  roomId: string
  userId: string
  nick: string
  text: string
  imagePath?: string | null
}): Promise<Message> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('messages')
    .insert({
      room_id: input.roomId,
      user_id: input.userId,
      nick: input.nick,
      role: 'user',
      text: input.text,
      image_path: input.imagePath ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return toMessage(data)
}

export async function insertAssistantMessage(
  roomId: string,
  text: string,
  expenseId?: string | null,
): Promise<Message> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('messages')
    .insert({ room_id: roomId, role: 'assistant', text, expense_id: expenseId ?? null })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return toMessage(data)
}

// ---- Movimientos -----------------------------------------------------------

export async function insertExpenses(
  roomId: string,
  userId: string,
  nick: string,
  entries: {
    kind: Kind
    amount: number
    category: CategoryId
    note: string
    occurredAt?: string
  }[],
  receiptPath?: string | null,
): Promise<Expense[]> {
  if (entries.length === 0) return []
  const supabase = getSupabase()
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
  if (error) throw new Error(error.message)
  return (data ?? []).map(toExpense)
}

export async function updateExpense(id: string, patch: Partial<Expense>) {
  const supabase = getSupabase()
  const row: Row = {}
  if (patch.amount !== undefined) row.amount = patch.amount
  if (patch.category !== undefined) row.category = patch.category
  if (patch.note !== undefined) row.note = patch.note
  if (patch.kind !== undefined) row.kind = patch.kind
  if (patch.occurredAt !== undefined) row.occurred_at = patch.occurredAt
  const { error } = await supabase.from('expenses').update(row).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteExpense(id: string) {
  const supabase = getSupabase()
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ---- Facturas en Storage ---------------------------------------------------

export async function uploadReceipt(roomId: string, blob: Blob, mimeType: string) {
  const supabase = getSupabase()
  const ext = mimeType.includes('webp') ? 'webp' : mimeType.includes('png') ? 'png' : 'jpg'
  const path = `${roomId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, blob, { contentType: mimeType, upsert: false })
  if (error) throw new Error(error.message)
  return path
}

export async function receiptUrl(path: string): Promise<string | null> {
  const supabase = getSupabase()
  const { data } = await supabase.storage.from(RECEIPTS_BUCKET).createSignedUrl(path, 60 * 60)
  return data?.signedUrl ?? null
}

/**
 * Borra las fotos más viejas que la retención configurada. Se llama al abrir
 * la sala, así el bucket nunca crece sin freno y el plan gratis alcanza para
 * siempre. Los montos y las notas se conservan: sólo se va la imagen.
 */
export async function purgeOldReceipts(room: Room) {
  if (room.receiptRetentionMonths <= 0) return
  const supabase = getSupabase()

  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - room.receiptRetentionMonths)

  const { data } = await supabase
    .from('messages')
    .select('id, image_path')
    .eq('room_id', room.id)
    .not('image_path', 'is', null)
    .lt('created_at', cutoff.toISOString())
    .limit(100)

  const rows = data ?? []
  if (rows.length === 0) return

  const paths = rows.map((r: Row) => r.image_path).filter(Boolean)
  await supabase.storage.from(RECEIPTS_BUCKET).remove(paths)
  await supabase
    .from('messages')
    .update({ image_path: null })
    .in('id', rows.map((r: Row) => r.id))
  await supabase
    .from('expenses')
    .update({ receipt_path: null })
    .in('receipt_path', paths)
}

// ---- Tiempo real -----------------------------------------------------------

export function subscribeToRoom(
  roomId: string,
  handlers: {
    onMessage: (m: Message) => void
    onExpenseInsert: (e: Expense) => void
    onExpenseUpdate: (e: Expense) => void
    onExpenseDelete: (id: string) => void
    onRoomUpdate: (r: Room) => void
  },
): RealtimeChannel {
  const supabase = getSupabase()
  const filter = `room_id=eq.${roomId}`

  return supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter },
      (payload) => handlers.onMessage(toMessage(payload.new as Row)),
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'expenses', filter },
      (payload) => handlers.onExpenseInsert(toExpense(payload.new as Row)),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'expenses', filter },
      (payload) => handlers.onExpenseUpdate(toExpense(payload.new as Row)),
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'expenses', filter },
      (payload) => handlers.onExpenseDelete((payload.old as Row).id),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      (payload) => handlers.onRoomUpdate(toRoom(payload.new as Row)),
    )
    .subscribe()
}
