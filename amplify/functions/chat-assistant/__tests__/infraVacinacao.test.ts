/**
 * A infraestrutura que o E8 acrescenta ao chat (CA-22): leitura do cache de
 * postos, e NADA alem dela. O cache de campanhas fica de fora -- a lista vem do
 * calendario em codigo (P1 = A) -- e nenhuma concessao de escrita aparece.
 * O teste le o codigo de definicao, como o da prevencao: e o que da para
 * afirmar sem sandbox.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const backend = readFileSync(join(__dirname, '..', '..', '..', 'backend.ts'), 'utf8');
const lacoDoChat = backend.slice(
  backend.indexOf('for (const tabela of ['),
  backend.indexOf('tabela.grantReadData(chatAssistantLambda)'),
);

describe('infraestrutura do chat para a vacinacao (E8)', () => {
  it('o cache de postos entra no laco de grantReadData do chat', () => {
    expect(lacoDoChat).toContain('siteCacheTable');
  });

  it('o cache de campanhas NAO entra: a lista vem do calendario', () => {
    expect(lacoDoChat).not.toContain('campaignCacheTable');
    expect(backend).not.toMatch(/campaignCacheTable\.grant\w*\(\s*chatAssistantLambda/);
  });

  it('o chat recebe o nome da tabela do cache de postos', () => {
    expect(backend).toMatch(/chatAssistant\.addEnvironment\(\s*'SITE_CACHE_TABLE_NAME'/);
  });

  it('nenhuma escrita e concedida ao chat', () => {
    expect(backend).not.toMatch(/grant(ReadWrite|Write)Data\(\s*chatAssistantLambda/);
    expect(backend).not.toMatch(/grantFullAccess\(\s*chatAssistantLambda/);
  });
});
