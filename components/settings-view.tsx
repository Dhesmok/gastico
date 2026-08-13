'use client'

import { useState } from 'react'
import { Check, Wallet, Target, Image as ImageIcon, Users } from 'lucide-react'
import { formatCOP, PEOPLE, type Settings } from '@/lib/finance'
import { CHAT_BACKGROUNDS } from '@/lib/backgrounds'
import { cn } from '@/lib/utils'

export function SettingsView({
  settings,
  onChange,
}: {
  settings: Settings
  onChange: (next: Settings) => void
}) {
  const [saved, setSaved] = useState(false)

  function update(patch: Partial<Settings>) {
    onChange({ ...settings, ...patch })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1400)
  }

  return (
    <div className="mx-auto h-[calc(100svh-4rem)] w-full max-w-2xl overflow-y-auto no-scrollbar px-4 py-5">
      <div className="flex flex-col gap-4 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-700 text-foreground">Configuración</h2>
            <p className="text-sm text-muted-foreground">Ajusta tus metas del mes</p>
          </div>
          {saved && (
            <span className="animate-pop-in flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1.5 text-xs font-700 text-accent-foreground">
              <Check className="size-3.5" /> Guardado
            </span>
          )}
        </div>

        {/* Nómina */}
        <MoneyCard
          icon={<Wallet className="size-5" />}
          title="Nómina del mes"
          hint="Cuánto entra en total entre los dos. Las estadísticas lo usan para avisarte si te pasas."
          value={settings.monthlyIncome}
          onChange={(v) => update({ monthlyIncome: v })}
        />

        {/* Tope */}
        <MoneyCard
          icon={<Target className="size-5" />}
          title="Tope de gasto"
          hint="El límite que se ponen. Al pasarlo, Cuenti les manda una alertica."
          value={settings.spendingCap}
          onChange={(v) => update({ spendingCap: v })}
          accent
        />

        {/* Fondo del chat */}
        <section className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <ImageIcon className="size-5" />
            </span>
            <div>
              <h3 className="font-display text-base font-700 text-foreground">Fondo del chat</h3>
              <p className="text-xs text-muted-foreground">Que dé gusto entrar a anotar gastos</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {CHAT_BACKGROUNDS.map((bg) => {
              const active = settings.chatBackground === bg.id
              return (
                <button
                  key={bg.id}
                  onClick={() => update({ chatBackground: bg.id })}
                  className={cn(
                    'group flex flex-col items-center gap-1.5 transition-transform hover:-translate-y-0.5',
                  )}
                >
                  <span
                    className={cn(
                      'relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border-2 bg-cover bg-center shadow-sm transition-all',
                      active ? 'border-primary ring-2 ring-primary/30' : 'border-border',
                    )}
                    style={{ backgroundImage: bg.swatch.startsWith('url') || bg.swatch.includes('gradient') ? bg.swatch : undefined, backgroundColor: bg.swatch.startsWith('var') ? bg.swatch : undefined }}
                  >
                    {active && (
                      <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                        <Check className="size-3.5" />
                      </span>
                    )}
                  </span>
                  <span className={cn('text-[11px] font-600', active ? 'text-primary' : 'text-muted-foreground')}>
                    {bg.label}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Pareja */}
        <section className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Users className="size-5" />
            </span>
            <div>
              <h3 className="font-display text-base font-700 text-foreground">La pareja</h3>
              <p className="text-xs text-muted-foreground">Quiénes usan la app</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {(['me', 'partner'] as const).map((k) => (
              <div key={k} className="flex items-center gap-3 rounded-2xl bg-muted/60 px-3 py-2.5">
                <span
                  className="flex size-9 items-center justify-center rounded-full text-sm font-700 text-white"
                  style={{ backgroundColor: PEOPLE[k].color }}
                >
                  {PEOPLE[k].initials}
                </span>
                <span className="font-700 text-foreground">{PEOPLE[k].name}</span>
                {k === 'me' && (
                  <span className="ml-auto rounded-full bg-primary/12 px-2.5 py-0.5 text-[11px] font-700 text-primary">
                    tú
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        <p className="px-1 text-center text-[11px] leading-relaxed text-muted-foreground">
          Diseño de demostración. Los cambios viven solo en esta sesión hasta que conectes el
          backend (Supabase / IA).
        </p>
      </div>
    </div>
  )
}

function MoneyCard({
  icon,
  title,
  hint,
  value,
  onChange,
  accent = false,
}: {
  icon: React.ReactNode
  title: string
  hint: string
  value: number
  onChange: (v: number) => void
  accent?: boolean
}) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex size-9 items-center justify-center rounded-2xl',
            accent ? 'bg-chart-3/20 text-chart-3' : 'bg-primary/12 text-primary',
          )}
        >
          {icon}
        </span>
        <div>
          <h3 className="font-display text-base font-700 text-foreground">{title}</h3>
        </div>
        <span className="ml-auto font-display text-lg font-700 text-foreground">
          {formatCOP(value)}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>
      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border bg-background px-3 focus-within:ring-2 focus-within:ring-primary/30">
        <span className="text-sm font-700 text-muted-foreground">$</span>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="h-11 flex-1 bg-transparent text-sm font-600 text-foreground outline-none"
        />
        <span className="text-xs font-600 text-muted-foreground">COP</span>
      </div>
      <div className="mt-2.5 flex gap-2">
        {[100000, 500000, 1000000].map((step) => (
          <button
            key={step}
            onClick={() => onChange(value + step)}
            className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-700 text-foreground transition-colors hover:bg-muted"
          >
            +{step >= 1000000 ? `${step / 1000000}M` : `${step / 1000}K`}
          </button>
        ))}
      </div>
    </section>
  )
}
