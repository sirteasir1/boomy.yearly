/**
 * BIS Analyzer — turns raw behavioral events into a user model.
 *
 * This runs server-side (API route) to avoid heavy computation on client.
 * The output is a UserBehavioralModel + BehavioralPattern[] stored in Firestore.
 */
import type {
  BehavioralEvent,
  UserBehavioralModel,
  BehavioralPattern,
  PatternType,
} from './types'

const now = () => Date.now()

// ── Helper: count events by hour ──────────────────────────────
function eventsByHour(events: BehavioralEvent[]): Record<number, number> {
  const counts: Record<number, number> = {}
  events.forEach(e => {
    counts[e.hour] = (counts[e.hour] ?? 0) + 1
  })
  return counts
}

// ── Helper: find peak hours from completion events ────────────
function findPeakHours(completions: BehavioralEvent[]): string[] {
  if (completions.length < 5) return []
  const byHour = eventsByHour(completions)
  const sorted = Object.entries(byHour).sort((a, b) => +b[1] - +a[1])
  const peak = sorted.slice(0, 3).map(([h]) => parseInt(h))
  peak.sort((a, b) => a - b)

  // Group consecutive hours into ranges
  const ranges: string[] = []
  let start = peak[0], end = peak[0]
  for (let i = 1; i < peak.length; i++) {
    if (peak[i] === end + 1) { end = peak[i] }
    else { ranges.push(`${start}:00-${end + 1}:00`); start = end = peak[i] }
  }
  ranges.push(`${start}:00-${end + 1}:00`)
  return ranges
}

// ── Helper: determine work pattern ───────────────────────────
function getWorkPattern(completions: BehavioralEvent[]): UserBehavioralModel['workPattern'] {
  if (completions.length < 5) return 'mixed'
  const morning   = completions.filter(e => e.hour >= 6  && e.hour < 12).length
  const afternoon = completions.filter(e => e.hour >= 12 && e.hour < 17).length
  const evening   = completions.filter(e => e.hour >= 17 && e.hour < 21).length
  const night     = completions.filter(e => e.hour >= 21 || e.hour < 6).length
  const max = Math.max(morning, afternoon, evening, night)
  if (max === morning)   return 'morning'
  if (max === afternoon) return 'afternoon'
  if (max === evening)   return 'evening'
  return 'night'
}

// ── Helper: detect procrastination triggers ───────────────────
function detectProcrastinationTriggers(
  postponed: BehavioralEvent[],
  completed: BehavioralEvent[]
): string[] {
  const triggers: string[] = []
  if (postponed.length === 0) return triggers

  // High priority tasks postponed?
  const highPriPostponed = postponed.filter(e => e.metadata.taskPriority === 'high')
  if (highPriPostponed.length / (postponed.length + 0.001) > 0.4) {
    triggers.push('high-stakes tasks')
  }

  // Tasks with long estimated duration?
  const longPostponed = postponed.filter(e => (e.metadata.estimatedMinutes ?? 0) > 90)
  if (longPostponed.length > 2) {
    triggers.push('large tasks (>90 min)')
  }

  // Tasks with short title (undefined scope)?
  const vagueTasks = postponed.filter(e => (e.metadata.taskTitleLength ?? 10) < 15)
  if (vagueTasks.length > 2) {
    triggers.push('ambiguous/vague tasks')
  }

  // Evening postponements
  const eveningPostponed = postponed.filter(e => e.hour >= 17)
  if (eveningPostponed.length / (postponed.length + 0.001) > 0.5) {
    triggers.push('end-of-day scheduling')
  }

  return triggers
}

