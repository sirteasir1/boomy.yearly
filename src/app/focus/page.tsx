'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Pause, RotateCcw, SkipForward, Volume2, VolumeX, MessageSquare, Send, X, Users, CheckSquare, Check, Target } from 'lucide-react'
import { formatTime } from '@/lib/utils'
import { useStore } from '@/lib/store/useStore'
import { saveFocusSession, getFocusSessions } from '@/lib/firebase/firestore'
import { useBIS  } from '@/lib/hooks/useBIS'
import { useLang } from '@/lib/i18n/useLang'
import { trackFocusStarted, trackFocusCompleted } from '@/lib/bis/collector'
import { db } from '@/lib/firebase/config'
import {
  collection, query, where, orderBy, limit,
  onSnapshot, addDoc, serverTimestamp, doc,
  updateDoc, getDocs, getDoc,
} from 'firebase/firestore'
import type { FocusMode, FocusSession } from '@/types'

const MODES_DEF: Record<FocusMode,{secs:number}> = {
  focus:{secs:25*60}, short:{secs:5*60}, long:{secs:15*60},
}
const AMBIENT = [
  {id:'rain',  label:'🌧 Rain',     desc:'Steady rainfall'},
  {id:'ocean', label:'🌊 Ocean',    desc:'Rolling waves'},
  {id:'forest',label:'🌿 Forest',   desc:'Wind & birds'},
  {id:'fire',  label:'🔥 Fireplace',desc:'Crackling fire'},
  {id:'space', label:'🌌 Space',    desc:'Deep cosmos'},
  {id:'lofi',  label:'🎵 Lo-fi',    desc:'Chill beats'},
]
const MEMBER_COLORS = ['#6366f1','#06b6d4','#f59e0b','#34d399','#d946ef']

/* ── Ambient Audio ── */
function useAmbient() {
  const ctxRef=useRef<AudioContext|null>(null); const gainRef=useRef<GainNode|null>(null); const srcRef=useRef<AudioBufferSourceNode|null>(null)
  const [playing,setPlaying]=useState<string|null>(null); const [volume,setVolume]=useState(0.5)
  const stop=useCallback(()=>{try{srcRef.current?.stop()}catch{};srcRef.current=null;setPlaying(null)},[])
  const play=useCallback((id:string)=>{
    if(playing===id){stop();return};stop()
    const ctx=ctxRef.current??(ctxRef.current=new AudioContext())
    const gain=gainRef.current??(()=>{const g=ctx.createGain();g.gain.value=volume;g.connect(ctx.destination);gainRef.current=g;return g})()
    gain.gain.value=volume
    const buf=ctx.createBuffer(2,ctx.sampleRate*4,ctx.sampleRate)
    for(let ch=0;ch<2;ch++){
      const d=buf.getChannelData(ch);let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0
      for(let i=0;i<d.length;i++){
        const w=Math.random()*2-1
        b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.96900*b2+w*.1538520
        b3=.86650*b3+w*.3104856;b4=.55000*b4+w*.5329522;b5=-.7616*b5-w*.0168980
        const p=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*0.11;b6=w*.115926
        d[i]=id==='rain'?p*.9+w*.1:id==='ocean'?p*.6*(1+.3*Math.sin(2*Math.PI*i/ctx.sampleRate*.12)):
             id==='forest'?p*.5*(1+.4*Math.sin(2*Math.PI*i/ctx.sampleRate*.08+ch*1.2)):
             id==='fire'?p*.7*(1+.5*Math.random()*Math.abs(Math.sin(i/ctx.sampleRate*.3))):
             id==='space'?p*.25:p*.4+w*.05
      }
    }
    const src=ctx.createBufferSource();src.buffer=buf;src.loop=true
    const f=ctx.createBiquadFilter()
    if(id==='rain'){f.type='bandpass';f.frequency.value=1200;f.Q.value=1}else if(id==='ocean'){f.type='lowpass';f.frequency.value=600}else if(id==='forest'){f.type='bandpass';f.frequency.value=2000;f.Q.value=.7}else if(id==='fire'){f.type='lowpass';f.frequency.value=900}else if(id==='space'){f.type='lowpass';f.frequency.value=300}else{f.type='lowpass';f.frequency.value=4000}
    src.connect(f);f.connect(gain);src.start();srcRef.current=src;setPlaying(id)
  },[playing,stop,volume])
  const setVol=useCallback((v:number)=>{setVolume(v);if(gainRef.current)gainRef.current.gain.value=v},[])
  useEffect(()=>()=>stop(),[stop])
  return{playing,play,volume,setVol}
}

