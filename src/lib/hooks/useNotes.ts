'use client'
import { useEffect } from 'react'
import { subscribeToNotes, createNote, updateNote as fsUpdate, deleteNote as fsDelete } from '@/lib/firebase/firestore'
import { useStore } from '@/lib/store/useStore'
import type { Note } from '@/types'

export function useNotes() {
  const { user, notes, setNotes, addNote, updateNote, removeNote } = useStore()

  useEffect(() => {
    if (!user?.uid) return
    const unsub = subscribeToNotes(user.uid, (incoming) => {
      // Merge: preserve local content for notes being edited
      const local = useStore.getState().notes
      const merged = incoming.map(n => {
        const loc = local.find(l => l.id === n.id)
        // Keep local version if it has more content
        if (loc && loc.content && loc.content.length > n.content.length) return loc
        if (loc && loc.title && loc.title.length > n.title.length) return loc
        return n
      })
      setNotes(merged)
    })
    return unsub
  }, [user?.uid])

  const create = async (data: Omit<Note, 'id'>): Promise<string> => {
    if (!user) return ''
    const id = await createNote({ ...data, userId: user.uid })
    // Add locally immediately with correct id
    addNote({ ...data, id, userId: user.uid })
    return id
  }

  const update = async (id: string, data: Partial<Note>) => {
    updateNote(id, data)
    fsUpdate(id, data).catch(() => {})
  }

  const remove = async (id: string) => {
    removeNote(id)
    fsDelete(id).catch(() => {})
  }

  return { notes, create, update, remove }
}
