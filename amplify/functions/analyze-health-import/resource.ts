import { defineFunction } from '@aws-amplify/backend';

export const analyzeHealthImport = defineFunction({
  name: 'analyze-health-import',
  entry: './handler.ts',
  // Le arquivos do S3 (ate ~100MB de ZIP), descompacta, faz o parsing
  // defensivo de ~14 CSVs + os JSONs de HRV, calcula estatisticas e chama o
  // Bedrock — tudo isso pode levar de 30s a poucos minutos. Nunca e chamada
  // pelo AppSync (que teria teto de 30s); e invocada de forma assincrona pela
  // start-health-analysis (ver amplify/backend.ts).
  timeoutSeconds: 300,
  // Pico de memoria estimado: ZIP (~100MB) + maior entrada inflada (~18MB) +
  // acumuladores em memoria (poucos MB) — ver plan.md secao 3.6.
  memoryMB: 1536,
  // Mesma justificativa de start-health-analysis/resource.ts: precisa estar
  // na stack "data" para receber grantReadWriteData da tabela HealthImport e
  // grantInvoke da start-health-analysis sem criar dependencia ciclica entre
  // as stacks "data" e "function".
  resourceGroupName: 'data',
});
