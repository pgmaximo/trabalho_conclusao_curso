/**
 * Resumo do arquivo:
 * Converte o formulario local de perfil para o formato inicial esperado pela
 * futura consulta da Prevention TaskForce API. Dados desconhecidos sao omitidos
 * para evitar enviar valores sensiveis ou imprecisos.
 */
import type { ProfileSetupFormValues } from '@/validation/forms_profile_setup';

export type PreventionTaskForceQuery = {
  age: number;
  sex?: 'Female' | 'Male';
  pregnant?: 'Y' | 'N';
  tobacco?: 'Y' | 'N';
  sexuallyActive?: 'Y' | 'N';
};

export type AmplifyUserProfileInput = {
  fullName: string;
  birthDate: string;
  sex?: 'Masculino' | 'Feminino' | 'Outro';
  weightKg?: number;
  heightCm?: number;
  isSmoker?: boolean;
  sexuallyActive?: boolean;
  physicalActivity?: boolean;
  alcoholConsumption?: boolean;
  pregnancy?: boolean;
  chronicConditions?: string;
  medications?: string;
  allergies?: string;
};

function parseBrazilianDate(value: string) {
  const [day, month, year] = value.split('/').map(Number);

  if (!day || !month || !year) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  const isSameDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  return isSameDate ? date : null;
}

export function calculateAgeFromBirthDate(birthDate: string, now = new Date()) {
  const parsedBirthDate = parseBrazilianDate(birthDate);

  if (!parsedBirthDate) {
    return 0;
  }

  let age = now.getFullYear() - parsedBirthDate.getFullYear();
  const monthDelta = now.getMonth() - parsedBirthDate.getMonth();
  const hasBirthdayPassed =
    monthDelta > 0 || (monthDelta === 0 && now.getDate() >= parsedBirthDate.getDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return Math.max(age, 0);
}

function mapYesNo(value: ProfileSetupFormValues['tobaccoUse']) {
  if (value === 'yes') return 'Y';
  if (value === 'no') return 'N';
  return undefined;
}

function toAwsDate(value: string) {
  const parsedBirthDate = parseBrazilianDate(value);

  if (!parsedBirthDate) {
    throw new Error('Data de nascimento invalida para salvar o perfil.');
  }

  const year = parsedBirthDate.getFullYear();
  const month = String(parsedBirthDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedBirthDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseOptionalNumber(value: string) {
  const normalizedValue = value.trim().replace(',', '.');

  if (!normalizedValue) {
    return undefined;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function parseHeightCm(value: string) {
  const parsedHeight = parseOptionalNumber(value);

  if (parsedHeight === undefined) {
    return undefined;
  }

  return Math.round(parsedHeight <= 3 ? parsedHeight * 100 : parsedHeight);
}

function mapBiologicalSex(value: ProfileSetupFormValues['biologicalSex']) {
  if (value === 'female') return 'Feminino';
  if (value === 'male') return 'Masculino';
  // DECISION (regra 5): 'prefer_not_to_say' e o valor interno compartilhado pelas
  // Telas 2a e 4c para a 3a opcao de sexo biologico (rotulada "Outro" no Canvas
  // 4c) — mapeia para o valor real do enum em vez de ser descartado.
  if (value === 'prefer_not_to_say') return 'Outro';
  return undefined;
}

export function buildPreventionTaskForceQuery(
  values: ProfileSetupFormValues,
  now = new Date(),
): PreventionTaskForceQuery {
  const query: PreventionTaskForceQuery = {
    age: calculateAgeFromBirthDate(values.birthDate, now),
  };

  if (values.biologicalSex === 'female') {
    query.sex = 'Female';
  }

  if (values.biologicalSex === 'male') {
    query.sex = 'Male';
  }

  const pregnant = mapYesNo(values.pregnancyStatus);
  const tobacco = mapYesNo(values.tobaccoUse);
  const sexuallyActive = mapYesNo(values.sexuallyActive);

  if (values.biologicalSex === 'female' && pregnant) {
    query.pregnant = pregnant;
  }

  if (tobacco) {
    query.tobacco = tobacco;
  }

  if (sexuallyActive) {
    query.sexuallyActive = sexuallyActive;
  }

  return query;
}

export function buildAmplifyUserProfileInput(
  values: ProfileSetupFormValues,
): AmplifyUserProfileInput {
  const input: AmplifyUserProfileInput = {
    fullName: values.fullName.trim(),
    birthDate: toAwsDate(values.birthDate),
  };

  const sex = mapBiologicalSex(values.biologicalSex);
  const heightCm = parseHeightCm(values.heightCm);
  const weightKg = parseOptionalNumber(values.weightKg);

  if (sex) {
    input.sex = sex;
  }

  if (heightCm !== undefined) {
    input.heightCm = heightCm;
  }

  if (weightKg !== undefined) {
    input.weightKg = weightKg;
  }

  if (values.tobaccoUse !== 'unknown') {
    input.isSmoker = values.tobaccoUse === 'yes';
  }

  if (values.sexuallyActive !== 'unknown') {
    input.sexuallyActive = values.sexuallyActive === 'yes';
  }

  if (values.physicalActivity !== 'unknown') {
    input.physicalActivity = values.physicalActivity === 'yes';
  }

  if (values.alcoholUse !== 'unknown') {
    input.alcoholConsumption = values.alcoholUse === 'yes';
  }

  if (values.biologicalSex === 'female' && values.pregnancyStatus !== 'unknown') {
    input.pregnancy = values.pregnancyStatus === 'yes';
  }

  // DECISION (regra 2 e 5): so inclui os 3 campos clinicos quando preenchidos.
  // A Tela 4c (edit-profile.tsx) nao coleta esses campos e sempre envia string
  // vazia aqui — omiti-los do payload evita sobrescrever com vazio o que o
  // usuario preencheu no wizard (2a), sem exigir logica separada por tela.
  if (values.chronicConditions.trim()) {
    input.chronicConditions = values.chronicConditions.trim();
  }

  if (values.medications.trim()) {
    input.medications = values.medications.trim();
  }

  if (values.allergies.trim()) {
    input.allergies = values.allergies.trim();
  }

  return input;
}
