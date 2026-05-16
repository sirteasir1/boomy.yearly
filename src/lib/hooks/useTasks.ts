'use client'
import { useEffect, useRef } from 'react'
import { subscribeToTasks, createTask, updateTask as fsUpdate, deleteTask as fsDelete } from '@/lib/firebase/firestore'
import { useStore } from '@/lib/store/useStore'
import type { Task } from '@/types'

export function useTasks() {
  const { user, tasks, setTasks, addTask, updateTask, removeTask } = useStore()
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!user?.uid) return
    unsubRef.current = subscribeToTasks(user.uid, setTasks)
    return () => unsubRef.current?.()
  }, [user?.uid])

  const create = async (data: Omit<Task, 'id'>) => {
    if (!user) return
    const id = await createTask({ ...data, userId: user.uid })
    addTask({ ...data, id })
  }

  const update = async (id: string, data: Partial<Task>) => {
    await fsUpdate(id, data)
    updateTask(id, data)
  }

  const remove = async (id: string) => {
    await fsDelete(id)
    removeTask(id)
  }

  return { tasks, create, update, remove }
}
