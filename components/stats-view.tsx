'use client'

import {
  byAuthor,
  byCategory,
  dailySeries,
  formatCompactCOP,
  formatCOP,
  PEOPLE,
  totalOf,
  type Expense,
  type Settings,
} from '@/lib/finance'
import { BudgetSummary } from '@/components/budget-summary'

export function StatsView({
  expenses,
  settings,
}: {
  expenses: Expense[]
  settings: Settings
}) {
  const spent = totalOf(expenses)
  const cats = byCategory(expenses)
  const people = byAuthor(expenses)
  const series = dailySeries(expenses, 12)
  const maxCat = Math.max(...cats.map((c) => c.total), 1)
  const maxDay = Math.max(...series.map((s) => s.total), 1)
  const peopleTotal = people.me + people.partner || 1

  return (
    <div className="mx-auto h-[calc(100svh-4rem)] w-full max-w-2xl overflow-y-auto no-scrollbar px-4 py-5">
      <div className="flex flex-col gap-4 pb-8">
        <div>
          <h2 className="font-display text-2xl font-700 text-foreground">Estadísticas</h2>
          <p className="text-sm text-muted-foreground">Cómo van las finanzas del mes</p>
        </div>

        <BudgetSummary spent={spent} settings={settings} />

        {/* Métricas rápidas */}
        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Movimientos" value={String(expenses.length)} />
          <MiniStat label="Promedio" value={formatCompactCOP(spent / (expenses.length || 1))} />
          <MiniStat
            label="Gasto/día"
            value={formatCompactCOP(spent / 30)}
          />
        </div>

        {/* Desglose por categoría */}
        <section className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm">
          <h3 className="mb-3 font-display text-base font-700 text-foreground">Por categoría</h3>
          <div className="flex flex-col gap-3">
            {cats.map(({ category, total }) => (
              <div key={category.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-600 text-foreground">
                    {category.emoji} {category.label}
                  </span>
                  <span className="font-700 text-muted-foreground">{formatCOP(total)}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${(total / maxCat) * 100}%`, backgroundColor: category.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Gasto por persona */}
        <section className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm">
          <h3 className="mb-3 font-display text-base font-700 text-foreground">Quién gastó qué</h3>
          <div className="flex h-4 w-full overflow-hidden rounded-full">
            <div
              className="h-full transition-all duration-700"
              style={{ width: `${(people.me / peopleTotal) * 100}%`, backgroundColor: PEOPLE.me.color }}
            />
            <div
              className="h-full transition-all duration-700"
              style={{ width: `${(people.partner / peopleTotal) * 100}%`, backgroundColor: PEOPLE.partner.color }}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <PersonStat name={PEOPLE.me.name} color={PEOPLE.me.color} amount={people.me} pct={(people.me / peopleTotal) * 100} />
            <PersonStat name={PEOPLE.partner.name} color={PEOPLE.partner.color} amount={people.partner} pct={(people.partner / peopleTotal) * 100} />
          </div>
        </section>

        {/* Tendencia diaria */}
        <section className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm">
          <h3 className="mb-4 font-display text-base font-700 text-foreground">Últimos 12 días</h3>
          <div className="flex h-32 items-end justify-between gap-1.5">
            {series.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-lg bg-primary/80 transition-all duration-700 ease-out hover:bg-primary"
                    style={{ height: `${d.total === 0 ? 2 : Math.max(6, (d.total / maxDay) * 100)}%` }}
                    title={formatCOP(d.total)}
                  />
                </div>
                <span className="text-[9px] font-600 text-muted-foreground">{d.day.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 p-3 text-center shadow-sm">
      <p className="font-display text-lg font-700 text-foreground">{value}</p>
      <p className="text-[11px] font-600 text-muted-foreground">{label}</p>
    </div>
  )
}

function PersonStat({
  name,
  color,
  amount,
  pct,
}: {
  name: string
  color: string
  amount: number
  pct: number
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <div className="min-w-0">
        <p className="truncate text-sm font-700 text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">
          {formatCOP(amount)} · {Math.round(pct)}%
        </p>
      </div>
    </div>
  )
}
