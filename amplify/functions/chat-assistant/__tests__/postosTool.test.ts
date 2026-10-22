/**
 * `consultar_postos` (E8): as unidades basicas de saude da cidade que o
 * APLICATIVO mandou no pedido, lidas do cache que a tela de Vacinacao preenche.
 *
 * O SDK e mockado, e nao a porta publica: assim a leitura real, com a chave do
 * contexto, e exercida. O que estes testes vigiam alem do caminho feliz: as
 * tres ausencias (sem cidade, lista nao carregada, lista vazia), nenhuma
 * chamada externa, o filtro por bairro sem acento, e o que NAO pode sair --
 * coordenada, codigo do municipio, qualquer coisa que pareca dizer que a
 * unidade aplica a vacina.
 */
const mockSend = jest.fn();
jest.mock('@aws-sdk/lib-dynamodb', () => {
  class Comando {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }
  return {
    DynamoDBDocumentClient: { from: () => ({ send: (...a: unknown[]) => mockSend(...a) }) },
    GetCommand: class extends Comando {},
    ScanCommand: class extends Comando {},
  };
});
jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));

import type { ChatIdentity } from '../auth';
import { MAX_UNIDADES, postosTool } from '../tools/postos';
import type { ContextoDoTurno } from '../types';

const IDENTIDADE: ChatIdentity = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };
const COM_CIDADE: ContextoDoTurno = { local: { uf: 'SP', codigoMunicipio: '355030' } };

const SEM_CIDADE =
  'O aplicativo ainda não sabe a cidade do usuário. Na tela de Vacinação, ele pode permitir a localização ou escolher a cidade.';
const NAO_CARREGADA =
  'A lista de unidades de saúde da cidade do usuário ainda não foi carregada no aplicativo. Ao abrir a tela de Vacinação, o aplicativo busca essa lista.';
const LISTA_VAZIA =
  'O cadastro nacional de estabelecimentos de saúde não trouxe nenhuma unidade básica de saúde para a cidade do usuário.';
const NADA_NO_BAIRRO = 'Nenhuma unidade da lista salva da cidade tem esse bairro no endereço.';
const OBSERVACAO =
  'São unidades básicas de saúde do cadastro nacional. O aplicativo não sabe quais delas aplicam cada vacina nem o horário de funcionamento; isso deve ser confirmado com a unidade. A tela de Vacinação mostra as mais próximas.';

const fetchEspiao = jest.fn();
// Fixo e conhecido ANTES dos `it.each`, que sao montados quando o arquivo e
// lido -- antes de qualquer `beforeAll`.
const INSTANTE = '2026-10-17T15:00:00Z';
const agora = Math.floor(Date.parse(INSTANTE) / 1000);

function unidade(nome: string, bairro: string | null, logradouro: string | null = 'Rua A, 10') {
  return { cnes: '123', nome, bairro, logradouro, latitude: -23.5, longitude: -46.6, distanciaKm: null };
}

function cacheCom(payload: unknown, expiresAt: unknown = agora + 3 * 86400) {
  mockSend.mockResolvedValue({ Item: { codigoMunicipio: '355030', payload, expiresAt } });
}

async function rodar(input: Record<string, unknown> = {}, contexto: ContextoDoTurno = COM_CIDADE) {
  return (await postosTool.run(input, IDENTIDADE, contexto)) as Record<string, any>;
}

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(INSTANTE));
});
afterAll(() => jest.useRealTimers());

beforeEach(() => {
  process.env.SITE_CACHE_TABLE_NAME = 't-site';
  mockSend.mockReset().mockResolvedValue({});
  fetchEspiao.mockReset();
  global.fetch = fetchEspiao as unknown as typeof fetch;
});

afterEach(() => expect(fetchEspiao).not.toHaveBeenCalled());

