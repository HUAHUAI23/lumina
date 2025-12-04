"use client"

import React, { useState } from 'react'
import {
  Box,
  Check,
  ChevronDown,
  Download, Grid,
  Image as ImageIcon, Layers,
  Loader2, Settings2, Sparkles, Type, Wand2, X, Zap
} from 'lucide-react'

import FileUpload from '@/components/FileUpload'
import type { Asset, FileWithPreview } from '@/types'

import { analyzeImage, generateAdvancedImages } from '../../../services/geminiService'

const TASK_TYPES = {
  VIDEO_LIPSYNC: 'video_lipsync',
  VIDEO_MOTION: 'video_motion',
  VIDEO_GENERATION: 'video_generation',
  IMAGE_3D_MODEL: 'image_3d_model',
  IMAGE_IMG2IMG: 'image_img2img',
  IMAGE_TXT2IMG: 'image_txt2img',
} as const

type TaskType = typeof TASK_TYPES[keyof typeof TASK_TYPES]

const ImageStudio: React.FC = () => {

  const [activeTask, setActiveTask] = useState<TaskType>(TASK_TYPES.IMAGE_TXT2IMG)

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

    if ((activeTask === TASK_TYPES.IMAGE_IMG2IMG) && uploadedAssets.length === 0) {

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

    { id: TASK_TYPES.IMAGE_TXT2IMG, label: 'Text to Image', description: 'Create from scratch with prompts', icon: Type },

    { id: TASK_TYPES.IMAGE_IMG2IMG, label: 'Image to Image', description: 'Remix existing images', icon: Layers },

    { id: TASK_TYPES.IMAGE_3D_MODEL, label: '3D Model Generation', description: 'Generate 3D assets (Preview)', icon: Box },

  ]

  const currentTaskInfo = imageTasks.find(t => t.id === activeTask) || imageTasks[0]

  return (

    <div className="h-full flex flex-col md:flex-row bg-[#050505] text-zinc-100 overflow-hidden font-mono">

      {/* LEFT SIDEBAR: CONTROLS */}

      <div className="w-full md:w-[480px] shrink-0 border-r border-zinc-800 flex flex-col h-full bg-[#0A0A0A] overflow-y-auto custom-scrollbar relative z-10">

        {/* Industrial Detail Lines */}
        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-zinc-700/50 to-transparent z-20"></div>

        {/* Task Selector Header */}

        <div className="p-5 border-b border-zinc-800 relative z-30 bg-[#0A0A0A]">

          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-sm"></span>
            Generation Model_ID
          </label>

          <div className="relative">

            <button

              onClick={() => setTaskSelectorOpen(!isTaskSelectorOpen)}

              className="w-full flex items-center justify-between bg-black border border-zinc-800 hover:border-zinc-600 text-zinc-100 p-3 rounded-sm transition-all group"

            >

              <div className="flex items-center gap-3">

                <div className="p-1.5 bg-zinc-900 rounded-sm text-indigo-400 border border-zinc-800 group-hover:border-indigo-500/50 transition-colors">

                  <currentTaskInfo.icon className="w-4 h-4" />

                </div>

                <div className="text-left">

                  <div className="font-bold text-xs uppercase tracking-wide">{currentTaskInfo.label}</div>

                  <div className="text-[9px] text-zinc-500 uppercase tracking-wider">{currentTaskInfo.description}</div>

                </div>

              </div>

              <ChevronDown className={`w-3 h-3 text-zinc-600 transition-transform ${isTaskSelectorOpen ? 'rotate-180' : ''}`} />

            </button>

            {/* Dropdown Menu */}

            {isTaskSelectorOpen && (

              <div className="absolute top-full left-0 w-full mt-1 bg-black border border-zinc-800 rounded-sm shadow-2xl overflow-hidden z-50">

                {imageTasks.map(task => (

                  <button

                    key={task.id}

                    onClick={() => {

                      setActiveTask(task.id)

                      setTaskSelectorOpen(false)

                    }}

                    className={`w-full flex items-center gap-3 p-3 hover:bg-zinc-900 transition-colors text-left border-b border-zinc-900 last:border-0 ${activeTask === task.id ? 'bg-zinc-900/50' : ''}`}

                  >

                    <task.icon className={`w-3 h-3 ${activeTask === task.id ? 'text-indigo-400' : 'text-zinc-600'}`} />

                    <div>

                      <div className={`text-xs font-bold uppercase tracking-wide ${activeTask === task.id ? 'text-white' : 'text-zinc-400'}`}>{task.label}</div>

                    </div>

                    {activeTask === task.id && <div className="ml-auto w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>}

                  </button>

                ))}

              </div>

            )}

          </div>

        </div>

        <div className="p-6 space-y-8 flex-1">



          {/* Upload Section */}

          <div className="space-y-4">

            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">

              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">

                <Layers className="w-3 h-3" /> Input_Assets

              </label>

              {activeTask === TASK_TYPES.IMAGE_IMG2IMG && (

                <span className="text-[9px] text-red-400 bg-red-900/10 px-1.5 py-0.5 border border-red-900/30 uppercase tracking-wider">[REQUIRED]</span>

              )}

            </div>

            <div className="grid grid-cols-4 gap-2">

              {uploadedAssets.map((asset) => (

                <div key={asset.id} className="relative group aspect-square rounded-sm overflow-hidden border border-zinc-800 bg-zinc-900/30">
                  {/* Corner marks */}
                  <div className="absolute top-0 left-0 w-1 h-1 border-l border-t border-zinc-500 opacity-50"></div>
                  <div className="absolute top-0 right-0 w-1 h-1 border-r border-t border-zinc-500 opacity-50"></div>
                  <div className="absolute bottom-0 left-0 w-1 h-1 border-l border-b border-zinc-500 opacity-50"></div>
                  <div className="absolute bottom-0 right-0 w-1 h-1 border-r border-b border-zinc-500 opacity-50"></div>

                  <img src={asset.url} alt="Reference asset" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />

                  <button

                    onClick={() => removeAsset(asset.id)}

                    className="absolute top-0.5 right-0.5 p-1 bg-black/80 hover:bg-red-900/80 text-white transition-colors opacity-0 group-hover:opacity-100 border border-zinc-800"

                  >

                    <X className="w-2.5 h-2.5" />

                  </button>

                  <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-[8px] text-zinc-500 px-1 py-0.5 font-mono truncate border-t border-zinc-800">
                    ID: {asset.id.slice(-4)}
                  </div>

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

              <div className="flex items-center gap-2 text-[10px] text-indigo-400 uppercase tracking-wider animate-pulse bg-indigo-900/10 p-2 border border-indigo-500/20">

                <Sparkles className="w-3 h-3" /> System Analysis in Progress...

              </div>

            )}

          </div>

          {/* Prompt Section */}

          <div className="space-y-3">

            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-l-2 border-indigo-500 pl-2">Command_Prompt</label>

            <div className="relative group">
              <div className="absolute inset-0 border border-zinc-700 rounded-sm pointer-events-none group-focus-within:border-indigo-500/50 transition-colors"></div>
              {/* Tech corners */}
              <div className="absolute top-0 left-0 w-1.5 h-1.5 border-l border-t border-zinc-600"></div>
              <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-r border-b border-zinc-600"></div>

              <textarea

                value={prompt}

                onChange={(e) => setPrompt(e.target.value)}

                placeholder={activeTask === TASK_TYPES.IMAGE_IMG2IMG ? "// Enter modification parameters..." : "// Enter scene description..."}

                className="w-full h-32 bg-black/50 border-0 rounded-sm p-3 text-xs font-mono focus:outline-none focus:ring-0 resize-none transition-all placeholder:text-zinc-700 text-zinc-300"

              />
            </div>

          </div>

          {/* Configuration Panel */}

          {activeTask !== TASK_TYPES.IMAGE_3D_MODEL && (

            <div className="space-y-6 pt-6 border-t border-zinc-800">

              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">

                <Settings2 className="w-3 h-3" /> Output_Configuration

              </h3>

              {/* Aspect Ratio */}

              <div className="space-y-3">

                <label className="text-[9px] text-zinc-600 uppercase tracking-widest">Frame Ratio</label>

                <div className="grid grid-cols-4 gap-1">

                  {['1:1', '4:3', '16:9', '9:16'].map(ratio => (

                    <button

                      key={ratio}

                      onClick={() => setAspectRatio(ratio)}

                      className={`py-2 text-[10px] font-bold rounded-sm border transition-all uppercase tracking-wide ${aspectRatio === ratio ? 'bg-indigo-900/20 border-indigo-500 text-indigo-400' : 'bg-black border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400'}`}

                    >

                      {ratio}

                    </button>

                  ))}

                </div>

              </div>

              {/* Group Mode Toggle */}

              <div className="flex items-center justify-between p-3 bg-black border border-zinc-800 rounded-sm">

                <div className="flex items-center gap-3">

                  <div className={`p-1.5 rounded-sm border ${groupMode ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400' : 'border-zinc-800 bg-zinc-900 text-zinc-600'}`}>
                    <Grid className="w-3.5 h-3.5" />
                  </div>

                  <div>

                    <div className="text-[10px] font-bold text-zinc-300 uppercase tracking-wide">Batch_Processing</div>

                    <div className="text-[9px] text-zinc-600 uppercase tracking-wider">Generate Variations</div>

                  </div>

                </div>

                <button

                  onClick={() => setGroupMode(!groupMode)}

                  className={`w-8 h-4 rounded-sm relative transition-colors border ${groupMode ? 'bg-indigo-900/30 border-indigo-500' : 'bg-zinc-900 border-zinc-700'}`}

                >

                  <div className={`absolute top-0.5 bottom-0.5 w-3 bg-current rounded-xs transition-all ${groupMode ? 'right-0.5 text-indigo-400' : 'left-0.5 text-zinc-500'}`}></div>

                </button>

              </div>

              {/* Sliders */}

              <div className="space-y-5">

                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] uppercase tracking-widest">

                    <span className="text-zinc-500">{groupMode ? 'Batch_Count' : 'Output_Count'}</span>

                    <span className="text-indigo-400 font-bold">[{count.toString().padStart(2, '0')}]</span>

                  </div>

                  <input

                    type="range"

                    min="1"

                    max={groupMode ? 50 : 50}

                    value={count}

                    onChange={(e) => setCount(Number(e.target.value))}

                    className="w-full h-1 bg-zinc-800 rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black"

                  />
                </div>

                {groupMode && (

                  <div className="animate-in fade-in slide-in-from-top-2 space-y-2 pt-2 border-t border-zinc-800/50">

                    <div className="flex justify-between text-[9px] uppercase tracking-widest">

                      <span className="text-zinc-500">Max_Per_Batch</span>

                      <span className="text-indigo-400 font-bold">{maxPerBatch ? `[${maxPerBatch.toString().padStart(2, '0')}]` : '[AUTO]'}</span>

                    </div>

                    <input

                      type="range"

                      min="0"

                      max="15"

                      step="1"

                      value={maxPerBatch || 0}

                      onChange={(e) => setMaxPerBatch(Number(e.target.value) === 0 ? undefined : Number(e.target.value))}

                      className="w-full h-1 bg-zinc-800 rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black"

                    />

                  </div>

                )}

              </div>

            </div>

          )}



          {activeTask === TASK_TYPES.IMAGE_3D_MODEL && (

            <div className="p-4 bg-zinc-900/30 border border-dashed border-zinc-700 rounded-sm text-center">

              <Box className="w-6 h-6 text-indigo-500 mx-auto mb-2 opacity-50" />

              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">3D Mesh Preview</h4>

              <p className="text-[9px] text-zinc-600 mt-1 font-mono uppercase">Generates .obj geometry from prompt</p>

            </div>

          )}

        </div>

        {/* Footer Actions */}

        <div className="p-5 border-t border-zinc-800 bg-[#0A0A0A] z-20 sticky bottom-0">

          <button

            onClick={handleGenerate}

            disabled={isGenerating}

            className="w-full py-3 bg-zinc-100 text-black rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-white disabled:opacity-50 transition-all flex items-center justify-center gap-2 border border-transparent hover:border-indigo-500 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] group"

          >

            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4 group-hover:text-indigo-600 transition-colors" />}

            {isGenerating ? 'Processing...' : 'Execute_Generation'}

          </button>



          <div className="mt-4 flex justify-center">

            <div className="group relative">

              <div className="flex items-center gap-2 text-[9px] text-zinc-600 cursor-help hover:text-zinc-400 transition-colors font-mono uppercase tracking-wider">

                <Zap className="w-3 h-3 text-yellow-600" />

                <span>Cost_Est: {estimatedCost} CR</span>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* RIGHT PANEL: GALLERY */}

      <div className="flex-1 bg-black p-8 overflow-y-auto relative">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[40px_40px] pointer-events-none"></div>

        {generatedImages.length === 0 && !isGenerating ? (

          <div className="h-full flex flex-col items-center justify-center text-zinc-700 space-y-4 relative z-10">

            <div className="w-24 h-24 rounded-sm border border-zinc-800 bg-zinc-900/20 flex items-center justify-center relative">
              <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-zinc-600"></div>
              <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-zinc-600"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-zinc-600"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-zinc-600"></div>

              <ImageIcon className="w-8 h-8 opacity-20" />

            </div>

            <p className="text-[10px] font-mono uppercase tracking-widest">Output_Buffer_Empty</p>

          </div>

        ) : (

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 relative z-10">

            {isGenerating && Array.from({ length: groupMode ? count : (count > 4 ? 4 : count) }).map((_, i) => (

              <div key={`load_${i}`} className="aspect-square rounded-sm bg-zinc-900/50 border border-zinc-800 animate-pulse flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-b from-transparent via-indigo-500/5 to-transparent -translate-y-full animate-[shimmer_2s_infinite]"></div>
                <div className="text-[9px] font-mono text-indigo-500/50 uppercase tracking-widest">Rendering...</div>
              </div>

            ))}

            {generatedImages.map((src, i) => (

              <div key={i} className="group relative aspect-square rounded-sm overflow-hidden bg-black border border-zinc-800 hover:border-indigo-500 transition-all">

                <img src={src} alt={`Generated image ${i}`} className="w-full h-full object-cover" loading="lazy" />

                {/* Tech Overlay */}
                <div className="absolute top-2 left-2 px-1 py-0.5 bg-black/70 text-[8px] font-mono text-zinc-400 border border-zinc-800 uppercase">IMG_{i.toString().padStart(3, '0')}</div>

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-[1px]">

                  <button className="p-2 bg-white text-black rounded-sm hover:scale-105 transition-transform flex items-center justify-center">

                    <Download className="w-3.5 h-3.5" />

                  </button>
                  <span className="text-[9px] font-mono text-white uppercase tracking-widest mt-1">Export_Asset</span>

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
