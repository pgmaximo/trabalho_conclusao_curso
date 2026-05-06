/**
 * Resumo do arquivo:
 * Mock API de consultas usada enquanto a integracao real de backend nao existe.
 * Mantem carregamento assincrono e filtragem por dia para as telas de agenda.
 */
import { APPOINTMENTS_SNAPSHOT } from '@/mocks/appointments';

import { simulateRequest } from './requestSimulator';

export function getAppointmentsSnapshot() {
  return simulateRequest(APPOINTMENTS_SNAPSHOT, {
    delayMs: 300,
    errorMessage: 'Nao foi possivel carregar a agenda de consultas.',
  });
}

export function getAppointmentsForDay(
  selectedDate: number,
  appointmentsByDay: typeof APPOINTMENTS_SNAPSHOT.appointmentsByDay,
) {
  return appointmentsByDay[selectedDate] ?? [];
}
