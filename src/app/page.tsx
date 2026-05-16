'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { ArrowRight, Zap, Brain, Target, Users, Timer, BarChart3, Check, Star, Play, ChevronRight, Sparkles } from 'lucide-react'

/* ── Ambient canvas bg ─────────────────────────────────── */
function AmbientBg() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    let W: number, H: number
    const resize = () => { W = c.width = window.innerWidth; H = c.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    const orbs = [
      { bx:.08, by:.18, r:500, col:'rgba(99,102,241,', s:.00028, p:0 },
      { bx:.88, by:.12, r:420, col:'rgba(6,182,212,',  s:.00022, p:Math.PI },
      { bx:.45, by:.80, r:380, col:'rgba(168,85,247,', s:.0003,  p:Math.PI/2 },
      { bx:.92, by:.70, r:280, col:'rgba(16,185,129,', s:.00035, p:Math.PI*1.5 },
    ]
    const pts = Array.from({length:50},()=>({ x:Math.random()*3000,y:Math.random()*2000,vx:(Math.random()-.5)*.16,vy:(Math.random()-.5)*.13,r:Math.random()*1.2+.2,a:Math.random()*.1+.02 }))
    let t=0,raf:number
    const draw=()=>{
      ctx.clearRect(0,0,W,H)
      ctx.strokeStyle='rgba(255,255,255,0.016)'; ctx.lineWidth=1
      const g=80
      for(let x=0;x<W;x+=g){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
      for(let y=0;y<H;y+=g){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
      orbs.forEach(o=>{
        const ox=W*(o.bx+Math.sin(t*o.s+o.p)*.07),oy=H*(o.by+Math.cos(t*o.s*1.4+o.p)*.055)
        const gr=ctx.createRadialGradient(ox,oy,0,ox,oy,o.r)
        gr.addColorStop(0,o.col+'0.07)'); gr.addColorStop(1,o.col+'0)')
        ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(ox,oy,o.r,0,Math.PI*2); ctx.fill()
      })
      pts.forEach(p=>{
        p.x+=p.vx; p.y+=p.vy
        if(p.x<0)p.x=W; if(p.x>W)p.x=0; if(p.y<0)p.y=H; if(p.y>H)p.y=0
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2)
        ctx.fillStyle=`rgba(148,163,184,${p.a})`; ctx.fill()
      })
      t++; raf=requestAnimationFrame(draw)
    }
    draw()
    return()=>{ cancelAnimationFrame(raf); window.removeEventListener('resize',resize) }
  },[])
  return <canvas ref={ref} style={{position:'fixed',inset:0,width:'100%',height:'100%',zIndex:0,pointerEvents:'none'}}/>
}

/* ── Navbar ─────────────────────────────────────────────── */
function Navbar() {
  const [scrolled,setScrolled]=useState(false)
  useEffect(()=>{
    const fn=()=>setScrolled(window.scrollY>40)
    window.addEventListener('scroll',fn,{passive:true})
    return()=>window.removeEventListener('scroll',fn)
  },[])
  return (
    <div style={{position:'fixed',top:16,left:'50%',transform:'translateX(-50%)',zIndex:200,width:'min(900px,calc(100vw - 32px))'}}>
      <motion.nav initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} transition={{duration:.5}}
        style={{background:scrolled?'rgba(4,4,20,0.92)':'rgba(7,7,26,0.7)',backdropFilter:'blur(28px)',WebkitBackdropFilter:'blur(28px)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:100,padding:'8px 16px',display:'flex',alignItems:'center',gap:8,boxShadow:scrolled?'0 8px 32px rgba(0,0,0,.5)':'0 4px 24px rgba(0,0,0,.3)',transition:'all .3s'}}>
        <Link href="/" style={{display:'flex',alignItems:'center',gap:9,textDecoration:'none',marginRight:'auto',flexShrink:0}}>
          <img src="/logo-symbol.jpg" alt="Boomly" style={{width:32,height:32,borderRadius:9,objectFit:'cover',flexShrink:0}}/>
          <span style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:17,color:'#f8fafc',letterSpacing:'-.3px'}}>Boomly</span>
        </Link>
        <div className="nav-links-desktop" style={{display:'flex',alignItems:'center',gap:2}}>
          {['Features','Pricing','FAQ'].map(l=>(
            <a key={l} href={`#${l.toLowerCase()}`} style={{fontSize:13,fontWeight:500,color:'#6b7280',textDecoration:'none',padding:'6px 12px',borderRadius:20,transition:'all .2s'}}
              onMouseEnter={e=>{e.currentTarget.style.color='#f8fafc';e.currentTarget.style.background='rgba(255,255,255,.06)'}}
              onMouseLeave={e=>{e.currentTarget.style.color='#6b7280';e.currentTarget.style.background='transparent'}}>{l}</a>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,marginLeft:'auto'}}>
          <Link href="/auth/login" style={{fontSize:13,fontWeight:500,color:'#6b7280',textDecoration:'none',padding:'7px 12px',borderRadius:20,transition:'all .2s'}}
            onMouseEnter={e=>{e.currentTarget.style.color='#f8fafc'}} onMouseLeave={e=>{e.currentTarget.style.color='#6b7280'}}>Sign in</Link>
          <Link href="/auth/signup" style={{fontSize:13,fontWeight:700,background:'linear-gradient(135deg,#6366f1,#06b6d4)',color:'#fff',textDecoration:'none',padding:'8px 18px',borderRadius:20,boxShadow:'0 4px 16px rgba(99,102,241,.4)',whiteSpace:'nowrap'}}>
            Start free →
          </Link>
        </div>
      </motion.nav>
    </div>
  )
}

