import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useThemeColors } from '@/constants/theme';

type QuickAccessButtonProps = {
  icon: string; // nome do Ionicon
  label: string;
  onPress: () => void;
};

export function QuickAccessButton({ icon, label, onPress }: QuickAccessButtonProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      className="flex-1 items-center justify-center px-2 py-3"
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.7 }]}
    >
      <View className="mb-2 h-12 w-12 items-center justify-center rounded-app bg-app-inputBackground dark:bg-app-dark-inputBackground">
        <Ionicons color={colors.primary} name={icon as never} size={24} />
      </View>
      <Text className="text-center text-[13px] font-semibold text-app-text dark:text-app-dark-text">
        {label}
      </Text>
    </Pressable>
  );
}
