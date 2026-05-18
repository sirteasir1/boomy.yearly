'use client'
/**
 * AuthProvider — mounts ONCE at app root (layout.tsx).
 * Registers the single onAuthStateChanged listener for the whole app.
 * All components read auth state from the Zustand store, not from Firebase directly.
 */
import { useEffect } from 'react'
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth'
import posthog from 'posthog-js'
import { auth } from '@/lib/firebase/config'
import { getUser, createUser } from '@/lib/firebase/firestore'
import { useStore } from '@/lib/store/useStore'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useStore()

  // Restore persisted accent color on app load
  useEffect(() => {
    const saved = localStorage.getItem('boomly-accent')
    if (saved) {
      document.documentElement.style.setProperty('--v', saved)
    }
  }, [])

  useEffect(() => {
    // Handle Google redirect result — only runs after a full-page redirect
    getRedirectResult(auth)
      .then(async result => {
        if (!result?.user) return
        const u = result.user
        try {
          const existing = await getUser(u.uid)
          if (!existing) await createUser(u.uid, { email: u.email ?? '', name: u.displayName ?? 'User', uid: u.uid })
        } catch { /* offline — skip */ }
      })
      .catch(() => { /* no redirect in progress */ })

    // Single auth state listener for the entire app
    const unsub = onAuthStateChanged(auth, async fbUser => {
      setLoading(true)
      try {
        if (fbUser) {
          // Try to load the Firestore profile; fall back to Firebase Auth data
          const profile = await getUser(fbUser.uid).catch(() => null)
          const u = profile ?? {
            uid:      fbUser.uid,
            email:    fbUser.email ?? '',
            name:     fbUser.displayName ?? fbUser.email?.split('@')[0] ?? 'User',
            avatar:   fbUser.photoURL ?? undefined,
            plan:     'free',
            createdAt: Date.now(),
            preferences: {
              theme: 'dark', focusDuration: 25, shortBreak: 5, longBreak: 15,
              workdayStart: '09:00', workdayEnd: '18:00', aiMemory: true, notifications: true,
            },
          }
          posthog.identify(u.uid, { email: u.email, name: u.name })
          setUser(u)
        } else {
          posthog.reset()
          setUser(null)
        }
      } catch {
        // If anything fails, don't leave the app stuck in loading state
        setUser(fbUser ? {
          uid: fbUser.uid, email: fbUser.email ?? '', name: fbUser.displayName ?? 'User',
          plan: 'free', createdAt: Date.now(),
          preferences: { theme:'dark',focusDuration:25,shortBreak:5,longBreak:15,workdayStart:'09:00',workdayEnd:'18:00',aiMemory:true,notifications:true },
        } : null)
      } finally {
        setLoading(false)
      }
    })

    return () => unsub()
  }, []) // empty deps — run once only

  return <>{children}</>
}
