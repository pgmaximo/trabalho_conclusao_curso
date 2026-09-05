import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { storage } from './storage/resource.js';
import { getPreventionRecommendations } from './functions/get-prevention-recommendations/resource.js';
import { getVaccinationCampaigns } from './functions/get-vaccination-campaigns/resource.js';
import { getVaccinationSites } from './functions/get-vaccination-sites/resource.js';

const backend = defineBackend({
  auth,
  data,
  storage,
  getPreventionRecommendations,
  getVaccinationCampaigns,
  getVaccinationSites,
});

backend.auth.resources.cfnResources.cfnUserPoolClient.addPropertyOverride('ExplicitAuthFlows', [
  'ALLOW_USER_SRP_AUTH',
  'ALLOW_USER_PASSWORD_AUTH',
  'ALLOW_REFRESH_TOKEN_AUTH',
]);

// A funcao le o UserProfile do dono diretamente via DynamoDB, pois a role de
// execucao da Lambda nao carrega o claim "owner" do usuario final para
// reusar o client do Amplify Data com o mesmo escopo.
const userProfileTable = backend.data.resources.tables['UserProfile'];
const getPreventionRecommendationsLambda = backend.getPreventionRecommendations.resources.lambda;

userProfileTable.grantReadData(getPreventionRecommendationsLambda);
backend.getPreventionRecommendations.addEnvironment(
  'USER_PROFILE_TABLE_NAME',
  userProfileTable.tableName,
);

// As duas funcoes de Vacinacao (campanhas do PNI e unidades do CNES) leem e
// escrevem sua propria tabela de cache diretamente via SDK do DynamoDB — mesmo
// padrao de acesso direto usado acima para UserProfile, pois a role de
// execucao da Lambda nao carrega o claim "owner" do usuario final.
const campaignCacheTable = backend.data.resources.tables['VaccinationCampaignCache'];
const getVaccinationCampaignsLambda = backend.getVaccinationCampaigns.resources.lambda;

campaignCacheTable.grantReadWriteData(getVaccinationCampaignsLambda);
backend.getVaccinationCampaigns.addEnvironment('CAMPAIGN_CACHE_TABLE_NAME', campaignCacheTable.tableName);

const siteCacheTable = backend.data.resources.tables['VaccinationSiteCache'];
const getVaccinationSitesLambda = backend.getVaccinationSites.resources.lambda;

siteCacheTable.grantReadWriteData(getVaccinationSitesLambda);
backend.getVaccinationSites.addEnvironment('SITE_CACHE_TABLE_NAME', siteCacheTable.tableName);
