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
  const [pendingReminderIds, setPendingReminderIds] = useState<Set<number>>(new Set());

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
    if (pendingReminderIds.has(recommendationId)) {
      return;
    }

    const target = recommendations.find((rec) => rec.id === recommendationId);
    if (!target) {
      return;
    }

    setPendingReminderIds((current) => new Set(current).add(recommendationId));

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
      setPendingReminderIds((current) => {
        const next = new Set(current);
        next.delete(recommendationId);
        return next;
      });
    }
  }

  /**
   * Ativa lembretes para todas as recomendacoes informadas que ainda estao
   * desligadas (usado pelo botao "ativar todos os filtrados"). Pede permissao
   * uma unica vez e persiste o mapa de lembretes uma unica vez ao final.
   */
  async function onEnableRemindersForIds(recommendationIds: number[]) {
    const targets = recommendations.filter(
      (rec) =>
        recommendationIds.includes(rec.id) &&
        !rec.isReminderOn &&
        !pendingReminderIds.has(rec.id),
    );

    if (targets.length === 0) {
      return;
    }

    const granted = await ensureNotificationPermission();
    if (!granted) {
      return;
    }

    setPendingReminderIds((current) => {
      const next = new Set(current);
      targets.forEach((rec) => next.add(rec.id));
      return next;
    });

    try {
      const reminderMap = await loadReminderMap();

      for (const target of targets) {
        const key = String(target.id);
        reminderMap[key] = await scheduleRecommendationReminder({
          id: key,
          title: target.title,
        });
      }

      await saveReminderMap(reminderMap);

      const enabledIds = new Set(targets.map((rec) => rec.id));
      setRecommendations((current) =>
        current.map((rec) => (enabledIds.has(rec.id) ? { ...rec, isReminderOn: true } : rec)),
      );
    } finally {
      setPendingReminderIds((current) => {
        const next = new Set(current);
        targets.forEach((rec) => next.delete(rec.id));
        return next;
      });
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
    onEnableRemindersForIds,
    pendingReminderIds,
  };
}
