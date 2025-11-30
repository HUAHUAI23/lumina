"use client"

import React from 'react'
import { LogOut } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { APP_NAME, NAVIGATION_ITEMS } from '../constants'

// We don't need props for navigation anymore as we use Next.js router
const Sidebar: React.FC = () => {
  const pathname = usePathname()
  const router = useRouter()

  // Helper to check if link is active
  const isActive = (path: string) => {
    // Exact match for root or subpaths
    if (path === 'dashboard' && pathname === '/') return true
    return pathname === `/${path}` || pathname.startsWith(`/${path}/`)
  }

  const handleLogout = () => {
    router.push('/login')
  }

  return (
    <aside className="w-20 lg:w-64 border-r border-zinc-800 bg-surface flex flex-col h-full transition-all duration-300 flex-shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="relative w-8 h-8 flex items-center justify-center">
          <div className="absolute inset-0 bg-indigo-500/30 blur-md rounded-full"></div>
          <Image src="/icon.svg" alt="Lumina Logo" width={32} height={32} className="relative z-10" />
        </div>
        <span className="font-bold text-xl text-white hidden lg:block tracking-tight">{APP_NAME}</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {NAVIGATION_ITEMS.map((item) => {
          const active = isActive(item.id)
          const href = item.id === 'dashboard' ? '/dashboard' : `/${item.id}`

          return (
            <Link
              key={item.id}
              href={href}
              className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                ${active
                  ? 'bg-zinc-800 text-white shadow-inner'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}
              `}
            >
              <item.icon className={`w-5 h-5 ${active ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
              <span className="hidden lg:block font-medium text-sm">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <div className="bg-zinc-900 rounded-xl p-4 hidden lg:block border border-zinc-800">
          {/* User Profile Info */}
          <div className="flex items-center gap-3 mb-4 border-b border-zinc-800 pb-3">
            <div className="relative w-8 h-8 flex-shrink-0">
              <Image
                src="https://picsum.photos/200"
                alt="User Avatar"
                fill
                className="rounded-full bg-zinc-800 object-cover"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-zinc-900 rounded-full z-10"></div>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">Alex Creator</p>
              <p className="text-[10px] text-zinc-500 truncate uppercase tracking-wider">Early Access</p>
            </div>
          </div>

          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-zinc-400">CREDITS</span>
            <span className="text-xs font-bold text-indigo-400">850 / 1000</span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full w-[85%] rounded-full"></div>
          </div>

          <div className="flex gap-2 mt-3">
            <Link
              href="/billing"
              className="flex-1 py-1.5 text-xs bg-white text-black rounded-lg font-semibold hover:bg-zinc-200 transition-colors flex items-center justify-center"
            >
              Top Up
            </Link>
            <button
              onClick={handleLogout}
              className="px-2 py-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors flex items-center justify-center"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
