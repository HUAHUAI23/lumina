import React from 'react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Lumina AI Studio',
  description: 'AI Video Generation Studio',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark h-full`}>
      <body className="bg-black text-white font-sans selection:bg-indigo-500/30 h-full antialiased overflow-x-hidden">
        <div className="relative min-h-screen w-full overflow-hidden">
          {/* --- Global Ambient Background Layer --- */}

          {/* Deep Atmospheric Noise */}
          <div className="fixed inset-0 z-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>

          {/* Diffused Color Blobs (Organic Distribution) */}
          <div className="fixed top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-600/10 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow pointer-events-none z-0"></div>
          <div className="fixed top-[10%] right-[-10%] w-[600px] h-[600px] bg-violet-600/10 blur-[100px] rounded-full mix-blend-screen opacity-60 animate-float-slow pointer-events-none z-0"></div>
          <div className="fixed bottom-[-20%] left-[20%] w-[700px] h-[700px] bg-blue-600/10 blur-[130px] rounded-full mix-blend-screen opacity-40 animate-float-delayed pointer-events-none z-0"></div>

          {/* Volumetric Light Rays (Top-Left Source) */}
          <div className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-100px] left-[-50px] w-[150px] h-[120vh] bg-linear-to-b from-white/5 to-transparent rotate-35 blur-2xl transform-origin-top-left opacity-30"></div>
            <div className="absolute top-[-100px] left-[50px] w-[100px] h-[120vh] bg-linear-to-b from-white/5 to-transparent rotate-40 blur-[30px] transform-origin-top-left opacity-20"></div>
            <div className="absolute top-[-100px] left-[-100px] w-[200px] h-[120vh] bg-linear-to-b from-indigo-500/5 to-transparent rotate-30 blur-[50px] transform-origin-top-left opacity-20"></div>
          </div>

          <div className="relative z-10">{children}</div>
        </div>
      </body>
    </html>
  );
}
