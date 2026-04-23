import { PREVENTION_SNAPSHOT } from '@/mocks/prevention';
import { simulateRequest } from '@/services/requestSimulator';

export function getPreventionSnapshot() {
  return simulateRequest(PREVENTION_SNAPSHOT, {
    delayMs: 310,
    errorMessage: 'Nao foi possivel carregar os alertas preventivos.',
  });
}
