import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getDreamHistory } from '../services/storageService';
import { SavedDream } from '../types';

interface Props {
  onBack: () => void;
  onSelectDream: (dream: SavedDream) => void;
}

export const DreamCalendar = ({ onBack, onSelectDream }: Props) => {
  const [history, setHistory] = useState<SavedDream[]>([]);

  useEffect(() => {
    getDreamHistory().then(setHistory);
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, { 
      month: 'short', day: 'numeric', year: 'numeric' 
    });
  };

  return (
    <View className="flex-1 w-full px-4 pt-16">
      <View className="flex-row items-center mb-8">
        <TouchableOpacity onPress={onBack} className="p-2 -ml-2">
          <MaterialCommunityIcons name="arrow-left" size={28} color="#a5b4fc" />
        </TouchableOpacity>
        <Text className="text-white font-serif text-3xl ml-4">Dream History</Text>
      </View>

      {history.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <MaterialCommunityIcons name="book-open-page-variant" size={64} color="#334155" />
          <Text className="text-slate-500 font-sans text-center mt-4">No dreams recorded yet.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              onPress={() => onSelectDream(item)}
              className="bg-slate-800/80 rounded-2xl mb-4 overflow-hidden border border-slate-700/50 flex-row h-28"
            >
              {item.imageUrl && (
                <Image source={{ uri: item.imageUrl }} className="w-28 h-full" resizeMode="cover" />
              )}
              <View className="p-4 flex-1 justify-center">
                <Text className="text-slate-400 text-xs font-sans mb-1">{formatDate(item.timestamp)}</Text>
                <Text className="text-indigo-300 font-serif text-lg mb-1" numberOfLines={1}>
                  {item.emotionalTheme}
                </Text>
                <Text className="text-slate-300 font-sans text-sm" numberOfLines={1}>
                  {item.transcription}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};
