'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore  } from '@/lib/store/useStore'
import { useLang   } from '@/lib/i18n/useLang'
import { db        } from '@/lib/firebase/config'
import { doc, setDoc, getDoc, getDocs, collection, where, query, limit, serverTimestamp, orderBy } from 'firebase/firestore'
import { getInitials } from '@/lib/utils'
import { Users, Copy, Check, RefreshCw, Plus, Search, Loader2 } from 'lucide-react'

function genCode(){ return Math.random().toString(36).substring(2,8).toUpperCase() }

const ST_COLOR: Record<string,string> = { online:'#34d399', away:'#f59e0b', offline:'#4b5563' }

export default function TeamsPage() {
  const { user } = useStore()
  const tr       = useLang()
  const [tab,        setTab]       = useState<'members'|'invite'|'goals'>('members')
  const [inviteCode, setCode]      = useState(genCode)
  const [copied,     setCopied]    = useState(false)
  const [joinCode,   setJoinCode]  = useState('')
  const [joinStatus, setJoinStatus]= useState<'idle'|'loading'|'success'|'error'>('idle')
  const [joinMsg,    setJoinMsg]   = useState('')
  // User search
  const [searchQ,    setSearchQ]   = useState('')
  const [searchRes,  setSearchRes] = useState<any[]>([])
  const [searching,  setSearching] = useState(false)

  const regen = async () => {
    const c = genCode(); setCode(c)
    if (!user) return
    try {
      await setDoc(doc(db,'invites',c),{
        ownerId:user.uid, ownerName:user.name, ownerEmail:user.email,
        createdAt:serverTimestamp(), expiresAt:new Date(Date.now()+7*24*60*60*1000),
      })
    } catch {}
  }

  const copy     = ()=>{ navigator.clipboard.writeText(inviteCode).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),2000) }
  const copyLink = ()=>{ navigator.clipboard.writeText(`${window.location.origin}/join/${inviteCode}`).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),2000) }

  const joinTeam = async () => {
    if(!joinCode.trim()||!user) return
    setJoinStatus('loading')
    try {
      const snap = await getDoc(doc(db,'invites',joinCode.toUpperCase()))
      if(!snap.exists()){ setJoinStatus('error'); setJoinMsg('Code not found or expired.'); return }
      const inv = snap.data()
      if(inv.ownerId===user.uid){ setJoinStatus('error'); setJoinMsg("That's your own code!"); return }
      setJoinStatus('success'); setJoinMsg(`Joined ${inv.ownerName}'s workspace!`); setJoinCode('')
    } catch { setJoinStatus('error'); setJoinMsg('Connection error.') }
    setTimeout(()=>setJoinStatus('idle'),3000)
  }

  // Search users by name or email
  const searchUsers = async () => {
    if(!searchQ.trim()||searchQ.length<2) return
    setSearching(true)
    try {
      // Search by name prefix
      const nameQ = query(
        collection(db,'users'),
        where('name','>=',searchQ),
        where('name','<=',searchQ+'\uf8ff'),
        limit(8)
      )
      const snap = await getDocs(nameQ)
      const results = snap.docs
        .map(d=>({uid:d.id,...d.data()}))
        .filter((u:any)=>u.uid!==user?.uid)
      setSearchRes(results)
    } catch {
      // Fallback: email search if name doesn't work
      try {
        const emailQ = query(collection(db,'users'), where('email','>=',searchQ), where('email','<=',searchQ+'\uf8ff'), limit(5))
        const snap2 = await getDocs(emailQ)
        setSearchRes(snap2.docs.map(d=>({uid:d.id,...d.data()})).filter((u:any)=>u.uid!==user?.uid))
      } catch { setSearchRes([]) }
    }
    setSearching(false)
  }

  return (
    <div style={{maxWidth:900,margin:'0 auto',display:'flex',flexDirection:'column',gap:16}}>

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,rgba(99,102,241,.08),rgba(168,85,247,.05))',border:'1px solid rgba(99,102,241,.18)',borderRadius:24,padding:'22px 24px',display:'flex',alignItems:'center',gap:14}}>
        <div style={{width:50,height:50,borderRadius:18,background:'linear-gradient(135deg,#6366f1,#d946ef)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Users size={22} color="#fff"/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:19,color:'#f8fafc',marginBottom:3}}>
            {user?.name?.split(' ')[0]}'s Workspace
          </div>
          <div style={{fontSize:13,color:'#6b7280'}}>1 / 4 members · <span style={{color:'#818cf8'}}>Team plan</span></div>
        </div>
        <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#d946ef)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#fff'}}>
          {getInitials(user?.name||'U')}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:4,width:'fit-content'}}>
        {(['members','invite','goals'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{padding:'7px 18px',borderRadius:10,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,transition:'all .2s',textTransform:'capitalize',
              background:tab===t?'rgba(99,102,241,.15)':'transparent',
              color:tab===t?'#818cf8':'#4b5563',
              boxShadow:tab===t?'inset 0 0 0 1px rgba(99,102,241,.3)':'none'}}>
            {tr(t as any)||t}
          </button>
        ))}
      </div>

      {/* Members tab — with search */}
      {tab==='members'&&(
        <div>
          {/* Search bar */}
          <div style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:16,padding:16,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:600,color:'#f8fafc',marginBottom:10}}>Find people</div>
            <div style={{display:'flex',gap:8}}>
              <div style={{flex:1,position:'relative'}}>
                <Search size={13} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#4b5563'}}/>
                <input value={searchQ} onChange={e=>setSearchQ(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&searchUsers()}
                  placeholder="Search by name or email..."
                  style={{width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,padding:'10px 14px 10px 36px',color:'#f8fafc',fontSize:13,outline:'none',fontFamily:'DM Sans,sans-serif',boxSizing:'border-box'}}
                  onFocus={e=>e.currentTarget.style.borderColor='rgba(99,102,241,.5)'}
                  onBlur={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.1)'}/>
              </div>
              <button onClick={searchUsers} disabled={searching||searchQ.length<2}
                style={{background:'linear-gradient(135deg,#6366f1,#06b6d4)',border:'none',borderRadius:12,padding:'10px 20px',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6,opacity:searchQ.length<2?.5:1}}>
                {searching?<Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/>:<Search size={13}/>}Search
              </button>
            </div>

            {/* Search results */}
            <AnimatePresence>
              {searchRes.length>0&&(
                <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
                  style={{marginTop:10,display:'flex',flexDirection:'column',gap:6}}>
                  {searchRes.map((u:any,i:number)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:12}}>
                      <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#d946ef)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#fff',flexShrink:0}}>
                        {getInitials(u.name||u.email||'U')}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:500,color:'#f8fafc'}}>{u.name||'Unknown'}</div>
                        <div style={{fontSize:11,color:'#4b5563'}}>{u.email}</div>
                      </div>
                      <button onClick={()=>{ setCode(genCode()); setTab('invite') }}
                        style={{fontSize:11,padding:'5px 12px',borderRadius:20,background:'rgba(99,102,241,.12)',border:'1px solid rgba(99,102,241,.25)',color:'#818cf8',cursor:'pointer',fontWeight:600}}>
                        Invite
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
              {searchQ&&searchRes.length===0&&!searching&&(
                <div style={{marginTop:8,fontSize:12,color:'#4b5563',textAlign:'center'}}>No users found for "{searchQ}"</div>
              )}
            </AnimatePresence>
          </div>

          {/* Members grid */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
            {/* Real user */}
            <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
              style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(99,102,241,.2)',borderRadius:20,padding:18,display:'flex',alignItems:'center',gap:14}}>
              <div style={{position:'relative',flexShrink:0}}>
                <div style={{width:46,height:46,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#d946ef)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,sans-serif',fontWeight:800,fontSize:16,color:'#fff'}}>
                  {getInitials(user?.name||'U')}
                </div>
                <div style={{position:'absolute',bottom:0,right:0,width:11,height:11,borderRadius:'50%',background:'#34d399',border:'2px solid #07071a'}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:'#f8fafc',marginBottom:2}}>
                  {user?.name}
                  <span style={{fontSize:10,background:'rgba(99,102,241,.15)',color:'#818cf8',border:'1px solid rgba(99,102,241,.25)',borderRadius:20,padding:'1px 8px',marginLeft:8}}>Owner</span>
                </div>
                <div style={{fontSize:11,color:'#4b5563'}}>{user?.email}</div>
              </div>
            </motion.div>

            {/* 3 empty invite slots */}
            {[0,1,2].map(i=>(
              <motion.div key={i} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*.05}}
                onClick={()=>setTab('invite')}
                style={{background:'rgba(255,255,255,.02)',border:'1px dashed rgba(255,255,255,.08)',borderRadius:20,padding:18,display:'flex',alignItems:'center',gap:12,cursor:'pointer',transition:'all .2s'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(99,102,241,.3)';e.currentTarget.style.background='rgba(99,102,241,.04)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.08)';e.currentTarget.style.background='rgba(255,255,255,.02)'}}>
                <div style={{width:46,height:46,borderRadius:'50%',background:'rgba(255,255,255,.04)',border:'1px dashed rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Plus size={18} style={{color:'#2d3748'}}/>
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:500,color:'#4b5563'}}>Empty slot</div>
                  <div style={{fontSize:11,color:'#2d3748'}}>Invite a teammate →</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Invite tab */}
      {tab==='invite'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <div style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:20,padding:24}}>
            <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:14,marginBottom:6}}>{tr('yourInviteCode')}</div>
            <div style={{fontSize:12,color:'#6b7280',marginBottom:20}}>{tr('codeValid')}</div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
              <div style={{flex:1,background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.3)',borderRadius:14,padding:'14px 18px',fontFamily:'JetBrains Mono,monospace',fontSize:28,fontWeight:700,letterSpacing:6,color:'#818cf8',textAlign:'center'}}>{inviteCode}</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <button onClick={copy} style={{width:40,height:40,borderRadius:12,background:copied?'rgba(52,211,153,.15)':'rgba(255,255,255,.06)',border:`1px solid ${copied?'rgba(52,211,153,.3)':'rgba(255,255,255,.1)'}`,cursor:'pointer',color:copied?'#34d399':'#6b7280',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {copied?<Check size={16}/>:<Copy size={16}/>}
                </button>
                <button onClick={regen} style={{width:40,height:40,borderRadius:12,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',cursor:'pointer',color:'#6b7280',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <RefreshCw size={16}/>
                </button>
              </div>
            </div>
            <button onClick={copyLink} style={{width:'100%',background:'linear-gradient(135deg,#6366f1,#06b6d4)',border:'none',borderRadius:12,padding:'11px',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              <Copy size={14}/>{tr('copyLink')}
            </button>
          </div>

          <div style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:20,padding:24}}>
            <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:14,marginBottom:6}}>{tr('joinWorkspace')}</div>
            <div style={{fontSize:12,color:'#6b7280',marginBottom:20}}>{tr('enterCodeDesc')}</div>
            <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase().slice(0,6))}
              placeholder="XXXXXX"
              style={{width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,padding:'14px 16px',color:'#f8fafc',fontSize:20,fontFamily:'JetBrains Mono,monospace',fontWeight:700,letterSpacing:6,textAlign:'center',outline:'none',marginBottom:14,boxSizing:'border-box'}}
              onKeyDown={e=>e.key==='Enter'&&joinTeam()}
              onFocus={e=>e.currentTarget.style.borderColor='rgba(99,102,241,.5)'}
              onBlur={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.1)'}/>
            <button onClick={joinTeam} disabled={joinCode.length<6||joinStatus==='loading'}
              style={{width:'100%',background:'linear-gradient(135deg,#6366f1,#06b6d4)',border:'none',borderRadius:12,padding:'11px',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',opacity:joinCode.length<6?.5:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              {joinStatus==='loading'&&<Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/>}
              {tr('joinBtn')}
            </button>
            <AnimatePresence>
              {joinStatus!=='idle'&&joinMsg&&(
                <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                  style={{marginTop:12,padding:'10px 14px',borderRadius:12,fontSize:13,fontWeight:500,
                    background:joinStatus==='success'?'rgba(52,211,153,.1)':'rgba(244,63,94,.1)',
                    border:`1px solid ${joinStatus==='success'?'rgba(52,211,153,.3)':'rgba(244,63,94,.25)'}`,
                    color:joinStatus==='success'?'#34d399':'#f87171'}}>
                  {joinMsg}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Goals tab */}
      {tab==='goals'&&(
        <div style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:20,padding:'48px 24px',textAlign:'center'}}>
          <div style={{fontSize:40,opacity:.12,marginBottom:14}}>🎯</div>
          <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:16,color:'#4b5563',marginBottom:8}}>{tr('noTeamGoals')}</div>
          <div style={{fontSize:13,color:'#2d3748',marginBottom:20}}>{tr('noTeamGoalsDesc')}</div>
          <button onClick={()=>setTab('invite')} style={{background:'linear-gradient(135deg,#6366f1,#06b6d4)',border:'none',borderRadius:12,padding:'10px 24px',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer'}}>
            {tr('inviteTeammatesBtn')}
          </button>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
