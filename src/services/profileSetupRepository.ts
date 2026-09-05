/**
 * Resumo do arquivo:
 * Salva o perfil inicial do usuario no modelo UserProfile do Amplify Data.
 * A UI continua independente do client AWS e chama apenas esta camada.
 */
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';

import type { Schema } from '../../amplify/data/resource';
import { buildAmplifyUserProfileInput } from '@/services/profileSetupPayload';
import type { ProfileSetupFormValues } from '@/validation/forms_profile_setup';

const client = generateClient<Schema>();

export async function saveUserProfile(values: ProfileSetupFormValues) {
  // DECISION: Garante que o usuario esta autenticado antes de tentar salvar.
  // Se o usuario nao estiver autenticado, getCurrentUser lanca uma excecao.
  try {
    await getCurrentUser();
  } catch (authError) {
    throw new Error(
      'Usuario nao autenticado. Por favor, faca login novamente ou complete o cadastro no inicio do app.',
    );
  }

  const input = buildAmplifyUserProfileInput(values);

  // DECISION: list() retorna so registros do owner autenticado (auth rule owner()).
  // Se ja existe perfil -> update, evitando duplicata no DynamoDB a cada onboarding.
  const { data: existing } = await client.models.UserProfile.list({});
  const existingProfile = existing?.[0];

  const { data, errors } = existingProfile?.id
    ? await client.models.UserProfile.update({ id: existingProfile.id, ...input })
    : await client.models.UserProfile.create(input);

  if (errors?.length) {
    const message = errors
      .map((error) => error.message)
      .filter(Boolean)
      .join('; ');

    throw new Error(message || 'Nao foi possivel salvar o perfil.');
  }

  return data;
}

/**
 * Persiste apenas a key da foto de perfil (upload de avatar, Tela 4c) sem
 * tocar em nenhum outro campo do UserProfile.
 */
export async function updateUserPhotoKey(photoKey: string) {
  const { data: existing } = await client.models.UserProfile.list({});
  const existingProfile = existing?.[0];

  if (!existingProfile?.id) {
    throw new Error('Perfil nao encontrado para salvar a foto.');
  }

  const { data, errors } = await client.models.UserProfile.update({
    id: existingProfile.id,
    photoKey,
  });

  if (errors?.length) {
    const message = errors
      .map((error) => error.message)
      .filter(Boolean)
      .join('; ');

    throw new Error(message || 'Nao foi possivel salvar a foto de perfil.');
  }

  return data;
}
