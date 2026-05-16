'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '@/lib/store/useStore'
import { db } from '@/lib/firebase/config'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { getInitials } from '@/lib/utils'
import { Target, Clock, Flame, BarChart3, Brain, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getUserModel, getMemorySummary, getPatterns } from '@/lib/firebase/bis'
import { format, subDays } from 'date-fns'

const FV = { hidden:{opacity:0,y:14}, visible:(i:number)=>({opacity:1,y:0,transition:{delay:i*.07}}) }
const HM_COL = ['rgba(255,255,255,.04)','rgba(99,102,241,.2)','rgba(99,102,241,.4)','rgba(99,102,241,.65)','#6366f1']

export default function PublicProfilePage({ params }: { params: { uid: string } }) {
  const router      = useRouter()
  const { user: me }= useStore()
  const [profile,   setProfile]  = useState<any>(null)
  const [model,     setModel]    = useState<any>(null)
  const [memory,    setMemory]   = useState<any>(null)
  const [patterns,  setPatterns] = useState<any[]>([])
  const [sessions,  setSessions] = useState<any[]>([])
  const [tasks,     setTasks]    = useState<any[]>([])
  const [loading,   setLoading]  = useState(true)

  const uid = params.uid

  // Redirect to own profile
  useEffect(() => {
    if (me?.uid && me.uid === uid) { router.replace('/profile'); return }
  }, [me?.uid, uid])

  useEffect(() => {
    if (!uid) return
    setLoading(true)
    Promise.all([
      getDoc(doc(db, 'users', uid)),
      getUserModel(uid).catch(() => null),
      getMemorySummary(uid).catch(() => null),
      getPatterns(uid).catch(() => []),
      getDocs(query(collection(db,'focus_sessions'), where('userId','==',uid))).catch(() => null),
      getDocs(query(collection(db,'tasks'), where('userId','==',uid))).catch(() => null),
    ]).then(([userSnap, model, memory, patterns, sessSnap, taskSnap]) => {
      if (userSnap.exists()) setProfile({ uid, ...userSnap.data() })
      setModel(model)
      setMemory(memory)
      setPatterns(patterns || [])
      setSessions(sessSnap?.docs.map(d=>d.data()) || [])
      setTasks(taskSnap?.docs.map(d=>d.data()) || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [uid])

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300,color:'#4b5563',fontSize:14}}>
      Loading profile...
    </div>
  )

  if (!profile) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300,color:'#4b5563',fontSize:14}}>
      Profile not found.
    </div>
  )

  const doneTasks   = tasks.filter(t => t.status === 'done').length
  const totalFocusH = Math.round(sessions.filter(s=>s.completed).reduce((a,s)=>a+s.duration/3600,0)*10)/10
  const streak = (() => {
    let c=0; const t=new Date()
    for(let i=0;i<30;i++){
      const d=new Date(t); d.setDate(d.getDate()-i)
      if(sessions.some((s:any)=>s.date===d.toISOString().slice(0,10)&&s.completed))c++
      else if(i>0)break
    }
    return c
  })()

  const heatmap = Array.from({length:84},(_,i)=>{
    const d = subDays(new Date(), 83-i).toISOString().slice(0,10)
    const fc = sessions.filter((s:any)=>s.date===d&&s.completed).length
    const tc = tasks.filter((t:any)=>t.updatedAt&&format(new Date(t.updatedAt),'yyyy-MM-dd')===d&&t.status==='done').length
    return Math.min(fc+tc, 4)
  })

  const STATS = [
    {icon:Target,  label:'Tasks done', val:doneTasks,          color:'#818cf8'},
    {icon:Clock,   label:'Focus time', val:`${totalFocusH}h`,  color:'#22d3ee'},
    {icon:Flame,   label:'Streak',     val:streak>0?`${streak} 🔥`:'0', color:'#f59e0b'},
    {icon:BarChart3,label:'Completion',val:model?`${Math.round(model.completionRate*100)}%`:'—', color:'#34d399'},
  ]

  return (
    <div style={{maxWidth:900,margin:'0 auto',display:'flex',flexDirection:'column',gap:20}}>
      <button onClick={()=>router.back()}
        style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'none',color:'#6b7280',cursor:'pointer',fontSize:13,padding:0,width:'fit-content'}}>
        <ArrowLeft size={14}/> Back
      </button>

      {/* Profile header */}
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}
        style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.08)',borderRadius:24,overflow:'hidden'}}>
        <div style={{height:100,background:'linear-gradient(135deg,rgba(99,102,241,.25),rgba(6,182,212,.12))',position:'relative'}}>
          <div style={{position:'absolute',inset:0,background:'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%236366f1\' fill-opacity=\'0.05\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")'}}/>
        </div>
        <div style={{padding:'0 28px 28px'}}>
          <div style={{marginTop:-40,marginBottom:16}}>
            <div style={{width:80,height:80,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#06b6d4)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,sans-serif',fontWeight:800,fontSize:28,color:'#fff',border:'3px solid #07071a',boxShadow:'0 0 24px rgba(99,102,241,.4)'}}>
              {getInitials(profile.name||'U')}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:22,color:'#f8fafc'}}>{profile.name}</div>
                {streak>0&&<div style={{fontSize:11,background:'rgba(245,158,11,.12)',color:'#f59e0b',border:'1px solid rgba(245,158,11,.25)',borderRadius:20,padding:'2px 10px',fontWeight:600}}>{streak}d streak 🔥</div>}
              </div>
              {profile.company&&<div style={{fontSize:14,color:'#6b7280',marginBottom:3}}>🎓 {profile.company}</div>}
              {profile.bio&&<div style={{fontSize:14,color:'#94a3b8',lineHeight:1.6}}>{profile.bio}</div>}
              <div style={{fontSize:12,color:'#2d3748',marginTop:6}}>{profile.email}</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>
        {STATS.map((s,i)=>(
          <motion.div key={i} custom={i} initial="hidden" animate="visible" variants={FV}
            style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:18,padding:'16px 18px',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:-20,right:-20,width:70,height:70,borderRadius:'50%',background:s.color,filter:'blur(28px)',opacity:.1}}/>
            <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:8}}>
              <s.icon size={13} style={{color:s.color,opacity:.8}}/>
              <div style={{fontSize:10,fontWeight:700,color:'#2d3748',textTransform:'uppercase',letterSpacing:'.5px'}}>{s.label}</div>
            </div>
            <div style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,fontSize:26,color:s.color}}>{s.val}</div>
          </motion.div>
        ))}
      </div>

      {/* Activity heatmap */}
      <motion.div custom={4} initial="hidden" animate="visible" variants={FV}
        style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:20,padding:'20px 24px'}}>
        <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:14,color:'#f8fafc',marginBottom:14}}>Activity — last 12 weeks</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(12,1fr)',gap:2}}>
          {Array.from({length:12},(_,week)=>(
            <div key={week} style={{display:'flex',flexDirection:'column',gap:2}}>
              {heatmap.slice(week*7,week*7+7).map((val,d)=>(
                <div key={d} style={{width:'100%',aspectRatio:'1',borderRadius:2,background:HM_COL[val]}}/>
              ))}
            </div>
          ))}
        </div>
      </motion.div>

      {/* BIS profile (public) */}
      {model && model.confidence !== 'low' && (
        <motion.div custom={5} initial="hidden" animate="visible" variants={FV}
          style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:20,padding:'20px 24px'}}>
          <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:14,color:'#f8fafc',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
            <Brain size={16} color="#818cf8"/> Work Style
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            {[
              {l:'Pattern',    v:model.workPattern},
              {l:'Peak hours', v:model.productiveHours[0]||'Detecting...'},
              {l:'Avg focus',  v:`${model.avgFocusMinutes}min`},
            ].map((item,i)=>(
              <div key={i} style={{background:'rgba(255,255,255,.03)',borderRadius:12,padding:'10px 14px'}}>
                <div style={{fontSize:10,color:'#2d3748',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:3}}>{item.l}</div>
                <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:600,color:'#94a3b8'}}>{item.v}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
