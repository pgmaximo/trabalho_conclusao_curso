/**
 * @jest-environment jsdom
 */
/**
 * Resumo do arquivo:
 * O script da pesquisa (scripts/site-publico/cliente/opiniao.js) rodando de
 * verdade, num DOM simulado, contra o HTML que o gerador produz. Cobre o que os
 * testes de funcao pura nao alcancam: o que a pessoa ve a cada toque, o que vai
 * para a rede e em que ordem, o que acontece quando o envio falha e quando a aba
 * e recarregada. A conferencia visual e de movimento fica para o navegador de
 * verdade (bloco 5 do plano).
 *
 * `fluxo.js` e `pesquisa.js` so existem no zip do site (sao os .mjs de
 * infra/site-pesquisa publicados com outro nome), entao aqui apontam para eles.
 */
import {
  CANAL_DE_PRIVACIDADE,
  TERMOS_E_PRIVACIDADE,
  VERSAO_DOS_TERMOS,
  VIGENCIA_DOS_TERMOS,
} from '../src/data/termosEPrivacidade';
import { gerarPaginas } from '../scripts/site-publico/paginas.mjs';

jest.mock('../scripts/site-publico/cliente/fluxo.js', () => jest.requireActual('../infra/site-pesquisa/fluxo.mjs'), {
  virtual: true,
});
jest.mock(
  '../scripts/site-publico/cliente/pesquisa.js',
  () => jest.requireActual('../infra/site-pesquisa/pesquisa.mjs'),
  { virtual: true },
);

const ID = '3f2b8c1e-9a47-4d6b-8e15-0c7a1d2f4b69';
const ENDERECO = 'https://abc123.lambda-url.us-east-1.on.aws/';
const APK = { url: 'https://expo.dev/artifacts/eas/abc.apk', tamanhoEmMb: 113 };
const HTML = gerarPaginas({
  partes: TERMOS_E_PRIVACIDADE,
  versao: VERSAO_DOS_TERMOS,
  vigencia: VIGENCIA_DOS_TERMOS,
  contato: CANAL_DE_PRIVACIDADE,
  apk: APK,
  pesquisa: { endpoint: ENDERECO },
})['opiniao.html'];

type Resposta = { ok: boolean; status: number; json: () => Promise<unknown> };
const sucesso = (): Resposta => ({ ok: true, status: 200, json: async () => ({ ok: true }) });

let fetchMock: jest.Mock;

// O script roda inteiro ao ser carregado (e como um modulo de navegador), entao cada abertura
// de pagina e um carregamento novo dele: modulos isolados, DOM refeito.
async function abrirPagina() {
  const documento = new DOMParser().parseFromString(HTML, 'text/html');
  document.head.innerHTML = documento.head.innerHTML;
  document.body.innerHTML = documento.body.innerHTML;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../scripts/site-publico/cliente/opiniao.js');
  });
}

const visivel = (id: string) => !(document.getElementById(id) as HTMLElement).hidden;
const legenda = () => document.querySelector('legend')?.textContent;
const rotulos = () => [...document.querySelectorAll<HTMLLabelElement>('label.opcao')];
const rotulo = (texto: string) => {
  const achado = rotulos().find((l) => l.textContent === texto);
  if (!achado) throw new Error(`Opcao ausente: ${texto}`);
  return achado;
};
const botao = (texto: string) => {
  const achado = [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === texto);
  if (!achado) throw new Error(`Botao ausente: ${texto}`);
  return achado;
};
const clicar = (elemento: Element) => (elemento as HTMLElement).click();
const marcar = (texto: string) => clicar(rotulo(texto).querySelector('input')!);
const esperar = (ms: number) => jest.advanceTimersByTimeAsync(ms);
const corposEnviados = () => fetchMock.mock.calls.map(([, pedido]) => JSON.parse(pedido.body));

async function responderEscolhaUnica(texto: string) {
  marcar(texto);
  await esperar(300);
}

