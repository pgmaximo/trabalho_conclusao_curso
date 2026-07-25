import { useEffect, useState } from 'react';

import { useAsyncResource } from '@/hooks/useAsyncResource';
import { getPreventionRecommendations } from '@/services/preventionService';
import {
  cancelRecommendationReminder,
  ensureNotificationPermission,
  loadReminderMap,
  saveReminderMap,
  scheduleRecommendationReminder,
} from '@/services/reminderService';
import type { RecommendationView } from '@/types/models';

export function usePreventionData() {
  const { data, status, errorMessage, retry } = useAsyncResource(getPreventionRecommendations);
  const [recommendations, setRecommendations] = useState<RecommendationView[]>([]);
  const [pendingReminderId, setPendingReminderId] = useState<number | null>(null);

  useEffect(() => {
    if (!data) {
      return;
    }

    let isMounted = true;

    loadReminderMap().then((reminderMap) => {
      if (!isMounted) {
        return;
      }

      setRecommendations(
        data.recommendations.map((recommendation) => ({
          ...recommendation,
          isReminderOn: Boolean(reminderMap[String(recommendation.id)]),
        })),
      );
    });

    return () => {
      isMounted = false;
    };
  }, [data]);

  async function onToggleReminder(recommendationId: number) {
    if (pendingReminderId !== null) {
      return;
    }

    const target = recommendations.find((rec) => rec.id === recommendationId);
    if (!target) {
      return;
    }

    setPendingReminderId(recommendationId);

    try {
      const reminderMap = await loadReminderMap();
      const key = String(recommendationId);

      if (target.isReminderOn) {
        const notificationId = reminderMap[key];
        if (notificationId) {
          await cancelRecommendationReminder(notificationId);
        }
        delete reminderMap[key];
      } else {
        const granted = await ensureNotificationPermission();
        if (!granted) {
          return;
        }

        reminderMap[key] = await scheduleRecommendationReminder({
          id: key,
          title: target.title,
        });
      }

      await saveReminderMap(reminderMap);
      setRecommendations((current) =>
        current.map((rec) =>
          rec.id === recommendationId ? { ...rec, isReminderOn: !rec.isReminderOn } : rec,
        ),
      );
    } finally {
      setPendingReminderId(null);
    }
  }

  return {
    recommendations,
    lastUpdated: data?.lastUpdated ?? '',
    profileComplete: data?.profileComplete ?? false,
    isLoading: status === 'loading',
    errorMessage,
    retry,
    onToggleReminder,
    pendingReminderId,
  };
}
