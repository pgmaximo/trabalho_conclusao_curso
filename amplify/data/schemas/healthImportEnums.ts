// Fonte unica de verdade dos valores de enum de HealthImport, importada tanto
// pelo schema (health-import.ts) quanto pelas duas Lambdas que escrevem esses
// campos direto no DynamoDB (start-health-analysis e analyze-health-import).
// Evita a divergencia "a Lambda escreve 'ready' em vez de 'READY'" — o
// AppSync falha a serializacao do campo (e ele volta nulo pro cliente) se o
// valor gravado nao bater exatamente com um destes.
export const HEALTH_IMPORT_STATUS = ['PENDING', 'PROCESSING', 'READY', 'FAILED'] as const;
export type HealthImportStatus = (typeof HEALTH_IMPORT_STATUS)[number];

export const HEALTH_IMPORT_SOURCE_HINT = [
  'SAMSUNG_HEALTH',
  'APPLE_HEALTH',
  'OUTRO',
  'DESCONHECIDO',
] as const;
export type HealthImportSourceHint = (typeof HEALTH_IMPORT_SOURCE_HINT)[number];
