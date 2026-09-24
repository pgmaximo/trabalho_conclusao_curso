import { defineFunction } from '@aws-amplify/backend';

export const extractDocumentData = defineFunction({
  name: 'extract-document-data',
  entry: './handler.ts',
  // Le o arquivo do S3, chama o Bedrock (ate duas vezes, com o reparo) e grava
  // as linhas. Medido: 35s para um laudo de 19 exames, 111s para o laudo de 20
  // paginas que precisou de reparo. O teto ficou folgado de proposito quando o
  // Textract saiu (Bloco 10): o que pesa e o laudo longo, nao a rota.
  timeoutSeconds: 600,
  memoryMB: 1024,
  // Mesma justificativa de start-health-analysis/resource.ts: a segunda
  // funcao no grupo default causa dependencia ciclica entre as stacks
  // data/function quando ha grant de tabela numa direcao e nome de funcao na
  // outra.
  resourceGroupName: 'data',
});