// ── Main: compute full behavioral model ───────────────────────
export function computeUserModel(
  userId: string,
  events: BehavioralEvent[],
  existingModel?: UserBehavioralModel | null
): UserBehavioralModel {
  const completions  = events.filter(e => e.type === 'task_completed')
  const created      = events.filter(e => e.type === 'task_created')
  const postponed    = events.filter(e => e.type === 'task_postponed')
  const focusDone    = events.filter(e => e.type === 'focus_completed')
  const focusAborted = events.filter(e => e.type === 'focus_abandoned')
  const allFocus     = [...focusDone, ...focusAborted]

  // Completion rate
  const completionRate = created.length > 0
    ? Math.min(completions.length / created.length, 1)
    : 0

  // Focus stats
  const focusMinutes = focusDone.map(e => e.metadata.sessionMinutes ?? 25)
  const avgFocus = focusMinutes.length > 0
    ? Math.round(focusMinutes.reduce((a,b) => a+b, 0) / focusMinutes.length)
    : 25
  const maxFocus = focusMinutes.length > 0 ? Math.max(...focusMinutes) : 25
  const abandonRate = allFocus.length > 0 ? focusAborted.length / allFocus.length : 0

  // Postpone stats
  const avgPostpone = postponed.length > 0
    ? postponed.reduce((a, e) => a + (e.metadata.postponedTimes ?? 1), 0) / postponed.length
    : 0

  // Estimation accuracy
  const withEstimates = completions.filter(
    e => e.metadata.estimatedMinutes && e.metadata.actualMinutes
  )
  const avgRatio = withEstimates.length > 0
    ? withEstimates.reduce(
        (a, e) => a + (e.metadata.actualMinutes! / e.metadata.estimatedMinutes!), 0
      ) / withEstimates.length
    : 1

  // Preferred task size
  const avgEstimate = withEstimates.length > 0
    ? withEstimates.reduce((a,e) => a + (e.metadata.estimatedMinutes ?? 30), 0) / withEstimates.length
    : 30
  const preferredSize: UserBehavioralModel['preferredTaskSize'] =
    avgEstimate < 30 ? 'small' : avgEstimate < 90 ? 'medium' : 'large'

  // Burnout risk
  const recentEvents  = events.filter(e => e.timestamp > now() - 7 * 24 * 60 * 60 * 1000)
  const dailyCounts   = recentEvents.reduce((acc, e) => {
    const day = new Date(e.timestamp).toDateString()
    acc[day]  = (acc[day] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
  const maxDaily = Math.max(...Object.values(dailyCounts), 0)
  const burnout: UserBehavioralModel['burnoutRisk'] =
    maxDaily > 20 ? 'high' : maxDaily > 12 ? 'medium' : 'low'

  // Consistency (% of days with activity in last 14 days)
  const last14days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i)
    return d.toDateString()
  })
  const activeDays = last14days.filter(d =>
    events.some(e => new Date(e.timestamp).toDateString() === d)
  )
  const consistencyScore = Math.round((activeDays.length / 14) * 100)

  // Find focus drop hour (hour when focus completions drop off)
  const focusHours = focusDone.map(e => e.hour)
  const focusByHour = eventsByHour(focusDone)
  let focusDropHour: number | null = null
  if (focusDone.length >= 5) {
    const peakFocusHour = parseInt(
      Object.entries(focusByHour).sort((a,b) => +b[1] - +a[1])[0]?.[0] ?? '10'
    )
    focusDropHour = Math.min(peakFocusHour + 4, 22)
  }

  const confidence: UserBehavioralModel['confidence'] =
    events.length < 20 ? 'low' : events.length < 80 ? 'medium' : 'high'

  return {
    userId,
    productiveHours:         findPeakHours(completions),
    peakDays:                findPeakDays(completions),
    workPattern:             getWorkPattern(completions),
    avgFocusMinutes:         avgFocus,
    maxFocusMinutes:         maxFocus,
    focusDropHour,
    preferredFocusMode:      avgFocus <= 25 ? 'focus' : 'long',
    abandonRate:             Math.round(abandonRate * 100) / 100,
    completionRate:          Math.round(completionRate * 100) / 100,
    avgPostponeCount:        Math.round(avgPostpone * 10) / 10,
    avgActualVsEstimate:     Math.round(avgRatio * 100) / 100,
    preferredTaskSize:       preferredSize,
    procrastinationTriggers: detectProcrastinationTriggers(postponed, completions),
    burnoutRisk:             burnout,
    overloadDays:            Object.values(dailyCounts).filter(c => c > 15).length,
    consistencyScore,
    longestStreak:           existingModel?.longestStreak ?? 0,
    currentStreak:           existingModel?.currentStreak ?? 0,
    dataPoints:              events.length,
    confidence,
    updatedAt:               now(),
  }
}

function findPeakDays(completions: BehavioralEvent[]): number[] {
  if (completions.length < 7) return []
  const byDay: Record<number, number> = {}
  completions.forEach(e => { byDay[e.dayOfWeek] = (byDay[e.dayOfWeek] ?? 0) + 1 })
  const avg = completions.length / 7
  return Object.entries(byDay)
    .filter(([, count]) => count > avg)
    .map(([day]) => parseInt(day))
    .sort()
}

