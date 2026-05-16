'use client'
import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store/useStore'
import { useRouter, usePathname } from 'next/navigation'
import { formatTime } from '@/lib/utils'
import { Pause, Play, X } from 'lucide-react'

export function GlobalTimer() {
  const { timerEndTime, timerRunning, timerMode, setTimer, stopTimer } = useStore()
  const [secs, setSecs] = useState(0)
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!timerEndTime || !timerRunning) return
    const id = setInterval(() => {
      const rem = Math.max(0, Math.round((timerEndTime - Date.now()) / 1000))
      setSecs(rem)
      if (rem <= 0) {
        stopTimer()
        clearInterval(id)
      }
    }, 250)
    return () => clearInterval(id)
  }, [timerEndTime, timerRunning])

  // Don't show on focus page (it has its own timer)
  if (pathname === '/focus') return null
  if (!timerRunning || !timerEndTime) return null

  const pct  = Math.min(1, secs / (25 * 60))
  const C    = 2 * Math.PI * 16

  return (
    <div
      onClick={() => router.push('/focus')}
      style={{
        position:'fixed', bottom:24, right:24, zIndex:1000,
        background:'rgba(4,4,20,.95)', backdropFilter:'blur(20px)',
        border:'1px solid rgba(99,102,241,.35)', borderRadius:20,
        padding:'10px 16px', display:'flex', alignItems:'center', gap:10,
        cursor:'pointer', boxShadow:'0 8px 32px rgba(0,0,0,.5)',
        transition:'all .2s',
      }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(99,102,241,.6)'}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(99,102,241,.35)'}}>
      {/* Mini ring */}
      <svg width={36} height={36} style={{transform:'rotate(-90deg)',flexShrink:0}}>
        <circle cx={18} cy={18} r={16} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={3}/>
        <circle cx={18} cy={18} r={16} fill="none" stroke="url(#tgm)" strokeWidth={3}
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C*pct}
          style={{transition:'stroke-dashoffset .3s'}}/>
        <defs><linearGradient id="tgm" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#22d3ee"/>
        </linearGradient></defs>
      </svg>
      <div>
        <div style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,fontSize:18,color:'#f8fafc',lineHeight:1}}>{formatTime(secs)}</div>
        <div style={{fontSize:10,color:'#6b7280',marginTop:2,textTransform:'capitalize'}}>{timerMode} session</div>
      </div>
      <button onClick={e=>{e.stopPropagation();stopTimer()}}
        style={{background:'none',border:'none',cursor:'pointer',color:'#4b5563',padding:4,marginLeft:4}}>
        <X size={14}/>
      </button>
    </div>
  )
}
