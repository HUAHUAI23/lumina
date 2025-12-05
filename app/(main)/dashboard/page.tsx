"use client"

import React, { useState } from 'react'
import {
  Aperture, Clapperboard, Clock, Download,
  Eye, Film, Filter, Flame,
  Grid3X3,
  Heart, Image as ImageIcon, Layers, Maximize2, MoreHorizontal, Play, Search, Share2, Sparkles, TrendingUp, Zap
} from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface PublicPost {
  id: string
  title: string
  type: 'video' | 'image'
  thumbnailUrl: string
  author: {
    name: string
    avatar: string
    handle: string
  }
  stats: {
    likes: number
    views: string
    remixes: number
  }
  tags: string[]
  createdAt: string
  duration?: string
  resolution?: string
  fps?: string
  format?: string
  dimensions?: string
}

const Dashboard: React.FC = () => {
  const router = useRouter()
  const [filter, setFilter] = useState<'trending' | 'new' | 'top'>('trending')

  // Mock Community Data
  const spotlightPost: PublicPost = {
    id: 'spot_1',
    title: 'NEON GENESIS: CYBERPUNK ALLEY',
    type: 'video',
    thumbnailUrl: 'https://picsum.photos/1920/1080?random=100',
    author: {
      name: 'Elena Visuals',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena',
      handle: '@elenaviz'
    },
    stats: { likes: 12400, views: '85.2k', remixes: 432 },
    tags: ['Cyberpunk', 'Veo3', 'Cinematic'],
    createdAt: '2 hours ago',
    duration: '00:00:45:12',
    resolution: '4K',
    fps: '60fps',
    format: 'RAW',
    dimensions: '3840x2160'
  }

  const feed: PublicPost[] = [
    {
      id: '1', title: 'ABSTRACT FLUID SIMULATION', type: 'video',
      thumbnailUrl: 'https://picsum.photos/600/800?random=101',
      author: { name: 'MotionLab', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Motion', handle: '@motionlab' },
      stats: { likes: 3420, views: '12k', remixes: 89 },
      tags: ['Abstract', 'Loop'], createdAt: '4h ago', duration: '00:12:00', resolution: '4K', format: 'MP4', dimensions: '3840x2160'
    },
    {
      id: '2', title: 'ISOMETRIC ROOM DESIGN', type: 'image',
      thumbnailUrl: 'https://picsum.photos/800/600?random=102',
      author: { name: 'ArchiAI', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arch', handle: '@archiai' },
      stats: { likes: 8900, views: '45k', remixes: 120 },
      tags: ['Architecture', '3D'], createdAt: '6h ago', resolution: '8K', format: 'PNG', dimensions: '7680x4320'
    },
    {
      id: '3', title: 'CHARACTER CONCEPT: ROGUE', type: 'image',
      thumbnailUrl: 'https://picsum.photos/600/600?random=103',
      author: { name: 'CharacterForge', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Char', handle: '@forge' },
      stats: { likes: 5600, views: '28k', remixes: 67 },
      tags: ['Character', 'Fantasy'], createdAt: '8h ago', resolution: '4K', format: 'JPG', dimensions: '4096x4096'
    },
    {
      id: '4', title: 'DRONE SHOT: SWISS ALPS', type: 'video',
      thumbnailUrl: 'https://picsum.photos/800/450?random=104',
      author: { name: 'SkyHigh', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sky', handle: '@skyhigh' },
      stats: { likes: 2100, views: '8k', remixes: 12 },
      tags: ['Nature', 'Drone'], createdAt: '12h ago', duration: '01:20:00', resolution: '4K', format: 'MOV', dimensions: '3840x2160'
    },
    {
      id: '5', title: 'PRODUCT COMMERCIAL V3', type: 'video',
      thumbnailUrl: 'https://picsum.photos/600/800?random=105',
      author: { name: 'BrandBot', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Brand', handle: '@brandbot' },
      stats: { likes: 1200, views: '5k', remixes: 5 },
      tags: ['Commercial', 'Clean'], createdAt: '1d ago', duration: '00:30:00', resolution: '1080p', format: 'MP4', dimensions: '1920x1080'
    },
    {
      id: '6', title: 'CYBER SAMURAI', type: 'image',
      thumbnailUrl: 'https://picsum.photos/700/1000?random=106',
      author: { name: 'RoninArt', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ronin', handle: '@ronin' },
      stats: { likes: 15400, views: '92k', remixes: 543 },
      tags: ['Sci-Fi', 'Portrait'], createdAt: '2d ago', resolution: '6K', format: 'PNG', dimensions: '6000x4000'
    },
    {
      id: '7', title: 'LOST IN SPACE', type: 'video',
      thumbnailUrl: 'https://picsum.photos/1200/800?random=107',
      author: { name: 'Cosmos', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Cosmos', handle: '@cosmos' },
      stats: { likes: 8200, views: '30k', remixes: 200 },
      tags: ['Space', 'Cinematic'], createdAt: '3d ago', duration: '02:15:00', resolution: '4K', format: 'RAW', dimensions: '4096x2160'
    }
  ]

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-200 font-sans selection:bg-indigo-500/30 pb-20">
      {/* Studio Grid Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(to right, #444 1px, transparent 1px), linear-gradient(to bottom, #444 1px, transparent 1px)', backgroundSize: '60px 60px' }}>
      </div>

      {/* Hero Spotlight Section */}
      <section className="relative w-full h-[80vh] min-h-[600px] overflow-hidden group border-b border-white/10">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={spotlightPost.thumbnailUrl}
            alt={spotlightPost.title}
            className="w-full h-full object-cover opacity-80 grayscale sepia-[0.1] contrast-[1.25] brightness-90 group-hover:grayscale-0 group-hover:sepia-0 group-hover:contrast-100 group-hover:brightness-100 group-hover:scale-[1.01] transition-all duration-700 ease-out"
          />

          {/* Old Film Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.8)_120%)] mix-blend-multiply group-hover:opacity-0 transition-opacity duration-700"></div>

          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent"></div>

          {/* Film Grain */}
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-30 mix-blend-overlay pointer-events-none"></div>

          {/* CinemaScope Bars */}
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-black to-transparent opacity-90"></div>
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#050505] to-transparent"></div>
        </div>

        {/* Technical OSD Overlay */}
        <div className="absolute inset-0 z-10 p-8 flex flex-col justify-between pointer-events-none">
          <div className="flex justify-between items-start text-[10px] font-mono text-white/60 tracking-widest uppercase">
            <div className="flex gap-6">
              <span className="flex items-center gap-2"><div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div> REC • {spotlightPost.resolution}</span>
              <span>ISO 800</span>
              <span>{spotlightPost.fps}</span>
              <span>CODEC: {spotlightPost.format}</span>
            </div>
            <div className="flex gap-6">
              <span>T: 5600K</span>
              <span>SHUTTER 180°</span>
              <span>{spotlightPost.dimensions}</span>
            </div>
          </div>

          {/* Center Crosshair */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 opacity-30">
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white"></div>
            <div className="absolute left-1/2 top-0 h-full w-[1px] bg-white"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-white rounded-full"></div>
          </div>

          {/* Frame Corners */}
          <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-white/40"></div>
          <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-white/40"></div>
          <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-white/40"></div>
          <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-white/40"></div>
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 w-full p-8 md:p-16 z-20 flex flex-col md:flex-row items-end justify-between gap-10">
          <div className="max-w-4xl space-y-6">
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-700">
              <div className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-mono font-bold uppercase tracking-widest rounded-sm shadow-[0_0_10px_rgba(79,70,229,0.5)]">
                Spotlight
              </div>
              <div className="px-2 py-0.5 bg-white/5 border border-white/10 text-zinc-300 text-[10px] font-mono uppercase tracking-widest rounded-sm backdrop-blur-sm flex items-center gap-2">
                <Flame className="w-3 h-3 text-orange-500" />
                Trending #1
              </div>
            </div>

            <h1 className="text-5xl md:text-8xl font-bold text-white tracking-tighter leading-[0.9] uppercase font-sans mix-blend-screen drop-shadow-2xl">
              {spotlightPost.title}
            </h1>

            <div className="flex items-center gap-8 text-sm font-mono text-zinc-400 border-l-2 border-indigo-500 pl-4 bg-gradient-to-r from-black/50 to-transparent p-2">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8 rounded-sm ring-1 ring-white/20">
                  <AvatarImage src={spotlightPost.author.avatar} />
                  <AvatarFallback className="rounded-sm">{spotlightPost.author.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-white text-xs font-bold tracking-wider uppercase">{spotlightPost.author.name}</span>
                  <span className="text-[10px] opacity-60">DIR. {spotlightPost.author.handle}</span>
                </div>
              </div>
              <div className="w-px h-8 bg-white/10"></div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider opacity-60">Duration</span>
                <span className="text-white">{spotlightPost.duration}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider opacity-60">Created</span>
                <span className="text-white">{spotlightPost.createdAt}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            <Button variant="outline" className="h-12 w-12 rounded-sm bg-black/40 backdrop-blur-md border-white/20 hover:bg-white hover:text-black hover:border-white transition-all">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => router.push('/video-studio')}
              className="h-12 px-8 rounded-sm bg-white text-black hover:bg-zinc-200 font-bold text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all"
            >
              <Sparkles className="w-4 h-4 mr-2 text-indigo-600" />
              Remix Sequence
            </Button>
          </div>
        </div>
      </section>

      {/* Discovery Feed */}
      <div className="max-w-[1920px] mx-auto p-6 md:p-8 space-y-8 relative z-10">

        {/* Toolbar */}
        <div className="sticky top-0 z-40 py-4 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-1">
              {['trending', 'new', 'top'].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t as any)}
                  className={cn(
                    "px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all duration-200 border border-transparent",
                    filter === t
                      ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                      : "text-zinc-500 hover:text-zinc-300 hover:border-white/20"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-80 group/search">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 group-focus-within/search:text-white transition-colors" />
                <Input
                  type="text"
                  placeholder="SEARCH ASSETS..."
                  className="bg-zinc-900/50 border-white/10 focus-visible:ring-0 focus-visible:border-white/40 pl-9 h-9 rounded-sm text-xs font-mono text-zinc-200 placeholder:text-zinc-700 transition-all uppercase tracking-wider"
                />
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-sm border-white/10 hover:bg-white hover:text-black text-zinc-400">
                <Filter className="w-3 h-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-sm border-white/10 hover:bg-white hover:text-black text-zinc-400">
                <Grid3X3 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Discovery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {feed.map((post, i) => (
            <div
              key={post.id}
              className="group relative bg-[#0A0A0A] border border-white/5 hover:border-white/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)]"
            >
              {/* Image Container */}
              <div className="relative w-full aspect-video cursor-pointer overflow-hidden bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.thumbnailUrl}
                  alt={post.title}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 grayscale-[0.3] group-hover:grayscale-0"
                />

                {/* Technical Overlay */}
                <div className="absolute inset-0 p-3 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40 backdrop-blur-[1px]">
                  {/* Top Bar */}
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2">
                      <Badge variant="outline" className={cn(
                        "text-[9px] font-mono rounded-none uppercase tracking-wider backdrop-blur-md border-white/20",
                        post.type === 'video' ? "bg-indigo-500/20 text-indigo-200" : "bg-emerald-500/20 text-emerald-200"
                      )}>
                        {post.format || 'RAW'}
                      </Badge>
                      <Badge variant="outline" className="bg-black/50 border-white/20 text-white text-[9px] font-mono rounded-none uppercase tracking-wider backdrop-blur-md">
                        {post.dimensions}
                      </Badge>
                    </div>

                    <div className="flex gap-1">
                      <Button size="icon" className="h-6 w-6 rounded-sm bg-white/10 border border-white/20 text-white hover:bg-white hover:text-black transition-colors">
                        <Download className="w-3 h-3" />
                      </Button>
                      <Button size="icon" className="h-6 w-6 rounded-sm bg-white text-black hover:bg-indigo-500 hover:text-white transition-colors">
                        <Zap className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Center Action */}
                  <div className="flex justify-center items-center gap-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    {post.type === 'video' ? (
                      <>
                        <div className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-white hover:text-black transition-all rounded-sm">
                          <Play className="w-5 h-5 fill-current" />
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-white/80">Preview Scene</span>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-white hover:text-black transition-all rounded-sm">
                          <Maximize2 className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-white/80">View Full Res</span>
                      </>
                    )}
                  </div>

                  {/* Bottom Bar */}
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2">
                      {post.type === 'video' ? <Clapperboard className="w-3 h-3 text-zinc-400" /> : <ImageIcon className="w-3 h-3 text-zinc-400" />}
                      <span className="font-mono text-[9px] text-white/70">{post.type === 'video' ? post.duration : 'STILL'}</span>
                    </div>
                    <span className="font-mono text-[9px] text-white/50">{post.resolution}</span>
                  </div>
                </div>

                {/* Corner Markers */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-white/20 group-hover:border-indigo-500 transition-colors"></div>
                <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-white/20 group-hover:border-indigo-500 transition-colors"></div>
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-white/20 group-hover:border-indigo-500 transition-colors"></div>
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-white/20 group-hover:border-indigo-500 transition-colors"></div>
              </div>

              {/* Card Info */}
              <div className="p-3 border-t border-white/5 bg-[#0A0A0A]">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-zinc-200 font-bold text-xs uppercase tracking-wide truncate group-hover:text-indigo-400 transition-colors">{post.title}</h3>
                  <MoreHorizontal className="w-3 h-3 text-zinc-600 shrink-0 hover:text-white cursor-pointer" />
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-sm bg-zinc-800 overflow-hidden ring-1 ring-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={post.author.avatar} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase group-hover:text-zinc-300 transition-colors">{post.author.name}</span>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-600">
                    <div className="flex items-center gap-1 hover:text-pink-500 transition-colors cursor-pointer">
                      <Heart className="w-3 h-3" />
                      {post.stats.likes > 1000 ? (post.stats.likes / 1000).toFixed(1) + 'k' : post.stats.likes}
                    </div>
                    <div className="flex items-center gap-1 hover:text-blue-500 transition-colors cursor-pointer">
                      <Eye className="w-3 h-3" />
                      {post.stats.views}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
