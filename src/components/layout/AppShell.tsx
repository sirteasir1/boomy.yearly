'use client'
import { useEffect, useRef } from 'react'
import { Sidebar }  from './Sidebar'
import { Topbar }   from './Topbar'
import { AIPanel }  from './AIPanel'
import { GlobalTimer } from './GlobalTimer'
import { useStore } from '@/lib/store/useStore'

export function AppShell({ children }: { children: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { sidebarOpen, rightPanelOpen } = useStore()

  /* ── Animated orb background ── */
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let W = canvas.width = window.innerWidth
    let H = canvas.height = window.innerHeight
    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    window.addEventListener('resize', onResize)

    const orbs = [
      { bx: .12, by: .2,  r: 380, color: 'rgba(99,102,241,',  speed: .00035, phase: 0           },
      { bx: .78, by: .15, r: 300, color: 'rgba(6,182,212,',   speed: .00025, phase: Math.PI      },
      { bx: .5,  by: .8,  r: 260, color: 'rgba(168,85,247,',  speed: .0003,  phase: Math.PI / 2 },
      { bx: .88, by: .65, r: 200, color: 'rgba(16,185,129,',  speed: .0004,  phase: Math.PI * 1.5},
    ]
    const particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * 2000, y: Math.random() * 1000,
      vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .2,
      r: Math.random() * 1.4 + .4, a: Math.random() * .25 + .05,
    }))

    let t = 0; let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      orbs.forEach(o => {
        const ox = W * (o.bx + Math.sin(t * o.speed + o.phase) * .07)
        const oy = H * (o.by + Math.cos(t * o.speed * 1.4 + o.phase) * .055)
        const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, o.r)
        g.addColorStop(0, o.color + '0.055)'); g.addColorStop(1, o.color + '0)')
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ox, oy, o.r, 0, Math.PI * 2); ctx.fill()
      })
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(148,163,184,${p.a})`; ctx.fill()
      })
      t++; raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [])

  return (
    <div style={{ background: '#020209', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* Animated background */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />

      {/* Live ticker tape */}
      <TickerTape />

      {/* App shell */}
      <div style={{ display: 'flex', height: 'calc(100vh - 28px)', position: 'relative', zIndex: 1 }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <Topbar />
          <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }} className="page-enter">
            {children}
          </main>
        </div>
        {rightPanelOpen && <AIPanel />}
      </div>
      <GlobalTimer/>
    </div>
  )
}

/* ── Ticker tape ── */
const TICKER_ITEMS = [
  '✦ Momentum Score: 87%',
  '✦ Tasks: 8 done today',
  '✦ Focus: 4.2h logged',
  '✦ Streak: 12 days 🔥',
  '✦ AI Memory: 24 contexts active',
  '✦ Next: Design Review 2PM',
  '✦ Team: 3 members in flow',
  '✦ Weekly goal: 78% complete',
]

function TickerTape() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]
  return (
    <div style={{
      height: 28, overflow: 'hidden', display: 'flex', alignItems: 'center',
      background: 'linear-gradient(90deg,rgba(99,102,241,.08),rgba(6,182,212,.05))',
      borderBottom: '1px solid rgba(99,102,241,.12)',
      position: 'relative', zIndex: 2,
    }}>
      <div className="ticker-tape" style={{ display: 'flex', whiteSpace: 'nowrap', gap: 0 }}>
        {items.map((item, i) => (
          <span key={i} style={{
            padding: '0 24px', fontSize: 11, color: '#4b5563',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ color: '#818cf8', fontWeight: 600 }}>{item.split(':')[0]}</span>
            {item.includes(':') ? ':' + item.split(':').slice(1).join(':') : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
