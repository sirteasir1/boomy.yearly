export type Priority   = 'high' | 'med' | 'low'
export type TaskStatus = 'todo' | 'inprogress' | 'review' | 'done'
export type FocusMode  = 'focus' | 'short' | 'long'

export interface BoomlyUser {
  uid:         string
  email:       string
  name:        string
  avatar?:     string
  plan:        'free' | 'pro' | 'team'
  createdAt:   number
  preferences: UserPreferences
}

export interface UserPreferences {
  theme:         'dark' | 'light'
  focusDuration: number
  shortBreak:    number
  longBreak:     number
  workdayStart:  string
  workdayEnd:    string
  aiMemory:      boolean
  notifications: boolean
}

export interface Task {
  id:          string
  title:       string
  description: string
  status:      TaskStatus
  priority:    Priority
  tags:        string[]
  due?:        string
  estimate?:   string
  subtasks:    SubTask[]
  projectId?:  string
  createdAt:   number
  updatedAt:   number
  userId:      string
}

export interface SubTask {
  id:       string
  title:    string
  done:     boolean
  estimate: string
}

export interface Note {
  id:        string
  title:     string
  content:   string
  tags:      string[]
  pinned:    boolean
  aiSummary: string | null
  createdAt: number
  updatedAt: number
  userId:    string
}

export interface Project {
  id:       string
  name:     string
  emoji:    string
  color:    string
  progress: number
  members:  string[]
  ownerId:  string
  createdAt:number
}

export interface CalendarEvent {
  id:     string
  title:  string
  start:  string
  end:    string
  color:  string
  allDay: boolean
  userId: string
}

export interface PlannerTask {
  id:       string
  name:     string
  dur:      number
  priority: Priority
}

export interface ScheduleBlock {
  time:     string
  title:    string
  duration: string
  type:     'focus' | 'break' | 'admin' | 'meeting'
  notes:    string
}

export interface FocusSession {
  id:        string
  userId:    string
  duration:  number
  mode:      FocusMode
  completed: boolean
  date:      string
  createdAt: number
}
