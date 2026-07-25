import React from 'react';
import { Text, View } from 'react-native';

export const PROFILE_SETUP_NOTICE_TEXT =
  'Nao preencher algumas informacoes pode reduzir a precisao dos aconselhamentos, exames preventivos e recomendacoes futuras.';

export function ProfileSetupNotice() {
  return (
    <View className="flex-row items-start gap-3 rounded-[18px] border border-app-accentSoft bg-app-warningSoft p-4 dark:border-app-dark-accentSoft dark:bg-app-dark-warningSoft">
      <Text className="text-[15px] font-extrabold leading-[22px] text-app-accent dark:text-app-dark-accent">
        !
      </Text>
      <Text className="flex-1 text-[13px] leading-[18px] text-app-textSecondary dark:text-app-dark-textSecondary">
        {PROFILE_SETUP_NOTICE_TEXT}
      </Text>
    </View>
  );
}
