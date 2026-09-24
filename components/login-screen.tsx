'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Logo } from '@/components/top-bar'
import { inputClass } from '@/components/sheet'
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
    <AuthShell
      title={
        <>
          Las cuentas
          <br />
          <em className="text-primary">claras</em> de la casa.
        </>
      }
      subtitle="Anoten los gastos chateando. Cuenti hace las cuentas."
    >
      {configError ? (
        <div className="rounded-2xl bg-destructive/10 p-4 text-sm leading-relaxed text-destructive">
          <p className="font-700">Falta configuración</p>
          <p className="mt-1">{configError}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <Field
              label="Usuario"
              value={usuario}
              onChange={setUsuario}
              placeholder="tu usuario"
              autoComplete="username"
              onEnter={submit}
            />
            <Field
              label="Contraseña"
              value={password}
              onChange={setPassword}
              type="password"
              placeholder="tu contraseña"
              autoComplete="current-password"
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
                <Loader2 className="size-4 animate-spin" /> Entrando…
              </>
            ) : (
              'Entrar'
            )}
          </button>

          <p className="label mt-5 text-center leading-relaxed">
            Sin registro ni correos: los usuarios se crean a mano.
          </p>
        </>
      )}
    </AuthShell>
  )
}

/**
 * El marco de las pantallas de entrada: la marca y un título grande arriba, el
 * formulario abajo, cerca del pulgar.
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: React.ReactNode
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <main className="pt-safe relative flex min-h-svh flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-between gap-10 px-6 pb-[calc(var(--safe-bottom)+1.5rem)] pt-10 sm:justify-center">
        <div className="animate-float-up">
          <Logo size="lg" />
          <h1 className="mt-8 font-display text-[2.6rem] font-400 leading-[1.05] tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <div className="animate-float-up [animation-delay:80ms]">{children}</div>
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
  autoComplete,
  onEnter,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  autoComplete?: string
  onEnter?: () => void
}) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{label}</span>
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
        className={inputClass}
      />
    </label>
  )
}
