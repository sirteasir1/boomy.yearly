/**
 * Firestore operations for the Behavioral Intelligence System.
 * All BIS data lives in separate collections to keep behavioral
 * data isolated from operational data.
 */
import {
  collection, doc, addDoc, setDoc, getDoc, getDocs,
  query, where, orderBy, limit, updateDoc,
  type Unsubscribe, onSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type {
  BehavioralEvent, UserBehavioralModel,
  BehavioralPattern, MemorySummary,
} from '@/lib/bis/types'

const now = () => Date.now()

// ── Behavioral Events ──────────────────────────────────────────
/** Log a raw behavioral event */
export async function logEvent(event: Omit<BehavioralEvent, 'id'>) {
  try {
    await addDoc(collection(db, 'behavioral_events'), event)
  } catch (err: any) {
    console.warn('[BIS] logEvent offline:', err.code)
  }
}

/** Get recent events for a user (last N days) */
export async function getRecentEvents(
  userId: string,
  days = 30
): Promise<BehavioralEvent[]> {
  try {
    // Simple query — only userId filter to avoid composite index requirement
    const q = query(
      collection(db, 'behavioral_events'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(500),
    )
    const snap = await getDocs(q)
    const since = now() - days * 24 * 60 * 60 * 1000
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() } as BehavioralEvent))
      .filter(e => e.timestamp >= since)
  } catch {
    // Fallback: no orderBy (works without index)
    try {
      const q2 = query(collection(db, 'behavioral_events'), where('userId', '==', userId), limit(200))
      const snap2 = await getDocs(q2)
      const since = now() - days * 24 * 60 * 60 * 1000
      return snap2.docs
        .map(d => ({ id: d.id, ...d.data() } as BehavioralEvent))
        .filter(e => e.timestamp >= since)
        .sort((a,b) => b.timestamp - a.timestamp)
    } catch { return [] }
  }
}

/** Get events of a specific type */
export async function getEventsByType(
  userId: string,
  type: BehavioralEvent['type'],
  days = 30
): Promise<BehavioralEvent[]> {
  try {
    const since = now() - days * 24 * 60 * 60 * 1000
    const q = query(
      collection(db, 'behavioral_events'),
      where('userId', '==', userId),
      where('type', '==', type),
      where('timestamp', '>=', since),
      orderBy('timestamp', 'desc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as BehavioralEvent))
  } catch {
    return []
  }
}

// ── User Behavioral Model ──────────────────────────────────────
export async function getUserModel(userId: string): Promise<UserBehavioralModel | null> {
  try {
    const snap = await getDoc(doc(db, 'user_models', userId))
    return snap.exists() ? (snap.data() as UserBehavioralModel) : null
  } catch {
    return null
  }
}

export async function saveUserModel(model: UserBehavioralModel) {
  try {
    await setDoc(doc(db, 'user_models', model.userId), model)
  } catch (err: any) {
    console.warn('[BIS] saveUserModel offline:', err.code)
  }
}

export function subscribeToUserModel(
  userId: string,
  cb: (model: UserBehavioralModel | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'user_models', userId),
    snap => cb(snap.exists() ? (snap.data() as UserBehavioralModel) : null),
    () => cb(null),
  )
}

// ── Detected Patterns ──────────────────────────────────────────
export async function savePatterns(userId: string, patterns: BehavioralPattern[]) {
  try {
    await setDoc(doc(db, 'patterns', userId), { patterns, updatedAt: now() })
  } catch (err: any) {
    console.warn('[BIS] savePatterns offline:', err.code)
  }
}

export async function getPatterns(userId: string): Promise<BehavioralPattern[]> {
  try {
    const snap = await getDoc(doc(db, 'patterns', userId))
    return snap.exists() ? (snap.data().patterns as BehavioralPattern[]) : []
  } catch {
    return []
  }
}

// ── Memory Summary ─────────────────────────────────────────────
export async function getMemorySummary(userId: string): Promise<MemorySummary | null> {
  try {
    const snap = await getDoc(doc(db, 'memory_summaries', userId))
    return snap.exists() ? (snap.data() as MemorySummary) : null
  } catch {
    return null
  }
}

export async function saveMemorySummary(summary: MemorySummary) {
  try {
    await setDoc(doc(db, 'memory_summaries', summary.userId), summary)
  } catch (err: any) {
    console.warn('[BIS] saveMemory offline:', err.code)
  }
}
