/**
 * Resumo do arquivo:
 * Centraliza a saida da conta autenticada.
 * A navegacao fica nas rotas; este servico cuida apenas da sessao Cognito e local.
 */
import { signOut } from 'aws-amplify/auth';
import { clearUserSession } from './userSessionService';

export async function logoutUser() {
  try {
    await clearUserSession();
    await signOut();
  } catch (error) {
    console.log('Erro ao sair:', error);
  }
}
