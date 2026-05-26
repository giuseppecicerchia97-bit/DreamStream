import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AudioRecorder } from './src/components/AudioRecorder';
import { LoadingView } from './src/components/LoadingView';
import { DreamResult } from './src/components/DreamResult';
import { DreamCalendar } from './src/components/DreamCalendar';
import { analyzeDreamAudio, generateDreamImage, testGeminiConnection } from './src/services/geminiService';
import { saveDream } from './src/services/storageService';
import { DreamState, SavedDream } from './src/types';
import './global.css';

export default function App() {
  const [state, setState] = useState<DreamState>({
    audioUri: null,
    analysis: null,
    imageUrl: null,
    imageSize: '1K',
    isProcessing: false,
    isRecording: false,
    step: 'idle',
    error: null,
  });

  const [viewedHistoryDream, setViewedHistoryDream] = useState<SavedDream | null>(null);
  const [geminiTestResult, setGeminiTestResult] = useState<string | null>(null);
  const [isTestingGemini, setIsTestingGemini] = useState(false);

  const handleRecordingComplete = async (uri: string) => {
    setState(s => ({ ...s, audioUri: uri, step: 'analyzing', isProcessing: true, error: null }));
    try {
      const analysis = await analyzeDreamAudio(uri);
      setState(s => ({ ...s, analysis, step: 'generating_image' }));

      try {
        const imageUrl = await generateDreamImage(analysis.visualPrompt, state.imageSize);
        setState(s => ({ ...s, imageUrl, step: 'complete', isProcessing: false, error: null }));
      } catch (imageError) {
        const message = imageError instanceof Error ? imageError.message : 'Image generation failed.';
        console.warn(imageError);
        setState(s => ({
          ...s,
          imageUrl: null,
          step: 'complete',
          isProcessing: false,
          error: `Analisi completata, ma l'immagine non e stata generata: ${message}`,
        }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis failed.';
      console.warn(error);
      setState(s => ({ ...s, error: message, step: 'idle', isProcessing: false }));
    }
  };

  const handleRestart = () => {
    setState({
      audioUri: null,
      analysis: null,
      imageUrl: null,
      imageSize: '1K',
      isProcessing: false,
      isRecording: false,
      step: 'idle',
      error: null,
    });
    setViewedHistoryDream(null);
  };

  const handleSaveDream = async () => {
    if (state.analysis) {
      await saveDream(state.analysis, state.imageUrl);
      handleRestart();
    }
  };

  const handleTestGeminiConnection = async () => {
    setIsTestingGemini(true);
    setGeminiTestResult(null);

    try {
      const result = await testGeminiConnection();
      setGeminiTestResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gemini connection test failed.';
      console.warn(error);
      setGeminiTestResult(`Errore test Gemini: ${message}`);
    } finally {
      setIsTestingGemini(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-slate-900">
        <StatusBar style="light" />
        
        {state.step === 'idle' && (
          <View className="flex-1 items-center justify-center px-6">
            <TouchableOpacity 
              onPress={() => setState(s => ({ ...s, step: 'history' }))}
              className="absolute top-16 right-6 p-2 rounded-full bg-slate-800 border border-slate-700"
            >
              <MaterialCommunityIcons name="calendar-month" size={24} color="#a5b4fc" />
            </TouchableOpacity>
            <Text className="text-white font-serif text-4xl mb-2 text-center">DreamStream</Text>
            <Text className="text-slate-400 font-sans text-center mb-16">Speak your dream into reality.</Text>
            {state.error && (
              <Text className="text-rose-300 font-sans text-center mb-6 px-4">
                {state.error}
              </Text>
            )}
            <AudioRecorder onRecordingComplete={handleRecordingComplete} />
            <TouchableOpacity
              onPress={handleTestGeminiConnection}
              disabled={isTestingGemini}
              className="mt-8 flex-row items-center gap-2 rounded-full border border-indigo-400/50 bg-indigo-500/10 px-5 py-3"
            >
              <MaterialCommunityIcons
                name={isTestingGemini ? 'timer-sand' : 'connection'}
                size={20}
                color="#c7d2fe"
              />
              <Text className="font-sans text-indigo-100">
                {isTestingGemini ? 'Test in corso...' : 'Test Gemini'}
              </Text>
            </TouchableOpacity>
            {geminiTestResult && (
              <Text selectable className="mt-4 px-4 text-center font-sans text-sm text-slate-300">
                {geminiTestResult}
              </Text>
            )}
          </View>
        )}

        {(state.step === 'analyzing' || state.step === 'generating_image') && (
          <LoadingView />
        )}

        {state.step === 'complete' && state.analysis && (
          <DreamResult 
            analysis={state.analysis} 
            imageUrl={state.imageUrl} 
            onRestart={handleRestart}
            onSave={handleSaveDream}
            warning={state.error}
          />
        )}

        {state.step === 'history' && viewedHistoryDream === null && (
          <DreamCalendar 
            onBack={handleRestart} 
            onSelectDream={(dream) => setViewedHistoryDream(dream)} 
          />
        )}

        {state.step === 'history' && viewedHistoryDream !== null && (
          <DreamResult 
            analysis={viewedHistoryDream} 
            imageUrl={viewedHistoryDream.imageUrl} 
            onRestart={() => setViewedHistoryDream(null)}
            onSave={() => {}}
            readOnly={true}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