/* ── Marquee ────────────────────────────────────────────── */
const MARQUEE=[
  {dot:'#818cf8',text:'100+ ambitious users'},
  {dot:'#22d3ee',text:'AI-native from day one'},
  {dot:'#f59e0b',text:'12-day average streak'},
  {dot:'#818cf8',text:'Powered by AI'},
  {dot:'#34d399',text:'89% goal completion rate'},
  {dot:'#22d3ee',text:'4.2h avg daily deep focus'},
  {dot:'#a78bfa',text:'Teams in 40+ countries'},
  {dot:'#818cf8',text:'Built for ambitious people'},
]
function Marquee() {
  const items=[...MARQUEE,...MARQUEE,...MARQUEE]
  return (
    <div style={{overflow:'hidden',borderTop:'1px solid rgba(255,255,255,.06)',borderBottom:'1px solid rgba(255,255,255,.06)',background:'rgba(255,255,255,.02)',padding:'13px 0'}}>
      <div style={{display:'flex',gap:0,animation:'marqueeScroll 28s linear infinite',whiteSpace:'nowrap',width:'max-content'}}>
        {items.map((item,i)=>(
          <span key={i} style={{display:'inline-flex',alignItems:'center',gap:10,padding:'0 32px',fontSize:13,borderRight:'1px solid rgba(255,255,255,.04)'}}>
            <span style={{width:5,height:5,borderRadius:'50%',background:item.dot,display:'inline-block',flexShrink:0}}/>
            <span style={{fontWeight:500,color:'#6b7280'}}>{item.text}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── Learn Video (autoplay on scroll) ─────────────────── */
function LearnVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { video.play().catch(()=>{}) }
        else                       { video.pause() }
      },
      { threshold: 0.35 }
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{borderRadius:24,overflow:'hidden',aspectRatio:'16/9',background:'#000',boxShadow:'0 32px 80px rgba(0,0,0,.7)',border:'1px solid rgba(255,255,255,.07)'}}>
      {/* Положи своё видео в public/ и поменяй src ниже */}
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        style={{width:'100%',height:'100%',display:'block',objectFit:'cover'}}
      >
        <source src="/learn-video.mp4" type="video/mp4"/>
      </video>
    </div>
  )
}

/* ── FAQ ────────────────────────────────────────────────── */
const FAQS=[
  {q:"Is Boomly really free right now?",a:"Yes — completely. We are in early access and all plans are free while we build and grow. No credit card, no hidden fees. Lock in your free access now."},
  {q:"What makes Boomly different from Notion or Todoist?",a:"Boomly is not a storage tool — it is a behavioral AI system. It tracks how you actually work, finds your peak hours and procrastination patterns, and builds personalized plans. Notion remembers your notes. Boomly learns your mind."},
  {q:"What is the Behavioral Intelligence System (BIS)?",a:"BIS is Boomly's core engine. Every task you complete, every focus session, every note — BIS analyzes the patterns. It learns when you are most productive, what triggers procrastination, and builds a model that makes the AI smarter every day."},
  {q:"Which AI model does Boomly use?",a:"Boomly uses advanced AI for all features — day planning, task breakdown, note assistance, and the Boom AI agent. Everything works out of the box, no setup required."},
  {q:"Does it work for teams?",a:"Yes. Teams up to 4 people share a workspace with live focus rooms, team chat, shared goals, a shared calendar, and real-time task sync. Invite teammates with a 6-character code."},
  {q:"How does the Boom AI agent work?",a:"Boom is your AI co-pilot inside the app. It reads your behavioral profile and current tasks, then takes real actions — creating tasks, scheduling events, starting focus sessions. Type or use voice input to talk to it."},
  {q:"Is my data private and secure?",a:"All data lives in Firebase Firestore with strict per-user security rules. Only you can read your tasks, notes, and behavioral data. We never sell or share your data."},
  {q:"Can I use Boomly on mobile?",a:"Boomly is a responsive web app — it works on any modern mobile browser. A dedicated iOS and Android app is on the roadmap for later this year."},
]
function FAQList() {
  const [open,setOpen]=useState<number|null>(null)
  return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      {FAQS.map((item,i)=>(
        <motion.div key={i} initial={{opacity:0,y:14}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:'-40px'}} transition={{delay:i*.05,duration:.45,ease:[.4,0,.2,1]}}>
          <div onClick={()=>setOpen(open===i?null:i)}
            style={{background:open===i?'rgba(99,102,241,.08)':'rgba(255,255,255,.025)',border:`1px solid ${open===i?'rgba(99,102,241,.28)':'rgba(255,255,255,.07)'}`,borderRadius:18,cursor:'pointer',overflow:'hidden',transition:'border-color .3s,background .3s'}}>
            <div style={{display:'flex',alignItems:'center',gap:14,padding:'18px 22px'}}>
              <div style={{width:26,height:26,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:open===i?'linear-gradient(135deg,#6366f1,#06b6d4)':'rgba(255,255,255,.06)',border:open===i?'none':'1px solid rgba(255,255,255,.1)',transition:'all .3s'}}>
                <motion.span animate={{rotate:open===i?45:0}} transition={{duration:.22}} style={{fontSize:16,color:open===i?'#fff':'#6b7280',lineHeight:1,fontWeight:300,display:'block'}}>+</motion.span>
              </div>
              <div style={{flex:1,fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:15,color:open===i?'#f8fafc':'#e2e8f0',letterSpacing:'-.2px'}}>{item.q}</div>
            </div>
            <AnimatePresence initial={false}>
              {open===i&&(
                <motion.div key="a" initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{height:{duration:.28,ease:[.4,0,.2,1]},opacity:{duration:.2}}}>
                  <div style={{padding:'0 22px 20px 66px',fontSize:14,color:'#94a3b8',lineHeight:1.8}}>{item.a}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/* ── Plans ──────────────────────────────────────────────── */
const PLANS=[
  {name:'Personal',badge:'Free forever',highlight:false,oldPrice:null,price:'0',period:'/month',desc:'For individuals ready to level up.',features:['AI Day Planner','Kanban task board','Notes & second brain','Unlimited AI requests','1 workspace','Community support'],cta:'Start free',href:'/auth/signup'},
  {name:'Team',badge:'🎉 Free during Early Access',highlight:true,oldPrice:'25',price:'0',period:'/user/month',desc:'For teams up to 4 people. Free during early access.',features:['Everything in Personal','Unlimited AI requests','Shared workspace','Focus rooms + chat','Shared calendar & goals','BIS analytics'],cta:'Join free →',href:'/auth/signup'},
  {name:'Enterprise',badge:'Coming soon',highlight:false,oldPrice:null,price:'Custom',period:'',desc:'For ambitious companies. Reach out to discuss.',features:['Everything in Team','Custom AI tuning','SSO & SAML auth','SLA guarantee','Dedicated manager','Custom API'],cta:'Contact founder',href:'mailto:rgalbeke@gmail.com'},
]

/* ── Testimonials ────────────────────────────────────────── */
const TESTIMONIALS=[
  {name:'Balbala Amangeldy',role:'Co-Founder @ Boomly',avatar:'SC',color:'#6366f1',stars:5,text:'"Boomly replaced 4 apps for us. The AI planner alone saves me 45 minutes every morning."'},
  {name:'Bakbergen Bekarys',role:'Geography & Geology Olympiad winner',avatar:'MR',color:'#d946ef',stars:5,text:'"The focus rooms changed how our remote team operates. We are shipping faster than ever."'},
  {name:'Zhassulanov Yerassyl',role:'Co-Founder @ OQU',avatar:'PS',color:'#06b6d4',stars:5,text:'"The AI memory feature is mind-blowing. It learns how I think over time and gets more useful every day."'},
  {name:'Abitay Bakdaulet',role:'Designer',avatar:'JL',color:'#f59e0b',stars:5,text:'"I have tried every productivity app. Boomly is the first one that actually understands ambitious people."'},
  {name:'Dinislam Tolebay',role:'Robotics winner',avatar:'AP',color:'#10b981',stars:5,text:'"We onboarded our entire team in one afternoon. Collective focus time went up 60% in the first week."'},
]

/* ── Features ────────────────────────────────────────────── */
const FEATURES=[
  {icon:Brain,   title:'AI Day Planner',      desc:'Claude analyzes your tasks and energy to build your perfect schedule every morning.',      color:'#818cf8'},
  {icon:Target,  title:'Smart Task Engine',   desc:'Kanban board with AI breakdown. Every task gets a clear, achievable plan.',              color:'#22d3ee'},
  {icon:Timer,   title:'Focus Rooms',         desc:'Live collaborative Pomodoro with team presence, streaks, and ambient sounds.',            color:'#a78bfa'},
  {icon:Users,   title:'Team OS',             desc:'Shared goals, workspaces, real-time sync, and focus room chat.',                         color:'#34d399'},
  {icon:BarChart3,title:'Deep Analytics',     desc:'Heatmaps, streaks, focus patterns, and weekly behavior insights.',                       color:'#f59e0b'},
  {icon:Zap,     title:'Boom AI Memory',      desc:'Learns your goals and context — gives smarter, more personal recommendations daily.',    color:'#f472b6'},
]

const FV={hidden:{opacity:0,y:20},visible:(i:number)=>({opacity:1,y:0,transition:{delay:i*.07,duration:.45,ease:[.4,0,.2,1] as any}})}

/* ── Main Page ───────────────────────────────────────────── */
export default function LandingPage() {
  const [billingYearly,setBillingYearly]=useState(false)
  const [activeT,setActiveT]=useState(0)
  const containerRef=useRef<HTMLDivElement>(null)
  const {scrollYProgress}=useScroll({target:containerRef})
  const heroY=useTransform(scrollYProgress,[0,.3],['0%','10%'])

  useEffect(()=>{
    const id=setInterval(()=>setActiveT(a=>(a+1)%TESTIMONIALS.length),4500)
    return()=>clearInterval(id)
  },[])

  return (
    <div ref={containerRef} style={{background:'#020209',minHeight:'100vh',overflowX:'hidden',position:'relative'}}>
      <AmbientBg/>
      <Navbar/>

      {/* ── HERO ── */}
      <section style={{position:'relative',zIndex:1,minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'100px 24px 72px',textAlign:'center'}}>
        {/* Video bg */}
        <div style={{position:'absolute',top:'1%',left:0,right:0,bottom:0,zIndex:-1,overflow:'hidden'}}>
          <video autoPlay muted loop playsInline style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top',opacity:.2,filter:'saturate(1.4) brightness(.75)'}}>
            <source src="https://res.cloudinary.com/dbqafbjoi/video/upload/v1778931184/hero-bg.mp4.mp4" type="video/mp4"/>
          </video>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(2,2,9,1) 0%,rgba(2,2,9,.15) 25%,rgba(2,2,9,.05) 55%,rgba(2,2,9,.8) 85%,rgba(2,2,9,1) 100%)'}}/>
        </div>

        <motion.div style={{y:heroY}} initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:.8,ease:[.4,0,.2,1]}}>
          {/* Early access pill */}
          <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} transition={{delay:.2,duration:.5}}
            style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(52,211,153,.08)',border:'1px solid rgba(52,211,153,.2)',borderRadius:40,padding:'7px 18px',fontSize:12,fontWeight:600,color:'#34d399',marginBottom:40,backdropFilter:'blur(10px)'}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:'#34d399',animation:'aipulse 2s infinite'}}/>
            Early Access — Everything Free
          </motion.div>

          {/* Headline */}
          <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:900,fontSize:'clamp(44px,8vw,90px)',lineHeight:.98,letterSpacing:'-3px',color:'#f8fafc',marginBottom:24,maxWidth:860,margin:'0 auto 24px'}}>
            Your AI<br/>
            <span style={{background:'linear-gradient(135deg,#818cf8 0%,#22d3ee 45%,#a78bfa 80%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundSize:'200% 200%',animation:'gradAnim 4s ease infinite'}}>
              Operating System.
            </span>
          </h1>

          <p style={{fontSize:'clamp(15px,2.2vw,19px)',color:'#6b7280',maxWidth:520,margin:'0 auto 40px',lineHeight:1.8}}>
            Not just a productivity app. An AI workspace that plans your day, learns your patterns, and <strong style={{color:'#94a3b8',fontWeight:500}}>thinks alongside you</strong>.
          </p>

          {/* CTAs */}
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',marginBottom:56,padding:'0 16px'}}>
            <motion.div whileHover={{y:-2,scale:1.02}} whileTap={{scale:.97}}>
              <Link href="/auth/signup" style={{display:'inline-flex',alignItems:'center',gap:8,background:'linear-gradient(135deg,#6366f1,#06b6d4)',color:'#fff',fontWeight:700,fontSize:16,padding:'15px 34px',borderRadius:20,textDecoration:'none',boxShadow:'0 16px 48px rgba(99,102,241,.5)',letterSpacing:'-.2px'}}>
                Start for free <ArrowRight size={17}/>
              </Link>
            </motion.div>
            <motion.div whileHover={{y:-2}} whileTap={{scale:.97}}>
              <Link href="#features" style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.12)',color:'#e2e8f0',fontWeight:600,fontSize:15,padding:'15px 28px',borderRadius:20,textDecoration:'none',backdropFilter:'blur(10px)'}}>
                <Play size={14} fill="currentColor"/> See features
              </Link>
            </motion.div>
          </div>

          {/* Stats strip */}
          <div style={{display:'flex',gap:28,justifyContent:'center',flexWrap:'wrap'}}>
            {[['100+','users'],['89%','goal rate'],['4.2h','avg focus'],['12d','avg streak']].map(([v,l],i)=>(
              <div key={i} style={{textAlign:'center'}}>
                <div style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,fontSize:22,color:'#818cf8'}}>{v}</div>
                <div style={{fontSize:11,color:'#4b5563',textTransform:'uppercase',letterSpacing:'.5px'}}>{l}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── MARQUEE ── */}
      <div style={{position:'relative',zIndex:1}}><Marquee/></div>

      {/* ── FEATURES ── */}
      <section id="features" style={{position:'relative',zIndex:1,maxWidth:1100,margin:'0 auto',padding:'90px 24px'}}>
        <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} style={{textAlign:'center',marginBottom:52}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:'1.8px',textTransform:'uppercase',color:'#818cf8',marginBottom:12}}>✦ FEATURES ✦</div>
          <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:900,fontSize:'clamp(32px,5vw,52px)',letterSpacing:'-2px',color:'#f8fafc',marginBottom:14}}>
            Every tool you need,<br/><span style={{background:'linear-gradient(90deg,#818cf8,#22d3ee)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>supercharged by AI.</span>
          </h2>
        </motion.div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:14}}>
          {FEATURES.map((f,i)=>(
            <motion.div key={i} custom={i} initial="hidden" whileInView="visible" variants={FV} viewport={{once:true}}
              whileHover={{y:-4,boxShadow:'0 20px 60px rgba(0,0,0,.4)',borderColor:'rgba(99,102,241,.3)'}}
              style={{background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.07)',borderRadius:20,padding:24,cursor:'default',transition:'all .3s',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:-30,right:-30,width:100,height:100,borderRadius:'50%',background:f.color,filter:'blur(40px)',opacity:.08,pointerEvents:'none'}}/>
              <motion.div whileHover={{scale:1.1,rotate:5}} transition={{type:'spring',stiffness:300,damping:20}}
                style={{width:46,height:46,borderRadius:15,background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.2)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16}}>
                <f.icon size={21} color={f.color}/>
              </motion.div>
              <h3 style={{fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:16,color:'#f8fafc',marginBottom:8}}>{f.title}</h3>
              <p style={{fontSize:13,color:'#6b7280',lineHeight:1.75}}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── LEARN ── */}
      <section id="learn" style={{position:'relative',zIndex:1,maxWidth:1100,margin:'0 auto',padding:'0 24px 90px'}}>
        <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} style={{marginBottom:40,textAlign:'center'}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:'1.8px',textTransform:'uppercase',color:'#818cf8',marginBottom:12}}>✦ LEARN ✦</div>
          <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:900,fontSize:'clamp(28px,4vw,46px)',letterSpacing:'-2px',color:'#f8fafc'}}>
            Master your <span style={{background:'linear-gradient(90deg,#818cf8,#22d3ee)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>productivity OS.</span>
          </h2>
        </motion.div>
        <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:.6}}>
          <LearnVideo/>
        </motion.div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{position:'relative',zIndex:1,maxWidth:1100,margin:'0 auto',padding:'0 24px 90px'}}>
        <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} style={{textAlign:'center',marginBottom:48}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:'1.8px',textTransform:'uppercase',color:'#818cf8',marginBottom:12}}>✦ PRICING ✦</div>
          <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:900,fontSize:'clamp(32px,5vw,52px)',letterSpacing:'-2px',color:'#f8fafc',marginBottom:16}}>
            Simple, transparent.<br/><span style={{background:'linear-gradient(90deg,#818cf8,#22d3ee)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Start free.</span>
          </h2>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'linear-gradient(135deg,rgba(99,102,241,.1),rgba(6,182,212,.07))',border:'1px solid rgba(99,102,241,.25)',borderRadius:40,padding:'10px 22px'}}>
            <span style={{fontSize:16}}>🎉</span>
            <span style={{fontSize:14,fontWeight:700,color:'#f8fafc'}}>Early Access — All plans completely free right now</span>
            <span style={{fontSize:16}}>🎉</span>
          </div>
          <div style={{display:'flex',justifyContent:'center',marginTop:20}}>
            <div style={{display:'inline-flex',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:50,padding:4,gap:3}}>
              {['Monthly','Yearly'].map(p=>(
                <button key={p} onClick={()=>setBillingYearly(p==='Yearly')}
                  style={{padding:'8px 22px',borderRadius:46,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,transition:'all .25s',background:billingYearly===(p==='Yearly')?'linear-gradient(135deg,#6366f1,#06b6d4)':'transparent',color:billingYearly===(p==='Yearly')?'#fff':'#4b5563',boxShadow:billingYearly===(p==='Yearly')?'0 4px 16px rgba(99,102,241,.4)':'none'}}>
                  {p}{p==='Yearly'&&<span style={{marginLeft:6,fontSize:10,background:'rgba(52,211,153,.2)',color:'#34d399',padding:'2px 7px',borderRadius:8}}>-20%</span>}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16,alignItems:'start'}}>
          {PLANS.map((plan,i)=>(
            <motion.div key={i} custom={i} initial="hidden" whileInView="visible" variants={FV} viewport={{once:true}}
              whileHover={plan.highlight?{y:-5,boxShadow:'0 32px 80px rgba(99,102,241,.2)'}:{y:-3}}
              style={{background:plan.highlight?'linear-gradient(135deg,rgba(99,102,241,.12),rgba(6,182,212,.06))':'rgba(255,255,255,.025)',border:plan.highlight?'2px solid rgba(99,102,241,.4)':'1px solid rgba(255,255,255,.08)',borderRadius:22,padding:26,position:'relative',boxShadow:plan.highlight?'0 0 60px rgba(99,102,241,.1)':'none',transition:'all .3s'}}>
              {plan.badge&&<div style={{position:'absolute',top:-12,left:'50%',transform:'translateX(-50%)',background:plan.highlight?'linear-gradient(135deg,#6366f1,#06b6d4)':'rgba(255,255,255,.08)',color:plan.highlight?'#fff':'#6b7280',fontSize:11,fontWeight:700,padding:'4px 16px',borderRadius:20,whiteSpace:'nowrap',boxShadow:plan.highlight?'0 4px 16px rgba(99,102,241,.4)':'none'}}>{plan.badge}</div>}
              <div style={{marginBottom:22}}>
                <div style={{fontSize:12,fontWeight:700,letterSpacing:'.8px',textTransform:'uppercase',color:plan.highlight?'#818cf8':'#4b5563',marginBottom:12}}>{plan.name}</div>
                <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:6}}>
                  {plan.oldPrice&&(
                    <div style={{position:'relative',display:'inline-block',marginRight:4}}>
                      <span style={{fontFamily:'Syne,sans-serif',fontWeight:900,fontSize:44,color:'rgba(255,255,255,.1)'}}>${plan.oldPrice}</span>
                      <div style={{position:'absolute',top:'50%',left:-4,right:-4,height:3,background:'rgba(244,63,94,.55)',borderRadius:2,transform:'rotate(-12deg)'}}/>
                    </div>
                  )}
                  <span style={{fontFamily:'Syne,sans-serif',fontWeight:900,fontSize:plan.price==='Custom'?30:50,letterSpacing:'-2px',color:'#f8fafc'}}>
                    {plan.price==='Custom'?plan.price:`$${billingYearly&&plan.price!=='0'?Math.round(parseInt(plan.price)*.8):plan.price}`}
                  </span>
                  {plan.period&&<span style={{fontSize:13,color:'#4b5563'}}>{plan.period}</span>}
                </div>
                <p style={{fontSize:13,color:'#6b7280',lineHeight:1.6}}>{plan.desc}</p>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:22}}>
                {plan.features.map((f,j)=>(
                  <div key={j} style={{display:'flex',alignItems:'center',gap:9}}>
                    <div style={{width:17,height:17,borderRadius:'50%',background:plan.highlight?'rgba(99,102,241,.18)':'rgba(255,255,255,.06)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <Check size={9} color={plan.highlight?'#818cf8':'#4b5563'}/>
                    </div>
                    <span style={{fontSize:13,color:plan.highlight?'#94a3b8':'#6b7280'}}>{f}</span>
                  </div>
                ))}
              </div>
              <motion.div whileHover={{scale:1.02,y:-1}} whileTap={{scale:.97}}>
                <Link href={plan.href} style={{display:'block',textAlign:'center',padding:'12px',borderRadius:14,textDecoration:'none',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:14,background:plan.highlight?'linear-gradient(135deg,#6366f1,#06b6d4)':'rgba(255,255,255,.06)',color:'#f8fafc',border:plan.highlight?'none':'1px solid rgba(255,255,255,.1)',boxShadow:plan.highlight?'0 8px 28px rgba(99,102,241,.4)':'none',transition:'all .2s'}}>
                  {plan.cta}
                </Link>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{position:'relative',zIndex:1,padding:'0 24px 90px',overflow:'hidden'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} style={{textAlign:'center',marginBottom:48}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:'1.8px',textTransform:'uppercase',color:'#818cf8',marginBottom:12}}>✦ LOVED BY BUILDERS ✦</div>
            <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:900,fontSize:'clamp(28px,4vw,46px)',letterSpacing:'-2px',color:'#f8fafc'}}>What our users say.</h2>
          </motion.div>
          {/* Featured testimonial */}
          <div style={{position:'relative',minHeight:160,marginBottom:20}}>
            <AnimatePresence mode="wait">
              <motion.div key={activeT} initial={{opacity:0,y:16,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-16,scale:.98}} transition={{duration:.38,ease:[.4,0,.2,1]}}
                style={{background:'linear-gradient(135deg,rgba(99,102,241,.08),rgba(6,182,212,.04))',border:'1px solid rgba(99,102,241,.18)',borderRadius:22,padding:'24px 28px',display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
                <div style={{width:56,height:56,borderRadius:'50%',background:`linear-gradient(135deg,${TESTIMONIALS[activeT].color},#6366f1)`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:18,color:'#fff',flexShrink:0,boxShadow:`0 0 20px ${TESTIMONIALS[activeT].color}50`}}>
                  {TESTIMONIALS[activeT].avatar}
                </div>
                <div style={{flex:1,minWidth:220}}>
                  <div style={{display:'flex',gap:2,marginBottom:8}}>{Array(5).fill(0).map((_,j)=><Star key={j} size={13} color="#f59e0b" fill="#f59e0b"/>)}</div>
                  <p style={{fontSize:15,color:'#e2e8f0',lineHeight:1.7,marginBottom:10,fontStyle:'italic'}}>{TESTIMONIALS[activeT].text}</p>
                  <div><span style={{fontWeight:600,color:'#f8fafc',fontSize:14}}>{TESTIMONIALS[activeT].name}</span><span style={{color:'#4b5563',fontSize:13,marginLeft:8}}>— {TESTIMONIALS[activeT].role}</span></div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <div style={{display:'flex',justifyContent:'center',gap:8,marginBottom:28}}>
            {TESTIMONIALS.map((_,i)=>(
              <button key={i} onClick={()=>setActiveT(i)} style={{width:i===activeT?24:8,height:8,borderRadius:4,border:'none',cursor:'pointer',transition:'all .3s',background:i===activeT?'linear-gradient(90deg,#6366f1,#06b6d4)':'rgba(255,255,255,.15)'}}/>
            ))}
          </div>
          {/* Mini cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}>
            {TESTIMONIALS.map((t,i)=>(
              <motion.div key={i} custom={i} initial="hidden" whileInView="visible" variants={FV} viewport={{once:true}}
                onClick={()=>setActiveT(i)} whileHover={{y:-3}}
                style={{background:i===activeT?'rgba(99,102,241,.08)':'rgba(255,255,255,.025)',border:`1px solid ${i===activeT?'rgba(99,102,241,.25)':'rgba(255,255,255,.07)'}`,borderRadius:14,padding:12,cursor:'pointer',transition:'all .25s'}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:7}}>
                  <div style={{width:24,height:24,borderRadius:'50%',background:`linear-gradient(135deg,${t.color},#6366f1)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:'#fff',flexShrink:0}}>{t.avatar}</div>
                  <div style={{fontSize:11,fontWeight:600,color:'#f8fafc',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.name}</div>
                </div>
                <div style={{display:'flex',gap:1,marginBottom:4}}>{Array(5).fill(0).map((_,j)=><Star key={j} size={9} color="#f59e0b" fill="#f59e0b"/>)}</div>
                <p style={{fontSize:11,color:'#4b5563',lineHeight:1.5,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{t.text.replace(/"/g,'')}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{position:'relative',zIndex:1,padding:'0 24px 90px'}}>
        <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
          style={{maxWidth:860,margin:'0 auto',background:'linear-gradient(135deg,rgba(99,102,241,.1),rgba(6,182,212,.05))',border:'1px solid rgba(99,102,241,.22)',borderRadius:28,padding:'60px 40px',textAlign:'center',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:-80,right:-80,width:300,height:300,borderRadius:'50%',background:'rgba(99,102,241,.12)',filter:'blur(60px)'}}/>
          <div style={{position:'absolute',bottom:-60,left:-60,width:240,height:240,borderRadius:'50%',background:'rgba(6,182,212,.1)',filter:'blur(50px)'}}/>
          <div style={{position:'relative',zIndex:1}}>
            <Sparkles size={36} color="#818cf8" style={{margin:'0 auto 18px'}}/>
            <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:900,fontSize:'clamp(32px,5vw,56px)',letterSpacing:'-2px',color:'#f8fafc',marginBottom:12,lineHeight:1.05}}>
              Focus. Build.<br/>
              <span style={{background:'linear-gradient(90deg,#818cf8,#22d3ee)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Boom.</span>
            </h2>
            <p style={{fontSize:16,color:'#4b5563',marginBottom:32}}>Free forever. No credit card. Launch in 30 seconds.</p>
            <motion.div whileHover={{y:-2,scale:1.02}} whileTap={{scale:.97}} style={{display:'inline-block'}}>
              <Link href="/auth/signup" style={{display:'inline-flex',alignItems:'center',gap:10,background:'linear-gradient(135deg,#6366f1,#06b6d4)',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:17,padding:'17px 48px',borderRadius:20,textDecoration:'none',boxShadow:'0 16px 56px rgba(99,102,241,.5)',letterSpacing:'-.2px'}}>
                Start for free <ArrowRight size={20}/>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── GET IN TOUCH ── */}
      <section style={{position:'relative',zIndex:1,padding:'0 24px 90px'}}>
        <motion.div initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:.6,ease:[.4,0,.2,1]}}
          style={{maxWidth:960,margin:'0 auto',position:'relative',borderRadius:28,overflow:'hidden'}}>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(99,102,241,.08),rgba(6,182,212,.04))'}}/>
          <div style={{position:'absolute',top:-80,right:-80,width:260,height:260,borderRadius:'50%',background:'rgba(99,102,241,.1)',filter:'blur(70px)'}}/>
          <div style={{position:'relative',zIndex:1,border:'1px solid rgba(255,255,255,.08)',borderRadius:28,padding:'44px 40px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:44,alignItems:'center'}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'#818cf8',marginBottom:14}}>✦ GET IN TOUCH ✦</div>
              <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:900,fontSize:'clamp(26px,3.5vw,40px)',letterSpacing:'-1.5px',color:'#f8fafc',marginBottom:14,lineHeight:1.08}}>Questions or<br/>feedback?</h2>
              <p style={{fontSize:15,color:'#6b7280',lineHeight:1.8,marginBottom:24}}>Building in early access and shipping fast. I read every message personally.</p>
              <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(52,211,153,.07)',border:'1px solid rgba(52,211,153,.18)',borderRadius:20,padding:'7px 16px',fontSize:12,color:'#34d399',fontWeight:600}}>
                🎉 All features free · Early Access
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:11}}>
              {[
                {img:'/icon-gmail.jpg',   label:'Email',           val:'rgalbeke@gmail.com',   href:'mailto:rgalbeke@gmail.com',     bg:'rgba(234,67,53,.07)',  border:'rgba(234,67,53,.18)',  hover:'rgba(234,67,53,.12)'},
                {img:'/icon-linkedin.jpg',label:'LinkedIn',        val:'Yerbolat Rgalbek',     href:'https://www.linkedin.com/in/yerbolat-rgalbek-4b524b38b', bg:'rgba(10,102,194,.08)',border:'rgba(10,102,194,.22)',hover:'rgba(10,102,194,.13)'},
                {img:'/icon-phone.jpg',   label:'Phone / WhatsApp',val:'+7 708 764 5571',      href:'tel:+77087645571',              bg:'rgba(52,199,89,.07)', border:'rgba(52,199,89,.18)', hover:'rgba(52,199,89,.12)'},
              ].map((c,i)=>(
                <motion.div key={i} initial={{opacity:0,x:18}} whileInView={{opacity:1,x:0}} viewport={{once:true}} transition={{delay:i*.1,duration:.45}}>
                  <a href={c.href} target="_blank" rel="noreferrer"
                    style={{display:'flex',alignItems:'center',gap:14,padding:'13px 16px',background:c.bg,border:`1px solid ${c.border}`,borderRadius:16,textDecoration:'none',transition:'all .25s'}}
                    onMouseEnter={e=>{e.currentTarget.style.background=c.hover;e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 28px rgba(0,0,0,.25)'}}
                    onMouseLeave={e=>{e.currentTarget.style.background=c.bg;e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}>
                    <img src={c.img} alt={c.label} style={{width:40,height:40,borderRadius:11,objectFit:'cover',flexShrink:0}}/>
                    <div>
                      <div style={{fontSize:10,color:'rgba(255,255,255,.35)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.6px',marginBottom:2}}>{c.label}</div>
                      <div style={{fontSize:14,color:'#f8fafc',fontWeight:600}}>{c.val}</div>
                    </div>
                  </a>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{position:'relative',zIndex:1,maxWidth:820,margin:'0 auto',padding:'0 24px 100px'}}>
        <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} style={{textAlign:'center',marginBottom:48}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:'1.8px',textTransform:'uppercase',color:'#818cf8',marginBottom:12}}>✦ FAQ ✦</div>
          <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:900,fontSize:'clamp(28px,4vw,46px)',letterSpacing:'-2px',color:'#f8fafc'}}>
            Frequently asked<br/><span style={{background:'linear-gradient(90deg,#818cf8,#22d3ee)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>questions.</span>
          </h2>
        </motion.div>
        <FAQList/>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{position:'relative',zIndex:1,borderTop:'1px solid rgba(255,255,255,.05)',padding:'32px 24px'}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <img src="/logo-symbol.jpg" alt="Boomly" style={{width:26,height:26,borderRadius:7,objectFit:'cover'}}/>
            <span style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:15,color:'#4b5563'}}>Boomly</span>
          </div>
          <div style={{display:'flex',gap:20,flexWrap:'wrap',alignItems:'center'}}>
            {['Privacy','Terms'].map(l=><a key={l} href="#" style={{fontSize:13,color:'#2d3748',textDecoration:'none'}}>{l}</a>)}
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3}}>
            <p style={{fontSize:12,color:'#2d3748',margin:0}}>© 2026 Boomly. Built for the most ambitious version of you.</p>
            <p style={{fontSize:12,color:'#4b5563',margin:0}}>Founded by <span style={{color:'#818cf8',fontWeight:600}}>Rgalbek Yerbolat</span> · CEO & Founder</p>
          </div>
        </div>
      </footer>

      {/* ── GLOBAL STYLES ── */}
      <style>{`
        @keyframes gradAnim      { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes aipulse       { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.65)} }
        @keyframes marqueeScroll { from{transform:translateX(0)} to{transform:translateX(-33.333%)} }
        @keyframes floatUp       { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        html { scroll-behavior: smooth; }
        body { overflow-x: hidden; max-width: 100vw; box-sizing: border-box; }
        * { box-sizing: border-box; }
        @media (max-width: 768px) {
          .nav-links-desktop { display: none !important; }
        }
      `}</style>
    </div>
  )
}
