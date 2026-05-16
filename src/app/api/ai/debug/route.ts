import { NextResponse } from 'next/server'
import { getActiveModel } from '@/lib/gemini/client'

/** GET /api/ai/debug — показывает активную Gemini модель */
export async function GET() {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY не задан' }, { status: 400 })
  }
  try {
    const model = await getActiveModel()
    return NextResponse.json({ status: 'ok', model, key: process.env.GEMINI_API_KEY?.slice(0,8) + '...' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
