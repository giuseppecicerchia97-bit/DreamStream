import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { DreamAnalysis } from '../types';

interface Props {
  analysis: DreamAnalysis;
  imageUrl: string | null;
  onRestart: () => void;
  onSave: () => void;
  readOnly?: boolean;
  warning?: string | null;
}

export const DreamResult = ({ analysis, imageUrl, onRestart, onSave, readOnly = false, warning = null }: Props) => {
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
          <Text className="text-center font-serif text-xl text-slate-300">Dream analysis ready</Text>
          <Text className="mt-2 text-center font-sans text-sm text-slate-500">
            Image generation can be enabled after upgrading the API project.
          </Text>
        </View>
      )}
      
      <View className="px-6 -mt-10">
        <BlurView intensity={20} tint="dark" className="p-6 rounded-2xl overflow-hidden border border-white/10 mb-6">
          <Text className="text-indigo-300 font-serif text-sm uppercase tracking-widest mb-2">The Core Theme</Text>
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
          <Text className="text-indigo-400 font-serif text-lg mb-3">The Interpretation</Text>
          <Text className="text-slate-300 font-sans leading-7">{analysis.interpretation}</Text>
        </View>

        <View className="mb-10">
          <Text className="text-indigo-400 font-serif text-lg mb-3">The Transcription</Text>
          <Text className="text-slate-400 font-sans italic leading-6">"{analysis.transcription}"</Text>
        </View>

        <View className="flex-row justify-between space-x-4">
          <TouchableOpacity onPress={onRestart} className="flex-1 py-4 rounded-xl bg-slate-800 border border-slate-700 items-center">
            <Text className="text-slate-300 font-sans font-bold">{readOnly ? 'Back to History' : 'Discard'}</Text>
          </TouchableOpacity>
          {!readOnly && (
            <TouchableOpacity onPress={onSave} className="flex-1 py-4 rounded-xl bg-indigo-600 items-center">
              <Text className="text-white font-sans font-bold">Save & Restart</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
};
