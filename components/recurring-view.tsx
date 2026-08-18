'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  Edit2,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import {
  EXPENSE_CATEGORIES,
  categoryOf,
  formatMoney,
  type CategoryId,
  type Expense,
  type Member,
  type Room,
} from '@/lib/finance'
import {
  getRecurringStatus,
  loadRecurring,
  saveRecurring,
  type RecurringExpense,
  type RecurringStatus,
} from '@/lib/recurring'
import { cn } from '@/lib/utils'

export function RecurringView({
  room,
  members,
  expenses,
  me,
  onAddExpense,
  notify,
}: {
  room: Room
  members: Member[]
  expenses: Expense[]
  me: Member
  onAddExpense: (entry: {
    kind: 'expense'
    amount: number
    category: CategoryId
    note: string
    occurredAt?: string
  }) => Promise<void>
  notify: (text: string) => void
}) {
  const [recurringList, setRecurringList] = useState<RecurringExpense[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<RecurringExpense | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)

  useEffect(() => {
    setRecurringList(loadRecurring(room.id))
  }, [room.id])

  // Form state
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<CategoryId>('servicios')
  const [dueDay, setDueDay] = useState('5')

  const currentMonthExpenses = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    return expenses.filter((e) => e.occurredAt >= startOfMonth)
  }, [expenses])

  const statuses: RecurringStatus[] = useMemo(
    () => getRecurringStatus(recurringList, currentMonthExpenses),
    [recurringList, currentMonthExpenses],
  )

  const totalMonthly = useMemo(
    () => recurringList.filter((r) => r.active).reduce((sum, r) => sum + r.amount, 0),
    [recurringList],
  )

  const totalPaid = useMemo(
    () =>
      statuses
        .filter((s) => s.paid)
        .reduce((sum, s) => sum + s.item.amount, 0),
    [statuses],
  )

  const totalPending = totalMonthly - totalPaid

  function handleOpenCreate() {
    setEditingItem(null)
    setName('')
    setAmount('')
    setCategory('servicios')
    setDueDay('5')
    setModalOpen(true)
  }

  function handleOpenEdit(item: RecurringExpense) {
    setEditingItem(item)
    setName(item.name)
    setAmount(String(item.amount))
    setCategory(item.category)
    setDueDay(String(item.dueDay))
    setModalOpen(true)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const num = Math.round(Number(amount))
    const day = Math.min(31, Math.max(1, Number(dueDay) || 1))
    if (!name.trim() || num <= 0) return

    let updated: RecurringExpense[]
    if (editingItem) {
      updated = recurringList.map((item) =>
        item.id === editingItem.id
          ? { ...item, name: name.trim(), amount: num, category, dueDay: day }
          : item,
      )
      notify('Gasto fijo actualizado.')
    } else {
      const newItem: RecurringExpense = {
        id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: name.trim(),
        amount: num,
        category,
        dueDay: day,
        active: true,
      }
      updated = [...recurringList, newItem]
      notify('Gasto fijo añadido a la lista.')
    }

    setRecurringList(updated)
    saveRecurring(room.id, updated)
    setModalOpen(false)
  }

  function handleDelete(id: string) {
    const updated = recurringList.filter((item) => item.id !== id)
    setRecurringList(updated)
    saveRecurring(room.id, updated)
    notify('Gasto fijo eliminado.')
  }

  async function handlePay(item: RecurringExpense) {
    setPayingId(item.id)
    try {
      await onAddExpense({
        kind: 'expense',
        amount: item.amount,
        category: item.category,
        note: `Pago de ${item.name}`,
        occurredAt: new Date().toISOString(),
      })
      notify(`¡Listo! Se registró el pago de ${item.name}.`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No pude registrar el pago.')
    } finally {
      setPayingId(null)
    }
  }

  return (
    <div className="no-scrollbar mx-auto h-[calc(100svh-4rem)] w-full max-w-2xl overflow-y-auto px-4 py-5">
      <div className="flex flex-col gap-4 pb-12">
        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-700 text-foreground">Gastos Fijos</h2>
            <p className="text-sm text-muted-foreground">
              Arriendo, servicios y pagos del mes con sus fechas límite
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 rounded-2xl bg-primary px-3.5 py-2.5 font-display text-xs font-700 text-primary-foreground shadow-sm shadow-primary/30 transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <Plus className="size-4" />
            <span>Nuevo Fijo</span>
          </button>
        </div>

        {/* Tarjeta de Resumen Mensual */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border/70 bg-card/80 p-3.5 shadow-sm">
            <p className="text-[11px] font-700 uppercase tracking-wider text-muted-foreground">
              Total Fijos
            </p>
            <p className="mt-1 font-display text-base font-700 text-foreground">
              {formatMoney(totalMonthly, room.currency)}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 shadow-sm">
            <p className="text-[11px] font-700 uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Pagados
            </p>
            <p className="mt-1 font-display text-base font-700 text-emerald-600 dark:text-emerald-400">
              {formatMoney(totalPaid, room.currency)}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 shadow-sm">
            <p className="text-[11px] font-700 uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Pendientes
            </p>
            <p className="mt-1 font-display text-base font-700 text-amber-600 dark:text-amber-400">
              {formatMoney(totalPending, room.currency)}
            </p>
          </div>
        </div>

        {/* Lista de Gastos Fijos */}
        <div className="flex flex-col gap-3">
          {statuses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card/40 p-8 text-center">
              <CalendarClock className="mb-2 size-10 text-muted-foreground/40" />
              <p className="font-display text-base font-700 text-foreground">No tienes gastos fijos aún</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Añade el arriendo, el internet, la luz o Netflix con su día de pago para no olvidarlos.
              </p>
              <button
                onClick={handleOpenCreate}
                className="mt-4 flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2 font-display text-xs font-700 text-primary-foreground transition-all hover:-translate-y-0.5"
              >
                <Plus className="size-4" /> Añadir el primero
              </button>
            </div>
          ) : (
            statuses.map(({ item, paid, daysRemaining, isOverdue, isToday }) => {
              const cat = categoryOf(item.category)
              return (
                <div
                  key={item.id}
                  className={cn(
                    'relative flex flex-col justify-between gap-3 rounded-3xl border p-4 shadow-sm transition-all',
                    paid
                      ? 'border-border/50 bg-card/40 opacity-80'
                      : isOverdue
                        ? 'border-destructive/30 bg-destructive/5'
                        : isToday
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border/80 bg-card',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-xl shadow-sm"
                        style={{
                          backgroundColor: `color-mix(in oklch, ${cat.color} 20%, transparent)`,
                        }}
                      >
                        {cat.emoji}
                      </span>
                      <div>
                        <h4 className="font-display text-base font-700 text-foreground">
                          {item.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">{cat.label}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-display text-base font-700 text-foreground">
                        {formatMoney(item.amount, room.currency)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Día {item.dueDay} de cada mes</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    {/* Badge de Estado */}
                    <div>
                      {paid ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-700 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3.5" /> Pagado este mes
                        </span>
                      ) : isToday ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-700 text-amber-600 dark:text-amber-400 animate-pulse">
                          <Clock className="size-3.5" /> ¡Vence hoy!
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-700 text-destructive">
                          <AlertCircle className="size-3.5" /> Venció hace {Math.abs(daysRemaining)} días
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-600 text-muted-foreground">
                          <Calendar className="size-3.5" /> Vence en {daysRemaining} días
                        </span>
                      )}
                    </div>

                    {/* Botones de acción */}
                    <div className="flex items-center gap-1.5">
                      {!paid && (
                        <button
                          onClick={() => handlePay(item)}
                          disabled={payingId === item.id}
                          className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-700 text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 disabled:opacity-50"
                        >
                          <CalendarCheck className="size-3.5" />
                          <span>{payingId === item.id ? 'Registrando…' : 'Pagar'}</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Editar gasto fijo"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Eliminar gasto fijo"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal Crear / Editar Gasto Fijo */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-strong relative w-full max-w-md overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-2xl animate-pop-in">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>

            <h3 className="font-display text-xl font-700 text-foreground">
              {editingItem ? 'Editar Gasto Fijo' : 'Nuevo Gasto Fijo'}
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Configura el monto y el día límite de pago de cada mes
            </p>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-700 text-foreground">
                  Nombre del gasto fijo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Arriendo, Plan Internet, Netflix, Gimnasio"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-700 text-foreground">
                  Monto mensual ({room.currency})
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 font-display text-lg font-700 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-700 text-foreground">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as CategoryId)}
                    className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm font-600 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-700 text-foreground">
                    Día límite de pago
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    placeholder="Día (1-31)"
                    className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm font-700 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-2xl border border-border bg-muted py-2.5 text-xs font-700 text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-primary py-2.5 font-display text-xs font-700 text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5"
                >
                  {editingItem ? 'Guardar Cambios' : 'Añadir Gasto Fijo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
