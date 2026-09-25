// =============================================================================
// Arquivo: BottomTabBar.tsx
// Descrição: Barra de navegação inferior com tabs do aplicativo.
// =============================================================================
//
// Design: cada tab usa um Ionicon (variante cheia quando ativa, "-outline"
// quando inativa). A tab ativa ganha uma cápsula suave (primarySoft) atrás do
// ícone + label na cor primária — affordance clara para baixo letramento digital.
// O estado ativo não depende só de cor: cápsula, ícone cheio e rótulo semibold.
// Totalmente reativa ao tema (claro/escuro) e respeita a safe area inferior.
//
// Formatação (specs/00-fundacao/barra-de-navegacao/spec.md, D4 e D5):
// - rótulo em 13px (era 10px, abaixo do piso de 11px com que o Canvas 1a
//   descartou a barra de 7 abas). 14px não cabe com folga em 360dp;
// - ícone e rótulo inativos em textSecondary (#55605C / #AEBBB6), com contraste
//   de 4,5:1 ou mais sobre a barra nos dois temas. O cinza iconMuted (#9E9E9E)
//   dava 2,7:1;
// - papel "tablist" no contêiner e "tab" em cada item, para o leitor de tela
//   anunciar "aba, 3 de 5, selecionada" em vez de "botão".
//
// =============================================================================

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
      accessibilityRole="tablist"
      testID="barra-de-abas"
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
            accessibilityRole="tab"
            // `aria-selected`, e nao `accessibilityState`: o react-native-web 0.21
            // nao traduz o accessibilityState para o DOM, e no navegador a aba
            // ativa chegava ao leitor de tela sem o "selecionada". No celular
            // o React Native mapeia os dois do mesmo jeito.
            aria-selected={isActive}
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
              <Ionicons name={iconName} size={22} color={isActive ? colors.primary : colors.textSecondary} />
            </View>
            <Text
              numberOfLines={1}
              // Tamanho em `style`, e não em className, para o teste conseguir
              // conferi-lo (o jest não resolve as classes do NativeWind).
              style={styles.rotulo}
              className={
                isActive
                  ? 'font-semibold text-app-primary dark:text-app-dark-primary'
                  : 'font-medium text-app-textSecondary dark:text-app-dark-textSecondary'
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

const styles = StyleSheet.create({
  rotulo: { fontSize: 13, lineHeight: 16 },
});
