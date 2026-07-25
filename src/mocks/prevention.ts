import type { PreventionSnapshot } from '@/types/models';

export const PREVENTION_SNAPSHOT: PreventionSnapshot = {
  recommendations: [
    {
      id: 426,
      grade: 'A',
      gradeText:
        'The USPSTF recommends the service. There is high certainty that the net benefit is substantial.',
      title: 'Cervical Cancer: Screening',
      text: 'The USPSTF recommends screening for cervical cancer in women 21 to 65 years of age.',
      rationale: null,
      topic: 'Cervical Cancer Screening',
      citationYear: '2018',
      ageMin: 21,
      ageMax: 65,
      sex: 'female',
      bmi: null,
    },
    {
      id: 1928,
      grade: 'B',
      gradeText: 'The USPSTF recommends the service.',
      title: 'Colorectal Cancer: Screening',
      text: 'The USPSTF recommends screening for colorectal cancer in adults 45 to 75 years of age.',
      rationale: null,
      topic: 'Colorectal Cancer Screening',
      citationYear: '2021',
      ageMin: 45,
      ageMax: 75,
      sex: null,
      bmi: null,
    },
  ],
  lastUpdated: '2026-01-01',
  profileComplete: true,
};
