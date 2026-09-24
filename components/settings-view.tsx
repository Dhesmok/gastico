'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronRight, Copy, Moon, Sun } from 'lucide-react'
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
  const [openRow, setOpenRow] = useState<string | null>(null)
  const toggle = (id: string) => setOpenRow((r) => (r === id ? null : id))

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

  const background = CHAT_BACKGROUNDS.find((bg) => bg.id === room.chatBackground)

  return (
    <div className="no-scrollbar pb-dock mx-auto h-[calc(100svh-var(--app-header))] w-full max-w-2xl overflow-y-auto px-4 pt-2">
      <div className="flex flex-col gap-6">
        {/* Quién soy y dónde estoy */}
        <div className="flex items-center gap-4 px-1">
          <span
            className="flex size-14 shrink-0 items-center justify-center rounded-full font-display text-2xl font-500 text-white"
            style={{ backgroundColor: me.color }}
          >
            {me.nick.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-2xl font-500 text-foreground">{me.nick}</p>
            <p className="label truncate">
              En {room.name} con {members.filter((m) => m.userId !== me.userId).map((m) => m.nick).join(', ') || 'nadie más aún'}
            </p>
          </div>
        </div>

        <Group title="Presupuesto">
          <Row
            label="Nómina del mes"
            value={room.monthlyIncome > 0 ? formatMoney(room.monthlyIncome, room.currency) : 'Sin definir'}
            open={openRow === 'income'}
            onToggle={() => toggle('income')}
          >
            <MoneyEditor
              hint="Lo que esperan que entre al mes entre todos. Si registran la nómina por el chat, esa manda."
              value={room.monthlyIncome}
              currency={room.currency}
              onChange={(v) => onChange({ monthlyIncome: v })}
            />
          </Row>
          <Row
            label="Tope de gasto"
            value={room.spendingCap > 0 ? formatMoney(room.spendingCap, room.currency) : 'Sin definir'}
            open={openRow === 'cap'}
            onToggle={() => toggle('cap')}
          >
            <MoneyEditor
              hint="El límite que se ponen al mes. Al pasarlo, Cuenti avisa."
              value={room.spendingCap}
              currency={room.currency}
              onChange={(v) => onChange({ spendingCap: v })}
            />
          </Row>
        </Group>

        <Group title="Sala">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-600 text-foreground">ID para invitar</p>
              <p className="font-mono text-sm font-600 tracking-widest text-muted-foreground">
                {formatCode(room.code)}
              </p>
            </div>
            <button
              onClick={copyInvite}
              className="flex h-9 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-xs font-800 text-background active:opacity-80"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <Row
            label="Nombre"
            value={room.name}
            open={openRow === 'name'}
            onToggle={() => toggle('name')}
          >
            <TextField
              label="Nombre de la sala"
              value={room.name}
              onCommit={(v) => onChange({ name: v || 'Nuestra sala' })}
              maxLength={40}
            />
          </Row>
          <Row
            label="Contraseña de la sala"
            value="••••"
            open={openRow === 'roompass'}
            onToggle={() => toggle('roompass')}
          >
            <PasswordEditor
              value={newPassword}
              onChange={setNewPassword}
              min={4}
              placeholder="nueva contraseña"
              hint="Es la que compartes para que alguien entre a la sala."
              onSave={savePassword}
            />
          </Row>
          <Row
            label="Personas"
            value={String(members.length)}
            open={openRow === 'people'}
            onToggle={() => toggle('people')}
          >
            <div className="flex flex-col">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center gap-3 py-2">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-800 text-white"
                    style={{ backgroundColor: m.color }}
                  >
                    {m.nick.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-600 text-foreground">
                    {m.nick}
                  </span>
                  {m.userId === me.userId && <span className="label">tú</span>}
                </div>
              ))}
            </div>
            <TextField
              className="mt-2"
              label="Tu apodo"
              value={nick}
              onChange={setNick}
              onCommit={(v) => v.trim() && onNickChange(v.trim())}
              maxLength={20}
            />
          </Row>
        </Group>

        <Group title="Apariencia">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <p className="flex-1 text-[15px] font-600 text-foreground">Tema</p>
            <div className="flex gap-1 rounded-full bg-muted p-1">
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
                  aria-label={option.label}
                  aria-pressed={theme === option.id}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full transition-colors',
                    theme === option.id ? 'ink' : 'text-muted-foreground',
                  )}
                >
                  <option.icon className="size-4" />
                </button>
              ))}
            </div>
          </div>
          <Row
            label="Fondo del chat"
            value={background?.label ?? ''}
            open={openRow === 'bg'}
            onToggle={() => toggle('bg')}
          >
            <div className="grid grid-cols-5 gap-2">
              {CHAT_BACKGROUNDS.map((bg) => {
                const active = room.chatBackground === bg.id
                return (
                  <button
                    key={bg.id}
                    onClick={() => onChange({ chatBackground: bg.id })}
                    className="flex flex-col items-center gap-1.5"
                    aria-label={bg.label}
                  >
                    <span
                      className={cn(
                        'relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border transition-all',
                        active ? 'border-foreground ring-2 ring-foreground/20' : 'border-border',
                      )}
                      style={{
                        backgroundImage: bg.swatch.includes('gradient') ? bg.swatch : undefined,
                        backgroundColor: bg.swatch.startsWith('var') ? bg.swatch : undefined,
                      }}
                    >
                      {active && (
                        <span className="ink flex size-5 items-center justify-center rounded-full">
                          <Check className="size-3" />
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] font-600 text-muted-foreground">{bg.label}</span>
                  </button>
                )
              })}
            </div>
          </Row>
          <SwitchRow
            label="Cuenti con chistes"
            checked={room.humor}
            onChange={(v) => onChange({ humor: v })}
          />
        </Group>

        <Group
          title="Fotos de facturas"
          footer="Borrar la foto no borra el gasto: el monto y la nota se quedan."
        >
          <SwitchRow
            label="Guardar la foto"
            checked={room.keepReceipts}
            onChange={(v) => onChange({ keepReceipts: v })}
          />
          {room.keepReceipts && (
            <div className="flex items-center gap-3 px-4 py-2.5">
              <p className="flex-1 text-[15px] font-600 text-foreground">Borrarlas después de</p>
              <select
                value={room.receiptRetentionMonths}
                onChange={(e) => onChange({ receiptRetentionMonths: Number(e.target.value) })}
                className="rounded-full bg-muted px-3 py-1.5 text-base font-700 text-foreground outline-none sm:text-sm"
              >
                {[3, 6, 12, 0].map((months) => (
                  <option key={months} value={months}>
                    {months === 0 ? 'Nunca' : `${months} meses`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </Group>

        <Group title="Mi cuenta">
          <Row
            label="Mi contraseña"
            value="••••"
            open={openRow === 'mypass'}
            onToggle={() => toggle('mypass')}
          >
            <PasswordEditor
              value={myPassword}
              onChange={setMyPassword}
              min={6}
              placeholder="mínimo 6 caracteres"
              hint="Es sólo tuya, para entrar a la app. No es la de la sala."
              onSave={saveMyPassword}
            />
          </Row>
          <button
            onClick={onSignOut}
            className="flex w-full items-center px-4 py-3.5 text-left text-[15px] font-600 text-foreground active:bg-muted"
          >
            Cerrar sesión
          </button>
          {confirmLeave ? (
            <div className="animate-reveal px-4 py-3">
              <p className="label mb-3 leading-relaxed">
                Dejas de ver estas cuentas. Los gastos se quedan para los demás y puedes volver con
                el ID y la contraseña.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onLeaveRoom}
                  className="h-11 flex-1 rounded-2xl bg-destructive text-sm font-700 text-white"
                >
                  Sí, salirme
                </button>
                <button
                  onClick={() => setConfirmLeave(false)}
                  className="h-11 flex-1 rounded-2xl bg-muted text-sm font-700 text-foreground"
                >
                  Mejor no
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmLeave(true)}
              className="flex w-full items-center px-4 py-3.5 text-left text-[15px] font-600 text-destructive active:bg-muted"
            >
              Salirme de la sala
            </button>
          )}
        </Group>

        <p className="pb-2 text-center text-[11px] font-600 text-muted-foreground">
          Los cambios se guardan solos · Gastico
        </p>
      </div>
    </div>
  )
}

// ---- Piezas reutilizables --------------------------------------------------

function Group({
  title,
  footer,
  children,
}: {
  title: string
  footer?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="eyebrow mb-2 px-1">{title}</h3>
      <div className="surface divide-y divide-border overflow-hidden">{children}</div>
      {footer && <p className="label mt-2 px-1 leading-relaxed">{footer}</p>}
    </section>
  )
}

/** Una fila de ajustes: muestra el valor y, al tocarla, el editor debajo. */
function Row({
  label,
  value,
  open,
  onToggle,
  children,
}: {
  label: string
  value?: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-muted"
      >
        <span className="flex-1 text-[15px] font-600 text-foreground">{label}</span>
        {value && (
          <span className="max-w-[45%] truncate text-sm font-600 text-muted-foreground">{value}</span>
        )}
        <ChevronRight
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-90',
          )}
        />
      </button>
      {open && <div className="animate-reveal px-4 pb-4">{children}</div>}
    </div>
  )
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted"
    >
      <span className="flex-1 text-[15px] font-600 text-foreground">{label}</span>
      <span
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors',
          checked ? 'bg-foreground' : 'bg-foreground/15',
        )}
      >
        <span
          className={cn(
            'absolute top-1 size-5 rounded-full shadow transition-all',
            checked ? 'left-6 bg-highlight' : 'left-1 bg-card',
          )}
        />
      </span>
    </button>
  )
}

