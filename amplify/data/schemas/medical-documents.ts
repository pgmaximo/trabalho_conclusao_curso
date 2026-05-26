import { a } from '@aws-amplify/backend';

export const medicalDocumentsSchema = {
  MedicalDocument: a
    .model({
      documentType: a.enum(['exam', 'prescription']),
      s3FileName: a.string().required(),
      documentName: a.string().required(),
      documentDate: a.date().required(),
      expirationDate: a.date(),
    })
    .authorization((allow) => [
      // Cada usuário só acessa seus próprios documentos
      allow.owner(),
    ]),
};
