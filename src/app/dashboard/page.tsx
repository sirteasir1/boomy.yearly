'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore  } from '@/lib/store/useStore'
import { useTasks  } from '@/lib/hooks/useTasks'
import { useNotes  } from '@/lib/hooks/useNotes'
import { getFocusSessions } from '@/lib/firebase/firestore'
import { ArrowRight, Plus, Sparkles, CheckCircle2, Clock, Flame, Target, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { useLang } from '@/lib/i18n/useLang'
import { cn, PRIORITY_STYLES } from '@/lib/utils'
import Link from 'next/link'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const EMPTY_WEEKLY = [
  { day:'Mon', focus:0, tasks:0 },
  { day:'Tue', focus:0, tasks:0 },
  { day:'Wed', focus:0, tasks:0 },
  { day:'Thu', focus:0, tasks:0 },
  { day:'Fri', focus:0, tasks:0 },
  { day:'Sat', focus:0, tasks:0 },
  { day:'Sun', focus:0, tasks:0 },
]

const TT_STYLE = {
  contentStyle: { background:'#07071a', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, color:'#f8fafc', fontSize:12 },
  cursor: { fill:'rgba(255,255,255,.03)' },
}

const FV = {
  hidden:  { opacity:0, y:14 },
  visible: (i:number) => ({ opacity:1, y:0, transition:{ delay:i*.07, duration:.35 } }),
}

export default function DashboardPage() {
  const tr = useLang()
  const { user } = useStore()
  const { tasks } = useTasks()
  const { notes } = useNotes()
  const [focusMins,    setFocusMins]    = useState(0)
  const [aiInsight,    setAiInsight]    = useState('')
  const [insightLoading, setInsightLoading] = useState(false)
  const [chartData,    setChartData]    = useState(EMPTY_WEEKLY)

  // Real stats
  const totalTasks = tasks.length
  const doneTasks  = tasks.filter(t => t.status === 'done').length
  const todayTasks = tasks.filter(t => ['Today', format(new Date(),'MMM d')].includes(t.due ?? ''))
  const highPri    = tasks.filter(t => t.priority === 'high' && t.status !== 'done')
  const pct        = totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) : 0

  // Load focus sessions from Firebase
  useEffect(() => {
    if (!user?.uid) return
    getFocusSessions(user.uid).then(sessions => {
      const total = sessions.reduce((acc, s) => acc + (s.completed ? Math.round(s.duration/60) : 0), 0)
      setFocusMins(total)

      // Build chart from real sessions (last 7 days)
      const today = new Date()
      const days = Array.from({ length:7 }, (_, i) => {
        const d = new Date(today); d.setDate(d.getDate() - (6-i))
        const dayStr = format(d, 'EEE').slice(0,3)
        const dateStr = format(d, 'yyyy-MM-dd')
        const daySessions = sessions.filter(s => s.date === dateStr)
        const focusH = daySessions.reduce((a,s)=>a+s.duration/3600, 0)
        return { day: dayStr, focus: Math.round(focusH*10)/10, tasks: 0 }
      })
      // Merge task counts
      setChartData(days)
    }).catch(() => {})
  }, [user?.uid])

  // AI insight — only fetch once per session
  useEffect(() => {
    if (!user) return
    const cached = sessionStorage.getItem('boomly-insight-v2')
    if (cached) { setAiInsight(cached); return }
    if (totalTasks === 0 && doneTasks === 0) {
      setAiInsight("Welcome to Boomly! Start by adding your first task, then let the AI planner build your perfect day. Your focus insights will appear here as you work.")
      return
    }
    setInsightLoading(true)
    fetch('/api/ai/insight', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ tasksCount:totalTasks, doneCount:doneTasks, userName:user.name, hour:new Date().getHours() }),
    }).then(r=>r.json()).then(d => {
      setAiInsight(d.insight || '')
      sessionStorage.setItem('boomly-insight-v2', d.insight || '')
    }).catch(() => {
      setAiInsight("You're all set up! Add your tasks and start a focus session to begin tracking your productivity.")
    }).finally(() => setInsightLoading(false))
  }, [totalTasks])

  const hour = new Date().getHours()
  const greeting = hour<12 ? tr('goodMorning') : hour<17 ? tr('goodAfternoon') : tr('goodEvening')

  const STATS = [
    { label:tr('tasksDone'),   value: doneTasks,                          color:'#818cf8', icon: CheckCircle2, sub: totalTasks > 0 ? `${pct}% of ${totalTasks}` : 'No tasks yet'      },
    { label:tr('focusTime'),   value: focusMins > 0 ? `${Math.round(focusMins/60*10)/10}h` : '0h', color:'#22d3ee', icon: Clock,        sub: focusMins > 0 ? `${focusMins}m total` : 'Start a session' },
    { label:tr('streak'),       value: '0 🔥',                              color:'#f59e0b', icon: Flame,        sub: 'Start your streak'                                                },
    { label:tr('notesLabel'),        value: notes.length,                        color:'#34d399', icon: FileText,     sub: notes.length > 0 ? `${notes.length} notes` : 'Create a note'     },
  ]

  return (
    <div className="max-w-5xl mx-auto" style={{ display:'flex', flexDirection:'column', gap:18 }}>

      {/* Greeting */}
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
        <div style={{ fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:24, color:'#f8fafc', marginBottom:4 }}>
          {greeting}, <span style={{ background:'linear-gradient(90deg,#818cf8,#22d3ee)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{user?.name?.split(' ')[0]} ✦</span>
        </div>
        <div style={{ fontSize:13, color:'#4b5563' }}>{format(new Date(),'EEEE, MMMM d, yyyy')}</div>
      </motion.div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {STATS.map((s,i) => (
          <motion.div key={i} custom={i} initial="hidden" animate="visible" variants={FV}
            style={{ background:'rgba(7,7,26,.8)', border:'1px solid rgba(255,255,255,.07)', borderRadius:18, padding:'16px 18px', position:'relative', overflow:'hidden', cursor:'pointer', transition:'all .25s' }}
            whileHover={{ y:-2, borderColor:'rgba(255,255,255,.14)', boxShadow:'0 12px 40px rgba(0,0,0,.4)' }}>
            <div style={{ position:'absolute', top:-20, right:-20, width:70, height:70, borderRadius:'50%', background:s.color, filter:'blur(28px)', opacity:.1 }}/>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <s.icon size={14} style={{ color:s.color, opacity:.8 }}/>
              <div style={{ fontSize:10, fontWeight:600, color:'#2d3748', textTransform:'uppercase', letterSpacing:'.6px' }}>{s.label}</div>
            </div>
            <div style={{ fontFamily:'JetBrains Mono,monospace', fontWeight:700, fontSize:30, color:s.color, lineHeight:1, marginBottom:5 }}>{s.value}</div>
            <div style={{ fontSize:11, color:'#4b5563' }}>{s.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Chart + AI insight */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:14 }}>
        {/* Chart */}
        <motion.div custom={4} initial="hidden" animate="visible" variants={FV}
          style={{ background:'rgba(7,7,26,.8)', border:'1px solid rgba(255,255,255,.07)', borderRadius:20, overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontWeight:600, fontSize:14, color:'#f8fafc', marginBottom:2 }}>Focus Timeline</div>
              <div style={{ fontSize:11, color:'#4b5563' }}>Hours per day · last 7 days</div>
            </div>
            <Link href="/analytics" style={{ fontSize:12, color:'#818cf8', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
              Details <ArrowRight size={12}/>
            </Link>
          </div>
          <div style={{ padding:'16px 20px' }}>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={.25}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill:'#2d3748', fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis hide/>
                <Tooltip {...TT_STYLE} formatter={(v:any) => [`${v}h`, 'Focus']}/>
                <Area type="monotone" dataKey="focus" stroke="#6366f1" strokeWidth={2} fill="url(#fg)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>

            {/* Empty state hint */}
            {focusMins === 0 && (
              <div style={{ textAlign:'center', marginTop:8 }}>
                <Link href="/focus" style={{ fontSize:12, color:'#818cf8', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:5 }}>
                  Start your first focus session <ArrowRight size={12}/>
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* AI insight */}
        <motion.div custom={5} initial="hidden" animate="visible" variants={FV}
          style={{ background:'linear-gradient(135deg,rgba(99,102,241,.08),rgba(6,182,212,.04))', border:'1px solid rgba(99,102,241,.18)', borderRadius:20, padding:'18px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <div style={{ width:28, height:28, borderRadius:9, background:'linear-gradient(135deg,#6366f1,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Sparkles size={14} color="#fff"/>
            </div>
            <div style={{ fontWeight:600, fontSize:13, color:'#f8fafc' }}>Boom AI</div>
          </div>
          {insightLoading
            ? <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#4b5563' }}>
                <div style={{ width:14, height:14, border:'2px solid rgba(99,102,241,.3)', borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin 1s linear infinite' }}/>
                Thinking...
              </div>
            : <p style={{ fontSize:13, color:'#94a3b8', lineHeight:1.7 }}>{aiInsight}</p>
          }
          <Link href="/planner" style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:14, fontSize:12, color:'#818cf8', textDecoration:'none', fontWeight:600 }}>
            Plan my day with AI <ArrowRight size={12}/>
          </Link>
        </motion.div>
      </div>

      {/* Tasks + Quick actions */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:14 }}>
        {/* Today's tasks */}
        <motion.div custom={6} initial="hidden" animate="visible" variants={FV}
          style={{ background:'rgba(7,7,26,.8)', border:'1px solid rgba(255,255,255,.07)', borderRadius:20, overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontWeight:600, fontSize:14, color:'#f8fafc', marginBottom:2 }}>Tasks</div>
              <div style={{ fontSize:11, color:'#4b5563' }}>
                {totalTasks === 0 ? 'No tasks yet' : `${doneTasks} / ${totalTasks} done`}
              </div>
            </div>
            <Link href="/tasks" style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'#818cf8', textDecoration:'none' }}>
              <Plus size={13}/> Add task
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div style={{ padding:'40px 20px', textAlign:'center' }}>
              <div style={{ fontSize:32, opacity:.15, marginBottom:12 }}>◈</div>
              <div style={{ fontSize:13, color:'#4b5563', marginBottom:14 }}>No tasks yet. Create your first task and let Boom AI break it down for you.</div>
              <Link href="/tasks" style={{ display:'inline-flex', alignItems:'center', gap:6, background:'linear-gradient(135deg,#6366f1,#06b6d4)', color:'#fff', fontSize:13, fontWeight:600, padding:'8px 20px', borderRadius:12, textDecoration:'none' }}>
                <Plus size={14}/> Create first task
              </Link>
            </div>
          ) : (
            <div style={{ padding:'8px 0' }}>
              {(todayTasks.length > 0 ? todayTasks : tasks).slice(0,6).map(task => (
                <div key={task.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 20px', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                  <div style={{ width:16, height:16, borderRadius:'50%', border:'2px solid', borderColor: task.status==='done'?'#10b981':'rgba(255,255,255,.2)', background: task.status==='done'?'#10b981':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {task.status==='done' && <span style={{ fontSize:8, color:'#fff' }}>✓</span>}
                  </div>
                  <span style={{ flex:1, fontSize:13, color: task.status==='done'?'#4b5563':'#e2e8f0', textDecoration: task.status==='done'?'line-through':'none' }}>{task.title}</span>
                  <span style={{ fontSize:10, padding:'2px 7px', borderRadius:10 }} className={PRIORITY_STYLES[task.priority]}>{task.priority}</span>
                </div>
              ))}
              {tasks.length > 6 && (
                <Link href="/tasks" style={{ display:'flex', alignItems:'center', gap:4, padding:'10px 20px', fontSize:12, color:'#818cf8', textDecoration:'none' }}>
                  +{tasks.length-6} more tasks <ArrowRight size={12}/>
                </Link>
              )}
            </div>
          )}
        </motion.div>

        {/* Quick actions */}
        <motion.div custom={7} initial="hidden" animate="visible" variants={FV}
          style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { label:tr('planMyDay'),         sub:'AI builds your schedule',  icon:'✦', href:'/planner',   color:'#6366f1' },
            { label:tr('startFocus'), sub:'25 min deep work block',   icon:'◎', href:'/focus',     color:'#06b6d4' },
            { label:tr('newNote'),            sub:'Capture your thoughts',    icon:'⬭', href:'/notes',     color:'#a78bfa' },
            { label:tr('inviteTeammate'),     sub:'Grow your workspace',      icon:'⊕', href:'/teams',     color:'#10b981' },
          ].map((a,i)=>(
            <motion.div key={i} whileHover={{ y:-2, x:2 }} whileTap={{ scale:.97 }}>
              <Link href={a.href} style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:12, background:'rgba(7,7,26,.8)', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, padding:'13px 16px', transition:'all .2s' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(99,102,241,.3)';e.currentTarget.style.background='rgba(99,102,241,.05)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.07)';e.currentTarget.style.background='rgba(7,7,26,.8)'}}>
                <div style={{ width:34, height:34, borderRadius:11, background:`rgba(${a.color==='#6366f1'?'99,102,241':a.color==='#06b6d4'?'6,182,212':a.color==='#a78bfa'?'167,139,250':'16,185,129'},.12)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{a.icon}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#f8fafc', marginBottom:1 }}>{a.label}</div>
                  <div style={{ fontSize:11, color:'#4b5563' }}>{a.sub}</div>
                </div>
                <ArrowRight size={14} style={{ marginLeft:'auto', color:'#2d3748' }}/>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* High priority alert */}
      {highPri.length > 0 && (
        <motion.div custom={8} initial="hidden" animate="visible" variants={FV}
          style={{ background:'rgba(244,63,94,.06)', border:'1px solid rgba(244,63,94,.2)', borderRadius:16, padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#f43f5e', boxShadow:'0 0 8px rgba(244,63,94,.6)', flexShrink:0 }}/>
          <div style={{ flex:1, fontSize:13, color:'#fca5a5' }}>
            <span style={{ fontWeight:600 }}>{highPri.length} high-priority task{highPri.length>1?'s':''}</span> need your attention: {highPri.slice(0,2).map(t=>t.title).join(', ')}{highPri.length>2?'...':''}
          </div>
          <Link href="/tasks" style={{ fontSize:12, color:'#f87171', textDecoration:'none', fontWeight:600, whiteSpace:'nowrap' }}>View tasks →</Link>
        </motion.div>
      )}
    </div>
  )
}
