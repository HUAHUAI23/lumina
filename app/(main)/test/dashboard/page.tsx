"use client"

import React, { useState } from 'react'
import { Clapperboard, Clock, Download, Film, Filter, Image as ImageIcon, Layers, MoreVertical, Play, Plus } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

import { Project, TaskType } from '@/types'

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
      createdAt: '2 MINS AGO',
      status: 'completed',
      taskType: TaskType.VIDEO_GENERATION,
      cost: 15,
      duration: '00:05',
      mode: 'mode1' as any // Legacy mode field
    },
    {
      id: '2',
      type: 'image',
      title: 'Neon Character Concept',
      thumbnailUrl: 'https://picsum.photos/400/400?random=2',
      imageCount: 4,
      createdAt: '15 MINS AGO',
      status: 'completed',
      taskType: TaskType.IMAGE_TXT2IMG,
      cost: 8,
      resolution: '1:1',
      mode: 'mode4' as any
    },
    {
      id: '3',
      type: 'video',
      title: 'Product Motion v2',
      thumbnailUrl: 'https://picsum.photos/400/226?random=3',
      createdAt: '1 HOUR AGO',
      status: 'completed',
      taskType: TaskType.VIDEO_MOTION,
      cost: 25,
      duration: '00:12',
      mode: 'mode2' as any
    },
    {
      id: '4',
      type: 'image',
      title: 'Isometric Room Batch',
      thumbnailUrl: 'https://picsum.photos/400/300?random=4',
      imageCount: 12,
      createdAt: '3 HOURS AGO',
      status: 'completed',
      taskType: TaskType.IMAGE_IMG2IMG,
      cost: 18,
      resolution: '4:3',
      mode: 'mode5' as any
    },
    {
      id: '5',
      type: 'video',
      title: 'Talking Head Demo',
      thumbnailUrl: 'https://picsum.photos/400/227?random=5',
      createdAt: '2 DAYS AGO',
      status: 'processing',
      taskType: TaskType.VIDEO_LIPSYNC,
      cost: 15,
      duration: '00:10',
      mode: 'mode2' as any
    },
  ]

  const filteredProjects = projects.filter(p => filter === 'all' || p.type === filter)

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 pb-20 fade-enter">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clapperboard className="w-5 h-5 text-indigo-500" />
            <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest">Production Hub</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Studio Dashboard</h1>
          <p className="text-zinc-400 font-light text-sm max-w-lg">Monitor active productions, manage asset library, and initialize new creative tasks.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/image-studio')}
            className="flex items-center gap-2 bg-white/5 border border-white/10 text-zinc-300 px-5 py-3 rounded-lg text-xs font-mono uppercase tracking-wider hover:bg-white/10 hover:text-white transition-all hover:border-white/20"
          >
            <ImageIcon className="w-4 h-4" />
            New Image
          </button>
          <button
            onClick={() => router.push('/video-studio')}
            className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg text-xs font-mono uppercase tracking-wider font-bold hover:bg-zinc-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)]"
          >
            <Plus className="w-4 h-4" />
            New Video
          </button>
        </div>
      </div>

      {/* Assets Grid Section */}
      <section className="space-y-6">

        {/* Toolbar / Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 bg-black/80 backdrop-blur-xl z-20 py-4 border-b border-white/5">
          <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-white/5 self-start">
            {(['all', 'video', 'image'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`
                  px-4 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all flex items-center gap-2
                  ${filter === t ? 'bg-white/10 text-white shadow-sm border border-white/5' : 'text-zinc-500 hover:text-zinc-300'}
                `}
              >
                {t === 'all' && <Filter className="w-3 h-3" />}
                {t === 'video' && <Film className="w-3 h-3" />}
                {t === 'image' && <ImageIcon className="w-3 h-3" />}
                {t}s
              </button>
            ))}
          </div>

          <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest px-3 py-1.5 bg-zinc-900/50 rounded-lg border border-white/5">
            {/* {filteredProjects.length} Assets Found */}
            {`// ${filteredProjects.length} Assets Found`}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="group bg-zinc-900/30 rounded-lg overflow-hidden border border-white/5 hover:border-indigo-500/30 transition-all duration-300 flex flex-col relative"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video bg-black overflow-hidden border-b border-white/5">
                <Image
                  src={project.thumbnailUrl}
                  alt={project.title}
                  fill
                  className="object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 grayscale group-hover:grayscale-0"
                />

                {/* Type-Specific Overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>

                {project.type === 'video' ? (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[1px]">
                      <button className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                        <Play className="w-5 h-5 text-black ml-1" />
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur border border-white/10 text-[9px] font-mono text-zinc-300 uppercase tracking-wider">
                      {project.taskType === TaskType.VIDEO_LIPSYNC ? 'LIP_SYNC' : project.taskType === TaskType.VIDEO_MOTION ? 'MOTION' : 'GEN_VIDEO'}
                    </div>
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur text-[9px] font-mono font-bold text-white border border-white/10 flex items-center gap-1">
                      <Film className="w-2.5 h-2.5" />
                      {project.status === 'processing' ? 'RENDERING...' : project.duration}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute top-2 right-2">
                      {project.imageCount && project.imageCount > 1 ? (
                        <div className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur text-[9px] font-mono text-white border border-white/10 flex items-center gap-1">
                          <Layers className="w-2.5 h-2.5 text-indigo-400" />
                          {project.imageCount}
                        </div>
                      ) : (
                        <div className="p-1 rounded bg-black/60 backdrop-blur text-white border border-white/10">
                          <ImageIcon className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur border border-white/10 text-[9px] font-mono text-zinc-300 uppercase tracking-wider">
                      {project.taskType === TaskType.IMAGE_3D_MODEL ? '3D_MODEL' : project.taskType === TaskType.IMAGE_IMG2IMG ? 'IMG_2_IMG' : 'TXT_2_IMG'}
                    </div>
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur text-[9px] font-mono text-zinc-300 border border-white/10">
                      {project.resolution}
                    </div>
                  </>
                )}
              </div>

              {/* Info Container */}
              <div className="p-4 flex flex-col justify-between flex-1 relative bg-zinc-900/20 group-hover:bg-zinc-900/40 transition-colors">
                <div className="mb-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-sm text-zinc-300 group-hover:text-white transition-colors truncate pr-4 tracking-tight" title={project.title}>
                      {project.title}
                    </h3>
                    <button className="text-zinc-600 hover:text-white transition-colors">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-500 font-mono uppercase tracking-wide">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{project.createdAt}</span>
                    {project.status === 'processing' && (
                      <span className="flex items-center gap-1 text-amber-500 ml-2">
                        <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>
                        PROCESSING
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-auto">
                  <div className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">
                    {project.cost} CR
                  </div>
                  <button className="text-zinc-500 hover:text-white transition-colors p-1 hover:bg-white/5 rounded">
                    <Download className="w-3 h-3" />
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

export default Dashboard