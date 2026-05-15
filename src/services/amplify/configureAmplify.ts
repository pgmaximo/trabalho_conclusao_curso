/**
 * Resumo do arquivo:
 * Inicializa os polyfills e a configuracao global do AWS Amplify usada pelo app.
 * Este bootstrap deve ser importado uma vez no layout raiz do Expo Router.
 */
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';

import outputs from '../../../amplify_outputs.json';

cognitoUserPoolsTokenProvider.setKeyValueStorage(AsyncStorage);
Amplify.configure(outputs);
