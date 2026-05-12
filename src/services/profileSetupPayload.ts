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
