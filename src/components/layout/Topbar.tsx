'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useStore }    from '@/lib/store/useStore'
import { useAuth }     from '@/lib/hooks/useAuth'
import { useLang }     from '@/lib/i18n/useLang'
import { LangSelector } from '@/components/layout/LangSelector'
import { Bell, Search, Plus, PanelRight } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { format }      from 'date-fns'
import { useState }    from 'react'

// Page emoji map — titles come from translations inside the component
const PAGE_EMOJI: Record<string, string> = {
  '/dashboard': '⬡',
  '/planner':   '✦',
  '/tasks':     '◈',
  '/notes':     '⬭',
  '/focus':     '◎',
  '/teams':     '⊕',
  '/calendar':  '⊞',
  '/analytics': '⊿',
  '/profile':   '◐',
  '/settings':  '◉',
}

// Map pathname → translation key
const PAGE_KEY: Record<string, any> = {
  '/dashboard': 'dashboard',
  '/planner':   'planner',
  '/tasks':     'tasks',
  '/notes':     'notes',
  '/focus':     'focus',
  '/teams':     'teams',
  '/calendar':  'calendar',
  '/analytics': 'analytics',
  '/profile':   'profile',
  '/settings':  'settings',
}

export function Topbar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { user } = useStore()
  const { logout } = useAuth()
  const { toggleRightPanel } = useStore()
  const tr = useLang()                         // ← hook called inside component ✓
  const [showProfile, setShowProfile] = useState(false)

  const emoji    = PAGE_EMOJI[pathname] ?? '✦'
  const titleKey = PAGE_KEY[pathname]
  const title    = titleKey ? tr(titleKey) : 'Boomly'

  return (
    <header style={{
      height:56, display:'flex', alignItems:'center', padding:'0 20px',
      borderBottom:'1px solid rgba(255,255,255,.07)',
      background:'rgba(2,2,9,.75)', backdropFilter:'blur(20px)',
      flexShrink:0, gap:10, position:'sticky', top:0, zIndex:10,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginRight:'auto' }}>
        <span style={{ fontSize:15, opacity:.5 }}>{emoji}</span>
        <div>
          <div style={{ fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:16, color:'#f8fafc', lineHeight:1 }}>{title}</div>
          <div style={{ fontSize:11, color:'#2d3748', marginTop:2 }}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</div>
        </div>
      </div>

      {/* Search */}
      <button onClick={() => router.push('/planner')}
        className="topbar-search" style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:'7px 14px', fontSize:12, color:'#4b5563', cursor:'pointer', transition:'all .2s' }}
        onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(99,102,241,.4)';e.currentTarget.style.color='#94a3b8'}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.08)';e.currentTarget.style.color='#4b5563'}}>
        <Search style={{ width:13, height:13 }} />
        {tr('quickPlan')}
        <span style={{ fontSize:10, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:5, padding:'1px 5px' }}>⌘K</span>
      </button>

      {/* Boom AI pill */}
      <div onClick={toggleRightPanel}
        style={{ display:'flex', alignItems:'center', gap:6, background:'linear-gradient(135deg,rgba(99,102,241,.12),rgba(168,85,247,.08))', border:'1px solid rgba(99,102,241,.25)', borderRadius:20, padding:'5px 12px', fontSize:11, color:'#818cf8', cursor:'pointer' }}>
        <div className="ai-pulse" />
        {tr('boomActive')}
      </div>

      {/* Add */}
      <button onClick={() => router.push('/tasks')}
        style={{ width:34, height:34, borderRadius:10, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#4b5563', transition:'all .2s' }}
        onMouseEnter={e=>{e.currentTarget.style.color='#f8fafc';e.currentTarget.style.borderColor='rgba(255,255,255,.2)'}}
        onMouseLeave={e=>{e.currentTarget.style.color='#4b5563';e.currentTarget.style.borderColor='rgba(255,255,255,.08)'}}>
        <Plus style={{ width:16, height:16 }} />
      </button>

      {/* Bell */}
      <button style={{ width:34, height:34, borderRadius:10, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#4b5563', transition:'all .2s', position:'relative' }}
        onMouseEnter={e=>{e.currentTarget.style.color='#f8fafc'}}
        onMouseLeave={e=>{e.currentTarget.style.color='#4b5563'}}>
        <Bell style={{ width:16, height:16 }} />
        <span style={{ position:'absolute', top:6, right:6, width:5, height:5, borderRadius:'50%', background:'#6366f1', boxShadow:'0 0 6px rgba(99,102,241,.6)' }} />
      </button>

      {/* Language */}
      <LangSelector />

      {/* Right panel */}
      <button onClick={toggleRightPanel}
        style={{ width:34, height:34, borderRadius:10, background:'rgba(99,102,241,.1)', border:'1px solid rgba(99,102,241,.25)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#818cf8', transition:'all .2s' }}>
        <PanelRight style={{ width:16, height:16 }} />
      </button>

      {/* Avatar + dropdown */}
      <div style={{ position:'relative' }}>
        <button onClick={() => setShowProfile(p => !p)}
          style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#d946ef)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer', border:'none', boxShadow:'0 0 14px rgba(99,102,241,.4)' }}>
          {getInitials(user?.name ?? 'U')}
        </button>

        {showProfile && (
          <>
            <div style={{ position:'fixed', inset:0, zIndex:98 }} onClick={() => setShowProfile(false)} />
            <div style={{ position:'absolute', right:0, top:42, background:'rgba(7,7,26,.98)', border:'1px solid rgba(255,255,255,.1)', borderRadius:16, padding:8, minWidth:180, zIndex:99, backdropFilter:'blur(20px)', boxShadow:'0 16px 48px rgba(0,0,0,.6)' }}>
              <div style={{ padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,.07)', marginBottom:4 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#f8fafc' }}>{user?.name}</div>
                <div style={{ fontSize:11, color:'#4b5563' }}>{user?.email}</div>
              </div>
              {[
                { label: tr('settings'), onClick: () => { router.push('/settings'); setShowProfile(false) } },
                { label: tr('signOut'),  onClick: async () => { await logout(); router.push('/') }, danger: true },
              ].map((item, i) => (
                <button key={i} onClick={item.onClick}
                  style={{ width:'100%', display:'flex', alignItems:'center', padding:'8px 12px', background:'none', border:'none', cursor:'pointer', fontSize:13, color: item.danger ? '#f87171' : '#94a3b8', borderRadius:10, transition:'all .15s', textAlign:'left' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.05)'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='none'}}>
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </header>
  )
}
