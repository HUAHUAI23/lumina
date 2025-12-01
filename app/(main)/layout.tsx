import React from 'react'

import Sidebar from '../../components/Sidebar'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-background text-white font-sans selection:bg-indigo-500/30 overflow-hidden">
      <Sidebar />

      <main className="flex-1 h-full overflow-y-auto overflow-x-hidden relative">
        {/* Top Header Area (Mobile only or simplified) */}
        <div className="lg:hidden p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur z-50">
          <span className="font-bold">Lumina</span>
          <div className="text-xs bg-zinc-800 px-2 py-1 rounded">850 Credits</div>
        </div>

        {children}
      </main>
    </div>
  )
}
