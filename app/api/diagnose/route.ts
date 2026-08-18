import { NextResponse } from 'next/server'
import { diagnoseGemini } from '@/lib/gemini'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const diagnosis = await diagnoseGemini()
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      diagnosis,
    })
  } catch (error) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
