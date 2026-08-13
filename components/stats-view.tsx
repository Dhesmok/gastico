'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ListFilter, Trash2 } from 'lucide-react'
import {
  byCategory,
  byMember,
  categoryOf,
  filterByRange,
  formatCompact,
  formatMoney,
  incomeBudget,
  periodRange,
  PERIODS,
  sumExpenses,
  sumIncome,
  timeSeries,
  type Expense,
  type Member,
  type PeriodId,
  type Room,
} from '@/lib/finance'
import { BudgetSummary } from '@/components/budget-summary'
import { cn } from '@/lib/utils'

export function StatsView({
  room,
  members,
  expenses,
  onDeleteExpense,
}: {
  room: Room
  members: Member[]
  expenses: Expense[]
  onDeleteExpense: (id: string) => void
  onUpdateExpense: (id: string, patch: Partial<Expense>) => void
}) {
  const [period, setPeriod] = useState<PeriodId>('month')
  const [offset, setOffset] = useState(0)
  const [custom, setCustom] = useState(() => {
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: first.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) }
  })
  const [showList, setShowList] = useState(false)

  const range = useMemo(() => periodRange(period, offset, custom), [period, offset, custom])
  const items = useMemo(() => filterByRange(expenses, range), [expenses, range])

  const spent = sumExpenses(items)
  const income = sumIncome(items)
  const budget = useMemo(
    () => incomeBudget(items, room.monthlyIncome, range.months),
    [items, room.monthlyIncome, range.months],
  )
  const cats = useMemo(() => byCategory(items), [items])
  const people = useMemo(() => byMember(items, members), [items, members])
  const series = useMemo(() => timeSeries(items, range), [items, range])

  const movements = items.filter((e) => e.kind === 'expense').length
  const maxCat = Math.max(...cats.map((c) => c.total), 1)
  const maxPoint = Math.max(...series.map((s) => s.total), 1)
  const peopleTotal = people.reduce((s, p) => s + p.total, 0) || 1
  const days = Math.max(1, (range.end.getTime() - range.start.getTime()) / 86_400_000)

  return (
    <div className="no-scrollbar mx-auto h-[calc(100svh-4rem)] w-full max-w-2xl overflow-y-auto px-4 py-5">
      <div className="flex flex-col gap-4 pb-8">
        <div>
          <h2 className="font-display text-2xl font-700 text-foreground">Estadísticas</h2>
          <p className="text-sm text-muted-foreground">Cómo van las finanzas de la casa</p>
        </div>

        {/* Selector de periodo */}
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto rounded-2xl bg-muted/70 p-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPeriod(p.id)
                setOffset(0)
              }}
              className={cn(
                'shrink-0 rounded-xl px-3.5 py-2 text-sm font-700 transition-all',
                period === p.id
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' ? (
          <div className="grid grid-cols-2 gap-3">
            <DateField
              label="Desde"
              value={custom.from}
              onChange={(from) => setCustom((c) => ({ ...c, from }))}
            />
            <DateField
              label="Hasta"
              value={custom.to}
              onChange={(to) => setCustom((c) => ({ ...c, to }))}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/80 px-2 py-1.5 shadow-sm">
            <button
              onClick={() => setOffset((o) => o - 1)}
              className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Periodo anterior"
            >
              <ChevronLeft className="size-4.5" />
            </button>
            <p className="font-display text-sm font-700 text-foreground">{range.label}</p>
            <button
              onClick={() => setOffset((o) => Math.min(0, o + 1))}
              disabled={offset >= 0}
              className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
              aria-label="Periodo siguiente"
            >
              <ChevronRight className="size-4.5" />
            </button>
          </div>
        )}

        <BudgetSummary spent={spent} income={budget} room={room} range={range} />

        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Movimientos" value={String(movements)} />
          <MiniStat
            label="Promedio"
            value={formatCompact(movements ? spent / movements : 0)}
          />
          <MiniStat label="Gasto/día" value={formatCompact(spent / days)} />
        </div>

        {income > 0 && (
          <section className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-700 text-foreground">
                💰 Ingresos registrados
              </h3>
              <span className="font-display text-lg font-700 text-foreground">
                {formatMoney(income, room.currency)}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {budget.usesRegistered
                ? 'La nómina registrada reemplaza a la configurada en ajustes, para no contar la misma plata dos veces.'
                : 'Los ingresos extra se suman a la nómina configurada en ajustes.'}
            </p>
          </section>
        )}

        {/* Por categoría */}
        <section className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm">
          <h3 className="mb-3 font-display text-base font-700 text-foreground">Por categoría</h3>
          {cats.length === 0 ? (
            <Empty text="Todavía no hay gastos en este periodo." />
          ) : (
            <div className="flex flex-col gap-3">
              {cats.map(({ category, total }) => (
                <div key={category.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-600 text-foreground">
                      {category.emoji} {category.label}
                    </span>
                    <span className="font-700 text-muted-foreground">
                      {formatMoney(total, room.currency)}
                      <span className="ml-1.5 text-[11px] opacity-70">
                        {Math.round((total / (spent || 1)) * 100)}%
                      </span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${(total / maxCat) * 100}%`,
                        backgroundColor: category.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quién gastó qué */}
        {people.length > 0 && (
          <section className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm">
            <h3 className="mb-3 font-display text-base font-700 text-foreground">
              Quién registró qué
            </h3>
            <div className="flex h-4 w-full overflow-hidden rounded-full">
              {people.map((p) => (
                <div
                  key={p.nick}
                  className="h-full transition-all duration-700"
                  style={{ width: `${(p.total / peopleTotal) * 100}%`, backgroundColor: p.color }}
                  title={`${p.nick}: ${formatMoney(p.total, room.currency)}`}
                />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {people.map((p) => (
                <div key={p.nick} className="flex items-center gap-2">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-700 text-foreground">{p.nick}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(p.total, room.currency)} ·{' '}
                      {Math.round((p.total / peopleTotal) * 100)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tendencia */}
        <section className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm">
          <h3 className="mb-4 font-display text-base font-700 text-foreground">Tendencia</h3>
          {series.length === 0 ? (
            <Empty text="Sin datos para graficar." />
          ) : (
            <div className="flex h-32 items-end justify-between gap-1">
              {series.map((point, i) => (
                <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-lg bg-primary/80 transition-all duration-700 ease-out hover:bg-primary"
                      style={{
                        height: `${point.total === 0 ? 2 : Math.max(6, (point.total / maxPoint) * 100)}%`,
                      }}
                      title={`${point.label}: ${formatMoney(point.total, room.currency)}`}
                    />
                  </div>
                  {(series.length <= 16 || i % Math.ceil(series.length / 12) === 0) && (
                    <span className="truncate text-[9px] font-600 text-muted-foreground">
                      {point.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Detalle */}
        <section className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm">
          <button
            onClick={() => setShowList((s) => !s)}
            className="flex w-full items-center justify-between text-left"
          >
            <h3 className="flex items-center gap-2 font-display text-base font-700 text-foreground">
              <ListFilter className="size-4 text-primary" />
              Detalle de movimientos
            </h3>
            <span className="text-xs font-700 text-primary">
              {showList ? 'Ocultar' : `Ver ${items.length}`}
            </span>
          </button>

          {showList && (
            <div className="mt-3 flex flex-col gap-1.5">
              {items.length === 0 && <Empty text="Nada registrado en este periodo." />}
              {items.map((e) => {
                const cat = categoryOf(e.category)
                return (
                  <div
                    key={e.id}
                    className="group flex items-center gap-3 rounded-2xl bg-muted/50 px-3 py-2.5"
                  >
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-xl text-base"
                      style={{ backgroundColor: `color-mix(in oklch, ${cat.color} 20%, transparent)` }}
                    >
                      {cat.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-600 text-foreground">
                        {e.note || cat.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(e.occurredAt).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                        })}{' '}
                        · {e.nick}
                      </p>
                    </div>
                    <span
                      className="shrink-0 font-display text-sm font-700 text-foreground"
                      style={e.kind === 'income' ? { color: 'var(--cat-nomina)' } : undefined}
                    >
                      {e.kind === 'income' ? '+' : ''}
                      {formatMoney(e.amount, room.currency)}
                    </span>
                    <button
                      onClick={() => onDeleteExpense(e.id)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Borrar movimiento"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
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

function DateField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-700 uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm font-600 text-foreground shadow-sm outline-none focus:ring-2 focus:ring-primary/30"
      />
    </label>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="py-3 text-center text-xs text-muted-foreground">{text}</p>
}
