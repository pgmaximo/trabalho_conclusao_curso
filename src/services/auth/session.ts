/**
 * Resumo do arquivo:
 * Centraliza a saida da conta autenticada.
 * A navegacao fica nas rotas; este servico cuida apenas da sessao Cognito.
 */
import { signOut } from 'aws-amplify/auth';

export async function logoutUser() {
  try {
    await signOut();
  } catch (error) {
    console.log('Erro ao sair:', error);
  }
}
