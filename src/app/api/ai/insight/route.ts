import { NextRequest, NextResponse } from 'next/server'
import { generate } from '@/lib/gemini/client'
import { getUserModel, getMemorySummary, getPatterns } from '@/lib/firebase/bis'
import { buildInsightContext } from '@/lib/bis/context'
import type { BISContext } from '@/lib/bis/types'

const SYSTEM = `You are Boom AI. Generate a personalized daily insight based on real behavioral data.
Be specific, actionable, encouraging. Max 2 sentences. No generic advice.`

export async function POST(req: NextRequest) {
  try {
    const { userId, userName, tasksCount, doneCount, hour } = await req.json()

    let bisCtx: BISContext = {
      userModel: null, memory: null, patterns: [],
      todayStats: { tasksCompleted: doneCount, focusMinutes: 0, sessionsCount: 0, hourOfDay: hour },
    }

    if (userId) {
      const [model, memory, patterns] = await Promise.all([
        getUserModel(userId).catch(()=>null),
        getMemorySummary(userId).catch(()=>null),
        getPatterns(userId).catch(()=>[]),
      ])
      bisCtx = { ...bisCtx, userModel: model, memory, patterns }
    }

    const context = buildInsightContext(bisCtx, userName ?? 'User')
    const prompt  = `Behavioral context: ${context}\nTotal tasks: ${tasksCount}, done: ${doneCount}.\nGenerate a personalized insight for right now (hour ${hour}).`
    const insight = await generate(prompt, SYSTEM)
    return NextResponse.json({ insight: insight.trim() })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
