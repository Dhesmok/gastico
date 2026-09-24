'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type CategoryId,
  type Expense,
  type Kind,
} from '@/lib/finance'
import { stripRecurringTag } from '@/lib/recurring'
import { FieldLabel, Sheet, inputClass } from '@/components/sheet'
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
      setNote(stripRecurringTag(expense.note))
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

    const tagMatch = expense!.note.match(/\[fijo:[^\]]+\]/)
    const trimmed = note.trim()
    const finalNote = tagMatch && !trimmed.includes(tagMatch[0]) ? `${trimmed} ${tagMatch[0]}`.trim() : trimmed

    onSave(expense!.id, {
      kind,
      amount: num,
      category,
      note: finalNote,
      occurredAt: date ? new Date(`${date}T12:00:00`).toISOString() : expense!.occurredAt,
    })
    onClose()
  }

  return (
    <Sheet title="Corregir movimiento" onClose={onClose}>
      <form onSubmit={handleSave} className="flex flex-col gap-5">
        {/* Gasto o ingreso */}
        <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
          {(
            [
              { id: 'expense' as Kind, label: 'Gasto' },
              { id: 'income' as Kind, label: 'Ingreso' },
            ]
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setKind(option.id)
                if (option.id === 'expense' && !EXPENSE_CATEGORIES.some((c) => c.id === category))
                  setCategory('mercado')
                if (option.id === 'income' && !INCOME_CATEGORIES.some((c) => c.id === category))
                  setCategory('nomina')
              }}
              className={cn(
                'rounded-full py-2 text-sm font-700 transition-colors',
                kind === option.id ? 'ink' : 'text-muted-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* El monto, grande: es lo que más se corrige. */}
        <label className="block">
          <FieldLabel>Monto · {currency}</FieldLabel>
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
              className="hero-number w-full bg-transparent text-4xl text-foreground outline-none"
              placeholder="0"
            />
          </div>
        </label>

        <div>
          <FieldLabel>Categoría</FieldLabel>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {categories.map((c) => (
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

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <label className="block min-w-0">
            <FieldLabel>Nota</FieldLabel>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputClass}
              placeholder="Ej: mercado del mes"
              maxLength={200}
            />
          </label>
          <label className="block">
            <FieldLabel>Fecha</FieldLabel>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={cn(inputClass, 'w-[9.5rem] px-3')}
            />
          </label>
        </div>

        <div className="mt-1 flex flex-col gap-2">
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-foreground text-[15px] font-700 text-background transition-opacity active:opacity-80"
          >
            Guardar
          </button>

          {confirmDelete ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onDelete(expense.id)
                  onClose()
                }}
                className="h-11 flex-1 rounded-2xl bg-destructive text-sm font-700 text-white"
              >
                Sí, borrarlo
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
              <Trash2 className="size-4" /> Borrar movimiento
            </button>
          )}
        </div>
      </form>
    </Sheet>
  )
}
