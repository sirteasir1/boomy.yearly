'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useStore }  from '@/lib/store/useStore'
import { useAuth }   from '@/lib/hooks/useAuth'
import { useLang }   from '@/lib/i18n/useLang'
import { updateUser } from '@/lib/firebase/firestore'
import { getInitials } from '@/lib/utils'
import { Loader2, Check, Bell, BellOff } from 'lucide-react'

type Tab = 'Profile'|'AI Preferences'|'Notifications'|'Appearance'
const TABS: Tab[] = ['Profile','AI Preferences','Notifications','Appearance']

const ACCENT_COLORS = [
  '#6366f1','#06b6d4','#10b981','#f43f5e','#f59e0b','#d946ef','#8b5cf6','#0ea5e9',
]

function Toggle({ val, set }: { val:boolean; set:(v:boolean)=>void }) {
  return (
    <button onClick={()=>set(!val)}
      style={{ width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',transition:'all .25s',position:'relative',
        background:val?'linear-gradient(135deg,#6366f1,#06b6d4)':'rgba(255,255,255,.1)',flexShrink:0 }}>
      <div style={{ position:'absolute',top:3,transition:'left .25s',left:val?24:4,width:18,height:18,borderRadius:9,background:'#fff',boxShadow:'0 1px 4px rgba(0,0,0,.3)' }}/>
    </button>
  )
}

