/**
 * BIS Context Engineering — the most critical piece.
 *
 * Assembles a focused, relevant context from behavioral data
 * to send to Gemini. We don't send everything — we send what matters.
 */
import type { BISContext, UserBehavioralModel, MemorySummary, BehavioralPattern } from './types'

/**
 * Build a compact behavioral context string for AI prompts.
 * This is what separates Boomly from "dumb" productivity apps.
 */
export function buildAIContext(ctx: BISContext, userName: string): string {
  const parts: string[] = []

  parts.push(`User: ${userName}`)
  parts.push(`Current hour: ${ctx.todayStats.hourOfDay}:00`)
  parts.push('')

  // User behavioral model
  if (ctx.userModel && ctx.userModel.confidence !== 'low') {
    const m = ctx.userModel
    parts.push('=== BEHAVIORAL PROFILE ===')

    if (m.productiveHours.length > 0) {
      parts.push(`Peak hours: ${m.productiveHours.join(', ')} (${m.workPattern} person)`)
    }
    parts.push(`Focus capacity: ${m.avgFocusMinutes}min avg, ${m.maxFocusMinutes}min max`)
    parts.push(`Task completion rate: ${Math.round(m.completionRate * 100)}%`)

    if (m.procrastinationTriggers.length > 0) {
      parts.push(`Procrastination triggers: ${m.procrastinationTriggers.join(', ')}`)
    }
    if (m.avgActualVsEstimate > 1.2) {
      parts.push(`Time estimation: underestimates by ${Math.round((m.avgActualVsEstimate - 1) * 100)}% on average`)
    }
    if (m.burnoutRisk !== 'low') {
      parts.push(`⚠️ Burnout risk: ${m.burnoutRisk}`)
    }
    parts.push(`Consistency: ${m.consistencyScore}%`)
    parts.push('')
  } else if (ctx.userModel) {
    parts.push('(Behavioral profile building — more data needed)')
    parts.push('')
  }

  // Active patterns (top 3 most relevant)
  const criticalPatterns = ctx.patterns
    .filter(p => p.severity === 'critical' || p.severity === 'warning')
    .slice(0, 2)
  if (criticalPatterns.length > 0) {
    parts.push('=== ACTIVE ALERTS ===')
    criticalPatterns.forEach(p => {
      parts.push(`[${p.severity.toUpperCase()}] ${p.title}: ${p.description}`)
    })
    parts.push('')
  }

  // Memory summary (key behavioral insights)
  if (ctx.memory?.summary) {
    parts.push('=== MEMORY SUMMARY ===')
    parts.push(ctx.memory.summary)
    if (ctx.memory.insights.length > 0) {
      parts.push('Key insights:')
      ctx.memory.insights.slice(0, 3).forEach(i => parts.push(`- ${i}`))
    }
    parts.push('')
  }

  // Today's stats
  parts.push('=== TODAY ===')
  parts.push(`Tasks completed: ${ctx.todayStats.tasksCompleted}`)
  parts.push(`Focus time: ${ctx.todayStats.focusMinutes}min across ${ctx.todayStats.sessionsCount} sessions`)

  return parts.join('\n')
}

/**
 * Build context for day planning specifically.
 * Includes scheduling intelligence.
 */
export function buildPlannerContext(
  ctx: BISContext,
  userName: string,
  tasks: { name: string; dur: number; priority: string }[]
): string {
  const base = buildAIContext(ctx, userName)
  const m = ctx.userModel

  const plannerParts: string[]= [base, '', '=== PLANNER INTELLIGENCE ===']

  if (m) {
    if (m.productiveHours.length > 0) {
      plannerParts.push(`→ Schedule HIGH priority tasks in: ${m.productiveHours[0]} (peak window)`)
    }
    if (m.avgActualVsEstimate > 1.2) {
      plannerParts.push(`→ Add ${Math.round((m.avgActualVsEstimate - 1) * 100)}% buffer to all time estimates`)
    }
    if (m.burnoutRisk === 'high') {
      plannerParts.push('→ IMPORTANT: Include 2+ break blocks, cap total work at 6 hours')
    }
    if (m.procrastinationTriggers.includes('large tasks (>90 min)')) {
      plannerParts.push('→ Split any task >90min into smaller blocks')
    }
    if (m.avgFocusMinutes < 25) {
      plannerParts.push(`→ Use ${m.avgFocusMinutes}min focus blocks (user\'s actual capacity, not standard 25min)`)
    }
  }

  const taskList = tasks.map(t => `- ${t.name} (${t.dur}min, ${t.priority})`).join('\n')
  plannerParts.push('', '=== TASKS TO SCHEDULE ===', taskList)

  return plannerParts.join('\n')
}

/**
 * Quick context for insight generation — compact version.
 */
export function buildInsightContext(ctx: BISContext, userName: string): string {
  const m = ctx.userModel
  if (!m || m.confidence === 'low') {
    return `User ${userName} is new — ${ctx.todayStats.tasksCompleted} tasks done today, ${ctx.todayStats.focusMinutes}min focus. Encourage them to keep building their profile.`
  }

  return [
    `${userName}: ${m.workPattern} worker, ${Math.round(m.completionRate * 100)}% completion rate`,
    m.productiveHours.length > 0 ? `Peak: ${m.productiveHours.join(', ')}` : '',
    m.burnoutRisk !== 'low' ? `⚠️ Burnout risk: ${m.burnoutRisk}` : '',
    `Today: ${ctx.todayStats.tasksCompleted} tasks, ${ctx.todayStats.focusMinutes}min focus`,
    ctx.memory?.insights[0] ?? '',
  ].filter(Boolean).join(' | ')
}
