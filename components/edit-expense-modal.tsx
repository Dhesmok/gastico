'use client'

import { useEffect, useState } from 'react'
import { Check, Trash2, X } from 'lucide-react'
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  categoryOf,
  formatMoney,
  type CategoryId,
  type Expense,
  type Kind,
} from '@/lib/finance'
import { cn } from '@/lib/utils'

export function EditExpenseModal({
  expense,
  currency,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: {
  expense: Expense | null
  currency: string
  isOpen: boolean
  onClose: () => void
  onSave: (id: string, patch: Partial<Expense>) => void
  onDelete: (id: string) => void
}) {
  const [kind, setKind] = useState<Kind>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<CategoryId>('otros')
  const [note, setNote] = useState('')
  const [date, setDate] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (expense) {
      setKind(expense.kind)
      setAmount(String(expense.amount))
      setCategory(expense.category)
      setNote(expense.note)
      setDate(expense.occurredAt.slice(0, 10))
      setConfirmDelete(false)
    }
  }, [expense])

  if (!isOpen || !expense) return null

  const categories = kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const num = Math.round(Number(amount))
    if (!Number.isFinite(num) || num <= 0) return

    onSave(expense!.id, {
      kind,
      amount: num,
      category,
      note: note.trim(),
      occurredAt: date ? new Date(`${date}T12:00:00`).toISOString() : expense!.occurredAt,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-strong relative w-full max-w-md overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-2xl animate-pop-in">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <h3 className="font-display text-xl font-700 text-foreground">Corregir Movimiento</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Modifica los detalles, cambia de gasto a ingreso o elimínalo
        </p>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {/* Selector Gasto / Ingreso */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => {
                setKind('expense')
                if (!EXPENSE_CATEGORIES.some((c) => c.id === category)) setCategory('mercado')
              }}
              className={cn(
                'rounded-xl py-2 text-xs font-700 transition-all',
                kind === 'expense'
                  ? 'bg-destructive/15 text-destructive shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              💸 Es un Gasto
            </button>
            <button
              type="button"
              onClick={() => {
                setKind('income')
                if (!INCOME_CATEGORIES.some((c) => c.id === category)) setCategory('nomina')
              }}
              className={cn(
                'rounded-xl py-2 text-xs font-700 transition-all',
                kind === 'income'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              💰 Es un Ingreso
            </button>
          </div>

          {/* Monto */}
          <div>
            <label className="mb-1 block text-xs font-700 text-foreground">
              Monto ({currency})
            </label>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 font-display text-lg font-700 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="0"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="mb-1 block text-xs font-700 text-foreground">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryId)}
              className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm font-600 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Descripción / Nota */}
          <div>
            <label className="mb-1 block text-xs font-700 text-foreground">Descripción / Nota</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Ej: Éxito mercado, Domicilio, etc."
              maxLength={200}
            />
          </div>

          {/* Fecha */}
          <div>
            <label className="mb-1 block text-xs font-700 text-foreground">Fecha del movimiento</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Botones de acción */}
          <div className="mt-2 flex flex-col gap-2">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-display text-sm font-700 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5"
            >
              <Check className="size-4" /> Guardar Cambios
            </button>

            {confirmDelete ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onDelete(expense.id)
                    onClose()
                  }}
                  className="flex-1 rounded-2xl bg-destructive py-2 text-xs font-700 text-destructive-foreground transition-all"
                >
                  Sí, borrar definitivamente
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-2xl border border-border bg-muted px-4 py-2 text-xs font-700 text-foreground"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center justify-center gap-1.5 py-1.5 text-xs font-600 text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="size-3.5" /> Borrar este movimiento
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
