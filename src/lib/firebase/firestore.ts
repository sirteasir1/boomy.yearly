/**
 * Firestore helpers — all DB operations live here.
 * Offline-safe: wrapped in try/catch so the app degrades gracefully
 * when Firebase cannot reach the network. Cached data is served
 * automatically by the persistentLocalCache configured in config.ts.
 */
import {
  collection, doc, getDocs, getDoc, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy,
  limit, onSnapshot, serverTimestamp, type Unsubscribe,
} from 'firebase/firestore'
import { db } from './config'
import type { Task, Note, Project, FocusSession, BoomlyUser, CalendarEvent } from '@/types'

const now = () => Date.now()

// ── Users ─────────────────────────────────────────
export async function createUser(uid: string, data: Partial<BoomlyUser>) {
  await setDoc(doc(db, 'users', uid), {
    ...data, uid, plan: 'free', createdAt: now(),
    preferences: {
      theme: 'dark', focusDuration: 25, shortBreak: 5, longBreak: 15,
      workdayStart: '09:00', workdayEnd: '18:00', aiMemory: true, notifications: true,
    },
  })
}

export async function getUser(uid: string): Promise<BoomlyUser | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    return snap.exists() ? (snap.data() as BoomlyUser) : null
  } catch (err: any) {
    // Offline — return null so the app uses the in-memory store fallback
    console.warn('[Firestore] getUser offline:', err.code)
    return null
  }
}

export async function updateUser(uid: string, data: Partial<BoomlyUser>) {
  try {
    await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: now() })
  } catch (err: any) {
    console.warn('[Firestore] updateUser offline:', err.code)
  }
}

// ── Tasks ─────────────────────────────────────────
export function subscribeToTasks(userId: string, cb: (tasks: Task[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'tasks'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(q,
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task))),
    err  => console.warn('[Firestore] tasks snapshot error:', err.code),
  )
}

export async function createTask(data: Omit<Task, 'id'>): Promise<string> {
  try {
    const ref = await addDoc(collection(db, 'tasks'), { ...data, createdAt: now(), updatedAt: now() })
    return ref.id
  } catch (err: any) {
    console.error('[Firestore] createTask FAILED:', err.code, err.message)
    throw err
  }
}

export async function updateTask(id: string, data: Partial<Task>) {
  try {
    await updateDoc(doc(db, 'tasks', id), { ...data, updatedAt: now() })
  } catch (err: any) {
    console.warn('[Firestore] updateTask offline:', err.code)
  }
}

export async function deleteTask(id: string) {
  try {
    await deleteDoc(doc(db, 'tasks', id))
  } catch (err: any) {
    console.warn('[Firestore] deleteTask offline:', err.code)
  }
}

// ── Notes ─────────────────────────────────────────
export function subscribeToNotes(userId: string, cb: (notes: Note[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'notes'),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc'),
  )
  return onSnapshot(q,
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Note))),
    err  => console.warn('[Firestore] notes snapshot error:', err.code),
  )
}

export async function createNote(data: Omit<Note, 'id'>): Promise<string> {
  try {
    const ref = await addDoc(collection(db, 'notes'), { ...data, createdAt: now(), updatedAt: now() })
    return ref.id
  } catch (err: any) {
    console.error('[Firestore] createNote FAILED:', err.code, err.message)
    throw err
  }
}

export async function updateNote(id: string, data: Partial<Note>) {
  try {
    await updateDoc(doc(db, 'notes', id), { ...data, updatedAt: now() })
  } catch (err: any) {
    console.warn('[Firestore] updateNote offline:', err.code)
  }
}

export async function deleteNote(id: string) {
  try {
    await deleteDoc(doc(db, 'notes', id))
  } catch (err: any) {
    console.warn('[Firestore] deleteNote offline:', err.code)
  }
}

// ── Projects ──────────────────────────────────────
export async function getProjects(userId: string): Promise<Project[]> {
  try {
    const q = query(collection(db, 'projects'), where('members', 'array-contains', userId))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Project))
  } catch (err: any) {
    console.warn('[Firestore] getProjects offline:', err.code)
    return []
  }
}

