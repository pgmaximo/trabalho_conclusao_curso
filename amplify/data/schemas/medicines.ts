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
  // Historico persistente de cada dose. O id e deterministico no cliente
  // (medicamento#data#horario), o que impede que dois toques criem duas doses
  // tomadas para o mesmo horario.
  MedicineDoseLog: a
    .model({
      medicineId: a.string().required(),
      scheduledDate: a.date().required(),
      scheduledTime: a.string().required(),
      takenAt: a.datetime().required(),
      stockAdjusted: a.boolean().required().default(false),
    })
    .secondaryIndexes((index) => [index('medicineId').sortKeys(['scheduledDate'])])
    .authorization((allow) => [allow.owner()]),
  // Um registro por aparelho apto a receber push. O token pertence ao dono do
  // registro e nunca e retornado para outros usuarios pelo Data API.
  MedicinePushDevice: a
    .model({
      expoPushToken: a.string().required(),
      platform: a.string().required(),
      timeZone: a.string().required(),
      active: a.boolean().required().default(true),
    })
    .authorization((allow) => [allow.owner()]),
  // Registro tecnico de entrega usado pela Lambda para deduplicar o push de
  // uma dose, inclusive quando a execucao agendada e repetida pela AWS.
  MedicineNotificationDelivery: a
    .model({
      medicineId: a.string().required(),
      deviceId: a.string().required(),
      scheduledAt: a.datetime().required(),
      owner: a.string().required(),
    })
    .authorization((allow) => [allow.owner()]),
};
