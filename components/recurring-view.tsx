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
  createRecurring,
  deleteRecurring,
  fetchRecurring,
  getRecurringStatus,
  migrateLocalRecurring,
  subscribeToRecurring,
  updateRecurring,
  type RecurringExpense,
  type RecurringStatus,
} from '@/lib/recurring'
import { getSupabase } from '@/lib/supabase/client'
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // La lista es de la sala: se carga de Supabase y se mantiene al día sola,
  // así lo que anota uno le aparece al otro sin recargar.
  useEffect(() => {
    let cancelled = false

    async function load(first = false) {
      try {
        let items = await fetchRecurring(room.id)
        if (first) {
          // Rescata lo que hubiera quedado guardado sólo en este celular.
          items = await migrateLocalRecurring(room.id, me.userId, items)
        }
        if (!cancelled) setRecurringList(items)
      } catch (error) {
        if (!cancelled) {
          notify(error instanceof Error ? error.message : 'No pude cargar los gastos fijos.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    setLoading(true)
    load(true)

    const channel = subscribeToRecurring(room.id, () => load())
    return () => {
      cancelled = true
      getSupabase().removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, me.userId])

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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const num = Math.round(Number(amount))
    const day = Math.min(31, Math.max(1, Number(dueDay) || 1))
    if (!name.trim() || num <= 0 || saving) return

    const patch = { name: name.trim(), amount: num, category, dueDay: day }
    const previous = recurringList
    setSaving(true)

    try {
      if (editingItem) {
        // Se pinta de una y se corrige si el guardado falla.
        setRecurringList((list) =>
          list.map((item) => (item.id === editingItem.id ? { ...item, ...patch } : item)),
        )
        await updateRecurring(editingItem.id, patch)
        notify('Gasto fijo actualizado para toda la casa.')
      } else {
        const creado = await createRecurring(room.id, me.userId, { ...patch, active: true })
        setRecurringList((list) => [...list, creado])
        notify('Gasto fijo añadido. Tu pareja también lo verá.')
      }
      setModalOpen(false)
    } catch (error) {
      setRecurringList(previous)
      notify(error instanceof Error ? error.message : 'No pude guardarlo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const previous = recurringList
    setRecurringList((list) => list.filter((item) => item.id !== id))
    try {
      await deleteRecurring(id)
      notify('Gasto fijo eliminado.')
    } catch (error) {
      setRecurringList(previous)
      notify(error instanceof Error ? error.message : 'No pude eliminarlo.')
    }
  }

  async function handlePay(item: RecurringExpense) {
    setPayingId(item.id)
    try {
      await onAddExpense({
        kind: 'expense',
        amount: item.amount,
        category: item.category,
        note: `${item.name} [fijo:${item.id}]`,
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
    <div className="no-scrollbar mx-auto h-[calc(100svh-var(--app-header)-var(--app-bottom-nav))] md:h-[calc(100svh-var(--app-header))] w-full max-w-2xl overflow-y-auto px-4 py-4 sm:py-5">
      <div className="flex flex-col gap-4 pb-12 sm:pb-8">
        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-600 text-foreground">Gastos fijos</h2>
            <p className="label">Los pagos del mes y sus fechas límite</p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-4 py-2 font-display text-sm font-600 text-primary-foreground transition-colors active:opacity-70"
          >
            <Plus className="size-4" />
            <span>Nuevo fijo</span>
          </button>
        </div>

        {/* Resumen del mes: tres cifras en la misma tarjeta, separadas por una
            línea. Antes eran tres cajas de colores distintos peleando entre sí. */}
        <div className="surface grid grid-cols-3 divide-x divide-border">
          <div className="px-3 py-3">
            <p className="label">Total</p>
            <p className="amount mt-0.5 text-foreground">
              {formatMoney(totalMonthly, room.currency)}
            </p>
          </div>
          <div className="px-3 py-3">
            <p className="label">Pagados</p>
            <p className="amount mt-0.5 text-positive">{formatMoney(totalPaid, room.currency)}</p>
          </div>
          <div className="px-3 py-3">
            <p className="label">Pendientes</p>
            <p className="amount mt-0.5 text-foreground">
              {formatMoney(totalPending, room.currency)}
            </p>
          </div>
        </div>

        {/* Lista de Gastos Fijos */}
        <div className="flex flex-col gap-3">
          {statuses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center">
              <CalendarClock className="mb-2 size-8 text-muted-foreground/40" />
              <p className="font-display text-[15px] font-600 text-foreground">
                No tienes gastos fijos aún
              </p>
              <p className="label mt-1 max-w-xs">
                Añade el arriendo, el internet o la luz con su día de pago para no olvidarlos.
              </p>
              <button
                onClick={handleOpenCreate}
                className="mt-4 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 font-display text-sm font-600 text-primary-foreground transition-colors"
              >
                <Plus className="size-4" /> Añadir el primero
              </button>
            </div>
          ) : (
            statuses.map(({ item, paid, daysRemaining, isOverdue, isToday }) => {
              const cat = categoryOf(item.category)
              // El estado va en una línea de texto con su punto de color. Antes
              // cada tarjeta se teñía entera y la lista parecía un semáforo.
              const estado = paid
                ? { text: 'Pagado este mes', color: 'var(--positive)', Icon: CheckCircle2 }
                : isToday
                  ? { text: 'Vence hoy', color: 'var(--chart-3)', Icon: Clock }
                  : isOverdue
                    ? {
                        text: `Venció hace ${Math.abs(daysRemaining)} días`,
                        color: 'var(--destructive)',
                        Icon: AlertCircle,
                      }
                    : {
                        text: `Vence en ${daysRemaining} días`,
                        color: 'var(--muted-foreground)',
                        Icon: Calendar,
                      }

              return (
                <div key={item.id} className={cn('surface p-4', paid && 'opacity-65')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="text-xl leading-none">{cat.emoji}</span>
                      <div className="min-w-0">
                        <h4 className="truncate font-display text-[15px] font-600 text-foreground">
                          {item.name}
                        </h4>
                        <p className="label truncate">
                          {cat.label} · día {item.dueDay} de cada mes
                        </p>
                      </div>
                    </div>
                    <p className="amount shrink-0 text-foreground">
                      {formatMoney(item.amount, room.currency)}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                    <span
                      className="flex min-w-0 items-center gap-1.5 text-xs font-500"
                      style={{ color: estado.color }}
                    >
                      <estado.Icon className="size-3.5 shrink-0" />
                      <span className="truncate">{estado.text}</span>
                    </span>

                    <div className="flex shrink-0 items-center gap-1">
                      {!paid && (
                        <button
                          onClick={() => handlePay(item)}
                          disabled={payingId === item.id}
                          className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-600 text-primary-foreground transition-colors disabled:opacity-50"
                        >
                          <CalendarCheck className="size-3.5" />
                          <span>{payingId === item.id ? 'Registrando…' : 'Pagar'}</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Editar gasto fijo"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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

            <h3 className="font-display text-lg font-600 text-foreground">
              {editingItem ? 'Editar Gasto Fijo' : 'Nuevo Gasto Fijo'}
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Configura el monto y el día límite de pago de cada mes
            </p>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-500 text-foreground">
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
                <label className="mb-1 block text-xs font-500 text-foreground">
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
                  className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 amount text-lg text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-500 text-foreground">Categoría</label>
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
                  <label className="mb-1 block text-xs font-500 text-foreground">
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
                    className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm font-600 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-2xl border border-border bg-muted py-2.5 text-xs font-500 text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-primary py-2.5 font-display text-sm font-600 text-primary-foreground transition-colors"
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