// ── Detect patterns ────────────────────────────────────────────
export function detectPatterns(
  model: UserBehavioralModel,
  events: BehavioralEvent[]
): BehavioralPattern[] {
  const patterns: BehavioralPattern[] = []
  const makeId = (type: PatternType) => `${type}_${model.userId}_${now()}`

  // Peak hours pattern
  if (model.productiveHours.length > 0 && model.confidence !== 'low') {
    patterns.push({
      id:               makeId('peak_hours'),
      userId:           model.userId,
      type:             'peak_hours',
      title:            'Peak productivity hours detected',
      description:      `You complete most tasks between ${model.productiveHours.join(', ')}. Your work pattern is ${model.workPattern}.`,
      confidence:       model.confidence === 'high' ? 0.9 : 0.6,
      severity:         'positive',
      actionSuggestion: `Schedule your most important tasks during ${model.productiveHours[0]} for maximum output.`,
      detectedAt:       now(),
      dataPoints:       events.filter(e => e.type === 'task_completed').length,
    })
  }

  // Procrastination pattern
  if (model.procrastinationTriggers.length > 0) {
    patterns.push({
      id:               makeId('procrastination'),
      userId:           model.userId,
      type:             'procrastination',
      title:            'Procrastination triggers identified',
      description:      `You tend to postpone tasks involving: ${model.procrastinationTriggers.join(', ')}. Average postpone count: ${model.avgPostponeCount}×.`,
      confidence:       0.75,
      severity:         model.avgPostponeCount > 3 ? 'warning' : 'info',
      actionSuggestion: 'Break large/ambiguous tasks into sub-tasks before scheduling. Use AI breakdown to create clear steps.',
      detectedAt:       now(),
      dataPoints:       events.filter(e => e.type === 'task_postponed').length,
    })
  }

  // Burnout risk
  if (model.burnoutRisk !== 'low') {
    patterns.push({
      id:               makeId('burnout_risk'),
      userId:           model.userId,
      type:             'burnout_risk',
      title:            `${model.burnoutRisk === 'high' ? 'High' : 'Medium'} burnout risk detected`,
      description:      `Your recent activity shows ${model.overloadDays} overloaded day(s) this week. Consistency score: ${model.consistencyScore}%.`,
      confidence:       0.7,
      severity:         model.burnoutRisk === 'high' ? 'critical' : 'warning',
      actionSuggestion: 'AI planner will protect recovery time and cap daily task count. Consider adding a long break session.',
      detectedAt:       now(),
      dataPoints:       model.overloadDays,
    })
  }

  // Underestimation pattern
  if (model.avgActualVsEstimate > 1.5 && model.dataPoints >= 10) {
    patterns.push({
      id:               makeId('scheduling_mismatch'),
      userId:           model.userId,
      type:             'scheduling_mismatch',
      title:            'You consistently underestimate task duration',
      description:      `Tasks take ${Math.round(model.avgActualVsEstimate * 100)}% of estimated time on average. This creates schedule overflow.`,
      confidence:       0.85,
      severity:         'warning',
      actionSuggestion: `AI planner will automatically add ${Math.round((model.avgActualVsEstimate - 1) * 100)}% buffer to your task estimates.`,
      detectedAt:       now(),
      dataPoints:       events.filter(e => e.metadata.estimatedMinutes).length,
    })
  }

  // Focus drop pattern
  if (model.focusDropHour && model.avgFocusMinutes < 20) {
    patterns.push({
      id:               makeId('focus_pattern'),
      userId:           model.userId,
      type:             'focus_pattern',
      title:            'Short focus sessions detected',
      description:      `Your average focus session is ${model.avgFocusMinutes} minutes. Focus tends to drop after ${model.focusDropHour}:00.`,
      confidence:       0.8,
      severity:         'info',
      actionSuggestion: 'Try shorter 15-minute sessions with ambient sound to build focus tolerance gradually.',
      detectedAt:       now(),
      dataPoints:       events.filter(e => e.type === 'focus_completed').length,
    })
  }

  // Consistency positive
  if (model.consistencyScore >= 80) {
    patterns.push({
      id:               makeId('positive_streak'),
      userId:           model.userId,
      type:             'positive_streak',
      title:            'Excellent consistency 🔥',
      description:      `You've been active ${model.consistencyScore}% of days this week. This level of consistency compounds into massive results.`,
      confidence:       1.0,
      severity:         'positive',
      actionSuggestion: 'Keep this momentum. AI will protect your peak hours from meetings and admin tasks.',
      detectedAt:       now(),
      dataPoints:       model.consistencyScore,
    })
  }

  return patterns
}
