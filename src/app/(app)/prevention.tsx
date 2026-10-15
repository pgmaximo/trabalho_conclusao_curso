import React from 'react';
import { router } from 'expo-router';

import { PreventionScreen } from '@/screens/PreventionScreen';
import { usePreventionData } from '@/hooks/usePreventionData';
import { goBackOr } from '@/utils/goBack';

export default function PreventionRoute() {
  const {
    recommendations,
    lastUpdated,
    profileComplete,
    isLoading,
    errorMessage,
    retry,
    onToggleReminder,
    onEnableRemindersForIds,
    pendingReminderIds,
    activeCampaignMessage,
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
      onEnableRemindersForIds={onEnableRemindersForIds}
      onCompleteProfile={() => router.push('/edit-profile')}
      onBack={() => goBackOr('/more')}
      pendingReminderIds={pendingReminderIds}
      activeCampaignMessage={activeCampaignMessage}
    />
  );
}
