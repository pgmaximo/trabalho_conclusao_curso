// =============================================================================
// Arquivo: InlineError.tsx
// Descrição: Callout de erro inline (fundo/borda vermelhos, ícone "!", texto),
// conforme specs/design/DESIGN_TOKENS.md §4 — substitui `alert()`/`Alert.alert`
// nativos em toda a UI. Extraído de `DocumentDetailScreen.tsx` (tela 3c) para ser
// reaproveitado por `ExamsScreen.tsx` (3a) e `AddExamScreen.tsx` (3b).
// =============================================================================

import React from 'react';
import { Text, View } from 'react-native';

export interface InlineErrorProps {
  message: string;
}

export function InlineError({ message }: InlineErrorProps) {
  return (
    <View className="mb-4 flex-row items-start gap-2 rounded-2xl border border-app-dangerBadgeBorder bg-app-dangerSoft p-3 dark:border-app-dark-dangerBadgeBorder dark:bg-app-dark-dangerSoft">
      <View
        className="items-center justify-center rounded-full bg-app-danger dark:bg-app-dark-danger"
        style={{ height: 22, width: 22, marginTop: 2 }}
      >
        <Text className="text-xs font-bold text-white">!</Text>
      </View>
      <Text className="flex-1 text-[16px] text-app-danger dark:text-app-dark-danger">
        {message}
      </Text>
    </View>
  );
}
