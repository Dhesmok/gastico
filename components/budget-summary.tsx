'use client'

import { ChevronRight } from 'lucide-react'
import {
  formatCompact,
  formatMoney,
  periodRange,
  type IncomeBudget,
  type PeriodRange,
  type Room,
} from '@/lib/finance'
import { cn } from '@/lib/utils'

type Budget = {
  spent: number
  income: IncomeBudget
  room: Room
  range?: PeriodRange
}

/** Las cuentas que comparten la tira del chat y el resumen grande. */
function numbers({ spent, income, room, range }: Budget) {
  const period = range ?? periodRange('month')
  // El tope se configura por mes; al mirar un trimestre o un año hay que
  // escalarlo o la comparación no significa nada.
  const cap = room.spendingCap * period.months
  const budgetIncome = income.total
  // La barra mide contra el tope si lo hay; si no, contra lo que entró.
  const reference = cap > 0 ? cap : budgetIncome
  const pct = reference > 0 ? (spent / reference) * 100 : 0
  const remaining = budgetIncome - spent
  return {
    period,
    cap,
    budgetIncome,
    reference,
    pct,
    remaining,
    overCap: cap > 0 && spent > cap,
    overIncome: budgetIncome > 0 && spent > budgetIncome,
  }
}

/**
 * El resumen protagonista: una cifra grande en tinta, una barra y lo que
 * queda. Todo lo demás vive un toque más abajo.
 */
export function BudgetHero(props: Budget & { className?: string; caption?: string }) {
  const { spent, income, room, className, caption } = props
  const n = numbers(props)

  return (
    <section className={cn('ink relative overflow-hidden rounded-[1.75rem] p-5', className)}>
      <p className="eyebrow" style={{ color: 'var(--ink-muted)' }}>{caption ?? `Gastado · ${n.period.label}`}</p>
      <p className="hero-number mt-2 text-[2.75rem] sm:text-5xl">
        {formatMoney(spent, room.currency)}
      </p>

      {n.reference > 0 && (
        <div className="mt-5">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700 ease-out',
                n.overIncome ? 'bg-destructive' : n.overCap ? 'bg-warning' : 'bg-highlight',
              )}
              style={{ width: `${Math.min(100, Math.max(3, n.pct))}%` }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-3 text-[13px]">
            <span className="text-ink-muted">
              {Math.round(n.pct)}% {n.cap > 0 ? 'del tope' : 'de lo que entró'}{' '}
              <span className="opacity-70">· {formatCompact(n.reference)}</span>
            </span>
            {n.budgetIncome > 0 && (
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-xs font-800',
                  n.overIncome
                    ? 'bg-destructive text-white'
                    : 'bg-highlight text-highlight-foreground',
                )}
              >
                {n.overIncome ? 'Pasados ' : 'Quedan '}
                {formatMoney(Math.abs(n.remaining), room.currency)}
              </span>
            )}
          </div>
        </div>
      )}

      {n.reference === 0 && (
        <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
          Pon la nómina y el tope en Ajustes y aquí verás cuánto les queda.
        </p>
      )}

      {income.extra > 0 && n.reference > 0 && (
        <p className="mt-3 text-xs text-ink-muted">
          Incluye {formatMoney(income.extra, room.currency)} de ingresos extra.
        </p>
      )}
    </section>
  )
}

/**
 * La versión del chat: una tira delgada que se toca para ver más. Sin marco
 * pesado, para que no compita con la conversación.
 */
export function BudgetStrip(props: Budget & { onOpen?: () => void }) {
  const { spent, room, onOpen } = props
  const n = numbers(props)

  return (
    <button
      onClick={onOpen}
      className="group flex w-full items-center gap-3 rounded-2xl px-1 py-1 text-left transition-colors active:opacity-70"
      aria-label="Ver cómo van este mes"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="hero-number text-[1.35rem] text-foreground">
            {formatMoney(spent, room.currency)}
          </span>
          <span className="label truncate">este mes</span>
        </div>
        {n.reference > 0 && (
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-foreground/8">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700 ease-out',
                n.overIncome ? 'bg-destructive' : n.overCap ? 'bg-warning' : 'bg-foreground',
              )}
              style={{ width: `${Math.min(100, Math.max(3, n.pct))}%` }}
            />
          </div>
        )}
      </div>

      {n.budgetIncome > 0 && (
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-xs font-800',
            n.overIncome ? 'bg-destructive/12 text-destructive' : 'ink',
          )}
        >
          {n.overIncome ? '−' : 'Quedan '}
          {formatCompact(Math.abs(n.remaining))}
        </span>
      )}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}

/** Una frase que dice cómo van, sin números de más. */
export function budgetVerdict(props: Budget): { text: string; tone: 'bien' | 'ojo' | 'alerta' } {
  const n = numbers(props)
  if (n.overIncome) return { text: 'Van gastando más de lo que entró.', tone: 'alerta' }
  if (n.overCap) return { text: 'Ya pasaron el tope que se pusieron.', tone: 'ojo' }
  if (n.budgetIncome > 0)
    return {
      text: `Llevan el ${Math.round((props.spent / n.budgetIncome) * 100)}% de ${
        props.income.usesRegistered ? 'lo recibido' : 'la nómina'
      }.`,
      tone: 'bien',
    }
  return { text: 'Configura la nómina en Ajustes para saber cuánto les queda.', tone: 'bien' }
}
