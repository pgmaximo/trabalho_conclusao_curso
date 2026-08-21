// =============================================================================
// Arquivo: MedicineCard.tsx
// Descrição: Cartão de dose de medicamento — nome/dosagem/horário, botão circular
// de toggle Tomado/Pendente e badge de status (Canvas 3d).
// =============================================================================

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { useThemeColors } from '@/constants/theme';

interface MedicineCardProps {
  name: string;
  dosage: string;
  time: string;
  status: 'pending' | 'taken' | 'missed';
  onPress?: () => void;
  onToggle?: () => void;
}

const STATUS_CONFIG = {
  pending: { badgeVariant: 'neutral' as const, label: 'Pendente', icon: 'ellipse-outline' as const },
  taken: { badgeVariant: 'success' as const, label: 'Tomado', icon: 'checkmark' as const },
  missed: { badgeVariant: 'danger' as const, label: 'Perdido', icon: 'alert' as const },
};

export function MedicineCard({ name, dosage, time, status, onPress, onToggle }: MedicineCardProps) {
  const colors = useThemeColors();
  const config = STATUS_CONFIG[status];
  const toggleColor = status === 'taken' ? colors.success : status === 'missed' ? colors.danger : colors.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [pressed && onPress ? { opacity: 0.9 } : null]}
    >
      <Card padding="compact" style={{ marginBottom: 10 }}>
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="text-[17px] font-semibold text-app-text dark:text-app-dark-text">
              {name}
            </Text>
            <Text className="mt-1 text-[15px] text-app-textSecondary dark:text-app-dark-textSecondary">
              {dosage}
            </Text>
            <Text className="mt-1 text-[13px] text-app-textMuted dark:text-app-dark-textMuted">
              {time}
            </Text>
          </View>

          <Pressable
            accessibilityLabel={status === 'taken' ? 'Marcar como pendente' : 'Marcar como tomado'}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onToggle}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              borderWidth: 2,
              borderColor: toggleColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons color={toggleColor} name={config.icon} size={20} />
          </Pressable>
        </View>

        <View className="mt-3 items-end">
          <Badge label={config.label} variant={config.badgeVariant} />
        </View>
      </Card>
    </Pressable>
  );
}
