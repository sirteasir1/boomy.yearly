/**
 * Behavioral Intelligence System — Type Definitions
 * Every user action becomes a data point that builds the behavioral model.
 */

// ── Raw behavioral events ──────────────────────────────────────
export type BehavioralEventType =
  | 'task_created'
  | 'task_completed'
  | 'task_postponed'
  | 'task_deleted'
  | 'focus_started'
  | 'focus_completed'
  | 'focus_abandoned'        // left before timer ended
  | 'note_created'
  | 'note_revisited'
  | 'planner_generated'
  | 'planner_accepted'       // user kept AI plan without changes
  | 'planner_modified'       // user edited AI plan
  | 'session_start'          // app opened
  | 'session_end'

export interface BehavioralEvent {
  id:        string
  userId:    string
  type:      BehavioralEventType
  timestamp: number           // unix ms
  hour:      number           // 0-23
  dayOfWeek: number           // 0=Sun, 6=Sat
  metadata:  EventMetadata
}

export interface EventMetadata {
  // Task events
  taskId?:            string
  taskPriority?:      'high' | 'med' | 'low'
  estimatedMinutes?:  number
  actualMinutes?:     number
  postponedTimes?:    number
  taskTitleLength?:   number  // proxy for task clarity
  hadSubtasks?:       boolean

  // Focus events
  sessionMinutes?:    number
  plannedMinutes?:    number
  abandoned?:         boolean
  ambientSound?:      string

  // Note events
  noteId?:            string
  wordCount?:         number
  isRevisit?:         boolean

  // Planner events
  tasksCount?:        number
  modifiedBlocks?:    number
}

// ── Computed behavioral model ──────────────────────────────────
export interface UserBehavioralModel {
  userId:                string

  // Time patterns
  productiveHours:       string[]       // e.g. ['8:00-11:00', '14:00-16:00']
  peakDays:              number[]       // 0-6
  workPattern:           'morning' | 'afternoon' | 'evening' | 'night' | 'mixed'

  // Focus patterns
  avgFocusMinutes:       number
  maxFocusMinutes:       number
  focusDropHour:         number | null  // hour when focus typically drops
  preferredFocusMode:    string         // 'focus'|'short'|'long'
  abandonRate:           number         // 0-1

  // Task behavior
  completionRate:        number         // 0-1
  avgPostponeCount:      number
  avgActualVsEstimate:   number         // ratio: actual/estimated, >1 = underestimates
  preferredTaskSize:     'small' | 'medium' | 'large'
  procrastinationTriggers: string[]     // ['large tasks', 'ambiguous scope', ...]

  // Risk signals
  burnoutRisk:           'low' | 'medium' | 'high'
  overloadDays:          number         // days with >8 tasks completed
  consistencyScore:      number         // 0-100

  // Goals & streaks
  longestStreak:         number
  currentStreak:         number

  // Meta
  dataPoints:            number         // how much data we have
  confidence:            'low' | 'medium' | 'high'   // model reliability
  updatedAt:             number
}

// ── Detected patterns ──────────────────────────────────────────
export type PatternType =
  | 'peak_hours'
  | 'procrastination'
  | 'burnout_risk'
  | 'focus_pattern'
  | 'task_completion'
  | 'scheduling_mismatch'
  | 'positive_streak'
  | 'overload_warning'

export interface BehavioralPattern {
  id:               string
  userId:           string
  type:             PatternType
  title:            string
  description:      string
  confidence:       number        // 0-1
  severity:         'info' | 'warning' | 'critical' | 'positive'
  actionSuggestion: string
  detectedAt:       number
  dataPoints:       number        // evidence count
}

// ── Memory system ──────────────────────────────────────────────
export interface MemorySummary {
  userId:       string
  summary:      string            // AI-generated behavioral summary
  insights:     string[]          // key insights
  weeklyStats: {
    tasksCompleted:   number
    focusHours:       number
    completionRate:   number
    peakDay:          string
    peakHour:         string
  }
  lastUpdated:  number
}

// ── Agent tool definitions ─────────────────────────────────────
export interface AgentTool {
  name:        string
  description: string
  parameters:  Record<string, any>
}

export interface AgentAction {
  tool:   string
  params: Record<string, any>
}

export interface AgentResponse {
  message:  string
  actions:  AgentAction[]
  reasoning: string
}

// ── BIS Context (assembled for AI) ────────────────────────────
export interface BISContext {
  userModel:   UserBehavioralModel | null
  memory:      MemorySummary | null
  patterns:    BehavioralPattern[]
  todayStats: {
    tasksCompleted: number
    focusMinutes:   number
    sessionsCount:  number
    hourOfDay:      number
  }
}
