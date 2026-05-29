import * as FileSystem from 'expo-file-system/legacy';
import { AppLanguageCode, DreamAnalysis, ImageSize } from '../types';
import { getLanguageOption } from '../i18n/languages';

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const TEXT_MODEL = process.env.EXPO_PUBLIC_GEMINI_TEXT_MODEL || 'gemini-3.5-flash';
const TEXT_MODEL_FALLBACKS = (
  process.env.EXPO_PUBLIC_GEMINI_TEXT_MODEL_FALLBACKS ||
  'gemini-flash-latest,gemini-2.5-flash,gemini-2.5-flash-lite'
)
  .split(',')
  .map((model: string) => model.trim())
  .filter(Boolean);
const TEXT_MODELS = Array.from(new Set([TEXT_MODEL, ...TEXT_MODEL_FALLBACKS]));
const IMAGE_MODEL = process.env.EXPO_PUBLIC_GEMINI_IMAGE_MODEL || 'imagen-4.0-generate-001';
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

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
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'GeminiServiceError';
    this.status = status;
  }
}

export const getDreamServiceErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return 'Non sono riuscito ad analizzare il sogno. La registrazione e ancora qui: puoi riprovare senza registrarla di nuovo.';
  }

  const message = error.message.toLowerCase();

  if (message.includes('missing expo_public_gemini_api_key')) {
    return "La chiave Gemini non e presente in questa build. Aggiungila su EAS e ricompila l'app.";
  }

  if (message.includes('api key not valid') || message.includes('permission denied') || message.includes('forbidden')) {
    return 'La chiave Gemini non e stata accettata. Controlla che sia valida e abilitata per Gemini API.';
  }

  if (message.includes('mime') || message.includes('audio format') || message.includes('unsupported')) {
    return "C'era un problema tecnico con il formato audio. Ho conservato la registrazione: riprova l'analisi.";
  }

  if (message.includes('network') || message.includes('failed to fetch')) {
    return 'Sembra esserci un problema di connessione. Ho conservato la registrazione: riprova quando internet e stabile.';
  }

  if (
    error instanceof GeminiServiceError &&
    (error.status === 429 || message.includes('quota') || message.includes('rate limit'))
  ) {
    return 'Gemini ha troppe richieste in questo momento. Ho conservato la registrazione: aspetta qualche secondo e riprova.';
  }

  if (isRetryableGeminiError(error instanceof GeminiServiceError ? error : new GeminiServiceError(error.message))) {
    return 'Gemini non ha risposto in modo stabile. Ho conservato la registrazione: puoi riprovare senza registrarla di nuovo.';
  }

  return 'Non sono riuscito ad analizzare il sogno. La registrazione e ancora qui: puoi riprovare senza registrarla di nuovo.';
};

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
  if (normalizedUri.endsWith('.m4a')) return 'audio/aac';
  if (normalizedUri.endsWith('.aac')) return 'audio/aac';
  if (normalizedUri.endsWith('.caf')) return 'audio/x-caf';
  if (normalizedUri.endsWith('.3gp')) return 'audio/3gpp';

  return 'audio/aac';
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

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableGeminiError = (error: GeminiServiceError) => {
  const message = error.message.toLowerCase();

  return (
    (typeof error.status === 'number' && RETRYABLE_STATUS_CODES.has(error.status)) ||
    message.includes('high demand') ||
    message.includes('overloaded') ||
    message.includes('temporarily unavailable') ||
    message.includes('try again later')
  );
};

const shouldTryNextTextModel = (error: GeminiServiceError) => {
  const message = error.message.toLowerCase();

  return (
    isRetryableGeminiError(error) ||
    message.includes('no longer available') ||
    message.includes('model not found') ||
    message.includes('not found for api version') ||
    message.includes('not supported') ||
    message.includes('does not support')
  );
};

const getRetryDelayMs = (attempt: number) => {
  const baseDelayMs = 900 * 2 ** attempt;
  const jitterMs = Math.floor(Math.random() * 350);

  return Math.min(baseDelayMs + jitterMs, 6000);
};

const fetchJsonOnce = async <T,>(url: string, body: unknown): Promise<T> => {
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
    throw new GeminiServiceError(message, response.status);
  }

  return data as T;
};

const fetchJson = async <T,>(url: string, body: unknown, maxAttempts = 3): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await fetchJsonOnce<T>(url, body);
    } catch (error) {
      lastError = error;

      if (
        !(error instanceof GeminiServiceError) ||
        attempt === maxAttempts - 1 ||
        !isRetryableGeminiError(error)
      ) {
        throw error;
      }

      await wait(getRetryDelayMs(attempt));
    }
  }

  throw lastError;
};

const fetchTextModelJson = async <T,>(path: string, body: unknown): Promise<T> => {
  let lastError: unknown;

  for (const model of TEXT_MODELS) {
    try {
      return await fetchJson<T>(`${GEMINI_API_BASE_URL}/${model}:${path}`, body);
    } catch (error) {
      lastError = error;

      if (!(error instanceof GeminiServiceError) || !shouldTryNextTextModel(error)) {
        throw error;
      }
    }
  }

  throw lastError;
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

export const analyzeDreamAudio = async (
  audioUri: string,
  languageCode: AppLanguageCode
): Promise<DreamAnalysis> => {
  const language = getLanguageOption(languageCode);
  const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const data = await fetchTextModelJson<GeminiGenerateContentResponse>(
    'generateContent',
    {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                `Transcribe this dream audio and analyze it. Return only valid JSON with these exact string fields: transcription, interpretation, visualPrompt, emotionalTheme. Write transcription, interpretation, and emotionalTheme in ${language.promptName}. The emotionalTheme should be a short title in ${language.promptName}. The visualPrompt must stay in English and be suitable for a surreal, dreamlike image generation model.`,
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

export const testGeminiConnection = async (languageCode: AppLanguageCode): Promise<string> => {
  const language = getLanguageOption(languageCode);

  const data = await fetchTextModelJson<GeminiGenerateContentResponse>(
    'generateContent',
    {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                `Reply in one short ${language.promptName} sentence confirming that Gemini is connected successfully to the DreamStream mobile app.`,
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
