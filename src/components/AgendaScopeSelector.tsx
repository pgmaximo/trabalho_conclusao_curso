// =============================================================================
// Arquivo: AgendaScopeSelector.tsx
// Descricao: Seletor de granularidade da Agenda (Dia/Semana/Mes/Ano)
// =============================================================================
//
// Padrao visual: chips selecionado/nao-selecionado de DESIGN_TOKENS.md §4 —
// nenhuma cor nova (regra 7 da constituicao).
//
// =============================================================================

import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { AgendaScope } from '@/services/agendaDateRange';

type AgendaScopeSelectorProps = {
  value: AgendaScope;
  onChange: (scope: AgendaScope) => void;
};

const OPTIONS: { value: AgendaScope; label: string }[] = [
  { value: 'dia', label: 'Dia' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: 'ano', label: 'Ano' },
];

export function AgendaScopeSelector({ value, onChange }: AgendaScopeSelectorProps) {
  return (
    <View className="mb-3 flex-row gap-2">
      {OPTIONS.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            className={`h-11 flex-1 items-center justify-center rounded-app border ${
              isSelected
                ? 'border-app-primary bg-app-primarySoft dark:border-app-dark-primary dark:bg-app-dark-primarySoft'
                : 'border-app-border bg-app-surface dark:border-app-dark-border dark:bg-app-dark-surface'
            }`}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <Text
              className={`text-[14px] font-semibold ${
                isSelected
                  ? 'text-app-primaryDark dark:text-app-dark-primaryDark'
                  : 'text-app-textSecondary dark:text-app-dark-textSecondary'
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
