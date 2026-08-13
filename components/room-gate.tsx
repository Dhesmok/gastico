'use client'

import { useEffect, useState } from 'react'
import { DoorOpen, HeartHandshake, KeyRound, Loader2, Plus, Sparkles } from 'lucide-react'
import { createRoom, formatCode, joinRoom, myRooms } from '@/lib/room'
import { cn } from '@/lib/utils'

type Mode = 'create' | 'join'

export function RoomGate({
  onReady,
  sessionError,
}: {
  onReady: (roomId: string) => void
  sessionError: string | null
}) {
  const [mode, setMode] = useState<Mode>('create')
  const [roomName, setRoomName] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [nick, setNick] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [known, setKnown] = useState<{ id: string; name: string; code: string }[]>([])

  // Si este dispositivo ya pertenece a alguna sala, ofrecerla de un toque.
  useEffect(() => {
    if (sessionError) return
    myRooms().then(setKnown).catch(() => setKnown([]))
  }, [sessionError])

  async function submit() {
    setError(null)

    if (!nick.trim()) {
      setError('Escribe tu nombre o apodo para saber quién registra cada gasto.')
      return
    }
    if (password.length < 4) {
      setError('La contraseña de la sala necesita al menos 4 caracteres.')
      return
    }
    if (mode === 'join' && code.replace(/[^A-Za-z0-9]/g, '').length !== 8) {
      setError('El ID de la sala son 8 caracteres, como ABCD-1234.')
      return
    }

    setBusy(true)
    try {
      const result =
        mode === 'create'
          ? await createRoom(roomName, password, nick)
          : await joinRoom(code, password, nick)
      onReady(result.roomId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo salió mal, intenta de nuevo.')
      setBusy(false)
    }
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-5 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-24 size-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 size-[28rem] rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 size-72 -translate-x-1/2 rounded-full bg-chart-3/25 blur-3xl" />
      </div>

      <div className="glass-strong w-full max-w-md animate-pop-in rounded-4xl border border-white/40 p-7 shadow-2xl shadow-primary/10 sm:p-9">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="animate-bob mb-4 flex size-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <HeartHandshake className="size-8" />
          </div>
          <h1 className="font-display text-3xl font-700 tracking-tight text-foreground">
            Cuentas Claras
          </h1>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
            Creen una sala, compártanse el ID y la contraseña, y lleven los gastos del mes
            chateando.
          </p>
        </div>

        {sessionError ? (
          <div className="rounded-3xl border border-destructive/40 bg-destructive/10 p-4 text-sm leading-relaxed text-destructive">
            <p className="font-700">No pude iniciar la sesión</p>
            <p className="mt-1">{sessionError}</p>
          </div>
        ) : (
          <>
            {known.length > 0 && (
              <div className="mb-5">
                <p className="mb-2 text-[11px] font-700 uppercase tracking-wide text-muted-foreground">
                  Tus salas
                </p>
                <div className="flex flex-col gap-2">
                  {known.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => onReady(room.id)}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-card/70 px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                        <DoorOpen className="size-4.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-700 text-foreground">
                          {room.name}
                        </span>
                        <span className="block font-mono text-[11px] text-muted-foreground">
                          {formatCode(room.code)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="my-4 flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-[11px] font-600 text-muted-foreground">o</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              </div>
            )}

            <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-2xl bg-muted/70 p-1.5">
              {(
                [
                  { id: 'create' as Mode, label: 'Crear sala', icon: Plus },
                  { id: 'join' as Mode, label: 'Entrar a una', icon: KeyRound },
                ]
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setMode(tab.id)
                    setError(null)
                  }}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-700 transition-all',
                    mode === tab.id
                      ? 'bg-card text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <tab.icon className="size-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              {mode === 'create' ? (
                <Field
                  label="Nombre de la sala"
                  value={roomName}
                  onChange={setRoomName}
                  placeholder="Nuestra casa"
                  maxLength={40}
                />
              ) : (
                <Field
                  label="ID de la sala"
                  value={code}
                  onChange={(v) => setCode(v.toUpperCase())}
                  placeholder="ABCD-1234"
                  maxLength={9}
                  mono
                />
              )}

              <Field
                label="Contraseña de la sala"
                value={password}
                onChange={setPassword}
                placeholder="mínimo 4 caracteres"
                type="password"
                maxLength={64}
              />

              <Field
                label="¿Cómo te llamamos?"
                value={nick}
                onChange={setNick}
                placeholder="tu nombre o apodo"
                maxLength={20}
                onEnter={submit}
              />
            </div>

            {error && (
              <p className="mt-3 rounded-2xl bg-destructive/10 px-3 py-2 text-xs font-600 leading-relaxed text-destructive">
                {error}
              </p>
            )}

            <button
              onClick={submit}
              disabled={busy}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-700 text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {mode === 'create' ? 'Creando…' : 'Entrando…'}
                </>
              ) : (
                <>{mode === 'create' ? 'Crear nuestra sala' : 'Entrar a la sala'}</>
              )}
            </button>

            <div className="mt-5 flex items-start gap-2 rounded-2xl bg-secondary/60 px-4 py-3 text-xs leading-relaxed text-secondary-foreground">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                {mode === 'create'
                  ? 'Al crear la sala te damos un ID de 8 caracteres. Compártelo con tu pareja junto con la contraseña y listo: nadie más entra.'
                  : 'Pide el ID y la contraseña a quien creó la sala. No hace falta correo ni cuenta de nada.'}
              </span>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  maxLength,
  mono = false,
  onEnter,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  maxLength?: number
  mono?: boolean
  onEnter?: () => void
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-700 uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) onEnter()
        }}
        className={cn(
          'h-12 w-full rounded-2xl border border-border bg-card px-3.5 text-sm font-600 text-foreground shadow-sm outline-none transition-shadow placeholder:font-400 placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30',
          mono && 'font-mono tracking-widest',
        )}
      />
    </label>
  )
}
