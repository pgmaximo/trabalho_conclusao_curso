/**
 * U5 a U8 -- a pergunta que o aplicativo nao sabia responder.
 *
 * Medido com o aplicativo na mao, 2026-09-18: a primeira pergunta que a pessoa
 * fez, sem ser induzida, foi "como ficou o meu ultimo exame de sangue feito?".
 * O aplicativo tinha 46 valores daquele laudo e respondeu pedindo que ela
 * enumerasse os analitos um a um -- o aplicativo pedindo que a pessoa faca o
 * trabalho do aplicativo.
 *
 * A causa era a forma das tools: `consultar_analito` exige UM analito, e
 * `consultar_exames` devolve so metadado. Nao havia caminho entre "tenho um
 * documento" e "quais sao os valores dele".
 */
const mockSend = jest.fn();

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...a: unknown[]) => mockSend(...a) }) },
  ScanCommand: class {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  },
}));
jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));

import type { ChatIdentity } from '../auth';
import { resultadosTool } from '../tools/resultados';

const IDENTIDADE: ChatIdentity = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

function linha(over: Record<string, unknown> = {}) {
  return {
    id: 'l-1',
    documentId: 'doc-1',
    analyteCode: 'X-GLI',
    projectLabel: 'Glicose',
    analyteLabel: 'Glucose [Mass/volume]',
    value: 86,
    unit: 'mg/dL',
    rawValue: '86',
    referenceLow: 70,
    referenceHigh: 99,
    collectedAt: '2025-10-04',
    reviewStatus: 'AUTOMATICO',
    ...over,
  };
}

beforeAll(() => Object.assign(process.env, { LAB_RESULT_TABLE_NAME: 't-lab' }));
beforeEach(() => mockSend.mockReset().mockResolvedValue({ Items: [linha()] }));

type Saida = {
  disponivel: boolean;
  total: number;
  mostrados: number;
  resultados: {
    id: string;
    analito: string | null;
    valor: number | null;
    unidade: string | null;
    dataDaColeta: string | null;
    comoEstavaNoPapel: string | null;
    faixaDoLaboratorio: {
      minimo: number | null;
      maximo: number | null;
      comoOLaudoEscreveu: string | null;
    };
    documentoId: string;
  }[];
  naoComparaveis: { id: string; analito: string | null; motivo: string }[];
};

describe('consultar_resultados', () => {
  it('devolve os valores sem que ninguem precise nomear o analito', async () => {
    const s = (await resultadosTool.run({}, IDENTIDADE)) as Saida;

    expect(s.disponivel).toBe(true);
    expect(s.resultados).toHaveLength(1);
    expect(s.resultados[0]).toMatchObject({
      analito: 'Glicose',
      valor: 86,
      unidade: 'mg/dL',
      dataDaColeta: '2025-10-04',
    });
  });

  it('carrega a faixa do laboratorio e o que estava no papel', async () => {
    // Sem os dois, a R4 tem numero e a pessoa nao tem como conferir.
    const s = (await resultadosTool.run({}, IDENTIDADE)) as Saida;

    expect(s.resultados[0].faixaDoLaboratorio).toEqual({
      minimo: 70,
      maximo: 99,
      comoOLaudoEscreveu: null,
    });
    expect(s.resultados[0].comoEstavaNoPapel).toBe('86');
    expect(s.resultados[0].documentoId).toBe('doc-1');
  });

  it('carrega a faixa em TEXTO quando o laudo a escreveu em tabela (F1)', async () => {
    // Sem isto, a conversa responde sobre colesterol e vitamina D com o valor
    // solto -- a mesma lacuna que a tela tinha, pela mesma causa.
    mockSend.mockResolvedValue({
      Items: [
        linha({
          referenceLow: null,
          referenceHigh: null,
          rawReferenceText: 'Desejável: menor que 100 mg/dL',
        }),
      ],
    });

    const s = (await resultadosTool.run({}, IDENTIDADE)) as Saida;

    expect(s.resultados[0].faixaDoLaboratorio).toEqual({
      minimo: null,
      maximo: null,
      comoOLaudoEscreveu: 'Desejável: menor que 100 mg/dL',
    });
  });

  it('filtra por documento quando o documento e dito', async () => {
    mockSend.mockResolvedValue({
      Items: [linha(), linha({ id: 'l-2', documentId: 'doc-2', projectLabel: 'Colesterol' })],
    });

    const s = (await resultadosTool.run({ documentId: 'doc-2' }, IDENTIDADE)) as Saida;

    expect(s.resultados).toHaveLength(1);
    expect(s.resultados[0].analito).toBe('Colesterol');
  });

  it('sem documento, devolve a coleta MAIS RECENTE de cada analito', async () => {
    mockSend.mockResolvedValue({
      Items: [
        linha({ id: 'antiga', collectedAt: '2024-01-01', value: 70 }),
        linha({ id: 'nova', collectedAt: '2025-10-04', value: 86 }),
      ],
    });

    const s = (await resultadosTool.run({}, IDENTIDADE)) as Saida;

    expect(s.resultados).toHaveLength(1);
    expect(s.resultados[0].id).toBe('nova');
  });

  it('separa jejum de pos-prandial: momento diferente e outra linha (D22)', async () => {
    mockSend.mockResolvedValue({
      Items: [
        linha({ id: 'jejum', collectionMoment: 'jejum' }),
        linha({ id: '120min', collectionMoment: '120 minutos', value: 140 }),
      ],
    });

    const s = (await resultadosTool.run({}, IDENTIDADE)) as Saida;

    expect(s.resultados).toHaveLength(2);
  });

  it('linha pendente de revisao NAO entra como resultado -- e nao some', async () => {
    // A mesma exclusao da tela de serie. Se as duas discordarem, a conversa
    // mostra o que a tela esconde.
    mockSend.mockResolvedValue({
      Items: [linha({ id: 'pendente', reviewStatus: 'PENDENTE_DE_REVISAO' })],
    });

    const s = (await resultadosTool.run({}, IDENTIDADE)) as Saida;

    expect(s.resultados).toHaveLength(0);
    expect(s.naoComparaveis).toHaveLength(1);
    expect(s.naoComparaveis[0].motivo).toMatch(/conferência/i);
  });

  it('valor censurado vira nao-comparavel, com o que estava no papel', async () => {
    mockSend.mockResolvedValue({
      Items: [linha({ id: 'censurado', valueQualifier: '<', rawValue: '<0,01' })],
    });

    const s = (await resultadosTool.run({}, IDENTIDADE)) as Saida;

    expect(s.resultados).toHaveLength(0);
    expect(s.naoComparaveis[0].motivo).toMatch(/limite/i);
  });

  it('corta no teto e DIZ quantos ficaram de fora', async () => {
    // Omitir a contagem faria a resposta parecer completa -- e a R5 manda dizer
    // o que nao se sabe.
    const muitos = Array.from({ length: 200 }, (_, i) =>
      linha({ id: `l-${i}`, analyteCode: `X-${i}`, projectLabel: `Analito ${i}` }),
    );
    mockSend.mockResolvedValue({ Items: muitos });

    const s = (await resultadosTool.run({}, IDENTIDADE)) as Saida;

    expect(s.total).toBe(200);
    expect(s.mostrados).toBeLessThan(200);
    expect(s.resultados).toHaveLength(s.mostrados);
  });

  it('sem nenhum resultado, diz que nao ha -- e nao finge lista vazia', async () => {
    mockSend.mockResolvedValue({ Items: [] });

    const s = (await resultadosTool.run({}, IDENTIDADE)) as Saida & { explicacao?: string };

    expect(s.disponivel).toBe(false);
    expect(s.explicacao).toBeTruthy();
  });

  it('e somente leitura', () => {
    expect(resultadosTool.readOnly).toBe(true);
  });

  it('a descricao distingue esta tool das outras duas', () => {
    // As tres se parecem, e o modelo so acerta a escolha se a descricao
    // separar: documentos / o que tem dentro / como evoluiu.
    expect(resultadosTool.description).toMatch(/valores/i);
    expect(resultadosTool.description).toMatch(/consultar_analito/);
    expect(resultadosTool.description).toMatch(/NÃO grava|não grava/i);
  });
});

