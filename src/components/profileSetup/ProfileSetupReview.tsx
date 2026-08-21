import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { ProfileSetupFormValues } from '@/validation/forms_profile_setup';

type ProfileSetupReviewProps = {
  values: ProfileSetupFormValues;
  onEditStep: (step: 0 | 1 | 2) => void;
};

const answerLabels: Record<ProfileSetupFormValues['tobaccoUse'], string> = {
  yes: 'Sim',
  no: 'Não',
  unknown: 'Não informado',
};

const sexLabels: Record<ProfileSetupFormValues['biologicalSex'], string> = {
  '': 'Não informado',
  female: 'Feminino',
  male: 'Masculino',
  prefer_not_to_say: 'Outro',
};

function joinParts(parts: (string | null | undefined)[]) {
  const filtered = parts.filter((part): part is string => Boolean(part && part.trim().length > 0));

  return filtered.length > 0 ? filtered.join(' · ') : 'Nenhuma informação preenchida';
}

export function ProfileSetupReview({ values, onEditStep }: ProfileSetupReviewProps) {
  const personalSummary = joinParts([
    values.fullName || null,
    values.birthDate || null,
    sexLabels[values.biologicalSex],
    values.biologicalSex === 'female' ? answerLabels[values.pregnancyStatus] : null,
    values.heightCm ? `${values.heightCm}cm` : null,
    values.weightKg ? `${values.weightKg}kg` : null,
  ]);

  const clinicalSummary = joinParts([
    values.chronicConditions ? `Condições: ${values.chronicConditions}` : null,
    values.medications ? `Medicamentos: ${values.medications}` : null,
    values.allergies ? `Alergias: ${values.allergies}` : null,
  ]);

  const habitsSummary = joinParts([
    `Fuma: ${answerLabels[values.tobaccoUse]}`,
    `Vida sexual ativa: ${answerLabels[values.sexuallyActive]}`,
    `Atividade física: ${answerLabels[values.physicalActivity]}`,
    `Álcool: ${answerLabels[values.alcoholUse]}`,
  ]);

  const sections: { label: string; summary: string; step: 0 | 1 | 2 }[] = [
    { label: 'Pessoais', summary: personalSummary, step: 0 },
    { label: 'Clínico', summary: clinicalSummary, step: 1 },
    { label: 'Hábitos', summary: habitsSummary, step: 2 },
  ];

  return (
    <View className="mt-4 overflow-hidden rounded-[18px] border border-app-border bg-app-surfaceMuted dark:border-app-dark-border dark:bg-app-dark-surfaceMuted">
      {sections.map(({ label, summary, step }, index) => (
        <View
          className={[
            'gap-2 p-4',
            index < sections.length - 1 ? 'border-b border-app-border dark:border-app-dark-border' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          key={label}
        >
          <View className="flex-row items-start justify-between gap-3">
            <Text className="text-[13px] font-bold uppercase leading-[18px] text-app-textMuted dark:text-app-dark-textMuted">
              {label}
            </Text>
            <Pressable
              accessibilityLabel={`Editar ${label}`}
              accessibilityRole="button"
              onPress={() => onEditStep(step)}
              hitSlop={8}
            >
              <Text className="text-[15px] font-bold leading-[20px] text-app-secondary dark:text-app-dark-secondary">
                Editar
              </Text>
            </Pressable>
          </View>
          <Text className="text-[15px] font-semibold leading-[22px] text-app-text dark:text-app-dark-text">
            {summary}
          </Text>
        </View>
      ))}
    </View>
  );
}