describe('consultar_postos -- ausencias', () => {
  it.each([
    ['sem local', { local: null }],
    ['local sem codigo', { local: { uf: 'SP', codigoMunicipio: null } }],
  ])('%s: diz que nao sabe a cidade, sem ler nada', async (_nome, contexto) => {
    expect(await rodar({}, contexto as ContextoDoTurno)).toEqual({ disponivel: false, explicacao: SEM_CIDADE });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('chamada direta sem contexto tambem cai em "sem cidade"', async () => {
    expect(await postosTool.run({}, IDENTIDADE)).toEqual({ disponivel: false, explicacao: SEM_CIDADE });
  });

  it('cache ausente: lista nao carregada', async () => {
    expect(await rodar()).toEqual({ disponivel: false, explicacao: NAO_CARREGADA });
  });

  it.each([
    ['vencido', agora - 1],
    ['com expiresAt em texto', '9999999999'],
    ['com expiresAt NaN', Number.NaN],
  ])('cache %s: lista nao carregada', async (_nome, expiresAt) => {
    cacheCom([unidade('UBS Centro', 'Centro')], expiresAt);
    expect(await rodar()).toEqual({ disponivel: false, explicacao: NAO_CARREGADA });
  });

  it('cache sem expiresAt: lista nao carregada', async () => {
    mockSend.mockResolvedValue({ Item: { codigoMunicipio: '355030', payload: [unidade('UBS', 'Centro')] } });
    expect(await rodar()).toEqual({ disponivel: false, explicacao: NAO_CARREGADA });
  });

  it('expiresAt absurdo, alem da validade, e tratado como ausente -- e nao derruba a ferramenta', async () => {
    // Achado da revisao do E8: 1e20 passava por "nao vencido" e a data de
    // gravacao virava `Invalid Date`, que fazia `Intl` lancar.
    cacheCom([unidade('UBS Centro', 'Centro')], 1e20);
    expect(await rodar()).toEqual({ disponivel: false, explicacao: NAO_CARREGADA });

    cacheCom([unidade('UBS Centro', 'Centro')], agora + 30 * 86400);
    expect(await rodar()).toEqual({ disponivel: false, explicacao: NAO_CARREGADA });
  });

  it('item sem payload: lista nao carregada', async () => {
    mockSend.mockResolvedValue({ Item: { codigoMunicipio: '355030', expiresAt: agora + 100 } });
    expect(await rodar()).toEqual({ disponivel: false, explicacao: NAO_CARREGADA });
  });

  it('lista vazia: explicacao propria, distinta da de lista nao carregada', async () => {
    cacheCom([]);
    expect(await rodar()).toEqual({ disponivel: false, explicacao: LISTA_VAZIA });
  });
});

describe('consultar_postos -- com lista', () => {
  const DOZE = [
    unidade('UBS Vila Nova', 'Vila Nova'),
    unidade('UBS Sem Bairro', null, null),
    unidade('UBS Centro B', 'Centro'),
    unidade('UBS Centro A', 'Centro'),
    unidade('UBS Bela Vista', 'Bela Vista'),
    unidade('UBS Água Branca', 'Água Branca'),
    unidade('UBS Jardim 1', 'Jardim'),
    unidade('UBS Jardim 2', 'Jardim'),
    unidade('UBS Lapa', 'Lapa'),
    unidade('UBS Mooca', 'Mooca'),
    unidade('UBS Penha', 'Penha'),
    unidade('UBS Sé', 'Sé'),
  ];

  it('le pela chave do CONTEXTO, por GetItem', async () => {
    cacheCom(DOZE);
    await rodar();
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].input).toEqual({ TableName: 't-site', Key: { codigoMunicipio: '355030' } });
  });

  it('teto, ordem por bairro e nome, totais e data de atualizacao', async () => {
    cacheCom(DOZE);
    const saida = await rodar();

    expect(MAX_UNIDADES).toBe(8);
    expect(saida.disponivel).toBe(true);
    expect(saida.totalNaCidade).toBe(12);
    expect(saida.totalNoFiltro).toBeNull();
    expect(saida.omitidas).toBe(4);
    expect(saida.atualizadoEm).toBe('2026-10-13');
    expect(saida.unidades.map((u: { nome: string }) => u.nome)).toEqual([
      'UBS Água Branca',
      'UBS Bela Vista',
      'UBS Centro A',
      'UBS Centro B',
      'UBS Jardim 1',
      'UBS Jardim 2',
      'UBS Lapa',
      'UBS Mooca',
    ]);
    expect(saida.unidades[0]).toEqual({ nome: 'UBS Água Branca', bairro: 'Água Branca', endereco: 'Rua A, 10' });
  });

  it('entrada que nao e objeto, ou e array, no payload nao vira unidade', async () => {
    cacheCom([unidade('UBS Centro', 'Centro'), ['lixo'], null, 'texto', 42]);
    const saida = await rodar();
    expect(saida.totalNaCidade).toBe(1);
  });

  it('unidade sem bairro vai para o fim, com campos nulos, sem falhar', async () => {
    cacheCom([unidade('UBS Sem Bairro', null, null), unidade('UBS Centro', 'Centro')]);
    const saida = await rodar();
    expect(saida.unidades).toEqual([
      { nome: 'UBS Centro', bairro: 'Centro', endereco: 'Rua A, 10' },
      { nome: 'UBS Sem Bairro', bairro: null, endereco: null },
    ]);
  });

  it('filtro por bairro: contem, sem caixa e sem acento', async () => {
    cacheCom([
      unidade('UBS 1', 'CENTRO'),
      unidade('UBS 2', 'Centro Histórico'),
      unidade('UBS 3', 'Jardim'),
      unidade('UBS 4', 'SÃO JOSÉ'),
    ]);

    const centro = await rodar({ bairro: 'centro' });
    expect(centro.unidades.map((u: { nome: string }) => u.nome)).toEqual(['UBS 1', 'UBS 2']);
    expect(centro.totalNoFiltro).toBe(2);
    expect(centro.totalNaCidade).toBe(4);
    expect(centro.omitidas).toBe(0);

    const saoJose = await rodar({ bairro: 'sao jose' });
    expect(saoJose.unidades.map((u: { nome: string }) => u.nome)).toEqual(['UBS 4']);
  });

  it('espaco duplo no bairro nao impede o casamento', async () => {
    cacheCom([unidade('UBS 4', 'SÃO JOSÉ')]);
    expect((await rodar({ bairro: 'são  josé' })).totalNoFiltro).toBe(1);
  });

  it('bairro que vira vazio depois de tirar o acento e tratado como sem filtro', async () => {
    // "́" e um acento solto: passa no schema (1 caractere) e, sem esta
    // guarda, viraria "" e casaria com toda unidade que tem bairro.
    cacheCom([unidade('UBS 1', 'Centro'), unidade('UBS 2', null)]);
    const saida = await rodar({ bairro: '́' });
    expect(saida.totalNoFiltro).toBeNull();
    expect(saida.unidades).toHaveLength(2);
  });

  it('bairro sem casamento: lista vazia, total da cidade e explicacao', async () => {
    cacheCom([unidade('UBS 1', 'Centro')]);
    const saida = await rodar({ bairro: 'Inexistente' });
    expect(saida).toMatchObject({
      disponivel: true,
      unidades: [],
      totalNoFiltro: 0,
      totalNaCidade: 1,
      omitidas: 0,
      explicacao: NADA_NO_BAIRRO,
    });
  });

  it('nao devolve coordenada, cnes, distancia nem o codigo do municipio; traz a observacao', async () => {
    cacheCom(DOZE);
    const saida = await rodar();
    expect(JSON.stringify(saida)).not.toMatch(/cnes|latitude|longitude|distancia|355030/);
    expect(saida.observacao).toBe(OBSERVACAO);
  });
});

