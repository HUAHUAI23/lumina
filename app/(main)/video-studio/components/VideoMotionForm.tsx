"use client"

import React, { useState } from 'react'
import { Film, Image as ImageIcon, Info, Loader2, Sparkles, Wand2 } from 'lucide-react'

import FileUpload from '@/components/FileUpload'
import { POST } from '@/lib/api-client'
import type { ApiResponse } from '@/lib/api-response'
import type { FileWithPreview } from '@/types'

interface VideoMotionFormProps {
  onSuccess?: (taskId: number) => void
  userBalance: number
}

interface VideoMetadata {
  duration: number
  width: number
  height: number
}

const VideoMotionForm: React.FC<VideoMotionFormProps> = ({ onSuccess, userBalance }) => {
  const [imageFile, setImageFile] = useState<FileWithPreview | null>(null)
  const [videoFile, setVideoFile] = useState<FileWithPreview | null>(null)
  const [estimatedCount, setEstimatedCount] = useState<number>(1)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 视频元数据（从视频元素中提取）
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null)

  // 费用预估（简化版，实际应该调用后端 API 获取 pricing）
  const [estimatedCost, setEstimatedCost] = useState<number>(0)

  // 提取视频元数据
  const extractVideoMetadata = (file: File): Promise<VideoMetadata> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src)
        resolve({
          duration: Math.ceil(video.duration), // 向上取整（秒）
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

  // 处理视频选择
  const handleVideoSelect = async (file: FileWithPreview) => {
    setVideoFile(file)
    setError(null)

    try {
      const metadata = await extractVideoMetadata(file.file)
      setVideoMetadata(metadata)

      // 计算预估费用（假设每秒 10 分）
      const cost = Math.ceil(metadata.duration * estimatedCount * 10)
      setEstimatedCost(cost)
    } catch (err) {
      console.error('提取视频元数据失败:', err)
      setError('无法读取视频信息，请确保文件格式正确')
    }
  }

  // 处理数量变化
  const handleCountChange = (count: number) => {
    setEstimatedCount(count)
    if (videoMetadata) {
      const cost = Math.ceil(videoMetadata.duration * count * 10)
      setEstimatedCost(cost)
    }
  }

  // 创建任务（使用新的专用 API）
  const handleSubmit = async () => {
    if (!imageFile || !videoFile || !videoMetadata) {
      setError('请上传图片和视频')
      return
    }

    // 检查余额
    if (userBalance < estimatedCost) {
      setError(`余额不足，当前余额: ${userBalance / 100} 元，预估费用: ${estimatedCost / 100} 元`)
      return
    }

    setError(null)
    setIsCreating(true)

    try {
      // 构建 FormData，一次性发送所有数据到后端
      const formData = new FormData()
      formData.append('image', imageFile.file)
      formData.append('video', videoFile.file)
      formData.append('estimatedCount', estimatedCount.toString())
      formData.append('name', `动作模仿 - ${imageFile.file.name}`)

      // 调用专用的创建接口（后端会解析视频、上传 TOS、计算费用）
      const taskResponse = await POST<ApiResponse<{ id: number; estimatedCost: number }>>('/api/tasks/create-motion', formData)

      if (!taskResponse.success) {
        throw new Error(taskResponse.error)
      }

      // 成功
      onSuccess?.(taskResponse.data.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建任务失败'
      setError(message)
    } finally {
      setIsCreating(false)
    }
  }

  const canSubmit = imageFile && videoFile && videoMetadata && !isCreating

  return (
    <div className="space-y-6">
      {/* 错误提示 */}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-sm text-red-400 text-xs font-mono animate-in fade-in">
          {error}
        </div>
      )}

      {/* 图片上传 */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest border-b border-zinc-800 pb-2">
          <ImageIcon className="w-3 h-3" />
          Source_Image
          <span className="text-[9px] text-red-400 ml-auto px-1 py-0.5 border border-red-900/30 bg-red-900/10 rounded-sm">
            [REQUIRED]
          </span>
        </label>
        <FileUpload
          type="image"
          accept="image/*"
          label="Upload Reference Image"
          selectedFile={imageFile}
          onFileSelect={setImageFile}
          onRemove={() => setImageFile(null)}
        />
        <p className="text-[9px] text-zinc-500 font-mono">
          {`// 上传一张包含人物的图片作为参考图像`}
        </p>
      </div>

      {/* 视频上传 */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest border-b border-zinc-800 pb-2">
          <Film className="w-3 h-3" />
          Motion_Video
          <span className="text-[9px] text-red-400 ml-auto px-1 py-0.5 border border-red-900/30 bg-red-900/10 rounded-sm">
            [REQUIRED]
          </span>
        </label>
        <FileUpload
          type="video"
          accept="video/*"
          label="Upload Motion Reference Video"
          selectedFile={videoFile}
          onFileSelect={handleVideoSelect}
          onRemove={() => {
            setVideoFile(null)
            setVideoMetadata(null)
            setEstimatedCost(0)
          }}
        />
        {videoMetadata && (
          <div className="p-2 bg-zinc-900/30 border border-zinc-800 rounded-sm text-[10px] font-mono text-zinc-400">
            <div className="flex gap-4">
              <span>时长: {videoMetadata.duration}秒</span>
              <span>尺寸: {videoMetadata.width}x{videoMetadata.height}</span>
            </div>
          </div>
        )}
        <p className="text-[9px] text-zinc-500 font-mono">
          {`// 上传一段动作参考视频，系统将让图片中的人物模仿视频中的动作`}
        </p>
      </div>

      {/* 数量选择 */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest border-b border-zinc-800 pb-2">
          Output_Count
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((count) => (
            <button
              key={count}
              onClick={() => handleCountChange(count)}
              className={`
                flex-1 py-2 rounded-sm text-[11px] font-mono font-bold uppercase tracking-wider transition-all
                ${estimatedCount === count
                  ? 'bg-indigo-900/30 text-indigo-300 border-2 border-indigo-500'
                  : 'bg-black border border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                }
              `}
            >
              {count}
            </button>
          ))}
        </div>
        <p className="text-[9px] text-zinc-500 font-mono">
          {`// 生成视频的数量（每个视频独立生成）`}
        </p>
      </div>

      {/* AI 图片生成（禁用） */}
      <div className="space-y-3 opacity-50 pointer-events-none">
        <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest border-b border-zinc-800 pb-2">
          <Sparkles className="w-3 h-3" />
          AI_Image_Generator
          <span className="text-[9px] text-amber-400 ml-auto px-1 py-0.5 border border-amber-900/30 bg-amber-900/10 rounded-sm">
            [COMING_SOON]
          </span>
        </label>
        <div className="p-4 bg-zinc-900/20 border border-zinc-800 rounded-sm flex items-center justify-center">
          <span className="text-[10px] text-zinc-600 font-mono uppercase">
            AI 图片生成功能即将上线
          </span>
        </div>
      </div>

      {/* 提交按钮 */}
      <div className="pt-4 border-t border-zinc-800">
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
              Create_Motion_Task
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

            {/* 费用详情提示 */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-black border border-zinc-700 rounded-sm shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="text-[10px] font-bold text-white mb-2 pb-2 border-b border-zinc-800 uppercase tracking-widest">
                Cost Breakdown
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-zinc-400 font-mono">
                  <span>TASK_TYPE</span>
                  <span>VIDEO_MOTION</span>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-400 font-mono">
                  <span>DURATION</span>
                  <span>{videoMetadata?.duration || 0}s</span>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-400 font-mono">
                  <span>COUNT</span>
                  <span>{estimatedCount}</span>
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

export default VideoMotionForm
