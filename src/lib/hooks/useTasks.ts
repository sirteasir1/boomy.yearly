'use client'
import { useEffect, useRef } from 'react'
import { subscribeToTasks, createTask, updateTask as fsUpdate, deleteTask as fsDelete } from '@/lib/firebase/firestore'
import { useStore } from '@/lib/store/useStore'
import type { Task } from '@/types'

export function useTasks() {
  const { user, tasks, setTasks, updateTask, removeTask } = useStore()
  const unsubRef = useRef<(() => void) | null>(null)
  const pendingRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!user?.uid) return
    unsubRef.current = subscribeToTasks(user.uid, (incoming: Task[]) => {
      const pending = pendingRef.current
      if (pending.size === 0) {
        setTasks(incoming)
      } else {
        const localTasks = useStore.getState().tasks
        const merged = incoming.map(t =>
          pending.has(t.id)
            ? (localTasks.find(l => l.id === t.id) ?? t)
            : t
        )
        setTasks(merged)
      }
    })
    return () => unsubRef.current?.()
  }, [user?.uid])

  const create = async (data: Omit<Task, 'id'>) => {
    if (!user) return
    // Do NOT add to local state - let subscribeToTasks handle it
    await createTask({ ...data, userId: user.uid })
  }

  const update = async (id: string, data: Partial<Task>) => {
    updateTask(id, data)
    pendingRef.current.add(id)
    try {
      await fsUpdate(id, data)
    } finally {
      setTimeout(() => pendingRef.current.delete(id), 2000)
    }
  }

  const remove = async (id: string) => {
    await fsDelete(id)
    removeTask(id)
  }

  return { tasks, create, update, remove }
}
