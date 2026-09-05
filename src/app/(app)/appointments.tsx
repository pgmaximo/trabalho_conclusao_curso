// =============================================================================
// Arquivo: (app)/appointments.tsx
// Descrição: Rota da Agenda — calendário, compromissos do dia e sincronização.
// =============================================================================

import React, { useEffect } from 'react';
import { AgendaScreen } from '@/screens/AgendaScreen';
import { useAppointmentsData } from '@/hooks/useAppointmentsData';
import { listAppointmentsForUser } from '@/services/appointmentService';
import { restoreAppointmentReminders } from '@/services/appointmentNotifications';

export default function AppointmentsRoute() {
  const appointments = useAppointmentsData();

  useEffect(() => {
    void (async () => {
      const records = await listAppointmentsForUser();
      await restoreAppointmentReminders(records);
    })();
  }, []);

  return (
    <AgendaScreen
      dates={appointments.dates}
      selectedDate={appointments.selectedDate}
      selectedDayLabel={appointments.selectedDayLabel}
      appointments={appointments.appointmentsForSelectedDate}
      isLoading={appointments.isLoading}
      errorMessage={appointments.errorMessage}
      onRetry={appointments.retry}
      onDateSelect={appointments.setSelectedDate}
    />
  );
}
