import { a } from '@aws-amplify/backend';

export const vaccinationSchema = {
  VaccineDose: a
    .model({
      name: a.string().required(), // "Influenza (gripe)", "Dupla adulto (dT)", "Hepatite B"
      doseNumber: a.integer(), // opcional — "3ª dose"; ausente = vacina sem numeração
      appliedDate: a.date(), // NULLABLE — nulo = ainda não aplicada ("Próximas recomendadas")
      location: a.string(), // só preenchido quando appliedDate existe
      dueDate: a.date(), // data/janela recomendada (quando appliedDate é nulo)
      recommendedIntervalYears: a.integer(), // reforços recorrentes (ex. dT = 10)
      isCampaign: a.boolean().default(false), // vinculada a uma campanha sazonal (ex. gripe)
      notes: a.string(),
    })
    .authorization((allow) => [allow.owner()]),
};
