import type { PreventionSnapshot } from '@/types/models';

export const PREVENTION_SNAPSHOT: PreventionSnapshot = {
  recommendations: [
    {
      id: 426,
      grade: 'A',
      gradeText:
        'The USPSTF recommends the service. There is high certainty that the net benefit is substantial.',
      gradeTextPt:
        'A USPSTF recomenda o serviço. Há alta certeza de que o benefício líquido é substancial.',
      title: 'Cervical Cancer: Screening',
      titlePt: 'Câncer de Colo do Útero: Rastreamento',
      text: 'The USPSTF recommends screening for cervical cancer in women 21 to 65 years of age.',
      textPt:
        'A USPSTF recomenda o rastreamento de câncer de colo do útero em mulheres de 21 a 65 anos de idade.',
      rationale: null,
      rationalePt: null,
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
      gradeTextPt: 'A USPSTF recomenda o serviço.',
      title: 'Colorectal Cancer: Screening',
      titlePt: 'Câncer Colorretal: Rastreamento',
      text: 'The USPSTF recommends screening for colorectal cancer in adults 45 to 75 years of age.',
      textPt:
        'A USPSTF recomenda o rastreamento de câncer colorretal em adultos de 45 a 75 anos de idade.',
      rationale: null,
      rationalePt: null,
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
