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
