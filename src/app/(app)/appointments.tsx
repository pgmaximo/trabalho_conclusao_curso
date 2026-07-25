// =============================================================================
// Arquivo: (app)/appointments.tsx
// Descrição: Rota da Agenda — calendário, compromissos do dia e sincronização.
// =============================================================================

import React from 'react';
import { AgendaScreen } from '@/screens/AgendaScreen';
import { useAppointmentsData } from '@/hooks/useAppointmentsData';

export default function AppointmentsRoute() {
  const appointments = useAppointmentsData();

  return (
    <AgendaScreen
      dates={appointments.dates}
      selectedDate={appointments.selectedDate}
      appointments={appointments.appointments}
      isLoading={appointments.isLoading}
      errorMessage={appointments.errorMessage}
      onRetry={appointments.retry}
      onDateSelect={appointments.setSelectedDate}
    />
  );
}
