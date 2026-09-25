/**
 * Resumo do arquivo:
 * A linha do anexo pontual, acima do campo de escrever.
 *
 * Ela existe para dizer UMA coisa, e dize-la antes de a pessoa perguntar: este
 * documento nao entrou no seu historico. A D15 separa "me explica este papel"
 * de "quero que este exame faca parte do meu historico", e a separacao so
 * funciona se a pessoa souber em qual das duas ela esta.
 *
 * E por isso o atalho para `/add-exam` fica aqui, e nao escondido num menu:
 * quem queria registrar precisa achar a porta que registra no mesmo lugar em
 * que descobre que nao registrou.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/constants/theme';

export function ChatAttachmentRow({
  fileName,
  onRemove,
}: {
  fileName: string;
  onRemove: () => void;
}) {
  const colors = useThemeColors();

  return (
    <View className="mb-2 rounded-app border border-app-border bg-app-surface p-3 dark:border-app-dark-border dark:bg-app-dark-surface">
      <View className="flex-row items-center gap-2">
        <Ionicons name="document-text-outline" size={18} color={colors.iconMuted} />
        <Text
          className="flex-1 text-[14px] text-app-text dark:text-app-dark-text"
          numberOfLines={1}
        >
          {fileName}
        </Text>
        <Pressable accessibilityLabel="Remover anexo" accessibilityRole="button" onPress={onRemove}>
          <Ionicons name="close" size={18} color={colors.iconMuted} />
        </Pressable>
      </View>

      <Text className="mt-2 text-[13px] text-app-textSecondary dark:text-app-dark-textSecondary">
        Este documento vale só para esta conversa e não foi adicionado ao seu histórico.
      </Text>

      <Pressable
        accessibilityRole="button"
        className="mt-1"
        onPress={() => router.push('/add-exam')}
      >
        <Text className="text-[13px] font-semibold text-app-primaryDark dark:text-app-dark-primaryDark">
          Registrar este documento no histórico
        </Text>
      </Pressable>
    </View>
  );
}
