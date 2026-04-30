// src/services/aws-auth-config.ts
import { ResourcesConfig } from 'aws-amplify';
import * as Linking from 'expo-linking';

const expoRedirectUrl = Linking.createURL('');
const nativeRedirectUrl = 'SuaSaude://';

console.log('Cognito OAuth redirect URL for this run:', expoRedirectUrl);

export const authConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_KaXWMcVzc',
      userPoolClientId: '4fjsj1m26lmee88aqpb3dtido7',
      loginWith: {
        email: true,
        oauth: {
          domain: 'us-east-1kaxwmcvzc.auth.us-east-1.amazoncognito.com',
          scopes: ['email', 'profile', 'openid'],
          redirectSignIn: [expoRedirectUrl, nativeRedirectUrl],
          redirectSignOut: [expoRedirectUrl, nativeRedirectUrl],
          responseType: 'code',
          providers: ['Google'],
        }
      }
    }
  }
};
