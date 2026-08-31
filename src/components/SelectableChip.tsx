import React from 'react';
import { Pressable, Text } from 'react-native';

type SelectableChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

/**
 * Chip de seleção única/múltipla reutilizável — usado pelos 5 grupos de seleção de
 * `AddMedicineScreen`/`EditMedicineScreen` (forma, frequência, dias da semana, unidade,
 * ativo/inativo), evitando duplicar o mesmo estilo inline em cada grupo.
 */
export function SelectableChip({ label, selected, onPress }: SelectableChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={[
        'items-center justify-center rounded-app border px-4 py-3',
        selected
          ? 'border-app-primary bg-app-primary dark:border-app-dark-primary dark:bg-app-dark-primary'
          : 'border-app-border bg-app-surface dark:border-app-dark-border dark:bg-app-dark-surface',
      ].join(' ')}
    >
      <Text
        className={[
          'text-[14px] font-semibold',
          selected
            ? 'text-app-onPrimary dark:text-app-dark-onPrimary'
            : 'text-app-textSecondary dark:text-app-dark-textSecondary',
        ].join(' ')}
      >
        {label}
      </Text>
    </Pressable>
  );
}