export default function FocusPage() {
  const {user, timerEndTime, timerRunning, timerMode, setTimer, stopTimer} = useStore()
  const tr     = useLang()
  const router = useRouter()
  const {onSignificantEvent} = useBIS()

  const [mode,     setMode]    = useState<FocusMode>((timerMode as FocusMode)||'focus')
  const [secs,     setSecs]    = useState(() => timerEndTime ? Math.max(0,Math.round((timerEndTime-Date.now())/1000)) : MODES_DEF[(timerMode as FocusMode)||'focus'].secs)
  const [running,  setRunning] = useState(timerRunning)
  const [sessions, setSessions]= useState<FocusSession[]>([])

  // Team state
  const [teamId,      setTeamId]      = useState<string|null>(null)
  const [teamName,    setTeamName]    = useState('')
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [isOwner,     setIsOwner]     = useState(false)
  const [teamGoals,   setTeamGoals]   = useState<any[]>([])
  const [teamTasks,   setTeamTasks]   = useState<any[]>([])

  // Chat
  const [showChat,   setShowChat]    = useState(false)
  const [showTasks,  setShowTasks]   = useState(false)
  const [chatInput,  setChatInput]   = useState('')
  const [messages,   setMessages]    = useState<any[]>([])
  const chatEndRef   = useRef<HTMLDivElement>(null)

  const intervalRef  = useRef<NodeJS.Timeout>()
  const endTimeRef   = useRef<number|null>(timerEndTime)
  const completedRef = useRef(false)
  const { playing, play, volume, setVol } = useAmbient()

  // Sync endTimeRef with store
  useEffect(() => { endTimeRef.current = timerEndTime }, [timerEndTime])

  // Load sessions
  const loadSessions = useCallback(() => {
    if (!user?.uid) return
    getFocusSessions(user.uid).then(setSessions).catch(()=>{})
  },[user?.uid])
  useEffect(()=>{loadSessions()},[loadSessions])

  // Load team
  useEffect(()=>{
    if(!user?.uid)return
    const q=query(collection(db,'teams'),where('memberIds','array-contains',user.uid),limit(1))
    const unsub=onSnapshot(q,snap=>{
      if(!snap.empty){
        const t=snap.docs[0]; const td=t.data()
        setTeamId(t.id); setTeamName(td.name||'Team'); setTeamMembers(td.members||[])
        setIsOwner(td.ownerId===user.uid)
      } else { setTeamId(null); setTeamName(''); setTeamMembers([]); setIsOwner(false) }
    },()=>{})
    return unsub
  },[user?.uid])

  // Team goals (tasks marked as team goals)
  useEffect(()=>{
    if(!teamId||!teamMembers.length)return
    const memberUids=teamMembers.map((m:any)=>m.uid)
    if(!memberUids.length)return
    // Load tasks from all team members
    const q=query(collection(db,'tasks'),where('userId','in',memberUids.slice(0,10)),where('status','!=','done'))
    const unsub=onSnapshot(q,snap=>{
      const tasks=snap.docs.map(d=>({id:d.id,...d.data()}))
      setTeamTasks(tasks)
    },()=>{})
    return unsub
  },[teamId,teamMembers.length])

  // Listen for team sync timer (owner starts → teammates get synced)
  useEffect(()=>{
    if(!teamId||!user?.uid)return
    const unsub=onSnapshot(doc(db,'teams',teamId),snap=>{
      if(!snap.exists())return
      const data=snap.data()
      // If there's an active focus session from someone else → sync
      if(data.activeFocus && data.activeFocus.startedBy !== user.uid){
        const {endTime, mode: fMode} = data.activeFocus
        if(endTime > Date.now() && !timerRunning){
          const remSecs = Math.max(0, Math.round((endTime - Date.now()) / 1000))
          setSecs(remSecs)
          setMode(fMode || 'focus')
          setRunning(true)
          setTimer(endTime, fMode||'focus', true)
        }
      }
    },()=>{})
    return unsub
  },[teamId, user?.uid])

  // Chat messages
  useEffect(()=>{
    if(!teamId)return
    const q=query(collection(db,'focus_messages'),where('teamId','==',teamId),orderBy('createdAt','asc'),limit(100))
    const unsub=onSnapshot(q,snap=>{
      setMessages(snap.docs.map(d=>({id:d.id,...d.data()})))
    },err=>{
      const q2=query(collection(db,'focus_messages'),where('teamId','==',teamId),limit(100))
      onSnapshot(q2,snap2=>{
        const msgs=snap2.docs.map(d=>({id:d.id,...d.data()}))
        msgs.sort((a:any,b:any)=>(a.createdAt?.seconds??0)-(b.createdAt?.seconds??0))
        setMessages(msgs)
      })
    })
    return unsub
  },[teamId])

  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:'smooth'})},[messages])

  // Visibility sync
  useEffect(()=>{
    const fn=()=>{
      if(!document.hidden&&running&&endTimeRef.current)
        setSecs(Math.max(0,Math.round((endTimeRef.current-Date.now())/1000)))
    }
    document.addEventListener('visibilitychange',fn)
    return()=>document.removeEventListener('visibilitychange',fn)
  },[running])

  // Timer tick
  useEffect(()=>{
    if(running){
      completedRef.current=false
      intervalRef.current=setInterval(()=>{
        if(!endTimeRef.current)return
        const rem=Math.max(0,Math.round((endTimeRef.current-Date.now())/1000))
        setSecs(rem)
        if(rem<=0&&!completedRef.current){
          completedRef.current=true; clearInterval(intervalRef.current); setRunning(false); stopTimer()
          if(user){
            const mins=Math.round(MODES_DEF[mode].secs/60)
            saveFocusSession({userId:user.uid,duration:MODES_DEF[mode].secs,mode,completed:true,date:new Date().toISOString().slice(0,10),createdAt:Date.now()})
              .then(()=>loadSessions()).catch(()=>{})
            trackFocusCompleted(user.uid,{sessionMinutes:mins,plannedMinutes:mins,abandoned:false})
            onSignificantEvent()
          }
          setSecs(MODES_DEF[mode==='focus'?'short':'focus'].secs)
          setMode(m=>m==='focus'?'short':'focus')
        }
      },250)
    } else clearInterval(intervalRef.current)
    return()=>clearInterval(intervalRef.current)
  },[running,mode])

  const switchMode=(m:FocusMode)=>{setMode(m);setSecs(MODES_DEF[m].secs);setRunning(false);endTimeRef.current=null;stopTimer()}

  const handlePlayPause=async()=>{
    if(!running){
      const endTime=Date.now()+secs*1000
      endTimeRef.current=endTime
      setTimer(endTime, mode, true)
      if(user) trackFocusStarted(user.uid,{plannedMinutes:Math.round(MODES_DEF[mode].secs/60),ambientSound:playing??undefined})

    } else {
      setTimer(endTimeRef.current, mode, false)
  
    }
    setRunning(r=>!r)
  }

  const handleReset=()=>{
    setRunning(false); endTimeRef.current=null; stopTimer(); setSecs(MODES_DEF[mode].secs)

  }
  const handleSkip=()=>{
    if(running&&user) trackFocusCompleted(user.uid,{sessionMinutes:Math.round((MODES_DEF[mode].secs-secs)/60),plannedMinutes:Math.round(MODES_DEF[mode].secs/60),abandoned:true})
    switchMode(mode==='focus'?'short':'focus')
  }

  const sendChat=async()=>{
    if(!chatInput.trim()||!user||!teamId)return
    const text=chatInput; setChatInput('')
    await addDoc(collection(db,'focus_messages'),{teamId,userId:user.uid,userName:user.name??'User',text,createdAt:serverTimestamp()})
  }

  const completeTask=async(taskId:string)=>{
    await updateDoc(doc(db,'tasks',taskId),{status:'done',updatedAt:Date.now()})
  }

  const today=new Date().toISOString().slice(0,10)
  const todaySess=sessions.filter(s=>s.date===today&&s.completed)
  const todayMins=todaySess.reduce((a,s)=>a+Math.round(s.duration/60),0)
  const pct=1-secs/MODES_DEF[mode].secs
  const C=2*Math.PI*90
  const streak=(()=>{let c=0;const t=new Date();for(let i=0;i<30;i++){const d=new Date(t);d.setDate(d.getDate()-i);if(sessions.some(s=>s.date===d.toISOString().slice(0,10)&&s.completed))c++;else if(i>0)break;}return c})()
  const weekStreak=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));return sessions.some(s=>s.date===d.toISOString().slice(0,10)&&s.completed)})
  const LABELS:Record<FocusMode,string>={focus:tr('deepFocus'),short:tr('shortBreak'),long:tr('longBreak')}

  return (
    <div style={{maxWidth:900,margin:'0 auto',display:'flex',flexDirection:'column',gap:16}}>
      {/* Timer */}
      <div style={{background:'linear-gradient(135deg,rgba(99,102,241,.08),rgba(6,182,212,.04))',border:'1px solid rgba(99,102,241,.18)',borderRadius:24,padding:'28px 24px',textAlign:'center'}}>
        <div style={{display:'flex',justifyContent:'center',gap:8,marginBottom:24}}>
          {(Object.keys(MODES_DEF) as FocusMode[]).map(k=>(
            <button key={k} onClick={()=>switchMode(k)}
              style={{padding:'8px 20px',borderRadius:20,border:'1px solid',fontSize:13,fontWeight:600,cursor:'pointer',transition:'all .2s',background:mode===k?'linear-gradient(135deg,#6366f1,#06b6d4)':'rgba(255,255,255,.04)',borderColor:mode===k?'transparent':'rgba(255,255,255,.1)',color:mode===k?'#fff':'#6b7280'}}>
              {LABELS[k]}
            </button>
          ))}
        </div>

        <div style={{position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:20}}>
          <svg width={220} height={220} style={{transform:'rotate(-90deg)'}}>
            <circle cx={110} cy={110} r={90} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={10}/>
            <circle cx={110} cy={110} r={90} fill="none" stroke="url(#tg)" strokeWidth={10} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C*(1-pct)} style={{transition:'stroke-dashoffset .3s ease'}}/>
            <defs><linearGradient id="tg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#22d3ee"/></linearGradient></defs>
          </svg>
          <div style={{position:'absolute',textAlign:'center'}}>
            <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:46,fontWeight:500,color:'#f8fafc',letterSpacing:3}}>{formatTime(secs)}</div>
            <div style={{fontSize:12,color:'#4b5563',marginTop:4}}>{LABELS[mode]}</div>
          </div>
        </div>

        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:14,marginBottom:16}}>
          <button onClick={handleReset} style={{width:44,height:44,borderRadius:'50%',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#6b7280'}}><RotateCcw size={18}/></button>
          <button onClick={handlePlayPause} style={{width:60,height:60,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#06b6d4)',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#fff',boxShadow:'0 8px 28px rgba(99,102,241,.45)'}}>
            {running?<Pause size={24}/>:<Play size={24} style={{marginLeft:3}}/>}
          </button>
          <button onClick={handleSkip} style={{width:44,height:44,borderRadius:'50%',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#6b7280'}}><SkipForward size={18}/></button>
        </div>

        <div style={{fontSize:13,color:'#4b5563',marginBottom:14}}>
          {tr('sessions')}: <span style={{color:'#818cf8',fontWeight:700,fontFamily:'JetBrains Mono,monospace'}}>{todaySess.length}</span>
          <span style={{margin:'0 12px',color:'#2d3748'}}>·</span>
          {tr('totalLabel')}: <span style={{color:'#22d3ee',fontWeight:700,fontFamily:'JetBrains Mono,monospace'}}>{todayMins}m</span>
        </div>

        {/* Team presence */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,flexWrap:'wrap'}}>
          {/* You */}
          <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:20,padding:'5px 12px'}}>
            <div style={{width:20,height:20,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#d946ef)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:800,color:'#fff'}}>{user?.name?.slice(0,2).toUpperCase()||'YO'}</div>
            <span style={{fontSize:11,color:'#6b7280'}}>You{isOwner?' · Owner':''}</span>
            <div style={{width:5,height:5,borderRadius:'50%',background:running?'#34d399':'#4b5563'}}/>
          </div>

          {/* Team members - clickable to profile */}
          {teamMembers.filter(m=>m.uid!==user?.uid).map((m,i)=>(
            <div key={m.uid} onClick={()=>router.push(`/profile/${m.uid}`)}
              style={{display:'flex',alignItems:'center',gap:6,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:20,padding:'5px 12px',cursor:'pointer',transition:'all .2s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(99,102,241,.3)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.07)'}}>
              <div style={{width:20,height:20,borderRadius:'50%',background:`linear-gradient(135deg,${MEMBER_COLORS[i%5]},#6366f1)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:800,color:'#fff'}}>
                {(m.name||'U').slice(0,2).toUpperCase()}
              </div>
              <span style={{fontSize:11,color:'#6b7280'}}>{m.name?.split(' ')[0]}</span>
            </div>
          ))}

          {/* Owner sync badge */}
          {isOwner&&teamId&&(
            <div style={{fontSize:10,color:'#818cf8',background:'rgba(99,102,241,.08)',border:'1px solid rgba(99,102,241,.2)',borderRadius:20,padding:'3px 10px'}}>
              {running ? '⚡ Syncing team' : '👑 Owner'}
            </div>
          )}

          {/* Team tasks button */}
          {teamId&&(
            <button onClick={()=>setShowTasks(t=>!t)}
              style={{display:'flex',alignItems:'center',gap:5,background:showTasks?'rgba(52,211,153,.1)':'rgba(255,255,255,.04)',border:`1px solid ${showTasks?'rgba(52,211,153,.3)':'rgba(255,255,255,.08)'}`,borderRadius:20,padding:'5px 12px',fontSize:11,fontWeight:600,color:showTasks?'#34d399':'#6b7280',cursor:'pointer',transition:'all .2s'}}>
              <CheckSquare size={11}/>Tasks {teamTasks.length>0&&`(${teamTasks.length})`}
            </button>
          )}

          {/* Chat button */}
          {teamId&&(
            <button onClick={()=>setShowChat(c=>!c)}
              style={{display:'flex',alignItems:'center',gap:5,background:showChat?'rgba(99,102,241,.12)':'rgba(255,255,255,.04)',border:`1px solid ${showChat?'rgba(99,102,241,.3)':'rgba(255,255,255,.08)'}`,borderRadius:20,padding:'5px 12px',fontSize:11,fontWeight:600,color:showChat?'#818cf8':'#6b7280',cursor:'pointer',transition:'all .2s'}}>
              <MessageSquare size={11}/>{teamName} Chat
              {messages.length>0&&<span style={{background:'#6366f1',color:'#fff',borderRadius:10,padding:'1px 6px',fontSize:9}}>{messages.length}</span>}
            </button>
          )}
        </div>
      </div>

      {/* Team Tasks Panel */}
      {showTasks&&teamId&&(
        <div style={{background:'rgba(7,7,26,.9)',border:'1px solid rgba(52,211,153,.2)',borderRadius:20,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,.07)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <CheckSquare size={14} color="#34d399"/>
              <span style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:13,color:'#f8fafc'}}>{teamName} — Active Tasks</span>
              <span style={{fontSize:11,color:'#4b5563'}}>{teamTasks.length} open</span>
            </div>
            <button onClick={()=>setShowTasks(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#4b5563'}}><X size={14}/></button>
          </div>
          <div style={{maxHeight:260,overflowY:'auto',padding:'8px 0'}}>
            {teamTasks.length===0&&(
              <div style={{textAlign:'center',fontSize:12,color:'#2d3748',padding:'20px 0'}}>No open tasks in the team</div>
            )}
            {teamTasks.map((task:any,i:number)=>{
              const member=teamMembers.find((m:any)=>m.uid===task.userId)
              const memberIdx=teamMembers.findIndex((m:any)=>m.uid===task.userId)
              const color=MEMBER_COLORS[memberIdx%5]||'#6366f1'
              return (
                <div key={task.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',borderBottom:i<teamTasks.length-1?'1px solid rgba(255,255,255,.04)':'none',transition:'background .15s'}}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.02)'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
                  <button onClick={()=>completeTask(task.id)}
                    style={{width:18,height:18,borderRadius:5,border:`1px solid ${color}40`,background:`${color}10`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .2s'}}
                    onMouseEnter={e=>{e.currentTarget.style.background=`${color}30`}}
                    onMouseLeave={e=>{e.currentTarget.style.background=`${color}10`}}>
                    <Check size={10} color={color}/>
                  </button>
                  <div style={{flex:1,fontSize:13,color:'#e2e8f0'}}>{task.title}</div>
                  <div style={{display:'flex',alignItems:'center',gap:5}}>
                    <div style={{width:16,height:16,borderRadius:'50%',background:`linear-gradient(135deg,${color},#6366f1)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,fontWeight:800,color:'#fff'}}>
                      {(member?.name||'U').slice(0,2).toUpperCase()}
                    </div>
                    <span style={{fontSize:10,color:'#4b5563'}}>{member?.name?.split(' ')[0]||'?'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Chat Panel */}
      {showChat&&teamId&&(
        <div style={{background:'rgba(7,7,26,.9)',border:'1px solid rgba(99,102,241,.2)',borderRadius:20,overflow:'hidden',display:'flex',flexDirection:'column',maxHeight:340}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,.07)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <MessageSquare size={14} color="#818cf8"/>
              <span style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:13,color:'#f8fafc'}}>{teamName} Focus Chat</span>
            </div>
            <button onClick={()=>setShowChat(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#4b5563'}}><X size={14}/></button>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:12,display:'flex',flexDirection:'column',gap:8}}>
            {messages.length===0&&<div style={{textAlign:'center',fontSize:12,color:'#2d3748',padding:'16px 0'}}>No messages yet 👋</div>}
            {messages.map((m:any,i:number)=>{
              const isMe=m.userId===user?.uid
              const memberIdx=teamMembers.findIndex((tm:any)=>tm.uid===m.userId)
              const color=MEMBER_COLORS[memberIdx%5]||'#6366f1'
              return (
                <div key={m.id||i} style={{display:'flex',justifyContent:isMe?'flex-end':'flex-start',gap:6,alignItems:'flex-end'}}>
                  {!isMe&&<div style={{width:22,height:22,borderRadius:'50%',background:`linear-gradient(135deg,${color},#6366f1)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:800,color:'#fff',flexShrink:0}}>{(m.userName||'U').slice(0,2).toUpperCase()}</div>}
                  <div style={{maxWidth:'75%'}}>
                    {!isMe&&<div style={{fontSize:10,color:'#4b5563',marginBottom:3}}>{m.userName}</div>}
                    <div style={{padding:'8px 12px',borderRadius:isMe?'14px 14px 4px 14px':'14px 14px 14px 4px',fontSize:13,background:isMe?'linear-gradient(135deg,#6366f1,#06b6d4)':'rgba(255,255,255,.06)',color:'#f8fafc',border:isMe?'none':'1px solid rgba(255,255,255,.07)'}}>
                      {m.text}
                    </div>
                    {m.createdAt?.seconds&&<div style={{fontSize:9,color:'#2d3748',marginTop:2,textAlign:isMe?'right':'left'}}>{new Date(m.createdAt.seconds*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>}
                  </div>
                </div>
              )
            })}
            <div ref={chatEndRef}/>
          </div>
          <div style={{padding:10,borderTop:'1px solid rgba(255,255,255,.07)',display:'flex',gap:8,flexShrink:0}}>
            <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat()}}}
              placeholder={`Message ${teamName}...`}
              style={{flex:1,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',borderRadius:12,padding:'9px 12px',color:'#f8fafc',fontSize:13,outline:'none',fontFamily:'DM Sans,sans-serif'}}/>
            <button onClick={sendChat} disabled={!chatInput.trim()}
              style={{width:36,height:36,borderRadius:11,background:'linear-gradient(135deg,#6366f1,#06b6d4)',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',opacity:!chatInput.trim()?.5:1,flexShrink:0}}>
              <Send size={14} color="#fff"/>
            </button>
          </div>
        </div>
      )}

      {/* Streak + Ambient */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:20,padding:20}}>
          <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:13,marginBottom:14}}>{tr('weeklyStreak')}</div>
          <div style={{display:'flex',gap:6,marginBottom:10}}>
            {['M','T','W','T','F','S','S'].map((d,i)=>(
              <div key={i} style={{flex:1,height:36,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,background:weekStreak[i]?'linear-gradient(135deg,#6366f1,#06b6d4)':'rgba(255,255,255,.04)',color:weekStreak[i]?'#fff':'#4b5563'}}>{d}</div>
            ))}
          </div>
          <div style={{fontSize:12,color:'#6b7280'}}>
            {streak>0?<span style={{color:'#34d399',fontWeight:600}}>{streak}-day streak 🔥</span>:<span style={{color:'#4b5563'}}>Complete a session to start</span>}
          </div>
        </div>
        <div style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:20,padding:20}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:13}}>{tr('ambientSounds')}</div>
            {playing&&<div style={{display:'flex',alignItems:'center',gap:5}}>
              <VolumeX size={12} color="#4b5563"/>
              <input type="range" min={0} max={1} step={0.05} value={volume} onChange={e=>setVol(parseFloat(e.target.value))} style={{width:56,accentColor:'#6366f1'}}/>
              <Volume2 size={12} color="#818cf8"/>
            </div>}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
            {AMBIENT.map(s=>(
              <button key={s.id} onClick={()=>play(s.id)}
                style={{padding:'8px 10px',borderRadius:10,border:'1px solid',cursor:'pointer',transition:'all .2s',textAlign:'left',background:playing===s.id?'rgba(99,102,241,.15)':'rgba(255,255,255,.03)',borderColor:playing===s.id?'rgba(99,102,241,.45)':'rgba(255,255,255,.07)'}}>
                <div style={{fontSize:12,fontWeight:600,color:playing===s.id?'#818cf8':'#94a3b8',marginBottom:1}}>{s.label}</div>
                <div style={{fontSize:10,color:'#4b5563'}}>{playing===s.id?'▶ Playing':s.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
