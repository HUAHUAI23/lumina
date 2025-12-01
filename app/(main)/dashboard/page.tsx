"use client"

import React, { useState } from 'react'
import { ArrowUpRight, Clock, Download, Film, Filter, Image as ImageIcon, Layers, MoreVertical, Play, Plus, Wallet } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

import { GenerationMode, Project } from '../../../types'

const Dashboard: React.FC = () => {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'video' | 'image'>('all')

  // Mock data with Mixed Types
  const projects: Project[] = [
    {
      id: '1',
      type: 'video',
      title: 'Cyberpunk City Intro',
      thumbnailUrl: 'https://picsum.photos/400/225?random=1',
      createdAt: '2 mins ago',
      status: 'completed',
      mode: GenerationMode.VIDEO_IMAGE_TEXT,
      cost: 15,
      duration: '00:05'
    },
    {
      id: '2',
      type: 'image',
      title: 'Neon Character Concept',
      thumbnailUrl: 'https://picsum.photos/400/400?random=2',
      imageCount: 4,
      createdAt: '15 mins ago',
      status: 'completed',
      mode: GenerationMode.IMAGE_TEXT,
      cost: 8,
      resolution: '1:1'
    },
    {
      id: '3',
      type: 'video',
      title: 'Product Showcase v2',
      thumbnailUrl: 'https://picsum.photos/400/226?random=3',
      createdAt: '1 hour ago',
      status: 'completed',
      mode: GenerationMode.VIDEO_IMAGE_AUDIO_TEXT,
      cost: 25,
      duration: '00:12'
    },
    {
      id: '4',
      type: 'image',
      title: 'Isometric Room Batch',
      thumbnailUrl: 'https://picsum.photos/400/300?random=4',
      imageCount: 12,
      createdAt: '3 hours ago',
      status: 'completed',
      mode: GenerationMode.IMAGE_IMAGE,
      cost: 18,
      resolution: '4:3'
    },
    {
      id: '5',
      type: 'video',
      title: 'Nature Documentary',
      thumbnailUrl: 'https://picsum.photos/400/227?random=5',
      createdAt: '2 days ago',
      status: 'processing',
      mode: GenerationMode.VIDEO_IMAGE_TEXT,
      cost: 15,
      duration: '00:10'
    },
  ]

  const filteredProjects = projects.filter(p => filter === 'all' || p.type === filter)

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Creative Studio</h1>
          <p className="text-zinc-400">Manage your generated assets and ongoing projects.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/image-studio')}
            className="flex items-center gap-2 bg-zinc-800 text-white px-5 py-3 rounded-xl font-semibold hover:bg-zinc-700 transition-colors border border-zinc-700"
          >
            <ImageIcon className="w-4 h-4" />
            New Image
          </button>
          <button
            onClick={() => router.push('/video-studio')}
            className="flex items-center gap-2 bg-white text-black px-5 py-3 rounded-xl font-semibold hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
          >
            <Plus className="w-5 h-5" />
            New Video
          </button>
        </div>
      </div>

      {/* Credit Banner (Compact) */}
      <section className="bg-gradient-to-r from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex items-center justify-between relative overflow-hidden group">
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">850 <span className="text-sm font-normal text-zinc-500">credits</span></div>
            <div className="text-xs text-zinc-400">Pay-as-you-go balance</div>
          </div>
        </div>
        <button
          onClick={() => router.push('/billing')}
          className="relative z-10 text-sm font-medium text-white hover:text-indigo-400 flex items-center gap-1 transition-colors"
        >
          Top Up <ArrowUpRight className="w-4 h-4" />
        </button>
      </section>

      {/* Assets Grid Section */}
      <section className="space-y-6">

        {/* Toolbar / Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 bg-background/95 backdrop-blur z-20 py-2">
          <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 self-start">
            {(['all', 'video', 'image'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize flex items-center gap-2
                  ${filter === t ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}
                `}
              >
                {t === 'all' && <Filter className="w-3 h-3" />}
                {t === 'video' && <Film className="w-3 h-3" />}
                {t === 'image' && <ImageIcon className="w-3 h-3" />}
                {t}s
              </button>
            ))}
          </div>

          <div className="text-xs text-zinc-500 font-medium">
            Showing {filteredProjects.length} assets
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="group bg-surfaceLight border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-600 transition-all duration-300 hover:shadow-2xl hover:shadow-black/50 flex flex-col"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video bg-zinc-900 overflow-hidden">
                <Image
                  src={project.thumbnailUrl}
                  alt={project.title}
                  fill
                  className="object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                />

                {/* Type-Specific Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>

                {project.type === 'video' ? (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[1px]">
                      <button className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                        <Play className="w-5 h-5 text-black ml-1" />
                      </button>
                    </div>
                    <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/10 flex items-center gap-1">
                      <Film className="w-3 h-3" />
                      {project.status === 'processing' ? 'Generating...' : project.duration}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute top-3 right-3">
                      {project.imageCount && project.imageCount > 1 ? (
                        <div className="px-2 py-1 rounded-md bg-zinc-900/80 backdrop-blur text-[10px] font-bold text-white border border-white/10 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-indigo-400" />
                          {project.imageCount}
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-md bg-zinc-900/80 backdrop-blur text-white border border-white/10">
                          <ImageIcon className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-mono text-zinc-300 border border-white/10">
                      {project.resolution}
                    </div>
                  </>
                )}
              </div>

              {/* Info Container */}
              <div className="p-4 flex flex-col justify-between flex-1">
                <div className="mb-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-white group-hover:text-indigo-400 transition-colors truncate pr-4" title={project.title}>
                      {project.title}
                    </h3>
                    <button className="text-zinc-500 hover:text-white transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500">
                    <Clock className="w-3 h-3" />
                    <span>{project.createdAt}</span>
                    {project.status === 'processing' && (
                      <span className="flex items-center gap-1 text-amber-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Processing
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50 mt-auto">
                  <div className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                    {project.cost} Credits
                  </div>
                  <button className="text-zinc-500 hover:text-white transition-colors p-1 hover:bg-zinc-800 rounded">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Dashboard;

