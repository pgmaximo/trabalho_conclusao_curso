/**
 * Resumo do arquivo:
 * Prova de que a tela de Prevencao e o chat usam UM SO cliente e UM SO filtro
 * da USPSTF (spec do E7, CA-1 e CA-3). Duas copias do filtro divergiriam em
 * silencio, e a mesma pessoa veria uma lista na tela e outra na conversa --
 * o defeito que a D7.1 = A existe para impedir.
 *
 * O teste olha o codigo, e nao so o comportamento, de proposito: duas copias
 * identicas hoje passariam em qualquer teste de comportamento, e so
 * divergiriam no dia em que alguem corrigisse uma delas.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const FUNCOES = join(__dirname, '..', '..');
const PASTA_DA_TELA = join(FUNCOES, 'get-prevention-recommendations');

describe('uspstf-shared e a unica copia do cliente e do filtro', () => {
  it('a Lambda da tela importa o filtro e o cliente do modulo compartilhado', () => {
    const handler = readFileSync(join(PASTA_DA_TELA, 'handler.ts'), 'utf8');

    expect(handler).toMatch(/from '\.\.\/uspstf-shared\/uspstfFilter'/);
    expect(handler).toMatch(/from '\.\.\/uspstf-shared\/uspstfClient'/);
  });

  it('o chat importa o filtro e o cliente do mesmo modulo', () => {
    const ferramenta = readFileSync(join(FUNCOES, 'chat-assistant', 'tools', 'prevencao.ts'), 'utf8');
    const cache = readFileSync(join(FUNCOES, 'chat-assistant', 'tools', 'prevencaoDataset.ts'), 'utf8');

    expect(ferramenta).toMatch(/from '\.\.\/\.\.\/uspstf-shared\/uspstfFilter'/);
    expect(cache).toMatch(/from '\.\.\/\.\.\/uspstf-shared\/uspstfClient'/);
  });

  it('nao sobrou copia na pasta antiga', () => {
    expect(existsSync(join(PASTA_DA_TELA, 'uspstfFilter.ts'))).toBe(false);
    expect(existsSync(join(PASTA_DA_TELA, 'uspstfClient.ts'))).toBe(false);
  });
});
