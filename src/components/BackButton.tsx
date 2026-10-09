import React from 'react';
import { Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useThemeColors } from '@/constants/theme';

/**
 * O botão de voltar do app: o mesmo quadrado de 48dp com borda que o
 * `DetailHeader` desenha. Existe à parte para os cabeçalhos que não são o
 * `DetailHeader` (o `ScreenHeader` das telas do hub, o topo do Perfil).
 */
export function BackButton({ onPress }: { onPress: () => void }) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityLabel="Voltar"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.7 }]}
      className="size-12 items-center justify-center rounded-field border-[1.5px] border-app-border dark:border-app-dark-border"
    >
      <Ionicons color={colors.text} name="chevron-back" size={22} />
    </Pressable>
  );
}
