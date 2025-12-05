"use client"

import React, { useEffect, useState } from 'react'
import {
  Activity,
  Download,
  Film,
  Image as ImageIcon,
  Loader2,
  Mic,
  MoreVertical,
  Play,
  RefreshCw,
} from 'lucide-react'

import MediaViewer from '@/components/MediaViewer'
import { GET } from '@/lib/api-client'
import type { ApiResponse } from '@/lib/api-response'
import { TaskType } from '@/types'

interface MediaResource {
  type: 'image' | 'video' | 'audio'
  url: string
  metadata?: {
    width?: number
    height?: number
    duration?: number
    size?: number
    mimeType?: string
  }
}

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

interface TaskDetail {
  id: number
  type: string
  name: string
  status: string
  outputs: MediaResource[]
}

interface AssetGalleryProps {
  /**
   * 可选的任务类型过滤器，如果提供则只显示这些类型的任务
   */
  filterTypes?: TaskType[]
  /**
   * 自动刷新间隔（毫秒），默认 10 秒
   */
  refreshInterval?: number
  /**
   * 显示的任务数量限制，默认 20
   */
  limit?: number
  /**
   * 高亮显示的任务 ID（可选）
   */
  highlightTaskId?: number | null
}

const AssetGallery: React.FC<AssetGalleryProps> = ({
  filterTypes,
  refreshInterval = 10000,
  limit = 20,
  highlightTaskId,
}) => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // MediaViewer 状态
  const [selectedMedia, setSelectedMedia] = useState<{
    resource: MediaResource
    taskName: string
  } | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)

  // 任务详情缓存（包含输出资源）
  const [taskDetails, setTaskDetails] = useState<Record<number, TaskDetail>>({})

  // 获取任务列表
  const fetchTasks = React.useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      try {
        const response = await GET<ApiResponse<TasksResponse>>('/api/tasks', {
          params: {
            limit,
            offset: 0,
          },
        })

        if (response.success) {
          let fetchedTasks = response.data.tasks

          // 如果提供了 filterTypes，则过滤任务
          if (filterTypes && filterTypes.length > 0) {
            fetchedTasks = fetchedTasks.filter((task) =>
              filterTypes.includes(task.type as TaskType)
            )
          }

          setTasks(fetchedTasks)

          // 自动获取已完成任务的详情（用于显示缩略图）
          // 使用 Promise.all 批量加载，避免阻塞渲染
          if (!isRefresh) {
            const completedTasks = fetchedTasks.filter((t) => t.status === 'completed')
            Promise.all(
              completedTasks.slice(0, 5).map(async (task) => {
                try {
                  const res = await GET<ApiResponse<TaskDetail>>(`/api/tasks/${task.id}`)
                  if (res.success && res.data) {
                    setTaskDetails((prev) => ({
                      ...prev,
                      [task.id]: res.data,
                    }))
                  }
                } catch (err) {
                  console.error(`Failed to fetch detail for task ${task.id}:`, err)
                }
              })
            )
          }
        }
      } catch (error) {
        console.error('Failed to fetch tasks:', error)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [limit, filterTypes]
  )

  // 初始加载
  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // 自动刷新
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchTasks(true)
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [refreshInterval, fetchTasks])

  // 获取任务信息
  const getTaskInfo = (taskType: string) => {
    switch (taskType) {
      case TaskType.VIDEO_MOTION:
        return {
          label: 'MOTION',
          icon: Activity,
          color: 'text-indigo-400',
          bg: 'bg-indigo-500/10',
          border: 'border-indigo-500/20',
        }
      case TaskType.VIDEO_LIPSYNC:
        return {
          label: 'LIP_SYNC',
          icon: Mic,
          color: 'text-purple-400',
          bg: 'bg-purple-500/10',
          border: 'border-purple-500/20',
        }
      case TaskType.VIDEO_GENERATION:
        return {
          label: 'GEN_VIDEO',
          icon: Film,
          color: 'text-blue-400',
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/20',
        }
      case TaskType.IMAGE_TXT2IMG:
        return {
          label: 'TXT_2_IMG',
          icon: ImageIcon,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20',
        }
      case TaskType.IMAGE_IMG2IMG:
        return {
          label: 'IMG_2_IMG',
          icon: ImageIcon,
          color: 'text-teal-400',
          bg: 'bg-teal-500/10',
          border: 'border-teal-500/20',
        }
      case TaskType.IMAGE_3D_MODEL:
        return {
          label: '3D_MODEL',
          icon: ImageIcon,
          color: 'text-cyan-400',
          bg: 'bg-cyan-500/10',
          border: 'border-cyan-500/20',
        }
      default:
        return {
          label: 'UNKNOWN',
          icon: Film,
          color: 'text-zinc-400',
          bg: 'bg-zinc-500/10',
          border: 'border-zinc-500/20',
        }
    }
  }

  // 获取任务详情（包含输出资源）
  const fetchTaskDetail = async (taskId: number) => {
    // 如果已经缓存，直接返回
    if (taskDetails[taskId]) {
      return taskDetails[taskId]
    }

    try {
      const response = await GET<ApiResponse<TaskDetail>>(`/api/tasks/${taskId}`)
      if (response.success && response.data) {
        setTaskDetails((prev) => ({
          ...prev,
          [taskId]: response.data,
        }))
        return response.data
      }
    } catch (error) {
      console.error(`Failed to fetch task detail for ${taskId}:`, error)
    }
    return null
  }

  // 处理任务卡片点击 - 获取输出资源并播放
  const handleTaskClick = async (task: Task) => {
    console.log('[AssetGallery] Task clicked:', task)

    // 只有 completed 状态的任务才能查看输出
    if (task.status !== 'completed') {
      console.log('[AssetGallery] Task not completed, status:', task.status)
      return
    }

    const detail = await fetchTaskDetail(task.id)
    console.log('[AssetGallery] Task detail fetched:', detail)

    if (detail && detail.outputs && detail.outputs.length > 0) {
      // 打开第一个输出资源
      const firstOutput = detail.outputs[0]
      console.log('[AssetGallery] Opening viewer with output:', firstOutput)

      setSelectedMedia({
        resource: firstOutput,
        taskName: task.name,
      })
      setIsViewerOpen(true)
    } else {
      console.log('[AssetGallery] No outputs found for task:', task.id)
    }
  }

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diff < 60) return `${diff}S AGO`
    if (diff < 3600) return `${Math.floor(diff / 60)}M AGO`
    if (diff < 86400) return `${Math.floor(diff / 3600)}H AGO`
    return `${Math.floor(diff / 86400)}D AGO`
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className="h-full relative overflow-hidden bg-black flex items-center justify-center">
        {/* Cinematic Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.03),transparent_70%)] pointer-events-none"></div>
        <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none"></div>

        <div className="text-center space-y-6 relative z-10">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 border-4 border-white/5 border-t-indigo-500 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-4 border-white/5 border-t-indigo-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold text-white uppercase tracking-widest">
              Loading Assets
            </p>
            <p className="text-[10px] text-zinc-500 font-mono">
              Initializing production database...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 空状态
  if (tasks.length === 0) {
    return (
      <div className="h-full relative overflow-hidden bg-black flex items-center justify-center">
        {/* Cinematic Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.02),transparent_50%)] pointer-events-none"></div>
        <div className="absolute inset-0 pattern-grid-lg opacity-30 pointer-events-none"></div>
        <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none"></div>

        <div className="text-center space-y-6 opacity-60 select-none relative z-10">
          <div className="relative w-32 h-32 rounded-full border border-white/5 flex items-center justify-center mx-auto overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-indigo-500/5 to-transparent"></div>
            <Film className="w-16 h-16 text-zinc-600 relative z-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-light text-white tracking-tight">
              No Productions Yet
            </h3>
            <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
              Start Creating To See Results Here
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-black relative overflow-hidden">
      {/* Cinematic Background Layers */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.03),transparent_50%)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none"></div>

      {/* Header */}
      <div className="relative z-10 px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-surface/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-sm shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <Film className="w-3 h-3" />
            Asset_Library
          </h3>
          <div className="text-[9px] text-zinc-600 font-mono">
            {`// ${tasks.length} ${tasks.length === 1 ? 'ITEM' : 'ITEMS'}`}
          </div>
        </div>
        <button
          onClick={() => fetchTasks(true)}
          disabled={isRefreshing}
          className="p-2 rounded-lg hover:bg-white/5 transition-all disabled:opacity-50 group"
          title="Refresh"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-400 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* Asset List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 relative z-10 scroll-smooth">
        {tasks.map((task) => {
          const taskInfo = getTaskInfo(task.type)
          const isHighlighted = highlightTaskId === task.id

          const detail = taskDetails[task.id]
          const hasOutput = detail && detail.outputs && detail.outputs.length > 0
          const firstOutput = hasOutput ? detail.outputs[0] : null

          return (
            <div
              key={task.id}
              onClick={() => handleTaskClick(task)}
              className={`
                relative group rounded-xl p-3 border transition-all duration-300 overflow-hidden
                ${task.status === 'completed' ? 'cursor-pointer' : 'cursor-default'}
                ${isHighlighted
                  ? 'bg-white/5 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.2)]'
                  : 'bg-zinc-900/30 border-white/5 hover:bg-white/5 hover:border-white/10'}
              `}
            >
              {/* Highlight Indicator */}
              {isHighlighted && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
              )}

              {/* Processing Shimmer Effect */}
              {task.status === 'processing' && (
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none"></div>
              )}

              <div className="flex gap-4 relative z-10">
                {/* Thumbnail */}
                <div className="w-32 h-20 bg-black rounded-lg overflow-hidden shrink-0 relative border border-white/5 group/thumb">
                  {task.status === 'processing' ? (
                    // Processing State
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 relative">
                      <div className="absolute inset-0 bg-linear-to-r from-transparent via-indigo-500/10 to-transparent animate-shimmer"></div>
                      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin relative z-10" />
                    </div>
                  ) : (
                    <>
                      {/* 如果有输出资源且是图片/视频，显示缩略图 */}
                      {firstOutput && firstOutput.type === 'image' && (
                        <>
                          <img
                            src={firstOutput.url}
                            alt={task.name}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/thumb:scale-110"
                          />
                          {task.status === 'completed' && (
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                              <div className="p-2 bg-white/10 rounded-full border border-white/20">
                                <Play className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {firstOutput && firstOutput.type === 'video' && (
                        <>
                          <video
                            src={firstOutput.url}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/thumb:scale-110"
                            muted
                            playsInline
                          />
                          {task.status === 'completed' && (
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                              <div className="p-2 bg-white/10 rounded-full border border-white/20">
                                <Play className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          )}
                          {/* Video Duration Badge */}
                          <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur px-1.5 py-0.5 rounded text-[9px] font-mono text-white flex items-center gap-1">
                            <Film className="w-2 h-2" />
                            {firstOutput.metadata?.duration ? `${Math.round(firstOutput.metadata.duration)}s` : 'VIDEO'}
                          </div>
                        </>
                      )}

                      {/* 如果没有输出资源，显示占位符 */}
                      {!firstOutput && (
                        <>
                          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 pattern-grid-lg">
                            <taskInfo.icon className={`w-8 h-8 ${taskInfo.color} opacity-20`} />
                          </div>
                          <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none"></div>
                        </>
                      )}

                      {/* Type Badge - Bottom Left */}
                      <div
                        className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded backdrop-blur-md border ${taskInfo.border} ${taskInfo.bg} text-[8px] font-mono ${taskInfo.color} uppercase tracking-wider flex items-center gap-1`}
                      >
                        <taskInfo.icon className="w-2 h-2" />
                        {taskInfo.label}
                      </div>
                    </>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        task.status === 'processing'
                          ? 'text-amber-400'
                          : task.status === 'completed'
                            ? 'text-emerald-400'
                            : task.status === 'failed'
                              ? 'text-red-400'
                              : 'text-zinc-500'
                      }`}
                    >
                      {task.status === 'processing' ? (
                        <span className="flex items-center gap-1">
                          <div className="w-1 h-1 bg-amber-400 rounded-full animate-pulse"></div>
                          Rendering...
                        </span>
                      ) : (
                        task.status.toUpperCase()
                      )}
                    </span>
                    <span className="text-[10px] text-zinc-600 font-mono">
                      {formatTime(task.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300 line-clamp-2 leading-relaxed font-light group-hover:text-white transition-colors mb-2">
                    {task.name || `Production #${task.id}`}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-[9px] font-mono font-bold px-2 py-1 rounded-lg bg-black/30 text-zinc-400 border border-white/5">
                      {((task.actualCost ?? task.estimatedCost) / 100).toFixed(2)} Credits
                    </div>
                    <span className="text-[9px] text-zinc-700 font-mono">#{task.id}</span>
                  </div>
                </div>

                {/* Hover Actions */}
                {task.status === 'completed' && (
                  <div className="flex flex-col justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // Download logic
                      }}
                      className="p-1.5 hover:bg-indigo-500/20 rounded-lg text-zinc-500 hover:text-indigo-400 transition-colors"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // More options
                      }}
                      className="p-1.5 hover:bg-zinc-700 rounded-lg text-zinc-500 hover:text-white transition-colors"
                      title="More"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* MediaViewer 模态框 */}
      <MediaViewer
        isOpen={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false)
          setSelectedMedia(null)
        }}
        resource={selectedMedia?.resource || null}
        taskName={selectedMedia?.taskName}
      />
    </div>
  )
}

export default AssetGallery