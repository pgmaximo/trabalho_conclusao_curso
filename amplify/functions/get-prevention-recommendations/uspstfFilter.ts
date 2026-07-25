import type { UspstfDataset, UspstfSpecificRecommendation } from './uspstfClient';

export type BmiBucket = 'UW' | 'N' | 'O' | 'OB';

export function computeAge(birthDateIso: string, asOf: Date = new Date()): number {
  const birthDate = new Date(birthDateIso);
  let age = asOf.getFullYear() - birthDate.getFullYear();
  const monthDelta = asOf.getMonth() - birthDate.getMonth();
  const hasBirthdayPassed =
    monthDelta > 0 || (monthDelta === 0 && asOf.getDate() >= birthDate.getDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return Math.max(age, 0);
}

export function computeBmiBucket(
  weightKg?: number | null,
  heightCm?: number | null,
): BmiBucket | undefined {
  if (!weightKg || !heightCm) {
    return undefined;
  }

  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);

  if (bmi < 18.5) return 'UW';
  if (bmi < 25) return 'N';
  if (bmi < 30) return 'O';
  return 'OB';
}

export function mapSex(sex?: string | null): 'Male' | 'Female' | undefined {
  if (sex === 'Masculino') return 'Male';
  if (sex === 'Feminino') return 'Female';
  return undefined;
}

export function resolveGradeText(dataset: UspstfDataset, grade: string, gradeVer: number): string {
  return dataset.grades?.[grade]?.[gradeVer] ?? '';
}

export function resolveGeneral(dataset: UspstfDataset, general: number | string | undefined) {
  if (general === undefined) {
    return undefined;
  }

  return dataset.generalRecommendations?.[String(general)];
}

export type ProfileForFiltering = {
  birthDate: string;
  sex?: string | null;
  pregnancy?: boolean | null;
  isSmoker?: boolean | null;
  sexuallyActive?: boolean | null;
  weightKg?: number | null;
  heightCm?: number | null;
};

/**
 * v1 filters only on dimensions the USPSTF response exposes directly
 * (ageRange, sex, bmi). pregnancy/tobacco/sexuallyActive have no explicit
 * field in specificRecommendations — matching those reliably would need
 * reverse-engineering riskName against the deprecated query-param endpoint,
 * tracked as a follow-up rather than guessed here.
 */
export function filterRecommendations(
  dataset: UspstfDataset,
  profile: ProfileForFiltering,
  asOf: Date = new Date(),
): UspstfSpecificRecommendation[] {
  const age = computeAge(profile.birthDate, asOf);
  const sex = mapSex(profile.sex);
  const bmiBucket = computeBmiBucket(profile.weightKg, profile.heightCm);

  return dataset.specificRecommendations.filter((rec) => {
    if (rec.ageRange && (age < rec.ageRange[0] || age > rec.ageRange[1])) {
      return false;
    }

    if (rec.sex && sex) {
      const recSex = rec.sex.toLowerCase();
      // A recomendacao pode valer para um sexo especifico ("male"/"female") ou
      // para todos ("men and women") — so exclui quando ha um sexo especifico
      // definido que diverge do perfil do usuario.
      if (recSex !== 'men and women' && recSex !== sex.toLowerCase()) {
        return false;
      }
    }

    if (rec.bmi && bmiBucket && rec.bmi !== bmiBucket) {
      return false;
    }

    return true;
  });
}
