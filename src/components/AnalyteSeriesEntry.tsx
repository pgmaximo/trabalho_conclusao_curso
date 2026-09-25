/**
 * Resumo do arquivo:
 * A SEGUNDA porta da tela de evolucao por analito.
 *
 * A primeira -- abrir um documento e tocar numa linha de resultado -- so e
 * encontrada por quem ja sabe que aquela linha e tocavel, e isso deixava a
 * EPIC inteira invisivel para quem nao sabia.
 *
 * Ela leva a rota SEM codigo de analito. A tela abre no resultado com mais
 * historico e mostra o seletor, que existe justamente para esta entrada.
 *
 * REGRA DE COPY: "Evolucao" diz o que a tela mostra, e nada sobre o que os
 * numeros significam. "Ver se melhorou" seria interpretacao clinica na propria
 * porta de entrada, antes mesmo de a tela abrir.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, Text } from 'react-native';

import { useThemeColors } from '@/constants/theme';

export function AnalyteSeriesEntry() {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityLabel="Ver a evolução dos seus resultados"
      accessibilityRole="button"
      className="h-12 flex-row items-center gap-2 rounded-field border border-app-border px-3 dark:border-app-dark-border"
      style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
      onPress={() => router.push('/analyte-series')}
    >
      <Ionicons name="trending-up-outline" size={18} color={colors.iconMuted} />
      <Text className="text-[14px] text-app-text dark:text-app-dark-text">Evolução</Text>
    </Pressable>
  );
}
