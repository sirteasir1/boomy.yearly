/**
 * BIS Memory Route — generates and saves AI memory summary.
 * Uses Gemini to compress behavioral data into a rich human-readable summary
 * that gets injected into all future AI context windows.
 */
import { NextRequest, NextResponse } from 'next/server'
import { generate } from '@/lib/gemini/client'
import { getUserModel, getPatterns, getRecentEvents, saveMemorySummary } from '@/lib/firebase/bis'
import { getFocusSessions } from '@/lib/firebase/firestore'

const SYSTEM = `You are a behavioral analyst. Summarize the user's work patterns into a concise, 
specific memory that will help an AI give better advice.
Focus on: work style, timing, what they struggle with, what works well.
Be specific with numbers. Max 3 sentences.`

export async function POST(req: NextRequest) {
  try {
    const { userId, userName } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const [model, patterns, events, sessions] = await Promise.all([
      getUserModel(userId),
      getPatterns(userId),
      getRecentEvents(userId, 14),
      getFocusSessions(userId),
    ])

    if (!model || model.confidence === 'low') {
      return NextResponse.json({ status: 'insufficient_data' })
    }

    const todayStr = new Date().toISOString().slice(0,10)
    const todaySess = sessions.filter(s => s.date === todayStr && s.completed)
    const weeklyCompleted = events.filter(e =>
      e.type === 'task_completed' &&
      e.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length
    const weeklyFocusH = Math.round(
      todaySess.reduce((a,s) => a + s.duration/3600, 0) * 10
    ) / 10

    const dataForSummary = `
User: ${userName}
Work pattern: ${model.workPattern} (peak hours: ${model.productiveHours.join(', ')})
Completion rate: ${Math.round(model.completionRate * 100)}%
Average focus session: ${model.avgFocusMinutes} minutes
Procrastination triggers: ${model.procrastinationTriggers.join(', ') || 'none detected'}
Burnout risk: ${model.burnoutRisk}
Consistency: ${model.consistencyScore}%
This week: ${weeklyCompleted} tasks completed, ${weeklyFocusH}h focus
Key patterns: ${patterns.slice(0,3).map(p => p.title).join('; ')}
`

    const summary  = await generate(dataForSummary, SYSTEM)
    const insights = patterns.slice(0,4).map(p => p.actionSuggestion)

    await saveMemorySummary({
      userId,
      summary: summary.trim(),
      insights,
      weeklyStats: {
        tasksCompleted: weeklyCompleted,
        focusHours:     weeklyFocusH,
        completionRate: Math.round(model.completionRate * 100),
        peakDay:        ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][model.peakDays[0] ?? 1],
        peakHour:       model.productiveHours[0] ?? 'N/A',
      },
      lastUpdated: Date.now(),
    })

    return NextResponse.json({ status: 'ok', summary: summary.trim() })
  } catch (err: any) {
    console.error('[/api/bis/memory]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
