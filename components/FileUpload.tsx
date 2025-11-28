import React, { useRef, useState } from 'react';
import { Upload, X, FileAudio, FileVideo, Image as ImageIcon } from 'lucide-react';
import { FileWithPreview } from '../types';

interface FileUploadProps {
  accept: string;
  label: string;
  onFileSelect: (file: FileWithPreview) => void;
  onRemove: () => void;
  selectedFile: FileWithPreview | null;
  type: 'video' | 'image' | 'audio';
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  accept, 
  label, 
  onFileSelect, 
  onRemove, 
  selectedFile,
  type 
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    onFileSelect({ file, previewUrl, type });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const getIcon = () => {
    switch(type) {
      case 'video': return <FileVideo className="w-6 h-6 mb-2 text-zinc-400" />;
      case 'audio': return <FileAudio className="w-6 h-6 mb-2 text-zinc-400" />;
      case 'image': return <ImageIcon className="w-6 h-6 mb-2 text-zinc-400" />;
    }
  };

  if (selectedFile) {
    return (
      <div className="relative group w-full h-32 rounded-xl border border-zinc-700 bg-zinc-900/50 overflow-hidden flex items-center justify-center">
        {type === 'image' && (
          <img src={selectedFile.previewUrl} alt="Preview" className="w-full h-full object-cover" />
        )}
        {type === 'video' && (
          <video src={selectedFile.previewUrl} className="w-full h-full object-cover" muted />
        )}
        {type === 'audio' && (
          <div className="flex flex-col items-center text-zinc-300">
            <FileAudio className="w-8 h-8 mb-2" />
            <span className="text-xs truncate max-w-[120px]">{selectedFile.file.name}</span>
          </div>
        )}
        
        <button 
          onClick={(e) => {
             e.stopPropagation();
             onRemove();
          }}
          className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-red-500/80 rounded-full transition-colors backdrop-blur-sm"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        w-full h-32 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
        flex flex-col items-center justify-center
        ${isDragging 
          ? 'border-primary bg-primary/10' 
          : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50 bg-zinc-900/30'}
      `}
    >
      <input 
        type="file" 
        ref={inputRef} 
        onChange={handleChange} 
        accept={accept} 
        className="hidden" 
      />
      {getIcon()}
      <span className="text-sm font-medium text-zinc-400">{label}</span>
      <span className="text-xs text-zinc-500 mt-1">Drag or Click</span>
    </div>
  );
};

export default FileUpload;
