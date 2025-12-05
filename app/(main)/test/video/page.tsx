"use client"

import React, { useState } from 'react'
import { Activity, Check, ChevronDown, Film, Image as ImageIcon, Info, Loader2, Mic, Monitor, MonitorPlay, PlayCircle, Settings2, Smartphone, Sparkles, Square, Tv, Wand2, X } from 'lucide-react'

import FileUpload from '@/components/FileUpload'
import { analyzeVideoContent, generateStyleImages, generateVideo } from '@/services/geminiService'
import { AnalysisResult, Asset, FileWithPreview, TaskType } from '@/types'

const VideoStudio: React.FC = () => {

  const [activeTask, setActiveTask] = useState<TaskType>(TaskType.VIDEO_GENERATION)

  const [isTaskSelectorOpen, setTaskSelectorOpen] = useState(false)

  const [prompt, setPrompt] = useState('')

  const [isGenerating, setIsGenerating] = useState(false)

  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const [isGeneratingImages, setIsGeneratingImages] = useState(false)



  // Files

  const [videoFile, setVideoFile] = useState<FileWithPreview | null>(null)

  const [audioFile, setAudioFile] = useState<FileWithPreview | null>(null)

  // Visual Context (Reference Images)

  const [referenceAssets, setReferenceAssets] = useState<Asset[]>([])

  const [refTab, setRefTab] = useState<'upload' | 'generate'>('upload')



  // Image Generator State

  const [imageGenPrompt, setImageGenPrompt] = useState('')

  const [generatedCandidates, setGeneratedCandidates] = useState<Asset[]>([])

  // Analysis State

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)

  // Output Settings

  const [aspectRatio, setAspectRatio] = useState<string>('16:9')

  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p')

  // Output

  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)

  const hasReferenceAssets = referenceAssets.length > 0

  const handleAnalyze = async () => {

    if (!videoFile) return

    setIsAnalyzing(true)

    try {

      const result = await analyzeVideoContent(videoFile.file)

      setAnalysisResult(result)



      // Auto-populate main prompt if empty

      if (!prompt) {

        setPrompt(`A cinematic scene featuring: ${result.description}`)

      }



      // Auto-populate Image Generator Prompt

      setImageGenPrompt(`Cinematic concept art of ${result.description}, detailed, 8k`)



      // Switch to Generate Tab to nudge user

      setRefTab('generate')



    } catch (_error) {

      alert("Analysis failed. Please ensure API Key is set.")

    } finally {

      setIsAnalyzing(false)

    }

  }

  const handleGenerateImages = async () => {

    if (!imageGenPrompt) return

    setIsGeneratingImages(true)

    try {

      const images = await generateStyleImages(imageGenPrompt, videoFile?.file)



      const newAssets: Asset[] = images.map((url, i) => ({

        id: `gen_${Date.now()}_${i}`,

        url,

        type: 'image',

        source: 'generated'

      }))

      setGeneratedCandidates(newAssets)

    } catch (e) {

      console.error(e)

    } finally {

      setIsGeneratingImages(false)

    }

  }

  const toggleReferenceAsset = (asset: Asset) => {

    if (referenceAssets.find(a => a.id === asset.id)) {

      setReferenceAssets(prev => prev.filter(a => a.id !== asset.id))

    } else {

      if (referenceAssets.length >= 3) {

        alert("Maximum 3 reference images allowed.")

        return

      }

      setReferenceAssets(prev => [...prev, asset])

    }

  }

  const handleFileUpload = (fileWithPreview: FileWithPreview) => {

    const asset: Asset = {

      id: `up_${Date.now()}`,

      url: fileWithPreview.previewUrl,

      type: 'image',

      source: 'upload',

      file: fileWithPreview.file

    }

    if (referenceAssets.length >= 3) {

      alert("Maximum 3 reference images allowed.")

      return

    }

    setReferenceAssets(prev => [...prev, asset])

  }

  const handleGenerate = async () => {
    // Check if API_KEY is available (client-side env check usually requires NEXT_PUBLIC_ prefix or similar, 
    // but assuming process.env is polyfilled or this is just a placeholder check)
    // Removed process.env.API_KEY check to avoid build errors if not configured, or user will handle it.

    setIsGenerating(true)

    setGeneratedVideoUrl(null)

    try {

      // Pass the settings to the service

      const url = await generateVideo(

        prompt,

        referenceAssets,

        videoFile?.file,

        audioFile?.file,

        { aspectRatio, resolution }

      )

      setGeneratedVideoUrl(url)

    } catch (error) {

      console.error(error)

      alert("Generation failed. Check console. Ensure you have selected a Pay-as-you-go Project Key.")

    } finally {

      setIsGenerating(false)

    }

  }

  const videoTasks = [

    { id: TaskType.VIDEO_GENERATION, label: 'Video Generation', description: 'Text/Image to cinematic video', icon: Film },

    { id: TaskType.VIDEO_LIPSYNC, label: 'Lip Sync', description: 'Synchronize audio with face', icon: Mic },

    { id: TaskType.VIDEO_MOTION, label: 'Motion Transfer', description: 'Transfer movement between videos', icon: Activity },

  ]

  const aspectRatios = [

    { id: '16:9', label: '16:9', icon: Monitor },

    { id: '9:16', label: '9:16', icon: Smartphone },

    { id: '1:1', label: '1:1', icon: Square },

    { id: '4:3', label: '4:3', icon: Tv },

    { id: '21:9', label: '21:9', icon: MonitorPlay },

  ]

  const currentTaskInfo = videoTasks.find(t => t.id === activeTask) || videoTasks[0]

  return (

    <div className="h-full flex flex-col md:flex-row bg-[#050505] text-zinc-200 overflow-hidden fade-enter font-mono">



      {/* Left Panel: Controls */}

      <div className="w-full md:w-[500px] shrink-0 border-r border-zinc-800 flex flex-col h-full overflow-y-auto custom-scrollbar bg-[#0A0A0A] relative z-20">

        {/* Top Industrial Detail */}
        <div className="h-1 w-full bg-linear-to-r from-zinc-800 via-zinc-700 to-zinc-800"></div>

        {/* --- Task Selector (Dropdown Style) --- */}

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

                  <div className="font-bold text-xs uppercase tracking-wide text-white">{currentTaskInfo.label}</div>

                  <div className="text-[9px] text-zinc-500 uppercase tracking-wider">{currentTaskInfo.description}</div>

                </div>

              </div>

              <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${isTaskSelectorOpen ? 'rotate-180' : ''}`} />

            </button>

            {/* Dropdown Menu */}

            {isTaskSelectorOpen && (

              <div className="absolute top-full left-0 w-full mt-1 bg-[#050505] border border-zinc-800 rounded-sm shadow-2xl z-50">

                {videoTasks.map(task => (

                  <button

                    key={task.id}

                    onClick={() => {

                      setActiveTask(task.id)

                      setTaskSelectorOpen(false)

                      setAnalysisResult(null)

                    }}

                    className={`w-full flex items-center gap-3 p-3.5 hover:bg-zinc-900 transition-colors text-left border-b border-zinc-900 last:border-0 ${activeTask === task.id ? 'bg-zinc-900/50' : ''}`}

                  >

                    <task.icon className={`w-4 h-4 ${activeTask === task.id ? 'text-indigo-400' : 'text-zinc-600'}`} />

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



          {/* 1. Source Video Section (Relevant for all Video Tasks) */}

          <div className="space-y-3">

            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">

              <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest">

                <Film className="w-3 h-3" />

                {activeTask === TaskType.VIDEO_LIPSYNC ? 'Face_Input' : 'Source_Input'}

              </label>

              {videoFile && (

                <button

                  onClick={handleAnalyze}

                  disabled={isAnalyzing}

                  className="text-[9px] font-mono uppercase tracking-wider flex items-center gap-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors px-2 py-1 rounded-sm border border-indigo-500/20 hover:bg-indigo-500/10"

                >

                  {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}

                  Analyze_Content

                </button>

              )}

            </div>

            <FileUpload

              type="video"

              accept="video/*"

              label={activeTask === TaskType.VIDEO_LIPSYNC ? 'Upload Video with Face' : 'Upload Source (Optional)'}

              selectedFile={videoFile}

              onFileSelect={setVideoFile}

              onRemove={() => { setVideoFile(null); setAnalysisResult(null) }}

            />



            {/* Analysis Results */}

            {analysisResult && (

              <div className="p-3 bg-zinc-900/30 border border-zinc-800 rounded-sm animate-in fade-in slide-in-from-top-2">

                <div className="flex justify-between items-center mb-2">

                  <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest flex items-center gap-1">
                    <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse"></div>
                    Analysis_Complete
                  </span>

                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar mb-2">

                  {analysisResult.extractedFrames.map((frame, i) => (

                    <img key={i} src={frame} alt={`Frame ${i}`} className="w-12 h-12 object-cover rounded-sm border border-zinc-700 opacity-80 hover:opacity-100 transition-opacity" />

                  ))}

                </div>

                <p className="text-[10px] text-zinc-400 bg-black/40 p-2 rounded-sm border border-zinc-800 line-clamp-3 font-mono">

                  &gt; {analysisResult.description}

                </p>

              </div>

            )}

          </div>

          {/* 2. Visual Context (Reference Images) */}

          {activeTask === TaskType.VIDEO_GENERATION && (

            <div className="space-y-3">

              <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest border-b border-zinc-800 pb-2">

                <ImageIcon className="w-3 h-3" /> Visual_Reference

                <span className="text-zinc-600 text-[9px] font-normal ml-auto font-mono">[{referenceAssets.length}/3]</span>

              </label>

              <div className="bg-black border border-zinc-800 rounded-sm overflow-hidden">

                {/* Tabs */}

                <div className="flex border-b border-zinc-800">

                  <button

                    onClick={() => setRefTab('upload')}

                    className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-widest transition-colors ${refTab === 'upload' ? 'bg-zinc-900 text-white border-b-2 border-indigo-500' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/50'}`}

                  >

                    Manual_Upload

                  </button>

                  <button

                    onClick={() => setRefTab('generate')}

                    className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-widest transition-colors ${refTab === 'generate' ? 'bg-zinc-900 text-white border-b-2 border-indigo-500' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/50'}`}

                  >

                    AI_Generator

                  </button>

                </div>

                {/* Tab Content */}

                <div className="p-3 min-h-[150px]">

                  {refTab === 'upload' ? (

                    <div className="space-y-3">

                      {referenceAssets.length < 3 && (

                        <FileUpload

                          type="image"

                          accept="image/*"

                          label="Add Reference Asset"

                          selectedFile={null}

                          onFileSelect={handleFileUpload}

                          onRemove={() => { }}

                        />

                      )}



                      <div className="grid grid-cols-3 gap-2">

                        {referenceAssets.filter(a => a.source === 'upload').map((asset) => (

                          <div key={asset.id} className="relative group aspect-square rounded-sm overflow-hidden border border-zinc-800">

                            <img src={asset.url} alt="Reference asset" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />

                            <button

                              onClick={() => toggleReferenceAsset(asset)}

                              className="absolute top-0 right-0 p-1 bg-black/80 hover:bg-red-900 text-white opacity-0 group-hover:opacity-100 transition-all border-l border-b border-zinc-800"

                            >

                              <X className="w-3 h-3" />

                            </button>

                          </div>

                        ))}

                      </div>

                    </div>

                  ) : (

                    <div className="space-y-3">

                      <div className="flex gap-2">

                        <input

                          type="text"

                          value={imageGenPrompt}

                          onChange={(e) => setImageGenPrompt(e.target.value)}

                          placeholder="// Concept description..."

                          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-sm px-3 py-2 text-[10px] font-mono focus:outline-none focus:border-indigo-500/50 text-white placeholder:text-zinc-600"

                        />

                        <button

                          onClick={handleGenerateImages}

                          disabled={isGeneratingImages || !imageGenPrompt}

                          className="px-3 bg-indigo-600/80 hover:bg-indigo-600 rounded-sm text-white disabled:opacity-50 transition-colors border border-transparent hover:border-indigo-400"

                        >

                          {isGeneratingImages ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}

                        </button>

                      </div>

                      <div className="grid grid-cols-2 gap-2">

                        {generatedCandidates.map((asset) => {

                          const isSelected = referenceAssets.find(a => a.id === asset.id)

                          return (

                            <div

                              key={asset.id}

                              onClick={() => toggleReferenceAsset(asset)}

                              className={`relative cursor-pointer group aspect-square rounded-sm overflow-hidden border transition-all ${isSelected ? 'border-indigo-500 opacity-100' : 'border-zinc-800 opacity-60 hover:opacity-100 hover:border-zinc-600'}`}

                            >

                              <img src={asset.url} alt="Style candidate" className="w-full h-full object-cover" />

                              {isSelected && (

                                <div className="absolute top-0 right-0 bg-indigo-500 text-white p-0.5">

                                  <Check className="w-2.5 h-2.5" />

                                </div>

                              )}

                            </div>

                          )

                        })}

                      </div>

                    </div>

                  )}

                </div>

              </div>

            </div>

          )}

          {/* 3. Audio Upload */}

          <div className="space-y-3">

            <label className="text-[10px] font-bold text-zinc-400 flex justify-between uppercase tracking-widest border-b border-zinc-800 pb-2">

              Audio_Track

              {activeTask === TaskType.VIDEO_LIPSYNC && <span className="text-[9px] text-red-400 px-1 py-0.5 border border-red-900/30 bg-red-900/10 rounded-sm">[REQUIRED]</span>}

            </label>

            <FileUpload

              type="audio"

              accept="audio/*"

              label="Upload Voiceover/Music"

              selectedFile={audioFile}

              onFileSelect={setAudioFile}

              onRemove={() => setAudioFile(null)}

            />

          </div>

          {/* 4. Main Prompt */}

          <div className="space-y-3">

            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-l-2 border-indigo-500 pl-2">Scene_Prompt</label>

            <div className="relative group">
              {/* Tech corners */}
              <div className="absolute top-0 left-0 w-1.5 h-1.5 border-l border-t border-zinc-600"></div>
              <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-r border-b border-zinc-600"></div>

              <textarea

                value={prompt}

                onChange={(e) => setPrompt(e.target.value)}

                placeholder={activeTask === TaskType.VIDEO_LIPSYNC ? "// Lipsync mode active..." : "// Describe camera, action, lighting..."}

                className="w-full h-24 bg-black/30 border border-zinc-800 rounded-sm p-3 text-[11px] font-mono focus:outline-none focus:border-indigo-500/50 transition-all resize-none text-zinc-300 placeholder:text-zinc-700"

              />
            </div>

          </div>

          {/* 5. Output Settings */}

          {activeTask === TaskType.VIDEO_GENERATION && (

            <div className="space-y-4 pt-4 border-t border-zinc-800">

              <div className="flex justify-between items-center">

                <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest">

                  <Settings2 className="w-3 h-3" /> Render_Config

                </label>

                {hasReferenceAssets && (

                  <span className="text-[9px] bg-indigo-900/20 text-indigo-400 px-1.5 py-0.5 rounded-sm border border-indigo-500/30 flex items-center gap-1 font-mono uppercase">

                    <Info className="w-2.5 h-2.5" /> Ref_Lock_Active

                  </span>

                )}

              </div>



              <div className="space-y-4">

                <div className={`space-y-2 ${hasReferenceAssets ? 'opacity-50 pointer-events-none' : ''}`}>

                  <label className="text-[9px] text-zinc-600 uppercase tracking-widest">Aspect_Ratio</label>

                  <div className="grid grid-cols-5 gap-1">

                    {aspectRatios.map((ratio) => (

                      <button

                        key={ratio.id}

                        onClick={() => setAspectRatio(ratio.id)}

                        className={`flex flex-col items-center justify-center p-2 rounded-sm border transition-all duration-200 
    
                           ${aspectRatio === ratio.id

                            ? 'bg-indigo-900/20 border-indigo-500 text-indigo-300'

                            : 'bg-black border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400'

                          }`}

                      >

                        <ratio.icon className="w-3.5 h-3.5 mb-1" />

                        <span className="text-[9px] font-bold">{ratio.label}</span>

                      </button>

                    ))}

                  </div>

                </div>



                <div className={`space-y-2 ${hasReferenceAssets ? 'opacity-50 pointer-events-none' : ''}`}>

                  <label className="text-[9px] text-zinc-600 uppercase tracking-widest">Output_Res</label>

                  <div className="flex bg-black rounded-sm p-1 border border-zinc-800">

                    <button

                      onClick={() => setResolution('720p')}

                      className={`flex-1 py-1 rounded-sm text-[10px] font-mono transition-colors ${resolution === '720p' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}

                    >

                      720p

                    </button>

                    <button

                      onClick={() => setResolution('1080p')}

                      className={`flex-1 py-1 rounded-sm text-[10px] font-mono transition-colors ${resolution === '1080p' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}

                    >

                      1080p

                    </button>

                  </div>

                </div>

              </div>

            </div>

          )}

        </div>

        <div className="p-5 border-t border-zinc-800 bg-[#0A0A0A] z-10 sticky bottom-0">

          <button

            onClick={handleGenerate}

            disabled={isGenerating || (activeTask === TaskType.VIDEO_GENERATION && !prompt)}

            className="w-full py-3 bg-zinc-100 text-black rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-transparent hover:border-indigo-500"

          >

            {isGenerating ? (

              <>

                <Loader2 className="w-4 h-4 animate-spin" />

                Rendering_Sequence...

              </>

            ) : (

              <>

                <Wand2 className="w-4 h-4" />

                Initiate {activeTask === TaskType.VIDEO_LIPSYNC ? 'LipSync' : 'Generation'}

              </>

            )}

          </button>



          <div className="mt-4 flex justify-center">

            <div className="group relative">

              <div className="flex items-center gap-2 text-[9px] text-zinc-600 cursor-help hover:text-zinc-400 transition-colors font-mono uppercase tracking-wider">

                <span>BAL: 850.00</span>

                <div className="w-0.5 h-3 bg-zinc-800"></div>

                <span>EST: ~{10 + (referenceAssets.length * 2)} CR</span>

                <Info className="w-3 h-3 text-zinc-700" />

              </div>



              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-black border border-zinc-700 rounded-sm shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">

                <div className="text-[10px] font-bold text-white mb-2 pb-2 border-b border-zinc-800 uppercase tracking-widest">Cost Breakdown</div>

                <div className="space-y-1">

                  <div className="flex justify-between text-[9px] text-zinc-400 font-mono">

                    <span>TASK_TYPE</span>

                    <span className="uppercase">{currentTaskInfo.label}</span>

                  </div>

                  <div className="flex justify-between text-[9px] text-zinc-400 font-mono">

                    <span>BASE_COST</span>

                    <span>10.0</span>

                  </div>

                  <div className="flex justify-between text-[9px] font-bold text-emerald-500 pt-2 border-t border-zinc-800 mt-1 font-mono">

                    <span>TOTAL_EST</span>

                    <span>{10 + (referenceAssets.length * 2)} CR</span>

                  </div>

                </div>

              </div>

            </div>

          </div>

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

        {generatedVideoUrl ? (

          <div className="w-full max-w-4xl aspect-video rounded-sm overflow-hidden shadow-2xl border border-zinc-800 relative z-10 animate-in zoom-in-95 duration-500 group">
            {/* HUD Corners */}
            <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-white/20 z-20"></div>
            <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-white/20 z-20"></div>
            <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-white/20 z-20"></div>
            <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-white/20 z-20"></div>

            <video

              src={generatedVideoUrl}

              controls

              autoPlay

              loop

              className="w-full h-full object-cover"

            />

            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-30">

              <button

                onClick={() => setGeneratedVideoUrl(null)}

                className="px-3 py-1 bg-black/80 backdrop-blur text-white text-[10px] font-mono uppercase tracking-wider rounded-sm hover:bg-red-900/50 transition-colors border border-zinc-800"

              >

                Close_Viewer

              </button>

              <a

                href={generatedVideoUrl}

                download="lumina-generated.mp4"

                className="px-3 py-1 bg-white text-black text-[10px] font-mono uppercase tracking-wider rounded-sm hover:bg-zinc-200 font-bold transition-colors"

              >

                Download_MP4

              </a>

            </div>

          </div>

        ) : (

          <div className="text-center space-y-6 z-10 opacity-60 animate-in fade-in duration-1000 relative">
            {/* Center Target Graphic */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-zinc-800 rounded-full opacity-20 pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-px bg-zinc-800 opacity-20 pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-[280px] bg-zinc-800 opacity-20 pointer-events-none"></div>

            <div className="w-20 h-20 rounded-full bg-zinc-900/50 border border-zinc-700 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(255,255,255,0.05)] relative z-20">

              <PlayCircle className="w-8 h-8 text-zinc-500" />

            </div>

            <div className="space-y-2 relative z-20">

              <h3 className="text-lg font-bold text-zinc-300 uppercase tracking-widest font-mono">Viewport_Idle</h3>

              <p className="text-[10px] text-zinc-500 max-w-xs mx-auto leading-relaxed font-mono uppercase tracking-wide">

                Awaiting Input Sequence<br />
                Configure <strong>{currentTaskInfo.label}</strong> parameters

              </p>

            </div>

          </div>

        )}

      </div>

    </div>

  )

}

export default VideoStudio
