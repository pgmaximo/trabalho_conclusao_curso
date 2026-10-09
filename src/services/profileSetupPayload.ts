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
  // `null` limpa o campo no backend (edição do perfil, quando a pessoa apaga o texto).
  chronicConditions?: string | null;
  medications?: string | null;
  allergies?: string | null;
};

export type BuildProfileInputOptions = {
  /**
   * O que fazer com um campo clínico (condições crônicas, medicamentos em uso,
   * alergias) que chega vazio:
   * - `keep` (padrão): não envia o campo, e o que está guardado continua.
   * - `clear`: envia `null`, e o campo é apagado. Só serve para uma tela que
   *   MOSTRA esses campos à pessoa — senão apagaria o que ela nunca viu.
   */
  emptyClinicalFields?: 'keep' | 'clear';
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
  // Campo "Altura (cm)" do wizard (2a) ja coleta centimetros inteiros
  // diretamente (Canvas), sem necessidade de detectar entrada em metros.
  const parsedHeight = parseOptionalNumber(value);

  return parsedHeight === undefined ? undefined : Math.round(parsedHeight);
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
  options: BuildProfileInputOptions = {},
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

  // DECISION (regra 2 e 5): por padrao, so inclui os 3 campos clinicos quando
  // preenchidos — omiti-los evita sobrescrever com vazio o que a pessoa
  // preencheu no wizard (2a) quando quem chama nao os coleta.
  //
  // A Tela 4c (edit-profile.tsx) passou a MOSTRAR esses campos
  // (correcoes-de-usabilidade, D10): antes a pessoa os preenchia no cadastro e
  // nunca mais os via. Ali, apagar o texto e uma escolha dela, e o campo vazio
  // vai como `null` (`emptyClinicalFields: 'clear'`).
  const clearEmpty = options.emptyClinicalFields === 'clear';

  for (const field of ['chronicConditions', 'medications', 'allergies'] as const) {
    const text = values[field].trim();

    if (text) {
      input[field] = text;
    } else if (clearEmpty) {
      input[field] = null;
    }
  }

  return input;
}
