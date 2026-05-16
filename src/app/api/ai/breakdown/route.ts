import { NextRequest, NextResponse } from 'next/server'
import { generate } from '@/lib/gemini/client'
import { getUserModel } from '@/lib/firebase/bis'

const SYSTEM = `You are Boom AI. Break tasks into 3-6 clear, actionable subtasks.
Each subtask must be completable in under 60 minutes.
Respond ONLY with valid JSON — no markdown, no explanation.`

export async function POST(req: NextRequest) {
  try {
    const { task, userId } = await req.json()
    if (!task?.trim()) return NextResponse.json({ error: 'task is required' }, { status: 400 })

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set in .env.local' }, { status: 500 })
    }

    let sizeHint = ''
    if (userId) {
      const model = await getUserModel(userId).catch(() => null)
      if (model?.procrastinationTriggers.includes('large tasks (>90 min)')) {
        sizeHint = 'Keep every subtask under 30 minutes — this user struggles with large tasks.'
      } else if (model?.avgFocusMinutes) {
        sizeHint = `Target subtasks around ${model.avgFocusMinutes} minutes each.`
      }
    }

    const prompt = `Break this task into 3-6 subtasks: "${task}"
${sizeHint}
Return ONLY this JSON (no other text):
{"subtasks":[{"title":"subtask name","minutes":25,"priority":"high"}]}`

    const text  = await generate(prompt, SYSTEM)
    const clean = text.replace(/^```json\s*/i,'').replace(/\s*```$/,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim()

    try {
      const data = JSON.parse(clean)
      return NextResponse.json(data)
    } catch {
      const match = clean.match(/\{[\s\S]*\}/)
      if (match) return NextResponse.json(JSON.parse(match[0]))
      throw new Error(`Could not parse response: ${clean.slice(0,100)}`)
    }
  } catch (err: any) {
    console.error('[/api/ai/breakdown]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