export async function createProject(data: Omit<Project, 'id'>): Promise<string> {
  try {
    const ref = await addDoc(collection(db, 'projects'), { ...data, createdAt: now() })
    return ref.id
  } catch (err: any) {
    console.warn('[Firestore] createProject offline:', err.code)
    return now().toString()
  }
}

// ── Calendar Events ────────────────────────────────
export async function getEvents(userId: string): Promise<CalendarEvent[]> {
  try {
    const q = query(collection(db, 'events'), where('userId', '==', userId))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent))
  } catch (err: any) {
    console.warn('[Firestore] getEvents offline:', err.code)
    return []
  }
}

export async function createEvent(data: Omit<CalendarEvent, 'id'>): Promise<string> {
  try {
    const ref = await addDoc(collection(db, 'events'), data)
    return ref.id
  } catch (err: any) {
    console.warn('[Firestore] createEvent offline:', err.code)
    return now().toString()
  }
}

// ── Focus Sessions ────────────────────────────────
export async function saveFocusSession(data: Omit<FocusSession, 'id'>) {
  try {
    await addDoc(collection(db, 'focus_sessions'), data)
  } catch (err: any) {
    console.warn('[Firestore] saveFocusSession offline:', err.code)
  }
}

export async function getFocusSessions(userId: string): Promise<FocusSession[]> {
  try {
    const q = query(
      collection(db, 'focus_sessions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FocusSession))
  } catch (err: any) {
    console.warn('[Firestore] getFocusSessions offline:', err.code)
    return []
  }
}

// ── Calendar Events ───────────────────────────────────────────
export async function getCalendarEvents(userId: string): Promise<any[]> {
  try {
    const q = query(collection(db,'events'), where('userId','==',userId), orderBy('createdAt','desc'))
    const snap = await getDocs(q)
    return snap.docs.map(d=>({id:d.id,...d.data()}))
  } catch {
    try {
      const q2 = query(collection(db,'events'), where('userId','==',userId))
      const snap2 = await getDocs(q2)
      return snap2.docs.map(d=>({id:d.id,...d.data()}))
    } catch { return [] }
  }
}
export async function createCalendarEvent(ev: any): Promise<void> {
  try { await setDoc(doc(db,'events',ev.id), ev) } catch(e:any){console.warn('[Firestore] createEvent:',e.code)}
}
export async function deleteCalendarEvent(id: string): Promise<void> {
  try { await deleteDoc(doc(db,'events',id)) } catch(e:any){console.warn('[Firestore] deleteEvent:',e.code)}
}

// ── Focus Room Chat ───────────────────────────────────────────
export function subscribeFocusChat(
  roomId: string,
  cb: (msgs: any[]) => void
): () => void {
  // Try with orderBy first (needs index), fallback to simple query
  const trySubscribe = (withOrder: boolean) => {
    const q = withOrder
      ? query(collection(db,'focus_messages'), where('roomId','==',roomId), orderBy('timestamp','asc'), limit(50))
      : query(collection(db,'focus_messages'), where('roomId','==',roomId), limit(50))

    return onSnapshot(q,
      snap => {
        const msgs = snap.docs.map(d=>({id:d.id,...d.data()}))
        if (!withOrder) msgs.sort((a:any,b:any)=>(a.timestamp?.seconds??0)-(b.timestamp?.seconds??0))
        cb(msgs)
      },
      err => {
        console.warn('[Focus chat]', err.code)
        if (withOrder && (err.code === 'permission-denied' || err.code === 'failed-precondition')) {
          // Deploy firestore:rules or firestore:indexes to fix
          console.info('[Focus chat] Try: firebase deploy --only firestore:rules,firestore:indexes')
          if (err.code !== 'permission-denied') trySubscribe(false)
        }
      }
    )
  }
  return trySubscribe(true)
}
export async function sendFocusChatMessage(msg: {userId:string;userName:string;text:string;roomId:string}): Promise<void> {
  try {
    await addDoc(collection(db,'focus_messages'), {...msg, timestamp: serverTimestamp()})
  } catch(e:any){console.warn('[Firestore] sendChat:',e.code)}
}