describe('consultar_postos -- entrada', () => {
  it.each([
    [{ bairro: '  ' }],
    [{ bairro: 'x'.repeat(61) }],
    [{ codigoMunicipio: '355030' }],
    [{ uf: 'SP' }],
    [{ owner: 'vitima::vitima' }],
  ])('recusa %j', (entrada) => {
    expect(postosTool.inputSchema.safeParse(entrada).success).toBe(false);
  });

  it('aceita vazio e bairro curto', () => {
    expect(postosTool.inputSchema.safeParse({}).success).toBe(true);
    expect(postosTool.inputSchema.safeParse({ bairro: 'Sé' }).success).toBe(true);
  });
});

describe('consultar_postos -- modo degradado', () => {
  it('nome, bairro e endereco; partes nulas omitidas; e o que o app nao sabe', async () => {
    cacheCom([unidade('UBS Centro', 'Centro'), unidade('UBS Sem Bairro', null, null)]);
    expect(postosTool.renderDegraded?.(await rodar())).toEqual({
      titulo: 'Unidades básicas de saúde da sua cidade',
      linhas: ['UBS Centro · Centro · Rua A, 10', 'UBS Sem Bairro', OBSERVACAO],
      citacoes: [],
    });
  });

  it('diz quantas ficaram de fora, para a lista nao parecer completa (revisao do E8)', async () => {
    cacheCom(Array.from({ length: 12 }, (_, i) => unidade(`UBS ${String(i).padStart(2, '0')}`, 'Centro')));
    const bloco = postosTool.renderDegraded?.(await rodar());
    expect(bloco?.linhas).toContain('E mais 4 unidades na lista da cidade.');
    expect(bloco?.linhas.at(-1)).toBe(OBSERVACAO);
  });

  it('sem unidades, nada', async () => {
    expect(postosTool.renderDegraded?.({ disponivel: false, explicacao: SEM_CIDADE })).toBeNull();
  });
});
