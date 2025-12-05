"use client"

import React, { useState } from 'react'
import { Film, Info, Loader2, Mic, RefreshCw, Wand2, Zap } from 'lucide-react'

import FileUpload from '@/components/FileUpload'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { POST } from '@/lib/api-client'
import type { ApiResponse } from '@/lib/api-response'
import type { FileWithPreview } from '@/types'

interface VideoLipsyncFormProps {
  onSuccess?: (taskIds: number[]) => void
  userBalance: number
}

interface MediaMetadata {
  duration: number
  width?: number
  height?: number
}

const VideoLipsyncForm: React.FC<VideoLipsyncFormProps> = ({ onSuccess, userBalance }) => {
  const [videoFile, setVideoFile] = useState<FileWithPreview | null>(null)
  const [audioFile, setAudioFile] = useState<FileWithPreview | null>(null)

  // Config
  const [separateVocal, setSeparateVocal] = useState(true)
  const [useBasicMode, setUseBasicMode] = useState(false)

  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 元数据
  const [videoMetadata, setVideoMetadata] = useState<MediaMetadata | null>(null)
  const [audioMetadata, setAudioMetadata] = useState<MediaMetadata | null>(null)

  // 费用预估
  const [estimatedCost, setEstimatedCost] = useState<number>(0)

  // 提取视频元数据
  const extractVideoMetadata = (file: File): Promise<MediaMetadata> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src)
        resolve({
          duration: Math.ceil(video.duration),
          width: video.videoWidth,
          height: video.videoHeight,
        })
      }
      video.onerror = () => {
        URL.revokeObjectURL(video.src)
        reject(new Error('无法读取视频元数据'))
      }
      video.src = URL.createObjectURL(file)
    })
  }

  // 提取音频元数据
  const extractAudioMetadata = (file: File): Promise<MediaMetadata> => {
    return new Promise((resolve, reject) => {
      const audio = document.createElement('audio')
      audio.preload = 'metadata'
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(audio.src)
        resolve({
          duration: Math.ceil(audio.duration),
        })
      }
      audio.onerror = () => {
        URL.revokeObjectURL(audio.src)
        reject(new Error('无法读取音频元数据'))
      }
      audio.src = URL.createObjectURL(file)
    })
  }

  // 处理视频选择
  const handleVideoSelect = async (file: FileWithPreview) => {
    setVideoFile(file)
    setError(null)
    try {
      const metadata = await extractVideoMetadata(file.file)
      setVideoMetadata(metadata)
      updateEstimatedCost(metadata, audioMetadata)
    } catch (err) {
      console.error('提取视频元数据失败:', err)
      setError('无法读取视频信息，请确保文件格式正确')
    }
  }

  // 处理音频选择
  const handleAudioSelect = async (file: FileWithPreview) => {
    setAudioFile(file)
    setError(null)
    try {
      const metadata = await extractAudioMetadata(file.file)
      setAudioMetadata(metadata)
      updateEstimatedCost(videoMetadata, metadata)
    } catch (err) {
      console.error('提取音频元数据失败:', err)
      setError('无法读取音频信息，请确保文件格式正确')
    }
  }

  // 更新费用预估
  const updateEstimatedCost = (videoMeta: MediaMetadata | null, audioMeta: MediaMetadata | null) => {
    // 假设费用主要由生成时长决定，生成时长约为音频时长
    // 暂定每秒 10 分
    if (audioMeta) {
      const duration = audioMeta.duration
      // 简单预估
      const cost = Math.ceil(duration * 10)
      setEstimatedCost(cost)
    } else {
      setEstimatedCost(0)
    }
  }

  // 创建任务
  const handleSubmit = async () => {
    if (!videoFile || !audioFile) {
      setError('请上传视频和音频')
      return
    }

    if (userBalance < estimatedCost) {
      setError(`余额不足，当前余额: ${userBalance / 100} 元，预估费用: ${estimatedCost / 100} 元`)
      return
    }

    setError(null)
    setIsCreating(true)

    try {
      const formData = new FormData()
      formData.append('video', videoFile.file)
      formData.append('audio', audioFile.file)
      formData.append('separateVocal', separateVocal.toString())
      formData.append('useBasicMode', useBasicMode.toString())
      // formData.append('alignAudio', 'true') // Default true

      const name = videoFile.file.name.split('.')[0]
      formData.append('name', `改口型 - ${name}`)

      const taskResponse = await POST<ApiResponse<{ task: { id: number } }>>('/api/tasks/create-lipsync', formData)

      if (!taskResponse.success) {
        throw new Error(taskResponse.error)
      }

      onSuccess?.([taskResponse.data.task.id])
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建任务失败'
      setError(message)
    } finally {
      setIsCreating(false)
    }
  }

  const canSubmit = videoFile && audioFile && !isCreating

  return (
    <div className="space-y-6">
      {/* 错误提示 */}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-sm text-red-400 text-xs font-mono animate-in fade-in">
          {error}
        </div>
      )}

      {/* 视频上传 */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest border-b border-zinc-800 pb-2">
          <Film className="w-3 h-3" />
          Reference_Video (Face)
          <span className="text-[9px] text-red-400 ml-auto px-1 py-0.5 border border-red-900/30 bg-red-900/10 rounded-sm">
            [REQUIRED]
          </span>
        </label>
        <FileUpload
          type="video"
          accept="video/*"
          label="Upload Face Video"
          selectedFile={videoFile}
          onFileSelect={handleVideoSelect}
          onRemove={() => {
            setVideoFile(null)
            setVideoMetadata(null)
            updateEstimatedCost(null, audioMetadata)
          }}
        />
        {videoMetadata && (
          <div className="p-2 bg-zinc-900/30 border border-zinc-800 rounded-sm text-[10px] font-mono text-zinc-400">
            <div className="flex gap-4">
              <span>时长: {videoMetadata.duration}s</span>
              <span>尺寸: {videoMetadata.width}x{videoMetadata.height}</span>
            </div>
          </div>
        )}
      </div>

      {/* 音频上传 */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest border-b border-zinc-800 pb-2">
          <Mic className="w-3 h-3" />
          Voice_Audio
          <span className="text-[9px] text-red-400 ml-auto px-1 py-0.5 border border-red-900/30 bg-red-900/10 rounded-sm">
            [REQUIRED]
          </span>
        </label>
        <FileUpload
          type="audio"
          accept="audio/*"
          label="Upload Voice Audio"
          selectedFile={audioFile}
          onFileSelect={handleAudioSelect}
          onRemove={() => {
            setAudioFile(null)
            setAudioMetadata(null)
            updateEstimatedCost(videoMetadata, null)
          }}
          className="h-24"
        />
        {audioMetadata && (
          <div className="p-2 bg-zinc-900/30 border border-zinc-800 rounded-sm text-[10px] font-mono text-zinc-400">
            <div className="flex gap-4">
              <span>时长: {audioMetadata.duration}s</span>
            </div>
          </div>
        )}
      </div>

      {/* 选项配置 */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest border-b border-zinc-800 pb-2">
          Configuration
        </label>

        <div className="space-y-3 p-3 bg-zinc-900/20 border border-zinc-900 rounded-sm">
          {/* Separate Vocal */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-[11px] font-bold text-zinc-300">Separate Vocals</Label>
              <p className="text-[9px] text-zinc-500 font-mono">Isolate voice from background noise</p>
            </div>
            <Switch
              checked={separateVocal}
              onCheckedChange={setSeparateVocal}
              className="scale-75"
            />
          </div>

          {/* Basic Mode Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
            <div className="space-y-0.5">
              <Label className="text-[11px] font-bold text-zinc-300 flex items-center gap-2">
                Use Basic Mode
                {useBasicMode ? <Zap className="w-3 h-3 text-amber-500" /> : <RefreshCw className="w-3 h-3 text-emerald-500" />}
              </Label>
              <p className="text-[9px] text-zinc-500 font-mono">
                {useBasicMode ? "High quality (Slower)" : "Standard Lite Mode (Faster)"}
              </p>
            </div>
            <Switch
              checked={useBasicMode}
              onCheckedChange={setUseBasicMode}
              className="scale-75"
            />
          </div>
        </div>
      </div>

      {/* 提交按钮 */}
      <div className="pt-6 border-t border-zinc-800">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-3 bg-zinc-100 text-black rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-transparent hover:border-indigo-500"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating_Task...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Create_Lipsync_Task
            </>
          )}
        </button>

        {/* 费用信息 */}
        <div className="mt-4 flex justify-center">
          <div className="group relative">
            <div className="flex items-center gap-2 text-[9px] text-zinc-600 cursor-help hover:text-zinc-400 transition-colors font-mono uppercase tracking-wider">
              <span>BAL: {(userBalance / 100).toFixed(2)}</span>
              <div className="w-0.5 h-3 bg-zinc-800"></div>
              <span>EST: ~{(estimatedCost / 100).toFixed(2)} ¥</span>
              <Info className="w-3 h-3 text-zinc-700" />
            </div>

            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-black border border-zinc-700 rounded-sm shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="text-[10px] font-bold text-white mb-2 pb-2 border-b border-zinc-800 uppercase tracking-widest">
                Cost Breakdown
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-zinc-400 font-mono">
                  <span>TASK_TYPE</span>
                  <span>VIDEO_LIPSYNC</span>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-400 font-mono">
                  <span>DURATION</span>
                  <span>{audioMetadata?.duration || 0}s</span>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-400 font-mono">
                  <span>UNIT_PRICE</span>
                  <span>0.10 ¥/s</span>
                </div>
                <div className="flex justify-between text-[9px] font-bold text-emerald-500 pt-2 border-t border-zinc-800 mt-1 font-mono">
                  <span>TOTAL_EST</span>
                  <span>{(estimatedCost / 100).toFixed(2)} ¥</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoLipsyncForm
