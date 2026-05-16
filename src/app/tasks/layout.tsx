'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore }  from '@/lib/store/useStore'
import { AppShell }  from '@/components/layout/AppShell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useStore()   // reads from Zustand — no new listener
  const router = useRouter()

  useEffect(() => {
    // Only redirect once loading is fully resolved
    if (!loading && !user) router.replace('/auth/login')
  }, [user, loading, router])

  if (loading) return (
    <div style={{ height:'100vh', background:'#020209', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <img src="/logo-symbol.jpg" alt="Boomly" style={{ width:40, height:40, borderRadius:14, objectFit:"cover", boxShadow:"0 0 20px rgba(99,102,241,.4)" }}/>
      <div style={{ display:'flex', alignItems:'center', gap:10, color:'#4b5563', fontSize:14 }}>
        <div style={{ width:18, height:18, border:'2px solid rgba(99,102,241,.3)', borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin 1s linear infinite' }}/>
        Booting Boomly...
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!user) return null

  return <AppShell>{children}</AppShell>
}
