'use client'
import { useEffect, useRef } from 'react'
import { subscribeToNotes, createNote, updateNote as fsUpdate, deleteNote as fsDelete } from '@/lib/firebase/firestore'
import { useStore } from '@/lib/store/useStore'
import type { Note } from '@/types'

export function useNotes() {
  const { user, notes, setNotes, addNote, updateNote, removeNote } = useStore()
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!user?.uid) return
    unsubRef.current = subscribeToNotes(user.uid, setNotes)
    return () => unsubRef.current?.()
  }, [user?.uid])

  const create = async (data: Omit<Note, 'id'>): Promise<string> => {
    if (!user) return ''
    const id = await createNote({ ...data, userId: user.uid })
    addNote({ ...data, id })
    return id
  }

  const update = async (id: string, data: Partial<Note>) => {
    await fsUpdate(id, data)
    updateNote(id, data)
  }

  const remove = async (id: string) => {
    await fsDelete(id)
    removeNote(id)
  }

  return { notes, create, update, remove }
}
