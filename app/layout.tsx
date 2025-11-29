import React from 'react'
import { Geist, Geist_Mono } from "next/font/google"

import Sidebar from '../components/Sidebar'

import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata = {
  title: "Lumina AI Studio",
  description: "AI Video Generation Studio",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`}>
      <body className="flex h-screen bg-background text-white font-sans selection:bg-indigo-500/30 overflow-hidden">
        <Sidebar />

        <main className="flex-1 h-full overflow-y-auto overflow-x-hidden relative">
          {/* Top Header Area (Mobile only or simplified) */}
          <div className="lg:hidden p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur z-50">
            <span className="font-bold">Lumina</span>
            <div className="text-xs bg-zinc-800 px-2 py-1 rounded">850 Credits</div>
          </div>

          {children}
        </main>
      </body>
    </html>
  )
}
