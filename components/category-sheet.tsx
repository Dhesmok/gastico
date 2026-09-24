'use client'

// ---------------------------------------------------------------------------
// El corrector de categoría.
//
// La IA acierta casi siempre, pero "el corral" puede caer en ocio cuando para
// ustedes es antojo. Con dos toques queda corregido, y de paso la app aprende:
// esa nota entra en la memoria de la sala y la próxima vez cae bien sola.
// ---------------------------------------------------------------------------

import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  formatMoney,
  categoryOf,
  type CategoryId,
  type Expense,
} from '@/lib/finance'
import { stripRecurringTag } from '@/lib/recurring'
import { Sheet } from '@/components/sheet'
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
  const current = categoryOf(expense.category)

  return (
    <Sheet
      title="¿En qué va?"
      subtitle={`${stripRecurringTag(expense.note) || current.label} · ${formatMoney(expense.amount, currency)}`}
      onClose={onClose}
    >
      <Group title="Gastos" categories={EXPENSE_CATEGORIES} current={expense.category} onPick={onPick} />
      <Group title="Ingresos" categories={INCOME_CATEGORIES} current={expense.category} onPick={onPick} />

      <p className="label mt-4 leading-relaxed">
        Si lo corriges dos veces, Cuenti aprende y la próxima vez lo pone solo.
      </p>
    </Sheet>
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
      <p className="eyebrow mb-2 mt-4 first:mt-1">{title}</p>
      <div className="grid grid-cols-3 gap-2">
        {categories.map((cat) => {
          const active = cat.id === current
          return (
            <button
              key={cat.id}
              onClick={() => onPick(cat.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-center transition-transform active:scale-95',
                active ? 'ink' : 'bg-card',
              )}
              style={
                active
                  ? undefined
                  : { backgroundColor: `color-mix(in srgb, ${cat.color} 12%, var(--card))` }
              }
            >
              <span className="text-xl leading-none">{cat.emoji}</span>
              <span
                className={cn(
                  'text-xs font-700 leading-tight',
                  active ? 'text-ink-foreground' : 'text-foreground',
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
