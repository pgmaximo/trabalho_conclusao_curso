import { defineFunction } from '@aws-amplify/backend';

export const extractDocumentData = defineFunction({
  name: 'extract-document-data',
  entry: './handler.ts',
  // Le o arquivo do S3, possivelmente passa pelo Textract assincrono (PDF
  // multipagina), chama o Bedrock e grava as linhas. A medicao da tarefa 1
  // deu 35s para um laudo de 19 exames pelo caminho de PDF nativo; o caminho
  // do Textract assincrono e mais lento e tem teto proprio de 5 minutos.
  timeoutSeconds: 600,
  memoryMB: 1024,
  // Mesma justificativa de start-health-analysis/resource.ts: a segunda
  // funcao no grupo default causa dependencia ciclica entre as stacks
  // data/function quando ha grant de tabela numa direcao e nome de funcao na
  // outra.
  resourceGroupName: 'data',
});
