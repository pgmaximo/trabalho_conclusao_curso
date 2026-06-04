/**
 * Resumo do arquivo:
 * Centraliza a saida da conta autenticada.
 * A navegacao fica nas rotas; este servico cuida apenas da sessao Cognito e local.
 */
import { signOut } from 'aws-amplify/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearUserSession } from './userSessionService';

// DECISION: remove o cache do perfil diretamente via AsyncStorage em vez de chamar
// clearUser() do UserContext — evita acoplamento de serviço com React Context
const USER_PROFILE_KEY = '@SuaSaude:userProfile';

export async function logoutUser() {
  try {
    await clearUserSession();
    await AsyncStorage.removeItem(USER_PROFILE_KEY);
    await signOut();
  } catch (error) {
    console.log('Erro ao sair:', error);
  }
}
