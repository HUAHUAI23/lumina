'use client';

import React, { useState } from 'react';
import { FileAudio, Info, Layers, Loader2, Mic, Type, Wand2 } from 'lucide-react';

import FileUpload from '@/components/FileUpload';
import { Label } from '@/components/ui/label';
import { POST } from '@/lib/api-client';
import type { ApiResponse } from '@/lib/api-response';
import type { FileWithPreview } from '@/types';

interface AudioTtsFormProps {
  onSuccess?: (taskIds: number[]) => void;
  userBalance: number;
}

interface AudioMetadata {
  duration: number;
}

const AudioTtsForm: React.FC<AudioTtsFormProps> = ({ onSuccess, userBalance }) => {
  const [text, setText] = useState('');
  const [audioFile, setAudioFile] = useState<FileWithPreview | null>(null);
  const [estimatedCount, setEstimatedCount] = useState<number>(1);

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioMetadata, setAudioMetadata] = useState<AudioMetadata | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);

  // Extract Metadata
  const extractAudioMetadata = (file: File): Promise<AudioMetadata> => {
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
        reject(new Error('无法读取音频元数据'));
      };
      audio.src = URL.createObjectURL(file);
    });
  };

  const handleAudioSelect = async (file: FileWithPreview) => {
    setAudioFile(file);
    setError(null);
    try {
      const metadata = await extractAudioMetadata(file.file);
      setAudioMetadata(metadata);
      updateEstimatedCost(metadata.duration, estimatedCount);
    } catch (err) {
      console.error('Meta extraction failed:', err);
      setError('无法读取音频信息，请确保文件格式正确');
    }
  };

  const updateEstimatedCost = (duration: number, count: number) => {
    // Pricing: 0.10 CNY/s (Matches backend logic which uses duration)
    // Backend uses reference audio duration as the task duration estimate
    const cost = Math.ceil(duration * 10) * count;
    setEstimatedCost(cost);
  };

  const handleCountChange = (count: number) => {
    setEstimatedCount(count);
    if (audioMetadata) {
      updateEstimatedCost(audioMetadata.duration, count);
    }
  };

  const handleSubmit = async () => {
    if (!text || !audioFile) {
      setError('请提供文本和参考音频');
      return;
    }

    if (userBalance < estimatedCost) {
      setError(
        `余额不足，当前余额: ${(userBalance / 100).toFixed(2)} 元，预估费用: ${(
          estimatedCost / 100
        ).toFixed(2)} 元`
      );
      return;
    }

    setError(null);
    setIsCreating(true);

    try {
      const formData = new FormData();
      formData.append('text', text);
      formData.append('audio', audioFile.file);
      formData.append('estimatedCount', estimatedCount.toString());
      formData.append('name', `TTS生成 - ${text.substring(0, 10)}...`);

      const response = await POST<
        ApiResponse<{
          tasks: Array<{ id: number; type: string; name: string; status: string }>;
          totalEstimatedCost: number;
          audioMetadata: { duration: number; filename: string };
        }>
      >('/api/tasks/create-tts', formData);

      if (!response.success) {
        throw new Error(response.error);
      }

      // 提取所有任务 ID
      const taskIds = response.data.tasks.map((task) => task.id);
      onSuccess?.(taskIds);

      // Optional: Clear form or keep it for next generation?
      // Keeping it enables quick iteraton usually expected in studios.
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建任务失败';
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  const canSubmit = text.length > 0 && !!audioFile && !isCreating;

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-sm text-red-400 text-xs font-mono animate-in fade-in">
          {error}
        </div>
      )}

      {/* Text Input */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest border-b border-zinc-800 pb-2">
          <Type className="w-3 h-3" />
          Input Text
          <span className="text-[9px] text-red-400 ml-auto px-1 py-0.5 border border-red-900/30 bg-red-900/10 rounded-sm">
            [REQUIRED]
          </span>
        </label>
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={5000}
            placeholder="Enter text to generate speech from..."
            className="w-full h-32 bg-zinc-900/30 border border-zinc-700/50 rounded-sm p-3 text-xs focus:outline-none focus:border-indigo-500/50 transition-all resize-none text-zinc-100 placeholder:text-zinc-600 font-mono leading-relaxed custom-scrollbar"
          />
          <div className="absolute bottom-2 right-2 text-[9px] text-zinc-600 font-mono">
            {text.length}/5000
          </div>
        </div>
      </div>

      {/* Reference Audio */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest border-b border-zinc-800 pb-2">
          <Mic className="w-3 h-3" />
          Reference Voice
          <span className="text-[9px] text-red-400 ml-auto px-1 py-0.5 border border-red-900/30 bg-red-900/10 rounded-sm">
            [REQUIRED]
          </span>
        </label>
        <FileUpload
          type="audio"
          accept="audio/*"
          label="Upload Reference Voice"
          selectedFile={audioFile}
          onFileSelect={handleAudioSelect}
          onRemove={() => {
            setAudioFile(null);
            setAudioMetadata(null);
            setEstimatedCost(0);
          }}
          className="h-24"
        />
        {audioMetadata && (
          <div className="p-2 bg-zinc-900/30 border border-zinc-800 rounded-sm text-[10px] font-mono text-zinc-400">
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5">
                <FileAudio className="w-3 h-3 text-zinc-500" />
                Duration: {audioMetadata.duration}s
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Configuration */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest border-b border-zinc-800 pb-2">
          Configuration
        </label>

        <div className="space-y-3 p-3 bg-zinc-900/20 border border-zinc-900 rounded-sm">
          {/* Batch Size */}
          <div className="flex items-center justify-between">
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
                  onClick={() => handleCountChange(n)}
                  className={`w-6 h-6 flex items-center justify-center rounded-sm text-[10px] font-bold font-mono transition-all
                     ${
                       estimatedCount === n
                         ? 'bg-zinc-100 text-black shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                         : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                     }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-6 border-t border-zinc-800">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-3 bg-zinc-100 text-black rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-transparent hover:border-indigo-500"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Generate_Speech
            </>
          )}
        </button>

        {/* Cost Estimate */}
        <div className="mt-4 flex justify-center">
          <div className="group relative">
            <div className="flex items-center gap-2 text-[9px] text-zinc-600 cursor-help hover:text-zinc-400 transition-colors font-mono uppercase tracking-wider">
              <span>BAL: {(userBalance / 100).toFixed(2)}</span>
              <div className="w-0.5 h-3 bg-zinc-800"></div>
              <span>EST: ~{(estimatedCost / 100).toFixed(2)} ¥</span>
              <Info className="w-3 h-3 text-zinc-700" />
            </div>

            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-black border border-zinc-700 rounded-sm shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="text-[10px] font-bold text-white mb-2 pb-2 border-b border-zinc-800 uppercase tracking-widest">
                Cost Breakdown
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-zinc-400 font-mono">
                  <span>TASK_TYPE</span>
                  <span>AUDIO_TTS</span>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-400 font-mono">
                  <span>REF_DURATION</span>
                  <span>{audioMetadata?.duration || 0}s</span>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-400 font-mono">
                  <span>UNIT_PRICE</span>
                  <span>0.10 ¥/s</span>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-400 font-mono">
                  <span>COUNT</span>
                  <span>{estimatedCount}</span>
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
  );
};

export default AudioTtsForm;
