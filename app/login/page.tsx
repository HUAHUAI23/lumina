"use client"

import React, { useState } from 'react'
import { APP_NAME } from '../../constants'
import { Loader2, Github, Mail, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const Login: React.FC = () => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const onLogin = () => {
    router.push('/dashboard')
  }

  const onNavigateHome = () => {
    router.push('/')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    // Simulate API Call for Login
    setTimeout(() => {
      setIsLoading(false)
      onLogin()
    }, 1000)
  }

  const handleFakeRegister = () => {
    setIsLoading(true)
    // Simulate Registration + Login
    setTimeout(() => {
      setIsLoading(false)
      onLogin()
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-black text-white flex overflow-hidden">

      {/* Left Column - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-20 lg:px-24 xl:px-32 relative z-10 bg-black">


        <div className="mb-12 cursor-pointer inline-flex items-center gap-2" onClick={onNavigateHome}>
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-indigo-500/30 blur-md rounded-full"></div>
            <Image src="/icon.svg" alt="Lumina Logo" width={32} height={32} className="relative z-10" />
          </div>
          <span className="font-bold text-xl tracking-tight">{APP_NAME}</span>
        </div>

        <div className="space-y-6 max-w-sm w-full mx-auto lg:mx-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back</h1>
            <p className="text-zinc-500">Enter your details to access your workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="name@company.com"
              // Not required for fake logic
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Password</label>
                <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300">Forgot password?</a>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="••••••••"
              // Not required for fake logic
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 mt-2 shadow-lg shadow-white/5"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-black px-2 text-zinc-500">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={handleSubmit} className="flex items-center justify-center gap-2 py-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 text-sm font-medium text-zinc-300 transition-colors">
              <Github className="w-4 h-4" /> Github
            </button>
            <button type="button" onClick={handleSubmit} className="flex items-center justify-center gap-2 py-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 text-sm font-medium text-zinc-300 transition-colors">
              <Mail className="w-4 h-4" /> Google
            </button>
          </div>

          <p className="text-center text-sm text-zinc-500 mt-6">
            Don't have an account?
            <button
              onClick={handleFakeRegister}
              className="ml-1 text-indigo-400 cursor-pointer hover:underline font-medium bg-transparent border-none p-0"
            >
              Create account
            </button>
          </p>
        </div>

        <div className="mt-12 text-xs text-zinc-600 hidden lg:block">
          © 2024 Lumina AI Inc.
        </div>
      </div>

      {/* Right Column - Visual Showcase */}
      <div className="hidden lg:block lg:w-1/2 bg-zinc-900 relative overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-zinc-900 to-black"></div>

        {/* Masonry / Grid of Content */}
        <div className="absolute inset-0 p-8 grid grid-cols-2 gap-6 opacity-40 rotate-12 scale-125 origin-center pointer-events-none select-none">
          {/* Column 1 */}
          <div className="space-y-6 pt-20">
            <div className="aspect-[4/5] rounded-2xl bg-zinc-800 overflow-hidden shadow-2xl relative">
              <Image src="https://picsum.photos/600/800?random=10" alt="Showcase 1" fill className="object-cover" />
            </div>
            <div className="aspect-[1/1] rounded-2xl bg-zinc-800 overflow-hidden shadow-2xl relative">
              <Image src="https://picsum.photos/600/600?random=11" alt="Showcase 2" fill className="object-cover" />
            </div>
            <div className="aspect-[16/9] rounded-2xl bg-zinc-800 overflow-hidden shadow-2xl relative">
              <Image src="https://picsum.photos/800/450?random=12" alt="Showcase 3" fill className="object-cover" />
            </div>
          </div>
          {/* Column 2 */}
          <div className="space-y-6 -mt-20">
            <div className="aspect-[16/9] rounded-2xl bg-zinc-800 overflow-hidden shadow-2xl relative">
              <Image src="https://picsum.photos/800/450?random=13" alt="Showcase 4" fill className="object-cover" />
            </div>
            <div className="aspect-[4/5] rounded-2xl bg-zinc-800 overflow-hidden shadow-2xl relative">
              <Image src="https://picsum.photos/600/800?random=14" alt="Showcase 5" fill className="object-cover" />
            </div>
            <div className="aspect-[1/1] rounded-2xl bg-zinc-800 overflow-hidden shadow-2xl relative">
              <Image src="https://picsum.photos/600/600?random=15" alt="Showcase 6" fill className="object-cover" />
            </div>
          </div>
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 w-full p-16 z-20">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl max-w-lg animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex -space-x-2">
                <div className="relative w-8 h-8 rounded-full border-2 border-black bg-zinc-800 overflow-hidden">
                  <Image src="https://picsum.photos/100?random=20" alt="User 1" fill className="object-cover" />
                </div>
                <div className="relative w-8 h-8 rounded-full border-2 border-black bg-zinc-800 overflow-hidden">
                  <Image src="https://picsum.photos/100?random=21" alt="User 2" fill className="object-cover" />
                </div>
                <div className="relative w-8 h-8 rounded-full border-2 border-black bg-zinc-800 overflow-hidden">
                  <Image src="https://picsum.photos/100?random=22" alt="User 3" fill className="object-cover" />
                </div>
              </div>
              <div className="text-sm font-medium text-white">Trusted by 10k+ creators</div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Turn ideas into reality.</h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              "Lumina's multimodal capabilities have completely transformed our asset production pipeline. The consistency in character generation is unmatched."
            </p>

            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
              <Sparkles className="w-3 h-3" />
              <span>Powered by Veo 3.1 & Gemini 2.5</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
