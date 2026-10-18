/**
 * Resumo do arquivo:
 * Confere o `amplify_outputs.production.json`, gerado pelo `npm run deploy:prod`
 * e posto no APK pelo hook do EAS (scripts/usar-outputs-de-producao.mjs).
 *
 * Um outputs de producao errado so apareceria no celular de um testador -- o
 * Google que nao volta ao app, o APK falando com o sandbox de alguem. Este teste
 * pega isso no commit.
 *
 * Antes do primeiro deploy de producao o arquivo nao existe, e a suite e pulada:
 * o `npm run validate` que o proprio deploy roda precisa passar sem ele.
 */
import fs from 'fs';
import path from 'path';

const RAIZ = path.join(__dirname, '..');
const CAMINHO_DE_PRODUCAO = path.join(RAIZ, 'amplify_outputs.production.json');
const existe = fs.existsSync(CAMINHO_DE_PRODUCAO);

function lerJson(caminho: string) {
  return JSON.parse(fs.readFileSync(caminho, 'utf8'));
}

(existe ? describe : describe.skip)('amplify_outputs.production.json', () => {
  const producao = existe ? lerJson(CAMINHO_DE_PRODUCAO) : null;
  const desenvolvimento = lerJson(path.join(RAIZ, 'amplify_outputs.json'));
  const esquemaDoApp: string = lerJson(path.join(RAIZ, 'app.json')).expo.scheme;

  it('tem o mesmo formato do outputs de desenvolvimento', () => {
    expect(producao.version).toBe(desenvolvimento.version);
  });

  it('aponta para um user pool que nao e o do sandbox', () => {
    expect(producao.auth.user_pool_id).toBeTruthy();
    expect(producao.auth.user_pool_id).not.toBe(desenvolvimento.auth.user_pool_id);
  });

  it('tem o login com Google voltando para o esquema do app', () => {
    expect(producao.auth.oauth.identity_providers).toContain('GOOGLE');
    expect(producao.auth.oauth.redirect_sign_in_uri).toContain(`${esquemaDoApp}://`);
  });

  it('traz o endereco do assistente', () => {
    expect(producao.custom?.chatAssistantUrl).toMatch(/^https:\/\//);
  });
});
