/**
 * Resumo do arquivo:
 * Inicializa os polyfills e a configuracao global do AWS Amplify usados pelas telas de autenticacao.
 * Este arquivo deve ser importado uma vez no layout raiz do Expo Router antes de usar servicos de auth.
 */
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';

import { authConfig } from './aws-auth-config';

cognitoUserPoolsTokenProvider.setKeyValueStorage(AsyncStorage);
Amplify.configure(authConfig);
