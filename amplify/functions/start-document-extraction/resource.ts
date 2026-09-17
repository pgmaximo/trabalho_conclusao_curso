import { defineFunction } from '@aws-amplify/backend';

export const startDocumentExtraction = defineFunction({
  name: 'start-document-extraction',
  entry: './handler.ts',
  // So valida o dono, marca PROCESSING e dispara a extract-document-data de
  // forma assincrona -- nunca espera o resultado, por isso o teto de 30s do
  // resolver do AppSync nunca chega perto de ser testado (D12 explica por que
  // a extracao nao cabe la dentro).
  timeoutSeconds: 10,
  // Precisa estar na stack "data" pelo mesmo motivo de start-health-analysis:
  // e o resolver de uma mutation customizada (referenciada pela stack "data")
  // e tambem precisa de grantInvoke sobre extract-document-data, que
  // referenciaria de volta a stack "function".
  resourceGroupName: 'data',
});
