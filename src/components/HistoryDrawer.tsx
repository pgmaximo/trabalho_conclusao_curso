import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { DeleteConfirmPanel } from '@/components/DeleteConfirmPanel';
import { useThemeColors } from '@/constants/theme';
import type { HistoryGroup } from '@/hooks/useChatBot';

type HistoryDrawerProps = {
  visible: boolean;
  groups: HistoryGroup[];
  onClose: () => void;
  onNewChat: () => void;
  /** Apaga de verdade (D33). Ausente enquanto nao havia conversa persistida. */
  onDelete?: (id: string) => void | Promise<void>;
};

/**
 * O que a tela diz sobre o que e guardado (D33), e ela diz as DUAS metades da
 * decisao: guardado sem prazo, e apagavel pela pessoa. Dizer so a primeira
 * seria contar metade; dizer so a segunda esconderia o que acontece por
 * padrao.
 *
 * NAO menciona prazo de expiracao porque nao existe prazo -- escrever um aqui
 * seria a tela mentindo sobre o que o banco faz.
 */
const AVISO_DE_RETENCAO =
  'Suas conversas ficam guardadas aqui até você apagar. Você pode apagar qualquer uma quando quiser.';

export function HistoryDrawer({
  visible,
  groups,
  onClose,
  onNewChat,
  onDelete,
}: HistoryDrawerProps) {
  const colors = useThemeColors();
  // Qual conversa esta com a confirmacao aberta. Uma de cada vez, e por id:
  // um painel sobre a lista inteira deixaria a pessoa sem saber qual conversa
  // esta prestes a sumir.
  const [aConfirmar, setAConfirmar] = useState<string | null>(null);
  const [apagando, setApagando] = useState(false);

  async function confirmarExclusao(id: string) {
    setApagando(true);
    try {
      await onDelete?.(id);
      setAConfirmar(null);
    } finally {
      setApagando(false);
    }
  }

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 flex-row">
        <View
          className="w-[296px] bg-app-surface pb-8 pt-6 dark:bg-app-dark-surface"
          style={{ boxShadow: '4px 0px 24px rgba(0, 0, 0, 0.16)' }}
        >
          <View className="flex-row items-center justify-between px-5">
            <Text className="text-[18px] font-semibold text-app-text dark:text-app-dark-text">
              Histórico
            </Text>
            <Pressable
              accessibilityLabel="Fechar histórico"
              accessibilityRole="button"
              onPress={onClose}
              className="size-10 items-center justify-center rounded-xl bg-app-background dark:bg-app-dark-background"
              style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          <Pressable
            accessibilityLabel="Nova conversa"
            accessibilityRole="button"
            onPress={onNewChat}
            className="mx-5 mt-5 h-12 items-center justify-center rounded-field border-[1.5px] border-app-primary bg-app-primarySoft dark:border-app-dark-primary dark:bg-app-dark-primarySoft"
            style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
          >
            <Text className="text-[15px] font-semibold text-app-primary dark:text-app-dark-primary">
              + Nova conversa
            </Text>
          </Pressable>

          <Text className="mt-4 px-5 text-[13px] leading-[18px] text-app-textSecondary dark:text-app-dark-textSecondary">
            {AVISO_DE_RETENCAO}
          </Text>

          <ScrollView className="mt-4 flex-1 px-5" showsVerticalScrollIndicator={false}>
            {groups.length === 0 ? (
              <Text className="text-[14px] text-app-textSecondary dark:text-app-dark-textSecondary">
                Nenhuma conversa anterior.
              </Text>
            ) : (
              groups.map((group) => (
                <View key={group.group} className="mb-4">
                  <Text className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-app-textSecondary dark:text-app-dark-textSecondary">
                    {group.group}
                  </Text>
                  {group.items.map((item) => (
                    <View key={item.id}>
                      <View className="flex-row items-center">
                        <Pressable
                          accessibilityRole="button"
                          onPress={item.onSelect}
                          className="min-h-12 flex-1 justify-center rounded-xl p-3"
                          style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
                        >
                          <Text
                            numberOfLines={1}
                            className="text-[15px] text-app-text dark:text-app-dark-text"
                          >
                            {item.title}
                          </Text>
                        </Pressable>

                        {onDelete ? (
                          <Pressable
                            accessibilityLabel={`Apagar conversa ${item.title}`}
                            accessibilityRole="button"
                            className="size-10 items-center justify-center rounded-xl"
                            style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
                            onPress={() => setAConfirmar(item.id)}
                          >
                            <Ionicons name="trash-outline" size={18} color={colors.iconMuted} />
                          </Pressable>
                        ) : null}
                      </View>

                      {aConfirmar === item.id ? (
                        <DeleteConfirmPanel
                          isDeleting={apagando}
                          message="Apagar esta conversa? Ela some de vez, e não pode ser desfeita."
                          onCancel={() => setAConfirmar(null)}
                          onConfirm={() => void confirmarExclusao(item.id)}
                        />
                      ) : null}
                    </View>
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        </View>

        <Pressable
          accessibilityLabel="Fechar histórico"
          accessibilityRole="button"
          className="flex-1 bg-app-overlay dark:bg-app-dark-overlay"
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}
