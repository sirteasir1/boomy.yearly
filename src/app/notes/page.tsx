'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNotes } from '@/lib/hooks/useNotes'
import { useStore } from '@/lib/store/useStore'
import { useLang  } from '@/lib/i18n/useLang'
import { trackNoteCreated, trackNoteRevisited } from '@/lib/bis/collector'
import { Plus, Sparkles, Loader2, Trash2, Pin, PinOff, Search, Check } from 'lucide-react'
import type { Note } from '@/types'
import { generateId, formatDate } from '@/lib/utils'

const TOOLBAR_ITEMS = ['B','I','H1','H2','• List','`Code`']

export default function NotesPage() {
  const { notes, create, update, remove } = useNotes()
  const { user } = useStore()
  const tr       = useLang()

  const [activeId,   setActiveId]  = useState<string|null>(null)
  const [query,      setQuery]     = useState('')
  const [aiPrompt,   setAiPrompt]  = useState('')
  const [aiResp,     setAiResp]    = useState('')
  const [aiLoading,  setAiLoading] = useState(false)
  const [saved,      setSaved]     = useState(false)

  // ── Local state for instant typing (debounced Firestore save) ──
  const [localTitle,   setLocalTitle]   = useState('')
  const [localContent, setLocalContent] = useState('')
  const saveTimerRef = useRef<NodeJS.Timeout>()
  const activeIdRef  = useRef<string|null>(null)

  // Save immediately when navigating away
  useEffect(() => {
    return () => {
      clearTimeout(saveTimerRef.current)
      if (activeIdRef.current) {
        update(activeIdRef.current, { title: localTitle, content: localContent, updatedAt: Date.now() })
      }
    }
  }, [localTitle, localContent])

  const active   = notes.find(n => n.id === activeId)
  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(query.toLowerCase()) ||
    n.content.toLowerCase().includes(query.toLowerCase())
  )

  // Sync local state when switching notes
  useEffect(() => {
    if (active) {
      setLocalTitle(active.title)
      setLocalContent(active.content)
    }
    activeIdRef.current = activeId
  }, [activeId])

  // Set first note as active on load
  useEffect(() => {
    if (notes.length > 0 && !activeId) {
      setActiveId(notes[0].id)
    }
  }, [notes.length])

  const scheduleSave = useCallback((field: 'title'|'content', val: string) => {
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const id = activeIdRef.current
      if (!id) return
      update(id, { [field]: val, updatedAt: Date.now() })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }, 600)
  }, [update])

  const handleTitleChange = (val: string) => {
    setLocalTitle(val)
    scheduleSave('title', val)
  }

  const handleContentChange = (val: string) => {
    setLocalContent(val)
    scheduleSave('content', val)
  }

  const selectNote = (id: string) => {
    // Save current note immediately before switching
    clearTimeout(saveTimerRef.current)
    if (activeId && (localTitle !== active?.title || localContent !== active?.content)) {
      update(activeId, { title: localTitle, content: localContent, updatedAt: Date.now() })
    }
    setActiveId(id)
    setAiResp('')
    if (user) {
      const note = notes.find(n => n.id === id)
      if (note) trackNoteRevisited(user.uid, { noteId: id, wordCount: note.content.split(' ').length })
    }
  }

  const newNote = async () => {
    if (!user) return
    const n: Note = {
      id: generateId(), title: '', content: '', tags: [],
      pinned: false, aiSummary: null,
      createdAt: Date.now(), updatedAt: Date.now(), userId: user.uid,
    }
    await create(n)
    setActiveId(n.id)
    setLocalTitle(''); setLocalContent(''); setAiResp('')
    if (user) trackNoteCreated(user.uid, { noteId: n.id, wordCount: 0 })
  }

  const deleteNote = async () => {
    if (!active) return
    await remove(active.id)
    const remaining = notes.filter(n => n.id !== active.id)
    setActiveId(remaining[0]?.id ?? null)
  }

  const togglePin = () => {
    if (!activeId) return
    update(activeId, { pinned: !active?.pinned, updatedAt: Date.now() })
  }

  const askAI = async () => {
    if (!active) return
    const prompt = aiPrompt.trim() || 'Summarize this note and suggest 3 action items.'
    setAiLoading(true); setAiResp('')
    try {
      const res = await fetch('/api/ai/notes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: localTitle, content: localContent, prompt }),
      })
      const data = await res.json()
      setAiResp(data.response || data.error || 'No response')
    } catch {
      setAiResp('Could not connect to AI. Check your GEMINI_API_KEY.')
    }
    setAiLoading(false); setAiPrompt('')
  }

  const INP: React.CSSProperties = {
    background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)',
    borderRadius:10, padding:'8px 12px', color:'#f8fafc', fontSize:13,
    outline:'none', fontFamily:'DM Sans,sans-serif', transition:'border-color .2s',
  }

  return (
    <div style={{height:'calc(100vh - 112px)', display:'flex', gap:14}}>

      {/* Sidebar */}
      <div style={{width:220, flexShrink:0, background:'rgba(7,7,26,.8)', border:'1px solid rgba(255,255,255,.07)', borderRadius:20, display:'flex', flexDirection:'column', overflow:'hidden'}}>
        <div style={{padding:'12px 12px 8px', borderBottom:'1px solid rgba(255,255,255,.07)'}}>
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
            <div style={{fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:13, flex:1}}>Notes</div>
            <button onClick={newNote}
              style={{width:26, height:26, borderRadius:8, background:'linear-gradient(135deg,#6366f1,#06b6d4)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff'}}>
              <Plus size={14}/>
            </button>
          </div>
          <div style={{position:'relative'}}>
            <Search size={12} style={{position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'#2d3748'}}/>
            <input value={query} onChange={e=>setQuery(e.target.value)}
              placeholder={tr('searchNotes')}
              style={{...INP, width:'100%', paddingLeft:26, fontSize:12, padding:'6px 8px 6px 26px', boxSizing:'border-box'}}/>
          </div>
        </div>
        <div style={{flex:1, overflowY:'auto', padding:8}}>
          {filtered.length === 0 && (
            <div style={{textAlign:'center', padding:'24px 8px', fontSize:12, color:'#2d3748'}}>
              {query ? 'No results' : 'No notes yet'}
            </div>
          )}
          {[...filtered].sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0)).map(note=>(
            <div key={note.id} onClick={()=>selectNote(note.id)}
              style={{padding:'9px', borderRadius:12, cursor:'pointer', marginBottom:3, border:'1px solid',
                borderColor:note.id===activeId?'rgba(99,102,241,.3)':'transparent',
                background:note.id===activeId?'rgba(99,102,241,.1)':'transparent', transition:'all .15s'}}>
              <div style={{display:'flex', alignItems:'flex-start', gap:4}}>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:12, fontWeight:600, color:'#f8fafc', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                    {note.id===activeId ? (localTitle||'Untitled') : (note.title||'Untitled')}
                  </div>
                  <div style={{fontSize:11, color:'#4b5563', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                    {note.id===activeId ? (localContent.slice(0,45)||'Empty') : (note.content.slice(0,45)||'Empty')}
                  </div>
                  <div style={{fontSize:10, color:'#2d3748', marginTop:3}}>{formatDate(note.updatedAt)}</div>
                </div>
                {note.pinned && <Pin size={10} color="#818cf8" style={{flexShrink:0, marginTop:2}}/>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      {activeId ? (
        <div style={{flex:1, background:'rgba(7,7,26,.8)', border:'1px solid rgba(255,255,255,.07)', borderRadius:20, display:'flex', flexDirection:'column', overflow:'hidden'}}>
          {/* Toolbar */}
          <div style={{display:'flex', alignItems:'center', gap:4, padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,.07)', flexWrap:'wrap'}}>
            {TOOLBAR_ITEMS.map(t=>(
              <button key={t}
                style={{fontSize:11, padding:'4px 9px', borderRadius:7, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', color:'#6b7280', cursor:'pointer', transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.color='#f8fafc';e.currentTarget.style.background='rgba(255,255,255,.08)'}}
                onMouseLeave={e=>{e.currentTarget.style.color='#6b7280';e.currentTarget.style.background='rgba(255,255,255,.04)'}}>
                {t}
              </button>
            ))}
            <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:8}}>
              {saved && (
                <span style={{fontSize:11, color:'#34d399', display:'flex', alignItems:'center', gap:4}}>
                  <Check size={12}/> Saved
                </span>
              )}
              <button onClick={togglePin}
                style={{background:'none', border:'none', cursor:'pointer', color:active?.pinned?'#818cf8':'#4b5563', padding:4}}>
                {active?.pinned ? <PinOff size={14}/> : <Pin size={14}/>}
              </button>
              <button onClick={deleteNote}
                style={{background:'none', border:'none', cursor:'pointer', color:'#4b5563', padding:4, transition:'color .15s'}}
                onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.color='#f87171'}}
                onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.color='#4b5563'}}>
                <Trash2 size={14}/>
              </button>
            </div>
          </div>

          {/* Title */}
          <input
            value={localTitle}
            onChange={e=>handleTitleChange(e.target.value)}
            placeholder={tr('untitled')}
            style={{background:'none', border:'none', outline:'none', fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:22, color:'#f8fafc', padding:'16px 20px 6px', width:'100%'}}
          />

          {/* Content — textarea updates local state instantly, Firestore debounced */}
          <textarea
            value={localContent}
            onChange={e=>handleContentChange(e.target.value)}
            placeholder={tr('startWriting')}
            style={{flex:1, background:'none', border:'none', outline:'none', resize:'none', padding:'4px 20px', fontSize:14, color:'#f8fafc', lineHeight:1.85, fontFamily:'DM Sans,sans-serif'}}
          />

          {/* AI panel */}
          <div style={{borderTop:'1px solid rgba(255,255,255,.07)', padding:12, background:'rgba(99,102,241,.02)'}}>
            <div style={{display:'flex', gap:8, marginBottom:aiResp?10:0}}>
              <input value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&askAI()}
                placeholder={tr('askAINote')}
                style={{...INP, flex:1, padding:'9px 12px'}}/>
              <button onClick={askAI} disabled={aiLoading}
                style={{background:'linear-gradient(135deg,#6366f1,#06b6d4)', border:'none', borderRadius:10, padding:'9px 14px', color:'#fff', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:6, opacity:aiLoading?.7:1}}>
                {aiLoading?<Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/>:<Sparkles size={13}/>}Ask
              </button>
            </div>
            <AnimatePresence>
              {aiResp && (
                <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
                  style={{background:'rgba(7,7,26,.9)', border:'1px solid rgba(99,102,241,.2)', borderRadius:12, padding:14, fontSize:13, color:'#94a3b8', lineHeight:1.7, maxHeight:160, overflowY:'auto', whiteSpace:'pre-wrap'}}>
                  {aiResp}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div style={{flex:1, background:'rgba(7,7,26,.8)', border:'1px solid rgba(255,255,255,.07)', borderRadius:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14}}>
          <div style={{fontSize:40, opacity:.12}}>⬭</div>
          <div style={{fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:17, color:'#4b5563'}}>{tr('noNoteSelected')}</div>
          <button onClick={newNote}
            style={{background:'linear-gradient(135deg,#6366f1,#06b6d4)', border:'none', borderRadius:14, padding:'10px 24px', color:'#fff', fontWeight:600, fontSize:13, cursor:'pointer'}}>
            {tr('createANote')}
          </button>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
