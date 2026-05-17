import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { generate } from '@/lib/gemini/client'
import { getUserModel, getMemorySummary, getPatterns } from '@/lib/firebase/bis'
import { getFocusSessions } from '@/lib/firebase/firestore'
import { buildPlannerContext } from '@/lib/bis/context'
import type { BISContext } from '@/lib/bis/types'

const SYSTEM = `You are Boom AI — a behavioral intelligence planner built on top of real user data.
You know this user's exact work patterns, procrastination triggers, and focus capacity.
Build schedules that work WITH their biology, not against it.
Respond ONLY with valid JSON — no markdown, no extra text.`

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 20, 60000)
  if (limited) return limited
  try {
    const { tasks, userId, userName } = await req.json()

    let bisCtx: BISContext = {
      userModel: null, memory: null, patterns: [],
      todayStats: { tasksCompleted:0, focusMinutes:0, sessionsCount:0, hourOfDay: new Date().getHours() },
    }


    const prompt = buildPlannerContext(bisCtx, userName ?? 'User', tasks) + `

Return ONLY this JSON:
{
  "blocks": [{"time":"09:00","task":"string","duration":60,"type":"deep_work","reason":"behavioral reasoning"}],
  "insight": "Key behavioral insight about today's plan",
  "warnings": []
}`

    const text  = await generate(prompt, SYSTEM)
    const clean = text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim()
    try {
      const parsed = JSON.parse(clean)
      // Support both {blocks:[]} and {schedule:[]} formats
      const schedule = parsed.blocks || parsed.schedule || parsed
      return NextResponse.json({ schedule })
    } catch {
      return NextResponse.json({ schedule: [], raw: clean })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
