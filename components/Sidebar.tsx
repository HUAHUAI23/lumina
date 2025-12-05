"use client"

import React, { useEffect, useState } from 'react'
import { Clapperboard, Film, Frame, LayoutDashboard, Loader2, LogOut, Plus, Wallet } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { GET, POST } from '@/lib/api-client'
import type { ApiResponse } from '@/lib/api-response'

import { APP_NAME, NAVIGATION_ITEMS } from '../constants'

interface UserData {
  id: number
  username: string
  email: string | null
  avatar: string | null
  credits: number
}

// Map custom icons to nav items
const iconMap: Record<string, any> = {
  'dashboard': Clapperboard,
  'video-studio': Film,
  'image-studio': Frame,
  'billing': Wallet
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
        const response = await GET<ApiResponse<UserData>>('/api/auth/me')

        if (response.success) {
          setUser(response.data)
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
      const response = await POST<ApiResponse<void>>('/api/auth/logout')

      if (response.success) {
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
    <aside className="w-20 lg:w-72 border-r border-white/5 bg-black flex flex-col h-full transition-all duration-300 relative z-20 shrink-0">
      {/* Noise Texture */}
      <div className="absolute inset-0 bg-noise opacity-5 pointer-events-none z-0"></div>

      <div className="relative z-10 p-6 flex items-center gap-3 mb-4">
        <div className="relative w-10 h-10 flex items-center justify-center cursor-pointer group" onClick={() => router.push('/')}>
          <div className="absolute inset-0 bg-indigo-500/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <Image src="/icon.svg" alt="Lumina Logo" width={40} height={40} className="relative z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
        </div>
        <div className="hidden lg:flex flex-col cursor-pointer" onClick={() => router.push('/')}>
          <span className="font-bold text-lg text-white tracking-tight leading-none uppercase">{APP_NAME}</span>
          <span className="text-[9px] text-zinc-500 font-mono tracking-[0.2em] uppercase">Studio Pro</span>
        </div>
      </div>

      <nav className="relative z-10 flex-1 px-3 space-y-1">
        <div className="px-3 py-3 mb-2 flex items-center gap-2">
          <div className="w-1 h-1 bg-zinc-700 rounded-full"></div>
          <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Operations</span>
        </div>

        {NAVIGATION_ITEMS.map((item) => {
          const active = isActive(item.id)
          const href = item.id === 'dashboard' ? '/dashboard' : `/${item.id}`
          const Icon = iconMap[item.id] || item.icon

          return (
            <Link
              key={item.id}
              href={href}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-sm transition-all duration-200 group relative overflow-hidden border
                ${active
                  ? 'bg-zinc-900 border-zinc-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-900/30'}
              `}
            >
              {/* Active Indicator LED */}
              {active && (
                <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-4 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
              )}

              <Icon
                className={`w-4 h-4 relative z-10 transition-colors duration-300 ${active ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-400'}`}
                strokeWidth={1.5}
              />
              <span className={`hidden lg:block text-[11px] uppercase tracking-wider relative z-10 font-mono font-medium ${active ? 'translate-x-1.5' : ''} transition-transform`}>
                {item.label}
              </span>

              {/* Hover Technical Detail */}
              <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-1 h-1 bg-zinc-700 rounded-full"></div>
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="relative z-10 p-4 lg:p-6 border-t border-white/5 bg-black/50">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
          </div>
        ) : user ? (
          <>
            {/* Elegant Pay-As-You-Go Wallet Card - Film Ticket Style */}
            <div
              onClick={() => router.push('/billing')}
              className="relative overflow-hidden rounded-lg border border-white/10 bg-zinc-900/50 group cursor-pointer transition-all duration-300 hover:border-indigo-500/30 hidden lg:block mb-6"
            >
              {/* Perforations */}
              <div className="absolute top-0 bottom-0 left-1 w-1 border-r border-dashed border-zinc-700/50"></div>
              <div className="absolute top-0 bottom-0 right-1 w-1 border-l border-dashed border-zinc-700/50"></div>

              <div className="relative z-10 p-4 flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Prod. Budget</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-white tracking-tight">{user.credits}</span>
                    <span className="text-[10px] text-zinc-600 font-mono">CR</span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                  <Plus className="w-4 h-4 text-indigo-400" />
                </div>
              </div>
            </div>

            {/* User Profile */}
            <div className="hidden lg:flex items-center gap-3 px-1">
              <div className="relative cursor-pointer hover:opacity-80 transition-opacity">
                <Image
                  src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`}
                  alt="User Avatar"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full bg-zinc-800 object-cover border border-white/10 grayscale hover:grayscale-0 transition-all"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-black rounded-full"></div>
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-bold text-white truncate uppercase tracking-wide">{user.username}</p>
                <p className="text-[10px] text-zinc-600 truncate font-mono">DIRECTOR</p>
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-zinc-600 hover:text-red-400 transition-colors p-1.5 hover:bg-white/5 rounded-md"
                title="Sign Out"
              >
                {isLoggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4 text-xs font-mono text-zinc-600 uppercase tracking-widest">
            OFFLINE
          </div>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
