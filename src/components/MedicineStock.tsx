// =============================================================================
// Arquivo: MedicineStock.tsx
// Descrição: Cartão de estoque de medicamento — quantidade, barra de progresso e,
// quando `status === 'low'`, borda âmbar + linha de alerta (Canvas 3d, card
// "Metformina 850mg").
// =============================================================================

import React, { useState } from 'react';
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
  const isCritical = status === 'critical';
  const isLow = status === 'low' || isCritical;
  const alertColor = isCritical ? colors.danger : colors.warning;
  const alertBorderColor = isCritical ? colors.dangerBadgeBorder : colors.warningBadgeBorder;
  const alertMessage = isCritical ? 'Estoque esgotado — compre mais o quanto antes' : 'Estoque baixo — hora de comprar mais';
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      // `style` NÃO pode ser função aqui — sem `className`, o NativeWind (jsxImportSource
      // global) descarta o resultado da função e o Pressable renderiza sem nenhum estilo.
      style={isPressed && onPress ? { opacity: 0.9 } : null}
    >
      <Card
        padding="compact"
        style={{
          marginBottom: 10,
          borderColor: isLow ? alertBorderColor : undefined,
          borderWidth: isLow ? 1.5 : undefined,
        }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-[17px] font-semibold text-app-text dark:text-app-dark-text">
            {name}
          </Text>
          <Text
            className="text-[16px] font-semibold"
            style={{ color: isLow ? alertColor : colors.textSecondary }}
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
              backgroundColor: isLow ? alertColor : colors.primary,
            }}
          />
        </View>

        {isLow ? (
          <View className="mt-3 flex-row items-center gap-2">
            <Ionicons color={alertColor} name="alert-circle" size={16} />
            <Text className="text-[13px] font-semibold" style={{ color: alertColor }}>
              {alertMessage}
            </Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}
