// =============================================================================
// Arquivo: (app)/appointments.tsx
// Descrição: Rota da Agenda — calendário, compromissos do dia e sincronização.
// =============================================================================

import React, { useEffect } from 'react';
import { AgendaScreen } from '@/screens/AgendaScreen';
import { useAgendaNavigation } from '@/hooks/useAgendaNavigation';
import { useAppointmentsData } from '@/hooks/useAppointmentsData';
import { listAppointmentsForUser } from '@/services/appointmentService';
import { restoreAppointmentReminders } from '@/services/appointmentNotifications';

export default function AppointmentsRoute() {
  const { appointments, isLoading, errorMessage, retry } = useAppointmentsData();
  const navigation = useAgendaNavigation();

  useEffect(() => {
    void (async () => {
      const records = await listAppointmentsForUser();
      await restoreAppointmentReminders(records);
    })();
  }, []);

  return (
    <AgendaScreen
      appointments={appointments}
      errorMessage={errorMessage}
      isLoading={isLoading}
      navigation={navigation}
      onRetry={retry}
    />
  );
}
