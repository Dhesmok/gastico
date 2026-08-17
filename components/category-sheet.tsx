'use client'

// ---------------------------------------------------------------------------
// El corrector de categoría.
//
// La IA acierta casi siempre, pero "el corral" puede caer en ocio cuando para
// ustedes es antojo. Con dos toques queda corregido, y de paso la app aprende:
// esa nota entra en la memoria de la sala y la próxima vez cae bien sola.
// ---------------------------------------------------------------------------

import { useEffect } from 'react'
import { X } from 'lucide-react'
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  categoryOf,
  formatMoney,
  type CategoryId,
  type Expense,
} from '@/lib/finance'
import { cn } from '@/lib/utils'

export function CategorySheet({
  expense,
  currency,
  onPick,
  onClose,
}: {
  expense: Expense
  currency: string
  onPick: (category: CategoryId) => void
  onClose: () => void
}) {
  // En el celular se cierra con el botón; en el escritorio, con Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const current = categoryOf(expense.category)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Cerrar"
      />

      <div className="animate-pop-in relative max-h-[85svh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-card p-4 shadow-2xl sm:rounded-3xl">
        <div className="mb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-700 text-foreground">
              ¿En qué va este movimiento?
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {expense.note || current.label} · {formatMoney(expense.amount, currency)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>

        <Group
          title="Gastos"
          categories={EXPENSE_CATEGORIES}
          current={expense.category}
          onPick={onPick}
        />
        <Group
          title="Ingresos"
          categories={INCOME_CATEGORIES}
          current={expense.category}
          onPick={onPick}
        />

        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Si lo corriges dos veces, Cuenti aprende: la próxima vez que escribas algo parecido lo
          manda solo a esa categoría.
        </p>
      </div>
    </div>
  )
}

function Group({
  title,
  categories,
  current,
  onPick,
}: {
  title: string
  categories: { id: CategoryId; label: string; emoji: string; color: string }[]
  current: CategoryId
  onPick: (category: CategoryId) => void
}) {
  return (
    <>
      <p className="mb-1.5 mt-3 text-[11px] font-700 uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {categories.map((cat) => {
          const active = cat.id === current
          return (
            <button
              key={cat.id}
              onClick={() => onPick(cat.id)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 text-center transition-all hover:-translate-y-0.5',
                active ? 'border-primary bg-primary/10' : 'border-border bg-background',
              )}
              style={active ? undefined : { backgroundColor: `color-mix(in oklch, ${cat.color} 8%, transparent)` }}
            >
              <span className="text-lg leading-none">{cat.emoji}</span>
              <span
                className={cn(
                  'text-[11px] font-700 leading-tight',
                  active ? 'text-primary' : 'text-foreground',
                )}
              >
                {cat.label}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
