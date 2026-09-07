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
        'relative overflow-hidden rounded-3xl border p-4 shadow-sm transition-all duration-300 backdrop-blur-md',
        overIncome
          ? 'border-destructive/40 bg-gradient-to-br from-destructive/15 via-card/90 to-destructive/10'
          : overCap
            ? 'border-chart-3/50 bg-gradient-to-br from-chart-3/15 via-card/90 to-chart-3/10'
            : 'border-border/80 bg-gradient-to-br from-card/95 via-card/90 to-primary/[0.04] shadow-sm',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-700 uppercase tracking-wider text-muted-foreground">
            Gastado · {period.label}
          </p>
          <p className="font-display text-2xl font-800 tracking-tight text-foreground sm:text-3xl">
            {formatMoney(spent, room.currency)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-700 uppercase tracking-wider text-muted-foreground">
            {overIncome ? 'Excedido' : 'Disponible'}
          </p>
          <p
            className={cn(
              'font-display text-lg font-800 sm:text-xl',
              overIncome ? 'text-destructive' : 'text-emerald-500 dark:text-emerald-400',
            )}
          >
            {overIncome && '-'}
            {formatMoney(Math.abs(remaining), room.currency)}
          </p>
        </div>
      </div>

      {cap > 0 && (
        <div className="mt-3.5">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-700 text-muted-foreground">
            <span>Tope: {formatMoney(cap, room.currency)}</span>
            <span className={cn(overCap && 'text-destructive font-800')}>{Math.round(capPct)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/80 p-0.5">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700 ease-out',
                overIncome
                  ? 'bg-gradient-to-r from-orange-500 to-destructive'
                  : overCap
                    ? 'bg-gradient-to-r from-amber-400 to-chart-3'
                    : 'bg-gradient-to-r from-primary via-primary to-accent',
              )}
              style={{ width: `${Math.max(3, capPct)}%` }}
            />
          </div>
        </div>
      )}

      {!compact && (
        <div
          className={cn(
            'mt-3.5 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-xs font-600 leading-relaxed border',
            overIncome
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : overCap
                ? 'border-chart-3/30 bg-chart-3/12 text-foreground'
                : 'border-accent/20 bg-accent/10 text-foreground',
          )}
        >
          {overIncome ? (
            <>
              <AlertTriangle className="size-4 shrink-0 text-destructive" />
              <span>¡Alto ahí! Van gastando más de lo que entró este mes. 😳</span>
            </>
          ) : overCap ? (
            <>
              <AlertTriangle className="size-4 shrink-0 text-chart-3" />
              <span>Pasaron el tope presupuestado. Mucho cuidado con los gastos hormiga. 👀</span>
            </>
          ) : budgetIncome > 0 ? (
            <>
              <TrendingUp className="size-4 shrink-0 text-emerald-500" />
              <span>
                ¡Van súper bien! Llevan el {Math.round(incomePct)}% de{' '}
                {income.usesRegistered ? 'lo recibido' : 'la nómina'}
                {income.extra > 0 && ` (+ ${formatMoney(income.extra, room.currency)} extra)`}. 🎉
              </span>
            </>
          ) : (
            <>
              <TrendingUp className="size-4 shrink-0 text-primary" />
              <span>Configura tu nómina y tope en Ajustes para activar el semáforo inteligente. 🎯</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
