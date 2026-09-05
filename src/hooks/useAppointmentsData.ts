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
// - Seleção de dia dentro de uma janela fixa de 7 dias (hoje + 6 seguintes)
// - Filtragem de consultas pelo dia selecionado
// - Estados de loading, error e success
// - Funcionalidade de retry para falhas
//
// Retorno:
// - dates: janela fixa de 7 dias (sempre selecionáveis, com indicador real de
//   "tem compromisso")
// - selectedDate: dia do mês selecionado atualmente
// - setSelectedDate: função para selecionar dia
// - selectedDayLabel: rótulo formatado do dia selecionado (ex. "Hoje, 20 de agosto")
// - appointments: TODAS as consultas do usuário (sem filtro de dia) — usado por
//   telas que precisam da lista completa (ex. Home/2b, "próximos compromissos")
// - appointmentsForSelectedDate: consultas filtradas pelo dia selecionado no
//   seletor de 7 dias — usado pela Agenda (2c)
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

const WEEKDAY_LONG_FORMATTER = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
const MONTH_LONG_FORMATTER = new Intl.DateTimeFormat('pt-BR', { month: 'long' });
const MONTH_SHORT_FORMATTER = new Intl.DateTimeFormat('pt-BR', { month: 'short' });

function mapAppointmentToEntry(appointment: AppointmentRecord): AppointmentEntry {
  const [, timePart] = appointment.scheduledAt.split('T');
  const displayTime = timePart ? timePart.slice(0, 5) : '00:00';

  return {
    id: appointment.id,
    // Canvas 2c mostra so a hora no card — a data completa fica no rotulo do dia
    // selecionado (ver selectedDayLabel abaixo), nao duplicada aqui.
    time: displayTime,
    title: appointment.appointmentName,
    location: appointment.address ?? '',
    type: appointment.appointmentType.toLowerCase() as AppointmentEntry['type'],
    scheduledAt: appointment.scheduledAt,
    observations: appointment.observations ?? undefined,
  };
}

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameCalendarDay(isoDate: string, reference: Date): boolean {
  return isSameDate(new Date(isoDate), reference);
}

// DECISION (specs/02-perfil-home-agenda/agenda/plan.md item 1, regra 8): janela
// rolante a partir de hoje (hoje + 6 dias seguintes), nao uma semana-calendario
// fixa — mais util (sempre mostra os proximos compromissos relevantes) e simples
// de testar independente do dia da semana em que o app e aberto.
function buildDateWindow(now: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + index);
    return date;
  });
}

function formatMonthAbbrev(date: Date): string {
  return MONTH_SHORT_FORMATTER.format(date).replace('.', '').toLowerCase();
}

function buildCalendarDates(appointments: AppointmentEntry[], window: Date[]): CalendarDateItem[] {
  return window.map((date) => ({
    day: date.getDate(),
    month: formatMonthAbbrev(date),
    hasAppointments: appointments.some((appointment) => isSameCalendarDay(appointment.scheduledAt, date)),
  }));
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatSelectedDayLabel(selected: Date, today: Date): string {
  const dayMonth = `${selected.getDate()} de ${MONTH_LONG_FORMATTER.format(selected)}`;

  if (isSameDate(selected, today)) {
    return `Hoje, ${dayMonth}`;
  }

  return capitalize(`${WEEKDAY_LONG_FORMATTER.format(selected)}, ${dayMonth}`);
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

  // Janela de 7 dias calculada uma vez por montagem do hook (nao recalculada a
  // cada render) — evita que a lista de dias "escorregue" enquanto a tela esta
  // aberta perto da meia-noite.
  const dateWindow = useMemo(() => buildDateWindow(new Date()), []);

  const dates = useMemo(
    () => buildCalendarDates(appointments, dateWindow),
    [appointments, dateWindow],
  );

  const selectedWindowDate = useMemo(
    () => dateWindow.find((date) => date.getDate() === selectedDate) ?? dateWindow[0],
    [dateWindow, selectedDate],
  );

  const appointmentsForSelectedDate = useMemo(
    () => appointments.filter((appointment) => isSameCalendarDay(appointment.scheduledAt, selectedWindowDate)),
    [appointments, selectedWindowDate],
  );

  const selectedDayLabel = useMemo(
    () => formatSelectedDayLabel(selectedWindowDate, dateWindow[0]),
    [selectedWindowDate, dateWindow],
  );

  return {
    dates,
    selectedDate,
    setSelectedDate,
    selectedDayLabel,
    appointments,
    appointmentsForSelectedDate,
    isLoading: status === 'loading',
    errorMessage,
    retry,
  };
}
