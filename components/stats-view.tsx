'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Download, X } from 'lucide-react'
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
  timeSeries,
  topExpenses,
  type CategoryId,
  type Expense,
  type Insight,
  type Member,
  type PeriodId,
  type Room,
} from '@/lib/finance'
import { BudgetHero } from '@/components/budget-summary'
import { Sheet } from '@/components/sheet'
import { stripRecurringTag } from '@/lib/recurring'
import { cn } from '@/lib/utils'

type Filter = { category: CategoryId | null; nick: string | null }
type Section = 'ritmo' | 'naturaleza' | 'personas' | 'tendencia' | 'grandes'

/** Cuántas categorías se ven de entrada. El resto, a un toque. */
const TOP_CATEGORIES = 4

/**
 * El resumen del periodo.
 *
 * Se lee de arriba abajo en tres pasos: cuánto van (la cifra grande), en qué
 * se les va (las categorías que más pesan) y, sólo si alguien quiere
 * profundizar, el resto de números guardados en secciones que se abren.
 */
export function StatsView({
  room,
  members,
  expenses,
  onEditExpense,
}: {
  room: Room
  members: Member[]
  expenses: Expense[]
  onEditExpense: (expense: Expense) => void
  onDeleteExpense?: (id: string) => void
  onUpdateExpense?: (id: string, patch: Partial<Expense>) => void
}) {
  const [period, setPeriod] = useState<PeriodId>('month')
  const [offset, setOffset] = useState(0)
  const [custom, setCustom] = useState(() => {
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: first.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) }
  })
  const [pickingPeriod, setPickingPeriod] = useState(false)
  const [allCategories, setAllCategories] = useState(false)
  const [allInsights, setAllInsights] = useState(false)
  const [openSection, setOpenSection] = useState<Section | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>({ category: null, nick: null })

  const range = useMemo(() => periodRange(period, offset, custom), [period, offset, custom])
  const items = useMemo(() => filterByRange(expenses, range), [expenses, range])

  // El mismo periodo, una unidad atrás: sin esto, un total suelto no dice si
  // el mes viene bien o mal.
  const before = useMemo(() => previousRange(period, offset, custom), [period, offset, custom])
  const previousItems = useMemo(() => filterByRange(expenses, before), [expenses, before])
  const previousSpent = useMemo(() => sumExpenses(previousItems), [previousItems])

  const spent = sumExpenses(items)
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
  const visibleCats = allCategories ? cats : cats.slice(0, TOP_CATEGORIES)
  const maxCat = Math.max(...cats.map((c) => c.total), 1)
  const maxPoint = Math.max(...series.map((s) => s.total), 1)
  const avgPoint = series.length ? series.reduce((s, p) => s + p.total, 0) / series.length : 0
  const peopleTotal = people.reduce((s, p) => s + p.total, 0) || 1
  const periodShort = PERIODS.find((p) => p.id === period)?.short ?? 'Mes'

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
  function openList(next: Filter = { category: null, nick: null }) {
    setFilter(next)
    setListOpen(true)
  }

  function toggle(section: Section) {
    setOpenSection((s) => (s === section ? null : section))
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

    const csvContent = '﻿' + [headers.join(','), ...rows].join('\r\n')
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
    <div className="no-scrollbar pb-dock mx-auto h-[calc(100svh-var(--app-header))] w-full max-w-2xl overflow-y-auto px-4 pt-2">
      <div className="flex flex-col gap-5">
        {/* El periodo: flechas para moverse y una pastilla para cambiar de escala. */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOffset((o) => o - 1)}
            disabled={period === 'custom'}
            className="flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:opacity-0"
            aria-label="Periodo anterior"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h2 className="min-w-0 flex-1 truncate text-center font-display text-xl font-500 text-foreground">
            {range.label}
          </h2>
          <button
            onClick={() => setOffset((o) => Math.min(0, o + 1))}
            disabled={offset >= 0 || period === 'custom'}
            className="flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:opacity-0"
            aria-label="Periodo siguiente"
          >
            <ChevronRight className="size-5" />
          </button>
          <button
            onClick={() => setPickingPeriod((v) => !v)}
            aria-expanded={pickingPeriod}
            className="ml-1 flex shrink-0 items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-700 text-foreground"
          >
            {periodShort}
            <ChevronDown
              className={cn('size-3.5 transition-transform', pickingPeriod && 'rotate-180')}
            />
          </button>
        </div>

        {pickingPeriod && (
          <div className="animate-reveal -mt-2 flex flex-col gap-3">
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPeriod(p.id)
                    setOffset(0)
                    if (p.id !== 'custom') setPickingPeriod(false)
                  }}
                  className={cn(
                    'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-700 transition-colors',
                    period === p.id
                      ? 'ink border-transparent'
                      : 'border-border bg-card text-muted-foreground',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {period === 'custom' && (
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
            )}
          </div>
        )}

        <BudgetHero spent={spent} income={budget} room={room} range={range} caption="Gastado" />

        {/* Un solo aviso a la vista: el más importante. Los otros, si los piden. */}
        {insights.length > 0 && (
          <div className="-mt-1 flex flex-col gap-2">
            {(allInsights ? insights : insights.slice(0, 1)).map((i) => (
              <InsightLine key={i.id} insight={i} />
            ))}
            {insights.length > 1 && (
              <button
                onClick={() => setAllInsights((v) => !v)}
                className="self-start px-1 text-xs font-700 text-muted-foreground underline decoration-dotted underline-offset-4"
              >
                {allInsights ? 'Ver menos' : `${insights.length - 1} observación${insights.length > 2 ? 'es' : ''} más`}
              </button>
            )}
          </div>
        )}

        {/* En qué se les va */}
        <section>
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h3 className="eyebrow">En qué se va</h3>
            {cats.length > 0 && (
              <button
                onClick={() => openList()}
                className="text-xs font-700 text-foreground"
              >
                {movements} movimientos ›
              </button>
            )}
          </div>

          {cats.length === 0 ? (
            <div className="surface px-4 py-8 text-center">
              <p className="font-display text-lg text-foreground">Nada por aquí todavía</p>
              <p className="label mt-1">Los gastos de este periodo van a salir aquí.</p>
            </div>
          ) : (
            <div className="surface overflow-hidden">
              {visibleCats.map(({ category, total, share, change: catChange }) => (
                <button
                  key={category.id}
                  onClick={() => openList({ category: category.id, nick: null })}
                  className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-0 active:bg-muted"
                >
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-2xl text-lg"
                    style={{ backgroundColor: `color-mix(in srgb, ${category.color} 16%, transparent)` }}
                  >
                    {category.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[15px] font-700 text-foreground">
                        {category.label}
                      </span>
                      <span className="amount shrink-0 text-[15px] text-foreground">
                        {formatMoney(total, room.currency)}
                      </span>
                    </span>
                    <span className="mt-1.5 flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${(total / maxCat) * 100}%`,
                            backgroundColor: category.color,
                          }}
                        />
                      </span>
                      <span className="w-14 shrink-0 text-right text-[11px] font-600 tabular-nums text-muted-foreground">
                        <Delta value={catChange} fallback={`${Math.round(share * 100)}%`} />
                      </span>
                    </span>
                  </span>
                </button>
              ))}
              {cats.length > TOP_CATEGORIES && (
                <button
                  onClick={() => setAllCategories((v) => !v)}
                  className="flex w-full items-center justify-center gap-1 border-t border-border py-3 text-[13px] font-700 text-muted-foreground"
                >
                  {allCategories ? 'Ver menos' : `Ver las ${cats.length} categorías`}
                  <ChevronDown
                    className={cn('size-4 transition-transform', allCategories && 'rotate-180')}
                  />
                </button>
              )}
            </div>
          )}
        </section>

        {/* Para quien quiera más: cada bloque cerrado dice lo esencial en su
            fila y sólo al abrirlo muestra el detalle. */}
        {items.length > 0 && (
          <section>
            <h3 className="eyebrow mb-2 px-1">Más detalles</h3>
            <div className="surface overflow-hidden">
              <Disclosure
                title="Ritmo y comparación"
                peek={
                  change === null ? (
                    formatCompact(rhythm.running ? rhythm.projected : rhythm.perDay)
                  ) : (
                    <span className={change > 0 ? 'text-destructive' : 'text-positive'}>
                      {change > 0 ? '+' : ''}
                      {Math.round(change * 100)}%
                    </span>
                  )
                }
                open={openSection === 'ritmo'}
                onToggle={() => toggle('ritmo')}
              >
                <div className="grid grid-cols-2 gap-2">
                  <Stat
                    label={`vs ${period === 'month' ? 'mes' : 'periodo'} anterior`}
                    value={
                      change === null ? '—' : `${change > 0 ? '+' : ''}${Math.round(change * 100)}%`
                    }
                    tone={change === null ? undefined : change > 0 ? 'malo' : 'bueno'}
                    hint={previousSpent > 0 ? `antes ${formatCompact(previousSpent)}` : 'sin datos'}
                  />
                  <Stat
                    label={rhythm.running ? 'Al cierre, a este ritmo' : 'Gasto por día'}
                    value={formatCompact(rhythm.running ? rhythm.projected : rhythm.perDay)}
                    tone={rhythm.running && cap > 0 && rhythm.projected > cap ? 'malo' : undefined}
                    hint={
                      rhythm.running
                        ? `${formatCompact(rhythm.perDay)} por día`
                        : `${Math.round(rhythm.days)} días`
                    }
                  />
                  <Stat
                    label="Movimientos"
                    value={String(movements)}
                    hint={movements ? `~${formatCompact(spent / movements)} c/u` : 'ninguno'}
                  />
                  <Stat
                    label="Les sobró"
                    value={rate === null ? '—' : `${Math.round(rate * 100)}%`}
                    tone={
                      rate === null ? undefined : rate < 0 ? 'malo' : rate >= 0.15 ? 'bueno' : undefined
                    }
                    hint={rate === null ? 'falta la nómina' : formatCompact(budget.total - spent)}
                  />
                </div>
              </Disclosure>

              {natures.length > 0 && (
                <Disclosure
                  title="Necesario, gustos y ahorro"
                  peek={<StackedBar parts={natures.map((n) => ({ share: n.share, color: n.color }))} small />}
                  open={openSection === 'naturaleza'}
                  onToggle={() => toggle('naturaleza')}
                >
                  <StackedBar parts={natures.map((n) => ({ share: n.share, color: n.color }))} />
                  <div className="mt-3 flex flex-col gap-2.5">
                    {natures.map((n) => (
                      <div key={n.nature} className="flex items-start gap-2.5">
                        <span
                          className="mt-1.5 size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: n.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-baseline justify-between gap-2 text-sm">
                            <span className="font-700 text-foreground">{n.label}</span>
                            <span className="amount text-foreground">
                              {Math.round(n.share * 100)}%
                            </span>
                          </p>
                          <p className="label">
                            {formatMoney(n.total, room.currency)} · {n.hint}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Disclosure>
              )}

              {people.length > 1 && (
                <Disclosure
                  title="Quién registró qué"
                  peek={
                    <span className="flex -space-x-1.5">
                      {people.slice(0, 3).map((p) => (
                        <span
                          key={p.nick}
                          className="size-4 rounded-full ring-2 ring-card"
                          style={{ backgroundColor: p.color }}
                        />
                      ))}
                    </span>
                  }
                  open={openSection === 'personas'}
                  onToggle={() => toggle('personas')}
                >
                  <StackedBar
                    parts={people.map((p) => ({ share: p.total / peopleTotal, color: p.color }))}
                  />
                  <div className="mt-2 flex flex-col">
                    {people.map((p) => (
                      <button
                        key={p.nick}
                        onClick={() => openList({ category: null, nick: p.nick })}
                        className="flex items-center gap-2.5 py-2 text-left"
                      >
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="flex-1 truncate text-sm font-700 text-foreground">
                          {p.nick}
                        </span>
                        <span className="label tabular-nums">
                          {Math.round((p.total / peopleTotal) * 100)}%
                        </span>
                        <span className="amount text-sm text-foreground">
                          {formatMoney(p.total, room.currency)}
                        </span>
                      </button>
                    ))}
                  </div>
                </Disclosure>
              )}

              {series.length > 1 && (
                <Disclosure
                  title="Día a día"
                  peek={<Sparkline values={series.map((s) => s.total)} />}
                  open={openSection === 'tendencia'}
                  onToggle={() => toggle('tendencia')}
                >
                  <div className="relative flex h-32 items-end justify-between gap-[3px]">
                    {/* El promedio del periodo: sin él, una barra alta no dice nada. */}
                    {avgPoint > 0 && (
                      <div
                        className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-foreground/30"
                        style={{ bottom: `${(avgPoint / maxPoint) * 100}%` }}
                      >
                        <span className="absolute -top-4 right-0 rounded bg-card px-1 text-[10px] font-700 text-muted-foreground">
                          promedio {formatCompact(avgPoint)}
                        </span>
                      </div>
                    )}
                    {series.map((point, i) => (
                      <div
                        key={i}
                        className={cn(
                          'min-w-0 flex-1 rounded-t-md transition-all duration-700 ease-out',
                          point.total > avgPoint ? 'bg-foreground' : 'bg-foreground/25',
                        )}
                        style={{
                          height: `${point.total === 0 ? 2 : Math.max(4, (point.total / maxPoint) * 100)}%`,
                        }}
                        title={`${point.label}: ${formatMoney(point.total, room.currency)}`}
                      />
                    ))}
                  </div>
                  <div className="mt-1.5 flex justify-between gap-[3px]">
                    {series.map((point, i) => (
                      <span
                        key={i}
                        className="min-w-0 flex-1 whitespace-nowrap text-center text-[9px] font-700 text-muted-foreground"
                      >
                        {series.length <= 12 || i % Math.ceil(series.length / 8) === 0
                          ? point.label
                          : ''}
                      </span>
                    ))}
                  </div>
                  {peak && (
                    <p className="label mt-3">
                      El día más caro fue el{' '}
                      {peak.date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}:{' '}
                      {formatMoney(peak.total, room.currency)}.
                    </p>
                  )}
                </Disclosure>
              )}

              {top.length > 1 && (
                <Disclosure
                  title="Los más grandes"
                  peek={formatCompact(top[0].amount)}
                  open={openSection === 'grandes'}
                  onToggle={() => toggle('grandes')}
                >
                  <div className="-my-1 flex flex-col">
                    {top.map((e) => (
                      <MovementRow
                        key={e.id}
                        expense={e}
                        currency={room.currency}
                        onEdit={onEditExpense}
                        showDate
                      />
                    ))}
                  </div>
                </Disclosure>
              )}
            </div>
          </section>
        )}

        {items.length > 0 && (
          <button
            onClick={handleExportCsv}
            className="mx-auto flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-700 text-muted-foreground transition-colors hover:text-foreground"
            title="Descargar este periodo en formato CSV para Excel"
          >
            <Download className="size-3.5" />
            Descargar para Excel
          </button>
        )}
      </div>

      {listOpen && (
        <Sheet
          tall
          title="Movimientos"
          subtitle={`${filtered.length} ${filtered.length === 1 ? "movimiento" : "movimientos"} · ${formatMoney(sumExpenses(filtered), room.currency)}`}
          onClose={() => setListOpen(false)}
        >
          {(filter.category || filter.nick) && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
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
            </div>
          )}
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nada registrado con ese filtro.
            </p>
          ) : (
            <div className="flex flex-col">
              {filtered.map((e) => (
                <MovementRow
                  key={e.id}
                  expense={e}
                  currency={room.currency}
                  onEdit={(x) => {
                    setListOpen(false)
                    onEditExpense(x)
                  }}
                  showDate
                />
              ))}
            </div>
          )}
        </Sheet>
      )}
    </div>
  )
}

