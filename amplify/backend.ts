import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { getPreventionRecommendations } from './functions/get-prevention-recommendations/resource';

const backend = defineBackend({
  auth,
  data,
  storage,
  getPreventionRecommendations,
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

// Nota: a traducao do conteudo da USPSTF para portugues usa a API gratuita do
// MyMemory (chamada HTTP direta em translateClient.ts) em vez do Amazon
// Translate — essa conta AWS esta no "Free Plan" do novo cadastro da AWS, que
// nao inclui Amazon Translate (exigiria upgrade de plano). Por isso nao ha
// nenhuma permissao de IAM adicional a conceder aqui para a traducao.
