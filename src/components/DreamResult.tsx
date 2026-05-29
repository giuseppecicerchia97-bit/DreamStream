import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { AppLanguageCode, DreamAnalysis } from '../types';
import { getLanguageOption } from '../i18n/languages';

interface Props {
  analysis: DreamAnalysis;
  imageUrl: string | null;
  onRestart: () => void;
  onSave: () => void;
  languageCode: AppLanguageCode;
  readOnly?: boolean;
  warning?: string | null;
}

export const DreamResult = ({
  analysis,
  imageUrl,
  onRestart,
  onSave,
  languageCode,
  readOnly = false,
  warning = null,
}: Props) => {
  const { ui } = getLanguageOption(languageCode);

  return (
    <ScrollView className="flex-1 w-full" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {imageUrl ? (
        <Image 
          source={{ uri: imageUrl }} 
          className="w-full h-80 rounded-b-3xl"
          resizeMode="cover"
        />
      ) : (
        <View className="h-44 w-full items-center justify-end rounded-b-3xl bg-slate-950 px-6 pb-10">
          <Text className="text-center font-serif text-xl text-slate-300">{ui.analysisReady}</Text>
          <Text className="mt-2 text-center font-sans text-sm text-slate-500">
            {ui.imageUnavailable}
          </Text>
        </View>
      )}
      
      <View className="px-6 pt-5">
        <BlurView intensity={20} tint="dark" className="p-6 rounded-2xl overflow-hidden border border-white/10 bg-slate-950/70 mb-6">
          <Text className="text-indigo-300 font-serif text-sm uppercase tracking-widest mb-2">{ui.coreTheme}</Text>
          <Text className="text-white font-serif text-2xl">{analysis.emotionalTheme}</Text>
        </BlurView>

        {warning && (
          <View className="mb-6 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
            <Text selectable className="font-sans text-sm leading-5 text-amber-100">
              {warning}
            </Text>
          </View>
        )}

        <View className="mb-8">
          <Text className="text-indigo-400 font-serif text-lg mb-3">{ui.interpretation}</Text>
          <Text className="text-slate-300 font-sans leading-7">{analysis.interpretation}</Text>
        </View>

        <View className="mb-10">
          <Text className="text-indigo-400 font-serif text-lg mb-3">{ui.transcription}</Text>
          <Text className="text-slate-400 font-sans italic leading-6">"{analysis.transcription}"</Text>
        </View>

        <View className="flex-row justify-between space-x-4">
          <TouchableOpacity onPress={onRestart} className="flex-1 py-4 rounded-xl bg-slate-800 border border-slate-700 items-center">
            <Text className="text-slate-300 font-sans font-bold">{readOnly ? ui.backToHistory : ui.discard}</Text>
          </TouchableOpacity>
          {!readOnly && (
            <TouchableOpacity onPress={onSave} className="flex-1 py-4 rounded-xl bg-indigo-600 items-center">
              <Text className="text-white font-sans font-bold">{ui.saveRestart}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
};
