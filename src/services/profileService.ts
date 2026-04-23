import { USER_PROFILE_SNAPSHOT } from '@/mocks/profile';
import { simulateRequest } from '@/services/requestSimulator';

export function getUserProfileSnapshot() {
  return simulateRequest(USER_PROFILE_SNAPSHOT, {
    delayMs: 290,
    errorMessage: 'Nao foi possivel carregar o perfil do usuario.',
  });
}
