import { a } from '@aws-amplify/backend';

export const medicinesSchema = {
  Medicine: a
    .model({
      name: a.string().required(),
      dosage: a.string().required(),
      form: a.enum(['PILL', 'DROPS', 'INJECTION', 'OTHER']),
      times: a.string().required().array(), // ["08:00", "20:00"]
      frequencyType: a.enum(['DAILY', 'SPECIFIC_DAYS', 'EVERY_X_HOURS']),
      weekDays: a.string().array(), // ["MON","WED","FRI"] — só quando frequencyType = SPECIFIC_DAYS
      intervalHours: a.integer(), // só quando frequencyType = EVERY_X_HOURS
      startDate: a.date().required(),
      endDate: a.date(), // nulo = "sem data de término"
      currentStock: a.integer().required(),
      initialStock: a.integer().required(), // denominador do percentual da barra de estoque
      unit: a.enum(['COMP', 'ML', 'CAPS']),
      lowStockThreshold: a.integer(), // ausente = nunca alerta
      notes: a.string(),
      active: a.boolean().required().default(true),
      // JSON: {"date":"YYYY-MM-DD","times":["08:00"]} — apenas o "hoje" corrente, sem histórico
      // multi-dia (decisão registrada em specs/03-exames-receitas/medicamentos/plan.md §3).
      takenToday: a.string(),
    })
    .authorization((allow) => [allow.owner()]),
};
