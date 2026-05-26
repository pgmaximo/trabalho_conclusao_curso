import { a } from '@aws-amplify/backend';

export const userSchema = {
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
};
