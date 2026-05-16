import type { Lang } from '@/lib/i18n/translations'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BoomlyUser, Task, Note, Project } from '@/types'

interface BoomlyStore {
  user:         BoomlyUser | null
  loading:      boolean
  setUser:      (u: BoomlyUser | null) => void
  setLoading:   (v: boolean) => void

  tasks:        Task[]
  setTasks:     (t: Task[]) => void
  addTask:      (t: Task) => void
  updateTask:   (id: string, data: Partial<Task>) => void
  removeTask:   (id: string) => void

  notes:        Note[]
  setNotes:     (n: Note[]) => void
  addNote:      (n: Note) => void
  updateNote:   (id: string, data: Partial<Note>) => void
  removeNote:   (id: string) => void

  projects:     Project[]
  setProjects:  (p: Project[]) => void

  sidebarOpen:     boolean
  toggleSidebar:   () => void
  rightPanelOpen:  boolean
  toggleRightPanel:() => void

  lang:     'en' | 'ru' | 'kk'
  setLang:  (l: 'en' | 'ru' | 'kk') => void
}

export const useStore = create<BoomlyStore>()(
  persist(
    (set) => ({
      user:      null,
      loading:   true,
      setUser:   u    => set({ user: u }),
      setLoading:v    => set({ loading: v }),

      tasks:     [],
      setTasks:  t    => set({ tasks: t }),
      addTask:   t    => set(s => ({ tasks: [t, ...s.tasks] })),
      updateTask:(id, d) => set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...d } : t) })),
      removeTask:id   => set(s => ({ tasks: s.tasks.filter(t => t.id !== id) })),

      notes:     [],
      setNotes:  n    => set({ notes: n }),
      addNote:   n    => set(s => ({ notes: [n, ...s.notes] })),
      updateNote:(id, d) => set(s => ({ notes: s.notes.map(n => n.id === id ? { ...n, ...d } : n) })),
      removeNote:id   => set(s => ({ notes: s.notes.filter(n => n.id !== id) })),

      projects:    [],
      setProjects: p  => set({ projects: p }),

      sidebarOpen:     true,
      toggleSidebar:   () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
      rightPanelOpen:  true,
      toggleRightPanel:() => set(s => ({ rightPanelOpen: !s.rightPanelOpen })),

      lang:    'en',
      setLang: (lang) => set({ lang }),
    }),
    { name: 'boomly-store', partialize: s => ({ sidebarOpen: s.sidebarOpen, rightPanelOpen: s.rightPanelOpen, lang: s.lang }) }
  )
)
