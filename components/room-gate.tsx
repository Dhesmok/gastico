'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, Loader2 } from 'lucide-react'
import { AuthShell } from '@/components/login-screen'
import { inputClass } from '@/components/sheet'
import { createRoom, formatCode, joinRoom, myRooms } from '@/lib/room'
import { cn } from '@/lib/utils'

type Mode = 'create' | 'join'

export function RoomGate({
  onReady,
  onSignOut,
}: {
  onReady: (roomId: string) => void
  onSignOut: () => void
}) {
  const [mode, setMode] = useState<Mode>('create')
  const [roomName, setRoomName] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [nick, setNick] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [known, setKnown] = useState<{ id: string; name: string; code: string }[]>([])
  // Con salas guardadas, el formulario se esconde: casi siempre se entra a una de esas.
  const [showForm, setShowForm] = useState(false)

  // Si este usuario ya pertenece a alguna sala, ofrecerla de un toque (deduplicada).
  useEffect(() => {
    myRooms()
      .then((rooms) => {
        const unique = Array.from(new Map(rooms.map((r) => [r.id, r])).values())
        setKnown(unique)
        if (unique.length === 0) setShowForm(true)
      })
      .catch(() => {
        setKnown([])
        setShowForm(true)
      })
  }, [])

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
    <AuthShell
      title={
        known.length > 0 ? (
          <>
            ¿A qué <em className="text-primary">sala</em> entramos?
          </>
        ) : (
          <>
            Armen su <em className="text-primary">sala</em>.
          </>
        )
      }
      subtitle={
        known.length > 0
          ? 'Toca una de tus salas o entra a otra con su ID.'
          : 'Uno la crea y le pasa el ID y la contraseña al otro.'
      }
    >
      {known.length > 0 && (
        <div className="surface mb-5 overflow-hidden">
          {known.map((room) => (
            <button
              key={room.id}
              onClick={() => onReady(room.id)}
              className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left last:border-0 active:bg-muted"
            >
              <span className="ink flex size-10 shrink-0 items-center justify-center rounded-2xl font-display text-lg">
                {room.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-700 text-foreground">
                  {room.name}
                </span>
                <span className="block font-mono text-xs text-muted-foreground">
                  {formatCode(room.code)}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex h-12 w-full items-center justify-center rounded-2xl border border-border text-sm font-700 text-foreground active:bg-muted"
        >
          Crear o unirme a otra sala
        </button>
      ) : (
        <div className="animate-reveal">
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
            {(
              [
                { id: 'create' as Mode, label: 'Crear sala' },
                { id: 'join' as Mode, label: 'Tengo un ID' },
              ]
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setMode(tab.id)
                  setError(null)
                }}
                className={cn(
                  'rounded-full py-2 text-sm font-700 transition-colors',
                  mode === tab.id ? 'ink' : 'text-muted-foreground',
                )}
              >
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
            <p className="mt-3 rounded-2xl bg-destructive/10 px-4 py-2.5 text-[13px] font-600 leading-relaxed text-destructive">
              {error}
            </p>
          )}

          <button
            onClick={submit}
            disabled={busy}
            className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-foreground text-[15px] font-700 text-background transition-opacity active:opacity-80 disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {mode === 'create' ? 'Creando…' : 'Entrando…'}
              </>
            ) : (
              <>{mode === 'create' ? 'Crear la sala' : 'Entrar a la sala'}</>
            )}
          </button>
        </div>
      )}

      <button
        onClick={onSignOut}
        className="mx-auto mt-4 flex px-3 py-2 text-xs font-700 text-muted-foreground transition-colors hover:text-destructive"
      >
        Cerrar sesión
      </button>
    </AuthShell>
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
      <span className="eyebrow mb-1.5 block">{label}</span>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) onEnter()
        }}
        className={cn(inputClass, mono && 'font-mono tracking-widest')}
      />
    </label>
  )
}
