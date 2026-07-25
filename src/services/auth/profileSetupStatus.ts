/**
 * Resumo do arquivo:
 * Centraliza a regra que identifica se o usuario autenticado ja concluiu o setup inicial de perfil.
 * Verifica se o perfil existe no banco de dados.
 */
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

export async function hasCompletedProfileSetup() {
  try {
    // Query DynamoDB to check if UserProfile exists
    const { data: profiles } = await client.models.UserProfile.list({});
    
    const hasProfile = profiles && profiles.length > 0;
    console.log(`[ProfileSetup] Checking profile existence, found=${hasProfile}`);
    
    return hasProfile;
  } catch (error) {
    console.log('Erro ao verificar perfil:', error);
    return false;
  }
}

export async function markProfileSetupCompleted() {
  // Profile is automatically created by saveUserProfile, so no additional action needed
  console.log('[ProfileSetup] Profile will be marked as completed when saved to DynamoDB');
}
