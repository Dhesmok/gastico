'use client'

// ---------------------------------------------------------------------------
// Gastos fijos del hogar (arriendo, internet, servicios…).
//
// Viven en la sala, no en el celular: el arriendo es el mismo para los dos, así
// que cualquiera de la casa lo ve, lo edita y lo marca como pagado. Antes se
// guardaban en localStorage y por eso sólo los veía quien los creaba.
// ---------------------------------------------------------------------------

import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase/client'
import { type CategoryId, type Expense } from '@/lib/finance'

export type RecurringExpense = {
  id: string
  name: string
  amount: number
  category: CategoryId
  dueDay: number // 1 al 31
  active: boolean
}

type Row = Record<string, any>

function toRecurring(r: Row): RecurringExpense {
  return {
    id: r.id,
    name: r.name,
    amount: Number(r.amount),
    category: (r.category ?? 'servicios') as CategoryId,
    dueDay: r.due_day ?? 1,
    active: r.active ?? true,
  }
}

// ---- Lectura y escritura ---------------------------------------------------

export async function fetchRecurring(roomId: string): Promise<RecurringExpense[]> {
  const { data, error } = await getSupabase()
    .from('recurring_expenses')
    .select('*')
    .eq('room_id', roomId)
    .order('due_day')
  if (error) throw new Error(error.message)
  return (data ?? []).map(toRecurring)
}

export async function createRecurring(
  roomId: string,
  userId: string,
  item: Omit<RecurringExpense, 'id'>,
): Promise<RecurringExpense> {
  const { data, error } = await getSupabase()
    .from('recurring_expenses')
    .insert({
      room_id: roomId,
      created_by: userId,
      name: item.name,
      amount: item.amount,
      category: item.category,
      due_day: item.dueDay,
      active: item.active,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return toRecurring(data)
}

export async function updateRecurring(id: string, patch: Partial<RecurringExpense>) {
  const row: Row = { updated_at: new Date().toISOString() }
  if (patch.name !== undefined) row.name = patch.name
  if (patch.amount !== undefined) row.amount = patch.amount
  if (patch.category !== undefined) row.category = patch.category
  if (patch.dueDay !== undefined) row.due_day = patch.dueDay
  if (patch.active !== undefined) row.active = patch.active

  const { error } = await getSupabase().from('recurring_expenses').update(row).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteRecurring(id: string) {
  const { error } = await getSupabase().from('recurring_expenses').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Los cambios de uno le aparecen al otro sin recargar. */
export function subscribeToRecurring(roomId: string, onChange: () => void): RealtimeChannel {
  return getSupabase()
    .channel(`recurring:${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'recurring_expenses', filter: `room_id=eq.${roomId}` },
      () => onChange(),
    )
    .subscribe()
}

// ---- Rescate de los que quedaron en el celular -----------------------------

const RECURRING_PREFIX = 'gastico:recurring:'

/**
 * Sube a la sala los gastos fijos que hubieran quedado guardados en este
 * dispositivo y limpia la copia local. Así nadie pierde lo que ya había
 * anotado cuando la lista era privada.
 *
 * Sólo migra si la sala todavía no tiene ninguno, para no duplicar cuando los
 * dos celulares abran la app con la misma lista vieja.
 */
export async function migrateLocalRecurring(
  roomId: string,
  userId: string,
  existing: RecurringExpense[],
): Promise<RecurringExpense[]> {
  if (typeof window === 'undefined') return existing

  const key = `${RECURRING_PREFIX}${roomId}`
  let local: RecurringExpense[] = []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return existing
    const parsed = JSON.parse(raw)
    local = Array.isArray(parsed) ? parsed : []
  } catch {
    return existing
  }

  if (local.length === 0 || existing.length > 0) {
    // Ya hay lista compartida (o no había nada local): la copia local sobra.
    try {
      localStorage.removeItem(key)
    } catch {
      /* modo incógnito */
    }
    return existing
  }

  const subidos: RecurringExpense[] = []
  for (const item of local) {
    try {
      subidos.push(
        await createRecurring(roomId, userId, {
          name: String(item.name ?? '').slice(0, 60) || 'Gasto fijo',
          amount: Math.round(Number(item.amount) || 0),
          category: (item.category ?? 'servicios') as CategoryId,
          dueDay: Math.min(31, Math.max(1, Number(item.dueDay) || 1)),
          active: item.active !== false,
        }),
      )
    } catch (error) {
      console.error('[gastos fijos] no pude migrar uno:', error)
    }
  }

  if (subidos.length > 0) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* modo incógnito */
    }
  }
  return subidos
}

// ---- Estado del mes (lógica pura) ------------------------------------------

export type RecurringStatus = {
  item: RecurringExpense
  paid: boolean
  matchingExpense?: Expense
  daysRemaining: number
  isOverdue: boolean
  isToday: boolean
}

/**
 * Calcula el estado de cada gasto fijo en el mes actual: si ya existe un
 * movimiento con la nota o el monto que coincide, se marca como pagado.
 */
export function getRecurringStatus(
  items: RecurringExpense[],
  monthExpenses: Expense[],
): RecurringStatus[] {
  const now = new Date()
  const currentDay = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  return items
    .filter((i) => i.active)
    .map((item) => {
      const normalizedName = item.name.trim().toLowerCase()
      const match = monthExpenses.find((e) => {
        if (e.kind !== 'expense') return false
        const noteMatch = e.note.toLowerCase().includes(normalizedName)
        const catAndAmountMatch =
          e.category === item.category && Math.abs(e.amount - item.amount) < 5
        return noteMatch || catAndAmountMatch
      })

      const targetDay = Math.min(item.dueDay, daysInMonth)
      const diff = targetDay - currentDay

      return {
        item,
        paid: Boolean(match),
        matchingExpense: match,
        daysRemaining: diff,
        isOverdue: diff < 0 && !match,
        isToday: diff === 0 && !match,
      }
    })
    .sort((a, b) => {
      if (a.paid !== b.paid) return a.paid ? 1 : -1
      return a.item.dueDay - b.item.dueDay
    })
}
