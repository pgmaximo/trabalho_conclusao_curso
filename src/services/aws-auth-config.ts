// src/services/aws-auth-config.ts
import { ResourcesConfig } from 'aws-amplify';

export const authConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_KaXWMcVzc', // Substitua pelo seu ID
      userPoolClientId: '4fjsj1m26lmee88aqpb3dtido7', // Substitua pelo seu Client ID
      loginWith: {email: true}
    }
  }
};