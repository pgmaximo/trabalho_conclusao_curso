/**
 * Resumo do arquivo:
 * Rota de edição do Perfil de Saúde. Pré-carrega os dados atuais do usuário,
 * salva via repositório (upsert no UserProfile do Amplify), atualiza o
 * UserContext e volta para a tela de Perfil.
 */
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import { EditProfileScreen, type EditProfileFormState } from '@/screens/EditProfileScreen';
import { saveUserProfile } from '@/services/profileSetupRepository';
import { useUserContext } from '@/contexts/UserContext';
import type { UserProfile } from '@/contexts/UserContext';
import type { ProfileSetupFormValues } from '@/validation/forms_profile_setup';

// DECISION: birthDate é persistido como AWS date (YYYY-MM-DD); o formulário usa
// o formato brasileiro (DD/MM/AAAA), então convertemos nas duas direções.
function awsDateToBrazilian(value?: string): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return '';
  return `${day}/${month}/${year}`;
}

function heightCmToText(value?: number): string {
  if (!value) return '';
  return String(Math.round(value));
}

function boolToAnswer(value?: boolean): EditProfileFormState['tobaccoUse'] {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  return 'unknown';
}

function userToFormState(user: UserProfile): EditProfileFormState {
  return {
    fullName: user.name ?? '',
    birthDate: awsDateToBrazilian(user.birthDate),
    biologicalSex:
      user.gender === 'female' ? 'female' : user.gender === 'male' ? 'male' : 'prefer_not_to_say',
    heightCm: heightCmToText(user.heightCm),
    weightKg: user.weightKg ? String(user.weightKg) : '',
    tobaccoUse: boolToAnswer(user.isSmoker),
    sexuallyActive: boolToAnswer(user.sexuallyActive),
    physicalActivity: boolToAnswer(user.physicalActivity),
    alcoholUse: boolToAnswer(user.alcoholConsumption),
    pregnancyStatus: boolToAnswer(user.pregnancy),
  };
}

// DECISION: o formulário de edição alimenta o mesmo contrato do onboarding
// (ProfileSetupFormValues); campos não editados aqui ficam vazios/unknown e são
// ignorados por buildAmplifyUserProfileInput, preservando os valores no backend.
function formStateToProfileValues(form: EditProfileFormState): ProfileSetupFormValues {
  return {
    fullName: form.fullName,
    birthDate: form.birthDate,
    biologicalSex: form.biologicalSex,
    pregnancyStatus: form.pregnancyStatus,
    heightCm: form.heightCm,
    weightKg: form.weightKg,
    chronicConditions: '',
    medications: '',
    allergies: '',
    tobaccoUse: form.tobaccoUse,
    alcoholUse: form.alcoholUse,
    physicalActivity: form.physicalActivity,
    sexuallyActive: form.sexuallyActive,
  };
}

export default function EditProfileRoute() {
  const { user, refreshUser } = useUserContext();
  const [isSaving, setIsSaving] = useState(false);

  if (!user) {
    router.replace('/dashboard');
    return null;
  }

  async function handleSubmit(form: EditProfileFormState) {
    setIsSaving(true);
    try {
      await saveUserProfile(formStateToProfileValues(form));
      await refreshUser();
      router.back();
    } catch (error) {
      console.log('Erro ao editar perfil:', error);
      Alert.alert(
        'Erro ao salvar',
        'Não foi possível salvar suas alterações agora. Verifique sua conexão e tente novamente.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <EditProfileScreen
      initialValues={userToFormState(user)}
      displayName={user.name}
      email={user.email}
      gender={user.gender}
      photoUrl={user.photoUrl}
      isSaving={isSaving}
      onCancel={() => router.back()}
      onSubmit={handleSubmit}
    />
  );
}
