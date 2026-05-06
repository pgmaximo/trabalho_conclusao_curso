/**
 * Resumo do arquivo:
 * Mock API de analise por IA usada enquanto a integracao real de backend nao existe.
 * Simula carregamento assincrono para preservar estados de loading e erro na UI.
 */
import { AI_ANALYSIS_SNAPSHOT } from '@/mocks/aiAnalysis';

import { simulateRequest } from './requestSimulator';

export function getAIAnalysisSnapshot() {
  return simulateRequest(AI_ANALYSIS_SNAPSHOT, {
    delayMs: 260,
    errorMessage: 'Nao foi possivel carregar a analise atual.',
  });
}
