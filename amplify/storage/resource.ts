import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'medicalDocuments',
  access: (allow) => ({
    'medical-documents/{owner}/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
  }),
});
