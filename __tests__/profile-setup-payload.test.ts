import {
  buildAmplifyUserProfileInput,
  buildPreventionTaskForceQuery,
  calculateAgeFromBirthDate,
} from '@/services/profileSetupPayload';
import type { ProfileSetupFormValues } from '@/validation/forms_profile_setup';

describe('profile setup payload helpers', () => {
  it('calculates age from a Brazilian birth date string', () => {
    const age = calculateAgeFromBirthDate('06/05/2000', new Date('2026-05-06T12:00:00.000Z'));

    expect(age).toBe(26);
  });

  it('omits unknown values from the future Prevention TaskForce query', () => {
    const values: ProfileSetupFormValues = {
      fullName: '',
      birthDate: '06/05/2000',
      biologicalSex: 'prefer_not_to_say',
      pregnancyStatus: 'unknown',
      heightCm: '',
      weightKg: '',
      chronicConditions: '',
      medications: '',
      allergies: '',
      tobaccoUse: 'unknown',
      alcoholUse: 'unknown',
      physicalActivity: 'unknown',
      sexuallyActive: 'unknown',
    };

    expect(buildPreventionTaskForceQuery(values, new Date('2026-05-06T12:00:00.000Z'))).toEqual({
      age: 26,
    });
  });

  it('maps selectable answers to the USPSTF API query shape', () => {
    const values: ProfileSetupFormValues = {
      fullName: 'Maria Silva',
      birthDate: '01/02/1990',
      biologicalSex: 'female',
      pregnancyStatus: 'yes',
      heightCm: '165',
      weightKg: '70',
      chronicConditions: '',
      medications: '',
      allergies: '',
      tobaccoUse: 'no',
      alcoholUse: 'unknown',
      physicalActivity: 'yes',
      sexuallyActive: 'no',
    };

    expect(buildPreventionTaskForceQuery(values, new Date('2026-05-06T12:00:00.000Z'))).toEqual({
      age: 36,
      sex: 'Female',
      pregnant: 'Y',
      tobacco: 'N',
      sexuallyActive: 'N',
    });
  });

  it('maps profile setup values to the Amplify UserProfile model shape', () => {
    const values: ProfileSetupFormValues = {
      fullName: ' Maria Silva ',
      birthDate: '06/05/2000',
      biologicalSex: 'female',
      pregnancyStatus: 'no',
      heightCm: '1,65',
      weightKg: '70,5',
      chronicConditions: '',
      medications: '',
      allergies: '',
      tobaccoUse: 'no',
      alcoholUse: 'unknown',
      physicalActivity: 'yes',
      sexuallyActive: 'yes',
    };

    expect(buildAmplifyUserProfileInput(values)).toEqual({
      fullName: 'Maria Silva',
      birthDate: '2000-05-06',
      sex: 'Feminino',
      heightCm: 165,
      weightKg: 70.5,
      isSmoker: false,
      sexuallyActive: true,
      physicalActivity: true,
      pregnancy: false,
    });
  });

  it('maps the shared "prefer_not_to_say" value to the real "Outro" schema enum', () => {
    const values: ProfileSetupFormValues = {
      fullName: 'Maria Souza',
      birthDate: '10/05/1990',
      biologicalSex: 'prefer_not_to_say',
      pregnancyStatus: 'unknown',
      heightCm: '165',
      weightKg: '68',
      chronicConditions: '',
      medications: '',
      allergies: '',
      tobaccoUse: 'unknown',
      alcoholUse: 'unknown',
      physicalActivity: 'unknown',
      sexuallyActive: 'unknown',
    };

    expect(buildAmplifyUserProfileInput(values).sex).toBe('Outro');
  });

  it('includes chronic condition fields when filled (Tela 2a, onboarding)', () => {
    const values: ProfileSetupFormValues = {
      fullName: 'Maria Souza',
      birthDate: '10/05/1990',
      biologicalSex: 'female',
      pregnancyStatus: 'unknown',
      heightCm: '165',
      weightKg: '68',
      chronicConditions: 'Hipertensão',
      medications: 'Losartana',
      allergies: 'Dipirona',
      tobaccoUse: 'unknown',
      alcoholUse: 'unknown',
      physicalActivity: 'unknown',
      sexuallyActive: 'unknown',
    };

    const input = buildAmplifyUserProfileInput(values);

    expect(input.chronicConditions).toBe('Hipertensão');
    expect(input.medications).toBe('Losartana');
    expect(input.allergies).toBe('Dipirona');
  });

  it('omits chronic condition fields when empty, so an update never wipes existing values (Tela 4c regression)', () => {
    // Tela 4c (edit-profile.tsx) nao coleta estes 3 campos e sempre monta o
    // formulario com string vazia — o payload final nao pode conter chaves
    // vazias, ou um `update()` sobrescreveria condicoes cronicas ja salvas via
    // onboarding (2a) com valor vazio.
    const values: ProfileSetupFormValues = {
      fullName: 'Maria Souza',
      birthDate: '10/05/1990',
      biologicalSex: 'female',
      pregnancyStatus: 'unknown',
      heightCm: '165',
      weightKg: '68',
      chronicConditions: '',
      medications: '',
      allergies: '',
      tobaccoUse: 'unknown',
      alcoholUse: 'unknown',
      physicalActivity: 'unknown',
      sexuallyActive: 'unknown',
    };

    const input = buildAmplifyUserProfileInput(values);

    expect(input).not.toHaveProperty('chronicConditions');
    expect(input).not.toHaveProperty('medications');
    expect(input).not.toHaveProperty('allergies');
  });
});
