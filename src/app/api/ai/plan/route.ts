import { NextRequest, NextResponse } from 'next/server'
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
  try {
    const { tasks, userId, userName } = await req.json()

    let bisCtx: BISContext = {
      userModel: null, memory: null, patterns: [],
      todayStats: { tasksCompleted:0, focusMinutes:0, sessionsCount:0, hourOfDay: new Date().getHours() },
    }

    if (userId) {
      const timeout = (p: Promise<any>, fallback: any) => Promise.race([p, new Promise(r => setTimeout(() => r(fallback), 3000))])
      const [model, memory, patterns, sessions] = await Promise.all([
        timeout(getUserModel(userId), null),
        timeout(getMemorySummary(userId), null),
        timeout(getPatterns(userId), []),
        timeout(getFocusSessions(userId), []),
      ])
      const todaySess = (sessions as any[]).filter((s: any) => s.date === new Date().toISOString().slice(0,10) && s.completed)
      bisCtx = {
        userModel: model, memory, patterns,
        todayStats: {
          tasksCompleted: 0,
          focusMinutes: todaySess.reduce((a,s) => a + Math.round(s.duration/60), 0),
          sessionsCount:  todaySess.length,
          hourOfDay:      new Date().getHours(),
        },
      }
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
    return NextResponse.json(JSON.parse(clean))
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
