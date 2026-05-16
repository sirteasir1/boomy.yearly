import { NextRequest, NextResponse } from 'next/server'
import { generate } from '@/lib/gemini/client'
import { getUserModel, getMemorySummary, getPatterns } from '@/lib/firebase/bis'
import { buildAIContext } from '@/lib/bis/context'
import type { AgentResponse, BISContext } from '@/lib/bis/types'

const SYSTEM = `You are Boom AI — an intelligent productivity agent built on behavioral data.
You give specific, personalized responses based on the user's real patterns.
Never give generic advice — always reference their actual data.
Available tools: createTask, startFocusSession, createCalendarEvent.
Respond ONLY with valid JSON.`

export async function POST(req: NextRequest) {
  try {
    const { message, userId, userName, currentTasks } = await req.json()

    // Check API key first
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        message: '⚠️ Gemini API key not set. Add GEMINI_API_KEY to your .env.local file.',
        actions: [], reasoning: 'Missing API key',
      })
    }

    let bisCtx: BISContext = {
      userModel: null, memory: null, patterns: [],
      todayStats: { tasksCompleted:0, focusMinutes:0, sessionsCount:0, hourOfDay:new Date().getHours() },
    }

    if (userId) {
      const [model, memory, patterns] = await Promise.all([
        getUserModel(userId).catch(()=>null),
        getMemorySummary(userId).catch(()=>null),
        getPatterns(userId).catch(()=>[]),
      ])
      bisCtx = { ...bisCtx, userModel: model, memory, patterns }
    }

    const context   = buildAIContext(bisCtx, userName ?? 'User')
    const taskList  = (currentTasks ?? []).slice(0,8).map((t: any) => `- ${t.title} (${t.priority})`).join('\n') || 'No tasks yet'

    const prompt = `${context}

Current tasks:
${taskList}

User says: "${message}"

Reply with this exact JSON structure:
{
  "message": "Your response (specific to this user's behavioral data)",
  "actions": [],
  "reasoning": "brief reasoning"
}

For actions you can include objects like:
{"tool":"createTask","params":{"title":"...","priority":"high"}}
{"tool":"startFocusSession","params":{"minutes":25}}
{"tool":"createCalendarEvent","params":{"title":"...","time":"10:00"}}`

    const text  = await generate(prompt, SYSTEM)
    const clean = text.replace(/^```json\s*/,'').replace(/\s*```$/,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim()

    let data: AgentResponse
    try {
      data = JSON.parse(clean)
    } catch {
      // Gemini returned plain text — wrap it
      data = { message: text.slice(0,500), actions: [], reasoning: 'text response' }
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[/api/ai/agent]', err.message)
    return NextResponse.json({
      message: `AI error: ${err.message}. Check that GEMINI_API_KEY is set in .env.local`,
      actions: [],
      reasoning: err.message,
    })
  }
}
