"use client"

import React, { useState } from 'react'
import {
  Box,
  Check,
  ChevronDown,
  Download, Grid,
  Image as ImageIcon, Layers,
  Loader2, Settings2, Sparkles, Trash2, Type, Wand2, X, Zap
} from 'lucide-react'
import Image from 'next/image'

import FileUpload from '@/components/FileUpload'
import type { Asset, FileWithPreview } from '@/types'

import { analyzeImage, generateAdvancedImages } from '../../../services/geminiService'

const TaskType = {
  VIDEO_LIPSYNC: 'video_lipsync',
  VIDEO_MOTION: 'video_motion',
  VIDEO_GENERATION: 'video_generation',
  IMAGE_3D_MODEL: 'image_3d_model',
  IMAGE_IMG2IMG: 'image_img2img',
  IMAGE_TXT2IMG: 'image_txt2img',
}
const ImageStudio: React.FC = () => {

  const [activeTask, setActiveTask] = useState<TaskType>(TaskType.IMAGE_TXT2IMG)

  const [isTaskSelectorOpen, setTaskSelectorOpen] = useState(false)



  // Inputs

  const [prompt, setPrompt] = useState('')

  const [uploadedAssets, setUploadedAssets] = useState<Asset[]>([])



  // Analysis

  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Settings

  const [aspectRatio, setAspectRatio] = useState('1:1')

  const [groupMode, setGroupMode] = useState(false)

  const [count, setCount] = useState(1)

  const [maxPerBatch, setMaxPerBatch] = useState<number | undefined>(undefined)



  // Output

  const [isGenerating, setIsGenerating] = useState(false)

  const [generatedImages, setGeneratedImages] = useState<string[]>([])

  // Derived State

  const estimatedMinImages = groupMode ? count * 2 : count

  const estimatedMaxImages = groupMode ? count * (maxPerBatch || 15) : count

  const estimatedCost = Math.ceil((groupMode ? (estimatedMaxImages + estimatedMinImages) / 2 : count) * 1.5)

  const handleFileUpload = async (fileWithPreview: FileWithPreview) => {

    const newAsset: Asset = {

      id: `img_${Date.now()}`,

      url: fileWithPreview.previewUrl,

      type: 'image',

      source: 'upload',

      file: fileWithPreview.file

    }

    setUploadedAssets(prev => [...prev, newAsset])

    if (uploadedAssets.length === 0) {

      setIsAnalyzing(true)

      try {

        const description = await analyzeImage(fileWithPreview.file)

        if (description) {

          setPrompt(prev => prev ? prev + "\n\nBased on image: " + description : description)

        }

      } catch (e) {

        console.error(e)

      } finally {

        setIsAnalyzing(false)

      }

    }

  }

  const removeAsset = (id: string) => {

    setUploadedAssets(prev => prev.filter(a => a.id !== id))

  }

  const handleGenerate = async () => {

    if ((activeTask === TaskType.IMAGE_IMG2IMG) && uploadedAssets.length === 0) {

      alert("Image-to-Image mode requires at least one reference image.")

      return

    }

    if (!prompt) {

      alert("Please enter a prompt.")

      return

    }

    setIsGenerating(true)

    try {

      const results = await generateAdvancedImages(prompt, uploadedAssets, {

        groupMode,

        count,

        maxPerBatch

      })

      setGeneratedImages(prev => [...results, ...prev])

    } catch (e) {

      console.error(e)

      alert("Generation failed. Please try again.")

    } finally {

      setIsGenerating(false)

    }

  }

  const imageTasks = [

    { id: TaskType.IMAGE_TXT2IMG, label: 'Text to Image', description: 'Create from scratch with prompts', icon: Type },

    { id: TaskType.IMAGE_IMG2IMG, label: 'Image to Image', description: 'Remix existing images', icon: Layers },

    { id: TaskType.IMAGE_3D_MODEL, label: '3D Model Generation', description: 'Generate 3D assets (Preview)', icon: Box },

  ]

  const currentTaskInfo = imageTasks.find(t => t.id === activeTask) || imageTasks[0]

  return (

    <div className="h-full flex flex-col md:flex-row bg-background text-zinc-100 overflow-hidden">



      {/* LEFT SIDEBAR: CONTROLS */}

      <div className="w-full md:w-[480px] flex-shrink-0 border-r border-zinc-800 flex flex-col h-full bg-surface/50 overflow-y-auto custom-scrollbar">



        {/* Task Selector Header */}

        <div className="p-6 border-b border-zinc-800 relative z-30">

          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Generation Model</label>

          <div className="relative">

            <button

              onClick={() => setTaskSelectorOpen(!isTaskSelectorOpen)}

              className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-white p-3 rounded-xl transition-all"

            >

              <div className="flex items-center gap-3">

                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">

                  <currentTaskInfo.icon className="w-5 h-5" />

                </div>

                <div className="text-left">

                  <div className="font-medium text-sm">{currentTaskInfo.label}</div>

                  <div className="text-[10px] text-zinc-400">{currentTaskInfo.description}</div>

                </div>

              </div>

              <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isTaskSelectorOpen ? 'rotate-180' : ''}`} />

            </button>

            {/* Dropdown Menu */}

            {isTaskSelectorOpen && (

              <div className="absolute top-full left-0 w-full mt-2 bg-[#121214] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">

                {imageTasks.map(task => (

                  <button

                    key={task.id}

                    onClick={() => {

                      setActiveTask(task.id)

                      setTaskSelectorOpen(false)

                    }}

                    className={`w-full flex items-center gap-3 p-3 hover:bg-zinc-800/50 transition-colors text-left ${activeTask === task.id ? 'bg-zinc-800' : ''}`}

                  >

                    <task.icon className={`w-4 h-4 ${activeTask === task.id ? 'text-indigo-400' : 'text-zinc-500'}`} />

                    <div>

                      <div className={`text-sm font-medium ${activeTask === task.id ? 'text-white' : 'text-zinc-300'}`}>{task.label}</div>

                      <div className="text-[10px] text-zinc-500">{task.description}</div>

                    </div>

                    {activeTask === task.id && <Check className="w-4 h-4 text-indigo-400 ml-auto" />}

                  </button>

                ))}

              </div>

            )}

          </div>

        </div>

        <div className="p-6 space-y-8 flex-1">



          {/* Upload Section */}

          <div className="space-y-3">

            <div className="flex justify-between items-center">

              <label className="text-sm font-medium text-white flex items-center gap-2">

                <Layers className="w-4 h-4 text-zinc-400" /> Reference Images

              </label>

              {activeTask === TaskType.IMAGE_IMG2IMG && (

                <span className="text-[10px] text-red-400 bg-red-900/20 px-2 py-0.5 rounded border border-red-900/50">Required</span>

              )}

            </div>

            <div className="grid grid-cols-4 gap-2">

              {uploadedAssets.map((asset) => (

                <div key={asset.id} className="relative group aspect-square rounded-lg overflow-hidden border border-zinc-700">

                  <img src={asset.url} className="w-full h-full object-cover" />

                  <button

                    onClick={() => removeAsset(asset.id)}

                    className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-500 rounded-full text-white transition-colors opacity-0 group-hover:opacity-100"

                  >

                    <X className="w-3 h-3" />

                  </button>

                </div>

              ))}

              <div className="col-span-1">

                <FileUpload

                  type="image"

                  accept="image/*"

                  label=""

                  selectedFile={null}

                  onFileSelect={handleFileUpload}

                  onRemove={() => { }}

                />

              </div>

            </div>

            {isAnalyzing && (

              <div className="flex items-center gap-2 text-xs text-indigo-400 animate-pulse">

                <Sparkles className="w-3 h-3" /> Analyzing image context...

              </div>

            )}

          </div>

          {/* Prompt Section */}

          <div className="space-y-3">

            <label className="text-sm font-medium text-white">Prompt</label>

            <textarea

              value={prompt}

              onChange={(e) => setPrompt(e.target.value)}

              placeholder={activeTask === TaskType.IMAGE_IMG2IMG ? "Describe changes or style to apply..." : "A futuristic city with neon lights..."}

              className="w-full h-32 bg-zinc-900/50 border border-zinc-700 rounded-xl p-4 text-sm focus:outline-none focus:border-indigo-500 resize-none transition-all placeholder:text-zinc-600"

            />

          </div>

          {/* Configuration Panel */}

          {activeTask !== TaskType.IMAGE_3D_MODEL && (

            <div className="space-y-6 pt-4 border-t border-zinc-800">

              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">

                <Settings2 className="w-3 h-3" /> Generation Settings

              </h3>

              {/* Aspect Ratio */}

              <div className="space-y-3">

                <label className="text-xs text-zinc-400">Aspect Ratio</label>

                <div className="grid grid-cols-4 gap-2">

                  {['1:1', '4:3', '16:9', '9:16'].map(ratio => (

                    <button

                      key={ratio}

                      onClick={() => setAspectRatio(ratio)}

                      className={`py-2 text-xs rounded border transition-all ${aspectRatio === ratio ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}

                    >

                      {ratio}

                    </button>

                  ))}

                </div>

              </div>

              {/* Group Mode Toggle */}

              <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">

                <div className="flex items-center gap-2">

                  <Grid className={`w-4 h-4 ${groupMode ? 'text-indigo-400' : 'text-zinc-500'}`} />

                  <div>

                    <div className="text-sm font-medium text-zinc-200">Group Mode</div>

                    <div className="text-[10px] text-zinc-500">Generate batches of variations</div>

                  </div>

                </div>

                <button

                  onClick={() => setGroupMode(!groupMode)}

                  className={`w-10 h-5 rounded-full relative transition-colors ${groupMode ? 'bg-indigo-600' : 'bg-zinc-700'}`}

                >

                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${groupMode ? 'left-6' : 'left-1'}`}></div>

                </button>

              </div>

              {/* Sliders */}

              <div className="space-y-4">

                <div className="flex justify-between text-xs">

                  <span className="text-zinc-400">{groupMode ? 'Batch Count' : 'Image Count'}</span>

                  <span className="text-white font-mono">{count}</span>

                </div>

                <input

                  type="range"

                  min="1"

                  max={groupMode ? 50 : 50}

                  value={count}

                  onChange={(e) => setCount(Number(e.target.value))}

                  className="w-full accent-indigo-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"

                />



                {groupMode && (

                  <div className="animate-in fade-in slide-in-from-top-2 space-y-4 pt-2">

                    <div className="flex justify-between text-xs">

                      <span className="text-zinc-400">Max Images per Batch</span>

                      <span className="text-white font-mono">{maxPerBatch || 'AI Decides (Max 15)'}</span>

                    </div>

                    <input

                      type="range"

                      min="0"

                      max="15"

                      step="1"

                      value={maxPerBatch || 0}

                      onChange={(e) => setMaxPerBatch(Number(e.target.value) === 0 ? undefined : Number(e.target.value))}

                      className="w-full accent-indigo-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"

                    />

                  </div>

                )}

              </div>

            </div>

          )}



          {activeTask === TaskType.IMAGE_3D_MODEL && (

            <div className="p-4 bg-indigo-900/10 border border-indigo-500/20 rounded-xl text-center">

              <Box className="w-8 h-8 text-indigo-400 mx-auto mb-2" />

              <h4 className="text-sm font-medium text-white">3D Model Preview</h4>

              <p className="text-xs text-zinc-400 mt-1">This model generates .obj files based on your prompt.</p>

            </div>

          )}

        </div>

        {/* Footer Actions */}

        <div className="p-6 border-t border-zinc-800 bg-surface z-20 sticky bottom-0">

          <button

            onClick={handleGenerate}

            disabled={isGenerating}

            className="w-full py-4 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"

          >

            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}

            {isGenerating ? 'Generating...' : 'Create'}

          </button>



          <div className="mt-4 flex justify-center">

            <div className="group relative">

              <div className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-help hover:text-zinc-300 transition-colors">

                <Zap className="w-3 h-3 text-yellow-500" />

                <span>Est. Cost: ~{estimatedCost} Credits</span>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* RIGHT PANEL: GALLERY */}

      <div className="flex-1 bg-black p-8 overflow-y-auto">

        {generatedImages.length === 0 && !isGenerating ? (

          <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">

            <div className="w-32 h-32 rounded-3xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-center">

              <ImageIcon className="w-12 h-12 opacity-20" />

            </div>

            <p className="text-sm">Generated content will appear here.</p>

          </div>

        ) : (

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

            {isGenerating && Array.from({ length: groupMode ? count : (count > 4 ? 4 : count) }).map((_, i) => (

              <div key={`load_${i}`} className="aspect-square rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse flex items-center justify-center">

                <Loader2 className="w-6 h-6 text-zinc-700 animate-spin" />

              </div>

            ))}

            {generatedImages.map((src, i) => (

              <div key={i} className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-indigo-500 transition-colors">

                <img src={src} className="w-full h-full object-cover" loading="lazy" />

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">

                  <button className="p-2 bg-white text-black rounded-full hover:scale-110 transition-transform">

                    <Download className="w-4 h-4" />

                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </div>

  )

}

export default ImageStudio
