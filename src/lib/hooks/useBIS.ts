'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore } from '@/lib/store/useStore'
import { saveUserModel, savePatterns, getPatterns, getMemorySummary } from '@/lib/firebase/bis'
import { computeUserModel, detectPatterns } from '@/lib/bis/analyzer'
import type { UserBehavioralModel, BehavioralPattern, MemorySummary, BehavioralEvent } from '@/lib/bis/types'

const COOLDOWN = 30_000
const LS_KEY = (uid: string) => `bis_events_${uid}`

function loadEvents(uid: string): BehavioralEvent[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY(uid)) || '[]') } catch { return [] }
}

export function useBIS() {
  const { user } = useStore()
  const [model,    setModel]    = useState<UserBehavioralModel | null>(null)
  const [patterns, setPatterns] = useState<BehavioralPattern[]>([])
  const [memory,   setMemory]   = useState<MemorySummary | null>(null)
  const [loading,  setLoading]  = useState(false)
  const lastAnalysis = useRef(0)

  useEffect(() => {
    if (!user?.uid) return
    Promise.all([
      getPatterns(user.uid).catch(() => []),
      getMemorySummary(user.uid).catch(() => null),
    ]).then(([p, m]) => { setPatterns(p as BehavioralPattern[]); setMemory(m) })

    lastAnalysis.current = 0
    setTimeout(() => analyze(), 1000)
  }, [user?.uid])

  const analyze = useCallback(async () => {
    if (!user?.uid) return
    const now = Date.now()
    if (now - lastAnalysis.current < COOLDOWN) return
    lastAnalysis.current = now

    setLoading(true)
    try {
      // Read events from localStorage — no Firestore needed
      const events = loadEvents(user.uid)
      if (events.length === 0) { setLoading(false); return }

      // Compute model & patterns entirely on client
      const newModel    = computeUserModel(user.uid, events, model)
      const newPatterns = detectPatterns(newModel, events)

      setModel(newModel)
      setPatterns(newPatterns)

      // Save to Firestore in background (client SDK — has auth)
      saveUserModel(newModel).catch(() => {})
      savePatterns(user.uid, newPatterns).catch(() => {})
    } catch (err) {
      console.warn('[useBIS] analyze failed:', err)
    }
    setLoading(false)
  }, [user?.uid, model])

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

  const onSignificantEvent = useCallback(() => { analyze() }, [analyze])

  return {
    model,
    patterns,
    criticalPatterns: patterns.filter(p => p.severity === 'critical' || p.severity === 'warning'),
    memory,
    loading,
    analyze,
    updateMemory,
    onSignificantEvent,
    hasEnoughData: (model?.dataPoints ?? 0) >= 3,
  }
}

