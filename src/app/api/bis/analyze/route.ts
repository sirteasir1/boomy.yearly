import { NextRequest, NextResponse } from 'next/server'
import { getRecentEvents, getUserModel, saveUserModel, savePatterns } from '@/lib/firebase/bis'
import { computeUserModel, detectPatterns } from '@/lib/bis/analyzer'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const [events, existingModel] = await Promise.all([
      getRecentEvents(userId, 30),
      getUserModel(userId),
    ])

    if (events.length < 1) {
      return NextResponse.json({ status: 'insufficient_data', events: events.length })
    }

    const model    = computeUserModel(userId, events, existingModel)
    const patterns = detectPatterns(model, events)

    await Promise.all([saveUserModel(model), savePatterns(userId, patterns)])

    return NextResponse.json({ status:'ok', events:events.length, patterns:patterns.length,
      confidence: model.confidence, completionRate: model.completionRate })
  } catch (err: any) {
    console.error('[/api/bis/analyze]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
