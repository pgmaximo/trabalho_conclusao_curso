// =============================================================================
// Arquivo: useAppointmentsData.ts
// Descrição: Hook de BUSCA de compromissos — sem recorte temporal
// Hook: useAppointmentsData
// =============================================================================
//
// Responsabilidade unica: buscar os Appointment do usuario (cache AsyncStorage
// primeiro, DynamoDB depois), mapear para AppointmentEntry e expor loading/erro/retry.
//
// O recorte temporal (lista continua ancorada em hoje, mes como camada) NAO
// vive aqui — vive em services/agendaTimeline.ts (achata a agenda em linhas
// ancoradas em hoje) e services/agendaDateRange.ts (aritmetica de data). Essa
// separacao e o conserto do defeito em que compromissos fora de hoje..hoje+6
// ficavam inalcancaveis (specs/02-perfil-home-agenda/agenda-navegacao-temporal/spec.md §2.1).
//
// Consumidores: src/app/(app)/appointments.tsx (Agenda) e
// src/app/(app)/dashboard.tsx (Home) — ambos usam so appointments/isLoading/
// errorMessage/retry.
//
// =============================================================================

import { useEffect, useMemo } from 'react';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { listAppointmentsForUser, type AppointmentRecord } from '@/services/appointmentService';
import { loadCachedAppointments, registerAppointmentsRefetchCallback, saveAppointmentsCache } from '@/hooks/appointmentsCache';
import { parseScheduledAt } from '@/services/agendaDateRange';
import type { AppointmentEntry } from '@/types/models';

function mapAppointmentToEntry(appointment: AppointmentRecord): AppointmentEntry {
  const scheduled = parseScheduledAt(appointment.scheduledAt);
  const displayTime = scheduled
    ? `${String(scheduled.getHours()).padStart(2, '0')}:${String(scheduled.getMinutes()).padStart(2, '0')}`
    : '--:--';

  return {
    id: appointment.id,
    time: displayTime,
    title: appointment.appointmentName,
    location: appointment.address ?? '',
    type: appointment.appointmentType.toLowerCase() as AppointmentEntry['type'],
    scheduledAt: appointment.scheduledAt,
    observations: appointment.observations ?? undefined,
  };
}

async function fetchAppointments(): Promise<AppointmentRecord[]> {
  const cached = await loadCachedAppointments<AppointmentRecord[]>();
  if (cached) {
    return cached;
  }

  const records = await listAppointmentsForUser();
  await saveAppointmentsCache(records);
  return records;
}

export function useAppointmentsData() {
  const { data, status, errorMessage, retry } = useAsyncResource(fetchAppointments);

  useEffect(() => {
    const unregister = registerAppointmentsRefetchCallback(() => {
      retry();
    });

    return unregister;
  }, [retry]);

  const appointments = useMemo(() => {
    const records = data ?? [];
    return records.map(mapAppointmentToEntry);
  }, [data]);

  return {
    appointments,
    isLoading: status === 'loading',
    errorMessage,
    retry,
  };
}
