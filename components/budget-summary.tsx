'use client'

import { AlertTriangle, TrendingUp } from 'lucide-react'
import {
  formatMoney,
  periodRange,
  type IncomeBudget,
  type PeriodRange,
  type Room,
} from '@/lib/finance'
import { cn } from '@/lib/utils'

export function BudgetSummary({
  spent,
  income,
  room,
  range,
  compact = false,
}: {
  spent: number
  income: IncomeBudget
  room: Room
  range?: PeriodRange
  compact?: boolean
}) {
  const period = range ?? periodRange('month')

  // El tope se configura por mes; al mirar un trimestre o un año hay que
  // escalarlo o la comparación no significa nada.
  const budgetIncome = income.total
  const cap = room.spendingCap * period.months

  const capPct = cap > 0 ? Math.min(100, (spent / cap) * 100) : 0
  const incomePct = budgetIncome > 0 ? Math.min(100, (spent / budgetIncome) * 100) : 0
  const overCap = cap > 0 && spent > cap
  const overIncome = budgetIncome > 0 && spent > budgetIncome
  const remaining = budgetIncome - spent

  return (
    <div
      className={cn(
        'rounded-3xl border p-4 shadow-sm transition-colors',
        overIncome
          ? 'border-destructive/40 bg-destructive/8'
          : overCap
            ? 'border-chart-3/50 bg-chart-3/10'
            : 'border-border/70 bg-card/80',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-700 uppercase tracking-wide text-muted-foreground">
            Gastado · {period.label}
          </p>
          <p className="font-display text-2xl font-700 leading-tight text-foreground">
            {formatMoney(spent, room.currency)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-600 text-muted-foreground">
            {overIncome ? 'Se pasaron por' : 'Disponible'}
          </p>
          <p
            className={cn(
              'font-display text-lg font-700',
              overIncome ? 'text-destructive' : 'text-foreground',
            )}
          >
            {formatMoney(Math.abs(remaining), room.currency)}
          </p>
        </div>
      </div>

      {cap > 0 && (
        <div className="mt-3.5">
          <div className="mb-1 flex items-center justify-between text-[11px] font-600 text-muted-foreground">
            <span>Tope: {formatMoney(cap, room.currency)}</span>
            <span>{Math.round(capPct)}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700 ease-out',
                overIncome ? 'bg-destructive' : overCap ? 'bg-chart-3' : 'bg-primary',
              )}
              style={{ width: `${Math.max(3, capPct)}%` }}
            />
          </div>
        </div>
      )}

      {!compact && (
        <div
          className={cn(
            'mt-3 flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-600 leading-relaxed',
            overIncome
              ? 'bg-destructive/12 text-destructive'
              : overCap
                ? 'bg-chart-3/15 text-foreground'
                : 'bg-accent/15 text-accent-foreground',
          )}
        >
          {overIncome ? (
            <>
              <AlertTriangle className="size-4 shrink-0" />
              <span>¡Alto ahí! Van gastando más de lo que entró. 😳</span>
            </>
          ) : overCap ? (
            <>
              <AlertTriangle className="size-4 shrink-0" />
              <span>Pasaron el tope que se pusieron. Ojito con los antojos. 👀</span>
            </>
          ) : budgetIncome > 0 ? (
            <>
              <TrendingUp className="size-4 shrink-0" />
              <span>
                Van bien: {Math.round(incomePct)}% de{' '}
                {income.usesRegistered ? 'lo que recibieron' : 'la nómina'}
                {income.extra > 0 && ` (+ ${formatMoney(income.extra, room.currency)} extra)`}. ¡Sigan
                así! 🎉
              </span>
            </>
          ) : (
            <>
              <TrendingUp className="size-4 shrink-0" />
              <span>Configura la nómina y el tope para ver qué tan bien van. 🎯</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
