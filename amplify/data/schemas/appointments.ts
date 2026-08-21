import { a } from '@aws-amplify/backend';

export const appointmentsSchema = {
  Appointment: a
    .model({
      appointmentType: a.enum(['CONSULTA', 'EXAME', 'CIRURGIA']),
      appointmentName: a.string().required(),
      // DECISION (regra 5 da constituicao, specs/02-perfil-home-agenda/novo-agendamento/plan.md
      // §1.5): o Canvas 2d so exige nome/data/hora — profissional e endereco passam a ser
      // opcionais (ex.: consulta por telemedicina pode nao ter endereco fisico). Mudanca
      // compativel: registros existentes continuam validos.
      professionalName: a.string(),
      scheduledAt: a.string().required(),
      address: a.string(),
      observations: a.string(),
    })
    .authorization((allow) => [allow.owner()]),
};
