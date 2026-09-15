'use client'

import { useEffect, useState } from 'react'
import {
  Check,
  Copy,
  DoorOpen,
  Image as ImageIcon,
  KeyRound,
  Laugh,
  Lock,
  LogOut,
  Moon,
  Receipt,
  Sun,
  Target,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react'
import { formatMoney, type Member, type Room } from '@/lib/finance'
import { CHAT_BACKGROUNDS } from '@/lib/backgrounds'
import { changeRoomPassword, formatCode } from '@/lib/room'
import { changeMyPassword } from '@/lib/supabase/client'
import { applyTheme, currentTheme, type Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'

export function SettingsView({
  room,
  members,
  me,
  onChange,
  onNickChange,
  onLeaveRoom,
  onSignOut,
  notify,
}: {
  room: Room
  members: Member[]
  me: Member
  onChange: (patch: Partial<Room>) => void
  onNickChange: (nick: string) => void
  onLeaveRoom: () => void
  onSignOut: () => void
  notify: (text: string) => void
}) {
  const [nick, setNick] = useState(me.nick)
  const [newPassword, setNewPassword] = useState('')
  const [myPassword, setMyPassword] = useState('')
  const [theme, setTheme] = useState<Theme>('light')
  const [copied, setCopied] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)

  useEffect(() => setTheme(currentTheme()), [])
  useEffect(() => setNick(me.nick), [me.nick])

  async function copyInvite() {
    const invite = `Entra a nuestras cuentas 💸\nSala: ${room.name}\nID: ${formatCode(room.code)}\nContraseña: (te la paso aparte)`
    try {
      await navigator.clipboard.writeText(invite)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      notify('No pude copiar. El ID es ' + formatCode(room.code))
    }
  }

  async function saveMyPassword() {
    if (myPassword.length < 6) {
      notify('Tu contraseña de entrada necesita al menos 6 caracteres.')
      return
    }
    try {
      await changeMyPassword(myPassword)
      setMyPassword('')
      notify('Tu contraseña de entrada quedó cambiada.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No pude cambiarla.')
    }
  }

  async function savePassword() {
    if (newPassword.length < 4) {
      notify('La contraseña necesita al menos 4 caracteres.')
      return
    }
    try {
      await changeRoomPassword(room.id, newPassword)
      setNewPassword('')
      notify('Contraseña actualizada. Cuéntasela a quien deba entrar.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No pude cambiarla.')
    }
  }

  return (
    <div className="no-scrollbar mx-auto h-[calc(100svh-var(--app-header)-var(--app-bottom-nav))] md:h-[calc(100svh-var(--app-header))] w-full max-w-2xl overflow-y-auto px-4 py-4 sm:py-5">
      <div className="flex flex-col gap-4 pb-12 sm:pb-8">
        <div>
          <h2 className="font-display text-xl font-600 text-foreground">Configuración</h2>
          <p className="label">Los cambios se guardan solos</p>
        </div>

        {/* Invitación a la sala */}
        <section className="surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <DoorOpen className="size-4.5" />
            </span>
            <div>
              <h3 className="font-display text-[15px] font-600 text-foreground">Invitar a la sala</h3>
              <p className="label">
                Con el ID y la contraseña, cualquiera entra desde su celular
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
            <span className="flex-1 font-mono text-lg font-600 tracking-widest text-foreground">
              {formatCode(room.code)}
            </span>
            <button
              onClick={copyInvite}
              className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-sm font-600 text-primary-foreground transition-colors"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>

          <TextField
            className="mt-3"
            label="Nombre de la sala"
            value={room.name}
            onCommit={(v) => onChange({ name: v || 'Nuestra sala' })}
            maxLength={40}
          />

          <div className="mt-3 flex items-end gap-2">
            <TextField
              className="flex-1"
              label="Cambiar contraseña"
              value={newPassword}
              onChange={setNewPassword}
              type="password"
              placeholder="nueva contraseña"
              maxLength={64}
            />
            <button
              onClick={savePassword}
              disabled={newPassword.length < 4}
              className="flex h-11 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-sm font-500 text-foreground transition-colors hover:bg-muted disabled:opacity-40"
            >
              <KeyRound className="size-3.5" />
              Guardar
            </button>
          </div>
        </section>

        {/* Nómina y tope */}
        <MoneyCard
          icon={<Wallet className="size-4.5" />}
          title="Nómina del mes"
          hint="Cuánto esperan que entre al mes entre todos. Si registran la nómina por el chat, esa manda; los ingresos extra se suman aparte."
          value={room.monthlyIncome}
          currency={room.currency}
          onChange={(v) => onChange({ monthlyIncome: v })}
        />

        <MoneyCard
          icon={<Target className="size-4.5" />}
          title="Tope de gasto"
          hint="El límite mensual que se ponen. Al pasarlo, Cuenti les manda una alertica."
          value={room.spendingCap}
          currency={room.currency}
          onChange={(v) => onChange({ spendingCap: v })}
        />

        {/* Quiénes están */}
        <section className="surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Users className="size-4.5" />
            </span>
            <div>
              <h3 className="font-display text-[15px] font-600 text-foreground">En esta sala</h3>
              <p className="label">
                {members.length} {members.length === 1 ? 'persona' : 'personas'}
              </p>
            </div>
          </div>

          <div className="flex flex-col">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center gap-3 border-b border-border py-2.5 last:border-0">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-600 text-white"
                  style={{ backgroundColor: m.color }}
                >
                  {m.nick.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate font-500 text-foreground">{m.nick}</span>
                {m.userId === me.userId && (
                  <span className="rounded-full bg-primary/12 px-2.5 py-0.5 text-[11px] font-500 text-primary">
                    tú
                  </span>
                )}
              </div>
            ))}
          </div>

          <TextField
            className="mt-3"
            label="Tu apodo"
            icon={<UserRound className="size-3.5" />}
            value={nick}
            onChange={setNick}
            onCommit={(v) => v.trim() && onNickChange(v.trim())}
            maxLength={20}
          />
        </section>

        {/* Facturas */}
        <section className="surface p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Receipt className="size-4.5" />
            </span>
            <div>
              <h3 className="font-display text-[15px] font-600 text-foreground">Fotos de facturas</h3>
              <p className="label">Para no llenar el almacenamiento gratis</p>
            </div>
          </div>

          <Toggle
            className="mt-3"
            label="Guardar la foto después de leerla"
            hint="Si lo apagas, la factura sólo pasa por la IA para sacar el total y no ocupa espacio."
            checked={room.keepReceipts}
            onChange={(v) => onChange({ keepReceipts: v })}
          />

          {room.keepReceipts && (
            <div className="mt-3">
              <p className="mb-2 label">
                Borrar fotos después de
              </p>
              <div className="flex flex-wrap gap-2">
                {[3, 6, 12, 0].map((months) => (
                  <button
                    key={months}
                    onClick={() => onChange({ receiptRetentionMonths: months })}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-500 transition-colors',
                      room.receiptRetentionMonths === months
                        ? 'border-primary bg-primary/12 text-primary'
                        : 'border-border bg-card text-foreground hover:bg-muted',
                    )}
                  >
                    {months === 0 ? 'Nunca' : `${months} meses`}
                  </button>
                ))}
              </div>
              <p className="label mt-2 leading-relaxed">
                Se borra sólo la imagen: el monto, la categoría y la nota se quedan para siempre.
              </p>
            </div>
          )}

        </section>

        {/* Apariencia */}
        <section className="surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <ImageIcon className="size-4.5" />
            </span>
            <div>
              <h3 className="font-display text-[15px] font-600 text-foreground">Apariencia</h3>
              <p className="label">Que dé gusto entrar a anotar gastos</p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
            {(
              [
                { id: 'light' as Theme, label: 'Claro', icon: Sun },
                { id: 'dark' as Theme, label: 'Oscuro', icon: Moon },
              ]
            ).map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  setTheme(option.id)
                  applyTheme(option.id)
                }}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-600 transition-colors',
                  theme === option.id
                    ? 'bg-card text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <option.icon className="size-4" />
                {option.label}
              </button>
            ))}
          </div>

          <p className="mb-2 label">
            Fondo del chat
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {CHAT_BACKGROUNDS.map((bg) => {
              const active = room.chatBackground === bg.id
              return (
                <button
                  key={bg.id}
                  onClick={() => onChange({ chatBackground: bg.id })}
                  className="group flex flex-col items-center gap-1.5 transition-transform "
                >
                  <span
                    className={cn(
                      'relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border-2 bg-cover bg-center shadow-sm transition-all',
                      active ? 'border-primary ring-2 ring-primary/30' : 'border-border',
                    )}
                    style={{
                      backgroundImage:
                        bg.swatch.startsWith('url') || bg.swatch.includes('gradient')
                          ? bg.swatch
                          : undefined,
                      backgroundColor: bg.swatch.startsWith('var') ? bg.swatch : undefined,
                    }}
                  >
                    {active && (
                      <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                        <Check className="size-3.5" />
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'text-[11px] font-600',
                      active ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {bg.label}
                  </span>
                </button>
              )
            })}
          </div>

          <Toggle
            className="mt-4"
            label="Cuenti con chistes"
            hint="Apágalo si prefieres respuestas secas y al grano."
            icon={<Laugh className="size-4" />}
            checked={room.humor}
            onChange={(v) => onChange({ humor: v })}
          />
        </section>

        {/* Mi cuenta */}
        <section className="surface p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Lock className="size-5" />
            </span>
            <div>
              <h3 className="font-display text-[15px] font-600 text-foreground">Mi cuenta</h3>
              <p className="label">
                La contraseña con la que entras a la app
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-end gap-2">
            <TextField
              className="flex-1"
              label="Cambiar mi contraseña"
              value={myPassword}
              onChange={setMyPassword}
              type="password"
              placeholder="mínimo 6 caracteres"
              maxLength={64}
            />
            <button
              onClick={saveMyPassword}
              disabled={myPassword.length < 6}
              className="flex h-11 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-sm font-500 text-foreground transition-colors hover:bg-muted disabled:opacity-40"
            >
              <KeyRound className="size-3.5" />
              Guardar
            </button>
          </div>

          <p className="label mt-2 leading-relaxed">
            Ojo: esta es distinta a la contraseña de la sala. Esta es sólo tuya; la de la sala es la
            que compartes para que alguien entre.
          </p>

          <button
            onClick={onSignOut}
            className="mt-3 flex items-center gap-1.5 rounded-2xl border border-border bg-card px-3.5 py-2 text-xs font-500 text-muted-foreground transition-colors hover:text-destructive"
          >
            <LogOut className="size-3.5" />
            Cerrar sesión
          </button>
        </section>

        {/* Salir */}
        <section className="surface border-destructive/30 p-4">
          <h3 className="font-display text-[15px] font-600 text-foreground">Salirme de la sala</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Dejas de ver estas cuentas en este dispositivo. Los gastos y el historial se quedan para
            los demás; puedes volver con el ID y la contraseña.
          </p>
          {confirmLeave ? (
            <div className="mt-3 flex gap-2">
              <button
                onClick={onLeaveRoom}
                className="flex-1 rounded-xl bg-destructive px-3 py-2.5 text-sm font-600 text-white transition-colors"
              >
                Sí, salirme
              </button>
              <button
                onClick={() => setConfirmLeave(false)}
                className="flex-1 rounded-2xl border border-border bg-card px-3 py-2.5 text-xs font-500 text-foreground"
              >
                Mejor no
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmLeave(true)}
              className="mt-3 rounded-2xl border border-destructive/40 bg-card px-3.5 py-2 text-xs font-500 text-destructive transition-colors hover:bg-destructive/10"
            >
              Salirme de la sala
            </button>
          )}
        </section>
      </div>
    </div>
  )
}

