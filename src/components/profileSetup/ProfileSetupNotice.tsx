import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text, View } from 'react-native';

// Textos exatos do Canvas 2a (regra 4 da constituicao — copy de consentimento
// LGPD explicita, uma por etapa sensivel, nunca um aviso generico reaproveitado).
export const CLINICAL_STEP_NOTICE_TEXT =
  'Suas informações clínicas são sigilosas e usadas só para orientações personalizadas, conforme a LGPD.';
export const HABITS_STEP_NOTICE_TEXT =
  'Essas respostas são opcionais e protegidas pela LGPD. Responda com o que preferir.';
export const REVIEW_STEP_CONFIRMATION_TEXT =
  'Isso nos ajuda a te dar alertas de prevenção mais precisos.';

type LgpdNoticeProps = {
  text: string;
  tone?: 'info' | 'success';
};

export function LgpdNotice({ text, tone = 'info' }: LgpdNoticeProps) {
  const isSuccess = tone === 'success';

  return (
    <View
      className={
        isSuccess
          ? 'flex-row items-start gap-3 rounded-2xl border border-app-successBadgeBorder bg-app-successSoft p-4 dark:border-app-dark-successBadgeBorder dark:bg-app-dark-successSoft'
          : 'flex-row items-start gap-3 rounded-2xl border border-app-infoBadgeBorder bg-app-infoSoft p-4 dark:border-app-dark-infoBadgeBorder dark:bg-app-dark-infoSoft'
      }
    >
      <Ionicons
        color={isSuccess ? '#0C6341' : '#1B63C4'}
        name={isSuccess ? 'checkmark-circle' : 'shield-checkmark-outline'}
        size={22}
      />
      <Text
        className={
          isSuccess
            ? 'flex-1 text-[13px] leading-[19px] text-app-success dark:text-app-dark-success'
            : 'flex-1 text-[13px] leading-[19px] text-app-info dark:text-app-dark-info'
        }
      >
        {text}
      </Text>
    </View>
  );
}
