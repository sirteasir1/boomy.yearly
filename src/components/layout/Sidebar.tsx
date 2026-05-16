'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store/useStore'
import { useAuth }  from '@/lib/hooks/useAuth'
import { useLang }  from '@/lib/i18n/useLang'
import { getInitials, cn } from '@/lib/utils'
import {
  LayoutDashboard, Sparkles, CheckSquare, FileText,
  Timer, Users, Calendar, BarChart3, Settings, LogOut, ChevronRight, UserCircle,
} from 'lucide-react'

const NAV = [
  { href:'/dashboard', icon:LayoutDashboard, key:'dashboard', section:'workspace', badge:null },
  { href:'/planner',   icon:Sparkles,        key:'planner',   section:'workspace', badge:'AI' },
  { href:'/tasks',     icon:CheckSquare,     key:'tasks',     section:'productivity', badge:null },
  { href:'/notes',     icon:FileText,        key:'notes',     section:'productivity', badge:null },
  { href:'/focus',     icon:Timer,           key:'focus',     section:'productivity', badge:null },
  { href:'/teams',     icon:Users,           key:'teams',     section:'productivity', badge:null },
  { href:'/calendar',  icon:Calendar,        key:'calendar',  section:'insights', badge:null },
  { href:'/analytics', icon:BarChart3,       key:'analytics', section:'insights', badge:'BIS' },
  { href:'/profile',   icon:UserCircle,      key:'profile',   section:'insights', badge:null },
] as const

const SECTIONS = ['workspace','productivity','insights'] as const

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar } = useStore()
  const { user, logout } = useAuth()
  const tr = useLang()

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 220 : 64 }}
      transition={{ type:'spring', stiffness:280, damping:28 }}
      className="relative flex-shrink-0 flex flex-col h-full overflow-hidden"
      style={{ background:'rgba(5,5,20,0.85)', borderRight:'1px solid rgba(255,255,255,0.07)', backdropFilter:'blur(28px)' }}>

      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 14px', borderBottom:'1px solid rgba(255,255,255,.07)', minHeight:64 }}>
        <img src="/logo-symbol.jpg" alt="Boomly" onClick={toggleSidebar}
          style={{ width:36,height:36,minWidth:36,borderRadius:12,objectFit:'cover',boxShadow:'0 0 16px rgba(99,102,241,.4)',cursor:'pointer',flexShrink:0 }}/>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.span initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-8}}
              style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:18,color:'#f8fafc',whiteSpace:'nowrap'}}>
              Boomly
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* User */}
      {user && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,.07)', minHeight:52 }}>
          <div style={{ width:30,height:30,minWidth:30,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#d946ef)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff' }}>
            {getInitials(user.name)}
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                <div style={{fontSize:12,fontWeight:600,color:'#f8fafc',whiteSpace:'nowrap'}}>{user.name}</div>
                <div style={{fontSize:10,color:'#4b5563'}}>Pro</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex:1, padding:'10px 8px', overflowY:'auto', display:'flex', flexDirection:'column', gap:1 }}>
        {SECTIONS.map(section => (
          <div key={section}>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                  style={{fontSize:9,fontWeight:700,color:'#2d3748',letterSpacing:'1px',textTransform:'uppercase',padding:'8px 8px 3px'}}>
                  {tr(section as any)}
                </motion.div>
              )}
            </AnimatePresence>
            {NAV.filter(n=>n.section===section).map(item=>{
              const active = pathname===item.href
              return (
                <Link key={item.href} href={item.href} style={{
                  display:'flex',alignItems:'center',gap:10,
                  padding:sidebarOpen?'9px 10px':'10px',
                  borderRadius:12,cursor:'pointer',textDecoration:'none',
                  color:active?'#818cf8':'#4b5563',
                  background:active?'linear-gradient(90deg,rgba(99,102,241,.18),rgba(6,182,212,.06))':'transparent',
                  border:active?'1px solid rgba(99,102,241,.25)':'1px solid transparent',
                  transition:'all .18s',marginBottom:2,position:'relative',
                }}>
                  {active&&<div style={{position:'absolute',left:0,top:'20%',bottom:'20%',width:3,background:'linear-gradient(180deg,#6366f1,#22d3ee)',borderRadius:'0 3px 3px 0'}}/>}
                  <item.icon style={{width:17,height:17,flexShrink:0,filter:active?'drop-shadow(0 0 5px #6366f1)':'none'}}/>
                  <AnimatePresence>
                    {sidebarOpen&&(
                      <motion.span initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                        style={{flex:1,fontSize:13,fontWeight:500,color:active?'#f8fafc':'#6b7280',whiteSpace:'nowrap'}}>
                        {tr(item.key as any)}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {sidebarOpen&&item.badge&&(
                    <span style={{fontSize:9,background:'#6366f1',color:'#fff',padding:'1px 5px',borderRadius:8,fontWeight:700}}>{item.badge}</span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{borderTop:'1px solid rgba(255,255,255,.07)',padding:'8px'}}>
        <Link href="/settings" style={{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:12,color:'#4b5563',textDecoration:'none',transition:'all .15s'}}>
          <Settings style={{width:17,height:17,flexShrink:0}}/>
          {sidebarOpen&&<span style={{fontSize:13}}>{tr('settings')}</span>}
        </Link>
        <button onClick={logout} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:12,background:'none',border:'none',cursor:'pointer',color:'#4b5563',transition:'all .15s'}}
          onMouseEnter={e=>{e.currentTarget.style.color='#f87171';e.currentTarget.style.background='rgba(244,63,94,.08)'}}
          onMouseLeave={e=>{e.currentTarget.style.color='#4b5563';e.currentTarget.style.background='none'}}>
          <LogOut style={{width:17,height:17,flexShrink:0}}/>
          {sidebarOpen&&<span style={{fontSize:13}}>{tr('signOut')}</span>}
        </button>
        {sidebarOpen&&(
          <div style={{display:'flex',alignItems:'center',gap:7,padding:'8px 10px',marginTop:4}}>
            <div className="ai-pulse"/>
            <span style={{fontSize:10,color:'#2d3748'}}>{tr('aiMemoryActive')}</span>
          </div>
        )}
      </div>

      {/* Toggle button */}
      <button onClick={toggleSidebar}
        style={{position:'absolute',bottom:80,right:8,width:22,height:22,borderRadius:6,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.12)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',zIndex:20}}>
        <ChevronRight style={{width:12,height:12,color:'#6b7280',transform:sidebarOpen?'rotate(180deg)':'none',transition:'transform .3s'}}/>
      </button>
    </motion.aside>
  )
}
