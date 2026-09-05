import { a } from '@aws-amplify/backend';
import { getPreventionRecommendations } from '../../functions/get-prevention-recommendations/resource.js';

export const preventionSchema = {
  PreventionRecommendation: a.customType({
    id: a.integer().required(),
    grade: a.string().required(),
    gradeText: a.string().required(),
    title: a.string().required(),
    text: a.string().required(),
    rationale: a.string(),
    // Adaptacao em portugues (nao-oficial) dos campos acima. Opcionais: a
    // traducao pode falhar ou a cota diaria acabar, e nesse caso o app cai de
    // volta para o texto oficial em ingles, que nunca deixa de ser retornado.
    gradeTextPt: a.string(),
    titlePt: a.string(),
    textPt: a.string(),
    rationalePt: a.string(),
    topic: a.string(),
    citationYear: a.string(),
    ageMin: a.integer(),
    ageMax: a.integer(),
    sex: a.string(),
    bmi: a.string(),
  }),
  getPreventionRecommendations: a
    .query()
    .arguments({})
    .returns(
      a.customType({
        recommendations: a.ref('PreventionRecommendation').array(),
        lastUpdated: a.string(),
        profileComplete: a.boolean().required(),
      }),
    )
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(getPreventionRecommendations)),
};
