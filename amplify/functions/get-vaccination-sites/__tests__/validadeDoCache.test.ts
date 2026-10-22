/**
 * A validade do cache de postos mora num lugar so (E8). O chat calcula a data
 * em que a lista foi gravada como `expiresAt - validade`; se a Lambda da tela
 * gravasse com um numero e o chat descontasse outro, a data mostrada a pessoa
 * ficaria errada sem que nada falhasse.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { VALIDADE_DO_CACHE_DE_POSTOS_S } from '../validadeDoCache';

describe('validade do cache de postos', () => {
  it('e de 7 dias', () => {
    expect(VALIDADE_DO_CACHE_DE_POSTOS_S).toBe(604800);
  });

  it('o handler da tela grava com essa constante, e nao com um numero proprio', () => {
    const handler = readFileSync(join(__dirname, '..', 'handler.ts'), 'utf8');
    expect(handler).toContain("import { VALIDADE_DO_CACHE_DE_POSTOS_S } from './validadeDoCache'");
    expect(handler).not.toMatch(/7\s*\*\s*24\s*\*\s*60\s*\*\s*60/);
  });
});
