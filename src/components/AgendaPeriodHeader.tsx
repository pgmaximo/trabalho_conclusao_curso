// =============================================================================
// Arquivo: AgendaPeriodHeader.tsx
// Descricao: Navegacao de periodo da Agenda — setas, rotulo e atalho "Hoje"
// =============================================================================

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useThemeColors } from '@/constants/theme';

type AgendaPeriodHeaderProps = {
  label: string;
  canGoToToday: boolean;
  /** true quando um override de lista (Proximos/Historico) esta ativo: o periodo
   *  deixa de recortar a lista, entao navegar por ele enganaria o usuario. */
  navigationDisabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
};

export function AgendaPeriodHeader({
  label,
  canGoToToday,
  navigationDisabled,
  onPrevious,
  onNext,
  onToday,
}: AgendaPeriodHeaderProps) {
  const colors = useThemeColors();
  const arrowColor = navigationDisabled ? colors.iconMuted : colors.text;

  return (
    <View className="mb-3 flex-row items-center justify-between gap-2">
      <Pressable
        accessibilityLabel="Período anterior"
        accessibilityRole="button"
        accessibilityState={{ disabled: navigationDisabled }}
        className="h-12 w-12 items-center justify-center"
        disabled={navigationDisabled}
        onPress={onPrevious}
        style={({ pressed }) => [pressed && { opacity: 0.6 }]}
      >
        <Ionicons color={arrowColor} name="chevron-back" size={24} />
      </Pressable>

      <View className="flex-1 items-center">
        <Text
          className="text-[18px] font-semibold text-app-text dark:text-app-dark-text"
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>

      {canGoToToday && !navigationDisabled ? (
        <Pressable
          accessibilityRole="button"
          className="h-12 items-center justify-center px-2"
          onPress={onToday}
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
        >
          <Text className="text-[15px] font-semibold text-app-secondary dark:text-app-dark-secondary">
            Hoje
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityLabel="Próximo período"
        accessibilityRole="button"
        accessibilityState={{ disabled: navigationDisabled }}
        className="h-12 w-12 items-center justify-center"
        disabled={navigationDisabled}
        onPress={onNext}
        style={({ pressed }) => [pressed && { opacity: 0.6 }]}
      >
        <Ionicons color={arrowColor} name="chevron-forward" size={24} />
      </Pressable>
    </View>
  );
}
