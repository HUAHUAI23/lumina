"use client"

import React, { useState } from 'react'
import { Github, Loader2, Mail, Sparkles } from 'lucide-react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'

import { APP_NAME } from '../../constants'

type AuthMode = 'initial' | 'login' | 'register'

interface AuthConfig {
  passwordAuth: boolean
  githubAuth: boolean
  googleAuth: boolean
}

const Login: React.FC = () => {
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

  // Fetch auth configuration on mount
  React.useEffect(() => {
    fetch('/api/auth/config')
      .then((res) => res.json())
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
      const response = await fetch('/api/auth/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: usernameOrEmail.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        if (data.exists) {
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
        setError(data.error || 'Failed to check user')
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

      const response = await fetch('/api/auth/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (data.success) {
        const redirect = searchParams.get('redirect') || '/dashboard'
        router.push(redirect)
      } else {
        setError(data.error || 'Authentication failed')
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
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {mode === 'register' ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="text-zinc-500">
              {mode === 'register'
                ? 'Set up your password to get started.'
                : mode === 'login'
                  ? 'Enter your password to continue.'
                  : 'Enter your username or email to continue.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-900/50 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {authConfig.passwordAuth && (
            <form onSubmit={mode === 'initial' ? handleCheckUser : handleAuthenticate} className="space-y-4">

              {/* Step 1: Username or Email */}
              {mode === 'initial' && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Username or Email</label>
                  <input
                    type="text"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    placeholder="john_doe or john@example.com"
                    required
                    autoFocus
                  />
                </div>
              )}

              {/* Step 2a: Login - Show Password */}
              {mode === 'login' && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Signing in as</label>
                    <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                      <span className="text-white">{usernameOrEmail}</span>
                      <button type="button" onClick={handleReset} className="text-xs text-indigo-400 hover:text-indigo-300">
                        Change
                      </button>
                    </div>
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
                      required
                      autoFocus
                    />
                  </div>
                </>
              )}

              {/* Step 2b: Register - Show Registration Fields */}
              {mode === 'register' && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      placeholder="john_doe"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      placeholder="john@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      placeholder="Min. 8 characters"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <button type="button" onClick={handleReset} className="text-xs text-indigo-400 hover:text-indigo-300">
                    ← Back to start
                  </button>
                </>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 mt-2 shadow-lg shadow-white/5"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : mode === 'initial' ? (
                  'Continue'
                ) : mode === 'login' ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          )}

          {mode === 'initial' && (authConfig.githubAuth || authConfig.googleAuth) && (
            <>
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-black px-2 text-zinc-500">Or continue with</span>
                </div>
              </div>

              <div className={`grid ${authConfig.githubAuth && authConfig.googleAuth ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                {authConfig.githubAuth && (
                  <button
                    type="button"
                    onClick={handleGithubLogin}
                    className="flex items-center justify-center gap-2 py-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 text-sm font-medium text-zinc-300 transition-colors"
                  >
                    <Github className="w-4 h-4" /> Github
                  </button>
                )}
                {authConfig.googleAuth && (
                  <button
                    type="button"
                    onClick={() => setError('Google OAuth coming soon')}
                    className="flex items-center justify-center gap-2 py-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 text-sm font-medium text-zinc-300 transition-colors"
                  >
                    <Mail className="w-4 h-4" /> Google
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="mt-12 text-xs text-zinc-600 hidden lg:block">
          © 2025 Lumina AI Inc.
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
              &quot;Lumina&apos;s multimodal capabilities have completely transformed our asset production pipeline. The consistency in character generation is unmatched.&quot;
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