'use client'

import { AlertTriangle, TrendingUp } from 'lucide-react'
import { formatCOP, type Settings } from '@/lib/finance'
import { cn } from '@/lib/utils'

export function BudgetSummary({
  spent,
  settings,
  compact = false,
}: {
  spent: number
  settings: Settings
  compact?: boolean
}) {
  const { monthlyIncome, spendingCap } = settings
  const capPct = Math.min(100, spendingCap ? (spent / spendingCap) * 100 : 0)
  const incomePct = Math.min(100, monthlyIncome ? (spent / monthlyIncome) * 100 : 0)
  const overCap = spent > spendingCap
  const overIncome = spent > monthlyIncome
  const remaining = monthlyIncome - spent

  const monthLabel = new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

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
        <div>
          <p className="text-[11px] font-700 uppercase tracking-wide text-muted-foreground">
            Gastado en {monthLabel}
          </p>
          <p className="font-display text-2xl font-700 leading-tight text-foreground">
            {formatCOP(spent)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-600 text-muted-foreground">
            {overIncome ? 'Te pasaste por' : 'Disponible'}
          </p>
          <p
            className={cn(
              'font-display text-lg font-700',
              overIncome ? 'text-destructive' : 'text-foreground',
            )}
          >
            {formatCOP(Math.abs(remaining))}
          </p>
        </div>
      </div>

      {/* Barra de progreso vs tope */}
      <div className="mt-3.5">
        <div className="mb-1 flex items-center justify-between text-[11px] font-600 text-muted-foreground">
          <span>Tope: {formatCOP(spendingCap)}</span>
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
              <span>¡Alto ahí! Van gastando más de lo que entró este mes. 😳</span>
            </>
          ) : overCap ? (
            <>
              <AlertTriangle className="size-4 shrink-0" />
              <span>Pasaron el tope que se pusieron. Ojito con los antojos. 👀</span>
            </>
          ) : (
            <>
              <TrendingUp className="size-4 shrink-0" />
              <span>Van bien: {Math.round(incomePct)}% de la nómina usada. ¡Sigan así! 🎉</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
