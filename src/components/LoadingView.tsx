import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';

export const LoadingView = () => {
  const [textIndex, setTextIndex] = useState(0);
  const texts = ["Interpreting Symbols...", "Consulting Jung...", "Painting the Dreamscape..."];
  
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % texts.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }));

  return (
    <View className="flex-1 w-full items-center justify-center relative">
      <LinearGradient
        colors={['rgba(79, 70, 229, 0.1)', 'rgba(15, 23, 42, 1)']}
        className="absolute inset-0"
      />
      <Animated.Text style={animatedStyle} className="text-indigo-400 font-serif text-2xl text-center">
        {texts[textIndex]}
      </Animated.Text>
    </View>
  );
};
