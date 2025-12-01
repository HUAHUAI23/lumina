"use client"

import React, { useEffect, useRef, useState } from 'react'
import {
  Aperture, ArrowRight, Command, Cpu, Globe, Layers,
  PlayCircle, Sparkles, Star,
  Video, Zap
} from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

import { APP_NAME } from '../constants'

// --- Spotlight Card Component ---
const SpotlightCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => {
  const divRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return
    const rect = divRef.current.getBoundingClientRect()
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setOpacity(1)
  }

  const handleMouseLeave = () => {
    setOpacity(0)
  }

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(99,102,241,0.15), transparent 40%)`,
        }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [activePromptIndex, setActivePromptIndex] = useState(0)

  const prompts = [
    "A futuristic city with neon lights...",
    "A cinematic drone shot of a mountain range...",
    "Cyberpunk character design, 8k resolution..."
  ]

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)

    // Prompt rotation
    const interval = setInterval(() => {
      setActivePromptIndex(prev => (prev + 1) % prompts.length)
    }, 4000)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearInterval(interval)
    }
  }, [prompts.length])

  const onNavigate = (page: string) => {
    if (page === 'login') {
      router.push('/login')
    } else if (page === 'home') {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30 overflow-x-hidden font-sans">

      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] h-[80vh] bg-indigo-800/10 blur-[150px] rounded-full mix-blend-screen opacity-60 animate-pulse duration-[8000ms]"></div>
        <div className="absolute top-[20%] left-[10%] w-[40vw] h-[40vh] bg-violet-900/10 blur-[120px] rounded-full mix-blend-screen opacity-40"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vh] bg-blue-900/10 blur-[150px] rounded-full mix-blend-screen opacity-30"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      {/* --- Navigation --- */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigate('home')}>
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-indigo-500/30 blur-md rounded-full opacity-50 group-hover:opacity-80 transition-opacity duration-300"></div>
              <Image src="/icon.svg" alt="Lumina Logo" width={40} height={40} className="relative z-10 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white group-hover:text-indigo-200 transition-colors">{APP_NAME}</span>
          </div>

          <div className="hidden md:flex items-center gap-10 text-sm font-medium text-zinc-400">
            {['Capabilities', 'Showcase', 'Pricing', 'Enterprise'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-white transition-colors relative group">
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-indigo-500 transition-all group-hover:w-full"></span>
              </a>
            ))}
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => onNavigate('login')} className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">Sign in</button>
            <button
              onClick={() => onNavigate('login')}
              className="group relative px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95"
            >
              <span className="relative z-10 flex items-center gap-2">
                Launch App <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="relative pt-44 pb-32 lg:pt-60 lg:pb-48 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium text-indigo-300 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 hover:bg-white/10 transition-colors cursor-pointer backdrop-blur-md">
            <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            Introducing Veo 3.1 & Gemini 2.5 Integration
          </div>

          {/* Title */}
          <h1 className="text-7xl md:text-9xl font-semibold tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-zinc-500 animate-in fade-in slide-in-from-bottom-8 duration-1000 leading-[0.9] md:leading-[0.85]">
            Dream it.<br />
            Stream it.
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-2xl text-zinc-400 max-w-2xl mx-auto mb-14 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150 leading-relaxed font-light">
            The multimodal workspace for the AI age. <br className="hidden md:block" />
            Generate cinematic video and consistent imagery with a single prompt.
          </p>

          {/* Interactive Input Mockup */}
          <div className="max-w-3xl mx-auto relative group animate-in fade-in zoom-in-95 duration-1000 delay-300">
            {/* Glow behind input */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-all duration-1000"></div>

            <div className="relative bg-[#0A0A0A] border border-white/10 rounded-2xl p-2 pl-5 flex items-center shadow-2xl overflow-hidden">
              <div className="mr-4 text-indigo-500 animate-pulse">
                <Sparkles className="w-5 h-5" />
              </div>

              <div className="flex-1 text-left py-4 overflow-hidden relative h-[24px]">
                {/* Animated Text */}
                <div key={activePromptIndex} className="absolute inset-0 flex items-center text-lg text-zinc-300 animate-in slide-in-from-bottom-4 fade-in duration-500">
                  {prompts[activePromptIndex]}
                  <span className="w-0.5 h-5 bg-indigo-500 ml-1 animate-blink"></span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('login')}
                className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition-colors flex items-center gap-2 shrink-0 ml-2"
              >
                Generate <Command className="w-3 h-3 text-zinc-400" />
              </button>
            </div>

            {/* Floating Assets Decoration */}
            <div className="absolute -top-16 -left-12 hidden md:block animate-float-slow">
              <div className="bg-black/80 backdrop-blur border border-white/10 p-2 rounded-xl shadow-2xl rotate-[-6deg]">
                <div className="w-32 h-20 bg-zinc-800 rounded-lg overflow-hidden relative">
                  <Image src="https://picsum.photos/300/200?random=1" alt="Float 1" fill className="object-cover opacity-80" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="p-1 bg-white/20 backdrop-blur rounded-full"><PlayCircle className="w-4 h-4 text-white" /></div>
                  </div>
                </div>
                <div className="mt-2 flex gap-2 items-center">
                  <div className="w-4 h-4 rounded-full bg-indigo-500"></div>
                  <div className="h-2 w-16 bg-zinc-800 rounded"></div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-10 -right-16 hidden md:block animate-float-delayed z-20">
              <div className="bg-black/80 backdrop-blur border border-white/10 p-2 rounded-xl shadow-2xl rotate-[3deg]">
                <div className="w-24 h-24 bg-zinc-800 rounded-lg overflow-hidden relative">
                  <Image src="https://picsum.photos/300/300?random=2" alt="Float 2" fill className="object-cover opacity-80" />
                </div>
                <div className="absolute -top-2 -right-2 bg-green-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full border border-black">New</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Infinite Showcase (Marquee) --- */}
      <section className="py-10 border-y border-white/5 bg-white/[0.02] overflow-hidden relative group">
        <div className="absolute left-0 top-0 w-40 h-full bg-gradient-to-r from-[#050505] to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 w-40 h-full bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none"></div>

        <div className="flex gap-4 animate-scroll w-max hover:[animation-play-state:paused]">
          {/* Duplicate array for seamless loop */}
          {[...Array(16)].map((_, i) => (
            <div key={i} className="w-[320px] aspect-[16/9] rounded-xl overflow-hidden border border-white/5 bg-zinc-900 relative cursor-pointer hover:border-white/20 transition-colors">
              <Image src={`https://picsum.photos/640/360?random=${i + 50}`} alt={`Showcase ${i}`} fill className="object-cover opacity-60 hover:opacity-100 hover:scale-105 transition-all duration-700 grayscale hover:grayscale-0" />
              <div className="absolute bottom-3 left-3 flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity duration-300">
                <span className="px-2 py-1 bg-black/60 backdrop-blur border border-white/10 rounded text-[10px] font-medium text-white">Veo 3.1</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- Bento Grid Features --- */}
      <section className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-24 md:text-center max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tighter">
              Everything you need to <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">create the impossible.</span>
            </h2>
            <p className="text-xl text-zinc-400">Lumina unifies state-of-the-art multimodal models into a single, intuitive workflow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px] md:auto-rows-[350px]">

            {/* Card 1: Main Video */}
            <SpotlightCard className="md:col-span-2 md:row-span-2 group">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10"></div>
              <Image src="https://picsum.photos/1200/1200?random=99" alt="Feature 1" fill className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000" />

              <div className="absolute inset-0 p-10 flex flex-col justify-end z-20">
                <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 text-white mb-6">
                  <Video className="w-7 h-7" />
                </div>
                <h3 className="text-3xl font-bold mb-3 text-white">Generative Video</h3>
                <p className="text-zinc-300 text-lg max-w-md">Powered by Veo 3.1. Create high-fidelity 1080p clips with complex motion, realistic physics, and cinematic lighting.</p>
              </div>
            </SpotlightCard>

            {/* Card 2: Visual Consistency */}
            <SpotlightCard className="group flex flex-col p-8">
              <div className="flex-1 relative">
                {/* Abstract UI representation */}
                <div className="absolute top-0 right-0 p-6 opacity-30 group-hover:opacity-100 transition-opacity duration-500 transform group-hover:rotate-6">
                  <Layers className="w-20 h-20 text-indigo-500" />
                </div>
                <div className="w-12 h-12 bg-white/5 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 text-white">
                  <Star className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-8">
                <h3 className="text-xl font-bold mb-2 text-white">Character Consistency</h3>
                <p className="text-zinc-400 text-sm">Maintain identity across multiple shots with advanced reference anchoring.</p>
              </div>
            </SpotlightCard>

            {/* Card 3: Vision Analysis */}
            <SpotlightCard className="group flex flex-col p-8">
              <div className="flex-1 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-colors"></div>
                <div className="w-12 h-12 bg-white/5 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 text-white">
                  <Aperture className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-8">
                <h3 className="text-xl font-bold mb-2 text-white">Intelligent Vision</h3>
                <p className="text-zinc-400 text-sm">Upload video or images. Let Gemini 2.5 analyze and reverse-engineer prompts instantly.</p>
              </div>
            </SpotlightCard>

          </div>
        </div>
      </section>

      {/* --- Social Proof --- */}
      <section className="py-24 border-t border-white/5 bg-black">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm font-medium text-zinc-500 uppercase tracking-widest mb-12">Trusted by teams at</p>
          <div className="flex flex-wrap justify-center items-center gap-16 md:gap-32 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
            <div className="flex items-center gap-2 text-2xl font-bold font-mono tracking-tighter text-white"><Cpu className="w-8 h-8" /> ACME Corp</div>
            <div className="flex items-center gap-2 text-2xl font-bold font-sans tracking-tight text-white"><Globe className="w-8 h-8" /> Global</div>
            <div className="flex items-center gap-2 text-2xl font-bold font-serif italic text-white">Vogue</div>
            <div className="flex items-center gap-2 text-2xl font-bold text-white"><Zap className="w-8 h-8" /> Flash</div>
          </div>
        </div>
      </section>

      {/* --- CTA Section --- */}
      <section className="py-40 relative overflow-hidden">
        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/20 to-black pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/20 blur-[120px] rounded-full mix-blend-screen opacity-40"></div>

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-5xl md:text-8xl font-bold mb-8 tracking-tighter text-white">
            Start creating <br /> the future.
          </h2>
          <p className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Join the waitlist of creators redefining storytelling with Lumina. <br />
            Free 500 credits for new accounts.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('login')}
              className="px-12 py-5 bg-white text-black text-lg font-bold rounded-full hover:scale-105 transition-transform shadow-[0_0_50px_rgba(255,255,255,0.2)] flex items-center gap-2"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </button>
            <button
              className="px-12 py-5 bg-transparent border border-white/20 text-white text-lg font-semibold rounded-full hover:bg-white/5 transition-colors"
            >
              View Pricing
            </button>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="border-t border-white/5 bg-[#020202] pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-12 gap-10 mb-20">
            <div className="col-span-2 md:col-span-4">
              <div className="flex items-center gap-2 mb-6">
                <div className="relative w-8 h-8">
                  <Image src="/icon.svg" alt="Lumina Logo" width={32} height={32} />
                </div>
                <span className="font-bold text-2xl tracking-tight text-white">Lumina</span>
              </div>
              <p className="text-zinc-500 text-sm max-w-xs leading-relaxed">
                Pioneering the next generation of multimodal AI tools for professional creators and teams.
              </p>
            </div>

            <div className="md:col-span-2 md:col-start-7">
              <h4 className="font-bold text-white mb-6">Product</h4>
              <ul className="space-y-4 text-sm text-zinc-500">
                <li className="hover:text-white cursor-pointer transition-colors">Features</li>
                <li className="hover:text-white cursor-pointer transition-colors">Showcase</li>
                <li className="hover:text-white cursor-pointer transition-colors">Pricing</li>
                <li className="hover:text-white cursor-pointer transition-colors">Enterprise</li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4 className="font-bold text-white mb-6">Resources</h4>
              <ul className="space-y-4 text-sm text-zinc-500">
                <li className="hover:text-white cursor-pointer transition-colors">Documentation</li>
                <li className="hover:text-white cursor-pointer transition-colors">API Reference</li>
                <li className="hover:text-white cursor-pointer transition-colors">Community</li>
                <li className="hover:text-white cursor-pointer transition-colors">Blog</li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4 className="font-bold text-white mb-6">Company</h4>
              <ul className="space-y-4 text-sm text-zinc-500">
                <li className="hover:text-white cursor-pointer transition-colors">About</li>
                <li className="hover:text-white cursor-pointer transition-colors">Careers</li>
                <li className="hover:text-white cursor-pointer transition-colors">Privacy</li>
                <li className="hover:text-white cursor-pointer transition-colors">Terms</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-xs text-zinc-600">© 2025 Lumina AI Inc. All rights reserved.</div>
            <div className="flex gap-6">
              {['Twitter', 'GitHub', 'Discord', 'LinkedIn'].map(social => (
                <span key={social} className="text-xs font-medium text-zinc-500 hover:text-white cursor-pointer transition-colors">{social}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* --- CSS Animations --- */}
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .animate-scroll {
          animation: scroll 60s linear infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 1s step-end infinite;
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(-6deg); }
          50% { transform: translateY(-20px) rotate(-3deg); }
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0) rotate(3deg); }
          50% { transform: translateY(-15px) rotate(6deg); }
        }
        .animate-float-delayed {
          animation: float-delayed 10s ease-in-out infinite 2s;
        }
      `}</style>
    </div>
  )
}
