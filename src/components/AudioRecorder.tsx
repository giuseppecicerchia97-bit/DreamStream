import React, { useEffect, useRef, useState } from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Audio } from 'expo-av';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { AppLanguageCode } from '../types';
import { getLanguageOption } from '../i18n/languages';

interface Props {
  onRecordingComplete: (uri: string) => void;
  languageCode: AppLanguageCode;
}

let preparedRecording: Audio.Recording | null = null;

const unloadPreparedRecording = async () => {
  const activeRecording = preparedRecording;
  preparedRecording = null;

  if (!activeRecording) {
    return;
  }

  try {
    await activeRecording.stopAndUnloadAsync();
  } catch {
    // The recording may already be stopped/unloaded by the native layer.
  }
};

export const AudioRecorder = ({ onRecordingComplete, languageCode }: Props) => {
  const { ui } = getLanguageOption(languageCode);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [message, setMessage] = useState(ui.holdToRecord);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const isMountedRef = useRef(true);
  const isStartingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const shouldStopAfterStartRef = useRef(false);
  const pulseScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }]
  }));

  const isShortRecordingError = (error: unknown) => {
    return error instanceof Error && error.message.includes('no valid audio data');
  };

  const finishRecording = async (activeRecording: Audio.Recording) => {
    await activeRecording.stopAndUnloadAsync();
    if (preparedRecording === activeRecording) {
      preparedRecording = null;
    }
    const uri = activeRecording.getURI();
    if (uri) onRecordingComplete(uri);
  };

  const resetRecorderState = () => {
    isStartingRef.current = false;
    isStoppingRef.current = false;
    shouldStopAfterStartRef.current = false;
    recordingRef.current = null;
    if (isMountedRef.current) {
      setRecording(null);
      setMessage(ui.holdToRecord);
    }
    pulseScale.value = withTiming(1);
  };

  useEffect(() => {
    if (!recordingRef.current && !isStartingRef.current && !isStoppingRef.current) {
      setMessage(ui.holdToRecord);
    }
  }, [ui.holdToRecord]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      const activeRecording = recordingRef.current;
      recordingRef.current = null;
      if (activeRecording) {
        activeRecording.stopAndUnloadAsync().catch(() => undefined);
        if (preparedRecording === activeRecording) {
          preparedRecording = null;
        }
      }
    };
  }, []);

  const startRecording = async () => {
    if (isStartingRef.current || recordingRef.current || isStoppingRef.current) {
      return;
    }

    isStartingRef.current = true;
    shouldStopAfterStartRef.current = false;
    setMessage(ui.startingRecording);

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await unloadPreparedRecording();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        preparedRecording = newRecording;

        if (!isMountedRef.current) {
          await unloadPreparedRecording();
          return;
        }

        recordingRef.current = newRecording;
        setRecording(newRecording);
        setMessage(ui.releaseToAnalyze);
        pulseScale.value = withRepeat(
          withSequence(withTiming(1.2, { duration: 800 }), withTiming(1, { duration: 800 })),
          -1,
          true
        );

        if (shouldStopAfterStartRef.current) {
          isStartingRef.current = false;
          await stopRecording();
          return;
        }
      } else {
        setMessage(ui.microphoneRequired);
      }
    } catch (err) {
      resetRecorderState();
      console.warn('Failed to start recording', err);
    } finally {
      isStartingRef.current = false;
    }
  };

  const stopRecording = async () => {
    if (isStartingRef.current) {
      shouldStopAfterStartRef.current = true;
      return;
    }

    if (isStoppingRef.current) {
      return;
    }

    const activeRecording = recordingRef.current;
    if (!activeRecording) {
      return;
    }

    isStoppingRef.current = true;
    recordingRef.current = null;
    setRecording(null);
    setMessage(ui.preparingDream);
    pulseScale.value = withTiming(1);

    try {
      await finishRecording(activeRecording);
    } catch (err) {
      if (preparedRecording === activeRecording) {
        preparedRecording = null;
      }

      if (isShortRecordingError(err)) {
        setMessage(ui.recordingTooShort);
      } else {
        console.warn('Failed to stop recording', err);
        setMessage(ui.recordingFailed);
      }
    } finally {
      isStoppingRef.current = false;
    }
  };

  return (
    <View className="items-center justify-center mt-10">
      <Animated.View style={animatedStyle} className="absolute w-32 h-32 rounded-full bg-indigo-500/20" />
      <TouchableOpacity
        onPressIn={startRecording}
        onPressOut={stopRecording}
        className={`w-24 h-24 rounded-full items-center justify-center ${recording ? 'bg-indigo-600' : 'bg-slate-800 border-2 border-indigo-500'}`}
      >
        <MaterialCommunityIcons name={recording ? "microphone" : "microphone-outline"} size={40} color={recording ? "white" : "#a5b4fc"} />
      </TouchableOpacity>
      <Text className="text-slate-400 mt-6 font-sans text-center">
        {message}
      </Text>
    </View>
  );
};
