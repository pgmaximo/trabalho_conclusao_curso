/**
 * Resumo do arquivo:
 * Salva o perfil inicial do usuario no modelo UserProfile do Amplify Data.
 * A UI continua independente do client AWS e chama apenas esta camada.
 */
import { generateClient } from 'aws-amplify/data';

import type { Schema } from '../../amplify/data/resource';
import { buildAmplifyUserProfileInput } from '@/services/profileSetupPayload';
import type { ProfileSetupFormValues } from '@/validation/forms_profile_setup';

const client = generateClient<Schema>();

export async function saveUserProfile(values: ProfileSetupFormValues) {
  const input = buildAmplifyUserProfileInput(values);
  const { data, errors } = await client.models.UserProfile.create(input);

  if (errors?.length) {
    const message = errors
      .map((error) => error.message)
      .filter(Boolean)
      .join('; ');

    throw new Error(message || 'Nao foi possivel salvar o perfil.');
  }

  return data;
}
