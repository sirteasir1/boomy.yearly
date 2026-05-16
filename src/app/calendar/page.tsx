'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store/useStore'
import { useLang  } from '@/lib/i18n/useLang'
import { getCalendarEvents, createCalendarEvent, deleteCalendarEvent } from '@/lib/firebase/firestore'
import { ChevronLeft, ChevronRight, Plus, X, Loader2 } from 'lucide-react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isToday,
  addMonths, subMonths, getDate,
} from 'date-fns'
import { generateId } from '@/lib/utils'

type Ev = { id:string; title:string; day:number; month:number; year:number; color:string; time?:string; userId:string }
const COLORS = ['#6366f1','#06b6d4','#10b981','#f43f5e','#f59e0b']
const COLOR_BG: Record<string,string> = {
  '#6366f1':'rgba(99,102,241,.15)','#06b6d4':'rgba(6,182,212,.12)',
  '#10b981':'rgba(16,185,129,.12)','#f43f5e':'rgba(244,63,94,.12)','#f59e0b':'rgba(245,158,11,.1)',
}

export default function CalendarPage() {
  const { user }  = useStore()
  const tr        = useLang()
  const [current, setCurrent]   = useState(new Date())
  const [events,  setEvents]    = useState<Ev[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected,setSelected]  = useState<Date|null>(null)
  const [showNew, setShowNew]   = useState(false)
  const [newTitle,setNewTitle]  = useState('')
  const [newColor,setNewColor]  = useState('#6366f1')
  const [newTime, setNewTime]   = useState('')
  const [saving,  setSaving]    = useState(false)

  // Load events from Firestore
  useEffect(() => {
    if (!user?.uid) return
    setLoading(true)
    getCalendarEvents(user.uid)
      .then(evs => setEvents(evs as Ev[]))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.uid])

  const gridStart = startOfWeek(startOfMonth(current), { weekStartsOn:1 })
  const gridEnd   = endOfWeek(endOfMonth(current),     { weekStartsOn:1 })
  const days      = eachDayOfInterval({ start:gridStart, end:gridEnd })
  const evForDay  = (d: Date) => events.filter(e =>
    e.day===getDate(d) && e.month===d.getMonth() && e.year===d.getFullYear()
  )

  const addEvent = async () => {
    if (!newTitle.trim() || !selected || !user) return
    setSaving(true)
    const ev: Ev = {
      id: generateId(), title: newTitle,
      day: getDate(selected), month: selected.getMonth(), year: selected.getFullYear(),
      color: newColor, time: newTime||undefined, userId: user.uid,
    }
    await createCalendarEvent(ev)
    setEvents(prev => [...prev, ev])
    setNewTitle(''); setNewTime(''); setShowNew(false)
    setSaving(false)
  }

  const removeEvent = async (id: string) => {
    await deleteCalendarEvent(id)
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const DAY_NAMES = [tr('mon'),tr('tue'),tr('wed'),tr('thu'),tr('fri'),tr('sat'),tr('sun')]

  return (
    <div style={{maxWidth:1000, margin:'0 auto', display:'flex', flexDirection:'column', gap:16}}>
      {/* Header */}
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <button onClick={()=>setCurrent(subMonths(current,1))}
            style={{width:32,height:32,borderRadius:10,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#6b7280'}}>
            <ChevronLeft size={16}/>
          </button>
          <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:20,color:'#f8fafc',minWidth:160,textAlign:'center'}}>
            {format(current,'MMMM yyyy')}
          </div>
          <button onClick={()=>setCurrent(addMonths(current,1))}
            style={{width:32,height:32,borderRadius:10,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#6b7280'}}>
            <ChevronRight size={16}/>
          </button>
          <button onClick={()=>setCurrent(new Date())}
            style={{fontSize:12,padding:'6px 14px',borderRadius:20,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',color:'#6b7280',cursor:'pointer'}}>
            {tr('today')}
          </button>
        </div>
        <button onClick={()=>setShowNew(true)}
          style={{background:'linear-gradient(135deg,#6366f1,#06b6d4)',border:'none',borderRadius:12,padding:'9px 18px',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
          <Plus size={14}/>{tr('addEvent')}
        </button>
      </div>

      {/* Grid */}
      <div style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:20,overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:'1px solid rgba(255,255,255,.07)'}}>
          {DAY_NAMES.map(d=>(
            <div key={d} style={{textAlign:'center',fontSize:11,fontWeight:600,color:'#2d3748',padding:'10px 0',textTransform:'uppercase',letterSpacing:'.5px'}}>{d}</div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
          {days.map((day,i)=>{
            const de      = evForDay(day)
            const inMonth = isSameMonth(day, current)
            const tod     = isToday(day)
            const sel     = selected && format(selected,'yyyy-MM-dd')===format(day,'yyyy-MM-dd')
            return (
              <div key={i} onClick={()=>setSelected(day)}
                style={{minHeight:88, padding:6, borderRight:i%7!==6?'1px solid rgba(255,255,255,.04)':'none', borderBottom:'1px solid rgba(255,255,255,.04)', cursor:'pointer', transition:'background .15s', opacity:inMonth?1:.3, background:sel?'rgba(99,102,241,.1)':tod?'rgba(99,102,241,.04)':'transparent'}}>
                <div style={{width:24,height:24,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,marginBottom:4,background:tod?'linear-gradient(135deg,#6366f1,#06b6d4)':'transparent',color:tod?'#fff':'#94a3b8'}}>
                  {format(day,'d')}
                </div>
                {de.slice(0,2).map(ev=>(
                  <div key={ev.id}
                    style={{fontSize:10,padding:'2px 5px',borderRadius:4,marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',background:COLOR_BG[ev.color]||'rgba(99,102,241,.12)',color:ev.color,fontWeight:500}}>
                    {ev.title}
                  </div>
                ))}
                {de.length>2&&<div style={{fontSize:10,color:'#4b5563'}}>+{de.length-2}</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected day events */}
      <AnimatePresence>
        {selected && evForDay(selected).length > 0 && (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}
            style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:18,padding:18}}>
            <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:13,marginBottom:12,color:'#f8fafc'}}>
              {format(selected,'EEEE, MMMM d')}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {evForDay(selected).map(ev=>(
                <div key={ev.id}
                  style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:12,background:COLOR_BG[ev.color]||'rgba(99,102,241,.1)',border:`1px solid ${ev.color}30`}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:ev.color,flexShrink:0}}/>
                  <div style={{flex:1,fontSize:13,fontWeight:500,color:'#f8fafc'}}>{ev.title}</div>
                  {ev.time&&<div style={{fontSize:11,color:ev.color}}>{ev.time}</div>}
                  <button onClick={()=>removeEvent(ev.id)}
                    style={{background:'none',border:'none',cursor:'pointer',color:'#4b5563',transition:'color .15s'}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.color='#f87171'}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.color='#4b5563'}}>
                    <X size={14}/>
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New event modal */}
      <AnimatePresence>
        {showNew && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',backdropFilter:'blur(6px)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
            onClick={e=>{if(e.target===e.currentTarget)setShowNew(false)}}>
            <motion.div initial={{opacity:0,scale:.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.95}}
              style={{background:'rgba(7,7,26,.98)',border:'1px solid rgba(255,255,255,.12)',borderRadius:24,padding:28,width:'100%',maxWidth:400}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:17,color:'#f8fafc'}}>{tr('newEvent')}</div>
                <button onClick={()=>setShowNew(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#4b5563'}}><X size={18}/></button>
              </div>
              {[
                {label:tr('eventTitle'),  val:newTitle, set:setNewTitle, ph:'Morning standup...'},
                {label:tr('timeOptional'),val:newTime,  set:setNewTime,  ph:'e.g. 2:00 PM'},
              ].map((f,i)=>(
                <div key={i} style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:6}}>{f.label}</label>
                  <input value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
                    onKeyDown={e=>e.key==='Enter'&&f===({label:tr('timeOptional'),val:newTime,set:setNewTime,ph:'e.g. 2:00 PM'})&&addEvent()}
                    style={{width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,padding:'11px 14px',color:'#f8fafc',fontSize:13,outline:'none',fontFamily:'DM Sans,sans-serif',boxSizing:'border-box'}}
                    onFocus={e=>e.currentTarget.style.borderColor='rgba(99,102,241,.5)'}
                    onBlur={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.1)'}/>
                </div>
              ))}
              <div style={{marginBottom:20}}>
                <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:8}}>{tr('color')}</label>
                <div style={{display:'flex',gap:8}}>
                  {COLORS.map(c=>(
                    <button key={c} onClick={()=>setNewColor(c)}
                      style={{width:28,height:28,borderRadius:'50%',background:c,border:newColor===c?'3px solid #fff':'2px solid transparent',cursor:'pointer',transition:'all .15s'}}/>
                  ))}
                </div>
              </div>
              <button onClick={addEvent} disabled={saving||!newTitle.trim()}
                style={{width:'100%',background:'linear-gradient(135deg,#6366f1,#06b6d4)',border:'none',borderRadius:14,padding:'12px',color:'#fff',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:(!newTitle.trim()||saving)?.6:1}}>
                {saving&&<Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/>}
                {tr('addEvent')} {selected?`on ${format(selected,'MMM d')}`:''}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
