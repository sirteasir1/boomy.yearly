'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store/useStore'
import { AppShell } from '@/components/layout/AppShell'

export default function PublicProfileLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useStore()
  const router = useRouter()
  useEffect(() => { if (!loading && !user) router.replace('/auth/login') }, [user, loading, router])
  if (loading || !user) return null
  return <AppShell>{children}</AppShell>
}
