import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useThemeColors } from '@/constants/theme';

type DoseTimeRowProps = {
  value: string;
  onChange: (value: string) => void;
  onRemove?: () => void;
};

function formatTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

/**
 * Linha de horário dinâmico (input hh:mm + botão remover) — reutilizada pela lista de
 * horários de `AddMedicineScreen`/`EditMedicineScreen` (3f/3g).
 */
export function DoseTimeRow({ value, onChange, onRemove }: DoseTimeRowProps) {
  const colors = useThemeColors();

  return (
    <View className="mb-3 flex-row items-center gap-3">
      <View className="h-14 flex-1 flex-row items-center rounded-field border-[1.5px] border-app-border bg-app-inputBackground px-4 dark:border-app-dark-border dark:bg-app-dark-inputBackground">
        <TextInput
          accessibilityLabel="Horário da dose"
          className="flex-1 text-[17px] text-app-text dark:text-app-dark-text"
          inputMode="numeric"
          maxLength={5}
          placeholder="hh:mm"
          placeholderTextColor={colors.placeholder}
          value={value}
          onChangeText={(text) => onChange(formatTimeInput(text))}
        />
      </View>
      {onRemove ? (
        <Pressable
          accessibilityLabel="Remover horário"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onRemove}
          className="size-12 items-center justify-center rounded-field border-[1.5px] border-app-border dark:border-app-dark-border"
        >
          <Ionicons color={colors.textSecondary} name="close" size={20} />
        </Pressable>
      ) : (
        <Text className="w-12" />
      )}
    </View>
  );
}
