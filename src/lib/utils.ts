import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

export function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export const PRIORITY_STYLES = {
  high: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  med:  'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  low:  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
} as const

export const STATUS_DOT = {
  todo:       'bg-zinc-500',
  inprogress: 'bg-amber-400',
  review:     'bg-cyan-400',
  done:       'bg-emerald-400',
} as const
