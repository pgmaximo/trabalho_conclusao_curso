import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { userSchema } from './schemas/user';
import { medicalDocumentsSchema } from './schemas/medical-documents';

const schema = a.schema({
  ...userSchema,
  ...medicalDocumentsSchema,
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool', // Usa o login do Cognito que você já tem
  },
});