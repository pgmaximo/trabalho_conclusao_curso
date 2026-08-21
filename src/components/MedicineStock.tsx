// =============================================================================
// Arquivo: MedicineStock.tsx
// Descrição: Cartão de estoque de medicamento — quantidade, barra de progresso e,
// quando `status === 'low'`, borda âmbar + linha de alerta (Canvas 3d, card
// "Metformina 850mg").
// =============================================================================

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Card } from '@/components/Card';
import { useThemeColors } from '@/constants/theme';

interface MedicineStockProps {
  name: string;
  quantity: number;
  unit: string;
  status: 'ok' | 'low' | 'critical';
  percentage?: number;
  onPress?: () => void;
}

export function MedicineStock({ name, quantity, unit, status, percentage = 100, onPress }: MedicineStockProps) {
  const colors = useThemeColors();
  const isLow = status === 'low' || status === 'critical';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [pressed && onPress ? { opacity: 0.9 } : null]}
    >
      <Card
        padding="compact"
        style={{
          marginBottom: 10,
          borderColor: isLow ? colors.warningBadgeBorder : undefined,
          borderWidth: isLow ? 1.5 : undefined,
        }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-[17px] font-semibold text-app-text dark:text-app-dark-text">
            {name}
          </Text>
          <Text
            className="text-[16px] font-semibold"
            style={{ color: isLow ? colors.warning : colors.textSecondary }}
          >
            {quantity} {unit}
          </Text>
        </View>

        <View
          className="mt-3 overflow-hidden rounded-full"
          style={{ height: 8, backgroundColor: colors.progressTrack }}
        >
          <View
            style={{
              width: `${percentage}%`,
              height: '100%',
              backgroundColor: isLow ? colors.warning : colors.primary,
            }}
          />
        </View>

        {isLow ? (
          <View className="mt-3 flex-row items-center gap-2">
            <Ionicons color={colors.warning} name="alert-circle" size={16} />
            <Text className="text-[13px] font-semibold" style={{ color: colors.warning }}>
              Estoque baixo — hora de comprar mais
            </Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}