export default function SettingsPage() {
  const { user, setUser }  = useStore()
  const { logout }         = useAuth()
  const tr                 = useLang()
  const [tab,     setTab]  = useState<Tab>('Profile')
  const [saving,  setSaving] = useState(false)
  const [saved,   setSaved]  = useState(false)
  const [name,    setName]   = useState(user?.name ?? '')
  const [focusDur,setFocusDur]= useState(user?.preferences?.focusDuration ?? 25)
  const [aiMemory,setAiMemory]= useState(user?.preferences?.aiMemory ?? true)
  const [notifTask,   setNotifTask]  = useState(user?.preferences?.notifications ?? true)
  const [notifFocus,  setNotifFocus] = useState(true)
  const [notifDigest, setNotifDigest]= useState(true)
  const [notifTeam,   setNotifTeam]  = useState(false)
  const [notifPerm,   setNotifPerm]  = useState<NotificationPermission>('default')
  const [accent,  setAccent] = useState('#6366f1')
  const [theme,   setTheme]  = useState<'dark'|'light'>('dark')

  // Load persisted values
  useEffect(()=>{
    const saved = localStorage.getItem('boomly-accent')
    if(saved) setAccent(saved)
    if(typeof Notification!=='undefined') setNotifPerm(Notification.permission)
  },[])

  // Apply accent instantly
  useEffect(()=>{
    document.documentElement.style.setProperty('--v',accent)
    localStorage.setItem('boomly-accent',accent)
  },[accent])

  // Apply theme
  useEffect(()=>{
    if(theme==='light'){document.documentElement.classList.remove('dark');document.body.style.background='#f8fafc'}
    else{document.documentElement.classList.add('dark');document.body.style.background='#020209'}
  },[theme])

  /** Request browser notification permission */
  const requestNotifPermission = async () => {
    if(typeof Notification==='undefined'){alert('Browser does not support notifications.');return}
    const perm = await Notification.requestPermission()
    setNotifPerm(perm)
    if(perm==='granted'){
      new Notification('Boomly notifications enabled ✓',{
        body:'You\'ll now receive focus reminders and task alerts.',
        icon:'/favicon.svg'
      })
    }
  }

  /** Send a test notification */
  const testNotif = () => {
    if(notifPerm!=='granted') return
    new Notification('⏱ Focus session reminder',{
      body:'Time to start your 25-minute deep work block!',
      icon:'/favicon.svg'
    })
  }

  const save = async () => {
    if(!user) return; setSaving(true)
    try {
      const updated={...user,name,preferences:{...user.preferences,focusDuration:focusDur,aiMemory,notifications:notifTask}}
      await updateUser(user.uid,updated)
      setUser(updated)
      setSaved(true); setTimeout(()=>setSaved(false),2500)
    }catch(e){console.error(e)}
    setSaving(false)
  }

  const tabKeys: Record<Tab,string> = {
    'Profile':tr('profile'), 'AI Preferences':tr('aiPrefs'),
    'Notifications':tr('notifications'), 'Appearance':tr('appearance')
  }

  return (
    <div style={{maxWidth:720,margin:'0 auto',display:'flex',gap:20}}>
      {/* Tabs */}
      <div style={{width:180,flexShrink:0,display:'flex',flexDirection:'column',gap:2}}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{display:'flex',alignItems:'center',padding:'10px 12px',borderRadius:12,border:'1px solid',fontSize:13,fontWeight:500,cursor:'pointer',transition:'all .15s',textAlign:'left',
              background:tab===t?'rgba(99,102,241,.1)':'transparent',
              borderColor:tab===t?'rgba(99,102,241,.25)':'transparent',
              color:tab===t?'#f8fafc':'#6b7280'}}>
            {tabKeys[t]}
          </button>
        ))}
        <div style={{height:1,background:'rgba(255,255,255,.07)',margin:'8px 0'}}/>
        <button onClick={logout}
          style={{padding:'10px 12px',borderRadius:12,border:'1px solid transparent',fontSize:13,fontWeight:500,cursor:'pointer',color:'#f87171',background:'none',textAlign:'left'}}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(244,63,94,.08)'}}
          onMouseLeave={e=>{e.currentTarget.style.background='none'}}>
          {tr('signOut')}
        </button>
      </div>

      {/* Panel */}
      <div style={{flex:1,background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:20,padding:24}}>

        {/* Profile */}
        {tab==='Profile'&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}}>
            <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:17,marginBottom:20}}>{tr('profile')}</div>
            <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24,padding:16,background:'rgba(99,102,241,.05)',border:'1px solid rgba(99,102,241,.12)',borderRadius:16}}>
              <div style={{width:56,height:56,borderRadius:18,background:'linear-gradient(135deg,#6366f1,#d946ef)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans',fontWeight:800,fontSize:20,color:'#fff'}}>{getInitials(name||'U')}</div>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:'#f8fafc',marginBottom:4}}>{user?.email}</div>
                <div style={{fontSize:11,background:'rgba(99,102,241,.12)',color:'#818cf8',border:'1px solid rgba(99,102,241,.25)',borderRadius:20,padding:'2px 10px',display:'inline-block'}}>Pro</div>
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:7}}>{tr('displayName')}</label>
              <input value={name} onChange={e=>setName(e.target.value)}
                style={{width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,padding:'11px 14px',color:'#f8fafc',fontSize:14,outline:'none',fontFamily:'DM Sans,sans-serif',transition:'border-color .2s'}}
                onFocus={e=>e.currentTarget.style.borderColor='rgba(99,102,241,.6)'}
                onBlur={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.1)'}/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:7}}>{tr('email')}</label>
              <input value={user?.email??''} disabled style={{width:'100%',background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)',borderRadius:12,padding:'11px 14px',color:'#4b5563',fontSize:14,fontFamily:'DM Sans,sans-serif',cursor:'not-allowed'}}/>
            </div>
          </motion.div>
        )}

        {/* AI Preferences */}
        {tab==='AI Preferences'&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}}>
            <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:17,marginBottom:20}}>{tr('aiPrefs')}</div>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:500,color:'#f8fafc',marginBottom:10}}>{tr('focusDuration')}</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {[15,20,25,30,45,60,90].map(m=>(
                  <button key={m} onClick={()=>setFocusDur(m)}
                    style={{padding:'8px 18px',borderRadius:20,border:'1px solid',fontSize:13,fontWeight:600,cursor:'pointer',transition:'all .2s',
                      background:focusDur===m?'linear-gradient(135deg,#6366f1,#06b6d4)':'rgba(255,255,255,.04)',
                      borderColor:focusDur===m?'transparent':'rgba(255,255,255,.1)',
                      color:focusDur===m?'#fff':'#6b7280'}}>{m}m</button>
                ))}
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 0',borderTop:'1px solid rgba(255,255,255,.07)'}}>
              <div>
                <div style={{fontSize:13,fontWeight:500,color:'#f8fafc',marginBottom:2}}>{tr('aiMemoryLabel')}</div>
                <div style={{fontSize:12,color:'#4b5563'}}>{tr('aiMemorySub')}</div>
              </div>
              <Toggle val={aiMemory} set={setAiMemory}/>
            </div>
            <div style={{background:'rgba(99,102,241,.05)',border:'1px solid rgba(99,102,241,.15)',borderRadius:14,padding:16,marginTop:4}}>
              <div style={{fontSize:12,fontWeight:600,color:'#818cf8',marginBottom:10}}>{tr('memoryContexts')}</div>
              {['Product strategy goals','Work style preferences','Focus patterns','Project contexts'].map((m,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#6b7280',padding:'4px 0',borderBottom:i<3?'1px solid rgba(255,255,255,.04)':'none'}}>
                  <span>{m}</span>
                  <span style={{color:'#818cf8',fontFamily:'JetBrains Mono,monospace'}}>{[3,7,12,5][i]}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Notifications — REAL browser notifications */}
        {tab==='Notifications'&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}}>
            <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:17,marginBottom:20}}>{tr('notifications')}</div>

            {/* Browser permission */}
            <div style={{padding:16,background:notifPerm==='granted'?'rgba(52,211,153,.08)':notifPerm==='denied'?'rgba(244,63,94,.08)':'rgba(99,102,241,.06)',border:`1px solid ${notifPerm==='granted'?'rgba(52,211,153,.25)':notifPerm==='denied'?'rgba(244,63,94,.2)':'rgba(99,102,241,.2)'}`,borderRadius:14,marginBottom:20}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                {notifPerm==='granted'?<Bell size={16} color="#34d399"/>:<BellOff size={16} color={notifPerm==='denied'?'#f87171':'#818cf8'}/>}
                <div style={{fontSize:13,fontWeight:600,color:'#f8fafc'}}>{tr('notifPermission')}</div>
              </div>
              <div style={{fontSize:12,color:'#6b7280',marginBottom:12}}>{tr('notifPermissionSub')}</div>
              {notifPerm==='granted'?(
                <div style={{display:'flex',gap:8}}>
                  <div style={{fontSize:12,color:'#34d399',fontWeight:600}}>{tr('notifGranted')}</div>
                  <button onClick={testNotif} style={{marginLeft:'auto',fontSize:11,background:'rgba(52,211,153,.12)',border:'1px solid rgba(52,211,153,.25)',borderRadius:8,padding:'4px 12px',color:'#34d399',cursor:'pointer'}}>Send test →</button>
                </div>
              ):notifPerm==='denied'?(
                <div style={{fontSize:12,color:'#f87171'}}>{tr('notifDenied')}</div>
              ):(
                <button onClick={requestNotifPermission}
                  style={{background:'linear-gradient(135deg,#6366f1,#06b6d4)',border:'none',borderRadius:10,padding:'9px 18px',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                  {tr('enableNotifications')}
                </button>
              )}
            </div>

            {[
              {label:tr('taskReminders'),    sub:tr('taskRemindersSub'),    val:notifTask,   set:setNotifTask},
              {label:tr('focusEnd'),         sub:tr('focusEndSub'),         val:notifFocus,  set:setNotifFocus},
              {label:tr('dailyDigest'),      sub:tr('dailyDigestSub'),      val:notifDigest, set:setNotifDigest},
              {label:tr('teamActivity'),     sub:tr('teamActivitySub'),     val:notifTeam,   set:setNotifTeam},
            ].map((n,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 0',borderBottom:i<3?'1px solid rgba(255,255,255,.06)':'none'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:500,color:notifPerm!=='granted'?'#4b5563':'#f8fafc',marginBottom:2}}>{n.label}</div>
                  <div style={{fontSize:12,color:'#4b5563'}}>{n.sub}</div>
                </div>
                <Toggle val={notifPerm==='granted'?n.val:false} set={notifPerm==='granted'?n.set:()=>{}}/>
              </div>
            ))}
          </motion.div>
        )}

        {/* Appearance */}
        {tab==='Appearance'&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}}>
            <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:17,marginBottom:20}}>{tr('appearance')}</div>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:13,fontWeight:500,color:'#f8fafc',marginBottom:12}}>{tr('theme')}</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                {([['dark',tr('dark')],['light',tr('light')],['dark',tr('system')]] as const).map(([t,label],i)=>(
                  <button key={label} onClick={()=>setTheme(i===1?'light':'dark')}
                    style={{border:((i===0&&theme==='dark')||(i===1&&theme==='light'))?'2px solid rgba(99,102,241,.6)':'1px solid rgba(255,255,255,.08)',borderRadius:14,overflow:'hidden',cursor:'pointer',background:'none'}}>
                    <div style={{height:48,background:i===1?'#f1f5f9':i===2?'linear-gradient(135deg,#07071a 50%,#f1f5f9 50%)':'#07071a'}}/>
                    <div style={{padding:'8px 12px',fontSize:12,fontWeight:600,color:((i===0&&theme==='dark')||(i===1&&theme==='light'))?'#818cf8':'#6b7280',textAlign:'center'}}>{label}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:13,fontWeight:500,color:'#f8fafc',marginBottom:12}}>{tr('accentColor')}</div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:12}}>
                {ACCENT_COLORS.map(c=>(
                  <button key={c} onClick={()=>setAccent(c)} title={c}
                    style={{width:34,height:34,borderRadius:'50%',background:c,border:accent===c?'3px solid #fff':'2px solid transparent',cursor:'pointer',boxShadow:accent===c?`0 0 14px ${c}80`:'none',transition:'all .2s'}}/>
                ))}
              </div>
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <div style={{width:36,height:36,borderRadius:12,background:`linear-gradient(135deg,${accent},#06b6d4)`}}/>
                <div style={{fontSize:13,color:'#6b7280'}}>Preview: <span style={{color:accent,fontWeight:600}}>{accent}</span></div>
              </div>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:500,color:'#f8fafc',marginBottom:12}}>{tr('sidebarWidth')}</div>
              <div style={{display:'flex',gap:8}}>
                {[tr('compact'),tr('default'),tr('wide')].map((w,i)=>(
                  <button key={w} style={{padding:'8px 18px',borderRadius:20,border:'1px solid',fontSize:13,fontWeight:600,cursor:'pointer',
                    background:i===1?'rgba(99,102,241,.1)':'rgba(255,255,255,.04)',
                    borderColor:i===1?'rgba(99,102,241,.35)':'rgba(255,255,255,.1)',
                    color:i===1?'#818cf8':'#6b7280'}}>{w}</button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Save */}
        <div style={{marginTop:24,paddingTop:20,borderTop:'1px solid rgba(255,255,255,.07)'}}>
          <button onClick={save} disabled={saving}
            style={{background:saved?'rgba(52,211,153,.12)':'linear-gradient(135deg,#6366f1,#06b6d4)',border:saved?'1px solid rgba(52,211,153,.3)':'none',borderRadius:12,padding:'11px 28px',color:saved?'#34d399':'#fff',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',gap:8,transition:'all .3s'}}>
            {saving?<Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/>:saved?<Check size={14}/>:null}
            {saved?tr('saved'):tr('saveChanges')}
          </button>
        </div>
      </div>
    </div>
  )
}
