import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useThemeColors } from '@/constants/theme';
import type { HistoryGroup } from '@/hooks/useChatBot';

type HistoryDrawerProps = {
  visible: boolean;
  groups: HistoryGroup[];
  onClose: () => void;
  onNewChat: () => void;
};

export function HistoryDrawer({ visible, groups, onClose, onNewChat }: HistoryDrawerProps) {
  const colors = useThemeColors();

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

          <ScrollView className="mt-5 flex-1 px-5" showsVerticalScrollIndicator={false}>
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
                    <Pressable
                      key={item.title}
                      accessibilityRole="button"
                      onPress={item.onSelect}
                      className="min-h-12 justify-center rounded-xl p-3"
                      style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
                    >
                      <Text
                        numberOfLines={1}
                        className="text-[15px] text-app-text dark:text-app-dark-text"
                      >
                        {item.title}
                      </Text>
                    </Pressable>
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
