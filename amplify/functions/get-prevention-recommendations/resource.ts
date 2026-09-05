import { defineFunction, secret } from '@aws-amplify/backend';

export const getPreventionRecommendations = defineFunction({
  name: 'get-prevention-recommendations',
  entry: './handler.ts',
  environment: {
    USPSTF_API_KEY: secret('USPSTF_API_KEY'),
  },
  // 30s (e nao 15s) porque cada recomendacao dispara chamadas de traducao para
  // a API do MyMemory alem da chamada a API do USPSTF — ver translateClient.ts.
  timeoutSeconds: 30,
  // Evita dependencia circular entre as stacks aninhadas data/function: esta
  // funcao e o resolver da query customizada (referenciada pela stack "data")
  // e tambem recebe grantReadData da tabela UserProfile (que referenciaria de
  // volta a stack da funcao) — colocando-a na propria stack "data" resolve isso.
  resourceGroupName: 'data',
});
