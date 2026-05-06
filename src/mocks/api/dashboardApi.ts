/**
 * Resumo do arquivo:
 * Mock API do dashboard usada enquanto a integracao real de backend nao existe.
 * Simula uma chamada assíncrona para preservar estados de loading e erro na UI.
 */
import { DASHBOARD_SNAPSHOT } from '@/mocks/dashboard';

import { simulateRequest } from './requestSimulator';

export function getDashboardSnapshot() {
  return simulateRequest(DASHBOARD_SNAPSHOT, {
    delayMs: 280,
    errorMessage: 'Nao foi possivel carregar o resumo do dashboard.',
  });
}

export function getDashboardTodayLabel(date = new Date()) {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
