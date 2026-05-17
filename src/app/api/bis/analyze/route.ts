import { NextRequest, NextResponse } from "next/server"
import { saveUserModel, savePatterns, getUserModel } from "@/lib/firebase/bis"
import { computeUserModel, detectPatterns } from "@/lib/bis/analyzer"
import type { BehavioralEvent } from "@/lib/bis/types"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, events: clientEvents } = body
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

    const events: BehavioralEvent[] = clientEvents || []

    if (events.length < 1) {
      return NextResponse.json({ status: "insufficient_data", events: 0 })
    }

    const existingModel = await Promise.race([getUserModel(userId), new Promise<null>(res => setTimeout(() => res(null), 3000))]).catch(() => null) as any
    const model    = computeUserModel(userId, events, existingModel)
    const patterns = detectPatterns(model, events)

    await Promise.all([
      saveUserModel(model).catch(() => {}),
      savePatterns(userId, patterns).catch(() => {}),
    ])

    return NextResponse.json({
      status: "ok",
      events: events.length,
      patterns: patterns.length,
      confidence: model.confidence,
      completionRate: model.completionRate,
    })
  } catch (err: any) {
    console.error("[/api/bis/analyze]", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
