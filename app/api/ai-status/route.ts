// ---------------------------------------------------------------------------
// "¿Por qué no me lee las facturas?" — esta ruta responde eso.
//
// Manda una imagen mínima por el mismo camino que una factura de verdad y
// cuenta qué pasó: si falta la API key, si se acabó la cuota, si el modelo ya
// no existe o si simplemente la IA se demora. Ajustes tiene un botón que la
// llama y muestra la respuesta en español.
//
// Pide sesión: no es información secreta, pero tampoco queremos que cualquiera
// nos gaste la cuota gratis dándole clic.
// ---------------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { diagnoseGemini } from '@/lib/gemini'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) {
    return NextResponse.json({ error: 'Sin sesión' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Supabase sin configurar en el servidor' }, { status: 500 })
  }

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  }

  const diagnosis = await diagnoseGemini()
  return NextResponse.json(diagnosis)
}
