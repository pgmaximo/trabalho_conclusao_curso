/**
 * Resumo do arquivo:
 * Mock API de prevencao usada enquanto a integracao real de backend nao existe.
 * Simula o carregamento dos alertas preventivos exibidos na tela.
 */
import { PREVENTION_SNAPSHOT } from '@/mocks/prevention';

import { simulateRequest } from './requestSimulator';

export function getPreventionSnapshot() {
  return simulateRequest(PREVENTION_SNAPSHOT, {
    delayMs: 310,
    errorMessage: 'Nao foi possivel carregar os alertas preventivos.',
  });
}
