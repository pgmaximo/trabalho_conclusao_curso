// =============================================================================
// Arquivo: (app)/prevention.tsx
// Descrição: Rota de recomendações preventivas (USPSTF) e lembretes
// Função: PreventionRoute
// =============================================================================

import React from 'react';
import { router } from 'expo-router';
import { PreventionScreen } from '@/screens/PreventionScreen';
import { usePreventionData } from '@/hooks/usePreventionData';

export default function PreventionRoute() {
  const {
    recommendations,
    lastUpdated,
    profileComplete,
    isLoading,
    errorMessage,
    retry,
    onToggleReminder,
    pendingReminderId,
  } = usePreventionData();

  return (
    <PreventionScreen
      recommendations={recommendations}
      lastUpdated={lastUpdated}
      profileComplete={profileComplete}
      isLoading={isLoading}
      errorMessage={errorMessage}
      onRetry={retry}
      onToggleReminder={onToggleReminder}
      onCompleteProfile={() => router.push('/profile-setup')}
      pendingReminderId={pendingReminderId}
    />
  );
}
