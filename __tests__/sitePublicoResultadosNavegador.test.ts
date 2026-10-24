/**
 * @jest-environment jsdom
 */
/**
 * Resumo do arquivo:
 * O script do painel (scripts/site-publico/cliente/resultados.js) rodando de
 * verdade num DOM simulado: pedir a senha, mostrar o que a Lambda devolve, nunca
 * transformar comentario de visitante em HTML, guardar a senha so na aba e
 * baixar o CSV. As contas em si estao em pesquisaAgregar.test.ts; aqui se confere
 * o que a pessoa le na tela.
 *
 * `agregar.js` e `pesquisa.js` so existem no zip do site (sao os .mjs de
 * infra/site-pesquisa publicados com outro nome), entao aqui apontam para eles.
 */
import {
  CANAL_DE_PRIVACIDADE,
  TERMOS_E_PRIVACIDADE,
  VERSAO_DOS_TERMOS,
  VIGENCIA_DOS_TERMOS,
} from '../src/data/termosEPrivacidade';
import { gerarPaginas } from '../scripts/site-publico/paginas.mjs';

jest.mock('../scripts/site-publico/cliente/agregar.js', () => jest.requireActual('../infra/site-pesquisa/agregar.mjs'), {
  virtual: true,
});
jest.mock(
  '../scripts/site-publico/cliente/pesquisa.js',
  () => jest.requireActual('../infra/site-pesquisa/pesquisa.mjs'),
  { virtual: true },
);

const ENDERECO = 'https://abc123.lambda-url.us-east-1.on.aws/';
const HTML = gerarPaginas({
  partes: TERMOS_E_PRIVACIDADE,
  versao: VERSAO_DOS_TERMOS,
  vigencia: VIGENCIA_DOS_TERMOS,
  contato: CANAL_DE_PRIVACIDADE,
  pesquisa: { endpoint: ENDERECO },
})['resultados.html'];

const resposta = (id: string, respostas: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  id,
  tipo: 'resposta',
  versaoDoFormulario: '1',
  criadoEm: '2026-10-24T15:00:00.000Z',
  atualizadoEm: '2026-10-24T15:00:00.000Z',
  etapa: 11,
  concluido: true,
  respostas,
  ...extra,
});
const ITENS = [
  resposta('a', {
    idade: '18_24',
    usaria: 'usaria_muito',
    impressao: 'gostei_muito',
    chamaram_atencao: ['exames', 'agenda'],
    comentario: '<img src=x onerror=alert(1)>',
  }),
  resposta('b', { idade: '18_24', usaria: 'nao_sei', impressao: 'gostei' }),
  resposta('c', { idade: '60_mais', usaria: 'usaria' }, { concluido: false, etapa: 3 }),
  { id: 'clique-1', tipo: 'clique', origem: 'inicio', criadoEm: '2026-10-24T15:00:00.000Z' },
  { id: 'clique-2', tipo: 'clique', origem: 'fim', criadoEm: '2026-10-24T15:00:00.000Z' },
];

type Resposta = { ok: boolean; status: number; json: () => Promise<unknown> };
let fetchMock: jest.Mock;
const dar = (itens: unknown[]): Resposta => ({ ok: true, status: 200, json: async () => ({ itens }) });
const negar = (): Resposta => ({ ok: false, status: 401, json: async () => ({ erro: 'Chave inválida.' }) });

async function abrirPagina() {
  const documento = new DOMParser().parseFromString(HTML, 'text/html');
  document.head.innerHTML = documento.head.innerHTML;
  document.body.innerHTML = documento.body.innerHTML;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../scripts/site-publico/cliente/resultados.js');
  });
  await jest.advanceTimersByTimeAsync(0);
}

const visivel = (id: string) => !(document.getElementById(id) as HTMLElement).hidden;
const clicar = (id: string) => document.getElementById(id)!.click();
async function entrar(senha: string) {
  (document.getElementById('chave') as HTMLInputElement).value = senha;
  clicar('entrar');
  await jest.advanceTimersByTimeAsync(0);
}
const painel = () => document.getElementById('painel')!;
const linha = (texto: string) =>
  [...painel().querySelectorAll('.linha-barra')].find((l) => l.querySelector('.rotulo')?.textContent === texto);

beforeEach(() => {
  jest.useFakeTimers();
  window.sessionStorage.clear();
  fetchMock = jest.fn(async () => dar(ITENS));
  Object.defineProperty(window, 'fetch', { value: fetchMock, configurable: true, writable: true });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('o painel no navegador', () => {
  it('comeca pedindo a senha, com o painel escondido e nenhuma chamada a rede', async () => {
    await abrirPagina();
    expect(visivel('entrada')).toBe(true);
    expect(visivel('painel')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('senha errada mostra "Senha incorreta." e nao guarda nada', async () => {
    fetchMock.mockResolvedValueOnce(negar());
    await abrirPagina();
    await entrar('errada');
    expect(document.getElementById('erro-entrada')!.textContent).toBe('Senha incorreta.');
    expect(visivel('erro-entrada')).toBe(true);
    expect(visivel('painel')).toBe(false);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('manda a senha so no cabecalho x-chave e pede a lista', async () => {
    await abrirPagina();
    await entrar('a-senha-certa');
    const [endereco, pedido] = fetchMock.mock.calls[0];
    expect(endereco).toBe(ENDERECO);
    expect(pedido.headers['x-chave']).toBe('a-senha-certa');
    expect(JSON.parse(pedido.body)).toEqual({ acao: 'listar' });
    expect(pedido.body).not.toContain('a-senha-certa');
  });

  it('falha de rede mostra um aviso que nao culpa a senha', async () => {
    fetchMock.mockRejectedValueOnce(new Error('sem rede'));
    await abrirPagina();
    await entrar('qualquer-uma');
    expect(document.getElementById('erro-entrada')!.textContent).toContain('Não foi possível carregar');
    expect(document.getElementById('erro-entrada')!.textContent).not.toContain('incorreta');
  });

  it('com a senha certa mostra os totais, as barras com contagem e a base de cada pergunta', async () => {
    await abrirPagina();
    await entrar('a-senha-certa');
    expect(visivel('painel')).toBe(true);
    expect(visivel('entrada')).toBe(false);
    const totais = [...painel().querySelectorAll('.total')].map((t) => t.textContent);
    expect(totais).toEqual(['3Respostas', '2Concluídas', '1Baixar (início)', '1Baixar (fim)']);
    expect(linha('Usaria muito')!.querySelector('.numero')!.textContent).toBe('1 (33%)');
    expect(linha('Não usaria')!.querySelector('.numero')!.textContent).toBe('0 (0%)');
    expect(painel().textContent).toContain('3 pessoas responderam');
    expect(linha('Exames e receitas')!.querySelector('.numero')!.textContent).toBe('1 (100%)');
  });

  it('lista as funcionalidades que mais chamaram atencao da mais citada para a menos citada', async () => {
    await abrirPagina();
    await entrar('a-senha-certa');
    const secao = [...painel().querySelectorAll('.painel-secao')].find(
      (s) => s.querySelector('h2')?.textContent === 'Quais funcionalidades mais chamaram a sua atenção?',
    )!;
    const rotulos = [...secao.querySelectorAll('.rotulo')].map((r) => r.textContent);
    expect(rotulos.slice(0, 2)).toEqual(['Exames e receitas', 'Agenda de consultas']);
    expect(rotulos).toHaveLength(8);
  });

  it('as barras nao tem trilha de fundo: so uma barra com a largura da fatia', async () => {
    await abrirPagina();
    await entrar('a-senha-certa');
    const barra = linha('Usaria muito')!.querySelector('.barra') as HTMLElement;
    expect(barra.style.width).toBe('33%');
    expect(painel().querySelector('.trilha')).toBeNull();
  });

  it('cruza a faixa de idade com quem usaria ou usaria muito', async () => {
    await abrirPagina();
    await entrar('a-senha-certa');
    const linhas = [...painel().querySelectorAll('.cruzamento tbody tr')].map((tr) => tr.textContent);
    expect(linhas).toEqual(['18 a 242 pessoas1 (50%)', '60 anos ou mais1 pessoa1 (100%)']);
  });

  it('mostra o comentario do visitante como texto, nunca como HTML', async () => {
    await abrirPagina();
    await entrar('a-senha-certa');
    expect(painel().textContent).toContain('<img src=x onerror=alert(1)>');
    expect(painel().querySelector('img')).toBeNull();
    expect(document.querySelector('[onerror]')).toBeNull();
  });

  it('guarda a senha so nesta aba e, ao recarregar, entra sem pedir de novo', async () => {
    await abrirPagina();
    await entrar('a-senha-certa');
    expect(window.sessionStorage.length).toBe(1);
    expect(window.localStorage.length).toBe(0);
    fetchMock.mockClear();
    await abrirPagina();
    expect(visivel('painel')).toBe(true);
    expect(fetchMock.mock.calls[0][1].headers['x-chave']).toBe('a-senha-certa');
  });

  it('se a senha guardada deixou de valer, volta a pedir a senha e esquece a antiga', async () => {
    window.sessionStorage.setItem('suasaude-chave', 'velha');
    fetchMock.mockResolvedValueOnce(negar());
    await abrirPagina();
    expect(visivel('entrada')).toBe(true);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('"Atualizar" pede a lista de novo e "Sair" esquece a senha e volta a entrada', async () => {
    await abrirPagina();
    await entrar('a-senha-certa');
    clicar('atualizar');
    await jest.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    clicar('sair');
    expect(visivel('entrada')).toBe(true);
    expect(visivel('painel')).toBe(false);
    expect(window.sessionStorage.length).toBe(0);
    expect((document.getElementById('chave') as HTMLInputElement).value).toBe('');
  });

  it('"Baixar CSV" entrega um arquivo .csv com os dados', async () => {
    const criar = jest.fn(() => 'blob:falso');
    // O ambiente de teste do Expo instala um `URL` proprio que nao funciona no jsdom: troca-se o global inteiro.
    Object.defineProperty(window, 'URL', {
      value: { createObjectURL: criar, revokeObjectURL: jest.fn() },
      configurable: true,
      writable: true,
    });
    // O arquivo deve comecar com o BOM, ou o Excel le os acentos errado.
    const partes: unknown[][] = [];
    const BlobOriginal = window.Blob;
    Object.defineProperty(window, 'Blob', {
      configurable: true,
      writable: true,
      value: class extends BlobOriginal {
        constructor(p?: BlobPart[], o?: BlobPropertyBag) {
          super(p, o);
          partes.push(p ?? []);
        }
      },
    });
    const clique = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('respostas-suasaude.csv');
      expect(this.href).toBe('blob:falso');
    });
    await abrirPagina();
    await entrar('a-senha-certa');
    clicar('baixar-csv');
    expect(clique).toHaveBeenCalledTimes(1);
    const arquivo = (criar.mock.calls[0] as unknown[])[0] as Blob;
    expect(arquivo.type).toBe('text/csv;charset=utf-8');
    expect(arquivo.size).toBeGreaterThan(100);
    expect(partes[0][0]).toBe(String.fromCharCode(0xfeff));
    expect(String(partes[0][1]).split(String.fromCharCode(13, 10))[0]).toContain('Telas respondidas');
    Object.defineProperty(window, 'Blob', { value: BlobOriginal, configurable: true, writable: true });
  });
});
