'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore }  from '@/lib/store/useStore'
import { AppShell }  from '@/components/layout/AppShell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useStore()
  const router = useRouter()
  useEffect(() => { if (!loading && !user) router.replace('/auth/login') }, [user, loading, router])
  if (loading) return null
  if (!user)   return null
  return <AppShell>{children}</AppShell>
}
