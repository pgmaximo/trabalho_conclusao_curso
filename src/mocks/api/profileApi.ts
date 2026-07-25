/**
 * Resumo do arquivo:
 * Mock API de perfil usada enquanto a integracao real de backend nao existe.
 * Simula a carga dos dados consolidados do usuario.
 */
import { USER_PROFILE_SNAPSHOT } from '@/mocks/profile';

import { simulateRequest } from './requestSimulator';

export function getUserProfileSnapshot() {
  return simulateRequest(USER_PROFILE_SNAPSHOT, {
    delayMs: 290,
    errorMessage: 'Nao foi possivel carregar o perfil do usuario.',
  });
}
