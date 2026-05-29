export type ImageSize = '1K' | '4K';
export type AppStep = 'idle' | 'analyzing' | 'generating_image' | 'complete' | 'history';
export type AppLanguageCode =
  | 'it'
  | 'en'
  | 'es'
  | 'fr'
  | 'de'
  | 'pt'
  | 'zh'
  | 'hi'
  | 'ar'
  | 'bn'
  | 'ru'
  | 'ja';

export interface DreamAnalysis {
  transcription: string;
  interpretation: string;
  visualPrompt: string;
  emotionalTheme: string;
}

export interface SavedDream extends DreamAnalysis {
  id: string;
  imageUrl: string | null;
  timestamp: number;
  languageCode?: AppLanguageCode;
}

export interface DreamState {
  audioUri: string | null;
  analysis: DreamAnalysis | null;
  imageUrl: string | null;
  imageSize: ImageSize;
  isProcessing: boolean;
  isRecording: boolean;
  step: AppStep;
  error: string | null;
}
