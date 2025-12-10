"use client"

import React, { useEffect, useState } from 'react'
import { CheckCircle, Github, Loader2, Mail } from 'lucide-react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'

import { GET, POST } from '@/lib/api-client'
import type { ApiResponse } from '@/lib/api-response'

import { APP_NAME } from '../../constants'

type AuthMode = 'initial' | 'login' | 'register'

interface AuthConfig {
  passwordAuth: boolean
  githubAuth: boolean
  googleAuth: boolean
}

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<AuthMode>('initial')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [authConfig, setAuthConfig] = useState<AuthConfig>({
    passwordAuth: true,
    githubAuth: true,
    googleAuth: false,
  })

  // Form fields
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    // Generate static particles for background
  }, [])

  // Fetch auth configuration on mount
  React.useEffect(() => {
    GET<AuthConfig>('/api/auth/config')
      .then((config) => setAuthConfig(config))
      .catch(() => {
        // Keep defaults on error
      })
  }, [])

  const onNavigateHome = () => {
    router.push('/')
  }

  const handleCheckUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!usernameOrEmail.trim()) {
      setError('Please enter your username or email')
      return
    }

    setIsLoading(true)

    try {
      const response = await POST<ApiResponse<{
        exists: boolean
        needsPassword: boolean
        needsRegistration: boolean
      }>>('/api/auth/check', { usernameOrEmail: usernameOrEmail.trim() })

      if (response.success) {
        if (response.data.exists) {
          setMode('login')
        } else {
          setMode('register')
          // Pre-fill email or username based on input
          if (usernameOrEmail.includes('@')) {
            setEmail(usernameOrEmail)
          } else {
            setUsername(usernameOrEmail)
          }
        }
      } else {
        setError(response.error || 'Failed to check user')
      }
    } catch (_err) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const body = mode === 'login'
        ? { usernameOrEmail, password }
        : { usernameOrEmail, password, username, email }

      const response = await POST<ApiResponse<{
        action: 'login' | 'register'
        user: {
          id: number
          username: string
          email: string | null
        }
      }>>('/api/auth/authenticate', body)

      if (response.success) {
        const redirect = searchParams.get('redirect') || '/dashboard'
        router.push(redirect)
      } else {
        setError(response.error || 'Authentication failed')
      }
    } catch (_err) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGithubLogin = () => {
    window.location.href = '/api/auth/github'
  }

  const handleReset = () => {
    setMode('initial')
    setPassword('')
    setConfirmPassword('')
    setUsername('')
    setEmail('')
    setError('')
  }

  return (
    <div className="min-h-screen bg-[#020203] text-white flex overflow-hidden font-sans selection:bg-indigo-500/30 relative">

      {/* --- Cinematic Background Layers --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-black">
        {/* Projector Light Beam - Stronger & Flickering */}
        <div className="absolute top-[-20%] right-[-10%] w-px h-[150vh] shadow-[0_0_150px_100px_rgba(255,255,255,0.05)] rotate-12 animate-light-flicker mix-blend-screen opacity-50"></div>

        {/* Ambient Studio Lighting */}
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-900/10 rounded-full blur-[150px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-900/10 rounded-full blur-[150px] animate-pulse-slow animation-delay-2000"></div>

        {/* Film Grain/Noise */}
        <div className="absolute inset-0 bg-noise opacity-[0.07] z-10 mix-blend-overlay"></div>
      </div>

      {/* Left Column - Form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-20 relative z-20 border-r border-white/5 bg-black/40 backdrop-blur-sm">

        <div className="relative z-10 max-w-[400px] w-full mx-auto">

          <div className="mb-10 cursor-pointer inline-flex items-center gap-3 group" onClick={onNavigateHome}>
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-indigo-500/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <Image src="/icon.svg" alt={`${APP_NAME} Logo`} width={40} height={40} className="relative z-10" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-white group-hover:text-glow transition-all duration-300">{APP_NAME}</span>
          </div>

          <div className="mb-10 relative">
            {/* Decoration Line */}
            <div className="absolute -left-6 top-1 bottom-1 w-0.5 bg-indigo-500/50 rounded-full"></div>

            <h1 className="text-4xl font-bold tracking-tighter mb-3 text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">
              {mode === 'register' ? 'New Talent' : 'Studio Access'}
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed font-light">
              {mode === 'register'
                ? 'Register your profile to begin production.'
                : mode === 'login'
                  ? 'Identify yourself to enter the studio.'
                  : 'Enter credentials to access your creative suite.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/5 border border-red-500/20 text-red-400 px-4 py-3 rounded-md text-sm flex items-center gap-2 backdrop-blur-sm font-mono">
              <CheckCircle className="w-4 h-4 text-red-500 rotate-45" />
              <span className="uppercase tracking-wide text-xs">Error: {error}</span>
            </div>
          )}

          {authConfig.passwordAuth && (
            <form onSubmit={mode === 'initial' ? handleCheckUser : handleAuthenticate} className="space-y-6">

              {/* Step 1: Username or Email */}
              {mode === 'initial' && (
                <div className="space-y-2 group">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest group-focus-within:text-indigo-400 transition-colors">Call Sign / Email</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-medium"
                      placeholder="DIRECTOR_ID or email@studio.com"
                      required
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {/* Step 2a: Login - Show Password */}
              {mode === 'login' && (
                <>
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Identifying As</label>
                    <div className="flex items-center justify-between px-4 py-3 border border-white/5 bg-white/5 rounded-lg">
                      <span className="text-white text-sm font-mono">{usernameOrEmail}</span>
                      <button type="button" onClick={handleReset} className="text-[10px] uppercase tracking-wider text-indigo-400 hover:text-white transition-all">
                        Change
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 group">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest group-focus-within:text-indigo-400 transition-colors">Access Key</label>
                      <a href="#" className="text-[10px] uppercase tracking-wider text-zinc-600 hover:text-zinc-400 transition-colors">Reset Key?</a>
                    </div>
                    <div className="relative">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all tracking-widest"
                        placeholder="••••••••"
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Step 2b: Register - Show Registration Fields */}
              {mode === 'register' && (
                <>
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest group-focus-within:text-indigo-400 transition-colors">Call Sign (Username)</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all"
                        placeholder="director_one"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="space-y-2 group">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest group-focus-within:text-indigo-400 transition-colors">Contact Email</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all"
                        placeholder="contact@studio.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2 group">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest group-focus-within:text-indigo-400 transition-colors">Access Key</label>
                    <div className="relative">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all"
                        placeholder="Min. 8 chars"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2 group">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest group-focus-within:text-indigo-400 transition-colors">Confirm Key</label>
                    <div className="relative">
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  <button type="button" onClick={handleReset} className="text-xs text-indigo-400 hover:text-white font-mono uppercase tracking-wider transition-all">
                    ← Back to identification
                  </button>
                </>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative overflow-hidden bg-white text-black font-bold py-4 rounded-lg hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 mt-4 shadow-[0_0_25px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:scale-[1.01] active:scale-[0.99] group"
              >
                <div className="absolute inset-0 bg-shine bg-size-[200%_100%] animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative z-10 flex items-center gap-2 uppercase tracking-wide text-sm">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'initial' ? 'Identify' : (mode === 'login' ? 'Enter Studio' : 'Initialize Account'))}
                </span>
              </button>
            </form>
          )}

          {mode === 'initial' && (authConfig.githubAuth || authConfig.googleAuth) && (
            <>
              <div className="relative py-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-widest">
                  <span className="bg-transparent px-3 text-zinc-600">Alternative Access</span>
                </div>
              </div>

              <div className={`grid ${authConfig.githubAuth && authConfig.googleAuth ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                {authConfig.githubAuth && (
                  <button
                    type="button"
                    onClick={handleGithubLogin}
                    className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 text-xs font-mono uppercase tracking-wider text-zinc-300 transition-all hover:text-white hover:border-white/20"
                  >
                    <Github className="w-4 h-4" /> Github
                  </button>
                )}
                {authConfig.googleAuth && (
                  <button
                    type="button"
                    onClick={() => setError('Google OAuth coming soon')}
                    className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 text-xs font-mono uppercase tracking-wider text-zinc-300 transition-all hover:text-white hover:border-white/20"
                  >
                    <Mail className="w-4 h-4" /> Google
                  </button>
                )}
              </div>
            </>
          )}

          <div className="mt-8 text-center">
            {mode === 'login' || mode === 'register' ? (
              <p className="text-xs text-zinc-600 font-mono">
                WRONG IDENTITY?
                <button
                  onClick={handleReset}
                  className="ml-2 text-zinc-400 cursor-pointer hover:text-white transition-colors uppercase tracking-wider"
                >
                  SWITCH
                </button>
              </p>
            ) : (
              <p className="text-xs text-zinc-600 font-mono">
                NO CREDENTIALS?
                <button
                  onClick={() => setMode('register')}
                  className="ml-2 text-zinc-400 cursor-pointer hover:text-white transition-colors uppercase tracking-wider"
                >
                  CHECK AVAILABILITY
                </button>
              </p>
            )}
          </div>

        </div>

        <div className="mt-12 text-[10px] text-zinc-800 hidden lg:block text-center font-mono uppercase tracking-[0.2em] opacity-50">
          © 2025 Lumina AI Inc. &nbsp;//&nbsp; Secure Connection
        </div>
      </div>

      {/* Right Column - Cinematic Visual Showcase */}
      <div className="hidden lg:block lg:w-[55%] bg-black relative overflow-hidden">
        {/* Film Perforations for visual effect */}
        <div className="absolute left-4 top-0 bottom-0 w-8 z-20 flex flex-col gap-8 py-4 opacity-20">
          {[...Array(20)].map((_, i) => (
            <div key={`perf-l-${i}`} className="w-4 h-6 bg-white/30 rounded-sm"></div>
          ))}
        </div>
        <div className="absolute right-4 top-0 bottom-0 w-8 z-20 flex flex-col gap-8 py-4 opacity-20">
          {[...Array(20)].map((_, i) => (
            <div key={`perf-r-${i}`} className="w-4 h-6 bg-white/30 rounded-sm"></div>
          ))}
        </div>

        {/* Deep Aurora Background (Right Side Specific) */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-indigo-950/20 via-black to-black z-0"></div>

        {/* Floating Elements Animation - Film Strip Style */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="relative w-[80%] aspect-video bg-zinc-900 border-2 border-zinc-800 shadow-2xl rotate-3 animate-hero-float-slow overflow-hidden group">
            <div className="absolute inset-0 bg-black/50 z-20 group-hover:bg-transparent transition-colors duration-700"></div>
            <Image src="https://picsum.photos/1200/800?random=10" alt="Cinematic Scene" fill className="object-cover opacity-60 group-hover:opacity-100 transition-all duration-700 grayscale group-hover:grayscale-0" />

            {/* Metadata Overlay */}
            <div className="absolute top-4 left-4 z-30 font-mono text-xs text-white/50 border border-white/20 px-2 py-1 bg-black/40 backdrop-blur-sm">
              SCENE: 04 // EXT. SPACE // NIGHT
            </div>

            {/* Rec Indicator */}
            <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span className="font-mono text-[10px] text-red-500 uppercase tracking-widest">REC</span>
            </div>
          </div>

          {/* Background floating frames */}
          <div className="absolute w-[60%] aspect-video bg-zinc-900 border border-zinc-800 shadow-xl -rotate-6 -z-10 translate-x-20 translate-y-20 opacity-30">
            <Image src="https://picsum.photos/1200/800?random=11" alt="Cinematic Scene 2" fill className="object-cover grayscale" />
          </div>
        </div>

        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent z-10"></div>
        <div className="absolute inset-0 bg-linear-to-r from-black via-transparent to-transparent z-10"></div>

        {/* Bottom Text */}
        <div className="absolute bottom-0 left-0 w-full p-20 z-20">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-px bg-indigo-500"></div>
              <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest">Production Note</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-3 tracking-tight drop-shadow-lg">Turn scripts into spectacles.</h2>
            <p className="text-zinc-500 text-sm leading-relaxed mb-8 font-mono max-w-sm">
              &quot;Lumina is the DP, Art Director, and Editor I always wanted.&quot;
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
