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
 * MediaViewer - 通用媒体查看器组件（电影工作室风格）
 *
 * 根据资源类型自动渲染对应的查看器：
 * - 图片：高清大图查看 + 电影级背景效果
 * - 视频：HTML5 播放器 + 自定义电影风格控制栏
 * - 音频：渐变光球可视化 + 脉冲动画 + 自定义进度条
 *
 * 设计特点：
 * - 全局电影工作室风格（径向渐变、光晕效果、噪点纹理）
 * - 状态指示器采用电影级徽章设计（发光圆点、大写字体、描边边框）
 * - 音频采用 3D 渐变光球可视化，播放时多层脉冲动画
 * - 自定义进度条带渐变色和发光效果
 * - 统一的 backdrop blur 和边框设计
 *
 * 符合 2025 年 React 最佳实践
 */
const MediaViewer: React.FC<MediaViewerProps> = ({ isOpen, onClose, resource, taskName }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [isMuted, setIsMuted] = React.useState(false)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [audioPlaying, setAudioPlaying] = React.useState(false)
  const [audioCurrentTime, setAudioCurrentTime] = React.useState(0)
  const [audioDuration, setAudioDuration] = React.useState(0)

  // 重置播放状态和清理媒体
  useEffect(() => {
    if (!isOpen) {
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.currentTime = 0
        setIsPlaying(false)
        setIsFullscreen(false)
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        setAudioPlaying(false)
        setAudioCurrentTime(0)
      }
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

  // 音频播放/暂停
  const toggleAudioPlay = () => {
    if (audioRef.current) {
      if (audioPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setAudioPlaying(!audioPlaying)
    }
  }

  // 音频时间更新
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setAudioCurrentTime(audio.currentTime)
    const updateDuration = () => setAudioDuration(audio.duration)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('play', () => setAudioPlaying(true))
    audio.addEventListener('pause', () => setAudioPlaying(false))
    audio.addEventListener('ended', () => setAudioPlaying(false))

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('play', () => setAudioPlaying(true))
      audio.removeEventListener('pause', () => setAudioPlaying(false))
      audio.removeEventListener('ended', () => setAudioPlaying(false))
    }
  }, [resource?.type])

  // 格式化时间 (秒 -> MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
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

          {/* 音频渲染 - 电影风格可视化 */}
          {resource.type === 'audio' && (
            <div className="w-full max-w-3xl px-8 relative z-10 animate-in zoom-in-95 duration-500">
              {/* 隐藏的音频元素 */}
              <audio
                ref={audioRef}
                src={resource.url}
                preload="metadata"
                onError={(e) => {
                  console.error('[MediaViewer] Audio error:', e)
                  console.error('[MediaViewer] Audio URL:', resource.url)
                }}
                onLoadedMetadata={() => {
                  console.log('[MediaViewer] Audio loaded:', {
                    url: resource.url,
                    duration: audioRef.current?.duration,
                  })
                }}
              >
                Your browser does not support the audio tag.
              </audio>

              {/* 主容器 */}
              <div className="relative bg-zinc-900/40 backdrop-blur-2xl rounded-3xl border border-white/10 p-12 shadow-2xl overflow-hidden">
                {/* 内部光晕背景 */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.12),transparent_70%)] pointer-events-none"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.08),transparent_50%)] pointer-events-none"></div>

                {/* 音频可视化 - 渐变光球 */}
                <div className="relative flex items-center justify-center mb-12">
                  {/* 外层脉冲圆环（播放时动画） */}
                  {audioPlaying && (
                    <>
                      <div className="absolute w-64 h-64 rounded-full bg-linear-to-r from-purple-500/20 via-indigo-500/20 to-pink-500/20 blur-3xl animate-pulse"></div>
                      <div className="absolute w-56 h-56 rounded-full bg-linear-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30 blur-2xl animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                    </>
                  )}

                  {/* 中层渐变光球 */}
                  <div className={`relative w-48 h-48 rounded-full bg-linear-to-br from-purple-500/20 via-indigo-500/30 to-pink-500/20 backdrop-blur-md border border-white/20 shadow-[0_0_60px_rgba(99,102,241,0.4)] flex items-center justify-center transition-all duration-500 ${audioPlaying ? 'scale-110 shadow-[0_0_80px_rgba(139,92,246,0.6)]' : 'scale-100'}`}>
                    {/* 内层核心光球 */}
                    <div className={`absolute w-32 h-32 rounded-full bg-linear-to-br from-indigo-400/40 via-purple-400/40 to-pink-400/40 blur-xl transition-all duration-300 ${audioPlaying ? 'animate-pulse' : ''}`}></div>

                    {/* 图标容器 */}
                    <div className="relative z-10 w-20 h-20 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                      <Volume2 className={`w-10 h-10 text-indigo-300 transition-all duration-300 ${audioPlaying ? 'scale-110' : 'scale-100'}`} />
                    </div>
                  </div>
                </div>

                {/* 音频信息 */}
                <div className="text-center mb-8">
                  <h4 className="text-lg font-bold text-white mb-2 font-mono uppercase tracking-wide">
                    {taskName || 'Audio_Track'}
                  </h4>
                  {resource.metadata?.duration && (
                    <p className="text-sm text-zinc-400 font-mono">
                      Duration: {formatTime(resource.metadata.duration)}
                    </p>
                  )}
                </div>

                {/* 进度条 */}
                <div className="mb-8">
                  <div className="relative h-2 bg-black/30 rounded-full overflow-hidden border border-white/5 backdrop-blur-sm">
                    {/* 缓冲背景 */}
                    <div className="absolute inset-0 bg-linear-to-r from-indigo-500/20 to-purple-500/20"></div>

                    {/* 播放进度 */}
                    <div
                      className="absolute top-0 left-0 h-full bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_10px_rgba(99,102,241,0.6)] transition-all duration-100"
                      style={{ width: audioDuration > 0 ? `${(audioCurrentTime / audioDuration) * 100}%` : '0%' }}
                    >
                      {/* 进度头部光点 */}
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
                    </div>
                  </div>

                  {/* 时间显示 */}
                  <div className="flex items-center justify-between mt-3 text-xs font-mono text-zinc-500">
                    <span className="px-2 py-0.5 bg-black/20 rounded border border-white/5">
                      {formatTime(audioCurrentTime)}
                    </span>
                    <span className="px-2 py-0.5 bg-black/20 rounded border border-white/5">
                      {formatTime(audioDuration)}
                    </span>
                  </div>
                </div>

                {/* 控制按钮 */}
                <div className="flex items-center justify-center">
                  <button
                    onClick={toggleAudioPlay}
                    className="p-5 rounded-full bg-linear-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 hover:from-indigo-500/30 hover:via-purple-500/30 hover:to-pink-500/30 transition-all border border-white/20 hover:border-white/40 shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] backdrop-blur-md group"
                    title={audioPlaying ? 'Pause' : 'Play'}
                  >
                    {audioPlaying ? (
                      <Pause className="w-7 h-7 text-white group-hover:text-indigo-200 transition-colors" />
                    ) : (
                      <Play className="w-7 h-7 text-white group-hover:text-indigo-200 transition-colors ml-0.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MediaViewer
