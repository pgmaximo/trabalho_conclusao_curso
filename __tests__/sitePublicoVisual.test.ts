/**
 * Resumo do arquivo:
 * O visual novo do site da feira e as paginas que o QR code abre
 * (`baixar.html`, `opiniao.html`, `resultados.html`), geradas por
 * scripts/site-publico/paginas.mjs. O teste existente (sitePublico.test.ts)
 * garante que os documentos legais seguem inteiros; este garante o que e novo:
 * o hero cabe na tela, o download esta nos dois lugares, nenhuma pagina aponta
 * para um arquivo que nao vai no zip e as paginas escritas por nos seguem as
 * regras de texto do spec (docs/superpowers/specs/2026-10-24-site-feira-pesquisa-design.md).
 */
import {
  CANAL_DE_PRIVACIDADE,
  TERMOS_E_PRIVACIDADE,
  VERSAO_DOS_TERMOS,
  VIGENCIA_DOS_TERMOS,
} from '../src/data/termosEPrivacidade';
import { ATIVOS } from '../scripts/site-publico/ativos.mjs';
import { gerarPaginas } from '../scripts/site-publico/paginas.mjs';

const APK = { url: 'https://expo.dev/artifacts/eas/abc.apk?x=1&y=2', tamanhoEmMb: 113 };
const ENDERECO = 'https://abc123.lambda-url.us-east-1.on.aws/';
const DADOS = {
  partes: TERMOS_E_PRIVACIDADE,
  versao: VERSAO_DOS_TERMOS,
  vigencia: VIGENCIA_DOS_TERMOS,
  contato: CANAL_DE_PRIVACIDADE,
  apk: APK,
};

const completo = gerarPaginas({ ...DADOS, pesquisa: { endpoint: ENDERECO } });
const semPesquisa = gerarPaginas(DADOS);
const PAGINAS_NOVAS = ['index.html', 'baixar.html', 'opiniao.html', 'resultados.html'];

const textoDe = (html: string, seletor: RegExp) => (html.match(seletor)?.[1] ?? '').replace(/<[^>]+>/g, '').trim();

describe('o site completo (download + pesquisa)', () => {
  it('gera as seis paginas, e sem pesquisa continua com as quatro de antes', () => {
    expect(Object.keys(completo).sort()).toEqual([
      'baixar.html',
      'index.html',
      'opiniao.html',
      'privacidade.html',
      'resultados.html',
      'termos.html',
    ]);
    expect(Object.keys(semPesquisa).sort()).toEqual(['baixar.html', 'index.html', 'privacidade.html', 'termos.html']);
  });

  it('baixar.html: o botao principal leva ao APK e conta o clique como "inicio"', () => {
    const botao = completo['baixar.html'].match(/<a[^>]*data-baixar="inicio"[^>]*>([^<]*)<\/a>/);
    expect(botao).not.toBeNull();
    expect(botao![0]).toContain('href="https://expo.dev/artifacts/eas/abc.apk?x=1&amp;y=2"');
    expect(botao![1]).toBe('Baixar o app');
  });

  it('baixar.html: leva a pesquisa, e so quando ela existe', () => {
    expect(completo['baixar.html']).toContain('href="opiniao.html"');
    expect(semPesquisa['baixar.html']).not.toContain('opiniao.html');
    expect(semPesquisa['baixar.html']).not.toContain('pesquisa-endpoint');
  });

  it('baixar.html: o hero cabe na tela (titulo curto, subtexto de ate 20 palavras)', () => {
    const titulo = textoDe(completo['baixar.html'], /<h1[^>]*>([\s\S]*?)<\/h1>/);
    const subtexto = textoDe(completo['baixar.html'], /<p class="lead">([\s\S]*?)<\/p>/);
    expect(titulo.length).toBeGreaterThan(0);
    expect(titulo.length).toBeLessThanOrEqual(60);
    expect(subtexto.split(/\s+/).length).toBeLessThanOrEqual(20);
  });

  it('baixar.html: mostra o print real do app, com texto alternativo e tamanho fixo', () => {
    const imagem = completo['baixar.html'].match(/<img[^>]*src="telas\/inicio\.png"[^>]*>/)?.[0] ?? '';
    expect(imagem).toMatch(/alt="[^"]{10,}"/);
    expect(imagem).toMatch(/width="\d+"/);
    expect(imagem).toMatch(/height="\d+"/);
  });

  it('baixar.html: avisa quem esta no iPhone e mantem a instalacao em passos', () => {
    expect(completo['baixar.html']).toContain('Só para Android');
    expect(completo['baixar.html']).toContain('aviso-iphone');
    expect(completo['baixar.html']).toContain('<ol class="passos">');
    expect(completo['baixar.html']).toContain('Arquivo de 113 MB');
  });

  it('as paginas que chamam a pesquisa guardam o endereco dela numa meta', () => {
    for (const pagina of ['baixar.html', 'opiniao.html', 'resultados.html']) {
      expect(completo[pagina]).toContain(`<meta name="pesquisa-endpoint" content="${ENDERECO}">`);
    }
  });

  it('toda referencia a arquivo, nas paginas e no estilo, existe no zip ou e outra pagina', () => {
    // "./" e a pagina inicial (o link da marca no cabecalho).
    const conhecidos = new Set(['./', ...Object.keys(ATIVOS), ...Object.keys(completo)]);
    for (const [nome, html] of Object.entries(completo)) {
      const referencias = [
        ...[...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]),
        ...[...html.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)].map((m) => m[1]),
      ].filter((r) => !/^(https?:|mailto:|#|data:)/.test(r));
      for (const referencia of referencias) {
        expect({ pagina: nome, referencia, existe: conhecidos.has(referencia.split(/[?#]/)[0]) }).toEqual({
          pagina: nome,
          referencia,
          existe: true,
        });
      }
    }
  });

  it('usa a fonte do app, o tema escuro do sistema e respeita movimento reduzido', () => {
    for (const nome of PAGINAS_NOVAS) {
      expect(completo[nome]).toContain('IBM Plex Sans');
      expect(completo[nome]).toContain('prefers-color-scheme:dark');
      expect(completo[nome]).toContain('prefers-reduced-motion');
    }
  });

  it('as paginas escritas por nos nao tem travessao, en-dash nem ponto medio como separador', () => {
    for (const nome of PAGINAS_NOVAS) {
      expect({ nome, travessao: /[—–]/.test(completo[nome]) }).toEqual({ nome, travessao: false });
      expect({ nome, pontoMedio: completo[nome].includes('·') }).toEqual({ nome, pontoMedio: false });
    }
  });

  it('a pagina inicial segue levando aos documentos, ao canal de privacidade e ao download', () => {
    expect(completo['index.html']).toContain('href="privacidade.html"');
    expect(completo['index.html']).toContain('href="termos.html"');
    expect(completo['index.html']).toContain(`mailto:${CANAL_DE_PRIVACIDADE}`);
    expect(completo['index.html']).toContain('href="baixar.html"');
  });

  it('o cabecalho usa a marca do app e leva a pagina inicial; nenhuma pagina vai sem ele', () => {
    for (const [nome, html] of Object.entries(completo)) {
      expect({ nome, marca: html.includes('src="marca.png"') }).toEqual({ nome, marca: true });
      expect(html).toContain('href="./"');
    }
  });

  it('o rodape dos documentos nao ganha ponto medio novo alem do que ja existia no texto legal', () => {
    const rodape = completo['privacidade.html'].match(/<footer>[\s\S]*<\/footer>/)![0];
    expect(rodape).not.toContain('·');
  });
});
