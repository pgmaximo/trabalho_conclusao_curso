// Os nomes PRECISAM comecar com "mock": o jest hasteia a fabrica de
// jest.mock() para cima dos imports, e ela nao pode referenciar variavel de
// fora do escopo -- a unica excecao e o prefixo "mock". O plano usava `list` e
// `listByAnalyte`, e com esses nomes o arquivo nem carrega.
const mockList = jest.fn();
const mockListByAnalyte = jest.fn();

jest.mock('aws-amplify/data', () => ({
  generateClient: () => ({
    models: {
      LabResult: {
        list: (...args: unknown[]) => mockList(...args),
        listLabResultByAnalyteCodeAndCollectedAt: (...args: unknown[]) =>
          mockListByAnalyte(...args),
      },
    },
  }),
}));

import { ANALYTE_CATALOG } from '../amplify/functions/extract-document-data/analyteCatalog';
import { listAnalytesWithResults, listLabResultsByAnalyte } from '@/services/analyteSeriesService';

// D27: nenhum codigo LOINC e digitado a mao, nem como exemplo em teste, e
// comentario dizendo "vem do extrato oficial" nao e verificacao -- um literal
// errado e o comentario ao lado dele erram juntos. O codigo sai do catalogo
// gerado a partir do extrato, buscado pelo rotulo em portugues, que e campo
// nosso e pode ser digitado.
const doCatalogo = (rotulo: string) => {
  const achado = ANALYTE_CATALOG.find((a) => a.projectLabel === rotulo);
  if (!achado) throw new Error(`Analito "${rotulo}" nao esta no catalogo gerado.`);
  return achado;
};

const VITAMINA_D = doCatalogo('Vitamina D (25-OH)').code;
const GLICOSE = doCatalogo('Glicose').code;

beforeEach(() => {
  mockList.mockReset();
  mockListByAnalyte.mockReset();
});

describe('listLabResultsByAnalyte', () => {
  it('consulta pelo indice, nao por varredura com filtro', () => {
    // list() com filtro le a tabela inteira e descarta no servidor. O indice
    // analyteCode/collectedAt existe no schema exatamente porque esta
    // consulta era conhecida de antemao.
    mockListByAnalyte.mockResolvedValue({ data: [], errors: undefined, nextToken: null });
    return listLabResultsByAnalyte(VITAMINA_D).then(() => {
      expect(mockListByAnalyte).toHaveBeenCalledWith(
        expect.objectContaining({ analyteCode: VITAMINA_D }),
      );
      expect(mockList).not.toHaveBeenCalled();
    });
  });

  it('segue a paginacao ate o fim', async () => {
    mockListByAnalyte
      .mockResolvedValueOnce({ data: [{ id: 'a' }], nextToken: 'n1' })
      .mockResolvedValueOnce({ data: [{ id: 'b' }], nextToken: null });
    const linhas = await listLabResultsByAnalyte(VITAMINA_D);
    expect(linhas.map((l) => l.id)).toEqual(['a', 'b']);
  });

  it('leva o nextToken adiante, e nao repete a primeira pagina para sempre', async () => {
    mockListByAnalyte
      .mockResolvedValueOnce({ data: [{ id: 'a' }], nextToken: 'n1' })
      .mockResolvedValueOnce({ data: [{ id: 'b' }], nextToken: null });
    await listLabResultsByAnalyte(VITAMINA_D);
    expect(mockListByAnalyte.mock.calls[1][0]).toMatchObject({ nextToken: 'n1' });
  });

  it('para a paginacao no teto, em vez de girar para sempre', async () => {
    mockListByAnalyte.mockResolvedValue({ data: [{ id: 'x' }], nextToken: 'sempre' });
    const linhas = await listLabResultsByAnalyte(VITAMINA_D);
    expect(linhas.length).toBeLessThanOrEqual(2000);
    expect(mockListByAnalyte.mock.calls.length).toBeLessThanOrEqual(20);
  });

  it('erro do AppSync vira excecao com a mensagem, nao lista vazia silenciosa', async () => {
    // Lista vazia e "voce nao tem esse exame". Erro e outra coisa, e a tela
    // precisa poder dizer qual dos dois aconteceu.
    mockListByAnalyte.mockResolvedValue({ data: null, errors: [{ message: 'sem permissao' }] });
    await expect(listLabResultsByAnalyte(VITAMINA_D)).rejects.toThrow('sem permissao');
  });
});

describe('listAnalytesWithResults', () => {
  it('conta as coletas por analito para o seletor', async () => {
    mockList.mockResolvedValue({
      data: [
        { id: '1', analyteCode: VITAMINA_D, projectLabel: 'Vitamina D (25-OH)' },
        { id: '2', analyteCode: VITAMINA_D, projectLabel: 'Vitamina D (25-OH)' },
        { id: '3', analyteCode: GLICOSE, projectLabel: 'Glicose' },
      ],
      nextToken: null,
    });
    const opcoes = await listAnalytesWithResults();
    expect(opcoes[0]).toMatchObject({ analyteCode: VITAMINA_D, collectionCount: 2 });
  });

  it('linha pendente NAO infla a contagem de coletas comparaveis', async () => {
    // A contagem e o que a pessoa le como "quanto historico eu tenho para
    // comparar". Contar uma linha que nao vai entrar no grafico prometeria
    // uma comparacao que a tela nao vai mostrar.
    mockList.mockResolvedValue({
      data: [
        { id: '1', analyteCode: VITAMINA_D, projectLabel: 'Vitamina D', reviewStatus: 'AUTO' },
        {
          id: '2',
          analyteCode: VITAMINA_D,
          projectLabel: 'Vitamina D',
          reviewStatus: 'PENDENTE_DE_REVISAO',
        },
      ],
      nextToken: null,
    });
    const opcoes = await listAnalytesWithResults();
    expect(opcoes[0]).toMatchObject({ collectionCount: 1, pendingCount: 1 });
  });

  it('analito que so tem linha pendente CONTINUA na lista', async () => {
    // Se ele sumisse do seletor, a pessoa nao teria por onde descobrir que
    // existe uma leitura dela esperando conferencia -- e a tela tem um estado
    // proprio para isso.
    mockList.mockResolvedValue({
      data: [
        {
          id: '1',
          analyteCode: VITAMINA_D,
          projectLabel: 'Vitamina D',
          reviewStatus: 'PENDENTE_DE_REVISAO',
        },
      ],
      nextToken: null,
    });
    const opcoes = await listAnalytesWithResults();
    expect(opcoes).toHaveLength(1);
    expect(opcoes[0]).toMatchObject({ collectionCount: 0, pendingCount: 1 });
  });

  it('usa o codigo como rotulo quando o rotulo em portugues nao veio', async () => {
    mockList.mockResolvedValue({
      data: [{ id: '1', analyteCode: 'X-SHBG', projectLabel: null }],
      nextToken: null,
    });
    const opcoes = await listAnalytesWithResults();
    expect(opcoes[0].projectLabel).toBe('X-SHBG');
  });

  it('erro do AppSync tambem lanca aqui', async () => {
    mockList.mockResolvedValue({ data: null, errors: [{ message: 'falhou' }] });
    await expect(listAnalytesWithResults()).rejects.toThrow('falhou');
  });
});
