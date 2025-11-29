import { AnalysisResult, Asset } from '../types'

// Mock helper to simulate delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// 1. Frame Analysis Feature (MOCKED)
export const analyzeVideoContent = async (
  videoFile: File,
  frameCount: number = 3
): Promise<AnalysisResult> => {
  console.log('Mock analyzing video:', videoFile.name)
  await delay(2000) // Simulate network delay

  // Extract mock frames (just return a placeholder or try to actually extract if possible, but keeping it simple for mock)
  // We can actually use the real frame extraction logic if we want, as it is client side canvas code.
  // Let's keep the real frame extraction as it adds realism without backend.
  let frames: string[] = []
  try {
    frames = await extractFramesFromVideoFile(videoFile, frameCount)
  } catch (e) {
    console.warn('Could not extract frames, using placeholders', e)
    frames = [
      'https://picsum.photos/seed/f1/200/112',
      'https://picsum.photos/seed/f2/200/112',
      'https://picsum.photos/seed/f3/200/112',
    ]
  }

  return {
    extractedFrames: frames,
    description:
      'This appears to be a cinematic shot with high contrast lighting. The subject is centered with a blurred background (bokeh). The color palette leans towards cool blues and oranges.',
  }
}

// 2. Image Generation for Styles/Scenes (MOCKED)
export const generateStyleImages = async (
  prompt: string,
  _referenceImage?: File
): Promise<string[]> => {
  console.log('Mock generating images for:', prompt)
  await delay(3000)

  // Return random placeholder images
  return [
    `https://picsum.photos/seed/${Date.now()}1/512/512`,
    `https://picsum.photos/seed/${Date.now()}2/512/512`,
    `https://picsum.photos/seed/${Date.now()}3/512/512`,
    `https://picsum.photos/seed/${Date.now()}4/512/512`,
  ]
}

// 3. Video Generation (MOCKED)
export const generateVideo = async (
  prompt: string,
  referenceAssets: Asset[],
  videoFile?: File,
  audioFile?: File,
  options: { aspectRatio: string; resolution: '720p' | '1080p' } = {
    aspectRatio: '16:9',
    resolution: '720p',
  }
): Promise<string> => {
  console.log('Mock generating video with options:', options)
  await delay(5000) // Simulate longer generation time

  // Return a sample video URL (using a stock video link)
  // This is a Big Buck Bunny sample or similar safe public domain video
  return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
}

// --- Utilities ---
// (Kept real as it is pure frontend)
async function extractFramesFromVideoFile(videoFile: File, count: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const frames: string[] = []

    const url = URL.createObjectURL(videoFile)
    video.src = url
    video.muted = true
    video.crossOrigin = 'anonymous'
    video.playsInline = true

    video.onloadedmetadata = async () => {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const duration = video.duration
      const interval = Math.min(duration / count, 5)

      for (let i = 0; i < count; i++) {
        const time = i * interval + 0.5
        video.currentTime = time
        await new Promise<void>((r) => {
          const seekHandler = () => {
            video.removeEventListener('seeked', seekHandler)
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
              frames.push(canvas.toDataURL('image/jpeg', 0.8))
            }
            r()
          }
          video.addEventListener('seeked', seekHandler)
        })
      }

      URL.revokeObjectURL(url)
      resolve(frames)
    }

    video.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
  })
}
