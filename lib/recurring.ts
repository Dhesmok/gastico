// ---------------------------------------------------------------------------
// Gestión de gastos fijos y recurrentes con fechas límite de pago.
// Se guardan por sala para que cada hogar tenga sus cuentas claras del mes.
// ---------------------------------------------------------------------------

import { type CategoryId, type Expense } from '@/lib/finance'

export type RecurringExpense = {
  id: string
  name: string
  amount: number
  category: CategoryId
  dueDay: number // 1 al 31
  active: boolean
}

const RECURRING_PREFIX = 'gastico:recurring:'

export function loadRecurring(roomId: string): RecurringExpense[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`${RECURRING_PREFIX}${roomId}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveRecurring(roomId: string, items: RecurringExpense[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${RECURRING_PREFIX}${roomId}`, JSON.stringify(items))
  } catch {
    /* localStorage lleno o privado */
  }
}

export type RecurringStatus = {
  item: RecurringExpense
  paid: boolean
  matchingExpense?: Expense
  daysRemaining: number
  isOverdue: boolean
  isToday: boolean
}

/**
 * Calcula el estado de cada gasto recurrente en el mes actual:
 * Si ya existe un gasto registrado este mes con nota o categoría coincidente,
 * se marca como pagado.
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
      // Buscar si ya se pagó este mes
      const match = monthExpenses.find((e) => {
        if (e.kind !== 'expense') return false
        const noteMatch = e.note.toLowerCase().includes(normalizedName)
        const catAndAmountMatch = e.category === item.category && Math.abs(e.amount - item.amount) < 5
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
      // Primero los pendientes ordenados por día de vencimiento, luego los pagados
      if (a.paid !== b.paid) return a.paid ? 1 : -1
      return a.item.dueDay - b.item.dueDay
    })
}
