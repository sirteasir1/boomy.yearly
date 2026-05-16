'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store/useStore'
import { useLang  } from '@/lib/i18n/useLang'
import { db } from '@/lib/firebase/config'
import {
  doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  collection, where, query, limit, serverTimestamp,
  arrayUnion, arrayRemove, onSnapshot,
} from 'firebase/firestore'
import { getInitials } from '@/lib/utils'
import { Users, Copy, Check, RefreshCw, Plus, Search, Loader2, LogOut, Crown, X } from 'lucide-react'

function genCode() { return Math.random().toString(36).substring(2,8).toUpperCase() }

type Member = {
  uid:     string
  name:    string
  email:   string
  role:    'owner' | 'member'
  joinedAt: number
}

type Team = {
  id:        string
  name:      string
  ownerId:   string
  ownerName: string
  members:   Member[]
  inviteCode: string
  createdAt:  number
}

export default function TeamsPage() {
  const { user } = useStore()
  const tr = useLang()

  const [team,       setTeam]      = useState<Team | null>(null)
  const [loading,    setLoading]   = useState(true)
  const [tab,        setTab]       = useState<'members'|'invite'|'goals'>('members')
  const [copied,     setCopied]    = useState(false)
  const [joinCode,   setJoinCode]  = useState('')
  const [joinStatus, setJoinStatus]= useState<'idle'|'loading'|'success'|'error'>('idle')
  const [joinMsg,    setJoinMsg]   = useState('')
  const [searchQ,    setSearchQ]   = useState('')
  const [searchRes,  setSearchRes] = useState<any[]>([])
  const [searching,  setSearching] = useState(false)
  const [creating,   setCreating]  = useState(false)
  const [teamName,   setTeamName]  = useState('')

  // Load user's team on mount
  useEffect(() => {
    if (!user?.uid) return
    setLoading(true)

    // Find team where user is owner or member
    const q = query(
      collection(db, 'teams'),
      where('memberIds', 'array-contains', user.uid),
      limit(1)
    )
    const unsub = onSnapshot(q, snap => {
      if (snap.empty) {
        setTeam(null)
      } else {
        const d = snap.docs[0]
        setTeam({ id: d.id, ...d.data() } as Team)
      }
      setLoading(false)
    }, () => setLoading(false))

    return unsub
  }, [user?.uid])

  // Create new team
  const createTeam = async () => {
    if (!user || !teamName.trim()) return
    setCreating(true)
    const code = genCode()
    const teamId = `team_${user.uid}`
    const newTeam: any = {
      id:         teamId,
      name:       teamName.trim(),
      ownerId:    user.uid,
      ownerName:  user.name,
      inviteCode: code,
      memberIds:  [user.uid],
      members: [{
        uid:      user.uid,
        name:     user.name,
        email:    user.email,
        role:     'owner',
        joinedAt: Date.now(),
      }],
      createdAt: Date.now(),
    }
    await setDoc(doc(db, 'teams', teamId), newTeam)
    await setDoc(doc(db, 'invites', code), {
      teamId, ownerId: user.uid, ownerName: user.name,
      createdAt: serverTimestamp(),
    })
    setCreating(false)
  }

  // Join team by code
  const joinTeam = async () => {
    if (!joinCode.trim() || !user) return
    setJoinStatus('loading')
    try {
      const invSnap = await getDoc(doc(db, 'invites', joinCode.toUpperCase()))
      if (!invSnap.exists()) {
        setJoinStatus('error'); setJoinMsg('Code not found or expired.'); return
      }
      const inv = invSnap.data()
      if (inv.ownerId === user.uid) {
        setJoinStatus('error'); setJoinMsg('That is your own team code!'); return
      }

      const teamRef = doc(db, 'teams', inv.teamId)
      const teamSnap = await getDoc(teamRef)
      if (!teamSnap.exists()) {
        setJoinStatus('error'); setJoinMsg('Team not found.'); return
      }

      const teamData = teamSnap.data()
      if (teamData.memberIds?.includes(user.uid)) {
        setJoinStatus('error'); setJoinMsg('You are already in this team.'); return
      }
      if ((teamData.memberIds?.length ?? 0) >= 4) {
        setJoinStatus('error'); setJoinMsg('Team is full (max 4 members).'); return
      }

      const newMember: Member = {
        uid: user.uid, name: user.name ?? 'User',
        email: user.email ?? '', role: 'member', joinedAt: Date.now(),
      }

      await updateDoc(teamRef, {
        memberIds: arrayUnion(user.uid),
        members:   arrayUnion(newMember),
      })

      setJoinStatus('success')
      setJoinMsg(`Joined ${teamData.name}!`)
      setJoinCode('')
      setTimeout(() => setJoinStatus('idle'), 3000)
    } catch (err: any) {
      setJoinStatus('error')
      setJoinMsg('Connection error. Try again.')
    }
  }

  // Leave team
  const leaveTeam = async () => {
    if (!team || !user) return
    if (team.ownerId === user.uid) {
      // Owner deletes team
      await deleteDoc(doc(db, 'teams', team.id))
    } else {
      const me = team.members.find(m => m.uid === user.uid)
      await updateDoc(doc(db, 'teams', team.id), {
        memberIds: arrayRemove(user.uid),
        members:   arrayRemove(me),
      })
    }
  }

  // Regenerate invite code
  const regenCode = async () => {
    if (!team || !user || team.ownerId !== user.uid) return
    const code = genCode()
    await updateDoc(doc(db, 'teams', team.id), { inviteCode: code })
    await setDoc(doc(db, 'invites', code), {
      teamId: team.id, ownerId: user.uid, ownerName: user.name,
      createdAt: serverTimestamp(),
    })
  }

  const copy = () => {
    if (!team) return
    navigator.clipboard.writeText(team.inviteCode).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  const copyLink = () => {
    if (!team) return
    navigator.clipboard.writeText(`${window.location.origin}?join=${team.inviteCode}`).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  // Search users
  const searchUsers = async () => {
    if (!searchQ.trim() || searchQ.length < 2) return
    setSearching(true)
    try {
      const q = query(collection(db,'users'), where('name','>=',searchQ), where('name','<=',searchQ+'\uf8ff'), limit(8))
      const snap = await getDocs(q)
      setSearchRes(snap.docs.map(d=>({uid:d.id,...d.data()})).filter((u:any)=>u.uid!==user?.uid))
    } catch { setSearchRes([]) }
    setSearching(false)
  }

  const MEMBER_COLORS = ['#6366f1','#06b6d4','#f59e0b','#34d399']

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300}}>
      <Loader2 size={24} color="#818cf8" style={{animation:'spin 1s linear infinite'}}/>
    </div>
  )

  // No team yet
  if (!team) return (
    <div style={{maxWidth:600,margin:'0 auto',display:'flex',flexDirection:'column',gap:16}}>
      <div style={{background:'linear-gradient(135deg,rgba(99,102,241,.08),rgba(6,182,212,.04))',border:'1px solid rgba(99,102,241,.18)',borderRadius:24,padding:'36px 32px',textAlign:'center'}}>
        <Users size={40} color="#818cf8" style={{margin:'0 auto 16px'}}/>
        <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:24,color:'#f8fafc',marginBottom:8}}>You are not in a team yet</h2>
        <p style={{fontSize:14,color:'#6b7280',marginBottom:28}}>Create your own workspace or join an existing one with an invite code.</p>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          {/* Create team */}
          <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:18,padding:20}}>
            <div style={{fontWeight:700,fontSize:14,color:'#f8fafc',marginBottom:12}}>Create workspace</div>
            <input value={teamName} onChange={e=>setTeamName(e.target.value)}
              placeholder="Workspace name..."
              style={{width:'100%',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,padding:'10px 14px',color:'#f8fafc',fontSize:13,outline:'none',boxSizing:'border-box',marginBottom:10,fontFamily:'DM Sans,sans-serif'}}
              onFocus={e=>e.currentTarget.style.borderColor='rgba(99,102,241,.5)'}
              onBlur={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.1)'}/>
            <button onClick={createTeam} disabled={creating||!teamName.trim()}
              style={{width:'100%',background:'linear-gradient(135deg,#6366f1,#06b6d4)',border:'none',borderRadius:12,padding:'11px',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',opacity:(!teamName.trim()||creating)?.5:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              {creating&&<Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/>}
              Create
            </button>
          </div>

          {/* Join team */}
          <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:18,padding:20}}>
            <div style={{fontWeight:700,fontSize:14,color:'#f8fafc',marginBottom:12}}>Join workspace</div>
            <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase().slice(0,6))}
              placeholder="Enter code..."
              style={{width:'100%',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,padding:'10px 14px',color:'#f8fafc',fontSize:18,outline:'none',boxSizing:'border-box',marginBottom:10,fontFamily:'JetBrains Mono,monospace',fontWeight:700,letterSpacing:4,textAlign:'center'}}
              onKeyDown={e=>e.key==='Enter'&&joinTeam()}/>
            <button onClick={joinTeam} disabled={joinCode.length<6||joinStatus==='loading'}
              style={{width:'100%',background:'linear-gradient(135deg,#6366f1,#06b6d4)',border:'none',borderRadius:12,padding:'11px',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',opacity:joinCode.length<6?.5:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              {joinStatus==='loading'&&<Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/>}
              Join
            </button>
            {joinMsg&&(
              <div style={{marginTop:8,fontSize:12,color:joinStatus==='success'?'#34d399':'#f87171',textAlign:'center'}}>{joinMsg}</div>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const isOwner = team.ownerId === user?.uid

  return (
    <div style={{maxWidth:900,margin:'0 auto',display:'flex',flexDirection:'column',gap:16}}>
      {/* Header */}
      <div style={{background:'linear-gradient(135deg,rgba(99,102,241,.08),rgba(168,85,247,.05))',border:'1px solid rgba(99,102,241,.18)',borderRadius:24,padding:'20px 24px',display:'flex',alignItems:'center',gap:14}}>
        <div style={{width:50,height:50,borderRadius:18,background:'linear-gradient(135deg,#6366f1,#d946ef)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Users size={22} color="#fff"/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:19,color:'#f8fafc',marginBottom:2}}>{team.name}</div>
          <div style={{fontSize:13,color:'#6b7280'}}>{team.members.length}/4 members · {isOwner?'You are the owner':'Member'}</div>
        </div>
        <button onClick={leaveTeam}
          style={{display:'flex',alignItems:'center',gap:6,background:'rgba(244,63,94,.08)',border:'1px solid rgba(244,63,94,.2)',borderRadius:12,padding:'8px 14px',color:'#f87171',fontSize:12,fontWeight:600,cursor:'pointer'}}>
          <LogOut size={13}/>{isOwner?'Delete team':'Leave'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:4,width:'fit-content'}}>
        {(['members','invite','goals'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{padding:'7px 18px',borderRadius:10,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,transition:'all .2s',textTransform:'capitalize',
              background:tab===t?'rgba(99,102,241,.15)':'transparent',
              color:tab===t?'#818cf8':'#4b5563',
              boxShadow:tab===t?'inset 0 0 0 1px rgba(99,102,241,.3)':'none'}}>
            {t}
          </button>
        ))}
      </div>

      {/* Members tab */}
      {tab==='members'&&(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {/* Search */}
          <div style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:16,padding:16}}>
            <div style={{fontSize:12,fontWeight:600,color:'#f8fafc',marginBottom:10}}>Find people to invite</div>
            <div style={{display:'flex',gap:8}}>
              <div style={{flex:1,position:'relative'}}>
                <Search size={13} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#4b5563'}}/>
                <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchUsers()}
                  placeholder="Search by name..."
                  style={{width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,padding:'10px 14px 10px 36px',color:'#f8fafc',fontSize:13,outline:'none',fontFamily:'DM Sans,sans-serif',boxSizing:'border-box'}}/>
              </div>
              <button onClick={searchUsers} disabled={searching||searchQ.length<2}
                style={{background:'linear-gradient(135deg,#6366f1,#06b6d4)',border:'none',borderRadius:12,padding:'10px 20px',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',opacity:searchQ.length<2?.5:1}}>
                {searching?<Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/>:<Search size={13}/>}
              </button>
            </div>
            <AnimatePresence>
              {searchRes.length>0&&(
                <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} style={{marginTop:10,display:'flex',flexDirection:'column',gap:6}}>
                  {searchRes.map((u:any,i:number)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:12}}>
                      <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#d946ef)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#fff',flexShrink:0}}>
                        {getInitials(u.name||'U')}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:500,color:'#f8fafc'}}>{u.name}</div>
                        <div style={{fontSize:11,color:'#4b5563'}}>{u.email}</div>
                      </div>
                      <button onClick={()=>{setTab('invite')}}
                        style={{fontSize:11,padding:'5px 12px',borderRadius:20,background:'rgba(99,102,241,.12)',border:'1px solid rgba(99,102,241,.25)',color:'#818cf8',cursor:'pointer',fontWeight:600}}>
                        Share code →
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Members list */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:12}}>
            {team.members.map((m,i)=>(
              <motion.div key={m.uid} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*.06}}
                style={{background:'rgba(7,7,26,.8)',border:`1px solid ${m.uid===user?.uid?'rgba(99,102,241,.25)':'rgba(255,255,255,.07)'}`,borderRadius:20,padding:18,display:'flex',alignItems:'center',gap:14}}>
                <div style={{position:'relative',flexShrink:0}}>
                  <div style={{width:46,height:46,borderRadius:'50%',background:`linear-gradient(135deg,${MEMBER_COLORS[i%4]},#6366f1)`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,sans-serif',fontWeight:800,fontSize:16,color:'#fff'}}>
                    {getInitials(m.name||'U')}
                  </div>
                  <div style={{position:'absolute',bottom:0,right:0,width:11,height:11,borderRadius:'50%',background:'#34d399',border:'2px solid #07071a'}}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                    <div style={{fontSize:14,fontWeight:600,color:'#f8fafc',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.name}</div>
                    {m.role==='owner'&&<Crown size={12} color="#f59e0b"/>}
                    {m.uid===user?.uid&&<span style={{fontSize:10,background:'rgba(99,102,241,.15)',color:'#818cf8',borderRadius:20,padding:'1px 7px'}}>You</span>}
                  </div>
                  <div style={{fontSize:11,color:'#4b5563',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.email}</div>
                </div>
              </motion.div>
            ))}

            {/* Empty slots */}
            {Array.from({length:Math.max(0,4-team.members.length)},(_,i)=>(
              <div key={i} onClick={()=>setTab('invite')}
                style={{background:'rgba(255,255,255,.02)',border:'1px dashed rgba(255,255,255,.08)',borderRadius:20,padding:18,display:'flex',alignItems:'center',gap:12,cursor:'pointer',transition:'all .2s'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(99,102,241,.3)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.08)'}}>
                <div style={{width:46,height:46,borderRadius:'50%',background:'rgba(255,255,255,.04)',border:'1px dashed rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Plus size={18} style={{color:'#2d3748'}}/>
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:500,color:'#4b5563'}}>Empty slot</div>
                  <div style={{fontSize:11,color:'#2d3748'}}>Invite teammate →</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite tab */}
      {tab==='invite'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <div style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:20,padding:24}}>
            <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:14,marginBottom:6}}>Team invite code</div>
            <div style={{fontSize:12,color:'#6b7280',marginBottom:20}}>Share this code — valid until regenerated</div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
              <div style={{flex:1,background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.3)',borderRadius:14,padding:'14px 18px',fontFamily:'JetBrains Mono,monospace',fontSize:28,fontWeight:700,letterSpacing:6,color:'#818cf8',textAlign:'center'}}>{team.inviteCode}</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <button onClick={copy} style={{width:40,height:40,borderRadius:12,background:copied?'rgba(52,211,153,.15)':'rgba(255,255,255,.06)',border:`1px solid ${copied?'rgba(52,211,153,.3)':'rgba(255,255,255,.1)'}`,cursor:'pointer',color:copied?'#34d399':'#6b7280',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {copied?<Check size={16}/>:<Copy size={16}/>}
                </button>
                {isOwner&&<button onClick={regenCode} style={{width:40,height:40,borderRadius:12,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',cursor:'pointer',color:'#6b7280',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <RefreshCw size={16}/>
                </button>}
              </div>
            </div>
            <button onClick={copyLink} style={{width:'100%',background:'linear-gradient(135deg,#6366f1,#06b6d4)',border:'none',borderRadius:12,padding:'11px',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              <Copy size={14}/>Copy invite link
            </button>
          </div>

          <div style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:20,padding:24}}>
            <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:14,marginBottom:6}}>Join another workspace</div>
            <div style={{fontSize:12,color:'#6b7280',marginBottom:20}}>Enter a code from a teammate</div>
            <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase().slice(0,6))}
              placeholder="XXXXXX"
              style={{width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,padding:'14px 16px',color:'#f8fafc',fontSize:20,fontFamily:'JetBrains Mono,monospace',fontWeight:700,letterSpacing:6,textAlign:'center',outline:'none',marginBottom:14,boxSizing:'border-box'}}
              onKeyDown={e=>e.key==='Enter'&&joinTeam()}/>
            <button onClick={joinTeam} disabled={joinCode.length<6||joinStatus==='loading'}
              style={{width:'100%',background:'linear-gradient(135deg,#6366f1,#06b6d4)',border:'none',borderRadius:12,padding:'11px',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',opacity:joinCode.length<6?.5:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              {joinStatus==='loading'&&<Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/>}
              Join workspace
            </button>
            {joinMsg&&(
              <div style={{marginTop:12,padding:'10px 14px',borderRadius:12,fontSize:13,fontWeight:500,background:joinStatus==='success'?'rgba(52,211,153,.1)':'rgba(244,63,94,.1)',border:`1px solid ${joinStatus==='success'?'rgba(52,211,153,.3)':'rgba(244,63,94,.25)'}`,color:joinStatus==='success'?'#34d399':'#f87171'}}>
                {joinMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Goals tab */}
      {tab==='goals'&&(
        <div style={{background:'rgba(7,7,26,.8)',border:'1px solid rgba(255,255,255,.07)',borderRadius:20,padding:'48px 24px',textAlign:'center'}}>
          <div style={{fontSize:40,opacity:.12,marginBottom:14}}>🎯</div>
          <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:16,color:'#4b5563',marginBottom:8}}>Team goals coming soon</div>
          <div style={{fontSize:13,color:'#2d3748'}}>Shared goals, OKRs, and team performance tracking.</div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
