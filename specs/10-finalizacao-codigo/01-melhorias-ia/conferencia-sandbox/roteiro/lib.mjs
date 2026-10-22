// Utilitarios do roteiro de conferencia no sandbox: login Cognito, GraphQL e chat.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// A pasta de DADOS (outputs/amplify_outputs.json, test-users.json, wearable/), fora do git.
export const DIR = process.env.PASTA_DE_DADOS ?? path.dirname(fileURLToPath(import.meta.url));
export const OUT = JSON.parse(fs.readFileSync(path.join(DIR, 'outputs', 'amplify_outputs.json'), 'utf8'));
export const CREDS = JSON.parse(fs.readFileSync(path.join(DIR, 'test-users.json'), 'utf8'));
const REGION = OUT.auth.aws_region;

export async function login(email, password) {
  const r = await fetch(`https://cognito-idp.${REGION}.amazonaws.com/`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-amz-json-1.1', 'x-amz-target': 'AWSCognitoIdentityProviderService.InitiateAuth' },
    body: JSON.stringify({ AuthFlow: 'USER_PASSWORD_AUTH', ClientId: OUT.auth.user_pool_client_id, AuthParameters: { USERNAME: email, PASSWORD: password } }),
  });
  const j = await r.json();
  if (!j.AuthenticationResult) throw new Error('login falhou: ' + JSON.stringify(j));
  return j.AuthenticationResult.IdToken;
}

export async function identityId(idToken) {
  const prov = `cognito-idp.${REGION}.amazonaws.com/${OUT.auth.user_pool_id}`;
  const r = await fetch(`https://cognito-identity.${REGION}.amazonaws.com/`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-amz-json-1.1', 'x-amz-target': 'AWSCognitoIdentityService.GetId' },
    body: JSON.stringify({ IdentityPoolId: OUT.auth.identity_pool_id, Logins: { [prov]: idToken } }),
  });
  return (await r.json()).IdentityId;
}

export async function gql(idToken, query, variables = {}) {
  const r = await fetch(OUT.data.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: idToken },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors?.length) throw new Error(JSON.stringify(j.errors));
  return j.data;
}

const cap = (s) => s[0].toUpperCase() + s.slice(1);
export async function create(idToken, model, input) {
  const d = await gql(idToken, `mutation($i: Create${model}Input!){ create${model}(input:$i){ id } }`, { i: input });
  return d[`create${model}`].id;
}
export async function list(idToken, model, fields = 'id') {
  const itens = [];
  let nextToken = null;
  do {
    const d = await gql(idToken, `query($n:String){ list${model}s(limit:1000,nextToken:$n){ items{ ${fields} } nextToken } }`, { n: nextToken });
    itens.push(...d[`list${model}s`].items);
    nextToken = d[`list${model}s`].nextToken;
  } while (nextToken);
  return itens;
}
export async function remove(idToken, model, id) {
  await gql(idToken, `mutation($i: Delete${model}Input!){ delete${model}(input:$i){ id } }`, { i: { id } });
}
export { cap };

// Uma pergunta ao chat, como o app manda (aiAssistantService.sendMessageWithSources).
export async function ask(idToken, message, history = [], extra = {}) {
  const t0 = Date.now();
  const r = await fetch(OUT.custom.chatAssistantUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ message, history, ...extra }),
  });
  const corpo = await r.json().catch(() => ({}));
  return { status: r.status, ms: Date.now() - t0, ...corpo };
}
