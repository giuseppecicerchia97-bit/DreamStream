import * as FileSystem from 'expo-file-system/legacy';
import { DreamAnalysis, ImageSize } from '../types';

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const TEXT_MODEL = process.env.EXPO_PUBLIC_GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
const IMAGE_MODEL = process.env.EXPO_PUBLIC_GEMINI_IMAGE_MODEL || 'imagen-4.0-generate-001';

type GeminiPart = {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: {
    message?: string;
  };
};

type ImagenPredictResponse = {
  predictions?: Array<{
    bytesBase64Encoded?: string;
    mimeType?: string;
  }>;
  error?: {
    message?: string;
  };
};

class GeminiServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiServiceError';
  }
}

const getApiKey = () => {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    throw new GeminiServiceError('Missing EXPO_PUBLIC_GEMINI_API_KEY. Add it to your .env file and restart Expo.');
  }

  return apiKey;
};

const getAudioMimeType = (audioUri: string) => {
  const normalizedUri = audioUri.toLowerCase();

  if (normalizedUri.endsWith('.wav')) return 'audio/wav';
  if (normalizedUri.endsWith('.mp3')) return 'audio/mpeg';
  if (normalizedUri.endsWith('.aac')) return 'audio/aac';
  if (normalizedUri.endsWith('.caf')) return 'audio/x-caf';
  if (normalizedUri.endsWith('.3gp')) return 'audio/3gpp';

  return 'audio/mp4';
};

const parseJsonFromModelText = (text: string): DreamAnalysis => {
  const cleanedText = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '');

  const parsed = JSON.parse(cleanedText) as Partial<DreamAnalysis>;

  if (
    typeof parsed.transcription !== 'string' ||
    typeof parsed.interpretation !== 'string' ||
    typeof parsed.visualPrompt !== 'string' ||
    typeof parsed.emotionalTheme !== 'string'
  ) {
    throw new GeminiServiceError('Gemini returned an incomplete dream analysis.');
  }

  return {
    transcription: parsed.transcription,
    interpretation: parsed.interpretation,
    visualPrompt: parsed.visualPrompt,
    emotionalTheme: parsed.emotionalTheme,
  };
};

const fetchJson = async <T,>(url: string, body: unknown): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': getApiKey(),
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  const data = responseText ? JSON.parse(responseText) : {};

  if (!response.ok) {
    const message =
      typeof data?.error?.message === 'string'
        ? data.error.message
        : `Gemini API request failed with status ${response.status}.`;
    throw new GeminiServiceError(message);
  }

  return data as T;
};

const ensureDreamImageDirectory = async () => {
  if (!FileSystem.documentDirectory) {
    throw new GeminiServiceError('Document storage is not available on this device.');
  }

  const dreamImageDirectory = `${FileSystem.documentDirectory}dream-images/`;
  const info = await FileSystem.getInfoAsync(dreamImageDirectory);

  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dreamImageDirectory, { intermediates: true });
  }

  return dreamImageDirectory;
};

const saveImageToFile = async (imageBase64: string, mimeType = 'image/png') => {
  const dreamImageDirectory = await ensureDreamImageDirectory();

  const extension = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png';
  const fileUri = `${dreamImageDirectory}dream-${Date.now()}.${extension}`;

  await FileSystem.writeAsStringAsync(fileUri, imageBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return fileUri;
};

export const analyzeDreamAudio = async (audioUri: string): Promise<DreamAnalysis> => {
  const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const data = await fetchJson<GeminiGenerateContentResponse>(
    `${GEMINI_API_BASE_URL}/${TEXT_MODEL}:generateContent`,
    {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                'Transcribe this dream audio and analyze it. Return only valid JSON with these exact string fields: transcription, interpretation, visualPrompt, emotionalTheme. The visualPrompt must be in English and suitable for a surreal, dreamlike image generation model.',
            },
            {
              inlineData: {
                mimeType: getAudioMimeType(audioUri),
                data: audioBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }
  );

  if (data.error?.message) {
    throw new GeminiServiceError(data.error.message);
  }

  const text = data.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;

  if (!text) {
    throw new GeminiServiceError('Gemini did not return a dream analysis.');
  }

  return parseJsonFromModelText(text);
};

export const testGeminiConnection = async (): Promise<string> => {
  const data = await fetchJson<GeminiGenerateContentResponse>(
    `${GEMINI_API_BASE_URL}/${TEXT_MODEL}:generateContent`,
    {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                'Reply in one short Italian sentence confirming that Gemini is connected successfully to the DreamStream mobile app.',
            },
          ],
        },
      ],
    }
  );

  if (data.error?.message) {
    throw new GeminiServiceError(data.error.message);
  }

  const text = data.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;

  if (!text) {
    throw new GeminiServiceError('Gemini did not return a test response.');
  }

  return text.trim();
};

export const generateDreamImage = async (prompt: string, size: ImageSize): Promise<string> => {
  const data = await fetchJson<ImagenPredictResponse>(
    `${GEMINI_API_BASE_URL}/${IMAGE_MODEL}:predict`,
    {
      instances: [
        {
          prompt,
        },
      ],
      parameters: {
        sampleCount: 1,
        aspectRatio: '3:4',
        sampleImageSize: size === '4K' ? '2K' : '1K',
      },
    }
  );

  if (data.error?.message) {
    throw new GeminiServiceError(data.error.message);
  }

  const generatedImage = data.predictions?.[0];
  const imageBase64 = generatedImage?.bytesBase64Encoded;

  if (!imageBase64) {
    throw new GeminiServiceError('Gemini did not return a generated image.');
  }

  return saveImageToFile(imageBase64, generatedImage.mimeType);
};
