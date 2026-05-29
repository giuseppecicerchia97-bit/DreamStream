import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AudioRecorder } from './src/components/AudioRecorder';
import { LoadingView } from './src/components/LoadingView';
import { DreamResult } from './src/components/DreamResult';
import { DreamCalendar } from './src/components/DreamCalendar';
import { LanguageSelector } from './src/components/LanguageSelector';
import {
  analyzeDreamAudio,
  generateDreamImage,
  getDreamServiceErrorMessage,
  testGeminiConnection,
} from './src/services/geminiService';
import { getLanguagePreference, saveDream, saveLanguagePreference } from './src/services/storageService';
import { DreamState, AppLanguageCode, SavedDream } from './src/types';
import { DEFAULT_LANGUAGE_CODE, getLanguageOption } from './src/i18n/languages';
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
  const [languageCode, setLanguageCode] = useState<AppLanguageCode>(DEFAULT_LANGUAGE_CODE);
  const selectedLanguage = getLanguageOption(languageCode);

  useEffect(() => {
    getLanguagePreference()
      .then(setLanguageCode)
      .catch((error) => console.warn('Failed to load language preference:', error));
  }, []);

  const handleLanguageSelect = (nextLanguageCode: AppLanguageCode) => {
    setLanguageCode(nextLanguageCode);
    setGeminiTestResult(null);
    saveLanguagePreference(nextLanguageCode).catch((error) =>
      console.warn('Failed to save language preference:', error)
    );
  };

  const processDreamAudio = async (uri: string) => {
    const imageSize = state.imageSize;

    setState(s => ({ ...s, audioUri: uri, step: 'analyzing', isProcessing: true, error: null }));

    try {
      const analysis = await analyzeDreamAudio(uri, languageCode);
      setState(s => ({ ...s, analysis, step: 'generating_image' }));

      try {
        const imageUrl = await generateDreamImage(analysis.visualPrompt, imageSize);
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
      console.warn(error);
      setState(s => ({
        ...s,
        audioUri: uri,
        error: getDreamServiceErrorMessage(error),
        step: 'idle',
        isProcessing: false,
      }));
    }
  };

  const handleRecordingComplete = async (uri: string) => {
    await processDreamAudio(uri);
  };

  const handleRetryAnalysis = async () => {
    if (!state.audioUri || state.isProcessing) {
      return;
    }

    await processDreamAudio(state.audioUri);
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
      await saveDream(state.analysis, state.imageUrl, languageCode);
      handleRestart();
    }
  };

  const handleTestGeminiConnection = async () => {
    setIsTestingGemini(true);
    setGeminiTestResult(null);

    try {
      const result = await testGeminiConnection(languageCode);
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
            <View className="absolute top-16 right-6 z-10 flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => setState(s => ({ ...s, step: 'history' }))}
                className="h-11 w-11 items-center justify-center rounded-full border border-slate-700 bg-slate-800"
              >
                <MaterialCommunityIcons name="calendar-month" size={24} color="#a5b4fc" />
              </TouchableOpacity>
              <LanguageSelector selectedCode={languageCode} onSelect={handleLanguageSelect} />
            </View>
            <Text className="text-white font-serif text-4xl mb-2 text-center">DreamStream</Text>
            <Text className="text-slate-400 font-sans text-center mb-16">{selectedLanguage.ui.tagline}</Text>
            {state.error && (
              <Text className="text-rose-300 font-sans text-center mb-6 px-4">
                {state.error}
              </Text>
            )}
            {state.error && state.audioUri && (
              <View className="mb-6 w-full max-w-sm flex-row gap-3">
                <TouchableOpacity
                  onPress={handleRetryAnalysis}
                  disabled={state.isProcessing}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-full bg-indigo-600 px-4 py-3"
                >
                  <MaterialCommunityIcons name="reload" size={20} color="white" />
                  <Text className="font-sans font-bold text-white">Riprova analisi</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleRestart}
                  className="h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-800"
                >
                  <MaterialCommunityIcons name="delete-outline" size={22} color="#cbd5e1" />
                </TouchableOpacity>
              </View>
            )}
            <AudioRecorder onRecordingComplete={handleRecordingComplete} languageCode={languageCode} />
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
                {isTestingGemini ? selectedLanguage.ui.testRunning : selectedLanguage.ui.testGemini}
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
          <LoadingView languageCode={languageCode} />
        )}

        {state.step === 'complete' && state.analysis && (
          <DreamResult 
            analysis={state.analysis} 
            imageUrl={state.imageUrl} 
            onRestart={handleRestart}
            onSave={handleSaveDream}
            languageCode={languageCode}
            warning={state.error}
          />
        )}

        {state.step === 'history' && viewedHistoryDream === null && (
          <DreamCalendar 
            onBack={handleRestart} 
            onSelectDream={(dream) => setViewedHistoryDream(dream)} 
            languageCode={languageCode}
          />
        )}

        {state.step === 'history' && viewedHistoryDream !== null && (
          <DreamResult 
            analysis={viewedHistoryDream} 
            imageUrl={viewedHistoryDream.imageUrl} 
            onRestart={() => setViewedHistoryDream(null)}
            onSave={() => {}}
            languageCode={viewedHistoryDream.languageCode ?? languageCode}
            readOnly={true}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
