import React from 'react';
import { Project, GenerationMode } from '../types';
import { Plus, Play, Clock, MoreVertical, Wallet } from 'lucide-react';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  // Mock data
  const projects: Project[] = [
    { id: '1', title: 'Cyberpunk City', thumbnailUrl: 'https://picsum.photos/400/225', createdAt: '2 mins ago', status: 'completed', mode: GenerationMode.VIDEO_IMAGE_TEXT, cost: 15 },
    { id: '2', title: 'Product Showcase', thumbnailUrl: 'https://picsum.photos/400/226', createdAt: '1 hour ago', status: 'completed', mode: GenerationMode.VIDEO_IMAGE_AUDIO_TEXT, cost: 25 },
    { id: '3', title: 'Nature Documentary', thumbnailUrl: 'https://picsum.photos/400/227', createdAt: '2 days ago', status: 'processing', mode: GenerationMode.VIDEO_IMAGE_TEXT, cost: 15 },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back, Creator</h1>
          <p className="text-zinc-400">Your creative suite is ready.</p>
        </div>
        <button 
          onClick={() => onNavigate('create')}
          className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
        >
          <Plus className="w-5 h-5" />
          New Project
        </button>
      </div>

      <section>
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-xl font-semibold text-white">Recent Projects</h2>
          <button className="text-sm text-zinc-400 hover:text-white transition-colors">View All</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="group bg-surfaceLight border border-zinc-700/50 rounded-2xl overflow-hidden hover:border-zinc-600 transition-all duration-300 hover:shadow-2xl hover:shadow-black/50">
              <div className="relative aspect-video bg-zinc-800">
                <img src={project.thumbnailUrl} alt={project.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[2px]">
                   <button className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform">
                      <Play className="w-5 h-5 text-black ml-1" />
                   </button>
                </div>
                <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/60 backdrop-blur-md text-xs font-medium text-white">
                  {project.status === 'processing' ? 'Generating...' : '00:15'}
                </div>
              </div>
              
              <div className="p-4 flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-white group-hover:text-primary transition-colors">{project.title}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                    <Clock className="w-3 h-3" />
                    <span>{project.createdAt}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
                    <span className="uppercase text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">{project.mode}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className="text-xs text-zinc-500 font-mono">-{project.cost}c</div>
                   <button className="text-zinc-500 hover:text-white">
                    <MoreVertical className="w-5 h-5" />
                   </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      {/* Banner for Credits */}
      <section className="bg-gradient-to-r from-emerald-900/30 to-indigo-900/30 border border-emerald-500/20 rounded-3xl p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10 max-w-2xl">
           <h2 className="text-2xl font-bold text-white mb-2">Pay as you go</h2>
           <p className="text-zinc-300">You have <span className="text-emerald-400 font-bold">850 credits</span> remaining. Top up now to get a 20% bonus on your next purchase.</p>
        </div>
        <button 
             onClick={() => onNavigate('billing')}
             className="relative z-10 px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-zinc-100 transition-colors flex items-center gap-2 whitespace-nowrap"
           >
             <Wallet className="w-4 h-4" />
             Add Funds
        </button>
        {/* Abstract decoration */}
        <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </section>
    </div>
  );
};

export default Dashboard;