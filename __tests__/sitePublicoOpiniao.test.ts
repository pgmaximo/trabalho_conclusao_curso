/**
 * Resumo do arquivo:
 * A pagina da pesquisa de opiniao (`opiniao.html`) e os modulos de navegador
 * que ela carrega. O visual e o resto do site estao em sitePublicoVisual.test.ts
 * e a logica de cada toque em pesquisaFluxo.test.ts; aqui ficam o que so a
 * pagina promete: a abertura, o aviso de anonimato, o recomeco quando o envio
 * falha, o download no fim e a garantia de que o navegador consegue carregar
 * tudo o que ela importa.
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

const APK = { url: 'https://expo.dev/artifacts/eas/abc.apk?x=1&y=2', tamanhoEmMb: 113 };
const DADOS = {
  partes: TERMOS_E_PRIVACIDADE,
  versao: VERSAO_DOS_TERMOS,
  vigencia: VIGENCIA_DOS_TERMOS,
  contato: CANAL_DE_PRIVACIDADE,
  pesquisa: { endpoint: 'https://abc123.lambda-url.us-east-1.on.aws/' },
};
const comApk = gerarPaginas({ ...DADOS, apk: APK })['opiniao.html'];
const semApk = gerarPaginas(DADOS)['opiniao.html'];

const RAIZ = path.join(__dirname, '..');
const fonteDe = (publicado: string) => readFileSync(path.join(RAIZ, (ATIVOS as Record<string, string>)[publicado]), 'utf8');

describe('opiniao.html', () => {
  it('abre com o texto do spec, que avisa que a pessoa acabou de conhecer o app', () => {
    expect(comApk).toContain(
      'Você acabou de conhecer o SuaSaúde. Conte o que achou. Leva 1 minuto e não pedimos nome nem e-mail.',
    );
    expect(comApk).toContain('id="comecar"');
  });

  it('diz que a pesquisa e anonima e que nao guarda o IP', () => {
    expect(comApk).toContain('anônima');
    expect(comApk).toContain('não guardamos o seu IP');
  });

  it('carrega o modulo da pagina e tem a barra de progresso acessivel', () => {
    expect(comApk).toContain('<script type="module" src="js/opiniao.js"></script>');
    expect(comApk).toMatch(/role="progressbar"[^>]*aria-label="[^"]+"/);
    expect(comApk).toContain('aria-live="polite"');
  });

  it('tem o aviso de erro de envio com o botao "Tentar de novo", escondido ate precisar', () => {
    expect(comApk).toMatch(/<[^>]*id="erro"[^>]*role="alert"[^>]*hidden/);
    expect(comApk).toMatch(/<button[^>]*id="tentar-de-novo"[^>]*>Tentar de novo<\/button>/);
  });

  it('no fim agradece e repete o botao de download, com a origem "fim"', () => {
    const botao = comApk.match(/<a[^>]*data-baixar="fim"[^>]*>([^<]*)<\/a>/);
    expect(botao).not.toBeNull();
    expect(botao![0]).toContain('href="https://expo.dev/artifacts/eas/abc.apk?x=1&amp;y=2"');
    expect(botao![1]).toBe('Baixar o app');
    expect(comApk).toContain('href="baixar.html"');
  });

  it('sem APK nos dados, a tela final agradece e nao oferece download', () => {
    expect(semApk).not.toContain('data-baixar');
    expect(semApk).toContain('id="fim"');
  });

  it('o deslize entre as telas so existe para quem nao pediu movimento reduzido', () => {
    expect(comApk).toContain('@media (prefers-reduced-motion:no-preference)');
    expect(comApk).toContain('@keyframes entra');
  });

  it('cada opcao tem 56 px ou mais de altura de toque', () => {
    expect(comApk).toMatch(/\.opcao\{[^}]*min-height:56px/);
  });
});

describe('os modulos de navegador no zip', () => {
  const modulos = Object.keys(ATIVOS).filter((nome) => nome.startsWith('js/'));

  it('os modulos de infra sobem como .js, porque o navegador so carrega modulo com tipo de JavaScript', () => {
    expect((ATIVOS as Record<string, string>)['js/pesquisa.js']).toBe('infra/site-pesquisa/pesquisa.mjs');
    expect((ATIVOS as Record<string, string>)['js/fluxo.js']).toBe('infra/site-pesquisa/fluxo.mjs');
    expect(modulos).toContain('js/opiniao.js');
  });

  it.each(modulos)('%s so importa modulos que tambem estao no zip', (nome) => {
    const fonte = fonteDe(nome);
    for (const [, especificador] of fonte.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      expect(especificador).toMatch(/^\.\/[\w-]+\.js$/);
      expect({ de: nome, importa: especificador, noZip: `js/${especificador.slice(2)}` in ATIVOS }).toEqual({
        de: nome,
        importa: especificador,
        noZip: true,
      });
    }
  });

  it.each(modulos)('%s nunca escreve HTML de fora na pagina (nada de innerHTML)', (nome) => {
    expect(fonteDe(nome)).not.toContain('innerHTML');
  });

  it('os modulos do navegador nao carregam nada do Node', () => {
    for (const nome of modulos) expect(fonteDe(nome)).not.toMatch(/from\s+['"]node:/);
  });
});
