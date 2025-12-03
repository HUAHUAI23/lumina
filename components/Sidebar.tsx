"use client"

import React, { useEffect, useState } from 'react'
import { Loader2, LogOut, Plus, Wallet } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { APP_NAME, NAVIGATION_ITEMS } from '../constants'

interface UserData {
  id: number
  username: string
  email: string | null
  avatar: string | null
  credits: number
}

const Sidebar: React.FC = () => {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Fetch user data on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()

        if (data.success) {
          setUser(data.user)
        }
      } catch (error) {
        console.error('Failed to fetch user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [])

  // Helper to check if link is active
  const isActive = (path: string) => {
    // Exact match for root or subpaths
    if (path === 'dashboard' && pathname === '/') return true
    return pathname === `/${path}` || pathname.startsWith(`/${path}/`)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin', // Ensure cookies are sent
      })

      if (response.ok) {
        // Clear user state
        setUser(null)
        // Force a hard navigation to login page (clears all client state)
        window.location.href = '/login'
      } else {
        console.error('Logout failed')
        setIsLoggingOut(false)
      }
    } catch (error) {
      console.error('Logout error:', error)
      setIsLoggingOut(false)
    }
  }

  return (
    <aside className="w-20 lg:w-72 border-r border-border bg-background flex flex-col h-full transition-all duration-300 relative z-20 flex-shrink-0">
      <div className="p-8 flex items-center gap-3">
        <div className="w-9 h-9 bg-white text-black rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)] relative overflow-hidden">
          <span className="font-bold font-sans text-lg relative z-10">L</span>
        </div>
        <span className="font-semibold text-lg text-white hidden lg:block tracking-tight">{APP_NAME}</span>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1.5">
        {NAVIGATION_ITEMS.map((item) => {
          const active = isActive(item.id)
          const href = item.id === 'dashboard' ? '/dashboard' : `/${item.id}`

          return (
            <Link
              key={item.id}
              href={href}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative
                ${active
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'}
              `}
            >
              {/* Active Glow Background */}
              {active && (
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent rounded-xl border border-indigo-500/10"></div>
              )}

              {/* Active Indicator Line */}
              {active && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-4 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
              )}

              <item.icon
                className={`w-5 h-5 relative z-10 transition-colors duration-300 ${active ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className={`hidden lg:block text-sm relative z-10 font-medium ${active ? 'translate-x-1' : ''} transition-transform`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 lg:p-6 border-t border-border">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : user ? (
          <>
            {/* User Profile - Compact & Elegant */}
            <div className="hidden lg:flex items-center gap-3 mb-6 px-2">
              <div className="relative cursor-pointer hover:opacity-80 transition-opacity">
                <Image
                  src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`}
                  alt="User Avatar"
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full bg-surfaceLight object-cover border border-white/10"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full"></div>
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-medium text-white truncate">{user.username}</p>
                <p className="text-xs text-zinc-500 truncate">{user.email || 'Pro Plan'}</p>
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
                title="Sign Out"
              >
                {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              </button>
            </div>

            {/* Elegant Pay-As-You-Go Wallet Card */}
            <div
              onClick={() => router.push('/billing')}
              className="relative overflow-hidden rounded-2xl border border-white/5 bg-surfaceLight/50 group cursor-pointer transition-all duration-300 hover:border-indigo-500/30 hover:shadow-glow hidden lg:block"
            >
              {/* Diffused Glow Effects */}
              <div className="absolute -right-6 -top-6 w-20 h-20 bg-indigo-500/10 blur-[40px] rounded-full group-hover:bg-indigo-500/20 transition-all duration-500"></div>
              <div className="absolute -left-6 -bottom-6 w-20 h-20 bg-violet-500/10 blur-[40px] rounded-full group-hover:bg-violet-500/20 transition-all duration-500"></div>

              <div className="relative z-10 p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Wallet className="w-3 h-3" />
                    Balance
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500/50 animate-pulse"></div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-sans font-semibold text-white">{user.credits}</span>
                    <span className="text-xs text-zinc-500 font-medium">.00</span>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); router.push('/billing') }}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all duration-300"
                    title="Top Up"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4 text-sm text-zinc-500">
            Not logged in
          </div>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