// ---- Piezas reutilizables --------------------------------------------------

function MoneyCard({
  icon,
  title,
  hint,
  value,
  currency,
  onChange,
}: {
  icon: React.ReactNode
  title: string
  hint: string
  value: number
  currency: string
  onChange: (v: number) => void
}) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])

  function commit(next: number) {
    const safe = Number.isFinite(next) && next >= 0 ? Math.round(next) : 0
    setDraft(String(safe))
    if (safe !== value) onChange(safe)
  }

  return (
    <section className="surface p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          {icon}
        </span>
        <h3 className="font-display text-[15px] font-600 text-foreground">{title}</h3>
        <span className="amount ml-auto text-lg text-foreground">
          {formatMoney(value, currency)}
        </span>
      </div>

      <p className="label mt-2 leading-relaxed">{hint}</p>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:border-primary/60">
        <span className="text-sm font-500 text-muted-foreground">$</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(Number(draft))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
          className="h-11 flex-1 bg-transparent text-sm font-600 text-foreground outline-none"
        />
        <span className="text-xs font-600 text-muted-foreground">{currency}</span>
      </div>

      <div className="mt-2.5 flex gap-2">
        {[100000, 500000, 1000000].map((step) => (
          <button
            key={step}
            onClick={() => commit(value + step)}
            className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-500 text-foreground transition-colors hover:bg-muted"
          >
            +{step >= 1000000 ? `${step / 1000000}M` : `${step / 1000}K`}
          </button>
        ))}
        {value > 0 && (
          <button
            onClick={() => commit(0)}
            className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-500 text-muted-foreground transition-colors hover:bg-muted"
          >
            Limpiar
          </button>
        )}
      </div>
    </section>
  )
}

function TextField({
  label,
  value,
  onChange,
  onCommit,
  placeholder,
  type = 'text',
  maxLength,
  icon,
  className,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  onCommit?: (v: string) => void
  placeholder?: string
  type?: string
  maxLength?: number
  icon?: React.ReactNode
  className?: string
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])

  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 flex items-center gap-1.5 label">
        {icon}
        {label}
      </span>
      <input
        type={type}
        value={draft}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => {
          setDraft(e.target.value)
          onChange?.(e.target.value)
        }}
        onBlur={() => onCommit?.(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        className="h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm font-500 text-foreground outline-none focus:border-primary/60"
      />
    </label>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
  icon,
  className,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5 text-left transition-colors hover:bg-muted',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-600 text-foreground">
          {icon}
          {label}
        </p>
        {hint && <p className="label mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <span
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-border',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-white shadow transition-all',
            checked ? 'left-[1.375rem]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  )
}
