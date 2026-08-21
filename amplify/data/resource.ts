import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { userSchema } from './schemas/user.js';
import { medicalDocumentsSchema } from './schemas/medical-documents.js';
import { appointmentsSchema } from './schemas/appointments.js';
import { vaccinationSchema } from './schemas/vaccination.js';

const schema = a.schema({
  ...userSchema,
  ...medicalDocumentsSchema,
  ...appointmentsSchema,
  ...vaccinationSchema,
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool', // Usa o login do Cognito
  },
});