import React, { useState } from 'react';
import { GenerationMode, FileWithPreview, AnalysisResult, Asset } from '../types';
import FileUpload from '../components/FileUpload';
import { Wand2, Loader2, PlayCircle, Film, Music, Image as ImageIcon, Info, Upload, Sparkles, X, Check, Plus, Settings2, Smartphone, Monitor, Square, Tv, MonitorPlay } from 'lucide-react';
import { analyzeVideoContent, generateVideo, generateStyleImages } from '../services/geminiService';

const Create: React.FC = () => {
  const [activeMode, setActiveMode] = useState<GenerationMode>(GenerationMode.VIDEO_IMAGE_TEXT);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  
  // Files
  const [videoFile, setVideoFile] = useState<FileWithPreview | null>(null);
  const [audioFile, setAudioFile] = useState<FileWithPreview | null>(null);

  // Visual Context (Reference Images)
  const [referenceAssets, setReferenceAssets] = useState<Asset[]>([]);
  const [refTab, setRefTab] = useState<'upload' | 'generate'>('upload');
  
  // Image Generator State
  const [imageGenPrompt, setImageGenPrompt] = useState('');
  const [generatedCandidates, setGeneratedCandidates] = useState<Asset[]>([]);

  // Analysis State
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Output Settings
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');

  // Output
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  const hasReferenceAssets = referenceAssets.length > 0;

  const handleAnalyze = async () => {
    if (!videoFile) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeVideoContent(videoFile.file);
      setAnalysisResult(result);
      
      // Auto-populate main prompt if empty
      if (!prompt) {
        setPrompt(`A cinematic scene featuring: ${result.description}`);
      }
      
      // Auto-populate Image Generator Prompt
      setImageGenPrompt(`Cinematic concept art of ${result.description}, detailed, 8k`);
      
      // Switch to Generate Tab to nudge user
      setRefTab('generate');
      
    } catch (error) {
      alert("Analysis failed. Please ensure API Key is set.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateImages = async () => {
    if (!imageGenPrompt) return;
    setIsGeneratingImages(true);
    try {
      const images = await generateStyleImages(imageGenPrompt, videoFile?.file); 
      
      const newAssets: Asset[] = images.map((url, i) => ({
        id: `gen_${Date.now()}_${i}`,
        url,
        type: 'image',
        source: 'generated'
      }));
      setGeneratedCandidates(newAssets);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const toggleReferenceAsset = (asset: Asset) => {
    if (referenceAssets.find(a => a.id === asset.id)) {
      setReferenceAssets(prev => prev.filter(a => a.id !== asset.id));
    } else {
      if (referenceAssets.length >= 3) {
        alert("Maximum 3 reference images allowed.");
        return;
      }
      setReferenceAssets(prev => [...prev, asset]);
    }
  };

  const handleFileUpload = (fileWithPreview: FileWithPreview) => {
    const asset: Asset = {
      id: `up_${Date.now()}`,
      url: fileWithPreview.previewUrl,
      type: 'image',
      source: 'upload',
      file: fileWithPreview.file
    };
    if (referenceAssets.length >= 3) {
        alert("Maximum 3 reference images allowed.");
        return;
    }
    setReferenceAssets(prev => [...prev, asset]);
  };

  const handleGenerate = async () => {
    if (!process.env.API_KEY) {
      alert("Please set your API_KEY in the environment.");
      return;
    }
    
    setIsGenerating(true);
    setGeneratedVideoUrl(null);

    try {
      // Pass the settings to the service
      const url = await generateVideo(
        prompt, 
        referenceAssets, 
        videoFile?.file, 
        audioFile?.file,
        { aspectRatio, resolution }
      );
      setGeneratedVideoUrl(url);
    } catch (error) {
      console.error(error);
      alert("Generation failed. Check console. Ensure you have selected a Pay-as-you-go Project Key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const modes = [
    { id: GenerationMode.VIDEO_IMAGE_TEXT, label: 'Video + Image', icon: Film },
    { id: GenerationMode.VIDEO_IMAGE_AUDIO_TEXT, label: 'Full Suite', icon: Wand2 },
    { id: GenerationMode.AUDIO_IMAGE_TEXT, label: 'Audio + Image', icon: Music },
  ];

  const aspectRatios = [
    { id: '16:9', label: '16:9', icon: Monitor },
    { id: '9:16', label: '9:16', icon: Smartphone },
    { id: '1:1', label: '1:1', icon: Square },
    { id: '4:3', label: '4:3', icon: Tv },
    { id: '21:9', label: '21:9', icon: MonitorPlay },
  ];

  return (
    <div className="h-full flex flex-col md:flex-row bg-background text-zinc-100 overflow-hidden">
      
      {/* Left Panel: Controls */}
      <div className="w-full md:w-[500px] flex-shrink-0 border-r border-zinc-800 flex flex-col h-full overflow-y-auto custom-scrollbar bg-surface/50">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-lg font-semibold mb-4">Workflow</h2>
          <div className="flex p-1 bg-zinc-900 rounded-lg mb-2">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                   setActiveMode(mode.id);
                   setAnalysisResult(null);
                }}
                className={`flex-1 flex flex-col items-center justify-center py-2 px-2 rounded-md text-xs font-medium transition-all ${activeMode === mode.id ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <mode.icon className="w-4 h-4 mb-1" />
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-8 flex-1">
          
          {/* 1. Source Video Section */}
          {(activeMode === GenerationMode.VIDEO_IMAGE_TEXT || activeMode === GenerationMode.VIDEO_IMAGE_AUDIO_TEXT) && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-white flex items-center gap-2">
                  <Film className="w-4 h-4 text-zinc-400" /> Source Video
                </label>
                {videoFile && (
                  <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors"
                  >
                    {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Auto-analyze
                  </button>
                )}
              </div>
              <FileUpload 
                type="video" 
                accept="video/*" 
                label="Upload Source Video" 
                selectedFile={videoFile}
                onFileSelect={setVideoFile}
                onRemove={() => { setVideoFile(null); setAnalysisResult(null); }}
              />
              
              {/* Analysis Results */}
              {analysisResult && (
                <div className="p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">Analysis Complete</span>
                     <span className="text-[10px] text-zinc-500">Characters & Style Extracted</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar mb-2">
                    {analysisResult.extractedFrames.map((frame, i) => (
                      <img key={i} src={frame} alt={`Frame ${i}`} className="w-16 h-16 object-cover rounded-lg border border-indigo-500/20 shadow-sm" />
                    ))}
                  </div>
                  <p className="text-xs text-zinc-300 bg-black/20 p-2 rounded border border-white/5 line-clamp-3">
                    {analysisResult.description}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 2. Visual Context (Reference Images) */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-zinc-400" /> Visual Context
              <span className="text-zinc-500 text-xs font-normal ml-auto">{referenceAssets.length}/3 Selected</span>
            </label>

            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden">
               {/* Tabs */}
               <div className="flex border-b border-zinc-800">
                 <button 
                   onClick={() => setRefTab('upload')}
                   className={`flex-1 py-2 text-xs font-medium transition-colors ${refTab === 'upload' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                 >
                   Upload Assets
                 </button>
                 <button 
                   onClick={() => setRefTab('generate')}
                   className={`flex-1 py-2 text-xs font-medium transition-colors ${refTab === 'generate' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                 >
                   AI Generator
                 </button>
               </div>

               {/* Tab Content */}
               <div className="p-4 bg-surfaceLight/20 min-h-[200px]">
                 {refTab === 'upload' ? (
                   <div className="space-y-4">
                     {referenceAssets.length < 3 && (
                       <FileUpload 
                         type="image" 
                         accept="image/*" 
                         label="Upload Reference Image" 
                         selectedFile={null}
                         onFileSelect={handleFileUpload}
                         onRemove={() => {}}
                       />
                     )}
                     
                     {/* Selected Assets List */}
                     <div className="grid grid-cols-3 gap-2">
                       {referenceAssets.filter(a => a.source === 'upload').map((asset) => (
                         <div key={asset.id} className="relative group aspect-square rounded-lg overflow-hidden border border-indigo-500/50">
                           <img src={asset.url} className="w-full h-full object-cover" />
                           <button 
                             onClick={() => toggleReferenceAsset(asset)}
                             className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                             <X className="w-3 h-3" />
                           </button>
                         </div>
                       ))}
                     </div>
                   </div>
                 ) : (
                   <div className="space-y-4">
                     <div className="flex gap-2">
                       <input 
                         type="text" 
                         value={imageGenPrompt}
                         onChange={(e) => setImageGenPrompt(e.target.value)}
                         placeholder="Describe character or scene style..."
                         className="flex-1 bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                       />
                       <button 
                         onClick={handleGenerateImages}
                         disabled={isGeneratingImages || !imageGenPrompt}
                         className="px-3 bg-indigo-600 rounded-lg text-white disabled:opacity-50 hover:bg-indigo-500"
                       >
                         {isGeneratingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                       </button>
                     </div>

                     {/* Generated Grid */}
                     <div className="grid grid-cols-2 gap-2">
                       {generatedCandidates.map((asset) => {
                         const isSelected = referenceAssets.find(a => a.id === asset.id);
                         return (
                           <div 
                             key={asset.id} 
                             onClick={() => toggleReferenceAsset(asset)}
                             className={`relative cursor-pointer group aspect-square rounded-lg overflow-hidden border-2 transition-all ${isSelected ? 'border-indigo-500' : 'border-transparent hover:border-zinc-600'}`}
                           >
                             <img src={asset.url} className="w-full h-full object-cover" />
                             {isSelected && (
                               <div className="absolute top-1 right-1 bg-indigo-500 text-white rounded-full p-0.5">
                                 <Check className="w-3 h-3" />
                               </div>
                             )}
                           </div>
                         );
                       })}
                       {generatedCandidates.length === 0 && !isGeneratingImages && (
                         <div className="col-span-2 flex flex-col items-center justify-center py-8 text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                           <Sparkles className="w-8 h-8 mb-2 opacity-20" />
                           <p className="text-xs">Enter prompt to generate assets</p>
                         </div>
                       )}
                     </div>
                   </div>
                 )}
               </div>

               {/* Active Context Footer */}
               {referenceAssets.length > 0 && (
                 <div className="p-3 bg-zinc-900 border-t border-zinc-800">
                    <div className="text-[10px] uppercase text-zinc-500 font-bold mb-2">Active Context</div>
                    <div className="flex gap-2">
                      {referenceAssets.map((asset) => (
                        <div key={asset.id} className="w-10 h-10 rounded border border-zinc-700 overflow-hidden relative">
                           <img src={asset.url} className="w-full h-full object-cover opacity-70" />
                        </div>
                      ))}
                    </div>
                 </div>
               )}
            </div>
          </div>

          {/* 3. Audio Upload */}
          {(activeMode === GenerationMode.VIDEO_IMAGE_AUDIO_TEXT || activeMode === GenerationMode.AUDIO_IMAGE_TEXT) && (
             <div className="space-y-3">
              <label className="text-sm font-medium text-white">Audio Track</label>
              <FileUpload 
                type="audio" 
                accept="audio/*" 
                label="Upload Voiceover/Music" 
                selectedFile={audioFile}
                onFileSelect={setAudioFile}
                onRemove={() => setAudioFile(null)}
              />
            </div>
          )}

          {/* 4. Main Prompt */}
          <div className="space-y-3">
             <label className="text-sm font-medium text-white">Video Prompt</label>
             <textarea 
               value={prompt}
               onChange={(e) => setPrompt(e.target.value)}
               placeholder="Describe the action, camera movement, and final look..."
               className="w-full h-32 bg-zinc-900/50 border border-zinc-700 rounded-xl p-4 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
             />
          </div>

          {/* 5. Output Settings */}
          <div className="space-y-3">
             <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-white flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-zinc-400" /> Output Settings
                </label>
                {hasReferenceAssets && (
                   <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700 flex items-center gap-1">
                     <Info className="w-3 h-3" /> Locked by Reference Mode
                   </span>
                )}
             </div>
             
             <div className="space-y-3">
               {/* Aspect Ratio Grid */}
               <div className={`space-y-2 ${hasReferenceAssets ? 'opacity-50 pointer-events-none' : ''}`}>
                 <label className="text-xs text-zinc-500">Aspect Ratio</label>
                 <div className="grid grid-cols-5 gap-2">
                   {aspectRatios.map((ratio) => (
                     <button 
                       key={ratio.id}
                       onClick={() => setAspectRatio(ratio.id)}
                       className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200 
                         ${aspectRatio === ratio.id 
                           ? 'bg-indigo-600/20 border-indigo-500 text-white' 
                           : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                         }`}
                     >
                       <ratio.icon className="w-4 h-4 mb-1" />
                       <span className="text-[10px] font-medium">{ratio.label}</span>
                     </button>
                   ))}
                 </div>
               </div>
               
               {/* Resolution */}
               <div className={`space-y-2 ${hasReferenceAssets ? 'opacity-50 pointer-events-none' : ''}`}>
                 <label className="text-xs text-zinc-500">Resolution</label>
                 <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                   <button 
                     onClick={() => setResolution('720p')}
                     className={`flex-1 py-1.5 rounded-md text-xs transition-colors ${resolution === '720p' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                   >
                     720p
                   </button>
                   <button 
                     onClick={() => setResolution('1080p')}
                     className={`flex-1 py-1.5 rounded-md text-xs transition-colors ${resolution === '1080p' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                   >
                     1080p
                   </button>
                 </div>
               </div>
             </div>
             {hasReferenceAssets && (
                <p className="text-[10px] text-indigo-300/80 pl-1">
                  * Multi-reference mode requires 16:9 aspect ratio and 720p resolution.
                </p>
             )}
          </div>
        </div>

        <div className="p-6 border-t border-zinc-800 bg-surface z-10">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !prompt}
            className="w-full py-4 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/5"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Video...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Generate Video
              </>
            )}
          </button>
          
          <div className="mt-4 flex justify-center">
            <div className="group relative">
               <div className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-help hover:text-zinc-300 transition-colors">
                  <span>Cost: ~{10 + (referenceAssets.length * 2)} Credits</span>
                  <Info className="w-3 h-3" />
               </div>
               
               <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 bg-zinc-900/95 backdrop-blur-md border border-zinc-700 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform group-hover:-translate-y-1">
                  <div className="text-xs font-semibold text-white mb-2 pb-2 border-b border-zinc-800">Cost Breakdown</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] text-zinc-400">
                      <span>Base Generation</span>
                      <span>10.0</span>
                    </div>
                    {referenceAssets.length > 0 && (
                      <div className="flex justify-between text-[11px] text-zinc-400">
                        <span>Ref Assets ({referenceAssets.length})</span>
                        <span>{referenceAssets.length * 2}.0</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[11px] font-medium text-emerald-400 pt-2 border-t border-zinc-800/50 mt-1">
                      <span>Total Estimated</span>
                      <span>{10 + (referenceAssets.length * 2)} Credits</span>
                    </div>
                  </div>
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-900 border-r border-b border-zinc-700 transform rotate-45"></div>
               </div>
            </div>
          </div>

        </div>
      </div>

      {/* Right Panel: Preview Area */}
      <div className="flex-1 bg-black flex flex-col items-center justify-center p-8 relative">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/40 to-black pointer-events-none"></div>
        
        {generatedVideoUrl ? (
          <div className="w-full max-w-4xl aspect-video rounded-xl overflow-hidden shadow-2xl border border-zinc-800 relative z-10">
            <video 
              src={generatedVideoUrl} 
              controls 
              autoPlay 
              loop 
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4 flex gap-2">
               <button 
                 onClick={() => setGeneratedVideoUrl(null)}
                 className="px-3 py-1 bg-black/60 backdrop-blur text-white text-sm rounded hover:bg-black/80"
               >
                 Close
               </button>
               <a 
                 href={generatedVideoUrl} 
                 download="lumina-generated.mp4"
                 className="px-3 py-1 bg-white text-black text-sm rounded hover:bg-zinc-200 font-medium"
               >
                 Download
               </a>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-6 z-10 opacity-60">
            <div className="w-24 h-24 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(99,102,241,0.1)]">
              <PlayCircle className="w-10 h-10 text-zinc-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-medium text-zinc-400">Creative Canvas</h3>
              <p className="text-sm text-zinc-600 max-w-xs mx-auto leading-relaxed">
                Configure your workflow on the left.<br/>
                Use <strong>Visual Context</strong> to guide the AI's style.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Create;