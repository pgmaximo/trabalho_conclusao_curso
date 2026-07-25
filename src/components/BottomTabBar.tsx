// =============================================================================
// Arquivo: BottomTabBar.tsx
// Descrição: Barra de navegação inferior com tabs do aplicativo.
// =============================================================================
//
// Design: cada tab usa um Ionicon (variante cheia quando ativa, "-outline"
// quando inativa). A tab ativa ganha uma cápsula suave (primarySoft) atrás do
// ícone + label na cor primária — affordance clara para baixo letramento digital.
// Totalmente reativa ao tema (claro/escuro) e respeita a safe area inferior.
//
// =============================================================================

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useThemeColors } from '@/constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type BottomTabBarItem = {
  icon: IoniconName; // nome base do Ionicon (ex.: "home" → "home-outline" quando inativo)
  label: string;
  id: string;
};

type BottomTabBarProps = {
  items: BottomTabBarItem[];
  activeTab: string;
  onTabPress: (tabId: string) => void;
};

export function BottomTabBar({ items, activeTab, onTabPress }: BottomTabBarProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row border-t border-app-border bg-app-surface px-1 pt-2 dark:border-app-dark-border dark:bg-app-dark-surface"
      style={{ paddingBottom: Math.max(insets.bottom, 10) }}
    >
      {items.map((item) => {
        const isActive = activeTab === item.id;
        // DECISION: deriva a variante outline a partir do nome base para nao
        // duplicar nomes de icone na config de navegacao.
        const iconName = (isActive ? item.icon : `${item.icon}-outline`) as IoniconName;

        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={item.label}
            className="flex-1 items-center justify-center py-1"
            style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
            onPress={() => onTabPress(item.id)}
          >
            <View
              className={
                isActive
                  ? 'mb-1 items-center justify-center rounded-full bg-app-primarySoft px-4 py-1 dark:bg-app-dark-primarySoft'
                  : 'mb-1 items-center justify-center rounded-full px-4 py-1'
              }
            >
              <Ionicons name={iconName} size={22} color={isActive ? colors.primary : colors.iconMuted} />
            </View>
            <Text
              numberOfLines={1}
              className={
                isActive
                  ? 'text-[10px] font-semibold text-app-primary dark:text-app-dark-primary'
                  : 'text-[10px] font-medium text-app-textSecondary dark:text-app-dark-textSecondary'
              }
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
