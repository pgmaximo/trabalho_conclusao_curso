import { a } from '@aws-amplify/backend';

export const userSchema = {
  UserProfile: a
    .model({
      fullName: a.string().required(),
      birthDate: a.date().required(),
      sex: a.enum(['Masculino', 'Feminino', 'Outro']),
      weightKg: a.float(),
      heightCm: a.integer(),
      isSmoker: a.boolean(),
      sexuallyActive: a.boolean(),
      physicalActivity: a.boolean(),
      alcoholConsumption: a.boolean(),
      pregnancy: a.boolean(),
      // Coletados no wizard de onboarding (2a) mas antes descartados
      // silenciosamente ao salvar — specs/02-perfil-home-agenda/wizard-perfil-saude.
      chronicConditions: a.string(),
      medications: a.string(),
      allergies: a.string(),
      // Key do avatar no bucket Storage (path `avatars/{owner}/...`), resolvida sob
      // demanda via `getUrl` — nunca a URL final (que expira), ver avatarService.ts.
      photoKey: a.string(),
      // Prova do aceite dos Termos de Uso e da Política de Privacidade: o ônus
      // de provar o consentimento é do controlador (LGPD, art. 8º, § 2º).
      // Gravados ao concluir o cadastro. A versão é o que permite pedir um novo
      // aceite quando o texto mudar (src/data/termosEPrivacidade.ts).
      termsVersion: a.string(),
      termsAcceptedAt: a.datetime(),
    })
    .authorization((allow) => [
      // Garante que o usuário só acesse seus próprios dados via Cognito sub
      allow.owner(),
    ]),
};
