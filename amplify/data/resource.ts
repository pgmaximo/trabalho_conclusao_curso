import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { userSchema } from './schemas/user';
import { medicalDocumentsSchema } from './schemas/medical-documents';
import { preventionSchema } from './schemas/prevention';

const schema = a.schema({
  ...userSchema,
  ...medicalDocumentsSchema,
  ...preventionSchema,
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool', // Usa o login do Cognito
  },
});