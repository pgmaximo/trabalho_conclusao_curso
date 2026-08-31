// =============================================================================
// Arquivo: BackHeader.tsx
// Descricao: Cabecalho "voltar + titulo" reutilizavel para telas internas de
// fluxo (Cadastro, Confirmacao, Recuperar senha, ...). Extraido do padrao
// inline criado originalmente em RegisterScreen.tsx (Canvas 1c) e generalizado
// para tambem cobrir o cabecalho circular com borda do Canvas 1e (Confirmacao)
// e o subtitulo dinamico de etapa do Canvas 1g (Recuperar senha).
// =============================================================================

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/constants/theme';

type BackHeaderProps = {
  /** Titulo do cabecalho (ex.: "Criar conta", "Confirmar conta"). */
  title: string;
  /** Subtitulo opcional abaixo do titulo (ex.: passo dinamico de Recuperar senha). */
  subtitle?: string;
  /** Acao do botao "voltar". */
  onBack: () => void;
  /** Bloqueia o toque no botao "voltar" (ex.: durante isLoading). */
  disabled?: boolean;
  /**
   * Envolve o icone "‹" em um circulo com borda 1.5px `colors.border`
   * (Canvas 1e/1g). RegisterScreen (Canvas 1c) usa o icone solto, sem
   * borda/circulo — manter `false` la para preservar o visual original.
   */
  bordered?: boolean;
  testID?: string;
};

export function BackHeader({
  title,
  subtitle,
  onBack,
  disabled = false,
  bordered = false,
  testID = 'back-header',
}: BackHeaderProps) {
  const colors = useThemeColors();
  const [isPressed, setIsPressed] = useState(false);

  return (
    <View className="mb-6 flex-row items-center gap-2" testID={testID}>
      <Pressable
        accessibilityLabel="Voltar"
        accessibilityRole="button"
        disabled={disabled}
        hitSlop={8}
        onPress={onBack}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        // `style` NÃO pode ser função aqui — sem `className`, o NativeWind (jsxImportSource
        // global) descarta o resultado da função e o Pressable renderiza sem nenhum estilo.
        style={[
          {
            height: 48,
            width: 48,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: bordered ? 24 : 0,
            borderWidth: bordered ? 1.5 : 0,
            borderColor: bordered ? colors.border : 'transparent',
          },
          isPressed && { opacity: 0.7 },
        ]}
      >
        <MaterialIcons color={colors.text} name="chevron-left" size={28} />
      </Pressable>
      <View className="flex-1">
        <Text className="text-xl font-semibold leading-[26px] text-app-text dark:text-app-dark-text">
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-[15px] leading-[20px] text-app-textSecondary dark:text-app-dark-textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
