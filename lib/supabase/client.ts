'use client'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** true cuando faltan las variables de entorno, para mostrar un aviso claro. */
export const supabaseConfigured = Boolean(url && key)

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!supabaseConfigured) {
    throw new Error(
      'Falta configurar Supabase. Copia .env.example a .env.local y llena NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    )
  }
  if (!client) {
    client = createClient(url!, key!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  }
  return client
}

/**
 * Sesión anónima: cada dispositivo obtiene un usuario real de Supabase (y por
 * tanto un auth.uid() con el que funcionan las políticas RLS), pero sin pedir
 * correo ni contraseña. La identidad de verdad es la sala: ID + contraseña.
 */
export async function ensureSession() {
  const supabase = getSupabase()
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session

  const { data: signed, error } = await supabase.auth.signInAnonymously()
  if (error) {
    throw new Error(describeAuthError(error.message))
  }
  return signed.session
}

/** Los mensajes crudos de la librería no le dicen nada a nadie. */
function describeAuthError(message: string): string {
  if (/anonymous.*(disabled|not enabled)|signups? not allowed/i.test(message)) {
    return 'Falta activar "Anonymous sign-ins" en Supabase → Authentication → Sign In / Providers (ver SETUP.md).'
  }
  if (/failed to fetch|network|load failed/i.test(message)) {
    return 'No pude conectarme a Supabase. Revisa tu internet y que el proyecto no esté pausado por inactividad.'
  }
  return message
}
