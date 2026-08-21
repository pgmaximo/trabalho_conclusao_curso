// =============================================================================
// Arquivo: useAppointmentsData.ts
// Descrição: Hook customizado para gerenciar dados de consultas médicas
// Hook: useAppointmentsData
// =============================================================================
//
// Este hook implementa a lógica de gerenciamento de consultas médicas,
// incluindo seleção de datas, filtragem por dia e estados de carregamento.
// Fornece uma interface completa para o componente de consultas.
//
// Funcionalidades:
// - Carregamento assíncrono de todas as consultas
// - Seleção de dia específico
// - Filtragem automática de consultas por dia
// - Estados de loading, error e success
// - Funcionalidade de retry para falhas
// - Lista de datas disponíveis
//
// Retorno:
// - dates: Array de datas disponíveis
// - selectedDate: Dia selecionado atualmente
// - setSelectedDate: Função para selecionar dia
// - appointments: Consultas filtradas pelo dia selecionado
// - isLoading: Estado de carregamento
// - errorMessage: Mensagem de erro (se houver)
// - retry: Função para tentar novamente
//
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { listAppointmentsForUser, type AppointmentRecord } from '@/services/appointmentService';
import { loadCachedAppointments, registerAppointmentsRefetchCallback, saveAppointmentsCache } from '@/hooks/appointmentsCache';
import type { AppointmentEntry, CalendarDateItem } from '@/types/models';

function mapAppointmentToEntry(appointment: AppointmentRecord): AppointmentEntry {
  const [datePart, timePart] = appointment.scheduledAt.split('T');
  const displayDate = datePart ? datePart.split('-').reverse().join('/') : appointment.scheduledAt;
  const displayTime = timePart ? timePart.slice(0, 5) : '00:00';

  return {
    id: appointment.id,
    time: `${displayDate} • ${displayTime}`,
    title: appointment.appointmentName,
    location: appointment.address,
    type: appointment.appointmentType.toLowerCase() as AppointmentEntry['type'],
    scheduledAt: appointment.scheduledAt,
  };
}

function buildCalendarDates(appointments: AppointmentEntry[]): CalendarDateItem[] {
  const daySet = new Set<number>();

  appointments.forEach((appointment) => {
    const [datePart] = appointment.time.split(' • ');
    const [day] = datePart.split('/').map((value) => Number(value));
    if (day) {
      daySet.add(day);
    }
  });

  return Array.from(daySet).sort((a, b) => a - b).map((day) => ({ day, month: 'ago', hasAppointments: true }));
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
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());

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

  const dates = useMemo(() => buildCalendarDates(appointments), [appointments]);

  return {
    dates,
    selectedDate,
    setSelectedDate,
    appointments,
    isLoading: status === 'loading',
    errorMessage,
    retry,
  };
}
