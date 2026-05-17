'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTasks } from '@/lib/hooks/useTasks'
import { useStore } from '@/lib/store/useStore'
import { Plus, Sparkles, Loader2, X, ArrowRight } from 'lucide-react'
import type { Task, TaskStatus, Priority } from '@/types'
import { cn, PRIORITY_STYLES, STATUS_DOT, generateId } from '@/lib/utils'
import { useLang  } from '@/lib/i18n/useLang'
import { useBIS   } from '@/lib/hooks/useBIS'
import { trackTaskCreated, trackTaskCompleted, trackTaskPostponed } from '@/lib/bis/collector'

// Keys translated inside component — no hooks at module level
const COLS: { id: TaskStatus; key: string; color: string }[] = [
  { id:'todo',       key:'toDo',       color:'#6b7280' },
  { id:'inprogress', key:'inProgress', color:'#f59e0b' },
  { id:'review',     key:'review',     color:'#06b6d4' },
  { id:'done',       key:'done',       color:'#10b981' },
]
const NEXT: Record<TaskStatus, TaskStatus | null> = { todo:'inprogress', inprogress:'review', review:'done', done:null }

export default function TasksPage() {
  const tr   = useLang()
  const { onSignificantEvent } = useBIS()
  const { tasks, create, update, remove } = useTasks()
  const { user } = useStore()
  const [addCol, setAddCol]   = useState<TaskStatus | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [breakdown, setBreakdown] = useState<any[]|null>(null)
  const [selectedId, setSelectedId] = useState<string|null>(null)
  const [bLoading, setBLoading] = useState(false)
  const [filter, setFilter]   = useState<'all'|'high'>('all')

  const filtered = filter === 'high' ? tasks.filter(t => t.priority === 'high') : tasks

  const addTask = async (status: TaskStatus) => {
    if (!newTitle.trim() || !user) return
    const task: Task = { id: generateId(), title: newTitle, description:'', status, priority:'med', tags:[], due:'', estimate:'', subtasks:[], createdAt: Date.now(), updatedAt: Date.now(), userId: user.uid }
    await create(task)
    setNewTitle(''); setAddCol(null)
  }

  const aiBreakdown = async (task: Task) => {
    setSelectedId(task.id); setBLoading(true); setBreakdown(null)
    try {
      const res = await fetch('/api/ai/breakdown', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title: task.title }) })
      const data = await res.json()
      setBreakdown(data.subtasks)
    } catch {
      setBreakdown([{ subtask:'Research & gather context', estimate:'20 min' },{ subtask:'Create initial draft', estimate:'45 min' },{ subtask:'Build core implementation', estimate:'60 min' },{ subtask:'Review and iterate', estimate:'30 min' }])
    }
    setBLoading(false)
  }

  const selected = tasks.find(t => t.id === selectedId)

  return (
    <div style={{ height:'calc(100vh - 120px)', display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:13, color:'#4b5563' }}>{tasks.length} tasks · <span style={{ color:'#34d399' }}>{tasks.filter(t=>t.status==='done').length} done</span></span>
        <div style={{ display:'flex', gap:6, marginLeft:'auto' }}>
          {(['all','high'] as const).map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{ fontSize:11, padding:'5px 12px', borderRadius:10, border:'1px solid', cursor:'pointer', background: filter===f?'rgba(99,102,241,.1)':'rgba(255,255,255,.03)', borderColor: filter===f?'rgba(99,102,241,.35)':'rgba(255,255,255,.08)', color: filter===f?'#818cf8':'#4b5563' }}>{f==='all'?'All':'High priority'}</button>
          ))}
        </div>
        {selectedId && selected && (
          <button onClick={()=>aiBreakdown(selected)} disabled={bLoading} style={{ display:'flex', alignItems:'center', gap:6, background:'linear-gradient(135deg,#6366f1,#06b6d4)', border:'none', borderRadius:10, padding:'7px 14px', color:'#fff', fontSize:12, cursor:'pointer' }}>
            {bLoading?<Loader2 style={{ width:13, height:13, animation:'spin 1s linear infinite' }}/>:<Sparkles style={{ width:13, height:13 }}/>} AI Breakdown
          </button>
        )}
      </div>

      <AnimatePresence>
        {breakdown && selected && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            style={{ background:'linear-gradient(135deg,rgba(99,102,241,.06),rgba(6,182,212,.03))', border:'1px solid rgba(99,102,241,.2)', borderRadius:18, padding:16, overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <Sparkles style={{ width:16, height:16, color:'#818cf8' }}/>
              <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13 }}>AI Breakdown: {selected.title}</span>
              <button onClick={()=>setBreakdown(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#4b5563' }}><X style={{ width:16, height:16 }}/></button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
              {breakdown.map((s,i)=>(
                <div key={i} style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:12, padding:'10px 12px' }}>
                  <div style={{ fontSize:12, fontWeight:500, marginBottom:3 }}>{i+1}. {s.subtask}</div>
                  <div style={{ fontSize:11, color:'#4b5563' }}>{s.estimate}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ flex:1, display:'flex', gap:14, overflow:'hidden' }}>
        {COLS.map(col => {
          const colTasks = filtered.filter(t => t.status === col.id)
          return (
            <div key={col.id} style={{ minWidth:260, width:260, background:'rgba(7,7,26,.8)', border:'1px solid rgba(255,255,255,.07)', borderRadius:20, display:'flex', flexDirection:'column', maxHeight:'100%' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:col.color, boxShadow:`0 0 8px ${col.color}` }}/>
                <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13, flex:1 }}>{tr(col.key as any)}</span>
                <span style={{ fontSize:11, color:'#4b5563', background:'rgba(255,255,255,.05)', padding:'1px 7px', borderRadius:10 }}>{colTasks.length}</span>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:10, display:'flex', flexDirection:'column', gap:7 }}>
                <AnimatePresence>
                  {colTasks.map(task => (
                    <motion.div key={task.id} layout initial={{opacity:0,scale:.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.95}}
                      onClick={()=>setSelectedId(task.id===selectedId?null:task.id)}
                      style={{ background: task.id===selectedId?'rgba(99,102,241,.08)':'rgba(255,255,255,.03)', border:`1px solid ${task.id===selectedId?'rgba(99,102,241,.4)':'rgba(255,255,255,.07)'}`, borderRadius:14, padding:'12px 14px', cursor:'pointer', transition:'all .15s' }}
                      className="hover:-translate-y-0.5 hover:shadow-lg">
                      <div style={{ fontSize:13, fontWeight:500, marginBottom:8 }}>{task.title}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                        <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20 }} className={PRIORITY_STYLES[task.priority]}>{task.priority}</span>
                        {NEXT[task.status] && (
                          <button onClick={e=>{
  e.stopPropagation()
  const nextStatus = NEXT[task.status]!
  update(task.id,{status:nextStatus,updatedAt:Date.now()})
  if(nextStatus==='done'&&user){
    trackTaskCompleted(user.uid,{taskId:task.id,priority:task.priority,createdAt:task.createdAt,postponedTimes:(task as any).postponedTimes??0,hadSubtasks:false})
    onSignificantEvent()
  }
}}
                            style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#4b5563' }} className="hover:text-brand-violet2">
                            <ArrowRight style={{ width:13, height:13 }}/>
                          </button>
                        )}
                        <button onClick={e=>{e.stopPropagation();remove(task.id)}}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'#374151', padding:2 }}
                          onMouseEnter={e=>(e.currentTarget.style.color='#f87171')}
                          onMouseLeave={e=>(e.currentTarget.style.color='#374151')}>
                          <Trash2 style={{ width:12, height:12 }}/>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {addCol===col.id ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} autoFocus
                      onKeyDown={e=>{if(e.key==='Enter')addTask(col.id);if(e.key==='Escape')setAddCol(null)}}
                      placeholder="Task name..." style={{ width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, padding:'8px 10px', color:'#f8fafc', fontSize:12, outline:'none' }}/>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={()=>addTask(col.id)} style={{ flex:1, background:'linear-gradient(135deg,#6366f1,#06b6d4)', border:'none', borderRadius:9, padding:'7px', color:'#fff', fontSize:11, cursor:'pointer' }}>Add</button>
                      <button onClick={()=>setAddCol(null)} style={{ flex:1, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', borderRadius:9, padding:'7px', color:'#4b5563', fontSize:11, cursor:'pointer' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={()=>setAddCol(col.id)} style={{ width:'100%', border:'1px dashed rgba(255,255,255,.1)', borderRadius:12, padding:'8px', color:'#2d3748', fontSize:11, background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:4, transition:'all .15s' }}
                    className="hover:border-brand-violet/40 hover:text-brand-violet2">
                    <Plus style={{ width:12, height:12 }}/> Add card
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

