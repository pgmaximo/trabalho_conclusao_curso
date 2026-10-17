/**
 * A infraestrutura que o E7 acrescenta ao chat (CA-19): o segredo da USPSTF,
 * e NADA alem dele. O teste le o codigo de definicao, e nao um deploy -- e o
 * que da para afirmar sem sandbox, e e o que pega o descuido mais provavel:
 * conceder escrita "para garantir" ao acrescentar uma fonte nova.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ_AMPLIFY = join(__dirname, '..', '..', '..');
const ler = (...partes: string[]) => readFileSync(join(RAIZ_AMPLIFY, ...partes), 'utf8');

describe('infraestrutura do chat para a prevencao (E7)', () => {
  it('o chat recebe USPSTF_API_KEY como segredo, e nao como texto', () => {
    const resource = ler('functions', 'chat-assistant', 'resource.ts');

    expect(resource).toMatch(/USPSTF_API_KEY:\s*secret\('USPSTF_API_KEY'\)/);
  });

  it('o backend nunca concede escrita a funcao do chat', () => {
    const backend = ler('backend.ts');

    expect(backend).not.toMatch(/grant(ReadWrite|Write)Data\(\s*chatAssistantLambda/);
  });

  it('nenhuma politica avulsa da funcao do chat concede escrita', () => {
    // `grantReadData` nao e o unico caminho: `addToRolePolicy` com acao de
    // escrita, ou `grantFullAccess`, dariam o mesmo resultado por outra porta.
    const backend = ler('backend.ts');
    const politicas = [...backend.matchAll(/chatAssistantLambda\.addToRolePolicy\(([\s\S]*?)\n\);/g)].map((m) => m[1]);

    expect(politicas.length).toBeGreaterThan(0);
    for (const politica of politicas) {
      expect(politica).not.toMatch(/(dynamodb|s3):(Put|Update|Delete|BatchWrite|TransactWrite)|'\*'/);
    }
    expect(backend).not.toMatch(/grantFullAccess\(\s*chatAssistantLambda/);
  });

  it('o perfil continua no laco de grantReadData do chat -- e a unica tabela que a prevencao le', () => {
    const backend = ler('backend.ts');
    const laco = backend.slice(backend.indexOf('for (const tabela of ['), backend.indexOf('tabela.grantReadData(chatAssistantLambda)'));

    expect(laco).toContain('userProfileTable');
  });
});
