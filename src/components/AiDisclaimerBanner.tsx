// =============================================================================
// Arquivo: AiDisclaimerBanner.tsx
// Descrição: Banner fixo "Apoio informativo — não substitui avaliação
// médica." — extraído de ChatBotScreen.tsx (era inline) para ser reaproveitado
// por toda superfície de IA do app (regra 4 da constituição: qualquer tela
// com análise por IA precisa deste aviso). Reaproveitado agora pelo
// dashboard de insights de wearables (HealthDashboardScreen).
// =============================================================================

import React from 'react';
import { Text, View } from 'react-native';

export function AiDisclaimerBanner() {
  return (
    <View className="mb-4 flex-row items-start gap-3 rounded-app border border-app-infoBadgeBorder bg-app-infoSoft px-4 py-3 dark:border-app-dark-infoBadgeBorder dark:bg-app-dark-infoSoft">
      <View className="size-6 items-center justify-center rounded-full bg-app-infoIconBg dark:bg-app-dark-infoIconBg">
        <Text className="text-[13px] font-bold text-white">i</Text>
      </View>
      <Text className="flex-1 text-[15px] leading-[20px] text-app-info dark:text-app-dark-info">
        Apoio informativo — não substitui avaliação médica.
      </Text>
    </View>
  );
}
