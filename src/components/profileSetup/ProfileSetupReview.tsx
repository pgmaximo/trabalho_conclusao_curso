import React from 'react';
import { Text, View } from 'react-native';

import type { ProfileSetupFormValues } from '@/validation/forms_profile_setup';

type ProfileSetupReviewProps = {
  values: ProfileSetupFormValues;
};

const answerLabels = {
  yes: 'Sim',
  no: 'Nao',
  unknown: 'Nao informado',
};

const sexLabels = {
  '': 'Não informado',
  female: 'Feminino',
  male: 'Masculino',
  prefer_not_to_say: 'Desejo nao informar',
};

export function ProfileSetupReview({ values }: ProfileSetupReviewProps) {
  const rows = [
    ['Data de nascimento', values.birthDate],
    ['Sexo biologico', sexLabels[values.biologicalSex]],
    ['Gravidez atual', answerLabels[values.pregnancyStatus]],
    ['Tabagismo', answerLabels[values.tobaccoUse]],
    ['Atividade sexual', answerLabels[values.sexuallyActive]],
    ['Atividade fisica', answerLabels[values.physicalActivity]],
  ];

  return (
    <View className="mt-4 overflow-hidden rounded-[18px] border border-app-border bg-app-surfaceMuted dark:border-app-dark-border dark:bg-app-dark-surfaceMuted">
      {rows.map(([label, value], index) => (
        <View
          className={[
            'gap-2 p-4',
            index < rows.length - 1 ? 'border-b border-app-border dark:border-app-dark-border' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          key={label}
        >
          <Text className="text-[13px] font-bold uppercase leading-[18px] text-app-textMuted dark:text-app-dark-textMuted">
            {label}
          </Text>
          <Text className="text-[15px] font-semibold leading-[22px] text-app-text dark:text-app-dark-text">
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}
