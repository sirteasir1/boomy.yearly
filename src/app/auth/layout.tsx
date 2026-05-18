'use client'
import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Brain, Target, Zap, BarChart3, Check } from 'lucide-react'
import Link from 'next/link'

const FEATURES = [
  { icon: Brain,    label:'AI Day Planner',    desc:'Claude builds your perfect day' },
  { icon: Target,   label:'Smart Task Engine', desc:'Kanban + AI breakdown' },
  { icon: Zap,      label:'Focus Rooms',       desc:'Deep work with your team' },
  { icon: BarChart3, label:'Deep Analytics',   desc:'Heatmaps & streak insights' },
]

const STATS = [
  { val:'100k+', label:'Users' },
  { val:'89%',  label:'Goal rate' },
  { val:'4.2h', label:'Avg focus' },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-grid" style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      background: '#020209',
    }}>

      {/* ── LEFT: info panel ── */}
      <div className="hidden md:flex" style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'rgba(4,4,18,0.97)',
        borderRight: '1px solid rgba(255,255,255,.07)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 52px',
      }}>
        {/* Subtle bg gradient */}
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,.12) 0%, transparent 65%), radial-gradient(ellipse at 80% 20%, rgba(6,182,212,.08) 0%, transparent 60%)', pointerEvents:'none' }}/>

        <div style={{ position:'relative', zIndex:1 }}>
          {/* Logo */}
          <motion.div initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{duration:.2}}
            style={{ display:'flex', alignItems:'center', gap:12, marginBottom:52 }}>
            <Link href="/" style={{ display:'flex', alignItems:'center', gap:12, textDecoration:'none' }}>
              <img src="/logo-symbol.jpg" alt="Boomly" style={{ width:40,height:40,borderRadius:14,objectFit:'cover',boxShadow:'0 0 20px rgba(99,102,241,.4)' }}/>
              <span style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:22,color:'#f8fafc' }}>Boomly</span>
            </Link>
          </motion.div>

          {/* Headline */}
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.1,duration:.25}}>
            <h2 style={{ fontFamily:'Syne,sans-serif',fontWeight:900,fontSize:40,lineHeight:1.1,color:'#f8fafc',marginBottom:14,letterSpacing:'-1.5px' }}>
              Your AI<br/>
              <span style={{ background:'linear-gradient(90deg,#818cf8,#22d3ee)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent' }}>
                Operating System.
              </span>
            </h2>
            <p style={{ fontSize:15,color:'#6b7280',lineHeight:1.7,marginBottom:40,maxWidth:360 }}>
              Replace 4 productivity apps with one intelligent workspace that thinks alongside you.
            </p>
          </motion.div>

          {/* Features */}
          <div style={{ display:'flex',flexDirection:'column',gap:14,marginBottom:44 }}>
            {FEATURES.map((f,i)=>(
              <motion.div key={i} initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{delay:.15+i*.08,duration:.2}}
                style={{ display:'flex',alignItems:'center',gap:14 }}>
                <div style={{ width:38,height:38,borderRadius:12,background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  <f.icon size={17} color="#818cf8"/>
                </div>
                <div>
                  <div style={{ fontSize:13,fontWeight:600,color:'#f8fafc',marginBottom:1 }}>{f.label}</div>
                  <div style={{ fontSize:12,color:'#4b5563' }}>{f.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Stats */}
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.6}}>
            <div style={{ display:'flex',gap:24,padding:'16px 20px',background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',borderRadius:16 }}>
              {STATS.map((s,i)=>(
                <div key={i} style={{ textAlign:'center',flex:1 }}>
                  <div style={{ fontFamily:'JetBrains Mono,monospace',fontWeight:700,fontSize:22,color:'#818cf8',marginBottom:2 }}>{s.val}</div>
                  <div style={{ fontSize:11,color:'#4b5563' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── RIGHT: form with image bg ── */}
      <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 48px', overflow:'hidden' }}>
        {/* Image background */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/auth-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}/>
        {/* Dark overlay for readability */}
        <div style={{ position:'absolute',inset:0,background:'rgba(2,2,9,0.82)',backdropFilter:'blur(2px)' }}/>
        {/* Gradient overlay — blends bottom with dark */}
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(99,102,241,.08) 0%,transparent 60%,rgba(6,182,212,.06) 100%)' }}/>

        {/* Form */}
        <div style={{ position:'relative',zIndex:2,width:'100%',maxWidth:400 }}>
          {children}
        </div>
      </div>

    </div>
  )
}
