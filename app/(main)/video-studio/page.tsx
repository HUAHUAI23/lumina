'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Check,
  ChevronDown,
  Clock,
  Download,
  Film,
  Image as ImageIcon,
  Info,
  Loader2,
  Maximize2,
  Mic,
  Monitor,
  MonitorPlay,
  RefreshCcw,
  Settings2,
  Smartphone,
  Sparkles,
  Square,
  Trash2,
  Tv,
  Wand2,
  X,
} from 'lucide-react';

import FileUpload from '@/components/FileUpload';
import MediaViewer from '@/components/MediaViewer';
import { GET } from '@/lib/api-client';
import type { ApiResponse } from '@/lib/api-response';
import { generateStyleImages, generateVideo } from '@/services/geminiService';
import { Asset, FileWithPreview, TaskType } from '@/types';

import AudioTtsForm from './components/AudioTtsForm';
import VideoLipsyncForm from './components/VideoLipsyncForm';
import VideoMotionForm from './components/VideoMotionForm';

// --- Types ---

interface Task {
  id: number;
  type: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  estimatedCost: number;
  actualCost?: number | null;
  createdAt: string;
  completedAt?: string | null;
}

interface TasksResponse {
  tasks: Task[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

interface TaskDetail {
  id: number;
  type: string;
  name: string;
  status: string;
  outputs: Array<{
    type: 'image' | 'video' | 'audio';
    url: string;
    metadata?: {
      duration?: number;
      width?: number;
      height?: number;
    };
  }>;
}

const VideoStudio: React.FC = () => {
  // --- Left Panel State ---
  const [activeTask, setActiveTask] = useState<TaskType>(TaskType.VIDEO_MOTION);
  const [isTaskSelectorOpen, setTaskSelectorOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Files (for Generation Mode)
  const [videoFile, setVideoFile] = useState<FileWithPreview | null>(null);
  const [audioFile, setAudioFile] = useState<FileWithPreview | null>(null);
  const [referenceAssets, setReferenceAssets] = useState<Asset[]>([]);
  const [refTab, setRefTab] = useState<'upload' | 'generate'>('upload');

  // Image Generator State (for refs)
  const [imageGenPrompt, setImageGenPrompt] = useState('');
  const [generatedCandidates, setGeneratedCandidates] = useState<Asset[]>([]);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);

  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  // const [resolution, setResolution] = useState<'720p' | '1080p'>('720p')

  // --- Right Panel State (Tasks/Generations) ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [activeTaskDetail, setActiveTaskDetail] = useState<TaskDetail | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [userBalance, setUserBalance] = useState<number>(0);

  // UI State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hasReferenceAssets = referenceAssets.length > 0;
  const historyListRef = useRef<HTMLDivElement>(null);

  // Fetch User Balance
  useEffect(() => {
    const fetchUserBalance = async () => {
      try {
        const response = await GET<ApiResponse<{ balance: number }>>('/api/auth/me');
        if (response.success) {
          setUserBalance(response.data.balance || 0);
        }
      } catch (error) {
        console.error('Failed to fetch balance:', error);
      }
    };
    fetchUserBalance();
  }, []);

  // Fetch Tasks
  const fetchTasks = useCallback(async () => {
    try {
      const response = await GET<ApiResponse<TasksResponse>>('/api/tasks', {
        params: { limit: 50, offset: 0 },
      });
      if (response.success) {
        const videoTasks = response.data.tasks.filter((t) =>
          [
            TaskType.VIDEO_MOTION,
            TaskType.VIDEO_GENERATION,
            TaskType.VIDEO_LIPSYNC,
            TaskType.AUDIO_TTS,
          ].includes(t.type as TaskType)
        );
        setTasks(videoTasks);

        // If no active task selected, select the first one
        if (!activeTaskId && videoTasks.length > 0) {
          setActiveTaskId(videoTasks[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoadingTasks(false);
    }
  }, [activeTaskId]);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [fetchTasks]);

  // Fetch Active Task Detail
  useEffect(() => {
    const fetchDetail = async () => {
      if (!activeTaskId) return;
      try {
        const response = await GET<ApiResponse<TaskDetail>>(`/api/tasks/${activeTaskId}`);
        if (response.success) {
          setActiveTaskDetail(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch task detail:', error);
      }
    };

    if (activeTaskId) {
      fetchDetail();
    }
  }, [activeTaskId, tasks]); // Re-fetch when tasks list updates (status change)

  // Handlers for Generation Mode
  const handleGenerateImages = async () => {
    if (!imageGenPrompt) return;
    setIsGeneratingImages(true);
    try {
      const images = await generateStyleImages(imageGenPrompt, videoFile?.file);
      const newAssets: Asset[] = images.map((url, i) => ({
        id: `gen_${Date.now()}_${i}`,
        url,
        type: 'image',
        source: 'generated',
      }));
      setGeneratedCandidates(newAssets);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const toggleReferenceAsset = (asset: Asset) => {
    if (referenceAssets.find((a) => a.id === asset.id)) {
      setReferenceAssets((prev) => prev.filter((a) => a.id !== asset.id));
    } else {
      if (referenceAssets.length >= 3) {
        alert('Maximum 3 reference images allowed.');
        return;
      }
      setReferenceAssets((prev) => [...prev, asset]);
    }
  };

  const handleFileUpload = (fileWithPreview: FileWithPreview) => {
    const asset: Asset = {
      id: `up_${Date.now()}`,
      url: fileWithPreview.previewUrl,
      type: 'image',
      source: 'upload',
      file: fileWithPreview.file,
    };
    if (referenceAssets.length >= 3) {
      alert('Maximum 3 reference images allowed.');
      return;
    }
    setReferenceAssets((prev) => [...prev, asset]);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Demo implementation
      await generateVideo(prompt, referenceAssets, videoFile?.file, audioFile?.file, {
        aspectRatio,
        resolution: '720p',
      });
      alert('Generation Request Sent (Demo Mode)');
      fetchTasks(); // Refresh list
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMotionSuccess = (taskIds: number[]) => {
    fetchTasks();
    if (taskIds.length > 0) {
      setActiveTaskId(taskIds[0]);
    }
  };

  const videoTasks = [
    {
      id: TaskType.VIDEO_MOTION,
      label: 'Motion Transfer',
      description: 'Transfer movement between videos',
      icon: Activity,
    },
    {
      id: TaskType.VIDEO_GENERATION,
      label: 'Video Generation',
      description: 'Text/Image to cinematic video',
      icon: Film,
      disabled: true,
    },
    {
      id: TaskType.VIDEO_LIPSYNC,
      label: 'Lip Sync',
      description: 'Synchronize audio with face',
      icon: Mic,
    },
    {
      id: TaskType.AUDIO_TTS,
      label: 'Voice Clone',
      description: 'Clone voice from reference',
      icon: Mic,
    },
  ];

  const aspectRatios = [
    { id: '16:9', label: '16:9', icon: Monitor },
    { id: '9:16', label: '9:16', icon: Smartphone },
    { id: '1:1', label: '1:1', icon: Square },
    { id: '4:3', label: '4:3', icon: Tv },
    { id: '21:9', label: '21:9', icon: MonitorPlay },
  ];

  const currentTaskInfo = videoTasks.find((t) => t.id === activeTask) || videoTasks[0];

  return (
    <div className="h-full flex flex-col lg:flex-row bg-[#050505] text-zinc-200 overflow-hidden fade-enter relative font-sans">
      {/* --- LEFT PANEL: CONTROLS --- */}
      <div className="w-full lg:w-[480px] shrink-0 border-r border-white/5 flex flex-col h-full bg-[#0A0A0A] relative z-20">
        {/* Task Selector */}
        <div className="p-6 border-b border-white/5 relative z-30">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-sm"></span>
            Task_Context
          </label>
          <div className="relative">
            <button
              onClick={() => setTaskSelectorOpen(!isTaskSelectorOpen)}
              className="w-full flex items-center justify-between bg-black border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-900/50 text-white p-3.5 rounded-sm transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] group"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-zinc-900 rounded-sm text-indigo-400 border border-zinc-700 group-hover:border-indigo-500/30">
                  <currentTaskInfo.icon className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-xs text-white uppercase tracking-wide">
                    {currentTaskInfo.label}
                  </div>
                  <div className="text-[9px] text-zinc-500 uppercase tracking-wider">
                    {currentTaskInfo.description}
                  </div>
                </div>
              </div>
              <ChevronDown
                className={`w-3 h-3 text-zinc-500 transition-transform ${
                  isTaskSelectorOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {isTaskSelectorOpen && (
              <div className="absolute top-full left-0 w-full mt-1 bg-[#050505] border border-zinc-800 rounded-sm shadow-2xl z-50 animate-in fade-in slide-in-from-top-1">
                {videoTasks.map((task) => (
                  <button
                    key={task.id}
                    disabled={task.disabled}
                    onClick={() => {
                      if (task.disabled) return;
                      setActiveTask(task.id);
                      setTaskSelectorOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3.5 transition-colors text-left border-b border-zinc-900 last:border-0 
                      ${activeTask === task.id ? 'bg-zinc-900/80' : 'hover:bg-zinc-900/50'}
                      ${task.disabled ? 'cursor-not-allowed' : ''}
                    `}
                  >
                    <task.icon
                      className={`w-4 h-4 ${
                        activeTask === task.id ? 'text-indigo-400' : 'text-zinc-600'
                      }`}
                    />
                    <div className="flex-1">
                      <div
                        className={`text-xs font-bold uppercase tracking-wide flex items-center gap-2 ${
                          activeTask === task.id ? 'text-white' : 'text-zinc-400'
                        }`}
                      >
                        {task.label}
                        {task.disabled && (
                          <span className="text-[9px] text-amber-500 px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 font-black tracking-widest shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                            COMING SOON
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-zinc-600 uppercase tracking-wider">
                        {task.description}
                      </div>
                    </div>
                    {activeTask === task.id && (
                      <Check className="w-3 h-3 text-indigo-400 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
          {/* 1. Motion Transfer Mode (REAL BACKEND) */}
          {activeTask === TaskType.VIDEO_MOTION && (
            <VideoMotionForm onSuccess={handleMotionSuccess} userBalance={userBalance} />
          )}

          {/* 2. Generation Mode (DEMO UI) */}
          {activeTask === TaskType.VIDEO_GENERATION && (
            <>
              {/* Source Video (Optional) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                  <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest">
                    <Film className="w-3 h-3" /> Source_Video
                  </label>
                  {videoFile && (
                    <button
                      onClick={() => {
                        setIsAnalyzing(true);
                        setTimeout(() => {
                          setPrompt((prev) =>
                            prev ? prev : 'Cinematic shot derived from video analysis...'
                          );
                          setIsAnalyzing(false);
                        }, 1500);
                      }}
                      disabled={isAnalyzing} // isAnalyzing is defined in state
                      className="text-[9px] flex items-center gap-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors px-1.5 py-0.5 rounded hover:bg-indigo-500/10 uppercase tracking-wider font-mono border border-transparent hover:border-indigo-500/20"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-2.5 h-2.5" />
                      )}
                      Auto-analyze
                    </button>
                  )}
                </div>
                <FileUpload
                  type="video"
                  accept="video/*"
                  label="Upload Source Video (Optional)"
                  selectedFile={videoFile}
                  onFileSelect={setVideoFile}
                  onRemove={() => setVideoFile(null)}
                  className="h-24"
                />
              </div>

              {/* Visual Context */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest border-b border-zinc-800 pb-2">
                  <ImageIcon className="w-3 h-3" /> Visual Context
                  <span className="text-zinc-500 text-[9px] font-normal ml-auto px-2 py-0.5 bg-zinc-900 rounded border border-zinc-800">
                    {referenceAssets.length}/3 Selected
                  </span>
                </label>
                <div className="bg-zinc-900/30 rounded-sm border border-zinc-800 overflow-hidden">
                  <div className="flex border-b border-zinc-800">
                    <button
                      onClick={() => setRefTab('upload')}
                      className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        refTab === 'upload'
                          ? 'bg-white/5 text-white'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Upload Assets
                    </button>
                    <button
                      onClick={() => setRefTab('generate')}
                      className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        refTab === 'generate'
                          ? 'bg-white/5 text-white'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      AI Generator
                    </button>
                  </div>
                  <div className="p-4 bg-black/20 min-h-[200px]">
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
                            className="h-24"
                          />
                        )}
                        <div className="grid grid-cols-3 gap-2">
                          {referenceAssets
                            .filter((a) => a.source === 'upload')
                            .map((asset) => (
                              <div
                                key={asset.id}
                                className="relative group aspect-square rounded-sm overflow-hidden border border-indigo-500/30"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={asset.url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  onClick={() => toggleReferenceAsset(asset)}
                                  className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
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
                            placeholder="Describe style..."
                            className="flex-1 bg-black/30 border border-zinc-700/50 rounded-sm px-3 py-2 text-xs focus:outline-none focus:border-indigo-500/50 text-white placeholder:text-zinc-600 font-mono"
                          />
                          <button
                            onClick={handleGenerateImages}
                            disabled={isGeneratingImages || !imageGenPrompt}
                            className="px-3 bg-indigo-600/80 hover:bg-indigo-600 rounded-sm text-white disabled:opacity-50 transition-colors"
                          >
                            {isGeneratingImages ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {generatedCandidates.map((asset) => {
                            const isSelected = referenceAssets.find((a) => a.id === asset.id);
                            return (
                              <div
                                key={asset.id}
                                onClick={() => toggleReferenceAsset(asset)}
                                className={`relative cursor-pointer group aspect-square rounded-sm overflow-hidden border-2 transition-all ${
                                  isSelected
                                    ? 'border-indigo-500'
                                    : 'border-transparent hover:border-zinc-700'
                                }`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={asset.url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                                {isSelected && (
                                  <div className="absolute top-1 right-1 bg-indigo-500 text-white rounded-full p-0.5 shadow-sm">
                                    <Check className="w-3 h-3" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Audio Track */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest border-b border-zinc-800 pb-2">
                  Audio_Track
                </label>
                <FileUpload
                  type="audio"
                  accept="audio/*"
                  label="Upload Voiceover/Music"
                  selectedFile={audioFile}
                  onFileSelect={setAudioFile}
                  onRemove={() => setAudioFile(null)}
                  className="h-24"
                />
              </div>

              {/* Video Prompt */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest border-b border-zinc-800 pb-2">
                  Video Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the action, camera movement, and final look..."
                  className="w-full h-32 bg-zinc-900/30 border border-zinc-700/50 rounded-sm p-3 text-xs focus:outline-none focus:border-indigo-500/50 transition-all resize-none text-zinc-100 placeholder:text-zinc-600 font-mono leading-relaxed"
                />
              </div>

              {/* Output Settings */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                  <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest">
                    <Settings2 className="w-3 h-3" /> Output_Config
                  </label>
                  {hasReferenceAssets && (
                    <span className="text-[9px] bg-indigo-900/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20 flex items-center gap-1 font-mono uppercase">
                      <Info className="w-2.5 h-2.5" /> Ref_Locked
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div
                    className={`space-y-2 ${
                      hasReferenceAssets ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <label className="text-[9px] text-zinc-600 uppercase tracking-wider font-mono">
                      Aspect Ratio
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {aspectRatios.map((ratio) => (
                        <button
                          key={ratio.id}
                          onClick={() => setAspectRatio(ratio.id)}
                          className={`flex flex-col items-center justify-center p-2 rounded-sm border transition-all duration-200 
                             ${
                               aspectRatio === ratio.id
                                 ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-200'
                                 : 'bg-zinc-900/30 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                             }`}
                        >
                          <ratio.icon className="w-3 h-3 mb-1" />
                          <span className="text-[8px] font-mono">{ratio.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-6 border-t border-zinc-800">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt}
                  className="w-full py-4 bg-zinc-100 text-black rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] group relative overflow-hidden"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-linear-to-r from-transparent via-zinc-200/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"></div>
                      <Wand2 className="w-4 h-4 relative z-10" />
                      <span className="relative z-10">Generate_Video</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {activeTask === TaskType.VIDEO_LIPSYNC && (
            <VideoLipsyncForm onSuccess={handleMotionSuccess} userBalance={userBalance} />
          )}

          {activeTask === TaskType.AUDIO_TTS && (
            <AudioTtsForm onSuccess={handleMotionSuccess} userBalance={userBalance} />
          )}
        </div>
      </div>

      {/* --- RIGHT PANEL: GENERATION FEED --- */}
      <div className="flex-1 bg-black flex flex-col h-full relative z-10 overflow-hidden">
        {/* Optical Backgrounds */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.05),transparent_40%)] pointer-events-none"></div>
        <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none"></div>

        {/* 1. MAIN STAGE (Player) */}
        <div className="flex-3 relative border-b border-white/5 flex flex-col">
          {/* Top Bar */}
          <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-30 bg-linear-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-3">
              <div
                className={`px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md ${
                  activeTaskDetail?.status === 'processing'
                    ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                    : activeTaskDetail?.status === 'completed'
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                    : 'bg-zinc-800/50 border-white/10 text-zinc-500'
                }`}
              >
                {activeTaskDetail?.status || 'IDLE'}
              </div>
              {activeTaskDetail?.status === 'processing' && (
                <span className="text-xs text-zinc-400 animate-pulse font-mono">
                  Rendering on Cluster...
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  activeTaskDetail &&
                  activeTaskDetail.status === 'completed' &&
                  setIsFullscreen(true)
                }
                disabled={!activeTaskDetail || activeTaskDetail.status !== 'completed'}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-sm text-zinc-400 hover:text-white transition-colors disabled:opacity-30"
                title="Maximize"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Viewer Content */}
          <div className="flex-1 flex items-center justify-center p-8 overflow-hidden bg-[#030303]">
            {activeTaskDetail ? (
              <div className="relative w-full h-full max-h-[600px] flex items-center justify-center animate-in zoom-in-95 duration-500">
                {activeTaskDetail.status === 'processing' ? (
                  // Processing State
                  <div className="aspect-video w-full max-w-4xl bg-zinc-900/30 border border-white/5 rounded-sm flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] mix-blend-overlay bg-cover grayscale"></div>
                    {/* Animated Scanline */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/50 blur-[2px] shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-[scan_2s_ease-in-out_infinite]"></div>

                    <div className="relative z-10 flex flex-col items-center">
                      <div className="w-16 h-16 border-4 border-white/10 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
                      <h3 className="text-lg font-medium text-white tracking-tight uppercase font-mono">
                        Generating Scene
                      </h3>
                      <p className="text-xs text-zinc-500 mt-2 font-mono uppercase tracking-widest">
                        Estimating physics & lighting...
                      </p>
                    </div>
                  </div>
                ) : activeTaskDetail.status === 'failed' ? (
                  <div className="text-center text-red-400 space-y-4">
                    <AlertCircle className="w-12 h-12 mx-auto opacity-50" />
                    <div className="font-mono text-xs uppercase tracking-widest">
                      Generation Failed
                    </div>
                  </div>
                ) : (
                  // Completed State
                  <div className="relative w-full max-w-4xl aspect-video bg-black rounded-sm overflow-hidden shadow-2xl border border-zinc-800 group">
                    {activeTaskDetail.outputs && activeTaskDetail.outputs.length > 0 ? (
                      activeTaskDetail.outputs[0].type === 'video' ? (
                        <video
                          src={activeTaskDetail.outputs[0].url}
                          controls
                          autoPlay
                          loop
                          className="w-full h-full object-contain"
                        />
                      ) : activeTaskDetail.outputs[0].type === 'audio' ? (
                        // Audio Player
                        <div className="w-full h-full flex items-center justify-center p-8">
                          <div className="w-full max-w-2xl bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
                            <div className="flex items-center justify-center mb-6">
                              <div className="relative">
                                <div className="w-32 h-32 rounded-full bg-linear-to-br from-purple-500/20 via-indigo-500/30 to-pink-500/20 backdrop-blur-md border border-white/20 shadow-[0_0_40px_rgba(99,102,241,0.3)] flex items-center justify-center">
                                  <Mic className="w-16 h-16 text-indigo-300" />
                                </div>
                              </div>
                            </div>
                            <div className="text-center mb-6">
                              <h4 className="text-base font-bold text-white mb-2 font-mono uppercase tracking-wide">
                                {activeTaskDetail.name}
                              </h4>
                              {activeTaskDetail.outputs[0].metadata?.duration && (
                                <p className="text-sm text-zinc-400 font-mono">
                                  Duration: {Math.round(activeTaskDetail.outputs[0].metadata.duration)}s
                                </p>
                              )}
                            </div>
                            <audio src={activeTaskDetail.outputs[0].url} controls className="w-full">
                              Your browser does not support the audio tag.
                            </audio>
                          </div>
                        </div>
                      ) : (
                        // Image
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={activeTaskDetail.outputs[0].url}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      )
                    ) : (
                      <div className="flex items-center justify-center h-full text-zinc-500 font-mono text-xs">
                        No media output available
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-6 opacity-30 select-none">
                <div className="w-32 h-32 rounded-full border border-white/10 flex items-center justify-center mx-auto">
                  <Film className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-xl font-light text-white tracking-tight uppercase font-mono">
                  Ready to Create
                </h3>
              </div>
            )}
          </div>
        </div>

        {/* 2. SESSION TIMELINE (History) */}
        <div className="flex-2 bg-[#08080A] border-t border-white/5 flex flex-col min-h-0">
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-zinc-900/50 backdrop-blur z-10">
            <div className="flex items-center gap-3">
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-3 h-3" /> Session_History
              </h3>
              <span className="px-1.5 py-0.5 rounded-sm bg-white/10 text-[9px] font-mono text-zinc-300">
                {tasks.length}
              </span>
            </div>
            <button
              onClick={() => fetchTasks()}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            ref={historyListRef}
            className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3 scroll-smooth"
          >
            {isLoadingTasks && (
              <div className="text-center py-8 text-zinc-600 font-mono text-xs animate-pulse">
                SYNCING DATABASE...
              </div>
            )}

            {!isLoadingTasks && tasks.length === 0 && (
              <div className="text-center py-8 text-zinc-600 font-mono text-xs uppercase">
                No history found
              </div>
            )}

            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => setActiveTaskId(task.id)}
                className={`
                     relative group rounded-sm p-3 border transition-all cursor-pointer flex gap-4 overflow-hidden
                     ${
                       activeTaskId === task.id
                         ? 'bg-white/5 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                         : 'bg-zinc-900/30 border-white/5 hover:bg-white/5 hover:border-white/10'
                     }
                   `}
              >
                {activeTaskId === task.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-500"></div>
                )}

                {/* Thumbnail Placeholder */}
                <div className="w-24 h-16 bg-black rounded-sm overflow-hidden shrink-0 relative border border-white/5 flex items-center justify-center">
                  {task.status === 'processing' ? (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 relative">
                      <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>
                      <Loader2 className="w-4 h-4 text-indigo-400 animate-spin relative z-10" />
                    </div>
                  ) : (
                    // Ideally we show the actual thumbnail here, but we need to fetch details or have it in list.
                    // For now, use an icon placeholder or if we have detail, show it.
                    // Optimization: In real app, list API should return thumbnail.
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-700">
                      <Film className="w-6 h-6 opacity-50" />
                    </div>
                  )}

                  {/* Type Icon */}
                  <div className="absolute bottom-0 right-0 p-1 bg-black/60 backdrop-blur-sm">
                    {task.type === TaskType.VIDEO_MOTION && (
                      <Activity className="w-3 h-3 text-zinc-400" />
                    )}
                    {task.type === TaskType.VIDEO_GENERATION && (
                      <Film className="w-3 h-3 text-zinc-400" />
                    )}
                    {task.type === TaskType.VIDEO_LIPSYNC && (
                      <Mic className="w-3 h-3 text-zinc-400" />
                    )}
                    {task.type === TaskType.AUDIO_TTS && <Mic className="w-3 h-3 text-zinc-400" />}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider ${
                        task.status === 'processing'
                          ? 'text-amber-400'
                          : task.status === 'completed'
                          ? 'text-emerald-400'
                          : task.status === 'failed'
                          ? 'text-red-400'
                          : 'text-zinc-500'
                      }`}
                    >
                      {task.status === 'processing' ? 'Generating...' : task.status}
                    </span>
                    <span className="text-[9px] text-zinc-600 font-mono">
                      {new Date(task.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed font-light group-hover:text-white transition-colors font-mono">
                    {task.name}
                  </p>
                </div>

                {/* Hover Actions */}
                <div className="flex flex-col justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                  <button
                    className="p-1.5 hover:bg-zinc-700 rounded-sm text-zinc-400 hover:text-white"
                    title="Download"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                  <button
                    className="p-1.5 hover:bg-red-900/30 rounded-sm text-zinc-400 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MediaViewer Modal Reuse for Fullscreen */}
      <MediaViewer
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        resource={activeTaskDetail?.outputs?.[0] || null}
        taskName={activeTaskDetail?.name}
      />

      {/* CSS for Scanline Animation */}
      <style jsx global>{`
        @keyframes scan {
          0%,
          100% {
            transform: translateY(0);
            opacity: 0;
          }
          50% {
            transform: translateY(100%);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default VideoStudio;
