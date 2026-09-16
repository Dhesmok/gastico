'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Edit2, ListFilter, Trash2, X } from 'lucide-react'
import {
  buildInsights,
  byCategory,
  byMember,
  byNature,
  categoryOf,
  filterByRange,
  formatCompact,
  formatMoney,
  heaviestDay,
  incomeBudget,
  pace,
  periodRange,
  PERIODS,
  previousRange,
  savingsRate,
  sumExpenses,
  sumIncome,
  timeSeries,
  topExpenses,
  type CategoryId,
  type Expense,
  type Insight,
  type Member,
  type PeriodId,
  type Room,
} from '@/lib/finance'
import { BudgetSummary } from '@/components/budget-summary'
import { CategorySheet } from '@/components/category-sheet'
import { stripRecurringTag } from '@/lib/recurring'
import { cn } from '@/lib/utils'

type Filter = { category: CategoryId | null; nick: string | null }

export function StatsView({
  room,
  members,
  expenses,
  onEditExpense,
  onDeleteExpense,
  onUpdateExpense,
}: {
  room: Room
  members: Member[]
  expenses: Expense[]
  onEditExpense: (expense: Expense) => void
  onDeleteExpense: (id: string) => void
  onUpdateExpense?: (id: string, patch: Partial<Expense>) => void
}) {
  const [period, setPeriod] = useState<PeriodId>('month')
  const [offset, setOffset] = useState(0)
  const [custom, setCustom] = useState(() => {
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: first.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) }
  })
  const [showList, setShowList] = useState(false)
  const [filter, setFilter] = useState<Filter>({ category: null, nick: null })
  const [editing, setEditing] = useState<Expense | null>(null)

  const range = useMemo(() => periodRange(period, offset, custom), [period, offset, custom])
  const items = useMemo(() => filterByRange(expenses, range), [expenses, range])

  // El mismo periodo, una unidad atrás: sin esto, un total suelto no dice si
  // el mes viene bien o mal.
  const before = useMemo(() => previousRange(period, offset, custom), [period, offset, custom])
  const previousItems = useMemo(() => filterByRange(expenses, before), [expenses, before])
  const previousSpent = useMemo(() => sumExpenses(previousItems), [previousItems])

  const spent = sumExpenses(items)
  const income = sumIncome(items)
  const budget = useMemo(
    () => incomeBudget(items, room.monthlyIncome, range.months),
    [items, room.monthlyIncome, range.months],
  )

  const cap = room.spendingCap * range.months
  const cats = useMemo(() => byCategory(items, previousItems), [items, previousItems])
  const natures = useMemo(() => byNature(items), [items])
  const people = useMemo(() => byMember(items, members), [items, members])
  const series = useMemo(() => timeSeries(items, range), [items, range])
  const rhythm = useMemo(() => pace(spent, range, cap), [spent, range, cap])
  const top = useMemo(() => topExpenses(items), [items])
  const peak = useMemo(() => heaviestDay(items), [items])
  const rate = savingsRate(budget.total, spent)

  const insights = useMemo(
    () =>
      buildInsights({
        range,
        spent,
        previousSpent,
        income: budget,
        cap,
        currency: room.currency,
        categories: cats,
        natures,
        rhythm,
      }),
    [range, spent, previousSpent, budget, cap, room.currency, cats, natures, rhythm],
  )

  const change = previousSpent > 0 ? (spent - previousSpent) / previousSpent : null
  const movements = items.filter((e) => e.kind === 'expense').length
  const maxCat = Math.max(...cats.map((c) => c.total), 1)
  const maxPoint = Math.max(...series.map((s) => s.total), 1)
  const avgPoint = series.length ? series.reduce((s, p) => s + p.total, 0) / series.length : 0
  const peopleTotal = people.reduce((s, p) => s + p.total, 0) || 1

  const filtered = useMemo(
    () =>
      items.filter(
        (e) =>
          (!filter.category || e.category === filter.category) &&
          (!filter.nick || e.nick === filter.nick),
      ),
    [items, filter],
  )

  /** Tocar una categoría o una persona abre el detalle ya filtrado por ahí. */
  function focus(next: Partial<Filter>) {
    setFilter((f) => {
      const merged = { ...f, ...next }
      const same =
        merged.category === f.category && merged.nick === f.nick && showList
      return same ? { category: null, nick: null } : merged
    })
    setShowList(true)
  }

  function handleExportCsv() {
    if (items.length === 0) return
    const headers = ['Fecha', 'Tipo', 'Categoría', 'Naturaleza', 'Concepto', 'Monto', 'Moneda', 'Registrado por']
    const rows = items.map((e) => {
      const cat = categoryOf(e.category)
      const cleanNote = stripRecurringTag(e.note).replace(/"/g, '""')
      return [
        `"${e.occurredAt.slice(0, 10)}"`,
        `"${e.kind === 'income' ? 'Ingreso' : 'Gasto'}"`,
        `"${cat.label.replace(/"/g, '""')}"`,
        `"${cat.nature}"`,
        `"${cleanNote}"`,
        e.amount,
        `"${room.currency}"`,
        `"${(e.nick || '').replace(/"/g, '""')}"`,
      ].join(',')
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safeLabel = range.label.replace(/[^a-zA-Z0-9_-]/g, '_')
    a.download = `Gastico_${safeLabel}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="no-scrollbar mx-auto h-[calc(100svh-var(--app-header)-var(--app-bottom-nav))] md:h-[calc(100svh-var(--app-header))] w-full max-w-2xl overflow-y-auto px-4 py-4 sm:py-5">
      <div className="flex flex-col gap-4 pb-12 sm:pb-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-600 text-foreground">Estadísticas</h2>
            <p className="label">Cómo van las finanzas de la casa</p>
          </div>
          {items.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-500 text-foreground transition-colors hover:bg-secondary"
              title="Descargar este periodo en formato CSV para Excel"
            >
              <Download className="size-3.5" />
              <span>CSV</span>
            </button>
          )}
        </div>

        {/* Selector de periodo */}
        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-full bg-muted p-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPeriod(p.id)
                setOffset(0)
              }}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors',
                period === p.id
                  ? 'bg-card font-600 text-foreground'
                  : 'font-500 text-muted-foreground',
              )}
            >
              <span className="sm:hidden">{p.short}</span>
              <span className="hidden sm:inline">{p.label}</span>
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
          <div className="flex items-center justify-between">
            <button
              onClick={() => setOffset((o) => o - 1)}
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Periodo anterior"
            >
              <ChevronLeft className="size-4.5" />
            </button>
            <p className="font-display text-sm font-600 text-foreground">{range.label}</p>
            <button
              onClick={() => setOffset((o) => Math.min(0, o + 1))}
              disabled={offset >= 0}
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
              aria-label="Periodo siguiente"
            >
              <ChevronRight className="size-4.5" />
            </button>
          </div>
        )}

        <BudgetSummary spent={spent} income={budget} room={room} range={range} />

        {insights.length > 0 && (
          <section className="flex flex-col gap-2">
            {insights.map((i) => (
              <InsightCard key={i.id} insight={i} />
            ))}
          </section>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat
            label={`vs ${period === 'month' ? 'mes' : 'periodo'} anterior`}
            value={change === null ? '—' : `${change > 0 ? '+' : ''}${Math.round(change * 100)}%`}
            tone={change === null ? undefined : change > 0 ? 'malo' : 'bueno'}
            hint={previousSpent > 0 ? formatCompact(previousSpent) : 'sin comparación'}
          />
          <MiniStat
            label={rhythm.running ? 'Proyección' : 'Gasto/día'}
            value={formatCompact(rhythm.running ? rhythm.projected : rhythm.perDay)}
            hint={
              rhythm.running
                ? `hoy: ${formatCompact(rhythm.perDay)}/día`
                : `${Math.round(rhythm.days)} días`
            }
          />
          <MiniStat
            label="Movimientos"
            value={String(movements)}
            hint={movements ? `~${formatCompact(spent / movements)} c/u` : 'ninguno'}
          />
          <MiniStat
            label="Les sobró"
            value={rate === null ? '—' : `${Math.round(rate * 100)}%`}
            tone={rate === null ? undefined : rate < 0 ? 'malo' : rate >= 0.15 ? 'bueno' : undefined}
            hint={rate === null ? 'configura la nómina' : formatCompact(budget.total - spent)}
          />
        </div>

        {/* En qué se les va */}
        {natures.length > 0 && (
          <section className="surface p-4">
            <h3 className="font-display text-[15px] font-600 text-foreground">En qué se les va</h3>
            <p className="label mb-3 mt-0.5">
              Lo que toca, lo que se disfruta y lo que se guarda
            </p>

            <div className="flex h-5 w-full gap-[2px] overflow-hidden rounded-full">
              {natures.map((n) => (
                <div
                  key={n.nature}
                  className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-700"
                  style={{ width: `${n.share * 100}%`, backgroundColor: n.color }}
                  title={`${n.label}: ${formatMoney(n.total, room.currency)}`}
                />
              ))}
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {natures.map((n) => (
                <div key={n.nature} className="flex items-start gap-2">
                  <span
                    className="mt-1 size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: n.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-500 text-foreground">
                      {n.emoji} {n.label}
                      <span className="label ml-1.5">
                        {Math.round(n.share * 100)}% · {formatMoney(n.total, room.currency)}
                      </span>
                    </p>
                    <p className="label leading-relaxed">{n.hint}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Por categoría */}
        <section className="surface p-4">
          <h3 className="font-display text-[15px] font-600 text-foreground">Por categoría</h3>
          <p className="label mb-3 mt-0.5">
            Toca una para ver esos movimientos
          </p>
          {cats.length === 0 ? (
            <Empty text="Todavía no hay gastos en este periodo." />
          ) : (
            <div className="flex flex-col gap-3">
              {cats.map(({ category, total, count, share, change: catChange }) => (
                <button
                  key={category.id}
                  onClick={() => focus({ category: category.id })}
                  className={cn(
                    'block w-full rounded-xl px-1 py-0.5 text-left transition-colors hover:bg-muted/60',
                    filter.category === category.id && 'bg-muted/70',
                  )}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate font-500 text-foreground">
                      {category.emoji} {category.label}
                      <span className="label ml-1.5">
                        {count} {count === 1 ? 'mov.' : 'movs.'}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <Delta value={catChange} />
                      <span className="amount text-sm text-foreground">
                        {formatMoney(total, room.currency)}
                      </span>
                      <span className="label tabular-nums">{Math.round(share * 100)}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${(total / maxCat) * 100}%`,
                        backgroundColor: category.color,
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Quién gastó qué */}
        {people.length > 0 && (
          <section className="surface p-4">
            <h3 className="mb-3 font-display text-[15px] font-600 text-foreground">
              Quién registró qué
            </h3>
            <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full">
              {people.map((p) => (
                <div
                  key={p.nick}
                  className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-700"
                  style={{ width: `${(p.total / peopleTotal) * 100}%`, backgroundColor: p.color }}
                  title={`${p.nick}: ${formatMoney(p.total, room.currency)}`}
                />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {people.map((p) => (
                <button
                  key={p.nick}
                  onClick={() => focus({ nick: p.nick })}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-1.5 py-1 text-left transition-colors hover:bg-muted/60',
                    filter.nick === p.nick && 'bg-muted/70',
                  )}
                >
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-500 text-foreground">{p.nick}</p>
                    <p className="label">
                      {formatMoney(p.total, room.currency)} ·{' '}
                      {Math.round((p.total / peopleTotal) * 100)}%
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Tendencia */}
        <section className="surface p-4">
          <div className="mb-4 flex items-baseline justify-between gap-2">
            <h3 className="font-display text-[15px] font-600 text-foreground">Tendencia</h3>
            {peak && (
              <p className="truncate text-[11px] text-muted-foreground">
                Día más caro:{' '}
                {peak.date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} ·{' '}
                {formatCompact(peak.total)}
              </p>
            )}
          </div>
          {series.length === 0 ? (
            <Empty text="Sin datos para graficar." />
          ) : (
            <>
              <div className="relative flex h-28 items-end justify-between gap-1">
                {/* El promedio del periodo: sin él, una barra alta no dice nada. */}
                {avgPoint > 0 && (
                  <div
                    className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted-foreground/40"
                    style={{ bottom: `${(avgPoint / maxPoint) * 100}%` }}
                  >
                    <span className="absolute -top-3.5 right-0 text-[9px] font-600 text-muted-foreground">
                      promedio {formatCompact(avgPoint)}
                    </span>
                  </div>
                )}
                {series.map((point, i) => (
                  <div
                    key={i}
                    className="h-full min-w-0 flex-1 rounded-t-lg bg-primary/80 transition-all duration-700 ease-out hover:bg-primary"
                    style={{
                      height: `${point.total === 0 ? 2 : Math.max(4, (point.total / maxPoint) * 100)}%`,
                    }}
                    title={`${point.label}: ${formatMoney(point.total, room.currency)}`}
                  />
                ))}
              </div>
              <div className="mt-1.5 flex justify-between gap-1">
                {series.map((point, i) => (
                  <span
                    key={i}
                    className="min-w-0 flex-1 whitespace-nowrap text-center text-[9px] font-600 text-muted-foreground"
                  >
                    {series.length <= 16 || i % Math.ceil(series.length / 12) === 0
                      ? point.label
                      : ''}
                  </span>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Los más grandes */}
        {top.length > 1 && (
          <section className="surface p-4">
            <h3 className="font-display text-[15px] font-600 text-foreground">Los más grandes</h3>
            <p className="label mb-3 mt-0.5">
              Suelen explicar el periodo entero
            </p>
            <div className="flex flex-col">
              {top.map((e) => (
                <MovementRow
                  key={e.id}
                  expense={e}
                  currency={room.currency}
                  onEdit={setEditing}
                  onDelete={onDeleteExpense}
                />
              ))}
            </div>
          </section>
        )}

        {/* Detalle */}
        <section className="surface p-4">
          <button
            onClick={() => setShowList((s) => !s)}
            className="flex w-full items-center justify-between text-left"
          >
            <h3 className="flex items-center gap-2 font-display text-[15px] font-600 text-foreground">
              <ListFilter className="size-4 text-primary" />
              Detalle de movimientos
            </h3>
            <span className="text-xs font-500 text-primary">
              {showList ? 'Ocultar' : `Ver ${items.length}`}
            </span>
          </button>

          {(filter.category || filter.nick) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {filter.category && (
                <FilterChip
                  label={`${categoryOf(filter.category).emoji} ${categoryOf(filter.category).label}`}
                  onClear={() => setFilter((f) => ({ ...f, category: null }))}
                />
              )}
              {filter.nick && (
                <FilterChip
                  label={filter.nick}
                  onClear={() => setFilter((f) => ({ ...f, nick: null }))}
                />
              )}
              <span className="text-[11px] font-600 text-muted-foreground">
                {filtered.length} de {items.length} · {formatMoney(sumExpenses(filtered), room.currency)}
              </span>
            </div>
          )}

          {showList && (
            <div className="mt-2 flex flex-col">
              {filtered.length === 0 && <Empty text="Nada registrado con ese filtro." />}
              {filtered.map((e) => (
                <MovementRow
                  key={e.id}
                  expense={e}
                  currency={room.currency}
                  onEdit={onEditExpense}
                  onDelete={onDeleteExpense}
                  showDate
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {editing && (
        <CategorySheet
          expense={editing}
          currency={room.currency}
          onPick={(category) => {
            onUpdateExpense?.(editing.id, { category, kind: categoryOf(category).kind })
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// ---- Piezas ----------------------------------------------------------------

function MovementRow({
  expense,
  currency,
  onEdit,
  onDelete,
  showDate = false,
}: {
  expense: Expense
  currency: string
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
  showDate?: boolean
}) {
  const cat = categoryOf(expense.category)
  return (
    <div className="group flex items-center gap-3 border-b border-border py-2.5 last:border-0">
      <button
        onClick={() => onEdit(expense)}
        title="Cambiar la categoría"
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        <span className="text-base leading-none">{cat.emoji}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-500 text-foreground">
            {stripRecurringTag(expense.note) || cat.label}
          </span>
          <span className="label block truncate">
            {showDate &&
              `${new Date(expense.occurredAt).toLocaleDateString('es-CO', {
                day: '2-digit',
                month: 'short',
              })} · `}
            {cat.label} · {expense.nick}
          </span>
        </span>
      </button>
      <span
        className="amount shrink-0 text-sm text-foreground"
        style={expense.kind === 'income' ? { color: 'var(--positive)' } : undefined}
      >
        {expense.kind === 'income' ? '+' : ''}
        {formatMoney(expense.amount, currency)}
      </span>
      <button
        onClick={() => onDelete(expense.id)}
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        aria-label="Borrar movimiento"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  )
}

function InsightCard({ insight }: { insight: Insight }) {
  // El tono se marca con una línea de color al costado, no tiñendo la tarjeta
  // entera: así tres avisos seguidos no parecen un semáforo roto.
  const accent = {
    alerta: 'var(--destructive)',
    ojo: 'var(--chart-3)',
    bien: 'var(--chart-5)',
    dato: 'var(--border)',
  }[insight.tone]

  return (
    <div
      className="flex items-start gap-2.5 rounded-lg border-l-2 bg-muted/60 px-3 py-2.5"
      style={{ borderLeftColor: accent }}
    >
      <span className="text-sm leading-tight">{insight.emoji}</span>
      <p className="text-xs leading-relaxed text-foreground">{insight.text}</p>
    </div>
  )
}

/** La flechita de "subió/bajó" contra el periodo anterior. */
function Delta({ value }: { value: number | null }) {
  if (value === null || Math.abs(value) < 0.05) return null
  const up = value > 0
  return (
    <span
      className={cn(
        'text-[10px] font-500 tabular-nums',
        up ? 'text-destructive' : '',
      )}
      style={up ? undefined : { color: GOOD_INK }}
      title={`${up ? 'Más' : 'Menos'} que el periodo anterior`}
    >
      {up ? '▲' : '▼'} {Math.round(Math.abs(value) * 100)}%
    </span>
  )
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      onClick={onClear}
      className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-500 text-primary transition-colors hover:bg-primary/20"
    >
      {label}
      <X className="size-3" />
    </button>
  )
}

/** Verde legible en los dos temas: el chart-5 puro queda muy claro para texto. */
const GOOD_INK = 'color-mix(in oklch, var(--chart-5) 62%, var(--foreground))'

function MiniStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'bueno' | 'malo'
}) {
  return (
    <div className="surface flex flex-col justify-between p-3">
      <p
        className={cn(
          'amount text-lg',
          tone === 'malo' ? 'text-destructive' : 'text-foreground',
        )}
        style={tone === 'bueno' ? { color: GOOD_INK } : undefined}
      >
        {value}
      </p>
      <p className="label mt-0.5 leading-tight">{label}</p>
      {hint && <p className="label truncate opacity-70">{hint}</p>}
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
      <span className="label mb-1.5 block">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-500 text-foreground outline-none focus:border-primary/60"
      />
    </label>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="py-3 text-center text-xs text-muted-foreground">{text}</p>
}
