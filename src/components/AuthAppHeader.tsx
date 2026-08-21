// =============================================================================
// Arquivo: AuthAppHeader.tsx
// Descricao: Cabecalho de app (icone + titulo + tagline) usado fora do card
// nas telas de autenticacao do Bloco 1 (Login, Cadastro, Confirmacao,
// Recuperar senha) — Canvas 1b/1c (specs/design/raw, linhas 1128-1130).
// =============================================================================

import React from 'react';
import { Text, View } from 'react-native';

import { useThemeColors } from '@/constants/theme';

type AuthAppHeaderProps = {
  title?: string;
  tagline?: string;
};

/**
 * Icone quadrado arredondado 44x44 (bg primary) com um glifo em cruz branco/
 * onPrimary, seguido do titulo "SuaSaude" (600/22) e da tagline (400/16).
 * Reaproveitavel por qualquer tela do Bloco 1 que precise do mesmo cabecalho.
 */
export function AuthAppHeader({
  title = 'SuaSaúde',
  tagline = 'Sua saúde organizada em um lugar',
}: AuthAppHeaderProps) {
  const colors = useThemeColors();

  return (
    <View className="mb-[26px] flex-row items-center gap-3" testID="auth-app-header">
      <View
        className="h-11 w-11 items-center justify-center rounded-[13px] bg-app-primary dark:bg-app-dark-primary"
        testID="auth-app-header-icon"
      >
        <View style={{ height: 24, width: 24 }}>
          <View
            style={{
              position: 'absolute',
              left: 7.5,
              top: 0,
              width: 9,
              height: 24,
              borderRadius: 3,
              backgroundColor: colors.onPrimary,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 7.5,
              width: 24,
              height: 9,
              borderRadius: 3,
              backgroundColor: colors.onPrimary,
            }}
          />
        </View>
      </View>

      <View>
        <Text className="text-[22px] font-semibold leading-[26px] text-app-text dark:text-app-dark-text">
          {title}
        </Text>
        <Text className="text-base leading-[21px] text-app-textSecondary dark:text-app-dark-textSecondary">
          {tagline}
        </Text>
      </View>
    </View>
  );
}
