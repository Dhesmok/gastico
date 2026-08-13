'use client'

import { useState } from 'react'
import { HeartHandshake, Mail, Sparkles } from 'lucide-react'

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [loading, setLoading] = useState<string | null>(null)

  function handle(method: string) {
    setLoading(method)
    // Simulación de autenticación. Reemplazar por Supabase / Google OAuth.
    setTimeout(onLogin, 750)
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-5 py-10">
      {/* Fondo cálido con blobs difuminados */}
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
            El control de gastos del mes, para ustedes dos. Chatea, manda facturas y deja que el
            resumen se arme solo.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => handle('google')}
            disabled={loading !== null}
            className="group flex h-12 items-center justify-center gap-3 rounded-2xl border border-border bg-card text-sm font-700 text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:opacity-60"
          >
            <GoogleGlyph />
            {loading === 'google' ? 'Entrando…' : 'Continuar con Google'}
          </button>

          <button
            onClick={() => handle('email')}
            disabled={loading !== null}
            className="group flex h-12 items-center justify-center gap-2.5 rounded-2xl bg-primary text-sm font-700 text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 active:translate-y-0 disabled:opacity-60"
          >
            <Mail className="size-4" />
            {loading === 'email' ? 'Entrando…' : 'Entrar con correo'}
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-secondary/60 px-4 py-3 text-center text-xs leading-relaxed text-secondary-foreground">
          <Sparkles className="size-4 shrink-0 text-primary" />
          <span>
            Solo para <b>Sofía</b> y <b>Andrés</b>. Nadie más ve estas cuentas. 🔒
          </span>
        </div>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
          Diseño de demostración · el inicio de sesión es simulado
        </p>
      </div>
    </main>
  )
}

function GoogleGlyph() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.4 14.7 2.4 12 2.4 6.9 2.4 2.8 6.5 2.8 11.6S6.9 20.8 12 20.8c5.9 0 9.8-4.1 9.8-9.9 0-.7-.1-1.2-.2-1.7H12z"
      />
    </svg>
  )
}
