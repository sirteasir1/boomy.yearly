'use client'
import { useLang  } from '@/lib/i18n/useLang'
import { useStore } from '@/lib/store/useStore'
import { trackPlannerGenerated, trackPlannerAccepted } from '@/lib/bis/collector'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Plus, Trash2, Loader2, Coffee, Brain, Zap, Clock } from 'lucide-react'
import type { PlannerTask, ScheduleBlock, Priority } from '@/types'
import { cn } from '@/lib/utils'

const BLOCK_BG: Record<string, string> = {
  focus: 'rgba(99,102,241,.08)', break: 'rgba(16,185,129,.06)',
  admin: 'rgba(6,182,212,.05)', meeting: 'rgba(245,158,11,.06)',
}
const BLOCK_BORDER: Record<string, string> = {
  focus: 'rgba(99,102,241,.3)', break: 'rgba(16,185,129,.25)',
  admin: 'rgba(6,182,212,.2)', meeting: 'rgba(245,158,11,.2)',
}

export default function PlannerPage() {
  const [tasks, setTasks] = useState<PlannerTask[]>([])
  const { user } = useStore()
  const tr = useLang()
  const [input, setInput] = useState('')
  const [dur, setDur]     = useState(60)
  const [pri, setPri]     = useState<Priority>('med')
  const [start, setStart] = useState('09:00')
  const [loading, setLoading] = useState(false)
  const [plan, setPlan]   = useState<ScheduleBlock[] | null>(null)

  const addTask = () => {
    if (!input.trim()) return
    setTasks([...tasks, { id: Date.now().toString(), name: input, dur, priority: pri }])
    setInput('')
  }

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/plan', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ userId: user?.uid, userName: user?.name, tasks, startTime: start }),
      })
      const data = await res.json()
      setPlan(data.schedule)
    } catch {
      setPlan([
        { time:start,  title:`Focus: ${tasks[0]?.name||'Deep Work'}`, duration:'90 min', type:'focus',   notes:'Peak energy window — go deep.' },
        { time:'10:30',title:'Short Break',                            duration:'15 min', type:'break',   notes:'Walk, hydrate, reset.' },
        { time:'10:45',title:tasks[1]?.name||'Task 2',                 duration:'45 min', type:'focus',   notes:'Creative block, stay in flow.' },
        { time:'11:30',title:tasks[2]?.name||'Admin',                  duration:'30 min', type:'admin',   notes:'Batch all low-energy work.' },
        { time:'12:00',title:'Lunch Break',                            duration:'45 min', type:'break',   notes:'Full disconnect — recharge.' },
        { time:'12:45',title:`Focus: ${tasks[3]?.name||'Deep Work 2'}`,duration:'90 min', type:'focus',   notes:'Afternoon deep work.' },
      ])
    }
    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto" style={{ height:'calc(100vh - 120px)', display:'flex', gap:16 }}>
      {/* Left */}
      <div style={{ width:280, flexShrink:0, display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ background:'rgba(7,7,26,.8)', border:'1px solid rgba(255,255,255,.07)', borderRadius:18, padding:16 }}>
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, marginBottom:12 }}>Config</div>
          <label style={{ fontSize:11, color:'#4b5563', display:'block', marginBottom:5 }}>Start time</label>
          <input type="time" value={start} onChange={e=>setStart(e.target.value)}
            style={{ width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', borderRadius:10, padding:'8px 12px', color:'#f8fafc', fontFamily:'JetBrains Mono,monospace', fontSize:13, outline:'none', marginBottom:12 }}/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:5 }}>
            {(['high','med','low'] as Priority[]).map(p => (
              <button key={p} onClick={()=>setPri(p)}
                style={{ padding:'7px', borderRadius:10, border:'1px solid', fontSize:11, fontWeight:600, cursor:'pointer', background: pri===p ? (p==='high'?'rgba(244,63,94,.15)':p==='med'?'rgba(245,158,11,.15)':'rgba(16,185,129,.15)') : 'rgba(255,255,255,.03)', borderColor: pri===p ? (p==='high'?'rgba(244,63,94,.3)':p==='med'?'rgba(245,158,11,.3)':'rgba(16,185,129,.3)') : 'rgba(255,255,255,.08)', color: pri===p ? (p==='high'?'#f43f5e':p==='med'?'#f59e0b':'#10b981') : '#4b5563' }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background:'rgba(7,7,26,.8)', border:'1px solid rgba(255,255,255,.07)', borderRadius:18, flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
            <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13 }}>Tasks</div>
            <div style={{ fontSize:11, color:'#4b5563', marginTop:2 }}>{tasks.length} tasks · {Math.round(tasks.reduce((a,t)=>a+t.dur,0)/60*10)/10}h</div>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:10, display:'flex', flexDirection:'column', gap:7 }}>
            {tasks.map(t => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:12, padding:'10px 12px' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:500 }}>{t.name}</div>
                  <div style={{ fontSize:10, color:'#4b5563', marginTop:2 }}>{t.dur}m · {t.priority}</div>
                </div>
                <button onClick={()=>setTasks(tasks.filter(x=>x.id!==t.id))} style={{ background:'none', border:'none', cursor:'pointer', color:'#2d3748', padding:4 }}
                  className="hover:text-rose-400"><Trash2 style={{ width:13, height:13 }}/></button>
              </div>
            ))}
          </div>
          <div style={{ padding:10, borderTop:'1px solid rgba(255,255,255,.07)', display:'flex', flexDirection:'column', gap:6 }}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTask()}
              placeholder="Add task..." style={{ width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', borderRadius:10, padding:'8px 10px', color:'#f8fafc', fontSize:12, outline:'none' }}/>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <span style={{ fontSize:11, color:'#4b5563' }}>min:</span>
              <input type="number" value={dur} onChange={e=>setDur(+e.target.value)} min={15} max={480} step={15}
                style={{ width:60, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', borderRadius:8, padding:'5px 8px', color:'#f8fafc', fontSize:12, fontFamily:'JetBrains Mono,monospace', outline:'none' }}/>
              <button onClick={addTask} style={{ marginLeft:'auto', background:'linear-gradient(135deg,#6366f1,#06b6d4)', border:'none', borderRadius:9, padding:'6px 12px', color:'#fff', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                <Plus style={{ width:12, height:12 }}/> Add
              </button>
            </div>
          </div>
        </div>

        <button onClick={generate} disabled={loading||!tasks.length}
          style={{ background:'linear-gradient(135deg,#6366f1,#06b6d4)', border:'none', borderRadius:16, padding:'14px', color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:'0 8px 24px rgba(99,102,241,.35)', opacity: loading||!tasks.length ? .6 : 1 }}>
          {loading ? <Loader2 style={{ width:16, height:16, animation:'spin 1s linear infinite' }}/> : <Sparkles style={{ width:16, height:16 }}/>}
          {loading ? 'AI is planning...' : tr('generatePlan')}
        </button>
      </div>

      {/* Right: schedule */}
      <div style={{ flex:1, background:'rgba(7,7,26,.8)', border:'1px solid rgba(255,255,255,.07)', borderRadius:20, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {loading ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14 }}>
            <div style={{ width:52, height:52, borderRadius:18, background:'linear-gradient(135deg,#6366f1,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Sparkles style={{ width:24, height:24, color:'#fff' }}/>
            </div>
            <div style={{ fontSize:13, color:'#4b5563' }}>Claude is building your perfect day...</div>
            <div style={{ display:'flex', gap:6 }}>
              {[0,1,2].map(i=><div key={i} style={{ width:8, height:8, borderRadius:'50%', background:'rgba(99,102,241,.5)', animation:`bounce 1s ${i*.15}s ease-in-out infinite` }}/>)}
            </div>
          </div>
        ) : plan ? (
          <>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
              <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15 }}>Your AI-Optimized Schedule ✦</div>
              <div style={{ fontSize:11, color:'#4b5563', marginTop:2 }}>Powered by Claude · {plan.length} blocks · Click to reschedule</div>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:10 }}>
              <AnimatePresence>
                {plan.map((block, i) => (
                  <motion.div key={i} initial={{ opacity:0, x:12 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*.06 }}
                    style={{ display:'flex', gap:14, alignItems:'flex-start', cursor:'pointer' }}>
                    <div style={{ fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'#2d3748', paddingTop:12, minWidth:44, textAlign:'right' }}>{block.time}</div>
                    <div style={{ flex:1, background:BLOCK_BG[block.type], border:`1px solid ${BLOCK_BORDER[block.type]}`, borderRadius:14, padding:'12px 14px', transition:'transform .15s' }}
                      className="hover:-translate-y-0.5">
                      <div style={{ fontWeight:500, fontSize:13, marginBottom:4 }}>{block.title}</div>
                      <div style={{ fontSize:11, color:'#94a3b8' }}>{block.duration} · {block.notes}</div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:32 }}>
            <div style={{ fontSize:48, opacity:.2, marginBottom:16 }}>✦</div>
            <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:18, color:'#4b5563', marginBottom:8 }}>AI Day Planner</div>
            <p style={{ fontSize:13, color:'#2d3748', lineHeight:1.7, maxWidth:320 }}>Add your tasks on the left, set your start time, and let Claude build your perfect, burnout-free day.</p>
          </div>
        )}
      </div>
    </div>
  )
}
