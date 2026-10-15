import type { UspstfDataset } from '../uspstfClient';
import {
  computeAge,
  computeBmiBucket,
  filterRecommendations,
  mapSex,
  resolveGeneral,
  resolveGradeText,
} from '../uspstfFilter';

const DATASET: UspstfDataset = {
  specificRecommendations: [
    {
      id: 1,
      title: 'Sample male recommendation',
      grade: 'A',
      gradeVer: 0,
      sex: 'male',
      ageRange: [18, 30],
      text: 'Sample recommendation text',
      general: '1',
    },
    {
      id: 2,
      title: 'Sample female recommendation',
      grade: 'B',
      gradeVer: 1,
      sex: 'female',
      ageRange: [40, 75],
      text: 'Sample recommendation text',
      bmi: 'OB',
      general: '2',
    },
    {
      id: 3,
      title: 'Sample any-sex recommendation',
      grade: 'I',
      gradeVer: 0,
      ageRange: [0, 99],
      text: 'Sample recommendation text',
      general: '2',
    },
    {
      id: 4,
      title: 'Sample men-and-women recommendation',
      grade: 'B',
      gradeVer: 0,
      sex: 'men and women',
      ageRange: [18, 100],
      text: 'Sample recommendation text',
      general: '2',
    },
  ],
  grades: {
    A: ['Grade A text v0', 'Grade A text v1'],
    B: ['Grade B text v0', 'Grade B text v1'],
    I: ['Grade I text v0'],
  },
  generalRecommendations: {
    '1': { topic: 'Topic one', topicYear: '2021' },
    '2': { topic: 'Topic two', topicYear: '2022' },
  },
  lastUpdated: '2026-01-01',
};

describe('computeAge', () => {
  it('calculates age before and after the birthday has passed this year', () => {
    expect(computeAge('2000-06-15', new Date('2026-06-14'))).toBe(25);
    expect(computeAge('2000-06-15', new Date('2026-06-15'))).toBe(26);
  });

  it('never returns a negative age', () => {
    expect(computeAge('2026-12-31', new Date('2026-01-01'))).toBe(0);
  });
});

describe('computeBmiBucket', () => {
  it('buckets weight/height into the four USPSTF categories', () => {
    expect(computeBmiBucket(50, 180)).toBe('UW');
    expect(computeBmiBucket(70, 180)).toBe('N');
    expect(computeBmiBucket(85, 180)).toBe('O');
    expect(computeBmiBucket(110, 180)).toBe('OB');
  });

  it('returns undefined when weight or height is missing', () => {
    expect(computeBmiBucket(undefined, 180)).toBeUndefined();
    expect(computeBmiBucket(70, null)).toBeUndefined();
  });
});

describe('mapSex', () => {
  it('maps the Amplify enum values to USPSTF values', () => {
    expect(mapSex('Masculino')).toBe('Male');
    expect(mapSex('Feminino')).toBe('Female');
    expect(mapSex(null)).toBeUndefined();
    expect(mapSex(undefined)).toBeUndefined();
  });
});

describe('resolveGradeText / resolveGeneral', () => {
  it('looks up grade text and general recommendation by index', () => {
    expect(resolveGradeText(DATASET, 'A', 0)).toBe('Grade A text v0');
    expect(resolveGeneral(DATASET, '1')?.topic).toBe('Topic one');
    expect(resolveGeneral(DATASET, undefined)).toBeUndefined();
  });
});

describe('filterRecommendations', () => {
  it('filters out recommendations outside the profile age range', () => {
    const matches = filterRecommendations(
      DATASET,
      { birthDate: '1950-01-01', sex: 'Masculino' },
      new Date('2026-01-01'),
    );

    expect(matches.map((rec) => rec.id)).toEqual([3, 4]);
  });

  it('matches on sex and BMI when the profile is complete', () => {
    const matches = filterRecommendations(
      DATASET,
      { birthDate: '1980-01-01', sex: 'Feminino', weightKg: 110, heightCm: 180 },
      new Date('2026-01-01'),
    );

    expect(matches.map((rec) => rec.id)).toEqual([2, 3, 4]);
  });

  it('excludes a BMI-specific recommendation when the profile BMI does not match', () => {
    const matches = filterRecommendations(
      DATASET,
      { birthDate: '1980-01-01', sex: 'Feminino', weightKg: 60, heightCm: 180 },
      new Date('2026-01-01'),
    );

    expect(matches.map((rec) => rec.id)).toEqual([3, 4]);
  });

  it('includes "men and women" recommendations regardless of the profile sex (regression: previously excluded by strict sex equality)', () => {
    const maleMatches = filterRecommendations(
      DATASET,
      { birthDate: '1980-01-01', sex: 'Masculino' },
      new Date('2026-01-01'),
    );
    const femaleMatches = filterRecommendations(
      DATASET,
      { birthDate: '1980-01-01', sex: 'Feminino' },
      new Date('2026-01-01'),
    );

    expect(maleMatches.map((rec) => rec.id)).toContain(4);
    expect(femaleMatches.map((rec) => rec.id)).toContain(4);
  });
});
