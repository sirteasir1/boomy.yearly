'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTasks } from '@/lib/hooks/useTasks'
import { useNotes } from '@/lib/hooks/useNotes'
import { useStore } from '@/lib/store/useStore'
import { useBIS   } from '@/lib/hooks/useBIS'
import { useLang  } from '@/lib/i18n/useLang'
import { getFocusSessions } from '@/lib/firebase/firestore'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subDays } from 'date-fns'
import { Brain, Target, Zap, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react'

const TT = {
  contentStyle:{ background:'#07071a',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,color:'#f8fafc'},
  cursor:{fill:'rgba(255,255,255,.03)'},
}
const HM_COL = ['rgba(255,255,255,.04)','rgba(99,102,241,.2)','rgba(99,102,241,.4)','rgba(99,102,241,.65)','#6366f1']
const SEV_COLOR = { info:'#818cf8', warning:'#f59e0b', critical:'#f43f5e', positive:'#34d399' }
const SEV_BG    = { info:'rgba(99,102,241,.08)', warning:'rgba(245,158,11,.08)', critical:'rgba(244,63,94,.08)', positive:'rgba(52,211,153,.08)' }
const SEV_ICON  = { info:Brain, warning:AlertTriangle, critical:AlertTriangle, positive:TrendingUp }
const FV = { hidden:{opacity:0,y:12}, visible:(i:number)=>({opacity:1,y:0,transition:{delay:i*.08}}) }

export default function AnalyticsPage() {
  const { tasks }  = useTasks()
  const { notes }  = useNotes()
  const { user }   = useStore()
  const tr         = useLang()
  const { model, patterns, memory, loading, analyze, updateMemory, hasEnoughData } = useBIS()

  // Trigger analysis when analytics page opens
  useEffect(() => { analyze() }, [])
  const [sessions,   setSessions]   = useState<any[]>([])
  const [weeklyData, setWeeklyData] = useState(
    Array.from({length:7},(_,i)=>({day:format(subDays(new Date(),6-i),'EEE'),focus:0,tasks:0}))
  )
  const [tab, setTab] = useState<'overview'|'patterns'|'memory'>('overview')

  useEffect(()=>{
    if(!user?.uid) return
    getFocusSessions(user.uid).then(s=>{
      setSessions(s)
      setWeeklyData(Array.from({length:7},(_,i)=>{
        const d  = subDays(new Date(),6-i)
        const ds = format(d,'yyyy-MM-dd')
        return {
          day:    format(d,'EEE'),
          focus:  Math.round(s.filter(x=>x.date===ds&&x.completed).reduce((a,x)=>a+x.duration/3600,0)*10)/10,
          tasks:  tasks.filter(t=>t.status==='done'&&t.updatedAt&&format(new Date(t.updatedAt),'yyyy-MM-dd')===ds).length,
        }
      }))
    }).catch(()=>{})
  },[user?.uid,tasks.length])

  const done        = tasks.filter(t=>t.status==='done').length
  const totalFocusH = Math.round(sessions.filter(s=>s.completed).reduce((a,s)=>a+s.duration/3600,0)*10)/10
  const streak      = (()=>{let c=0;const t=new Date();for(let i=0;i<30;i++){const d=subDays(t,i).toISOString().slice(0,10);if(sessions.some(s=>s.date===d&&s.completed))c++;else if(i>0)break;}return c})()
  const pct         = tasks.length>0?Math.round(done/tasks.length*100):0

  const HM = Array.from({length:91},(_,i)=>{
    const d=subDays(new Date(),90-i).toISOString().slice(0,10)
    return Math.min(sessions.filter(s=>s.date===d&&s.completed).length,4)
  })

  const STATS=[
    {label:tr('tasksDone'),  val:done||0,                                     color:'#818cf8'},
    {label:tr('focusTime'),  val:totalFocusH>0?`${totalFocusH}h`:'0h',        color:'#22d3ee'},
    {label:tr('streak'),     val:`${streak}${streak>0?' 🔥':''}`,              color:'#f59e0b'},
    {label:'Completion',     val:`${pct}%`,                                    color:'#34d399'},
  ]

  return (
    <div style={{maxWidth:1000,margin:'0 auto',display:'flex',flexDirection:'column',gap:16}}>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {STATS.map((s,i)=>(
          <motion.div key={i} custom={i} initial="hidden" animate="visible" variants={FV}
            style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:18,padding:'16px 18px',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:-20,right:-20,width:70,height:70,borderRadius:'50%',background:s.color,filter:'blur(28px)',opacity:.1}}/>
            <div style={{fontSize:10,fontWeight:700,color:'#2d3748',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:8}}>{s.label}</div>
            <div style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,fontSize:28,color:s.color}}>{s.val}</div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:4,width:'fit-content'}}>
        {(['overview','patterns','memory'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{padding:'7px 18px',borderRadius:10,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,transition:'all .2s',textTransform:'capitalize',
              background:tab===t?'rgba(99,102,241,.15)':'transparent',
              color:tab===t?'#818cf8':'#4b5563',
              boxShadow:tab===t?'inset 0 0 0 1px rgba(99,102,241,.3)':'none'}}>
            {t}
          </button>
        ))}
      </div>

      {tab==='overview'&&(
        <>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <motion.div custom={4} initial="hidden" animate="visible" variants={FV}
              style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:20,padding:'18px 20px'}}>
              <div style={{fontWeight:600,fontSize:13,marginBottom:2}}>{tr('focusHours')}</div>
              <div style={{fontSize:11,color:'#4b5563',marginBottom:14}}>{tr('hoursPerDay')}</div>
              {weeklyData.some(d=>d.focus>0)?(
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={weeklyData}>
                    <defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                    <XAxis dataKey="day" tick={{fill:'#2d3748',fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis hide/><Tooltip {...TT}/>
                    <Area type="monotone" dataKey="focus" stroke="#6366f1" strokeWidth={2} fill="url(#fg)" dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              ):(
                <div style={{height:140,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#2d3748'}}>Start focus sessions to see data</div>
              )}
            </motion.div>
            <motion.div custom={5} initial="hidden" animate="visible" variants={FV}
              style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:20,padding:'18px 20px'}}>
              <div style={{fontWeight:600,fontSize:13,marginBottom:2}}>{tr('tasksCompleted')}</div>
              <div style={{fontSize:11,color:'#4b5563',marginBottom:14}}>{tr('perDayWeek')}</div>
              {weeklyData.some(d=>d.tasks>0)?(
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={weeklyData} barSize={22}>
                    <XAxis dataKey="day" tick={{fill:'#2d3748',fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis hide/><Tooltip {...TT}/>
                    <Bar dataKey="tasks" fill="url(#bg)" radius={[4,4,0,0]}/>
                    <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#06b6d4"/><stop offset="100%" stopColor="rgba(6,182,212,.3)"/></linearGradient></defs>
                  </BarChart>
                </ResponsiveContainer>
              ):(
                <div style={{height:140,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#2d3748'}}>Complete tasks to see data</div>
              )}
            </motion.div>
          </div>
          <motion.div custom={6} initial="hidden" animate="visible" variants={FV}
            style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:20,padding:'18px 20px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{tr('activityHeatmap')}</div>
                <div style={{fontSize:11,color:'#4b5563',marginTop:2}}>{tr('last13weeks')}</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:5,fontSize:10,color:'#2d3748'}}>
                <span>{tr('less')}</span>
                {[0,1,2,3,4].map(v=><div key={v} style={{width:11,height:11,borderRadius:2,background:HM_COL[v]}}/>)}
                <span>{tr('more')}</span>
              </div>
            </div>
            <div style={{display:'flex',gap:2,flexWrap:'wrap'}}>
              {HM.map((v,i)=>(
                <div key={i} style={{width:13,height:13,borderRadius:2,background:HM_COL[v],cursor:'default',transition:'transform .15s'}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.transform='scale(1.4)'}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.transform='scale(1)'}}/>
              ))}
            </div>
            {HM.every(v=>v===0)&&<div style={{textAlign:'center',marginTop:10,fontSize:12,color:'#2d3748'}}>Your focus activity will appear here</div>}
          </motion.div>
        </>
      )}

      {tab==='patterns'&&(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontWeight:600,fontSize:15,color:'#f8fafc'}}>Behavioral Patterns</div>
              <div style={{fontSize:12,color:'#4b5563',marginTop:3}}>{model?.dataPoints??0} data points · confidence: {model?.confidence??'low'}</div>
            </div>
            <button onClick={()=>{analyze();updateMemory()}} disabled={loading}
              style={{display:'flex',alignItems:'center',gap:6,background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.25)',borderRadius:12,padding:'8px 16px',color:'#818cf8',fontSize:12,fontWeight:600,cursor:'pointer'}}>
              <RefreshCw size={13} style={{animation:loading?'spin 1s linear infinite':'none'}}/>{loading?'Analyzing...':'Re-analyze'}
            </button>
          </div>

          {!hasEnoughData&&(
            <div style={{background:'rgba(99,102,241,.06)',border:'1px solid rgba(99,102,241,.15)',borderRadius:16,padding:20,textAlign:'center'}}>
              <Brain size={32} color="#818cf8" style={{margin:'0 auto 10px'}}/>
              <div style={{fontSize:14,fontWeight:600,color:'#f8fafc',marginBottom:6}}>Building your behavioral profile</div>
              <div style={{fontSize:13,color:'#6b7280'}}>Complete {Math.max(0,3-(model?.dataPoints??0))} more tasks or focus sessions to unlock AI pattern detection.</div>
              <div style={{marginTop:14,height:6,background:'rgba(255,255,255,.06)',borderRadius:3,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${Math.min((model?.dataPoints??0)/10*100,100)}%`,background:'linear-gradient(90deg,#6366f1,#06b6d4)',transition:'width 1s ease'}}/>
              </div>
            </div>
          )}

          {patterns.map((p,i)=>{
            const Icon = SEV_ICON[p.severity]
            return (
              <motion.div key={p.id} custom={i} initial="hidden" animate="visible" variants={FV}
                style={{background:SEV_BG[p.severity],border:`1px solid ${SEV_COLOR[p.severity]}30`,borderRadius:18,padding:'18px 20px'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                  <div style={{width:36,height:36,borderRadius:12,background:`${SEV_COLOR[p.severity]}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <Icon size={17} style={{color:SEV_COLOR[p.severity]}}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
                      <div style={{fontSize:13,fontWeight:600,color:'#f8fafc'}}>{p.title}</div>
                      <span style={{fontSize:10,background:`${SEV_COLOR[p.severity]}20`,color:SEV_COLOR[p.severity],border:`1px solid ${SEV_COLOR[p.severity]}40`,borderRadius:20,padding:'2px 8px',fontWeight:700}}>{p.severity}</span>
                      <span style={{fontSize:10,color:'#2d3748',marginLeft:'auto'}}>{Math.round(p.confidence*100)}% confidence</span>
                    </div>
                    <div style={{fontSize:13,color:'#94a3b8',marginBottom:8,lineHeight:1.6}}>{p.description}</div>
                    <div style={{fontSize:12,color:SEV_COLOR[p.severity],display:'flex',alignItems:'center',gap:6}}>
                      <Zap size={11}/>{p.actionSuggestion}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}

          {hasEnoughData&&patterns.length===0&&(
            <div style={{textAlign:'center',padding:'40px 20px',color:'#4b5563',fontSize:13}}>
              No patterns detected yet. Keep using the app and check back later.
            </div>
          )}
        </div>
      )}

      {tab==='memory'&&(
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {model&&(
            <div style={{background:'linear-gradient(135deg,rgba(99,102,241,.08),rgba(6,182,212,.04))',border:'1px solid rgba(99,102,241,.18)',borderRadius:20,padding:24}}>
              <div style={{fontWeight:600,fontSize:14,color:'#f8fafc',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
                <Brain size={16} color="#818cf8"/> Behavioral Model
                <span style={{marginLeft:'auto',fontSize:11,color:'#818cf8',background:'rgba(99,102,241,.12)',borderRadius:20,padding:'2px 10px'}}>{model.confidence} confidence</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
                {[
                  {l:'Work pattern',    v:model.workPattern},
                  {l:'Peak hours',      v:model.productiveHours.join(', ')||'Detecting...'},
                  {l:'Avg focus',       v:`${model.avgFocusMinutes}min`},
                  {l:'Completion rate', v:`${Math.round(model.completionRate*100)}%`},
                  {l:'Burnout risk',    v:model.burnoutRisk},
                  {l:'Consistency',     v:`${model.consistencyScore}%`},
                  {l:'Postpone avg',    v:`${model.avgPostponeCount}×`},
                  {l:'Data points',     v:model.dataPoints},
                ].map((item,i)=>(
                  <div key={i} style={{background:'rgba(255,255,255,.04)',borderRadius:12,padding:'10px 14px'}}>
                    <div style={{fontSize:10,color:'#2d3748',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>{item.l}</div>
                    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:15,fontWeight:600,color:'#94a3b8'}}>{item.v}</div>
                  </div>
                ))}
              </div>
              {model.procrastinationTriggers.length>0&&(
                <div style={{marginTop:14,padding:'12px 16px',background:'rgba(244,63,94,.06)',border:'1px solid rgba(244,63,94,.15)',borderRadius:14}}>
                  <div style={{fontSize:11,fontWeight:600,color:'#f87171',marginBottom:6}}>⚠ Procrastination triggers</div>
                  <div style={{fontSize:13,color:'#94a3b8'}}>{model.procrastinationTriggers.join(' · ')}</div>
                </div>
              )}
            </div>
          )}

          {memory&&(
            <div style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:20,padding:24}}>
              <div style={{fontWeight:600,fontSize:14,color:'#f8fafc',marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
                <Target size={16} color="#22d3ee"/> AI Memory Summary
                <span style={{marginLeft:'auto',fontSize:11,color:'#4b5563'}}>Updated {new Date(memory.lastUpdated).toLocaleDateString()}</span>
              </div>
              <div style={{fontSize:14,color:'#94a3b8',lineHeight:1.75,marginBottom:16,padding:'14px 16px',background:'rgba(99,102,241,.05)',border:'1px solid rgba(99,102,241,.1)',borderRadius:14}}>
                {memory.summary}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:'#818cf8',marginBottom:10}}>Key Insights</div>
                {memory.insights.map((ins,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:8,fontSize:13,color:'#6b7280'}}>
                    <span style={{color:'#6366f1',marginTop:1}}>→</span>{ins}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!model&&!memory&&(
            <div style={{textAlign:'center',padding:'60px 20px'}}>
              <Brain size={40} color="#2d3748" style={{margin:'0 auto 16px'}}/>
              <div style={{fontSize:14,color:'#4b5563',marginBottom:8}}>Memory system initializing</div>
              <div style={{fontSize:12,color:'#2d3748'}}>Use Boomly for a few days to build your behavioral profile.</div>
            </div>
          )}

          <button onClick={()=>{analyze().then(()=>updateMemory())}}
            style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.25)',borderRadius:14,padding:'12px',color:'#818cf8',fontSize:13,fontWeight:600,cursor:'pointer'}}>
            <RefreshCw size={14}/>Update memory from latest activity
          </button>
        </div>
      )}
    </div>
  )
}
