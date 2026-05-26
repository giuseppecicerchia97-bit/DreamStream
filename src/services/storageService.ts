import AsyncStorage from '@react-native-async-storage/async-storage';
import { DreamAnalysis, SavedDream } from '../types';

const DREAM_HISTORY_KEY = '@dream_history';

export const saveDream = async (dream: DreamAnalysis, imageUrl: string | null): Promise<void> => {
  try {
    const existingHistoryStr = await AsyncStorage.getItem(DREAM_HISTORY_KEY);
    const existingHistory: SavedDream[] = existingHistoryStr ? JSON.parse(existingHistoryStr) : [];
    
    const newDream: SavedDream = {
      ...dream,
      id: Date.now().toString(),
      imageUrl,
      timestamp: Date.now(),
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
