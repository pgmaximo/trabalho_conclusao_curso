/**
 * Resumo do arquivo:
 * As paginas publicas (scripts/site-publico/paginas.mjs) sao o que o Google
 * mostra como politica de privacidade do login com Google. Este teste garante
 * que elas carregam o termo INTEIRO que o aplicativo mostra -- uma secao que
 * sumisse da pagina publica nao apareceria em nenhuma outra checagem.
 */
import {
  CANAL_DE_PRIVACIDADE,
  TERMOS_E_PRIVACIDADE,
  VERSAO_DOS_TERMOS,
  VIGENCIA_DOS_TERMOS,
} from '../src/data/termosEPrivacidade';
import { gerarPaginas } from '../scripts/site-publico/paginas.mjs';

const DADOS = {
  partes: TERMOS_E_PRIVACIDADE,
  versao: VERSAO_DOS_TERMOS,
  vigencia: VIGENCIA_DOS_TERMOS,
  contato: CANAL_DE_PRIVACIDADE,
};

const escapar = (texto: string) =>
  texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function parte(titulo: string) {
  const achada = TERMOS_E_PRIVACIDADE.find((p) => p.titulo === titulo);
  if (!achada) throw new Error(`Parte ausente nos dados: ${titulo}`);
  return achada;
}

describe('paginas publicas do SuaSaude', () => {
  const paginas = gerarPaginas(DADOS);

  it('gera exatamente as tres paginas cadastradas no Google', () => {
    expect(Object.keys(paginas).sort()).toEqual(['index.html', 'privacidade.html', 'termos.html']);
  });

  it.each([
    ['privacidade.html', 'Política de Privacidade'],
    ['termos.html', 'Termos de Uso'],
  ])('%s traz toda secao e todo paragrafo de "%s"', (arquivo, titulo) => {
    const html = paginas[arquivo];
    for (const secao of parte(titulo).secoes) {
      expect(html).toContain(`${secao.numero}. ${escapar(secao.titulo)}`);
      for (const bloco of secao.blocos) {
        for (const texto of typeof bloco === 'string' ? [bloco] : bloco) {
          // O e-mail de contato vira link, entao confere o texto em volta dele.
          for (const pedaco of texto.split(CANAL_DE_PRIVACIDADE)) expect(html).toContain(escapar(pedaco));
        }
      }
    }
    expect(html).toContain(`Versão ${VERSAO_DOS_TERMOS} · vigente desde ${VIGENCIA_DOS_TERMOS}`);
  });

  it('a pagina inicial leva as duas outras e ao canal de privacidade', () => {
    expect(paginas['index.html']).toContain('href="privacidade.html"');
    expect(paginas['index.html']).toContain('href="termos.html"');
    expect(paginas['index.html']).toContain(`mailto:${CANAL_DE_PRIVACIDADE}`);
  });

  it('escapa o texto dos dados em vez de interpreta-lo como HTML', () => {
    const html = gerarPaginas({
      ...DADOS,
      partes: TERMOS_E_PRIVACIDADE.map((p) => ({
        ...p,
        secoes: [{ numero: 1, titulo: 'A <b>', blocos: ['<script>alert(1)</script>'] }],
      })),
    })['privacidade.html'];
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('falha se uma das partes for renomeada, em vez de publicar pagina vazia', () => {
    expect(() =>
      gerarPaginas({ ...DADOS, partes: TERMOS_E_PRIVACIDADE.filter((p) => p.titulo !== 'Termos de Uso') }),
    ).toThrow(/Termos de Uso/);
  });
});
