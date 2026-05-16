'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, Brain, Zap, AlertTriangle, TrendingUp, Loader2, Mic, MicOff } from 'lucide-react'
import { useStore  } from '@/lib/store/useStore'
import { useTasks  } from '@/lib/hooks/useTasks'
import { useNotes  } from '@/lib/hooks/useNotes'
import { useBIS    } from '@/lib/hooks/useBIS'
import { formatTime } from '@/lib/utils'
import { useRouter  } from 'next/navigation'

const SEV_COLOR = { info:'#818cf8', warning:'#f59e0b', critical:'#f43f5e', positive:'#34d399' }
const SEV_ICON  = { info:Brain, warning:AlertTriangle, critical:AlertTriangle, positive:TrendingUp }

export function AIPanel() {
  const { user }              = useStore()
  const { tasks }             = useTasks()
  const { notes }             = useNotes()
  const { model, patterns, memory, loading, hasEnoughData } = useBIS()
  const router                = useRouter()
  const [input,      setInput]      = useState('')
  const [messages,   setMessages]   = useState<{role:'user'|'ai';text:string;actions?:any[]}[]>([])
  const [sending,    setSending]    = useState(false)
  const [listening,  setListening]  = useState(false)
  const recognitionRef = useRef<any>(null)
  const [timerSecs,  setTimerSecs]  = useState(25*60)
  const [timerOn,    setTimerOn]    = useState(false)
  const timerRef = useRef<NodeJS.Timeout>()
  const msgEnd   = useRef<HTMLDivElement>(null)

  useEffect(()=>{
    if(timerOn){ timerRef.current=setInterval(()=>setTimerSecs(s=>s<=0?0:s-1),1000) }
    else clearInterval(timerRef.current)
    return()=>clearInterval(timerRef.current)
  },[timerOn])

  useEffect(()=>{ msgEnd.current?.scrollIntoView({behavior:'smooth'}) },[messages])

  // Initial greeting with BIS insight
  useEffect(()=>{
    if(!user||messages.length>0) return
    const greeting = (() => {
      const h = new Date().getHours()
      const name = user.name?.split(' ')[0]
      if (!model || !hasEnoughData) {
        return `Hey ${name}! I'm Boom — your AI co-pilot. Use the app and I'll start learning your patterns. What would you like to work on?`
      }
      const topPattern = patterns.find(p => p.severity === 'critical' || p.severity === 'warning')
      if (topPattern) return `${name}, heads up: ${topPattern.description} → ${topPattern.actionSuggestion}`
      if (model.productiveHours.length > 0) {
        return `${name}, your peak window is ${model.productiveHours[0]}. ${h < 12 ? 'Perfect time for deep work.' : 'Schedule your hardest task for tomorrow morning.'} What are we tackling?`
      }
      return `Hey ${name}! ${tasks.filter(t=>t.status!=='done').length} tasks waiting. What's the most important thing to do right now?`
    })()
    setMessages([{ role:'ai', text: greeting }])
  }, [user?.uid, model?.dataPoints])

  const startVoice = () => {
    if (typeof window === 'undefined') return

    // Stop if already listening
    if (listening) {
      try { recognitionRef.current?.stop() } catch {}
      setListening(false)
      return
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      // Fallback: show tooltip instead of blocking alert
      setMessages(m => [...m, { role:'ai' as const, text:'🎤 Voice input works in Chrome and Safari. Try typing instead.' }])
      return
    }

    try {
      const rec = new SR()
      rec.lang = 'en-US'
      rec.continuous = false
      rec.interimResults = true
      rec.maxAlternatives = 1

      rec.onstart = () => setListening(true)
      rec.onend   = () => setListening(false)
      rec.onerror = (e: any) => {
        setListening(false)
        if (e.error === 'not-allowed') {
          setMessages(m => [...m, { role:'ai' as const, text:'🎤 Microphone permission denied. Allow microphone access in browser settings.' }])
        }
      }
      rec.onresult = (e: any) => {
        let final = ''
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript
        }
        if (final) setInput(prev => (prev ? prev + ' ' : '') + final.trim())
      }

      recognitionRef.current = rec
      rec.start()
    } catch (err) {
      setListening(false)
      console.warn('[Voice]', err)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    const msg = input.trim()
    setInput('')
    setMessages(m => [...m, { role:'user', text: msg }])
    setSending(true)

    try {
      const res = await fetch('/api/ai/agent', {
        method:  'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          message:      msg,
          userId:       user?.uid,
          userName:     user?.name,
          currentTasks: tasks.slice(0,10),
        }),
      })
      const data = await res.json()

      // Execute agent actions
      const actionResults: string[] = []
      for (const action of (data.actions ?? [])) {
        if (action.tool === 'startFocusSession') {
          setTimerSecs((action.params.minutes ?? 25) * 60)
          setTimerOn(true)
          actionResults.push(`⏱ Started ${action.params.minutes}min focus session`)
        }
        if (action.tool === 'createTask') {
          actionResults.push(`✓ Task queued: "${action.params.title}"`)
        }
        if (action.tool === 'createCalendarEvent') {
          actionResults.push(`📅 Event: "${action.params.title}" at ${action.params.time}`)
        }
      }

      const fullText = [data.message, ...actionResults].filter(Boolean).join('\n\n')
      setMessages(m => [...m, { role:'ai', text: fullText, actions: data.actions }])
    } catch {
      setMessages(m => [...m, { role:'ai', text: 'Connection issue. Try again.' }])
    }
    setSending(false)
  }

  const doneTasks  = tasks.filter(t=>t.status==='done').length
  const openTasks  = tasks.filter(t=>t.status!=='done').length
  const score = model
    ? Math.min(100, Math.round(model.completionRate*40 + model.consistencyScore*0.4 + (doneTasks*3)))
    : Math.min(100, doneTasks*8 + notes.length*3)
  const C          = 2*Math.PI*38
  const ringOffset = C - (score/100)*C

  return (
    <motion.aside
      initial={{x:300,opacity:0}} animate={{x:0,opacity:1}} exit={{x:300,opacity:0}}
      transition={{type:'spring',stiffness:280,damping:28}}
      style={{width:'min(300px,100vw)',flexShrink:0,display:'flex',flexDirection:'column',background:'rgba(4,4,18,0.92)',borderLeft:'1px solid rgba(255,255,255,.07)',backdropFilter:'blur(28px)',position:'relative',overflow:'hidden'}}>

      {/* Header */}
      <div style={{padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,.07)',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <div style={{width:32,height:32,borderRadius:10,background:'linear-gradient(135deg,rgba(99,102,241,.3),rgba(168,85,247,.2))',border:'1px solid rgba(99,102,241,.35)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Sparkles style={{width:16,height:16,color:'#818cf8'}}/>
        </div>
        <div>
          <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:14,color:'#f8fafc'}}>Boom AI</div>
          <div style={{fontSize:10,color:'#2d3748'}}>{hasEnoughData ? `${model?.confidence} confidence · ${model?.dataPoints} data points` : 'Learning your patterns...'}</div>
        </div>
        <div className="ai-pulse" style={{marginLeft:'auto'}}/>
      </div>

      {/* Focus Score */}
      <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,.07)',display:'flex',alignItems:'center',gap:14,flexShrink:0}}>
        <div style={{position:'relative',flexShrink:0}}>
          <svg width={72} height={72} style={{transform:'rotate(-90deg)'}}>
            <circle cx={36} cy={36} r={30} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={6}/>
            <circle cx={36} cy={36} r={30} fill="none" stroke="url(#rg2)" strokeWidth={6}
              strokeLinecap="round" strokeDasharray={C} strokeDashoffset={ringOffset}
              style={{transition:'stroke-dashoffset 1.5s cubic-bezier(.4,0,.2,1)'}}/>
            <defs><linearGradient id="rg2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#22d3ee"/>
            </linearGradient></defs>
          </svg>
          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:18,fontWeight:700,background:'linear-gradient(135deg,#818cf8,#22d3ee)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{score}</span>
          </div>
        </div>
        <div style={{flex:1}}>
          {[
            {l:'Done',  v:doneTasks,       c:'#818cf8'},
            {l:'Open',  v:openTasks,       c:'#22d3ee'},
            {l:'Notes', v:notes.length,    c:'#34d399'},
          ].map((s,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:3}}>
              <span style={{color:'#4b5563'}}>{s.l}</span>
              <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,color:s.c}}>{s.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Pomodoro */}
      <div style={{padding:'10px 16px',borderBottom:'1px solid rgba(255,255,255,.07)',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:18,color:'#f8fafc',fontWeight:500}}>{formatTime(timerSecs)}</div>
        <button onClick={()=>setTimerOn(r=>!r)}
          style={{flex:1,background:timerOn?'rgba(99,102,241,.15)':'linear-gradient(135deg,#6366f1,#06b6d4)',border:timerOn?'1px solid rgba(99,102,241,.3)':'none',borderRadius:9,padding:'6px',color:'#fff',fontSize:11,fontWeight:600,cursor:'pointer'}}>
          {timerOn?'⏸ Pause':'▶ Focus'}
        </button>
        <button onClick={()=>{setTimerOn(false);setTimerSecs(25*60)}}
          style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',borderRadius:9,padding:'6px 10px',color:'#4b5563',fontSize:11,cursor:'pointer'}}>↺</button>
      </div>

      {/* Active pattern alert */}
      {patterns.filter(p=>p.severity==='critical'||p.severity==='warning').slice(0,1).map(p=>(
        <div key={p.id} style={{margin:'10px 12px 0',background:p.severity==='critical'?'rgba(244,63,94,.08)':'rgba(245,158,11,.08)',border:`1px solid ${SEV_COLOR[p.severity]}30`,borderRadius:12,padding:'10px 12px',flexShrink:0}}>
          <div style={{fontSize:11,fontWeight:700,color:SEV_COLOR[p.severity],marginBottom:3}}>{p.title}</div>
          <div style={{fontSize:11,color:'#6b7280',lineHeight:1.5}}>{p.actionSuggestion}</div>
        </div>
      ))}

      {/* Chat messages */}
      <div style={{flex:1,overflowY:'auto',padding:'12px 12px 4px',display:'flex',flexDirection:'column',gap:10}}>
        {messages.map((m,i)=>(
          <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'}}>
            <div style={{maxWidth:'88%',padding:'10px 13px',borderRadius: m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px',fontSize:13,lineHeight:1.65,whiteSpace:'pre-wrap',
              background:m.role==='user'?'linear-gradient(135deg,#6366f1,#06b6d4)':'rgba(255,255,255,.05)',
              color:m.role==='user'?'#fff':'#94a3b8',
              border:m.role==='ai'?'1px solid rgba(255,255,255,.07)':'none'}}>
              {m.text}
            </div>
          </div>
        ))}
        {sending&&(
          <div style={{display:'flex',gap:5,padding:'8px 12px'}}>
            {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:'50%',background:'#6366f1',animation:`bounce 1.2s ${i*.2}s infinite`}}/>)}
          </div>
        )}
        <div ref={msgEnd}/>
      </div>

      {/* Quick prompts */}
      <div style={{padding:'0 12px 8px',display:'flex',gap:6,flexWrap:'wrap',flexShrink:0}}>
        {['Plan my day','Break this task','What should I focus on?'].map(q=>(
          <button key={q} onClick={()=>{setInput(q);setTimeout(()=>sendMessage(),50)}}
            style={{fontSize:10,padding:'4px 10px',borderRadius:20,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',color:'#4b5563',cursor:'pointer',transition:'all .15s',whiteSpace:'nowrap'}}
            onMouseEnter={e=>{e.currentTarget.style.color='#818cf8';e.currentTarget.style.borderColor='rgba(99,102,241,.3)'}}
            onMouseLeave={e=>{e.currentTarget.style.color='#4b5563';e.currentTarget.style.borderColor='rgba(255,255,255,.07)'}}>
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{padding:'10px 12px',borderTop:'1px solid rgba(255,255,255,.07)',display:'flex',gap:8,flexShrink:0}}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendMessage()}
          placeholder="Ask Boom anything..."
          style={{flex:1,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,padding:'9px 12px',color:'#f8fafc',fontSize:13,outline:'none',fontFamily:'DM Sans,sans-serif'}}/>
        <button onClick={startVoice}
          style={{width:36,height:36,borderRadius:11,background:listening?'rgba(244,63,94,.15)':'rgba(255,255,255,.06)',border:`1px solid ${listening?'rgba(244,63,94,.4)':'rgba(255,255,255,.1)'}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,transition:'all .2s'}}>
          {listening?<MicOff size={15} color="#f87171" style={{animation:'pulse 1s ease-in-out infinite'}}/>:<Mic size={15} color="#6b7280"/>}
        </button>
        <button onClick={sendMessage} disabled={sending||!input.trim()}
          style={{width:36,height:36,borderRadius:11,background:'linear-gradient(135deg,#6366f1,#06b6d4)',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',opacity:(!input.trim()||sending)?.5:1,flexShrink:0}}>
          {sending?<Loader2 size={15} style={{animation:'spin 1s linear infinite'}} color="#fff"/>:<Send size={15} color="#fff"/>}
        </button>
      </div>

      <style>{`
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      `}</style>
    </motion.aside>
  )
}
