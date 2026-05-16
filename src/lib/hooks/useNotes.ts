'use client'
import { useEffect } from 'react'
import { subscribeToNotes, createNote, updateNote as fsUpdate, deleteNote as fsDelete } from '@/lib/firebase/firestore'
import { useStore } from '@/lib/store/useStore'
import type { Note } from '@/types'

export function useNotes() {
  const { user, notes, setNotes, updateNote, removeNote } = useStore()

  useEffect(() => {
    if (!user?.uid) return
    const unsub = subscribeToNotes(user.uid, setNotes)
    return unsub
  }, [user?.uid])

  const create = async (data: Omit<Note, 'id'>): Promise<string> => {
    if (!user) return ''
    // Let subscribeToNotes handle adding to local state
    const id = await createNote({ ...data, userId: user.uid })
    return id
  }

  const update = async (id: string, data: Partial<Note>) => {
    updateNote(id, data)
    fsUpdate(id, data).catch(() => {})
  }

  const remove = async (id: string) => {
    await fsDelete(id)
    removeNote(id)
  }

  return { notes, create, update, remove }
}
