export type NavigationPage =
  | 'dashboard'
  | 'video-studio'
  | 'image-studio'
  | 'assets'
  | 'billing'
  | 'settings'

export enum GenerationMode {
  VIDEO_IMAGE_TEXT = 'mode1',
  VIDEO_IMAGE_AUDIO_TEXT = 'mode2',
  AUDIO_IMAGE_TEXT = 'mode3',
  IMAGE_TEXT = 'mode4',
  IMAGE_IMAGE = 'mode5',
}

export enum TaskType {
  VIDEO_GENERATION = 'video_generation',
  VIDEO_LIPSYNC = 'video_lipsync',
  VIDEO_MOTION = 'video_motion',
  IMAGE_TXT2IMG = 'image_txt2img',
  IMAGE_IMG2IMG = 'image_img2img',
  IMAGE_3D_MODEL = 'image_3d_model',
  AUDIO_TTS = 'audio_tts',
  // Workflows (组合任务)
  DIGITAL_HUMAN = 'digital_human',
}

export interface User {
  id: string
  name: string
  email: string
  credits: number
  balance: number
}

export interface Asset {
  id: string
  url: string // Blob URL for uploads, Data URL for generated
  type: 'image' | 'video' | 'audio'
  source: 'upload' | 'generated'
  file?: File // Only present if source is 'upload'
}

export interface FileWithPreview {
  file: File
  previewUrl: string
  type: 'video' | 'image' | 'audio'
}

export interface Project {
  id: string
  title: string
  thumbnailUrl: string
  videoUrl?: string
  createdAt: string
  status: 'processing' | 'completed' | 'failed'
  mode: GenerationMode
  taskType?: TaskType
  cost: number
  // New fields for dashboard
  type?: 'video' | 'image'
  duration?: string
  imageCount?: number
  resolution?: string
}

export interface CreditPackage {
  id: string
  credits: number
  price: number
  originalPrice?: number
  popular?: boolean
  description: string
}

export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  credits: number
  status: 'completed' | 'pending' | 'failed'
}

export interface AnalysisResult {
  extractedFrames: string[] // Base64 data urls
  description: string
}

export interface ChartDataPoint {
  label: string
  value: number
  date?: string
}
