/**
 * Resumo do arquivo:
 * Gerencia informacoes da sessao do usuario logado armazenadas localmente.
 * Persiste userId, email e outras informacoes relevantes apos autenticacao.
 * Utilizado por outros servicos para acessar dados do usuario sem chamar Cognito a cada vez.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from 'aws-amplify/auth';

const USER_SESSION_KEY = '@SuaSaude:userSession';

export interface UserSession {
  userId: string;
  email: string;
  username: string;
}

/**
 * Recupera informacoes do usuario autenticado e armazena localmente
 */
export async function initializeUserSession(): Promise<UserSession> {
  try {
    // Tenta obter do armazenamento local primeiro
    const cached = await getUserSessionFromStorage();
    if (cached) {
      return cached;
    }

    // Se nao estiver em cache, obtem do Cognito e armazena
    const user = await getCurrentUser();
    const userSession: UserSession = {
      userId: user.userId,
      email: user.signInDetails?.loginId || '',
      username: user.username,
    };

    await saveUserSessionToStorage(userSession);
    return userSession;
  } catch (error) {
    console.error('Erro ao inicializar sessao do usuario:', error);
    throw error;
  }
}

/**
 * Obtem o ID do usuario logado do armazenamento local
 */
export async function getUserId(): Promise<string> {
  try {
    const session = await getUserSessionFromStorage();
    if (session?.userId) {
      return session.userId;
    }

    // Fallback: obtem do Cognito se nao estiver em cache
    const user = await getCurrentUser();
    return user.userId;
  } catch (error) {
    console.error('Erro ao obter userId:', error);
    throw error;
  }
}

/**
 * Obtem todas as informacoes da sessao do usuario
 */
export async function getUserSession(): Promise<UserSession | null> {
  try {
    return await getUserSessionFromStorage();
  } catch (error) {
    console.error('Erro ao obter sessao do usuario:', error);
    return null;
  }
}

/**
 * Salva a sessao do usuario no armazenamento local
 */
async function saveUserSessionToStorage(session: UserSession): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Erro ao salvar sessao do usuario:', error);
  }
}

/**
 * Recupera a sessao do usuario do armazenamento local
 */
async function getUserSessionFromStorage(): Promise<UserSession | null> {
  try {
    const data = await AsyncStorage.getItem(USER_SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Erro ao recuperar sessao do usuario:', error);
    return null;
  }
}

/**
 * Remove a sessao do usuario do armazenamento local (logout)
 */
export async function clearUserSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_SESSION_KEY);
  } catch (error) {
    console.error('Erro ao limpar sessao do usuario:', error);
  }
}