/**
 * Bloco 10 -- a rodada automatica da L7 mostrou o modo degradado desta tool
 * dizendo "Basofilos (absoluto) · 0.033 10*3/uL": ponto decimal e o token UCUM
 * cru, enquanto o da tool de analitos ja dizia "27,9 ng/mL".
 */
describe('o modo degradado fala como o laudo (Bloco 10)', () => {
  const saida = {
    resultados: [
      { id: 'r1', analito: 'Basofilos (absoluto)', valor: 0.033, unidade: '10*3/uL', dataDaColeta: '2025-10-04', documentoId: 'd1' },
      { id: 'r2', analito: 'Contagem zerada', valor: 0, unidade: '/uL', dataDaColeta: '2025-10-04', documentoId: 'd1' },
    ],
  };

  it('virgula decimal, unidade legivel e data brasileira', () => {
    const bloco = resultadosTool.renderDegraded!(saida)!;
    expect(bloco.linhas[0]).toBe('Basofilos (absoluto) · 0,033 mil/µL · 04/10/2025');
  });

  it('o valor zero aparece -- zero e resultado, nao ausencia', () => {
    const bloco = resultadosTool.renderDegraded!(saida)!;
    expect(bloco.linhas[1]).toContain('0 /µL');
  });
});

describe('a unidade que o modelo repete e a que a pessoa le (Bloco 10)', () => {
  it('entrega "mil/µL", e nao o token "10*3/uL" -- o modelo copia o que recebe', async () => {
    // Na reproducao do ponta a ponta, a resposta dizia "Plaquetas: 199 10*3/uL":
    // o modelo repete a unidade exatamente como a ferramenta a entrega.
    mockSend.mockResolvedValue({ Items: [linha({ projectLabel: 'Plaquetas', value: 199, unit: '10*3/uL' })] });
    const saida = (await resultadosTool.run({}, IDENTIDADE)) as Saida;
    expect(saida.resultados[0]!.unidade).toBe('mil/µL');
  });
});

describe('o que estava no papel vem inteiro (Bloco 10)', () => {
  it('"como estava no papel" traz a unidade DO PAPEL junto do numero do papel', async () => {
    // Rodada 3 da avaliacao: a resposta disse "Leucocitos: 5.500 mil/µL" -- mil
    // vezes o valor real. A ferramenta entregava o numero do papel ("5.500")
    // sem a unidade do papel ("/mm³"), ao lado da unidade convertida ("mil/µL"),
    // e o modelo juntou os dois.
    mockSend.mockResolvedValue({
      Items: [linha({ projectLabel: 'Leucocitos', value: 5.5, unit: '10*3/uL', rawValue: '5.500', rawUnit: '/mm³' })],
    });
    const saida = (await resultadosTool.run({}, IDENTIDADE)) as Saida;
    expect(saida.resultados[0]!.comoEstavaNoPapel).toBe('5.500 /mm³');
  });
});
