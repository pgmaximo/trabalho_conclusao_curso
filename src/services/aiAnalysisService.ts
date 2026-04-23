import { AI_ANALYSIS_SNAPSHOT } from '@/mocks/aiAnalysis';
import { simulateRequest } from '@/services/requestSimulator';

export function getAIAnalysisSnapshot() {
  return simulateRequest(AI_ANALYSIS_SNAPSHOT, {
    delayMs: 260,
    errorMessage: 'Nao foi possivel carregar a analise atual.',
  });
}
