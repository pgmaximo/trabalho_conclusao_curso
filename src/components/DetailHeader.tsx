// =============================================================================
// Arquivo: DetailHeader.tsx
// Descrição: Cabeçalho "voltar + título + ação opcional" reutilizável para telas
// de detalhe/edição empilhadas (stack push, não abas). Extraído do padrão inline
// idêntico já usado em DocumentDetailScreen.tsx (3c), EditMedicineScreen.tsx (3g)
// e EditAppointmentScreen.tsx (2e) — ver specs/design/GAP_ANALYSIS.md item 34.
// Não confundir com BackHeader.tsx (fluxo de Autenticação, sem slot de ação) nem
// com ScreenHeader.tsx (raiz de aba, sem botão "voltar").
// =============================================================================

import React, { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useThemeColors } from '@/constants/theme';

type DetailHeaderProps = {
  title: string;
  onBack: () => void;
  action?: ReactNode;
};

export function DetailHeader({ title, onBack, action }: DetailHeaderProps) {
  const colors = useThemeColors();

  return (
    <View className="mb-6 flex-row items-center gap-3">
      <Pressable
        accessibilityLabel="Voltar"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        className="size-12 items-center justify-center rounded-field border-[1.5px] border-app-border dark:border-app-dark-border"
      >
        <Ionicons color={colors.text} name="chevron-back" size={22} />
      </Pressable>

      <Text className="flex-1 text-[20px] font-semibold text-app-text dark:text-app-dark-text">
        {title}
      </Text>

      {action}
    </View>
  );
}
