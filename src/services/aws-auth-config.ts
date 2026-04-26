// src/services/aws-auth-config.ts
import { ResourcesConfig } from 'aws-amplify';

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
          redirectSignIn: ['exp://192.168.3.5:8081', 'SuaSaude://'], // URLs de retorno
          redirectSignOut: ['exp://192.168.3.5:8081', 'SuaSaude://'],
          responseType: 'code',
          providers: ['Google'],
        }
      }
    }
  }
};
