import { defineAuth, secret } from '@aws-amplify/backend';

/**
 * O login com Google so entra quando o ambiente pede, e quem pede e o
 * `scripts/deploy-producao.mjs`. Com ele ligado, todo ambiente que publica
 * precisa dos segredos GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET -- condicionar
 * aqui e o que deixa os sandboxes da equipe publicarem sem eles, so com e-mail
 * e senha.
 *
 * O dominio do Cognito (Hosted UI) que o Google exige NAO e configurado aqui:
 * o Amplify o cria sozinho, com um hash estavel por ambiente. O endereco sai em
 * `auth.oauth.domain` do outputs, e e ele que vai como redirect URI no cliente
 * OAuth do Google (`https://<dominio>/oauth2/idpresponse`).
 */
const loginComGoogle = process.env.SUASAUDE_LOGIN_GOOGLE === '1';

export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: 'CODE',
      verificationEmailSubject: 'SuaSaúde: seu código de verificação',
      verificationEmailBody: (createCode) =>
        `Seu código de verificação do SuaSaúde é ${createCode()}.`,
    },
    ...(loginComGoogle
      ? {
          externalProviders: {
            google: {
              clientId: secret('GOOGLE_CLIENT_ID'),
              clientSecret: secret('GOOGLE_CLIENT_SECRET'),
              scopes: ['openid', 'email', 'profile'],
              // `email` e atributo obrigatorio do pool: sem o mapeamento, o
              // Cognito recusa o primeiro login de quem vem do Google.
              attributeMapping: { email: 'email' },
            },
            scopes: ['OPENID', 'EMAIL', 'PROFILE'],
            // Minusculo de proposito: o navegador entrega o esquema em
            // minusculo, e o Android compara esquema diferenciando caixa.
            callbackUrls: ['suasaude://'],
            logoutUrls: ['suasaude://'],
          },
        }
      : {}),
  },
});
