import { NextRequest, NextResponse } from 'next/server'
import { generate } from '@/lib/gemini/client'

const SYSTEM = `You are Boom AI — a knowledgeable, concise assistant.
Help users think more clearly about their notes. Be direct and specific.`

export async function POST(req: NextRequest) {
  try {
    const { title, content, prompt: userPrompt } = await req.json()
    const p = `Note title: "${title}"
Content: ${content.slice(0, 2000)}
User request: ${userPrompt || 'Summarize and suggest 3 action items.'}`
    const response = await generate(p, SYSTEM)
    return NextResponse.json({ response })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
