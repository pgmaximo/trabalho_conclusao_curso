/**
 * Resumo do arquivo:
 * Uma coleta na lista da tela de serie.
 *
 * Mostra a faixa do laboratorio DAQUELA coleta e nao a compara com o valor.
 * "Dentro da faixa" e "acima do limite" sao leitura clinica, e a regra 4 as
 * proibe. A pessoa ve os dois numeros e leva a duvida a uma consulta.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/constants/theme';
import type { SeriesPoint } from '@/services/analyteSeries';
import { formatarDecimal, formatarFaixa } from '@/utils/decimalDisplay';

export interface AnalyteCollectionRowProps {
  point: SeriesPoint;
  unit: string;
}

function dataLonga(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : iso;
}

export function AnalyteCollectionRow({ point, unit }: AnalyteCollectionRowProps) {
  const colors = useThemeColors();
  const faixa = formatarFaixa(point.referenceLow, point.referenceHigh);

  // So mostra o papel quando ele DIFERE do valor exibido -- repetir o mesmo
  // numero duas vezes e ruido, e ruido faz a pessoa parar de ler a linha que
  // as vezes importa.
  const papelDifere =
    formatarDecimal(point.value) !== point.rawValue.trim() || (point.rawUnit ?? unit) !== unit;

  return (
    <View className="mt-3 border-t border-app-border pt-3 dark:border-app-dark-border">
      <View className="flex-row items-baseline justify-between gap-3">
        <Text className="text-[14px] text-app-textSecondary dark:text-app-dark-textSecondary">
          {dataLonga(point.collectedAt)}
        </Text>
        <Text className="text-[16px] font-semibold text-app-text dark:text-app-dark-text">
          {formatarDecimal(point.value)} {unit}
        </Text>
      </View>

      <Text className="mt-1 text-[12px] text-app-textSecondary dark:text-app-dark-textSecondary">
        {faixa
          ? `Referência deste laboratório: ${faixa} ${unit}`
          : 'Este laboratório não informou faixa de referência.'}
      </Text>

      {papelDifere ? (
        <Text className="mt-1 text-[12px] text-app-textSecondary dark:text-app-dark-textSecondary">
          No documento está escrito {point.rawValue}
          {point.rawUnit ? ` ${point.rawUnit}` : ''}.
        </Text>
      ) : null}

      <Pressable
        accessibilityLabel={`Abrir o documento de ${dataLonga(point.collectedAt)}`}
        accessibilityRole="button"
        className="mt-2 flex-row items-center gap-1"
        onPress={() => router.push(`/document-detail?id=${point.documentId}`)}
      >
        <Ionicons color={colors.primary} name="document-text-outline" size={14} />
        <Text className="text-[12px] font-semibold" style={{ color: colors.primary }}>
          Ver documento de origem
        </Text>
      </Pressable>
    </View>
  );
}
