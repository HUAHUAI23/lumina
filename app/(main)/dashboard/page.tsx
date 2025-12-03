"use client"

import React, { useState } from 'react';
import { ArrowUpRight,Clock, Download, Film, Filter, Image as ImageIcon, Layers, MoreVertical, Play, Plus, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Project, TaskType } from '../../../types';

const Dashboard: React.FC = () => {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'video' | 'image'>('all');

  // Mock data with Mixed Types
  const projects: Project[] = [
    { 
      id: '1', 
      type: 'video',
      title: 'Cyberpunk City Intro', 
      thumbnailUrl: 'https://picsum.photos/400/225?random=1', 
      createdAt: '2 mins ago', 
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
      createdAt: '15 mins ago', 
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
      createdAt: '1 hour ago', 
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
      createdAt: '3 hours ago', 
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
      createdAt: '2 days ago', 
      status: 'processing', 
      taskType: TaskType.VIDEO_LIPSYNC, 
      cost: 15,
      duration: '00:10',
      mode: 'mode2' as any
    },
  ];

  const filteredProjects = projects.filter(p => filter === 'all' || p.type === filter);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-12 pb-20 fade-enter">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Creative Studio</h1>
          <p className="text-zinc-400">Manage your generated assets and ongoing projects.</p>
        </div>
        
        <div className="flex gap-3">
            <button 
            onClick={() => router.push('/image-studio')}
            className="flex items-center gap-2 bg-surfaceLight text-zinc-200 px-5 py-2.5 rounded-xl font-medium hover:bg-zinc-800 hover:text-white transition-all border border-border"
            >
            <ImageIcon className="w-4 h-4" />
            New Image
            </button>
            <button 
            onClick={() => router.push('/video-studio')}
            className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-50 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]"
            >
            <Plus className="w-4 h-4" />
            New Video
            </button>
        </div>
      </div>

      {/* Premium Glassmorphism Black Card / Wallet Display */}
      <section className="relative overflow-hidden rounded-[32px] p-[1px] group">
        {/* Border Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-white/10 rounded-[32px] pointer-events-none"></div>
        
        <div className="relative rounded-[31px] bg-[#08080a] overflow-hidden">
            {/* Diffused Color Mesh - More Organic */}
            <div className="absolute top-[-40%] left-[-20%] w-[600px] h-[600px] bg-indigo-500/20 blur-[130px] rounded-full mix-blend-screen opacity-80 animate-pulse duration-[8000ms]"></div>
            <div className="absolute bottom-[-40%] right-[-10%] w-[500px] h-[500px] bg-violet-600/15 blur-[120px] rounded-full mix-blend-screen opacity-60"></div>
            <div className="absolute top-[20%] right-[30%] w-[300px] h-[300px] bg-emerald-500/5 blur-[100px] rounded-full mix-blend-screen"></div>
            
            {/* Noise Texture */}
            <div className="absolute inset-0 bg-noise opacity-30 pointer-events-none"></div>

            <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-10 backdrop-blur-3xl">
               
               <div className="flex items-center gap-8">
                  {/* Icon Container */}
                  <div className="relative w-16 h-16 flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                     <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 rounded-full"></div>
                     <div className="relative w-full h-full bg-gradient-to-b from-zinc-800 to-black border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
                        <Wallet className="w-7 h-7 text-white" />
                     </div>
                  </div>
                  
                  <div>
                     <div className="flex items-center gap-2 text-zinc-400 mb-1">
                        <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">Available Balance</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                     </div>
                     <div className="flex items-baseline gap-1">
                        <span className="text-6xl font-bold text-white tracking-tighter drop-shadow-lg">850</span>
                        <span className="text-2xl text-zinc-500 font-light">.00</span>
                        <span className="ml-4 px-2.5 py-1 rounded-md text-[10px] font-bold bg-white/10 text-zinc-200 border border-white/5 uppercase tracking-wider backdrop-blur-md">Credits</span>
                     </div>
                  </div>
               </div>

               <div className="flex items-center gap-10 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-white/5 pt-6 md:pt-0">
                   <div className="hidden md:block text-right">
                      <div className="text-xs text-zinc-500 mb-1 font-medium uppercase tracking-wide">Monthly Usage</div>
                      <div className="text-xl font-medium text-zinc-200">1,240 <span className="text-xs text-zinc-600">/ 5,000</span></div>
                   </div>
                   
                   <button 
                     onClick={() => router.push('/billing')}
                     className="group relative px-8 py-3.5 rounded-full bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-all flex items-center gap-2 shadow-[0_0_25px_rgba(255,255,255,0.1)] overflow-hidden"
                   >
                     <span className="relative z-10 flex items-center gap-2">Top Up Wallet <ArrowUpRight className="w-4 h-4" /></span>
                   </button>
               </div>
            </div>
        </div>
      </section>

      {/* Assets Grid Section */}
      <section className="space-y-8">
        
        {/* Toolbar / Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-xl z-20 py-4 border-b border-white/5">
          <div className="flex bg-surfaceLight p-1 rounded-xl border border-border self-start">
            {(['all', 'video', 'image'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`
                  px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize flex items-center gap-2
                  ${filter === t ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/5' : 'text-zinc-500 hover:text-zinc-300'}
                `}
              >
                {t === 'all' && <Filter className="w-3.5 h-3.5" />}
                {t === 'video' && <Film className="w-3.5 h-3.5" />}
                {t === 'image' && <ImageIcon className="w-3.5 h-3.5" />}
                {t}s
              </button>
            ))}
          </div>
          
          <div className="text-xs text-zinc-500 font-medium px-3 py-1.5 bg-surfaceLight rounded-full border border-border">
            Showing {filteredProjects.length} assets
          </div>
        </div>
        
        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProjects.map((project) => (
            <div 
              key={project.id} 
              className="group bg-surface rounded-2xl overflow-hidden border border-border hover:border-indigo-500/30 transition-all duration-300 hover:shadow-glow flex flex-col relative"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video bg-zinc-900 overflow-hidden">
                <img 
                  src={project.thumbnailUrl} 
                  alt={project.title} 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" 
                />
                
                {/* Type-Specific Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>
                
                {project.type === 'video' ? (
                  <>
                     <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 backdrop-blur-[2px]">
                        <button className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-2xl">
                           <Play className="w-6 h-6 text-black ml-1" />
                        </button>
                     </div>
                     <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/40 backdrop-blur-md text-[10px] font-medium text-white border border-white/10">
                        {project.taskType === TaskType.VIDEO_LIPSYNC ? 'Lip Sync' : project.taskType === TaskType.VIDEO_MOTION ? 'Motion' : 'Generation'}
                     </div>
                     <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/40 backdrop-blur-md text-[10px] font-mono font-bold text-white border border-white/10 flex items-center gap-1">
                       <Film className="w-3 h-3" />
                       {project.status === 'processing' ? 'Generating...' : project.duration}
                     </div>
                  </>
                ) : (
                  <>
                    <div className="absolute top-3 right-3">
                       {project.imageCount && project.imageCount > 1 ? (
                         <div className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur text-[10px] font-bold text-white border border-white/10 flex items-center gap-1">
                           <Layers className="w-3 h-3 text-indigo-400" />
                           {project.imageCount}
                         </div>
                       ) : (
                         <div className="p-1.5 rounded-lg bg-black/60 backdrop-blur text-white border border-white/10">
                           <ImageIcon className="w-3 h-3" />
                         </div>
                       )}
                    </div>
                     <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/40 backdrop-blur-md text-[10px] font-medium text-white border border-white/10">
                        {project.taskType === TaskType.IMAGE_3D_MODEL ? '3D Model' : project.taskType === TaskType.IMAGE_IMG2IMG ? 'Img2Img' : 'Txt2Img'}
                     </div>
                    <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/40 backdrop-blur-md text-[10px] font-mono text-zinc-300 border border-white/10">
                       {project.resolution}
                    </div>
                  </>
                )}
              </div>
              
              {/* Info Container */}
              <div className="p-5 flex flex-col justify-between flex-1 relative bg-surface group-hover:bg-[#0E0E12] transition-colors">
                <div className="mb-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-base text-zinc-200 group-hover:text-indigo-400 transition-colors truncate pr-4" title={project.title}>
                      {project.title}
                    </h3>
                    <button className="text-zinc-600 hover:text-white transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
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
                
                <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
                   <div className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                      {project.cost} Credits
                   </div>
                   <button className="text-zinc-500 hover:text-white transition-colors p-1.5 hover:bg-zinc-800 rounded-lg">
                      <Download className="w-3.5 h-3.5" />
                   </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
