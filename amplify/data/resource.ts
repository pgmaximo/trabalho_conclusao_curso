import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  UserProfile: a
    .model({
      fullName: a.string().required(),
      birthDate: a.date().required(),
      sex: a.enum(['Masculino', 'Feminino']),
      weightKg: a.float(),
      heightCm: a.integer(),
      isSmoker: a.boolean(),
      sexuallyActive: a.boolean(),
      pregnancy: a.boolean(),
    })
    .authorization((allow) => [
      // Garante que o usuário só acesse seus próprios dados via Cognito sub
      allow.owner(), 
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool', // Usa o login do Cognito que você já tem
  },
});