import AsyncStorage from '@react-native-async-storage/async-storage';
import { DreamAnalysis, AppLanguageCode, SavedDream } from '../types';
import { DEFAULT_LANGUAGE_CODE, isAppLanguageCode } from '../i18n/languages';

const DREAM_HISTORY_KEY = '@dream_history';
const LANGUAGE_KEY = '@dream_language';

export const saveDream = async (
  dream: DreamAnalysis,
  imageUrl: string | null,
  languageCode?: AppLanguageCode
): Promise<void> => {
  try {
    const existingHistoryStr = await AsyncStorage.getItem(DREAM_HISTORY_KEY);
    const existingHistory: SavedDream[] = existingHistoryStr ? JSON.parse(existingHistoryStr) : [];
    
    const newDream: SavedDream = {
      ...dream,
      id: Date.now().toString(),
      imageUrl,
      timestamp: Date.now(),
      languageCode,
    };
    
    const updatedHistory = [newDream, ...existingHistory];
    
    // Optional: Filter out dreams older than 6 months (approx 180 days)
    const sixMonthsAgo = Date.now() - (180 * 24 * 60 * 60 * 1000);
    const filteredHistory = updatedHistory.filter(d => d.timestamp > sixMonthsAgo);
    
    await AsyncStorage.setItem(DREAM_HISTORY_KEY, JSON.stringify(filteredHistory));
  } catch (error) {
    console.error('Failed to save dream to history:', error);
    throw error;
  }
};

export const getDreamHistory = async (): Promise<SavedDream[]> => {
  try {
    const historyStr = await AsyncStorage.getItem(DREAM_HISTORY_KEY);
    return historyStr ? JSON.parse(historyStr) : [];
  } catch (error) {
    console.error('Failed to fetch dream history:', error);
    return [];
  }
};

export const saveLanguagePreference = async (languageCode: AppLanguageCode): Promise<void> => {
  await AsyncStorage.setItem(LANGUAGE_KEY, languageCode);
};

export const getLanguagePreference = async (): Promise<AppLanguageCode> => {
  const storedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

  if (isAppLanguageCode(storedLanguage)) {
    return storedLanguage;
  }

  return DEFAULT_LANGUAGE_CODE;
};
