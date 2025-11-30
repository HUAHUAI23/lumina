"use client"

import React, { useState } from 'react'
import { Asset, FileWithPreview } from '../../../types'
import FileUpload from '../../../components/FileUpload'
import {
  Wand2, Loader2, Image as ImageIcon, Layers,
  Settings2, X, Sparkles, Grid,
  Trash2, Download, Zap
} from 'lucide-react'
import { analyzeImage, generateAdvancedImages } from '../../../services/geminiService'

const ImageStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'txt2img' | 'img2img'>('txt2img')

  // Inputs
  const [prompt, setPrompt] = useState('')
  const [uploadedAssets, setUploadedAssets] = useState<Asset[]>([])

  // Analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Settings
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [groupMode, setGroupMode] = useState(false)
  const [count, setCount] = useState(1) // Standard: num images. Group: num batches.
  const [maxPerBatch, setMaxPerBatch] = useState<number | undefined>(undefined)

  // Output
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])

  // Derived State
  const estimatedMinImages = groupMode ? count * 2 : count
  const estimatedMaxImages = groupMode ? count * (maxPerBatch || 15) : count
  const estimatedCost = Math.ceil((groupMode ? (estimatedMaxImages + estimatedMinImages) / 2 : count) * 1.5) // 1.5 credits per image avg

  const handleFileUpload = async (fileWithPreview: FileWithPreview) => {
    const newAsset: Asset = {
      id: `img_${Date.now()}`,
      url: fileWithPreview.previewUrl,
      type: 'image',
      source: 'upload',
      file: fileWithPreview.file
    }

    setUploadedAssets(prev => [...prev, newAsset])

    // Auto Analyze if it's the first image in Single Mode or explicitly requested
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
    if (activeTab === 'img2img' && uploadedAssets.length === 0) {
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

  return (
    <div className="h-full flex flex-col md:flex-row bg-background text-zinc-100 overflow-hidden">

      {/* LEFT SIDEBAR: CONTROLS */}
      <div className="w-full md:w-[480px] flex-shrink-0 border-r border-zinc-800 flex flex-col h-full bg-surface/50 overflow-y-auto custom-scrollbar">

        {/* Header / Tabs */}
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-400" /> Image Studio
          </h2>
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setActiveTab('txt2img')}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${activeTab === 'txt2img' ? 'bg-zinc-700 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Text to Image
            </button>
            <button
              onClick={() => setActiveTab('img2img')}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${activeTab === 'img2img' ? 'bg-zinc-700 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Image to Image
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8 flex-1">

          {/* Upload Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-zinc-400" /> Reference Images
              </label>
              {activeTab === 'img2img' && (
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
              <div className="col-span-1 aspect-square">
                <FileUpload
                  type="image"
                  accept="image/*"
                  label=""
                  selectedFile={null}
                  onFileSelect={handleFileUpload}
                  onRemove={() => { }}
                  className="h-full"
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
              placeholder={activeTab === 'img2img' ? "Describe changes or style to apply..." : "A futuristic city with neon lights..."}
              className="w-full h-32 bg-zinc-900/50 border border-zinc-700 rounded-xl p-4 text-sm focus:outline-none focus:border-indigo-500 resize-none transition-all placeholder:text-zinc-600"
            />
          </div>

          {/* Configuration Panel */}
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
                max={groupMode ? 50 : 50} // 50 batches or 50 images max via slider (total 500 cap)
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
                  <p className="text-[10px] text-zinc-500 italic">
                    * AI determines exact count based on prompt complexity up to limit.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-zinc-800 bg-surface z-20 sticky bottom-0">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-4 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
            {isGenerating ? 'Generating...' : 'Create Images'}
          </button>

          <div className="mt-4 flex justify-center">
            <div className="group relative">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-help hover:text-zinc-300 transition-colors">
                <Zap className="w-3 h-3 text-yellow-500" />
                <span>Est. Cost: ~{estimatedCost} Credits</span>
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="text-xs font-semibold text-white mb-2 pb-2 border-b border-zinc-800">Cost Calculation</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Mode</span>
                    <span className="text-zinc-200">{groupMode ? 'Group (Batch)' : 'Standard'}</span>
                  </div>
                  {groupMode ? (
                    <>
                      <div className="flex justify-between text-[11px] text-zinc-400">
                        <span>Batches</span>
                        <span>{count}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-zinc-400">
                        <span>Avg Images/Batch</span>
                        <span>~{(estimatedMaxImages / count + estimatedMinImages / count) / 2}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-[11px] text-zinc-400">
                      <span>Image Count</span>
                      <span>{count}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[11px] font-medium text-emerald-400 pt-2 border-t border-zinc-800/50 mt-1">
                    <span>Total Est. Credits</span>
                    <span>{estimatedCost}</span>
                  </div>
                </div>
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
            <p className="text-sm">Generated images will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Loading Placeholders */}
            {isGenerating && Array.from({ length: groupMode ? count : (count > 4 ? 4 : count) }).map((_, i) => (
              <div key={`load_${i}`} className="aspect-square rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-zinc-700 animate-spin" />
              </div>
            ))}

            {/* Results */}
            {generatedImages.map((src, i) => (
              <div key={i} className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-indigo-500 transition-colors">
                <img src={src} className="w-full h-full object-cover" loading="lazy" />

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
                  <button className="p-2 bg-white text-black rounded-full hover:scale-110 transition-transform">
                    <Download className="w-4 h-4" />
                  </button>
                  <div className="flex gap-2">
                    <button className="p-2 bg-zinc-800 text-white rounded-full hover:bg-zinc-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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
