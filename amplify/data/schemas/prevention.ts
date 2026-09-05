import { a } from '@aws-amplify/backend';
import { getPreventionRecommendations } from '../../functions/get-prevention-recommendations/resource';

export const preventionSchema = {
  PreventionRecommendation: a.customType({
    id: a.integer().required(),
    grade: a.string().required(),
    gradeText: a.string().required(),
    // Adaptacao em portugues (Amazon Translate) — sempre exibida junto do texto
    // oficial verbatim em ingles acima, nunca no lugar dele. Pode ser null se a
    // traducao falhar (o app cai de volta para o texto em ingles nesse caso).
    gradeTextPt: a.string(),
    title: a.string().required(),
    titlePt: a.string(),
    text: a.string().required(),
    textPt: a.string(),
    rationale: a.string(),
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
