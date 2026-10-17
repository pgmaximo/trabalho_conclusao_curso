/**
 * Resumo do arquivo:
 * As falhas do cliente da USPSTF. O chat (E7) trata qualquer falha como
 * ausencia de dado, e para isso o cliente precisa LANCAR em todo caso em que
 * o dado nao serve -- inclusive quando a resposta chega com status 200 e um
 * corpo que nao e o dataset, que sem esta validacao viraria um `TypeError`
 * mais adiante, longe da causa.
 *
 * O timeout e opcional de proposito: a Lambda da tela nao passa `opcoes` e
 * continua exatamente como era (caracterizada em
 * `get-prevention-recommendations/__tests__/handler.test.ts`).
 */
import { fetchUspstfDataset } from '../uspstfClient';

const mockFetch = jest.fn();
const DATASET_MINIMO = { specificRecommendations: [], grades: {}, generalRecommendations: {} };

beforeAll(() => {
  global.fetch = mockFetch as unknown as typeof fetch;
});

beforeEach(() => {
  mockFetch.mockReset().mockResolvedValue({ ok: true, json: async () => DATASET_MINIMO });
});

describe('fetchUspstfDataset', () => {
  it('leva a chave codificada na URL, e nada mais do perfil', async () => {
    await fetchUspstfDataset('chave com espaço');

    expect(mockFetch.mock.calls[0][0]).toContain('key=chave%20com%20espa%C3%A7o');
  });

  it('devolve o dataset quando a resposta e valida', async () => {
    await expect(fetchUspstfDataset('k')).resolves.toEqual(DATASET_MINIMO);
  });

  it('status nao-2xx lanca, sem a chave na mensagem', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const erro = await fetchUspstfDataset('chave-secreta').catch((e: Error) => e);

    expect(erro).toBeInstanceOf(Error);
    expect((erro as Error).message).toContain('status 500');
    expect((erro as Error).message).not.toContain('chave-secreta');
  });

  it('falha de rede (fetch rejeita) lanca (CA-7)', async () => {
    mockFetch.mockRejectedValue(new TypeError('fetch failed'));

    await expect(fetchUspstfDataset('k')).rejects.toThrow('fetch failed');
  });

  it('JSON invalido lanca', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON');
      },
    });

    await expect(fetchUspstfDataset('k')).rejects.toThrow();
  });

  it.each([
    ['corpo vazio', {}],
    ['specificRecommendations que nao e lista', { specificRecommendations: 'x' }],
    ['corpo nulo', null],
  ])('resposta 200 sem o dataset (%s) lanca', async (_caso, corpo) => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => corpo });

    await expect(fetchUspstfDataset('k')).rejects.toThrow('resposta inesperada');
  });

  it('sem opcoes, nao passa signal -- a Lambda da tela fica como era', async () => {
    await fetchUspstfDataset('k');

    const init = mockFetch.mock.calls[0][1] as RequestInit | undefined;
    expect(init?.signal).toBeUndefined();
  });

  it('com timeoutMs, desiste de uma fonte que nao responde', async () => {
    // Uma fonte que so termina quando o sinal aborta -- como um servidor
    // pendurado. Sem o timeout, este teste ficaria esperando para sempre.
    //
    // `init?.` e nao `init.`: sem o opcional, um cliente que nao passasse
    // `init` lancaria TypeError dentro do mock, e o teste passaria pelo motivo
    // errado -- foi o que aconteceu na primeira versao dele.
    mockFetch.mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('abortado')));
        }),
    );

    const inicio = Date.now();
    await expect(fetchUspstfDataset('k', { timeoutMs: 50 })).rejects.toThrow('abortado');
    expect(Date.now() - inicio).toBeLessThan(2000);
    expect((mockFetch.mock.calls[0][1] as RequestInit).signal).toBeDefined();
  });
});
