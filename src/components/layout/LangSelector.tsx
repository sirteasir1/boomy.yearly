'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe } from 'lucide-react'
import { useStore } from '@/lib/store/useStore'
import type { Lang } from '@/lib/i18n/translations'

const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code:'en', label:'English',   flag:'🇬🇧' },
  { code:'ru', label:'Русский',   flag:'🇷🇺' },
  { code:'kk', label:'Қазақша',   flag:'🇰🇿' },
]

export function LangSelector() {
  const { lang, setLang } = useStore()
  const [open, setOpen] = useState(false)
  const current = LANGS.find(l => l.code === lang)!

  return (
    <div style={{ position:'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display:'flex', alignItems:'center', gap:6, width:34, height:34, borderRadius:10, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', cursor:'pointer', color:'#6b7280', justifyContent:'center', transition:'all .2s' }}
        onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.2)';e.currentTarget.style.color='#f8fafc'}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.08)';e.currentTarget.style.color='#6b7280'}}>
        <Globe size={15}/>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div style={{ position:'fixed', inset:0, zIndex:98 }} onClick={() => setOpen(false)}/>
            <motion.div
              initial={{ opacity:0, y:-8, scale:.95 }}
              animate={{ opacity:1, y:0,  scale:1   }}
              exit={{    opacity:0, y:-8, scale:.95 }}
              transition={{ duration:.18 }}
              style={{ position:'absolute', right:0, top:42, background:'rgba(7,7,26,.98)', border:'1px solid rgba(255,255,255,.12)', borderRadius:14, padding:6, minWidth:160, zIndex:99, backdropFilter:'blur(20px)', boxShadow:'0 16px 48px rgba(0,0,0,.6)' }}>
              {LANGS.map(l => (
                <button key={l.code} onClick={() => { setLang(l.code); setOpen(false) }}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background: lang===l.code?'rgba(99,102,241,.12)':'none', border:'none', cursor:'pointer', borderRadius:9, transition:'all .15s', textAlign:'left' }}
                  onMouseEnter={e=>{ if(lang!==l.code) e.currentTarget.style.background='rgba(255,255,255,.05)' }}
                  onMouseLeave={e=>{ if(lang!==l.code) e.currentTarget.style.background='none' }}>
                  <span style={{ fontSize:18 }}>{l.flag}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight: lang===l.code?600:400, color: lang===l.code?'#818cf8':'#e2e8f0' }}>{l.label}</div>
                    <div style={{ fontSize:10, color:'#4b5563' }}>{l.code.toUpperCase()}</div>
                  </div>
                  {lang === l.code && <div style={{ marginLeft:'auto', width:6, height:6, borderRadius:'50%', background:'#818cf8' }}/>}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
