/**
 * Resumo do arquivo:
 * Os arquivos que vao no zip do site (scripts/site-publico/ativos.mjs) existem de
 * verdade no repositorio, e o print do app no topo de `baixar.html` tem o tamanho
 * e a proporcao que a pagina promete. Sem isto, um arquivo que sumisse ou um print
 * trocado por outro formato so apareceria depois de publicado, como imagem quebrada
 * na pagina do QR code.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { ATIVOS } from '../scripts/site-publico/ativos.mjs';

const RAIZ = path.join(__dirname, '..');
const origemDe = (publicado: string) => path.join(RAIZ, (ATIVOS as Record<string, string>)[publicado]);

describe('os arquivos do zip do site', () => {
  it.each(Object.keys(ATIVOS))('%s existe no repositorio', (publicado) => {
    expect({ publicado, existe: existsSync(origemDe(publicado)) }).toEqual({ publicado, existe: true });
  });
});

describe('o print do app no topo de baixar.html', () => {
  const arquivo = origemDe('telas/inicio.png');

  it('e um PNG com a proporcao de um celular (390 por 844) e largura de pelo menos 390 px', () => {
    const cabecalho = readFileSync(arquivo).subarray(0, 24);
    expect(cabecalho.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    const largura = cabecalho.readUInt32BE(16);
    const altura = cabecalho.readUInt32BE(20);
    expect(largura).toBeGreaterThanOrEqual(390);
    expect(Math.abs(largura / altura - 390 / 844)).toBeLessThan(0.005);
  });

  it('pesa menos de 450 KB, porque a pagina abre no 4G da feira', () => {
    expect(statSync(arquivo).size).toBeLessThan(450 * 1024);
  });
});