/** Responde as 11 perguntas, sempre com a primeira opcao. */
async function responderTudo() {
  clicar(document.getElementById('comecar')!);
  for (let tela = 0; tela < 11; tela += 1) {
    const unica = document.querySelector('input[type="radio"]');
    const caixa = document.querySelector('input[type="checkbox"]');
    if (unica) {
      clicar(unica);
      await esperar(300);
    } else if (caixa) {
      clicar(caixa);
      clicar(botao('Continuar'));
      await esperar(0);
    } else {
      clicar(botao('Enviar respostas'));
      await esperar(0);
    }
  }
}

beforeEach(() => {
  jest.useFakeTimers();
  window.sessionStorage.clear();
  fetchMock = jest.fn(async () => sucesso());
  Object.defineProperty(window, 'fetch', { value: fetchMock, configurable: true, writable: true });
  Object.defineProperty(window, 'crypto', {
    value: { randomUUID: () => ID, getRandomValues: (a: Uint8Array) => a },
    configurable: true,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('a pesquisa no navegador', () => {
  it('comeca pela abertura, e "Comecar" abre a primeira pergunta com 5 opcoes', async () => {
    await abrirPagina();
    expect(visivel('abertura')).toBe(true);
    expect(visivel('pesquisa')).toBe(false);
    clicar(document.getElementById('comecar')!);
    expect(visivel('abertura')).toBe(false);
    expect(legenda()).toBe('O que você achou do SuaSaúde?');
    expect(rotulos().map((l) => l.textContent)).toEqual(['Não gostei', 'Gostei pouco', 'Não sei', 'Gostei', 'Gostei muito']);
    expect(document.getElementById('progresso-texto')!.textContent).toBe('1 de 11');
  });

  it('tocar numa escolha unica avanca sozinho e salva a tela com todas as respostas ate ali', async () => {
    await abrirPagina();
    clicar(document.getElementById('comecar')!);
    await responderEscolhaUnica('Gostei');
    expect(legenda()).toBe('Você usaria o SuaSaúde?');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [endereco, pedido] = fetchMock.mock.calls[0];
    expect(endereco).toBe(ENDERECO);
    expect(pedido.method).toBe('POST');
    expect(pedido.headers['content-type']).toBe('text/plain;charset=UTF-8');
    expect(corposEnviados()[0]).toEqual({
      acao: 'salvar',
      id: ID,
      etapa: 1,
      concluido: false,
      respostas: { impressao: 'gostei' },
      site: '',
    });
  });

  it('voltar mostra a pergunta anterior com a resposta ainda marcada', async () => {
    await abrirPagina();
    clicar(document.getElementById('comecar')!);
    await responderEscolhaUnica('Gostei');
    clicar(botao('Voltar'));
    expect(legenda()).toBe('O que você achou do SuaSaúde?');
    expect(rotulo('Gostei').classList.contains('marcada')).toBe(true);
    expect((rotulo('Gostei').querySelector('input') as HTMLInputElement).checked).toBe(true);
  });

  it('em "chamaram atencao", depois de 3 marcadas as outras travam e "Continuar" so vale com 1 ou mais', async () => {
    await abrirPagina();
    clicar(document.getElementById('comecar')!);
    await responderEscolhaUnica('Gostei');
    await responderEscolhaUnica('Usaria');
    await responderEscolhaUnica('Algumas vezes por semana');
    expect(legenda()).toBe('Quais funcionalidades mais chamaram a sua atenção?');
    expect(botao('Continuar').getAttribute('aria-disabled')).toBe('true');
    marcar('Exames e receitas');
    expect(botao('Continuar').getAttribute('aria-disabled')).toBe('false');
    marcar('Assistente com IA');
    marcar('Agenda de consultas');
    expect((rotulo('Prevenção').querySelector('input') as HTMLInputElement).disabled).toBe(true);
    expect((rotulo('Nenhuma delas').querySelector('input') as HTMLInputElement).disabled).toBe(false);
    marcar('Agenda de consultas');
    expect((rotulo('Prevenção').querySelector('input') as HTMLInputElement).disabled).toBe(false);
  });

  it('falha de envio no meio mostra o aviso, nao perde resposta e "Tentar de novo" reenvia', async () => {
    await abrirPagina();
    clicar(document.getElementById('comecar')!);
    fetchMock.mockRejectedValueOnce(new Error('sem rede'));
    await responderEscolhaUnica('Gostei');
    expect(visivel('erro')).toBe(true);
    expect(legenda()).toBe('Você usaria o SuaSaúde?');
    clicar(document.getElementById('tentar-de-novo')!);
    await esperar(0);
    expect(visivel('erro')).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(corposEnviados()[1].respostas).toEqual({ impressao: 'gostei' });
  });

  it('os envios saem em fila: o segundo so parte quando o primeiro termina', async () => {
    await abrirPagina();
    clicar(document.getElementById('comecar')!);
    let terminarPrimeiro!: (r: Resposta) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Resposta>((resolve) => (terminarPrimeiro = resolve)));
    await responderEscolhaUnica('Gostei');
    await responderEscolhaUnica('Usaria');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    terminarPrimeiro(sucesso());
    await esperar(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(corposEnviados().map((c) => c.etapa)).toEqual([1, 2]);
  });

  it('a ultima tela so conclui se salvar; salvando, agradece e oferece o download', async () => {
    await abrirPagina();
    await responderTudo();
    expect(visivel('fim')).toBe(true);
    expect(visivel('pesquisa')).toBe(false);
    const ultimo = corposEnviados().at(-1);
    expect(ultimo.etapa).toBe(11);
    expect(ultimo.concluido).toBe(true);
    expect(document.querySelector('a[data-baixar="fim"]')).not.toBeNull();
  });

  it('se a ultima tela nao salvar, a pessoa continua nela e nada e dado como concluido', async () => {
    await abrirPagina();
    clicar(document.getElementById('comecar')!);
    for (let tela = 0; tela < 10; tela += 1) {
      const unica = document.querySelector('input[type="radio"]');
      const caixa = document.querySelector('input[type="checkbox"]');
      if (unica) {
        clicar(unica);
        await esperar(300);
      } else if (caixa) {
        clicar(caixa);
        clicar(botao('Continuar'));
        await esperar(0);
      }
    }
    expect(legenda()).toBe('O que faltou ou o que você mudaria?');
    fetchMock.mockRejectedValueOnce(new Error('sem rede'));
    clicar(botao('Enviar respostas'));
    await esperar(0);
    expect(visivel('fim')).toBe(false);
    expect(visivel('erro')).toBe(true);
    clicar(document.getElementById('tentar-de-novo')!);
    await esperar(0);
    expect(visivel('fim')).toBe(true);
  });

  it('recarregar a aba volta para a pergunta em que estava, com o mesmo id', async () => {
    await abrirPagina();
    clicar(document.getElementById('comecar')!);
    await responderEscolhaUnica('Gostei');
    await responderEscolhaUnica('Usaria');
    await abrirPagina();
    expect(visivel('abertura')).toBe(false);
    expect(legenda()).toBe('Com que frequência você usaria o app?');
    await responderEscolhaUnica('Todo dia');
    expect(corposEnviados().at(-1).id).toBe(ID);
  });

  it('recarregar depois de concluir mostra o agradecimento, nao a abertura', async () => {
    await abrirPagina();
    await responderTudo();
    await abrirPagina();
    expect(visivel('fim')).toBe(true);
    expect(visivel('abertura')).toBe(false);
  });

  it('o comentario tem contador, corta em 280 e e opcional', async () => {
    window.sessionStorage.setItem(
      'suasaude-pesquisa',
      JSON.stringify({ id: ID, estado: { tela: 10, respostas: { impressao: 'gostei' } } }),
    );
    await abrirPagina();
    expect(legenda()).toBe('O que faltou ou o que você mudaria?');
    const campo = document.querySelector('textarea') as HTMLTextAreaElement;
    expect(campo.getAttribute('maxlength')).toBe('280');
    campo.value = 'x'.repeat(300);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelector('.contador')!.textContent).toBe('300 de 280');
    expect(JSON.parse(window.sessionStorage.getItem('suasaude-pesquisa')!).estado.respostas.comentario).toHaveLength(280);
    expect(botao('Enviar respostas').getAttribute('aria-disabled')).toBe('false');
  });
});
