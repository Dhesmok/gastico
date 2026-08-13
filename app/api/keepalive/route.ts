// ---------------------------------------------------------------------------
// Los proyectos gratis de Supabase se pausan tras una semana sin actividad.
// Este ping diario (vercel.json → crons) mantiene la base despierta sin costo
// y sin tener que entrar al panel a reactivarla.
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.json({ ok: false, reason: 'sin configurar' }, { status: 200 })
  }

  try {
    // RLS devuelve una lista vacía, que es justo lo que queremos: basta con
    // que la consulta llegue a Postgres para contar como actividad.
    const response = await fetch(`${url}/rest/v1/rooms?select=id&limit=1`, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
      cache: 'no-store',
    })
    return NextResponse.json({ ok: response.ok, status: response.status })
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 200 })
  }
}
