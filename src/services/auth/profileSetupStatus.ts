/**
 * Resumo do arquivo:
 * Centraliza a regra que identifica se o usuario autenticado ja concluiu o setup inicial de perfil.
 * Usa AsyncStorage com chave por usuario Cognito para nao misturar perfis entre contas.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from 'aws-amplify/auth';

const PROFILE_SETUP_COMPLETED_KEY_PREFIX = '@SuaSaude:profileSetupCompleted:';

async function getCurrentUserId() {
  const user = await getCurrentUser();
  return user.userId;
}

export function getProfileSetupCompletedKey(userId: string) {
  return `${PROFILE_SETUP_COMPLETED_KEY_PREFIX}${userId}`;
}

export async function hasCompletedProfileSetup() {
  try {
    const userId = await getCurrentUserId();
    const key = getProfileSetupCompletedKey(userId);
    return (await AsyncStorage.getItem(key)) === 'true';
  } catch (error) {
    console.log('Erro ao verificar perfil:', error);
    return false;
  }
}

export async function markProfileSetupCompleted() {
  try {
    const userId = await getCurrentUserId();
    const key = getProfileSetupCompletedKey(userId);
    await AsyncStorage.setItem(key, 'true');
  } catch (error) {
    console.log('Erro ao salvar perfil:', error);
  }
}
