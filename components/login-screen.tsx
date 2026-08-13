'use client'

import { useState } from 'react'
import { HeartHandshake, Loader2, Lock, Sparkles, UserRound } from 'lucide-react'
import { signIn } from '@/lib/supabase/client'

export function LoginScreen({
  onLogin,
  configError,
}: {
  onLogin: () => void
  configError: string | null
}) {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!usuario.trim() || !password) {
      setError('Escribe tu usuario y tu contraseña.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await signIn(usuario, password)
      onLogin()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude entrar.')
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
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="animate-bob mb-4 flex size-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <HeartHandshake className="size-8" />
          </div>
          <h1 className="font-display text-3xl font-700 tracking-tight text-foreground">
            Cuentas Claras
          </h1>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
            El control de gastos del mes, para ustedes dos.
          </p>
        </div>

        {configError ? (
          <div className="rounded-3xl border border-destructive/40 bg-destructive/10 p-4 text-sm leading-relaxed text-destructive">
            <p className="font-700">Falta configuración</p>
            <p className="mt-1">{configError}</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <Field
                label="Usuario"
                icon={<UserRound className="size-3.5" />}
                value={usuario}
                onChange={setUsuario}
                placeholder="tu usuario"
                autoComplete="username"
                onEnter={submit}
              />
              <Field
                label="Contraseña"
                icon={<Lock className="size-3.5" />}
                value={password}
                onChange={setPassword}
                type="password"
                placeholder="tu contraseña"
                autoComplete="current-password"
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
                  <Loader2 className="size-4 animate-spin" /> Entrando…
                </>
              ) : (
                'Entrar'
              )}
            </button>

            <div className="mt-6 flex items-start gap-2 rounded-2xl bg-secondary/60 px-4 py-3 text-xs leading-relaxed text-secondary-foreground">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                No hay registro ni correos: los usuarios se crean a mano. Después de entrar, creas
                la sala o te unes a la de tu pareja con el ID y su contraseña. 🔒
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
  icon,
  autoComplete,
  onEnter,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  icon?: React.ReactNode
  autoComplete?: string
  onEnter?: () => void
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-700 uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoCapitalize="none"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) onEnter()
        }}
        className="h-12 w-full rounded-2xl border border-border bg-card px-3.5 text-sm font-600 text-foreground shadow-sm outline-none transition-shadow placeholder:font-400 placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
      />
    </label>
  )
}
