"use client"

import React, { useEffect, useState } from 'react'
import {
  Activity,
  Clock,
  Download,
  Film,
  Filter,
  Image as ImageIcon,
  Library,
  Loader2,
  Mic,
  MoreVertical,
  Search,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

import { GET } from '@/lib/api-client'
import type { ApiResponse } from '@/lib/api-response'
import { TaskType } from '@/types'

interface Task {
  id: number
  type: string
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  estimatedCost: number
  actualCost?: number | null
  createdAt: string
  completedAt?: string | null
}

interface TasksResponse {
  tasks: Task[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

const AssetsPage: React.FC = () => {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'video' | 'image'>('all')
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load tasks
  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true)
      try {
        const response = await GET<ApiResponse<TasksResponse>>('/api/tasks', {
          params: {
            limit: 50,
            offset: 0,
          },
        })

        if (response.success) {
          setTasks(response.data.tasks)
        }
      } catch (error) {
        console.error('Failed to fetch tasks:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTasks()
  }, [])

  // Get task info based on type
  const getTaskInfo = (taskType: string) => {
    switch (taskType) {
      case TaskType.VIDEO_MOTION:
        return {
          label: 'MOTION',
          icon: Activity,
          color: 'text-indigo-400',
          bg: 'bg-indigo-500/10',
          border: 'border-indigo-500/20'
        }
      case TaskType.VIDEO_LIPSYNC:
        return {
          label: 'LIP_SYNC',
          icon: Mic,
          color: 'text-purple-400',
          bg: 'bg-purple-500/10',
          border: 'border-purple-500/20'
        }
      case TaskType.VIDEO_GENERATION:
        return {
          label: 'GEN_VIDEO',
          icon: Film,
          color: 'text-blue-400',
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/20'
        }
      case TaskType.IMAGE_TXT2IMG:
        return {
          label: 'TXT_2_IMG',
          icon: ImageIcon,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20'
        }
      case TaskType.IMAGE_IMG2IMG:
        return {
          label: 'IMG_2_IMG',
          icon: ImageIcon,
          color: 'text-teal-400',
          bg: 'bg-teal-500/10',
          border: 'border-teal-500/20'
        }
      case TaskType.IMAGE_3D_MODEL:
        return {
          label: '3D_MODEL',
          icon: ImageIcon,
          color: 'text-cyan-400',
          bg: 'bg-cyan-500/10',
          border: 'border-cyan-500/20'
        }
      default:
        return {
          label: 'UNKNOWN',
          icon: Film,
          color: 'text-zinc-400',
          bg: 'bg-zinc-500/10',
          border: 'border-zinc-500/20'
        }
    }
  }

  // Get status badge
  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="text-[9px] text-amber-400 px-1.5 py-0.5 border border-amber-900/30 bg-amber-900/10 rounded-sm uppercase tracking-wider font-mono">
            PENDING
          </span>
        )
      case 'processing':
        return (
          <span className="text-[9px] text-blue-400 px-1.5 py-0.5 border border-blue-900/30 bg-blue-900/10 rounded-sm uppercase tracking-wider font-mono flex items-center gap-1">
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
            PROCESSING
          </span>
        )
      case 'completed':
        return (
          <span className="text-[9px] text-emerald-400 px-1.5 py-0.5 border border-emerald-900/30 bg-emerald-900/10 rounded-sm uppercase tracking-wider font-mono">
            READY
          </span>
        )
      case 'failed':
        return (
          <span className="text-[9px] text-red-400 px-1.5 py-0.5 border border-red-900/30 bg-red-900/10 rounded-sm uppercase tracking-wider font-mono">
            FAILED
          </span>
        )
      case 'cancelled':
        return (
          <span className="text-[9px] text-zinc-500 px-1.5 py-0.5 border border-zinc-800 bg-zinc-900/10 rounded-sm uppercase tracking-wider font-mono">
            CANCELLED
          </span>
        )
      default:
        return null
    }
  }

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true
    if (filter === 'video') {
      return [TaskType.VIDEO_MOTION, TaskType.VIDEO_LIPSYNC, TaskType.VIDEO_GENERATION].includes(
        task.type as any
      )
    }
    if (filter === 'image') {
      return [TaskType.IMAGE_TXT2IMG, TaskType.IMAGE_IMG2IMG, TaskType.IMAGE_3D_MODEL].includes(
        task.type as any
      )
    }
    return true
  })

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diff < 60) return `${diff}S AGO`
    if (diff < 3600) return `${Math.floor(diff / 60)}M AGO`
    if (diff < 86400) return `${Math.floor(diff / 3600)}H AGO`
    return `${Math.floor(diff / 86400)}D AGO`
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 pb-20 fade-enter min-h-screen bg-background relative overflow-hidden">
      {/* Noise Texture */}
      <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none z-0"></div>

      {/* Header Section */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Library className="w-5 h-5 text-indigo-500" />
            <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest">
              Digital Vault
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Asset Library</h1>
          <p className="text-zinc-400 font-light text-sm max-w-lg">
            Manage your generated assets, track production status, and access your creative history.
          </p>
        </div>

        <div className="flex gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
            <input
              type="text"
              placeholder="Search assets..."
              className="bg-black/40 border border-white/10 text-white pl-9 pr-4 py-3 rounded-lg text-xs font-mono w-64 focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-600"
            />
          </div>
        </div>
      </div>

      {/* Assets Grid Section */}
      <section className="relative z-10 space-y-6">
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
            {`// ${filteredTasks.length} ITEMS`}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 text-zinc-600 mx-auto animate-spin" />
              <p className="text-xs text-zinc-500 font-mono uppercase">Syncing Database...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredTasks.length === 0 && (
          <div className="flex items-center justify-center h-64 border border-dashed border-white/5 rounded-2xl bg-white/2">
            <div className="text-center space-y-3">
              <Film className="w-12 h-12 text-zinc-800 mx-auto" />
              <p className="text-xs text-zinc-500 font-mono uppercase">
                Vault is empty
                <br />
                <span className="text-zinc-600">Start a new production to see assets here</span>
              </p>
              <button
                onClick={() => router.push('/video-studio')}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono uppercase rounded-lg transition-colors"
              >
                Create Asset
              </button>
            </div>
          </div>
        )}

        {/* Grid */}
        {!isLoading && filteredTasks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTasks.map((task) => {
              const taskInfo = getTaskInfo(task.type)

              return (
                <div
                  key={task.id}
                  className="group bg-zinc-900/30 rounded-lg overflow-hidden border border-white/5 hover:border-indigo-500/30 transition-all duration-300 flex flex-col relative hover:shadow-[0_0_30px_rgba(79,70,229,0.1)]"
                >
                  {/* Thumbnail Container */}
                  <div className="relative aspect-video bg-black overflow-hidden border-b border-white/5">
                    {/* Placeholder - In real implementation this would be the generated image/video thumbnail */}
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 pattern-grid-lg opacity-20">
                      <taskInfo.icon className={`w-12 h-12 ${taskInfo.color} opacity-20`} />
                    </div>

                    {/* Fake Film Grain Overlay */}
                    <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none"></div>

                    {/* Task Type Badge */}
                    <div className={`absolute bottom-2 left-2 px-1.5 py-0.5 rounded backdrop-blur-md border ${taskInfo.border} ${taskInfo.bg} text-[9px] font-mono ${taskInfo.color} uppercase tracking-wider shadow-lg`}>
                      {taskInfo.label}
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-2 right-2">{getStatusBadge(task.status)}</div>
                  </div>

                  {/* Info Container */}
                  <div className="p-4 flex flex-col justify-between flex-1 relative bg-zinc-900/20 group-hover:bg-zinc-900/40 transition-colors">
                    <div className="mb-3">
                      <div className="flex justify-between items-start">
                        <h3
                          className="font-medium text-sm text-zinc-300 group-hover:text-white transition-colors truncate pr-4 tracking-tight"
                          title={task.name}
                        >
                          {task.name || `Asset #${task.id}`}
                        </h3>
                        <button className="text-zinc-600 hover:text-white transition-colors">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-500 font-mono uppercase tracking-wide">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{formatTime(task.createdAt)}</span>
                        <span className="text-zinc-700">|</span>
                        <span>ID: {task.id}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-auto">
                      <div className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">
                        {((task.actualCost ?? task.estimatedCost) / 100).toFixed(2)} ¥
                      </div>
                      {task.status === 'completed' && (
                        <button className="text-zinc-400 hover:text-indigo-400 transition-colors p-1.5 hover:bg-indigo-500/10 rounded-md border border-transparent hover:border-indigo-500/20">
                          <Download className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default AssetsPage

