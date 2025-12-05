"use client"

import React, { useEffect, useRef } from 'react'
import { Download, Film, Maximize2, Pause, Play, Volume2, VolumeX, X } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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

interface MediaViewerProps {
  isOpen: boolean
  onClose: () => void
  resource: MediaResource | null
  taskName?: string
}

/**
 * MediaViewer - 通用媒体查看器组件
 *
 * 根据资源类型自动渲染对应的查看器：
 * - 图片：高清大图查看
 * - 视频：HTML5 播放器 + 自定义控制栏
 * - 音频：原生音频播放器
 *
 * 符合 2025 年 React 最佳实践
 */
const MediaViewer: React.FC<MediaViewerProps> = ({ isOpen, onClose, resource, taskName }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [isMuted, setIsMuted] = React.useState(false)
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  // 重置播放状态和清理视频
  useEffect(() => {
    if (!isOpen && videoRef.current) {
      // 暂停视频并重置到开始
      videoRef.current.pause()
      videoRef.current.currentTime = 0
      setIsPlaying(false)
      setIsFullscreen(false)
    }
  }, [isOpen])

  // 调试日志
  useEffect(() => {
    if (isOpen && resource) {
      console.log('[MediaViewer] Opening with resource:', {
        type: resource.type,
        url: resource.url,
        taskName,
      })
    }
  }, [isOpen, resource, taskName])

  // 播放/暂停
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  // 静音/取消静音
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  // 全屏
  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (!isFullscreen) {
        if (videoRef.current.requestFullscreen) {
          videoRef.current.requestFullscreen()
        }
        setIsFullscreen(true)
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen()
        }
        setIsFullscreen(false)
      }
    }
  }

  // 下载资源
  const handleDownload = () => {
    if (resource?.url) {
      const link = document.createElement('a')
      link.href = resource.url
      link.download = `${taskName || 'media'}_${Date.now()}.${resource.type === 'video' ? 'mp4' : resource.type === 'image' ? 'png' : 'mp3'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  if (!resource) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[95vw] h-[90vh] p-0 bg-black border-white/10 overflow-hidden shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{taskName || 'Media Viewer'}</DialogTitle>
          <DialogDescription>View and play generated media</DialogDescription>
        </DialogHeader>

        {/* Cinematic Background Layers */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none"></div>
        <div className="absolute inset-0 pattern-grid-lg opacity-20 pointer-events-none"></div>
        <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none"></div>

        {/* Header Bar */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-6 bg-linear-to-b from-black/90 via-black/50 to-transparent backdrop-blur-sm">
          <div className="flex items-center gap-4">
            {/* Status Indicator */}
            <div className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md bg-emerald-500/10 border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_6px_rgba(52,211,153,0.6)]"></div>
              READY
            </div>

            {/* Title */}
            <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono flex items-center gap-2">
              <Film className="w-4 h-4 text-indigo-400" />
              {taskName || 'Media_Viewer'}
            </h3>

            {/* Metadata */}
            {resource.metadata && (
              <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-2">
                {resource.metadata.width && resource.metadata.height && (
                  <span className="px-2 py-0.5 bg-black/30 rounded border border-white/5">
                    {resource.metadata.width}x{resource.metadata.height}
                  </span>
                )}
                {resource.metadata.duration && (
                  <span className="px-2 py-0.5 bg-black/30 rounded border border-white/5">
                    {Math.round(resource.metadata.duration)}s
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2.5 rounded-lg hover:bg-white/10 transition-all text-zinc-400 hover:text-indigo-400 border border-transparent hover:border-white/10 group"
              title="Download"
            >
              <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-lg hover:bg-red-500/10 transition-all text-zinc-400 hover:text-red-400 border border-transparent hover:border-red-500/20"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Media Content */}
        <div className="w-full h-full flex items-center justify-center relative bg-black">
          {/* 图片渲染 */}
          {resource.type === 'image' && (
            <div className="relative max-w-full max-h-full flex items-center justify-center animate-in zoom-in-95 duration-500">
              <img
                src={resource.url}
                alt={taskName || 'Generated image'}
                className="max-w-full max-h-full object-contain relative z-10 rounded-lg shadow-2xl"
                loading="lazy"
              />
            </div>
          )}

          {/* 视频渲染 + 自定义控制栏 */}
          {resource.type === 'video' && (
            <div className="relative w-full h-full flex items-center justify-center animate-in zoom-in-95 duration-500">
              <video
                ref={videoRef}
                src={resource.url}
                className="max-w-full max-h-full object-contain relative z-10 rounded-lg shadow-2xl"
                controls={false}
                loop
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              >
                Your browser does not support the video tag.
              </video>

              {/* Custom Video Controls */}
              <div className="absolute bottom-0 left-0 right-0 z-50 p-8 bg-linear-to-t from-black/90 via-black/50 to-transparent backdrop-blur-sm">
                <div className="flex items-center justify-center gap-6">
                  {/* Play/Pause - Primary Control */}
                  <button
                    onClick={togglePlay}
                    className="p-4 rounded-full bg-white/10 hover:bg-indigo-500/20 transition-all border border-white/20 hover:border-indigo-500/50 shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] group"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 text-white group-hover:text-indigo-300 transition-colors" />
                    ) : (
                      <Play className="w-6 h-6 text-white group-hover:text-indigo-300 transition-colors" />
                    )}
                  </button>

                  {/* Secondary Controls */}
                  <div className="flex items-center gap-3 bg-black/30 backdrop-blur-md rounded-full px-4 py-2 border border-white/10">
                    {/* Mute/Unmute */}
                    <button
                      onClick={toggleMute}
                      className="p-2 rounded-lg hover:bg-white/10 transition-all text-zinc-400 hover:text-white"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? (
                        <VolumeX className="w-5 h-5" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </button>

                    {/* Divider */}
                    <div className="w-px h-4 bg-white/10"></div>

                    {/* Fullscreen */}
                    <button
                      onClick={toggleFullscreen}
                      className="p-2 rounded-lg hover:bg-white/10 transition-all text-zinc-400 hover:text-white"
                      title="Fullscreen"
                    >
                      <Maximize2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 音频渲染 */}
          {resource.type === 'audio' && (
            <div className="w-full max-w-2xl px-8 relative z-10">
              <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-24 h-24 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                    <Volume2 className="w-12 h-12 text-indigo-400" />
                  </div>
                </div>
                <audio src={resource.url} controls className="w-full">
                  Your browser does not support the audio tag.
                </audio>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MediaViewer
