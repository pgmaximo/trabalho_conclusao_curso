/**
 * Resumo do arquivo:
 * Decide para qual rota o usuario deve ir apos autenticar.
 * Mantem a regra fora das telas para que login por senha e Google usem o mesmo comportamento.
 */
import { hasCompletedProfileSetup } from './profileSetupStatus';

export type PostAuthRoute = '/dashboard' | '/profile-setup';

export async function resolvePostAuthRoute(): Promise<PostAuthRoute> {
  return (await hasCompletedProfileSetup()) ? '/dashboard' : '/profile-setup';
}
