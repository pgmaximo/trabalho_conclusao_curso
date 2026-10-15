/**
 * Resumo do arquivo:
 * Rota de edição do Perfil de Saúde. Pré-carrega os dados atuais do usuário,
 * salva via repositório (upsert no UserProfile do Amplify), atualiza o
 * UserContext e volta para a tela de Perfil.
 */
import React, { useState } from 'react';
import { router } from 'expo-router';

import { EditProfileScreen, type EditProfileFormState } from '@/screens/EditProfileScreen';
import { saveUserProfile, updateUserPhotoKey } from '@/services/profileSetupRepository';
import { uploadAvatarPhoto } from '@/services/avatarService';
import { avisarSucesso } from '@/hooks/avisoDeSucesso';
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
    chronicConditions: user.chronicConditions ?? '',
    medications: user.medications ?? '',
    allergies: user.allergies ?? '',
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
// Os três campos clínicos SÃO editados aqui (correcoes-de-usabilidade, D10), e
// por isso `handleSubmit` salva com `emptyClinicalFields: 'clear'`.
function formStateToProfileValues(form: EditProfileFormState): ProfileSetupFormValues {
  return {
    fullName: form.fullName,
    birthDate: form.birthDate,
    biologicalSex: form.biologicalSex,
    pregnancyStatus: form.pregnancyStatus,
    heightCm: form.heightCm,
    weightKg: form.weightKg,
    chronicConditions: form.chronicConditions,
    medications: form.medications,
    allergies: form.allergies,
    tobaccoUse: form.tobaccoUse,
    alcoholUse: form.alcoholUse,
    physicalActivity: form.physicalActivity,
    sexuallyActive: form.sexuallyActive,
  };
}

export default function EditProfileRoute() {
  const { user, refreshUser } = useUserContext();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!user) {
    router.replace('/dashboard');
    return null;
  }

  async function handleUploadPhoto(localUri: string) {
    const photoKey = await uploadAvatarPhoto(localUri);
    await updateUserPhotoKey(photoKey);
    await refreshUser();
  }

  async function handleSubmit(form: EditProfileFormState) {
    setIsSaving(true);
    setSaveError(null);
    try {
      await saveUserProfile(formStateToProfileValues(form), { emptyClinicalFields: 'clear' });
      await refreshUser();
      avisarSucesso('Perfil atualizado.');
      router.back();
    } catch (error) {
      console.log('Erro ao editar perfil:', error);
      // Na própria tela, acima do botão, e não num pop-up do sistema
      // (specs/00-fundacao/consistencia-e-textos/spec.md, D4).
      setSaveError(
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
      saveError={saveError}
      onCancel={() => router.back()}
      onSubmit={handleSubmit}
      onUploadPhoto={handleUploadPhoto}
    />
  );
}
