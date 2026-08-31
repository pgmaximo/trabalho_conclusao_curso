// =============================================================================
// Arquivo: AppointmentCard.tsx
// Descrição: Componente de cartão para exibir consultas médicas agendadas
// Componente: AppointmentCard
// =============================================================================
//
// Cartão para exibir compromissos de saúde agendados com cores diferenciadas
// por tipo, borda lateral colorida e suporte a interação por toque. Usado na
// tela de Agenda (2c).
//
// Paleta por tipo (specs/02-perfil-home-agenda/agenda/plan.md item 4 — fonte
// canônica, reaproveitada por HomeScreen.tsx/2b): consulta -> secundário/azul,
// exame -> warning/âmbar, cirurgia -> primário/verde. Nenhuma cor nova, os 3
// pares já existem em DESIGN_TOKENS.md e são reativos a dark mode.
//
// =============================================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { useThemeColors, type ThemeColors } from '@/constants/theme';
import type { AppointmentType } from '@/types/models';

interface AppointmentCardProps {
  time: string;                           // Horário da consulta
  title: string;                          // Título/descrição da consulta
  location: string;                       // Local da consulta
  type: AppointmentType;                  // Tipo do compromisso
  onPress?: () => void;                   // Callback ao pressionar o cartão
}

function getTypeTone(colors: ThemeColors, type: AppointmentType) {
  switch (type) {
    case 'consulta':
      return { accent: colors.secondary, badgeBg: colors.secondarySoft, badgeText: colors.info, label: 'Consulta' };
    case 'exame':
      return { accent: colors.warning, badgeBg: colors.warningSoft, badgeText: colors.warning, label: 'Exame' };
    case 'cirurgia':
      return { accent: colors.primary, badgeBg: colors.primarySoft, badgeText: colors.primaryDark, label: 'Cirurgia' };
    default:
      return { accent: colors.primary, badgeBg: colors.primarySoft, badgeText: colors.primaryDark, label: '' };
  }
}

export function AppointmentCard({ time, title, location, type, onPress }: AppointmentCardProps) {
  const colors = useThemeColors();
  const tone = getTypeTone(colors, type);
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Pressable
      // `style` NÃO pode ser função aqui — sem `className`, o NativeWind (jsxImportSource
      // global) descarta o resultado da função e o Pressable renderiza sem nenhum estilo.
      style={[styles.container, { backgroundColor: colors.surface }, isPressed && styles.pressed]}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      onPress={onPress}
    >
      <View style={[styles.leftBorder, { backgroundColor: tone.accent }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.time, { color: colors.textSecondary }]}>{time}</Text>
          <View style={[styles.typeBadge, { backgroundColor: tone.badgeBg }]}>
            <Text style={[styles.typeLabel, { color: tone.badgeText }]}>{tone.label}</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.location, { color: colors.textSecondary }]}>{location}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
  leftBorder: {
    width: 3,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  time: {
    fontSize: 18,
    fontWeight: '700',
  },
  typeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  location: {
    fontSize: 16,
  },
});
