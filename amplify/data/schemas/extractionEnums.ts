// Fonte unica de verdade dos enums da extracao, importada pelo schema
// (medical-documents.ts) e pela Lambda extract-document-data, que escreve
// estes campos DIRETO no DynamoDB. Mesma razao de healthImportEnums.ts: se a
// Lambda gravar "succeeded" onde o enum diz "SUCCEEDED", o AppSync falha a
// serializacao e o campo volta nulo pro cliente, sem erro.
export const EXTRACTION_STATUS = [
  'PENDING', // documento gravado, extracao ainda nao disparada
  'PROCESSING', // a Lambda esta rodando
  'SUCCEEDED', // concluiu e gravou pelo menos uma linha
  'NO_RESULTS', // concluiu e NAO havia valor acompanhavel. Nao e falha.
  'FAILED', // nao concluiu
] as const;
export type ExtractionStatus = (typeof EXTRACTION_STATUS)[number];

export const REVIEW_STATUS = [
  'AUTO', // leitura aceita pela pipeline
  'PENDENTE_DE_REVISAO', // nao participa de comparacao ate ser confirmada
  'CONFIRMADO_PELO_USUARIO', // uma pessoa olhou o papel e disse que esta certo
] as const;
export type ReviewStatus = (typeof REVIEW_STATUS)[number];
