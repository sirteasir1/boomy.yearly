'use client'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useStore }  from '@/lib/store/useStore'
import { useTasks }  from '@/lib/hooks/useTasks'
import { useNotes }  from '@/lib/hooks/useNotes'
import { useBIS   }  from '@/lib/hooks/useBIS'
import { useLang  }  from '@/lib/i18n/useLang'
import { getFocusSessions, updateUser } from '@/lib/firebase/firestore'
import { getInitials } from '@/lib/utils'
import { Camera, Edit3, Check, Flame, Target, Clock, Zap, BarChart3, Brain } from 'lucide-react'
import { subDays, format } from 'date-fns'

const ACCENT_COLS = ['#6366f1','#06b6d4','#10b981','#f43f5e','#f59e0b','#d946ef','#8b5cf6','#0ea5e9']

const FV = { hidden:{opacity:0,y:14}, visible:(i:number)=>({opacity:1,y:0,transition:{delay:i*.03}}) }

export default function ProfilePage() {
  const { user, setUser } = useStore()
  const { tasks } = useTasks()
  const { notes } = useNotes()
  const { model, patterns, memory } = useBIS()
  const tr = useLang()

  const [sessions, setSessions]   = useState<any[]>([])
  const [editing,  setEditing]    = useState(false)
  const [saving,   setSaving]     = useState(false)
  const [saved,    setSaved]      = useState(false)

  // Editable fields
  const [name,     setName]       = useState(user?.name ?? '')
  const [bio,      setBio]        = useState((user as any)?.bio ?? '')
  const [company,  setCompany]    = useState((user as any)?.company ?? '')
  const [website,  setWebsite]    = useState((user as any)?.website ?? '')
  const [accent,   setAccent]     = useState('#6366f1')

  useEffect(() => {
    if (!user?.uid) return
    getFocusSessions(user.uid).then(setSessions).catch(()=>{})
    const saved = localStorage.getItem('boomly-accent')
    if (saved) setAccent(saved)
  }, [user?.uid])

  // Stats
  const doneTasks     = tasks.filter(t => t.status === 'done').length
  const totalTasks    = tasks.length
  const pct           = totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) : 0
  const totalFocusH   = Math.round(sessions.filter(s=>s.completed).reduce((a,s)=>a+s.duration/3600,0)*10)/10

  const streak = (() => {
    let c = 0; const t = new Date()
    for (let i = 0; i < 30; i++) {
      const d = new Date(t); d.setDate(d.getDate()-i)
      if (sessions.some(s=>s.date===d.toISOString().slice(0,10)&&s.completed)) c++
      else if (i > 0) break
    }
    return c
  })()

  // 12-week heatmap
  const heatmap = Array.from({length:84},(_,i)=>{
    const d = subDays(new Date(), 83-i).toISOString().slice(0,10)
    const focusCount = sessions.filter(s=>s.date===d&&s.completed).length
    const taskCount  = tasks.filter(t=>t.updatedAt&&format(new Date(t.updatedAt),'yyyy-MM-dd')===d&&t.status==='done').length
    const val = Math.min(focusCount + taskCount, 4)
    return { d, val }
  })
  const HM_COL = ['rgba(255,255,255,.04)','rgba(99,102,241,.2)','rgba(99,102,241,.4)','rgba(99,102,241,.65)','#6366f1']

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      const updated = { ...user, name, bio, company, website } as any
      await updateUser(user.uid, updated)
      setUser(updated)
      localStorage.setItem('boomly-accent', accent)
      document.documentElement.style.setProperty('--v', accent)
      setSaved(true); setEditing(false)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const STAT_CARDS = [
    { icon:Target,   label:'Tasks done',    val:doneTasks,                     sub:`${pct}% rate`,      color:'#818cf8' },
    { icon:Clock,    label:'Focus time',    val:`${totalFocusH}h`,             sub:'total deep work',   color:'#22d3ee' },
    { icon:Flame,    label:'Streak',        val:streak>0?`${streak} 🔥`:'0',   sub:'days active',       color:'#f59e0b' },
    { icon:BarChart3,label:'Notes',         val:notes.length,                  sub:'in second brain',   color:'#34d399' },
    { icon:Brain,    label:'BIS score',     val:model?`${Math.round(model.completionRate*100)}%`:'—', sub:'completion rate', color:'#d946ef' },
    { icon:Zap,      label:'Consistency',   val:model?`${model.consistencyScore}%`:'—', sub:'14-day avg', color:'#06b6d4' },
  ]

  return (
    <div style={{maxWidth:900,margin:'0 auto',display:'flex',flexDirection:'column',gap:20}}>

      {/* Profile header card */}
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}
        style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.08)',borderRadius:24,overflow:'hidden'}}>

        {/* Cover / banner */}
        <div style={{height:120,background:`linear-gradient(135deg,${accent}30,rgba(6,182,212,.15))`,position:'relative'}}>
          <div style={{position:'absolute',inset:0,background:'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%236366f1\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}}/>
        </div>

        <div style={{padding:'0 28px 28px'}}>
          <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginTop:-40,marginBottom:20}}>
            {/* Avatar */}
            <div style={{position:'relative'}}>
              <div style={{width:80,height:80,borderRadius:'50%',background:`linear-gradient(135deg,${accent},#06b6d4)`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,sans-serif',fontWeight:800,fontSize:28,color:'#fff',border:'3px solid #07071a',boxShadow:`0 0 24px ${accent}60`}}>
                {getInitials(name||'U')}
              </div>
            </div>
            {/* Edit button */}
            <div style={{display:'flex',gap:8}}>
              {editing ? (
                <>
                  <button onClick={()=>setEditing(false)}
                    style={{padding:'8px 18px',borderRadius:12,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'#6b7280',fontSize:13,cursor:'pointer'}}>
                    Cancel
                  </button>
                  <button onClick={saveProfile} disabled={saving}
                    style={{padding:'8px 20px',borderRadius:12,background:saved?'rgba(52,211,153,.12)':'linear-gradient(135deg,#6366f1,#06b6d4)',border:saved?'1px solid rgba(52,211,153,.3)':'none',color:saved?'#34d399':'#fff',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                    {saved?<><Check size={14}/>Saved</>:<>Save profile</>}
                  </button>
                </>
              ):(
                <button onClick={()=>setEditing(true)}
                  style={{padding:'8px 20px',borderRadius:12,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'#94a3b8',fontSize:13,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                  <Edit3 size={13}/>Edit profile
                </button>
              )}
            </div>
          </div>

          {editing ? (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
              {[
                {label:'Display name', val:name,    set:setName,    ph:'Your name'},
                {label:'School / University',      val:company, set:setCompany, ph:'Your school or university'},
                {label:'Bio',          val:bio,     set:setBio,     ph:'What you build...',  wide:true},
                {label:'Website',      val:website, set:setWebsite, ph:'https://...'},
              ].map((f,i)=>(
                <div key={i} style={{gridColumn:(f as any).wide?'span 2':'span 1'}}>
                  <label style={{display:'block',fontSize:11,color:'#4b5563',marginBottom:6}}>{f.label}</label>
                  <input value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
                    style={{width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,padding:'10px 14px',color:'#f8fafc',fontSize:13,outline:'none',fontFamily:'DM Sans,sans-serif',transition:'border-color .2s',boxSizing:'border-box'}}
                    onFocus={e=>e.currentTarget.style.borderColor='rgba(99,102,241,.5)'}
                    onBlur={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.1)'}/>
                </div>
              ))}
              <div style={{gridColumn:'span 2'}}>
                <label style={{display:'block',fontSize:11,color:'#4b5563',marginBottom:8}}>Accent color</label>
                <div style={{display:'flex',gap:8}}>
                  {ACCENT_COLS.map(c=>(
                    <button key={c} onClick={()=>setAccent(c)}
                      style={{width:28,height:28,borderRadius:'50%',background:c,border:accent===c?'3px solid #fff':'2px solid transparent',cursor:'pointer',boxShadow:accent===c?`0 0 12px ${c}80`:'none',transition:'all .2s'}}/>
                  ))}
                </div>
              </div>
            </div>
          ):(
            <div>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:6}}>
                <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:22,color:'#f8fafc'}}>{name||'Your Name'}</div>
                {streak>0&&<div style={{fontSize:12,background:'rgba(245,158,11,.12)',color:'#f59e0b',border:'1px solid rgba(245,158,11,.25)',borderRadius:20,padding:'3px 10px',fontWeight:600}}>{streak} day streak 🔥</div>}
                {model?.confidence==='high'&&<div style={{fontSize:11,background:'rgba(99,102,241,.12)',color:'#818cf8',border:'1px solid rgba(99,102,241,.25)',borderRadius:20,padding:'3px 10px',fontWeight:600}}>BIS Active</div>}
              </div>
              {company&&<div style={{fontSize:14,color:'#6b7280',marginBottom:4}}>🎓 {company}</div>}
              {bio&&<div style={{fontSize:14,color:'#94a3b8',marginBottom:4,lineHeight:1.6}}>{bio}</div>}
              {website&&<a href={website} target="_blank" rel="noreferrer" style={{fontSize:13,color:'#818cf8',textDecoration:'none'}}>🔗 {website}</a>}
              <div style={{fontSize:12,color:'#4b5563',marginTop:8}}>{user?.email}</div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        {STAT_CARDS.map((s,i)=>(
          <motion.div key={i} custom={i} initial="hidden" animate="visible" variants={FV}
            style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:18,padding:'16px 18px',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:-20,right:-20,width:70,height:70,borderRadius:'50%',background:s.color,filter:'blur(28px)',opacity:.1}}/>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <s.icon size={14} style={{color:s.color,opacity:.8}}/>
              <div style={{fontSize:10,fontWeight:700,color:'#2d3748',textTransform:'uppercase',letterSpacing:'.6px'}}>{s.label}</div>
            </div>
            <div style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,fontSize:28,color:s.color,lineHeight:1}}>{s.val}</div>
            <div style={{fontSize:11,color:'#4b5563',marginTop:4}}>{s.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Activity heatmap */}
      <motion.div custom={6} initial="hidden" animate="visible" variants={FV}
        style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:20,padding:'20px 24px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div>
            <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:14,color:'#f8fafc'}}>Activity</div>
            <div style={{fontSize:11,color:'#4b5563',marginTop:2}}>Tasks completed + focus sessions · last 12 weeks</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:10,color:'#2d3748'}}>
            Less {[0,1,2,3,4].map(v=><div key={v} style={{width:11,height:11,borderRadius:2,background:HM_COL[v]}}/>)} More
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(12,1fr)',gap:2}}>
          {Array.from({length:12},(_,week)=>(
            <div key={week} style={{display:'flex',flexDirection:'column',gap:2}}>
              {heatmap.slice(week*7,week*7+7).map((item,d)=>(
                <div key={d} title={`${item.d}: ${item.val} activities`}
                  style={{width:'100%',aspectRatio:'1',borderRadius:2,background:HM_COL[item.val],transition:'transform .15s',cursor:'default'}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.transform='scale(1.4)'}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.transform='scale(1)'}}/>
              ))}
            </div>
          ))}
        </div>
        {heatmap.every(h=>h.val===0)&&(
          <div style={{textAlign:'center',marginTop:10,fontSize:12,color:'#2d3748'}}>Complete tasks and focus sessions to fill your activity map</div>
        )}
      </motion.div>

      {/* BIS insights + behavioral patterns */}
      {model && model.confidence !== 'low' && (
        <motion.div custom={7} initial="hidden" animate="visible" variants={FV}
          style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:20,padding:'20px 24px'}}>
          <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:14,color:'#f8fafc',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
            <Brain size={16} color="#818cf8"/> Behavioral Profile
            <span style={{marginLeft:'auto',fontSize:11,color:'#818cf8',background:'rgba(99,102,241,.1)',borderRadius:20,padding:'2px 10px'}}>{model.confidence} confidence</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
            {[
              {l:'Work style',  v:model.workPattern,                                    c:'#818cf8'},
              {l:'Peak hours',  v:model.productiveHours[0]||'Detecting...',             c:'#22d3ee'},
              {l:'Focus avg',   v:`${model.avgFocusMinutes}min`,                        c:'#34d399'},
              {l:'Estimation',  v:model.avgActualVsEstimate>1?`+${Math.round((model.avgActualVsEstimate-1)*100)}% over`:'Accurate', c:'#f59e0b'},
              {l:'Burnout risk',v:model.burnoutRisk,                                    c:model.burnoutRisk==='high'?'#f43f5e':model.burnoutRisk==='medium'?'#f59e0b':'#34d399'},
              {l:'Data points', v:model.dataPoints,                                     c:'#6b7280'},
            ].map((item,i)=>(
              <div key={i} style={{background:'rgba(255,255,255,.03)',borderRadius:12,padding:'10px 14px'}}>
                <div style={{fontSize:10,color:'#2d3748',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:3}}>{item.l}</div>
                <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:600,color:item.c}}>{item.v}</div>
              </div>
            ))}
          </div>
          {model.procrastinationTriggers.length>0&&(
            <div style={{padding:'12px 14px',background:'rgba(244,63,94,.05)',border:'1px solid rgba(244,63,94,.12)',borderRadius:12,fontSize:12,color:'#94a3b8'}}>
              <strong style={{color:'#f87171'}}>Procrastination triggers: </strong>
              {model.procrastinationTriggers.join(' · ')}
            </div>
          )}
        </motion.div>
      )}

      {/* Memory summary */}
      {memory?.summary && (
        <motion.div custom={8} initial="hidden" animate="visible" variants={FV}
          style={{background:'linear-gradient(135deg,rgba(99,102,241,.06),rgba(6,182,212,.03))',border:'1px solid rgba(99,102,241,.15)',borderRadius:20,padding:'20px 24px'}}>
          <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:14,color:'#f8fafc',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
            ✦ AI Memory Summary
          </div>
          <div style={{fontSize:14,color:'#94a3b8',lineHeight:1.75,fontStyle:'italic'}}>"{memory.summary}"</div>
        </motion.div>
      )}
    </div>
  )
}
