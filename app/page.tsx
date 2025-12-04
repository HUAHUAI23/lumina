"use client"

import React, { useEffect, useRef, useState } from 'react'
import {
  Aperture, ArrowRight, Command, Cpu, Globe,
  PlayCircle,
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
      className={`relative overflow-hidden rounded-3xl border border-white/5 bg-surface/40 backdrop-blur-sm ${className}`}
    >
      <div className="absolute inset-0 z-10 bg-noise opacity-50 pointer-events-none mix-blend-overlay"></div>
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-500"
        style={{
          opacity,
          background: `radial-gradient(800px circle at ${position.x}px ${position.y}px, rgba(99,102,241,0.08), transparent 40%)`,
        }}
      />
      <div className="relative h-full z-10">{children}</div>
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
    <div className="min-h-screen text-white overflow-x-hidden font-sans selection:bg-indigo-500/30">

      {/* --- Navigation --- */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-black/60 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigate('home')}>
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-indigo-500/30 blur-md rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-500"></div>
              <Image src="/icon.svg" alt="Lumina Logo" width={40} height={40} className="relative z-10 group-hover:scale-105 transition-transform duration-500" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white group-hover:text-glow transition-all duration-300">{APP_NAME}</span>
          </div>

          <div className="hidden md:flex items-center gap-10 text-sm font-medium text-zinc-400">
            {['Capabilities', 'Showcase', 'Pricing', 'Enterprise'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-white transition-colors relative group">
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-indigo-500 transition-all group-hover:w-full duration-300"></span>
              </a>
            ))}
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => onNavigate('login')} className="text-sm font-medium text-zinc-300 hover:text-white transition-colors hover:text-glow">Sign in</button>
            <button
              onClick={() => onNavigate('login')}
              className="group relative px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Launch App <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* --- Hero Section with Optical Depth & Cinematic Lighting --- */}
      <section className="relative pt-44 pb-32 lg:pt-60 lg:pb-48 overflow-hidden">

        {/* Cinematic Vignette Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none z-0"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">

          {/* Hero Text with Directional Rim Light */}
          <h1
            className="relative text-7xl md:text-9xl font-semibold tracking-tighter mb-8 bg-clip-text text-transparent bg-linear-to-b from-white via-zinc-100 to-zinc-500 animate-in fade-in zoom-in-50 duration-1000 leading-[0.9] md:leading-[0.85] drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] pt-20"
          >
            {/* Spotlight Light Beam Effect */}
            <div className="absolute -top-[500px] left-1/2 -translate-x-1/2 w-[600px] h-[1000px] pointer-events-none z-0">
              {/* Main Light Beam - Stronger for cinematic opening */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[250px] h-full bg-linear-to-b from-white/30 via-indigo-200/10 to-transparent blur-3xl animate-light-sweep"></div>

              {/* Core Bright Beam */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-full bg-linear-to-b from-white/40 via-indigo-100/20 to-transparent blur-[25px] animate-light-flicker"></div>
            </div>

            {/* Light Hit Point on Text - Cinematic Lens Flare */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-radial-gradient from-white/30 via-indigo-300/20 to-transparent blur-[70px] pointer-events-none animate-glow-pulse mix-blend-screen"></div>

            The Stage <br />
            <span className="bg-clip-text text-transparent bg-linear-to-r from-white via-indigo-200 to-zinc-400">Is Yours.</span>
          </h1>

          {/* Subtitle - More minimal and cinematic */}
          <p className="text-xl md:text-2xl text-zinc-400 max-w-xl mx-auto mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 leading-relaxed font-light tracking-wide">
            Where imagination meets reality. <br className="hidden md:block" />
            Create cinematic masterpieces with a single prompt.
          </p>

          {/* Input Area with Depth of Field & Glassmorphism */}
          <div className="max-w-3xl mx-auto relative group animate-in fade-in zoom-in-95 duration-1000 delay-300 z-30">
            {/* Behind Glow - Simulate volumetric light hitting the glass */}
            <div className="absolute -inset-4 bg-linear-to-r from-indigo-500/20 via-purple-500/20 to-blue-500/20 rounded-4xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

            <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 pl-5 flex items-center shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden hover:border-white/20 transition-all duration-500 group-hover:shadow-[0_16px_64px_rgba(99,102,241,0.15)] z-10">
              {/* Inner Reflection Top */}
              <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent opacity-50"></div>

              <div className="flex-1 text-left py-4 overflow-hidden relative h-[24px] pl-2">
                {/* Animated Text */}
                <div key={activePromptIndex} className="absolute inset-0 flex items-center text-lg text-zinc-300 animate-in slide-in-from-bottom-4 fade-in duration-500">
                  {prompts[activePromptIndex]}
                  <span className="w-0.5 h-5 bg-indigo-400 ml-1 animate-blink shadow-[0_0_8px_rgba(129,140,248,0.8)]"></span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('login')}
                className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition-colors flex items-center gap-2 shrink-0 ml-2 shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.5)]"
              >
                Generate <Command className="w-3 h-3 text-zinc-500" />
              </button>
            </div>

            {/* Floating Assets Decoration with Bokeh/Blur Effects */}
            <div className="absolute -top-20 -left-24 hidden md:block animate-hero-float-slow z-0 opacity-80 hover:opacity-100 transition-all duration-700">
              <div className="bg-black/60 backdrop-blur-md border border-white/10 p-2 rounded-xl shadow-2xl -rotate-6">
                <div className="w-32 h-20 bg-zinc-800 rounded-lg overflow-hidden relative">
                  <Image src="https://picsum.photos/300/200?random=1" alt="Float 1" fill className="object-cover opacity-80" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="p-1 bg-white/20 backdrop-blur rounded-full"><PlayCircle className="w-4 h-4 text-white" /></div>
                  </div>
                </div>
                <div className="mt-2 flex gap-2 items-center">
                  <div className="w-4 h-4 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                  <div className="h-2 w-16 bg-zinc-800 rounded"></div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-16 -right-20 hidden md:block animate-hero-float-delayed z-0 opacity-60 hover:opacity-100 transition-all duration-700">
              <div className="bg-black/60 backdrop-blur-md border border-white/10 p-2 rounded-xl shadow-2xl rotate-3">
                <div className="w-24 h-24 bg-zinc-800 rounded-lg overflow-hidden relative">
                  <Image src="https://picsum.photos/300/300?random=2" alt="Float 2" fill className="object-cover opacity-80" />
                </div>
                <div className="absolute -top-2 -right-2 bg-green-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full border border-black shadow-glow">New</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Infinite Showcase (Marquee) with Film Strip Effect --- */}
      <section className="py-10 border-y-4 border-black bg-black relative group overflow-hidden">
        {/* Film Strip Perforations Top */}
        <div className="absolute top-1 left-0 w-full h-4 z-20 flex gap-4">
          {[...Array(40)].map((_, i) => (
            <div key={`perf-top-${i}`} className="w-6 h-4 bg-white/10 rounded-sm"></div>
          ))}
        </div>

        {/* Film Strip Perforations Bottom */}
        <div className="absolute bottom-1 left-0 w-full h-4 z-20 flex gap-4">
          {[...Array(40)].map((_, i) => (
            <div key={`perf-bottom-${i}`} className="w-6 h-4 bg-white/10 rounded-sm"></div>
          ))}
        </div>

        <div className="absolute left-0 top-0 w-40 h-full bg-linear-to-r from-black to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 w-40 h-full bg-linear-to-l from-black to-transparent z-10 pointer-events-none"></div>

        <div className="flex gap-1 animate-scroll w-max hover:paused py-6">
          {/* Duplicate array for seamless loop */}
          {[...Array(16)].map((_, i) => (
            <div key={i} className="w-[320px] aspect-video bg-zinc-900 relative cursor-pointer group/card border-x-4 border-black">
              <Image src={`https://picsum.photos/640/360?random=${i + 50}`} alt={`Showcase ${i}`} fill className="object-cover opacity-60 group-hover/card:opacity-100 transition-all duration-700 grayscale hover:grayscale-0 sepia-[.3]" />
              <div className="absolute bottom-3 left-3 flex items-center gap-2 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
                <span className="px-2 py-1 bg-black/60 backdrop-blur border border-white/10 rounded text-[10px] font-mono text-white shadow-lg uppercase tracking-widest">SCENE {i + 1}</span>
              </div>
              {/* Film Grain Overlay */}
              <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none mix-blend-overlay"></div>
            </div>
          ))}
        </div>
      </section>

      {/* --- Bento Grid Features --- */}
      <section className="py-32 relative bg-zinc-950/50">
        {/* Ambient Light for Features - Cinema Spotlight */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-900/20 blur-[150px] rounded-full pointer-events-none mix-blend-screen"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="mb-20 md:text-center max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              Your Vision. <br /> <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-300 via-purple-300 to-indigo-300 text-glow-indigo">Our Studio.</span>
            </h2>
            <p className="text-xl text-zinc-400 font-light tracking-wide">From script to screen. Command advanced AI models to generate scenes, actors, and cinematography.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[320px] md:auto-rows-[380px]">

            {/* Card 1: Main Video */}
            <SpotlightCard className="md:col-span-2 md:row-span-2 group border-white/10 bg-black/40">
              <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black/90 z-10"></div>
              {/* Cinematic Letterbox Bars */}
              <div className="absolute top-0 left-0 right-0 h-10 bg-black z-10"></div>
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-black z-10"></div>

              <Image src="https://picsum.photos/1200/1200?random=99" alt="Generative Video" fill className="object-cover opacity-50 group-hover:opacity-80 group-hover:scale-105 transition-all duration-1000 saturate-50 group-hover:saturate-100" />

              <div className="absolute inset-0 p-10 flex flex-col justify-end z-20">
                <div className="w-14 h-14 bg-white/5 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 text-white mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)] group-hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-shadow duration-500">
                  <Video className="w-6 h-6" />
                </div>
                <h3 className="text-3xl font-bold mb-3 text-white tracking-tight">Cinematography</h3>
                <p className="text-zinc-400 text-lg max-w-md font-light">Direct complex scenes with Veo 3.1. Control lighting, camera movement, and physics with a director&apos;s precision.</p>
              </div>
            </SpotlightCard>

            {/* Card 2: Image Generation */}
            <SpotlightCard className="md:col-span-1 md:row-span-2 group border-white/10 bg-black/40">
              <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black/90 z-10"></div>
              <Image src="https://picsum.photos/800/1200?random=100" alt="Image Generation" fill className="object-cover opacity-50 group-hover:opacity-80 group-hover:scale-105 transition-all duration-1000 saturate-0 group-hover:saturate-100" />

              <div className="absolute inset-0 p-8 flex flex-col justify-end z-20">
                <div className="w-14 h-14 bg-white/5 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 text-white mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)] group-hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-shadow duration-500">
                  <Aperture className="w-6 h-6" />
                </div>
                <h3 className="text-3xl font-bold mb-3 text-white tracking-tight">Art Direction</h3>
                <p className="text-zinc-400 text-lg leading-relaxed">Visualize characters and sets with Gemini 2.5. High-fidelity concept art and storyboards in seconds.</p>
              </div>
            </SpotlightCard>

          </div>
        </div>
      </section>

      {/* --- Social Proof --- */}
      <section className="py-24 border-t border-white/5 bg-black relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <p className="text-xs font-mono text-zinc-600 uppercase tracking-[0.3em] mb-12">Production Studios & Creators</p>
          <div className="flex flex-wrap justify-center items-center gap-16 md:gap-32 opacity-50 transition-all duration-700">
            <div className="flex items-center gap-2 text-2xl font-bold font-mono tracking-tighter text-zinc-500 hover:text-white transition-all hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"><Cpu className="w-8 h-8" /> ACME Corp</div>
            <div className="flex items-center gap-2 text-2xl font-bold font-sans tracking-tight text-zinc-500 hover:text-white transition-all hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"><Globe className="w-8 h-8" /> Global</div>
            <div className="flex items-center gap-2 text-2xl font-bold font-serif italic text-zinc-500 hover:text-white transition-all hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">Vogue</div>
            <div className="flex items-center gap-2 text-2xl font-bold text-zinc-500 hover:text-white transition-all hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"><Zap className="w-8 h-8" /> Flash</div>
          </div>
        </div>
      </section>

      {/* --- CTA Section --- */}
      <section className="py-40 relative overflow-hidden bg-black">
        {/* Gradients */}
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-indigo-950/20 to-black pointer-events-none"></div>

        {/* Projector Light Effect */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-px h-[1000px] shadow-[0_0_100px_60px_rgba(255,255,255,0.05)] rotate-180 pointer-events-none animate-light-flicker mix-blend-screen"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/20 blur-[150px] rounded-full mix-blend-screen opacity-50 pointer-events-none animate-pulse-slow"></div>

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <span className="inline-block py-1 px-3 border border-white/20 rounded-full bg-white/5 backdrop-blur text-xs font-mono text-zinc-400 mb-6 uppercase tracking-widest">Now Casting</span>
          <h2 className="text-5xl md:text-8xl font-bold mb-8 tracking-tighter text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.2)]">
            Production <br /> Starts Now.
          </h2>
          <p className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
            Unleash your inner auteur. No budget constraints. No crew required. <br />
            Just your story, ready to be told.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('login')}
              className="px-12 py-5 bg-white text-black text-lg font-bold rounded-full hover:scale-105 transition-transform shadow-[0_0_50px_rgba(255,255,255,0.5)] flex items-center gap-2 hover:bg-zinc-200"
            >
              Start Rolling <ArrowRight className="w-5 h-5" />
            </button>
            <button
              className="px-12 py-5 bg-transparent border border-white/20 text-white text-lg font-semibold rounded-full hover:bg-white/5 transition-colors hover:border-white/40 backdrop-blur-sm"
            >
              View Studio Plans
            </button>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="border-t border-white/5 bg-black pt-20 pb-10 relative z-10">
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
                <li className="hover:text-white cursor-pointer transition-colors hover:text-glow">Features</li>
                <li className="hover:text-white cursor-pointer transition-colors hover:text-glow">Showcase</li>
                <li className="hover:text-white cursor-pointer transition-colors hover:text-glow">Pricing</li>
                <li className="hover:text-white cursor-pointer transition-colors hover:text-glow">Enterprise</li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4 className="font-bold text-white mb-6">Resources</h4>
              <ul className="space-y-4 text-sm text-zinc-500">
                <li className="hover:text-white cursor-pointer transition-colors hover:text-glow">Documentation</li>
                <li className="hover:text-white cursor-pointer transition-colors hover:text-glow">API Reference</li>
                <li className="hover:text-white cursor-pointer transition-colors hover:text-glow">Community</li>
                <li className="hover:text-white cursor-pointer transition-colors hover:text-glow">Blog</li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4 className="font-bold text-white mb-6">Company</h4>
              <ul className="space-y-4 text-sm text-zinc-500">
                <li className="hover:text-white cursor-pointer transition-colors hover:text-glow">About</li>
                <li className="hover:text-white cursor-pointer transition-colors hover:text-glow">Careers</li>
                <li className="hover:text-white cursor-pointer transition-colors hover:text-glow">Privacy</li>
                <li className="hover:text-white cursor-pointer transition-colors hover:text-glow">Terms</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-xs text-zinc-600">© 2025 Lumina AI Inc. All rights reserved.</div>
            <div className="flex gap-6">
              {['Twitter', 'GitHub', 'Discord', 'LinkedIn'].map(social => (
                <span key={social} className="text-xs font-medium text-zinc-500 hover:text-white cursor-pointer transition-colors hover:text-glow">{social}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}