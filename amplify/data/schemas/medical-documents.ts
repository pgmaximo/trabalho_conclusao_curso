import { a } from '@aws-amplify/backend';

export const medicalDocumentsSchema = {
  MedicalDocument: a
    .model({
      documentType: a.enum(['exam', 'prescription']),
      s3FileName: a.string().required(),
      // Nome original do arquivo enviado pelo usuário — distinto de `s3FileName`
      // (UUID + timestamp usado como chave no S3). Opcional para não quebrar
      // documentos já persistidos antes deste campo existir (GAP_ANALYSIS.md #38).
      originalFileName: a.string(),
      documentName: a.string().required(),
      documentDate: a.date().required(),
      expirationDate: a.date(),
    })
    .authorization((allow) => [
      // Cada usuário só acessa seus próprios documentos
      allow.owner(),
    ]),
};
