'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, Plus, Trash2 } from 'lucide-react'
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
import { FieldLabel, Sheet, inputClass } from '@/components/sheet'
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
  const [confirmDelete, setConfirmDelete] = useState(false)

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
    setConfirmDelete(false)
    setModalOpen(true)
  }

  function handleOpenEdit(item: RecurringExpense) {
    setEditingItem(item)
    setName(item.name)
    setAmount(String(item.amount))
    setCategory(item.category)
    setDueDay(String(item.dueDay))
    setConfirmDelete(false)
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

  const paidCount = statuses.filter((s) => s.paid).length
  // Primero lo que falta pagar, ordenado por urgencia; lo pagado, al final.
  const ordered = [...statuses].sort((a, b) => {
    if (a.paid !== b.paid) return a.paid ? 1 : -1
    return a.daysRemaining - b.daysRemaining
  })

  return (
    <div className="no-scrollbar pb-dock mx-auto h-[calc(100svh-var(--app-header))] w-full max-w-2xl overflow-y-auto px-4 pt-2">
      <div className="flex flex-col gap-5">
        {/* Una sola cifra: lo que falta pagar este mes. */}
        {statuses.length > 0 && (
          <section className="ink rounded-[1.75rem] p-5">
            <p className="eyebrow" style={{ color: 'var(--ink-muted)' }}>
              {totalPending > 0 ? 'Falta pagar este mes' : 'Todo pagado este mes'}
            </p>
            <p className="hero-number mt-2 text-[2.75rem]">
              {formatMoney(totalPending > 0 ? totalPending : totalMonthly, room.currency)}
            </p>
            {/* Un segmento por cada fijo: se van llenando a medida que se pagan. */}
            <div className="mt-5 flex gap-1">
              {ordered
                .slice()
                .sort((a, b) => Number(b.paid) - Number(a.paid))
                .map(({ item, paid }) => (
                  <span
                    key={item.id}
                    className={cn('h-2 flex-1 rounded-full', paid ? 'bg-highlight' : 'bg-white/12')}
                  />
                ))}
            </div>
            <p className="mt-2.5 text-[13px] text-ink-muted">
              {paidCount} de {statuses.length} pagados · {formatMoney(totalMonthly, room.currency)} al mes
            </p>
          </section>
        )}

        {loading && statuses.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : statuses.length === 0 ? (
          <div className="flex flex-col items-center px-6 pt-14 text-center">
            <span className="text-5xl">🗓️</span>
            <h2 className="mt-4 font-display text-2xl font-500 text-foreground">
              Sin gastos fijos todavía
            </h2>
            <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
              El arriendo, el internet, la luz… con su día de pago, para que no se les pase ninguno.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-6 flex h-12 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-700 text-background active:opacity-80"
            >
              <Plus className="size-4" /> Añadir el primero
            </button>
          </div>
        ) : (
          <section>
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="eyebrow">Este mes</h3>
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-1 text-xs font-700 text-foreground"
              >
                <Plus className="size-3.5" /> Añadir
              </button>
            </div>
            <div className="surface overflow-hidden">
              {ordered.map(({ item, paid, daysRemaining, isOverdue, isToday }) => {
                const cat = categoryOf(item.category)
                const estado = paid
                  ? { text: 'Pagado', className: 'text-positive' }
                  : isToday
                    ? { text: 'Vence hoy', className: 'text-warning font-800' }
                    : isOverdue
                      ? {
                          text: `Venció hace ${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? 'día' : 'días'}`,
                          className: 'text-destructive font-800',
                        }
                      : {
                          text: `En ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'} · el ${item.dueDay}`,
                          className: 'text-muted-foreground',
                        }

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
                  >
                    {/* Tocar la fila abre la edición; el botón de la derecha paga. */}
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-70"
                    >
                      <span
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-2xl text-lg',
                          paid && 'grayscale',
                        )}
                        style={{ backgroundColor: `color-mix(in srgb, ${cat.color} 16%, transparent)` }}
                      >
                        {cat.emoji}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={cn(
                            'block truncate text-[15px] font-700',
                            paid ? 'text-muted-foreground line-through decoration-1' : 'text-foreground',
                          )}
                        >
                          {item.name}
                        </span>
                        <span className={cn('block truncate text-xs font-600', estado.className)}>
                          {estado.text}
                        </span>
                      </span>
                    </button>

                    <span
                      className={cn(
                        'amount shrink-0 text-sm',
                        paid ? 'text-muted-foreground' : 'text-foreground',
                      )}
                    >
                      {formatMoney(item.amount, room.currency)}
                    </span>

                    {paid ? (
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-positive/15 text-positive">
                        <Check className="size-4" strokeWidth={2.6} />
                      </span>
                    ) : (
                      <button
                        onClick={() => handlePay(item)}
                        disabled={payingId === item.id}
                        aria-label={`Marcar ${item.name} como pagado`}
                        className="flex h-9 shrink-0 items-center justify-center rounded-full bg-foreground px-3.5 text-xs font-800 text-background transition-opacity active:opacity-70 disabled:opacity-50"
                      >
                        {payingId === item.id ? <Loader2 className="size-4 animate-spin" /> : 'Pagar'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="label mt-3 px-1">
              Al pagar se anota el gasto y le aparece a toda la casa.
            </p>
          </section>
        )}
      </div>

      {modalOpen && (
        <Sheet
          title={editingItem ? 'Editar gasto fijo' : 'Nuevo gasto fijo'}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            <label className="block">
              <FieldLabel>Nombre</FieldLabel>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Arriendo, internet, Netflix…"
                className={inputClass}
              />
            </label>

            <label className="block">
              <FieldLabel>Monto mensual · {room.currency}</FieldLabel>
              <div className="flex items-baseline gap-1 border-b-2 border-foreground/15 pb-1 focus-within:border-foreground">
                <span className="hero-number text-3xl text-muted-foreground">$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="hero-number w-full bg-transparent text-4xl text-foreground outline-none"
                />
              </div>
            </label>

            <div>
              <FieldLabel>Categoría</FieldLabel>
              <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
                {EXPENSE_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-[13px] font-700 transition-colors',
                      category === c.id
                        ? 'ink border-transparent'
                        : 'border-border bg-card text-foreground',
                    )}
                  >
                    <span>{c.emoji}</span>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <FieldLabel>Se paga el día</FieldLabel>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="31"
                required
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                placeholder="1 a 31"
                className={cn(inputClass, 'w-28')}
              />
            </label>

            <div className="mt-1 flex flex-col gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-foreground text-[15px] font-700 text-background transition-opacity active:opacity-80 disabled:opacity-60"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : editingItem ? 'Guardar' : 'Añadir'}
              </button>

              {editingItem &&
                (confirmDelete ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleDelete(editingItem.id)
                        setModalOpen(false)
                      }}
                      className="h-11 flex-1 rounded-2xl bg-destructive text-sm font-700 text-white"
                    >
                      Sí, eliminarlo
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="h-11 flex-1 rounded-2xl bg-muted text-sm font-700 text-foreground"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="flex h-11 items-center justify-center gap-1.5 text-sm font-700 text-destructive"
                  >
                    <Trash2 className="size-4" /> Eliminar gasto fijo
                  </button>
                ))}
            </div>
          </form>
        </Sheet>
      )}
    </div>
  )
}