// ---- Piezas ----------------------------------------------------------------

/** Una fila que se abre. Cerrada muestra un adelanto a la derecha. */
function Disclosure({
  title,
  peek,
  open,
  onToggle,
  children,
}: {
  title: string
  peek?: React.ReactNode
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted"
      >
        <span className="flex-1 text-[15px] font-700 text-foreground">{title}</span>
        {!open && peek && (
          <span className="amount flex items-center text-sm text-muted-foreground">{peek}</span>
        )}
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && <div className="animate-reveal px-4 pb-4">{children}</div>}
    </div>
  )
}

function StackedBar({
  parts,
  small = false,
}: {
  parts: { share: number; color: string }[]
  small?: boolean
}) {
  return (
    <span
      className={cn(
        'flex gap-[2px] overflow-hidden rounded-full',
        small ? 'h-2 w-16' : 'h-3 w-full',
      )}
    >
      {parts.map((p, i) => (
        <span
          key={i}
          className="h-full transition-all duration-700"
          style={{ width: `${p.share * 100}%`, backgroundColor: p.color }}
        />
      ))}
    </span>
  )
}

/** Una línea mínima con la forma del periodo, para el adelanto de "Día a día". */
function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)
  const w = 64
  const h = 18
  const step = values.length > 1 ? w / (values.length - 1) : w
  const d = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`)
    .join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function MovementRow({
  expense,
  currency,
  onEdit,
  showDate = false,
}: {
  expense: Expense
  currency: string
  onEdit: (expense: Expense) => void
  showDate?: boolean
}) {
  const cat = categoryOf(expense.category)
  return (
    <button
      onClick={() => onEdit(expense)}
      title="Tocar para corregir"
      className="flex w-full items-center gap-3 border-b border-border py-3 text-left last:border-0 active:opacity-70"
    >
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-xl text-base"
        style={{ backgroundColor: `color-mix(in srgb, ${cat.color} 16%, transparent)` }}
      >
        {cat.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-700 text-foreground">
          {stripRecurringTag(expense.note) || cat.label}
        </span>
        <span className="label block truncate">
          {showDate &&
            `${new Date(expense.occurredAt).toLocaleDateString('es-CO', {
              day: 'numeric',
              month: 'short',
            })} · `}
          {expense.nick}
        </span>
      </span>
      <span
        className={cn(
          'amount shrink-0 text-sm',
          expense.kind === 'income' ? 'text-positive' : 'text-foreground',
        )}
      >
        {expense.kind === 'income' ? '+' : ''}
        {formatMoney(expense.amount, currency)}
      </span>
    </button>
  )
}

function InsightLine({ insight }: { insight: Insight }) {
  const tone = {
    alerta: 'bg-destructive/10 text-destructive',
    ojo: 'bg-warning/15 text-foreground',
    bien: 'bg-positive/10 text-foreground',
    dato: 'bg-muted text-foreground',
  }[insight.tone]

  return (
    <div className={cn('flex items-start gap-3 rounded-2xl px-4 py-3', tone)}>
      <span className="text-base leading-snug">{insight.emoji}</span>
      <p className="text-[13px] font-500 leading-relaxed">{insight.text}</p>
    </div>
  )
}

/** La flechita de "subió/bajó"; si no se movió, muestra el porcentaje del total. */
function Delta({ value, fallback }: { value: number | null; fallback: string }) {
  if (value === null || Math.abs(value) < 0.05) return <>{fallback}</>
  const up = value > 0
  return (
    <span
      className={up ? 'text-destructive' : 'text-positive'}
      title={`${up ? 'Más' : 'Menos'} que el periodo anterior`}
    >
      {up ? '↑' : '↓'}
      {Math.round(Math.abs(value) * 100)}%
    </span>
  )
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      onClick={onClear}
      className="ink flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-700"
    >
      {label}
      <X className="size-3" />
    </button>
  )
}

function Stat({
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
    <div className="rounded-2xl bg-muted p-3">
      <p
        className={cn(
          'hero-number text-2xl',
          tone === 'malo' ? 'text-destructive' : tone === 'bueno' ? 'text-positive' : 'text-foreground',
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 text-xs font-700 leading-tight text-foreground">{label}</p>
      {hint && <p className="label truncate">{hint}</p>}
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
      <span className="eyebrow mb-1.5 block">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-2xl border border-border bg-card px-3 text-base font-600 text-foreground outline-none sm:text-sm focus:border-foreground/40"
      />
    </label>
  )
}
