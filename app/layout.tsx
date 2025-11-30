import React from 'react'
import { Geist, Geist_Mono } from "next/font/google"



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
      <body className="bg-background text-white font-sans selection:bg-indigo-500/30">
        {children}
      </body>
    </html>
  )
}
