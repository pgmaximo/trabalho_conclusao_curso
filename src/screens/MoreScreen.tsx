// =============================================================================
// Arquivo: MoreScreen.tsx
// Descrição: Tela do hub "Mais" — 5ª tab de primeiro nível, lista de acesso a
// Prevenção, Assistente de IA e Perfil (ver specs/00-fundacao/navegacao).
// =============================================================================
//
// Sem seta de voltar (é uma tab de primeiro nível). Lista estática vinda de
// MORE_MENU_ITEMS — sem dados remotos, sem estados de carregamento/erro.
//
// =============================================================================

import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import Ionicons from '@expo/vector-icons/Ionicons';

import { MORE_MENU_ITEMS } from '@/constants/navigation';
import { FONTS, RADII, SPACING, useThemeColors } from '@/constants/theme';

export function MoreScreen() {
  const { colorScheme } = useColorScheme();
  const colors = useThemeColors();

  return (
    <SafeAreaView className="flex-1 bg-app-background dark:bg-app-dark-background">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[FONTS.titulo, { color: colors.text, marginBottom: SPACING.lg }]}>Mais</Text>

        <View style={{ gap: SPACING.sm }}>
          {MORE_MENU_ITEMS.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => router.push(item.href)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: RADII.field,
                padding: 14,
                opacity: pressed ? 0.85 : 1,
                minHeight: 48,
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: RADII.md,
                  backgroundColor: colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: SPACING.sm,
                }}
              >
                <Ionicons name={item.icon} size={22} color={colors.primaryDark} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[FONTS.corpoForte, { color: colors.text }]}>{item.label}</Text>
                {item.description ? (
                  <Text style={[FONTS.apoio, { color: colors.textSecondary, marginTop: 2 }]}>
                    {item.description}
                  </Text>
                ) : null}
              </View>

              <Ionicons name="chevron-forward" size={20} color={colors.iconMuted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
