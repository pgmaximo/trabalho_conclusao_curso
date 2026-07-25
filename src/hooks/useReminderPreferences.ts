import { useEffect, useState } from 'react';

import {
  DEFAULT_REMINDER_LEAD_DAYS,
  loadReminderLeadDays,
  saveReminderLeadDays,
} from '@/services/reminderService';

export function useReminderPreferences() {
  const [reminderLeadDays, setReminderLeadDaysState] = useState(DEFAULT_REMINDER_LEAD_DAYS);

  useEffect(() => {
    let isMounted = true;

    loadReminderLeadDays().then((days) => {
      if (isMounted) {
        setReminderLeadDaysState(days);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  function setReminderLeadDays(days: number) {
    setReminderLeadDaysState(days);
    saveReminderLeadDays(days).catch(() => {});
  }

  return { reminderLeadDays, setReminderLeadDays };
}
