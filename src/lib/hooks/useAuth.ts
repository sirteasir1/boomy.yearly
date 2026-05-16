'use client'
/**
 * useAuth — auth actions only. The listener lives in AuthProvider (app/layout).
 * This hook no longer registers onAuthStateChanged — that happened in every
 * component that called it, creating 5-6 parallel listeners and a race on
 * setLoading that caused the dashboard freeze.
 */
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, signInWithRedirect,
  signOut, updateProfile,
} from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase/config'
import { createUser, getUser } from '@/lib/firebase/firestore'
import { useStore } from '@/lib/store/useStore'

async function ensureGoogleProfile(fbUser: {
  uid: string; email: string | null; displayName: string | null; photoURL: string | null
}) {
  try {
    const existing = await getUser(fbUser.uid)
    if (!existing) {
      await createUser(fbUser.uid, {
        email:  fbUser.email  ?? '',
        name:   fbUser.displayName ?? 'User',
        avatar: fbUser.photoURL ?? undefined,
        uid:    fbUser.uid,
      })
    }
  } catch { /* offline — profile will be created on next online session */ }
}

export function useAuth() {
  const { user, setUser } = useStore()

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
    // onAuthStateChanged in AuthProvider will update the store
  }

  const signup = async (email: string, password: string, name: string) => {
    const { user: fbUser } = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(fbUser, { displayName: name })
    // Write profile to Firestore in background — don't block navigation
    createUser(fbUser.uid, { email, name, uid: fbUser.uid }).catch(() => {})
  }

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      await ensureGoogleProfile(result.user)
    } catch (err: any) {
      if (
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request'
      ) {
        await signInWithRedirect(auth, googleProvider)
        return
      }
      throw err
    }
  }

  const logout = async () => {
    await signOut(auth)
    setUser(null)
  }

  return { user, login, signup, loginWithGoogle, logout }
}
