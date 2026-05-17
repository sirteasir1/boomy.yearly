'use client'
/**
 * BIS Collector — the data pipeline.
 *
 * Every meaningful user action flows through here.
 * Call these functions from pages/hooks when events happen.
 * Data is collected silently in the background.
 */
import { logEvent } from '@/lib/firebase/bis'
import type { BehavioralEventType, EventMetadata } from './types'

async function safeLogEvent(event: any) {
  try { await logEvent(event) } catch(e) { console.warn('[BIS] skip:', e) }
  // Also save to localStorage for fast client-side analysis
  if (typeof window !== 'undefined') {
    try {
      const key = 'bis_events_' + event.userId
      const stored = localStorage.getItem(key)
      const events = stored ? JSON.parse(stored) : []
      events.push(event)
      localStorage.setItem(key, JSON.stringify(events.slice(-200)))
    } catch {}
  }
}

function buildEvent(
  userId: string,
  type: BehavioralEventType,
  metadata: EventMetadata = {}
) {
  const now = Date.now()
  const d   = new Date(now)
  return {
    userId,
    type,
    timestamp:  now,
    hour:       d.getHours(),
    dayOfWeek:  d.getDay(),
    metadata,
  }
}

// ── Task events ────────────────────────────────────────────────
export function trackTaskCreated(
  userId: string,
  opts: { taskId: string; priority: string; titleLength: number; estimatedMinutes?: number }
) {
  safeLogEvent(buildEvent(userId, 'task_created', {
    taskId:           opts.taskId,
    taskPriority:     opts.priority as any,
    taskTitleLength:  opts.titleLength,
    estimatedMinutes: opts.estimatedMinutes,
  }))
}

export function trackTaskCompleted(
  userId: string,
  opts: {
    taskId:           string
    priority:         string
    estimatedMinutes?: number
    createdAt:        number
    postponedTimes:   number
    hadSubtasks:      boolean
  }
) {
  const actualMinutes = Math.round((Date.now() - opts.createdAt) / 60000)
  const meta: any = {
    taskId:         opts.taskId,
    taskPriority:   opts.priority,
    actualMinutes,
    postponedTimes: opts.postponedTimes,
    hadSubtasks:    opts.hadSubtasks,
  }
  if (opts.estimatedMinutes !== undefined) meta.estimatedMinutes = opts.estimatedMinutes
  safeLogEvent(buildEvent(userId, 'task_completed', meta))
}

export function trackTaskPostponed(
  userId: string,
  opts: { taskId: string; postponedTimes: number; priority: string }
) {
  safeLogEvent(buildEvent(userId, 'task_postponed', {
    taskId:          opts.taskId,
    postponedTimes:  opts.postponedTimes,
    taskPriority:    opts.priority as any,
  }))
}

// ── Focus events ───────────────────────────────────────────────
export function trackFocusStarted(
  userId: string,
  opts: { plannedMinutes: number; ambientSound?: string }
) {
  safeLogEvent(buildEvent(userId, 'focus_started', {
    plannedMinutes: opts.plannedMinutes,
    ambientSound:   opts.ambientSound,
  }))
}

export function trackFocusCompleted(
  userId: string,
  opts: { sessionMinutes: number; plannedMinutes: number; abandoned: boolean }
) {
  safeLogEvent(buildEvent(
    userId,
    opts.abandoned ? 'focus_abandoned' : 'focus_completed',
    {
      sessionMinutes:  opts.sessionMinutes,
      plannedMinutes:  opts.plannedMinutes,
      abandoned:       opts.abandoned,
    }
  ))
}

// ── Note events ────────────────────────────────────────────────
export function trackNoteCreated(userId: string, opts: { noteId: string; wordCount: number }) {
  safeLogEvent(buildEvent(userId, 'note_created', {
    noteId:    opts.noteId,
    wordCount: opts.wordCount,
  }))
}

export function trackNoteRevisited(userId: string, opts: { noteId: string; wordCount: number }) {
  safeLogEvent(buildEvent(userId, 'note_revisited', {
    noteId:    opts.noteId,
    wordCount: opts.wordCount,
    isRevisit: true,
  }))
}

// ── Planner events ─────────────────────────────────────────────
export function trackPlannerGenerated(userId: string, opts: { tasksCount: number }) {
  safeLogEvent(buildEvent(userId, 'planner_generated', { tasksCount: opts.tasksCount }))
}

export function trackPlannerAccepted(userId: string) {
  safeLogEvent(buildEvent(userId, 'planner_accepted', {}))
}

export function trackPlannerModified(userId: string, opts: { modifiedBlocks: number }) {
  safeLogEvent(buildEvent(userId, 'planner_modified', { modifiedBlocks: opts.modifiedBlocks }))
}
