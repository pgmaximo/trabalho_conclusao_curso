import { a } from '@aws-amplify/backend';

export const appointmentsSchema = {
  Appointment: a
    .model({
      appointmentType: a.enum(['CONSULTA', 'EXAME', 'CIRURGIA']),
      appointmentName: a.string().required(),
      professionalName: a.string().required(),
      scheduledAt: a.string().required(),
      address: a.string().required(),
      observations: a.string(),
    })
    .authorization((allow) => [allow.owner()]),
};
