import { defineFunction } from '@aws-amplify/backend';

export const getVaccinationSites = defineFunction({
  name: 'get-vaccination-sites',
  entry: './handler.ts',
  timeoutSeconds: 15,
  // Mesma justificativa de resourceGroupName em get-vaccination-campaigns e
  // get-prevention-recommendations: referenciada pela stack "data" e precisa
  // de acesso a uma tabela de cache própria.
  resourceGroupName: 'data',
});
