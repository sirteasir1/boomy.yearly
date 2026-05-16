'use client'
/**
 * useBIS — the main hook for consuming BIS data in components.
 *
 * - Provides userModel, patterns, memorySummary
 * - Triggers analysis after significant events
 * - Auto-analyzes on first load if enough data exists
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore } from '@/lib/store/useStore'
import { subscribeToUserModel, getPatterns, getMemorySummary, getRecentEvents } from '@/lib/firebase/bis'
import type { UserBehavioralModel, BehavioralPattern, MemorySummary } from '@/lib/bis/types'

const ANALYSIS_COOLDOWN = 30 * 1000 // 30 seconds between analyses

export function useBIS() {
  const { user } = useStore()
  const [model,    setModel]    = useState<UserBehavioralModel | null>(null)
  const [patterns, setPatterns] = useState<BehavioralPattern[]>([])
  const [memory,   setMemory]   = useState<MemorySummary | null>(null)
  const [loading,  setLoading]  = useState(false)
  const lastAnalysis = useRef(0)

  // Subscribe to real-time model updates from Firestore
  useEffect(() => {
    if (!user?.uid) return
    const unsub = subscribeToUserModel(user.uid, setModel)

    // Load patterns and memory on mount + trigger analysis
    Promise.all([
      getPatterns(user.uid).catch(() => []),
      getMemorySummary(user.uid).catch(() => null),
    ]).then(([p, m]) => {
      setPatterns(p); setMemory(m)
    })

    // Auto-analyze on first mount (no cooldown for first run)
    lastAnalysis.current = 0
    setTimeout(() => analyze(), 1000) // slight delay to let auth settle

    return unsub
  }, [user?.uid])

  /** Trigger a full behavioral analysis */
  const analyze = useCallback(async () => {
    if (!user?.uid) return
    const now = Date.now()
    if (now - lastAnalysis.current < ANALYSIS_COOLDOWN) return
    lastAnalysis.current = now

    setLoading(true)
    try {
      const events = await getRecentEvents(user.uid, 30)
      await fetch('/api/bis/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.uid, events }),
      })

      // Refresh patterns after analysis
      const fresh = await getPatterns(user.uid)
      setPatterns(fresh)
    } catch (err) {
      console.warn('[useBIS] analyze failed:', err)
    }
    setLoading(false)
  }, [user?.uid])

  /** Trigger memory summary update (runs after analysis) */
  const updateMemory = useCallback(async () => {
    if (!user?.uid || !user?.name) return
    try {
      const res = await fetch('/api/bis/memory', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.uid, userName: user.name }),
      })
      if (res.ok) {
        const fresh = await getMemorySummary(user.uid)
        setMemory(fresh)
      }
    } catch {}
  }, [user?.uid, user?.name])

  /** Call after completing a task, session, etc. */
  const onSignificantEvent = useCallback(() => {
    analyze()
  }, [analyze])

  // Critical patterns only (for alerts)
  const criticalPatterns = patterns.filter(p =>
    p.severity === 'critical' || p.severity === 'warning'
  )

  return {
    model,
    patterns,
    criticalPatterns,
    memory,
    loading,
    analyze,
    updateMemory,
    onSignificantEvent,
    hasEnoughData: (model?.dataPoints ?? 0) >= 3,
  }
}
