import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppLanguageCode } from '../types';
import { getLanguageOption, LANGUAGE_OPTIONS } from '../i18n/languages';

interface Props {
  selectedCode: AppLanguageCode;
  onSelect: (code: AppLanguageCode) => void;
}

export const LanguageSelector = ({ selectedCode, onSelect }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLanguage = getLanguageOption(selectedCode);

  const handleSelect = (code: AppLanguageCode) => {
    onSelect(code);
    setIsOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        className="h-11 flex-row items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3"
        accessibilityLabel={selectedLanguage.ui.languageTitle}
      >
        <MaterialCommunityIcons name="translate" size={20} color="#c7d2fe" />
        <Text className="font-sans text-sm font-bold text-indigo-100">{selectedLanguage.shortLabel}</Text>
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable className="flex-1 items-end bg-slate-950/70 px-5 pt-24" onPress={() => setIsOpen(false)}>
          <Pressable className="max-h-[72%] w-72 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
            <View className="border-b border-slate-700 px-4 py-3">
              <Text className="font-serif text-xl text-white">{selectedLanguage.ui.languageTitle}</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {LANGUAGE_OPTIONS.map((language) => {
                const isSelected = language.code === selectedCode;

                return (
                  <TouchableOpacity
                    key={language.code}
                    onPress={() => handleSelect(language.code)}
                    className="flex-row items-center justify-between border-b border-slate-800 px-4 py-3"
                  >
                    <View className="flex-1 pr-3">
                      <Text className="font-sans text-base text-slate-100">{language.nativeLabel}</Text>
                      <Text className="font-sans text-xs text-slate-500">{language.label}</Text>
                    </View>
                    <Text className="mr-3 font-sans text-xs font-bold text-slate-500">{language.shortLabel}</Text>
                    {isSelected && <MaterialCommunityIcons name="check" size={20} color="#a5b4fc" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};
