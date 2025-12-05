"use client"

import React, { useEffect, useState } from 'react'
import { Activity, ChevronDown, Film, Mic, PlayCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { GET } from '@/lib/api-client'
import type { ApiResponse } from '@/lib/api-response'
import { TaskType } from '@/types'

import VideoMotionForm from './components/VideoMotionForm'

interface UserData {
  balance: number
}

const VideoStudio: React.FC = () => {
  const router = useRouter()
  const [activeTask, setActiveTask] = useState<TaskType>(TaskType.VIDEO_MOTION)
  const [isTaskSelectorOpen, setTaskSelectorOpen] = useState(false)
  const [userBalance, setUserBalance] = useState<number>(0)

  // 加载用户余额
  useEffect(() => {
    const fetchUserBalance = async () => {
      try {
        const response = await GET<ApiResponse<UserData>>('/api/auth/me')
        if (response.success) {
          setUserBalance(response.data.balance || 0)
        }
      } catch (error) {
        console.error('获取用户余额失败:', error)
      }
    }

    fetchUserBalance()
  }, [])

  const videoTasks = [
    {
      id: TaskType.VIDEO_MOTION,
      label: 'Motion Transfer',
      description: 'Transfer movement between videos',
      icon: Activity,
      implemented: true,
    },
    {
      id: TaskType.VIDEO_GENERATION,
      label: 'Video Generation',
      description: 'Text/Image to cinematic video',
      icon: Film,
      implemented: false,
    },
    {
      id: TaskType.VIDEO_LIPSYNC,
      label: 'Lip Sync',
      description: 'Synchronize audio with face',
      icon: Mic,
      implemented: false,
    },
  ]

  const currentTaskInfo = videoTasks.find((t) => t.id === activeTask) || videoTasks[0]

  const handleTaskSuccess = (taskIds: number[]) => {
    // 任务创建成功，跳转到 dashboard
    // 如果创建了多个任务，直接跳转到 dashboard（用户可以看到所有新创建的任务）
    // 如果只创建了 1 个任务，传递 taskId 参数高亮显示
    if (taskIds.length === 1) {
      router.push(`/dashboard?taskId=${taskIds[0]}`)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="h-full flex flex-col md:flex-row bg-[#050505] text-zinc-200 overflow-hidden fade-enter font-mono">
      {/* Left Panel: Controls */}
      <div className="w-full md:w-[500px] shrink-0 border-r border-zinc-800 flex flex-col h-full overflow-y-auto custom-scrollbar bg-[#0A0A0A] relative z-20">
        {/* Top Industrial Detail */}
        <div className="h-1 w-full bg-linear-to-r from-zinc-800 via-zinc-700 to-zinc-800"></div>

        {/* Task Selector (Dropdown Style) */}
        <div className="p-6 border-b border-zinc-800 relative z-30">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-sm"></span>
            Operation_Mode
          </label>

          <div className="relative">
            <button
              onClick={() => setTaskSelectorOpen(!isTaskSelectorOpen)}
              className="w-full flex items-center justify-between bg-black border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/30 text-white p-3.5 rounded-sm transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-zinc-900 rounded-sm text-indigo-400 border border-zinc-700">
                  <currentTaskInfo.icon className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-xs uppercase tracking-wide text-white">
                    {currentTaskInfo.label}
                  </div>
                  <div className="text-[9px] text-zinc-500 uppercase tracking-wider">
                    {currentTaskInfo.description}
                  </div>
                </div>
              </div>
              <ChevronDown
                className={`w-3 h-3 text-zinc-500 transition-transform ${isTaskSelectorOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            {isTaskSelectorOpen && (
              <div className="absolute top-full left-0 w-full mt-1 bg-[#050505] border border-zinc-800 rounded-sm shadow-2xl z-50">
                {videoTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => {
                      if (task.implemented) {
                        setActiveTask(task.id)
                        setTaskSelectorOpen(false)
                      }
                    }}
                    disabled={!task.implemented}
                    className={`w-full flex items-center gap-3 p-3.5 transition-colors text-left border-b border-zinc-900 last:border-0 ${
                      !task.implemented
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:bg-zinc-900'
                    } ${activeTask === task.id ? 'bg-zinc-900/50' : ''}`}
                  >
                    <task.icon
                      className={`w-4 h-4 ${activeTask === task.id ? 'text-indigo-400' : 'text-zinc-600'}`}
                    />
                    <div className="flex-1">
                      <div
                        className={`text-xs font-bold uppercase tracking-wide ${activeTask === task.id ? 'text-white' : 'text-zinc-400'}`}
                      >
                        {task.label}
                      </div>
                      {!task.implemented && (
                        <div className="text-[9px] text-amber-500 uppercase tracking-wider mt-0.5">
                          Coming Soon
                        </div>
                      )}
                    </div>
                    {activeTask === task.id && (
                      <div className="ml-auto w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Task Form Area */}
        <div className="p-6 flex-1">
          {activeTask === TaskType.VIDEO_MOTION && (
            <VideoMotionForm onSuccess={handleTaskSuccess} userBalance={userBalance} />
          )}

          {activeTask === TaskType.VIDEO_GENERATION && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-3">
                <Film className="w-12 h-12 text-zinc-700 mx-auto" />
                <p className="text-xs text-zinc-500 font-mono uppercase">
                  Video Generation
                  <br />
                  Coming Soon
                </p>
              </div>
            </div>
          )}

          {activeTask === TaskType.VIDEO_LIPSYNC && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-3">
                <Mic className="w-12 h-12 text-zinc-700 mx-auto" />
                <p className="text-xs text-zinc-500 font-mono uppercase">
                  Lip Sync
                  <br />
                  Coming Soon
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Preview Area */}
      <div className="flex-1 bg-black flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Background Grids */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[60px_60px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none"></div>

        <div className="absolute top-8 left-8 text-zinc-600 font-mono text-[10px] uppercase tracking-widest flex flex-col gap-1">
          <span>Viewer_Mode: Active</span>
          <span>Signal: Stable</span>
        </div>

        <div className="absolute bottom-8 right-8 text-zinc-600 font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-900 rounded-full animate-pulse"></div>
          <span>Sys_Ready</span>
        </div>

        {/* Viewport Idle */}
        <div className="text-center space-y-6 z-10 opacity-60 animate-in fade-in duration-1000 relative">
          {/* Center Target Graphic */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-zinc-800 rounded-full opacity-20 pointer-events-none"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-px bg-zinc-800 opacity-20 pointer-events-none"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-[280px] bg-zinc-800 opacity-20 pointer-events-none"></div>

          <div className="w-20 h-20 rounded-full bg-zinc-900/50 border border-zinc-700 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(255,255,255,0.05)] relative z-20">
            <PlayCircle className="w-8 h-8 text-zinc-500" />
          </div>

          <div className="space-y-2 relative z-20">
            <h3 className="text-lg font-bold text-zinc-300 uppercase tracking-widest font-mono">
              Viewport_Idle
            </h3>
            <p className="text-[10px] text-zinc-500 max-w-xs mx-auto leading-relaxed font-mono uppercase tracking-wide">
              Awaiting Input Sequence
              <br />
              Configure <strong>{currentTaskInfo.label}</strong> parameters
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoStudio