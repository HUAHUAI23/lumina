import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, Asset } from '../types';

// Helper to convert blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set process.env.API_KEY.");
  }
  return new GoogleGenAI({ apiKey });
};

// 1. Frame Analysis Feature
export const analyzeVideoContent = async (
  videoFile: File, 
  frameCount: number = 3
): Promise<AnalysisResult> => {
  const ai = getGeminiClient();
  
  const frames = await extractFramesFromVideoFile(videoFile, frameCount);
  const model = 'gemini-2.5-flash';
  
  const parts = frames.map(frameDataUrl => {
    const base64Data = frameDataUrl.split(',')[1];
    return {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Data
      }
    };
  });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        role: 'user',
        parts: [
          ...parts,
          { text: "Analyze these frames from a video. Identify the main character or subject. Describe the visual style, lighting, and key elements to help generate consistent scenes." }
        ]
      }
    });

    return {
      extractedFrames: frames,
      description: response.text || "No description generated."
    };
  } catch (error) {
    console.error("Analysis failed:", error);
    return {
      extractedFrames: frames,
      description: "Analysis failed. Please check your API key."
    };
  }
};

// 2. Image Generation for Styles/Scenes
export const generateStyleImages = async (prompt: string, referenceImage?: File): Promise<string[]> => {
  const ai = getGeminiClient();
  const model = 'gemini-2.5-flash-image';
  
  const parts: any[] = [{ text: prompt }];
  if (referenceImage) {
      const base64 = await blobToBase64(referenceImage);
      parts.push({
          inlineData: {
              mimeType: referenceImage.type,
              data: base64.split(',')[1]
          }
      });
  }

  // Generate 4 variations in parallel
  const generateOne = async () => {
      try {
        const response = await ai.models.generateContent({
            model,
            contents: { parts }
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
             if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
             }
        }
      } catch (e) {
        console.error("Image generation failed", e);
      }
      return null;
  };

  const promises = [1, 2, 3, 4].map(() => generateOne());
  const results = await Promise.all(promises);
  return results.filter(r => r !== null) as string[];
};


// 3. Video Generation
export const generateVideo = async (
  prompt: string,
  referenceAssets: Asset[],
  videoFile?: File,
  audioFile?: File
): Promise<string> => {
  // Check API Key Selection for Veo
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
    try {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
      }
    } catch (e) {
      console.warn("AI Studio check failed", e);
    }
  }

  const ai = getGeminiClient();

  // Decide model based on inputs
  // If we have reference images (assets), we MUST use veo-3.1-generate-preview (not fast)
  // and conform to specific aspect/resolution requirements.
  const hasRefImages = referenceAssets && referenceAssets.length > 0;
  
  const model = hasRefImages ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';
  
  let config: any = {
    numberOfVideos: 1,
    // Veo 3.1 with references supports 720p 16:9
    resolution: hasRefImages ? '720p' : '720p',
    aspectRatio: '16:9' 
  };

  let payload: any = {
    model,
    prompt: prompt || "A cinematic video.",
    config
  };

  // Add Reference Images
  if (hasRefImages) {
    const referenceImagesPayload = [];
    // Limit to 3 images as per Veo specs
    for (const asset of referenceAssets.slice(0, 3)) {
      let base64Data = '';
      let mimeType = 'image/png'; // Default guess

      if (asset.source === 'upload' && asset.file) {
        const fullBase64 = await blobToBase64(asset.file);
        base64Data = fullBase64.split(',')[1];
        mimeType = asset.file.type;
      } else if (asset.source === 'generated') {
        // url is data:image/png;base64,...
        base64Data = asset.url.split(',')[1];
        mimeType = 'image/png'; // Generated images are usually png
      }

      if (base64Data) {
        referenceImagesPayload.push({
          image: {
            imageBytes: base64Data,
            mimeType
          },
          referenceType: 'ASSET' // VideoGenerationReferenceType.ASSET
        });
      }
    }
    config.referenceImages = referenceImagesPayload;
  }

  // Handle Video Input (Edit/Extend) - Currently mutually exclusive in this simple flow logic
  // If user provided video, usually for variations/edit. 
  // We prioritize Reference Images workflow if both exist for this specific feature request.
  
  // Note: For real Veo video editing, we would pass `video` param from a previous operation 
  // or upload bytes if supported. The prompt implies "Source Video" is for analysis or context.
  
  console.log("Generating with payload:", payload);

  let operation = await ai.models.generateVideos(payload);

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log("Polling generation status...");
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("No video URI returned");

  return `${videoUri}&key=${process.env.API_KEY}`;
};


// --- Utilities ---

async function extractFramesFromVideoFile(videoFile: File, count: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const frames: string[] = [];
    
    const url = URL.createObjectURL(videoFile);
    video.src = url;
    video.muted = true;
    video.crossOrigin = "anonymous";
    video.playsInline = true;

    video.onloadedmetadata = async () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const duration = video.duration;
      const interval = Math.min(duration / count, 5);

      for (let i = 0; i < count; i++) {
        const time = (i * interval) + 0.5; 
        video.currentTime = time;
        await new Promise<void>(r => {
          const seekHandler = () => {
            video.removeEventListener('seeked', seekHandler);
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              frames.push(canvas.toDataURL('image/jpeg', 0.8));
            }
            r();
          };
          video.addEventListener('seeked', seekHandler);
        });
      }
      
      URL.revokeObjectURL(url);
      resolve(frames);
    };

    video.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
  });
}
