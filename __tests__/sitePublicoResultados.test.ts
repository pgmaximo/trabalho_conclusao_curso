/**
 * Resumo do arquivo:
 * A pagina do painel (`resultados.html`) como o gerador a produz. Ela e so do
 * grupo: nao entra em buscador, nao tem link em nenhuma outra pagina e nao traz
 * a senha. O comportamento dela no navegador esta em
 * sitePublicoResultadosNavegador.test.ts.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  CANAL_DE_PRIVACIDADE,
  TERMOS_E_PRIVACIDADE,
  VERSAO_DOS_TERMOS,
  VIGENCIA_DOS_TERMOS,
} from '../src/data/termosEPrivacidade';
import { ATIVOS } from '../scripts/site-publico/ativos.mjs';
import { gerarPaginas } from '../scripts/site-publico/paginas.mjs';

const paginas = gerarPaginas({
  partes: TERMOS_E_PRIVACIDADE,
  versao: VERSAO_DOS_TERMOS,
  vigencia: VIGENCIA_DOS_TERMOS,
  contato: CANAL_DE_PRIVACIDADE,
  apk: { url: 'https://expo.dev/artifacts/eas/abc.apk', tamanhoEmMb: 113 },
  pesquisa: { endpoint: 'https://abc123.lambda-url.us-east-1.on.aws/' },
});
const html = paginas['resultados.html'];

describe('resultados.html', () => {
  it('nao entra em buscador e nenhuma outra pagina leva a ela', () => {
    expect(html).toContain('<meta name="robots" content="noindex">');
    for (const [nome, outra] of Object.entries(paginas)) {
      if (nome !== 'resultados.html') expect({ nome, linka: outra.includes('resultados.html') }).toEqual({ nome, linka: false });
    }
  });

  it('pede a senha do grupo num campo de senha com rotulo, sem valor pre-preenchido', () => {
    expect(html).toMatch(/<label[^>]*for="chave"[^>]*>Senha do grupo<\/label>/);
    const campo = html.match(/<input[^>]*id="chave"[^>]*>/)?.[0] ?? '';
    expect(campo).toContain('type="password"');
    expect(campo).not.toMatch(/\svalue=/);
    expect(html).toMatch(/<button[^>]*id="entrar"[^>]*>Entrar<\/button>/);
  });

  it('traz o painel escondido, com os botoes de atualizar, baixar CSV e sair', () => {
    expect(html).toMatch(/<[^>]*id="painel"[^>]*hidden/);
    for (const id of ['atualizar', 'baixar-csv', 'sair']) expect(html).toContain(`id="${id}"`);
  });

  it('avisa que sao poucas respostas e que o publico da feira tende a ser gentil', () => {
    expect(html).toContain('indicação, não como prova');
    expect(html).toContain('gentil');
  });

  it('carrega o modulo do painel, e ele e os que ele usa estao no zip', () => {
    expect(html).toContain('<script type="module" src="js/resultados.js"></script>');
    for (const nome of ['js/resultados.js', 'js/agregar.js', 'js/pesquisa.js', 'js/comum.js']) {
      expect(Object.keys(ATIVOS)).toContain(nome);
    }
    expect((ATIVOS as Record<string, string>)['js/agregar.js']).toBe('infra/site-pesquisa/agregar.mjs');
  });

  it('o script do painel nunca escreve HTML e nao guarda senha nenhuma no codigo', () => {
    const fonte = readFileSync(path.join(__dirname, '..', (ATIVOS as Record<string, string>)['js/resultados.js']), 'utf8');
    expect(fonte).not.toContain('innerHTML');
    expect(fonte).toContain('sessionStorage');
    expect(fonte).not.toContain('localStorage');
  });
});
