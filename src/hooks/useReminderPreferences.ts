import { useEffect, useState } from 'react';

import {
  DEFAULT_REMINDER_INTERVALS_BY_GRADE,
  loadReminderIntervalsByGrade,
  saveReminderIntervalForGrade,
  type ReminderIntervalsByGrade,
} from '@/services/reminderService';
import type { UspstfGrade } from '@/types/models';

export function useReminderPreferences() {
  const [reminderIntervals, setReminderIntervals] = useState<ReminderIntervalsByGrade>(
    DEFAULT_REMINDER_INTERVALS_BY_GRADE,
  );

  useEffect(() => {
    let isMounted = true;

    loadReminderIntervalsByGrade().then((intervals) => {
      if (isMounted) {
        setReminderIntervals(intervals);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  function setReminderIntervalForGrade(grade: UspstfGrade, days: number) {
    setReminderIntervals((current) => ({ ...current, [grade]: days }));
    saveReminderIntervalForGrade(grade, days).catch(() => {});
  }

  return { reminderIntervals, setReminderIntervalForGrade };
}