function MoneyEditor({
  hint,
  value,
  currency,
  onChange,
}: {
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
    <div>
      <div className="flex items-baseline gap-1 border-b-2 border-foreground/15 pb-1 focus-within:border-foreground">
        <span className="hero-number text-2xl text-muted-foreground">$</span>
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
          className="hero-number w-full bg-transparent text-3xl text-foreground outline-none"
        />
        <span className="text-xs font-700 text-muted-foreground">{currency}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {[100000, 500000, 1000000].map((step) => (
          <button
            key={step}
            onClick={() => commit(value + step)}
            className="rounded-full bg-muted px-3 py-1.5 text-xs font-700 text-foreground active:opacity-70"
          >
            +{step >= 1000000 ? `${step / 1000000}M` : `${step / 1000}K`}
          </button>
        ))}
        {value > 0 && (
          <button
            onClick={() => commit(0)}
            className="rounded-full px-3 py-1.5 text-xs font-700 text-muted-foreground"
          >
            Quitar
          </button>
        )}
      </div>
      <p className="label mt-3 leading-relaxed">{hint}</p>
    </div>
  )
}

function PasswordEditor({
  value,
  onChange,
  min,
  placeholder,
  hint,
  onSave,
}: {
  value: string
  onChange: (v: string) => void
  min: number
  placeholder: string
  hint: string
  onSave: () => void
}) {
  return (
    <div>
      <div className="flex gap-2">
        <input
          type="password"
          value={value}
          maxLength={64}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.length >= min) onSave()
          }}
          className="h-11 min-w-0 flex-1 rounded-2xl border border-border bg-background px-4 text-base font-600 text-foreground outline-none sm:text-sm focus:border-foreground/40"
        />
        <button
          onClick={onSave}
          disabled={value.length < min}
          className="h-11 shrink-0 rounded-2xl bg-foreground px-4 text-sm font-700 text-background disabled:opacity-30"
        >
          Guardar
        </button>
      </div>
      <p className="label mt-2 leading-relaxed">{hint}</p>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  onCommit,
  maxLength,
  className,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  onCommit?: (v: string) => void
  maxLength?: number
  className?: string
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])

  return (
    <label className={cn('block', className)}>
      <span className="eyebrow mb-1.5 block">{label}</span>
      <input
        type="text"
        value={draft}
        maxLength={maxLength}
        onChange={(e) => {
          setDraft(e.target.value)
          onChange?.(e.target.value)
        }}
        onBlur={() => onCommit?.(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-base font-600 text-foreground outline-none sm:text-sm focus:border-foreground/40"
      />
    </label>
  )
}
