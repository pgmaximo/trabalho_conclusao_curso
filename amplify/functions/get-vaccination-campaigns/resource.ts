import { defineFunction } from '@aws-amplify/backend';

export const getVaccinationCampaigns = defineFunction({
  name: 'get-vaccination-campaigns',
  entry: './handler.ts',
  // A amostragem varre ate 8 offsets x 2 paginas = 16 chamadas HTTP sequenciais
  // ao PNI por invocacao sem cache — folga generosa acima do observado em
  // testes manuais (~0.3-1.1s por chamada).
  timeoutSeconds: 30,
  // Mesma justificativa de get-prevention-recommendations/resource.ts: esta
  // funcao e referenciada pela stack "data" (resolver da query customizada) e
  // tambem precisa de acesso de leitura/escrita a uma tabela de cache proxima
  // — mante-la em "data" evita dependencia circular entre stacks aninhadas.
  resourceGroupName: 'data',
});
