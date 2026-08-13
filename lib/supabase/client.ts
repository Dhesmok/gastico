'use client'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** true cuando faltan las variables de entorno, para mostrar un aviso claro. */
export const supabaseConfigured = Boolean(url && key)

/**
 * Los usuarios se crean a mano en Supabase (ver SETUP.md) y entran con un
 * nombre corto, no con un correo. La app le pega este dominio por detrás:
 * "fabio" -> "fabio@gastico.app". Así nadie ve ni escribe correos.
 */
export const USER_DOMAIN = '@gastico.app'

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

/** La sesión guardada, o null si toca volver a entrar. */
export async function currentSession() {
  const { data } = await getSupabase().auth.getSession()
  return data.session ?? null
}

export function toEmail(usuario: string): string {
  const clean = usuario.trim().toLowerCase()
  return clean.includes('@') ? clean : clean + USER_DOMAIN
}

export async function signIn(usuario: string, password: string) {
  const { data, error } = await getSupabase().auth.signInWithPassword({
    email: toEmail(usuario),
    password,
  })
  if (error) throw new Error(describeAuthError(error.message))
  return data.session
}

export async function signOut() {
  await getSupabase().auth.signOut()
}

export async function changeMyPassword(password: string) {
  const { error } = await getSupabase().auth.updateUser({ password })
  if (error) throw new Error(describeAuthError(error.message))
}

/** Los mensajes crudos de la librería no le dicen nada a nadie. */
function describeAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return 'El usuario o la contraseña no coinciden.'
  }
  if (/email not confirmed/i.test(message)) {
    return 'Ese usuario está sin confirmar en Supabase. Ver SETUP.md.'
  }
  if (/password should be at least/i.test(message)) {
    return 'La contraseña debe tener al menos 6 caracteres.'
  }
  if (/failed to fetch|network|load failed/i.test(message)) {
    return 'No pude conectarme a Supabase. Revisa tu internet y que el proyecto no esté pausado por inactividad.'
  }
  return message
}
