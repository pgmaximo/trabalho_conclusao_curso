import { defineFunction, secret } from '@aws-amplify/backend';

export const getPreventionRecommendations = defineFunction({
  name: 'get-prevention-recommendations',
  entry: './handler.ts',
  environment: {
    USPSTF_API_KEY: secret('USPSTF_API_KEY'),
  },
  // 30s (era 15s) para dar folga as chamadas ao Amazon Translate — title/text/
  // rationale de cada recomendacao sao traduzidos em paralelo, mas o numero de
  // recomendacoes por usuario pode ser grande (dezenas).
  timeoutSeconds: 30,
  // Evita dependencia circular entre as stacks aninhadas data/function: esta
  // funcao e o resolver da query customizada (referenciada pela stack "data")
  // e tambem recebe grantReadData da tabela UserProfile (que referenciaria de
  // volta a stack da funcao) — colocando-a na propria stack "data" resolve isso.
  resourceGroupName: 'data',
});
