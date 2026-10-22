/**
 * O cache do dataset PUBLICO da USPSTF (E7, CA-13). O que se prova aqui e o
 * custo: dentro da validade, uma pergunta de prevencao nao baixa o dataset de
 * novo; duas perguntas ao mesmo tempo num container frio baixam uma vez so; e
 * uma falha nao fica guardada, porque guarda-la faria o chat repetir "nao
 * consegui consultar" por dez minutos depois de a fonte ja ter voltado.
 */
import type { UspstfDataset } from '../../uspstf-shared/uspstfClient';
import { limparCacheDoDataset, obterDataset, TTL_DATASET_MS } from '../tools/prevencaoDataset';

const DATASET: UspstfDataset = {
  specificRecommendations: [],
  grades: {},
  generalRecommendations: {},
};

let agora = 0;
const relogio = () => agora;
const buscar = jest.fn<Promise<UspstfDataset>, [string]>();

beforeEach(() => {
  limparCacheDoDataset();
  agora = 1_000_000;
  buscar.mockReset().mockResolvedValue(DATASET);
});

describe('obterDataset', () => {
  it('a validade e de dez minutos', () => {
    expect(TTL_DATASET_MS).toBe(10 * 60 * 1000);
  });

  it('busca com a chave recebida', async () => {
    await obterDataset('chave', relogio, buscar);

    expect(buscar).toHaveBeenCalledWith('chave');
  });

  it('dentro da validade, reaproveita: uma busca so', async () => {
    await obterDataset('k', relogio, buscar);
    agora += TTL_DATASET_MS - 1;
    const segunda = await obterDataset('k', relogio, buscar);

    expect(buscar).toHaveBeenCalledTimes(1);
    expect(segunda).toBe(DATASET);
  });

  it('vencida a validade, busca de novo', async () => {
    await obterDataset('k', relogio, buscar);
    agora += TTL_DATASET_MS + 1;
    await obterDataset('k', relogio, buscar);

    expect(buscar).toHaveBeenCalledTimes(2);
  });

  it('duas chamadas simultaneas num cache frio fazem uma busca so', async () => {
    const [a, b] = await Promise.all([
      obterDataset('k', relogio, buscar),
      obterDataset('k', relogio, buscar),
    ]);

    expect(buscar).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it('falha nao fica guardada: a chamada seguinte tenta de novo', async () => {
    buscar.mockRejectedValueOnce(new Error('fora do ar'));

    await expect(obterDataset('k', relogio, buscar)).rejects.toThrow('fora do ar');
    await expect(obterDataset('k', relogio, buscar)).resolves.toBe(DATASET);
    expect(buscar).toHaveBeenCalledTimes(2);
  });

  it('a busca padrao vai a USPSTF so com a chave e o teto de espera (CA-9)', async () => {
    // Sem `buscar` injetado: e a fiacao que o chat usa de verdade. A URL e
    // conferida INTEIRA, e as opcoes tambem -- nada do perfil cabe nelas.
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, json: async () => DATASET });
    global.fetch = mockFetch as unknown as typeof fetch;

    await obterDataset('chave', relogio);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opcoes] = mockFetch.mock.calls[0];
    expect(url).toBe('https://data.uspreventiveservicestaskforce.org/api/json?key=chave');
    expect(Object.keys(opcoes)).toEqual(['signal']);
  });

  it('limparCacheDoDataset obriga a buscar de novo', async () => {
    await obterDataset('k', relogio, buscar);
    limparCacheDoDataset();
    await obterDataset('k', relogio, buscar);

    expect(buscar).toHaveBeenCalledTimes(2);
  });
});
