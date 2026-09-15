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

  // La versión del chat: una línea con la cifra que importa y otra con la
  // barra. Sin marco ni degradados, para que no compita con la conversación.
  if (compact) {
    return (
      <div className="px-1 py-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate">
            <span className="amount text-lg text-foreground">
              {formatMoney(spent, room.currency)}
            </span>
            <span className="label ml-1.5">gastado</span>
          </p>

          {budgetIncome > 0 && (
            <p className="shrink-0">
              <span className="label mr-1.5">{overIncome ? 'excedido' : 'queda'}</span>
              <span
                className={cn(
                  'amount text-sm',
                  overIncome ? 'text-destructive' : 'text-positive',
                )}
              >
                {overIncome && '-'}
                {formatMoney(Math.abs(remaining), room.currency)}
              </span>
            </p>
          )}
        </div>

        {cap > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700 ease-out',
                  overIncome ? 'bg-destructive' : overCap ? 'bg-chart-3' : 'bg-primary',
                )}
                style={{ width: `${Math.max(3, capPct)}%` }}
              />
            </div>
            <span
              className={cn(
                'shrink-0 text-[11px] font-500 tabular-nums',
                overCap ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {Math.round(capPct)}% del tope
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'surface p-4',
        overIncome && 'border-destructive/40',
        !overIncome && overCap && 'border-chart-3/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label truncate">Gastado · {period.label}</p>
          <p className="amount mt-1 text-3xl text-foreground">
            {formatMoney(spent, room.currency)}
          </p>
        </div>
        {budgetIncome > 0 && (
          <div className="shrink-0 text-right">
            <p className="label">{overIncome ? 'Excedido' : 'Disponible'}</p>
            <p
              className={cn(
                'amount mt-1 text-lg',
                overIncome ? 'text-destructive' : 'text-positive',
              )}
            >
              {overIncome && '-'}
              {formatMoney(Math.abs(remaining), room.currency)}
            </p>
          </div>
        )}
      </div>

      {cap > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label">Tope {formatMoney(cap, room.currency)}</span>
            <span className={cn('label tabular-nums', overCap && 'text-destructive')}>
              {Math.round(capPct)}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
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

      {/* El comentario del semáforo: una sola línea, sin caja dentro de la caja. */}
      <div
        className={cn(
          'mt-4 flex items-start gap-2 border-t border-border pt-3 text-xs leading-relaxed',
          overIncome ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {overIncome ? (
          <>
            <AlertTriangle className="mt-px size-3.5 shrink-0" />
            <span>Van gastando más de lo que entró este mes.</span>
          </>
        ) : overCap ? (
          <>
            <AlertTriangle className="mt-px size-3.5 shrink-0 text-chart-3" />
            <span>Pasaron el tope presupuestado del periodo.</span>
          </>
        ) : budgetIncome > 0 ? (
          <>
            <TrendingUp className="mt-px size-3.5 shrink-0 text-positive" />
            <span>
              Llevan el {Math.round(incomePct)}% de{' '}
              {income.usesRegistered ? 'lo recibido' : 'la nómina'}
              {income.extra > 0 && ` (+ ${formatMoney(income.extra, room.currency)} extra)`}.
            </span>
          </>
        ) : (
          <>
            <TrendingUp className="mt-px size-3.5 shrink-0" />
            <span>Configura la nómina y el tope en Ajustes para ver el semáforo.</span>
          </>
        )}
      </div>
    </div>
  )
}
