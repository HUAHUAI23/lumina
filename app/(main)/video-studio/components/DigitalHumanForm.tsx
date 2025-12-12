'use client';

import React, { useState } from 'react';
import {
  Film,
  Image as ImageIcon,
  Info,
  Layers,
  Loader2,
  Mic,
  RefreshCw,
  Sparkles,
  Type,
  Zap,
} from 'lucide-react';

import FileUpload from '@/components/FileUpload';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { POST } from '@/lib/api-client';
import type { ApiResponse } from '@/lib/api-response';
import type { FileWithPreview } from '@/types';

interface DigitalHumanFormProps {
  onSuccess?: (workflowTaskIds: number[]) => void;
  userBalance: number;
}

interface MediaMetadata {
  duration: number;
  width?: number;
  height?: number;
}

const DigitalHumanForm: React.FC<DigitalHumanFormProps> = ({ onSuccess, userBalance }) => {
  // File inputs
  const [imageFile, setImageFile] = useState<FileWithPreview | null>(null);
  const [videoFile, setVideoFile] = useState<FileWithPreview | null>(null);
  const [audioFile, setAudioFile] = useState<FileWithPreview | null>(null);
  const [text, setText] = useState('');

  // Lipsync config
  const [separateVocal, setSeparateVocal] = useState(true);
  const [useBasicMode, setUseBasicMode] = useState(false);
  const [alignAudio, setAlignAudio] = useState(true);

  // Batch size
  const [quantity, setQuantity] = useState<number>(1);

  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Metadata
  const [videoMetadata, setVideoMetadata] = useState<MediaMetadata | null>(null);
  const [audioMetadata, setAudioMetadata] = useState<MediaMetadata | null>(null);

  // Cost estimate
  const [estimatedCost, setEstimatedCost] = useState<number>(0);

  // Extract video metadata
  const extractVideoMetadata = (file: File): Promise<MediaMetadata> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve({
          duration: Math.ceil(video.duration),
          width: video.videoWidth,
          height: video.videoHeight,
        });
      };
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Unable to read video metadata'));
      };
      video.src = URL.createObjectURL(file);
    });
  };

  // Extract audio metadata
  const extractAudioMetadata = (file: File): Promise<MediaMetadata> => {
    return new Promise((resolve, reject) => {
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(audio.src);
        resolve({
          duration: Math.ceil(audio.duration),
        });
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audio.src);
        reject(new Error('Unable to read audio metadata'));
      };
      audio.src = URL.createObjectURL(file);
    });
  };

  // Calculate estimated cost
  const updateEstimatedCost = (
    videoMeta: MediaMetadata | null,
    audioMeta: MediaMetadata | null,
    count: number
  ) => {
    if (!videoMeta) {
      setEstimatedCost(0);
      return;
    }

    // Digital Human cost breakdown:
    // 1. VIDEO_MOTION: ~0.10 CNY/s (video duration)
    // 2. AUDIO_TTS: ~0.10 CNY/s (audio duration)
    // 3. VIDEO_LIPSYNC: ~0.10 CNY/s (video duration)
    // Total: ~0.30 CNY/s for the entire workflow

    const videoDuration = videoMeta.duration;
    const audioDuration = audioMeta?.duration || videoDuration;

    // Simplified estimate: use the longer duration * 30 (0.30 CNY/s in cents)
    const maxDuration = Math.max(videoDuration, audioDuration);
    const cost = Math.ceil(maxDuration * 30) * count;
    setEstimatedCost(cost);
  };

  // Handle video selection
  const handleVideoSelect = async (file: FileWithPreview) => {
    setVideoFile(file);
    setError(null);
    try {
      const metadata = await extractVideoMetadata(file.file);
      setVideoMetadata(metadata);
      updateEstimatedCost(metadata, audioMetadata, quantity);
    } catch (err) {
      console.error('Failed to extract video metadata:', err);
      setError('Unable to read video info. Please ensure the file format is correct.');
    }
  };

  // Handle audio selection
  const handleAudioSelect = async (file: FileWithPreview) => {
    setAudioFile(file);
    setError(null);
    try {
      const metadata = await extractAudioMetadata(file.file);
      setAudioMetadata(metadata);
      updateEstimatedCost(videoMetadata, metadata, quantity);
    } catch (err) {
      console.error('Failed to extract audio metadata:', err);
      setError('Unable to read audio info. Please ensure the file format is correct.');
    }
  };

  // Handle quantity change
  const handleQuantityChange = (count: number) => {
    setQuantity(count);
    updateEstimatedCost(videoMetadata, audioMetadata, count);
  };

  // Submit form
  const handleSubmit = async () => {
    if (!imageFile || !videoFile || !audioFile || !text) {
      setError('Please provide all required inputs: image, video, audio, and text');
      return;
    }

    if (userBalance < estimatedCost) {
      setError(
        `Insufficient balance. Current: ${(userBalance / 100).toFixed(2)} CNY, Estimated: ${(estimatedCost / 100).toFixed(2)} CNY`
      );
      return;
    }

    setError(null);
    setIsCreating(true);

    try {
      const formData = new FormData();
      formData.append('image', imageFile.file);
      formData.append('video', videoFile.file);
      formData.append('audio', audioFile.file);
      formData.append('text', text);
      formData.append('quantity', quantity.toString());
      formData.append('useBasicMode', useBasicMode.toString());
      formData.append('separateVocal', separateVocal.toString());
      formData.append('alignAudio', alignAudio.toString());
      formData.append('name', `Digital Human - ${imageFile.file.name.split('.')[0]}`);

      const response = await POST<
        ApiResponse<{
          workflow: { id: number; name: string };
          tasks: Array<{ id: number; status: string; createdAt: string }>;
          metadata: {
            videoDuration: number;
            audioDuration: number;
            textLength: number;
            quantity: number;
          };
        }>
      >('/api/workflows/digital-human', formData);

      if (!response.success) {
        throw new Error(response.error);
      }

      // Pass workflow task IDs to parent
      const taskIds = response.data.tasks.map((t) => t.id);
      onSuccess?.(taskIds);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create workflow';
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  const canSubmit = imageFile && videoFile && audioFile && text.length > 0 && !isCreating;

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-sm text-red-400 text-xs font-mono animate-in fade-in">
          {error}
        </div>
      )}

      {/* Workflow Description */}
      <div className="p-3 bg-gradient-to-r from-indigo-900/20 via-purple-900/20 to-pink-900/20 border border-indigo-500/20 rounded-sm">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
            Digital Human Pipeline
          </span>
        </div>
        <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
          Motion Transfer + Voice Synthesis + Lip Sync = Talking Digital Human
        </p>
      </div>

      {/* Step 1: Character Image */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest border-b border-zinc-800 pb-2">
          <ImageIcon className="w-3 h-3" />
          Step 1: Character_Image
          <span className="text-[9px] text-red-400 ml-auto px-1 py-0.5 border border-red-900/30 bg-red-900/10 rounded-sm">
            [REQUIRED]
          </span>
        </label>
        <FileUpload
          type="image"
          accept="image/*"
          label="Upload Character Image"
          selectedFile={imageFile}
          onFileSelect={setImageFile}
          onRemove={() => setImageFile(null)}
        />
        <p className="text-[9px] text-zinc-500 font-mono">
          {`// Upload a portrait or full-body image of the character`}
        </p>
      </div>

      {/* Step 2: Motion Video */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest border-b border-zinc-800 pb-2">
          <Film className="w-3 h-3" />
          Step 2: Motion_Video
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
            setVideoFile(null);
            setVideoMetadata(null);
            updateEstimatedCost(null, audioMetadata, quantity);
          }}
        />
        {videoMetadata && (
          <div className="p-2 bg-zinc-900/30 border border-zinc-800 rounded-sm text-[10px] font-mono text-zinc-400">
            <div className="flex gap-4">
              <span>Duration: {videoMetadata.duration}s</span>
              {videoMetadata.width && videoMetadata.height && (
                <span>
                  Size: {videoMetadata.width}x{videoMetadata.height}
                </span>
              )}
            </div>
          </div>
        )}
        <p className="text-[9px] text-zinc-500 font-mono">
          {`// The character will mimic movements from this video`}
        </p>
      </div>

      {/* Step 3: Voice Reference */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest border-b border-zinc-800 pb-2">
          <Mic className="w-3 h-3" />
          Step 3: Voice_Reference
          <span className="text-[9px] text-red-400 ml-auto px-1 py-0.5 border border-red-900/30 bg-red-900/10 rounded-sm">
            [REQUIRED]
          </span>
        </label>
        <FileUpload
          type="audio"
          accept="audio/*"
          label="Upload Voice Sample"
          selectedFile={audioFile}
          onFileSelect={handleAudioSelect}
          onRemove={() => {
            setAudioFile(null);
            setAudioMetadata(null);
            updateEstimatedCost(videoMetadata, null, quantity);
          }}
          className="h-24"
        />
        {audioMetadata && (
          <div className="p-2 bg-zinc-900/30 border border-zinc-800 rounded-sm text-[10px] font-mono text-zinc-400">
            <span>Duration: {audioMetadata.duration}s</span>
          </div>
        )}
        <p className="text-[9px] text-zinc-500 font-mono">
          {`// Voice sample for cloning the speaking style`}
        </p>
      </div>

      {/* Step 4: Speech Text */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest border-b border-zinc-800 pb-2">
          <Type className="w-3 h-3" />
          Step 4: Speech_Text
          <span className="text-[9px] text-red-400 ml-auto px-1 py-0.5 border border-red-900/30 bg-red-900/10 rounded-sm">
            [REQUIRED]
          </span>
        </label>
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={5000}
            placeholder="Enter the text for the digital human to speak..."
            className="w-full h-28 bg-zinc-900/30 border border-zinc-700/50 rounded-sm p-3 text-xs focus:outline-none focus:border-indigo-500/50 transition-all resize-none text-zinc-100 placeholder:text-zinc-600 font-mono leading-relaxed custom-scrollbar"
          />
          <div className="absolute bottom-2 right-2 text-[9px] text-zinc-600 font-mono">
            {text.length}/5000
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest border-b border-zinc-800 pb-2">
          Advanced Configuration
        </label>

        <div className="space-y-3 p-3 bg-zinc-900/20 border border-zinc-900 rounded-sm">
          {/* Batch Size */}
          <div className="flex items-center justify-between border-b border-zinc-800/50 pb-3">
            <div className="space-y-0.5">
              <Label className="text-[11px] font-bold text-zinc-300 flex items-center gap-2">
                <Layers className="w-3 h-3 text-zinc-500" />
                Batch Size
              </Label>
              <p className="text-[9px] text-zinc-500 font-mono">Number of variations to generate</p>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => handleQuantityChange(n)}
                  className={`w-6 h-6 flex items-center justify-center rounded-sm text-[10px] font-bold font-mono transition-all
                     ${
                       quantity === n
                         ? 'bg-zinc-100 text-black shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                         : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                     }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Separate Vocal */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-[11px] font-bold text-zinc-300">Separate Vocals</Label>
              <p className="text-[9px] text-zinc-500 font-mono">
                Isolate voice from background noise
              </p>
            </div>
            <Switch checked={separateVocal} onCheckedChange={setSeparateVocal} className="scale-75" />
          </div>

          {/* Processing Mode */}
          <div className="space-y-2 pt-2 border-t border-zinc-800/50">
            <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Lip Sync Mode
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setUseBasicMode(false)}
                className={`p-2 rounded-sm border text-left transition-all ${
                  !useBasicMode
                    ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-100 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                    : 'bg-zinc-900/30 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-900/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Zap className={`w-3 h-3 ${!useBasicMode ? 'text-indigo-400' : 'text-zinc-600'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Lite</span>
                </div>
                <div className="text-[8px] font-mono opacity-70">
                  Faster, loop-optimized sync
                </div>
              </button>

              <button
                onClick={() => setUseBasicMode(true)}
                className={`p-2 rounded-sm border text-left transition-all ${
                  useBasicMode
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                    : 'bg-zinc-900/30 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-900/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw
                    className={`w-3 h-3 ${useBasicMode ? 'text-amber-400' : 'text-zinc-600'}`}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Basic</span>
                </div>
                <div className="text-[8px] font-mono opacity-70">
                  Higher fidelity, slower
                </div>
              </button>
            </div>
          </div>

          {/* Lite Mode: Align Audio Option */}
          {!useBasicMode && (
            <div className="flex items-center justify-between pl-4 border-l border-indigo-500/30 ml-1 animate-in fade-in slide-in-from-top-1">
              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold text-zinc-300">Align Audio Loop</Label>
                <p className="text-[9px] text-zinc-500 font-mono">Loop video to match audio</p>
              </div>
              <Switch checked={alignAudio} onCheckedChange={setAlignAudio} className="scale-75" />
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-6 border-t border-zinc-800">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-sm text-xs font-bold uppercase tracking-widest hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)] border border-transparent relative overflow-hidden group"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating_Workflow...
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"></div>
              <Sparkles className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Generate_Digital_Human</span>
            </>
          )}
        </button>

        {/* Cost Estimate */}
        <div className="mt-4 flex justify-center">
          <div className="group relative">
            <div className="flex items-center gap-2 text-[9px] text-zinc-600 cursor-help hover:text-zinc-400 transition-colors font-mono uppercase tracking-wider">
              <span>BAL: {(userBalance / 100).toFixed(2)}</span>
              <div className="w-0.5 h-3 bg-zinc-800"></div>
              <span>EST: ~{(estimatedCost / 100).toFixed(2)} CNY</span>
              <Info className="w-3 h-3 text-zinc-700" />
            </div>

            {/* Cost Breakdown Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 p-3 bg-black border border-zinc-700 rounded-sm shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="text-[10px] font-bold text-white mb-2 pb-2 border-b border-zinc-800 uppercase tracking-widest">
                Workflow Cost Breakdown
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-zinc-400 font-mono">
                  <span>PIPELINE</span>
                  <span className="text-indigo-400">DIGITAL_HUMAN</span>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-500 font-mono pl-2">
                  <span>├─ VIDEO_MOTION</span>
                  <span>{videoMetadata?.duration || 0}s</span>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-500 font-mono pl-2">
                  <span>├─ AUDIO_TTS</span>
                  <span>{audioMetadata?.duration || 0}s</span>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-500 font-mono pl-2">
                  <span>└─ VIDEO_LIPSYNC</span>
                  <span>~{videoMetadata?.duration || 0}s</span>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-400 font-mono pt-1">
                  <span>UNIT_PRICE</span>
                  <span>~0.30 CNY/s</span>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-400 font-mono">
                  <span>COUNT</span>
                  <span>{quantity}</span>
                </div>
                <div className="flex justify-between text-[9px] font-bold text-emerald-500 pt-2 border-t border-zinc-800 mt-1 font-mono">
                  <span>TOTAL_EST</span>
                  <span>{(estimatedCost / 100).toFixed(2)} CNY</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalHumanForm;