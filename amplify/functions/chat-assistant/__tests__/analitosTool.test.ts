/**
 * A tool que faz a Fase 1 valer a pena. Ela e testada a parte das outras seis
 * porque tem regras que as outras nao tem: as exclusoes da EPIC de serie, o
 * agrupamento por momento da coleta (D22), e a origem de cada numero, sem a
 * qual a R4 nao tem como ser cumprida.
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
  QueryCommand: class {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  },
}));
jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));

import { readFileSync } from 'node:fs';

import type { ChatIdentity } from '../auth';
import { MOTIVOS_DE_EXCLUSAO, analitosTool } from '../tools/analitos';

const IDENTIDADE: ChatIdentity = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

// 62292-8 e 2345-7 saem do extrato oficial do LOINC, como em todas as EPICs
// desta feature. Nenhum codigo e digitado de cabeca, nem em teste.
const VITAMINA_D = '62292-8';
const GLICOSE = '2345-7';

type LinhaCrua = Record<string, unknown>;

function linha(over: LinhaCrua = {}): LinhaCrua {
  return {
    id: 'r-1',
    owner: IDENTIDADE.owner,
    documentId: 'doc-1',
    analyteCode: VITAMINA_D,
    analyteLabel: '25-Hydroxyvitamin D3+25-Hydroxyvitamin D2 [Mass/volume] in Serum or Plasma',
    projectLabel: 'Vitamina D (25-OH)',
    value: 32.5,
    unit: 'ng/mL',
    rawValue: '32,5',
    rawUnit: 'ng/mL',
    referenceLow: 30,
    referenceHigh: 100,
    collectedAt: '2026-03-12',
    collectionMoment: null,
    reviewStatus: 'CONFIRMADO',
    ...over,
  };
}

function comLinhas(linhas: LinhaCrua[]) {
  mockSend.mockReset().mockResolvedValue({ Items: linhas });
}

beforeAll(() => {
  process.env.LAB_RESULT_TABLE_NAME = 't-lab';
});

beforeEach(() => comLinhas([]));

describe('tool de analitos -- o que ela devolve', () => {
  it('devolve valor, unidade, data E documento de origem de cada coleta', async () => {
    // Sem o documento de origem o modelo teria numeros soltos e nenhum jeito
    // de dizer de onde vieram -- a R4 viraria uma promessa sem como cumprir.
    comLinhas([linha()]);
    const saida = (await analitosTool.run({ analyteCode: VITAMINA_D }, IDENTIDADE)) as {
      series: { coletas: Record<string, unknown>[] }[];
    };
    expect(saida.series[0].coletas[0]).toMatchObject({
      valor: 32.5,
      unidade: 'ng/mL',
      dataDaColeta: '2026-03-12',
      documentoId: 'doc-1',
    });
  });

  it('ordena as coletas da mais antiga para a mais recente', async () => {
    comLinhas([
      linha({ id: 'b', collectedAt: '2026-06-01' }),
      linha({ id: 'a', collectedAt: '2026-03-12' }),
    ]);
    const saida = (await analitosTool.run({ analyteCode: VITAMINA_D }, IDENTIDADE)) as {
      series: { coletas: { id: string }[] }[];
    };
    expect(saida.series[0].coletas.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('separa por momento da coleta -- jejum e 120 minutos nao sao a mesma serie (D22)', async () => {
    // Juntar as duas faz o modelo descrever uma serra que nao existe: sao
    // condicoes que nao se comparam.
    comLinhas([
      linha({ id: 'j1', analyteCode: GLICOSE, collectionMoment: 'jejum', unit: 'mg/dL', value: 92 }),
      linha({
        id: 'm1',
        analyteCode: GLICOSE,
        collectionMoment: '120 minutos',
        unit: 'mg/dL',
        value: 140,
      }),
    ]);
    const saida = (await analitosTool.run({ analyteCode: GLICOSE }, IDENTIDADE)) as {
      series: { momento: string | null }[];
    };
    expect(saida.series).toHaveLength(2);
    expect(saida.series.map((s) => s.momento).sort()).toEqual(['120 minutos', 'jejum']);
  });
});

describe('tool de analitos -- as exclusoes', () => {
  it('aplica as MESMAS exclusoes da EPIC de serie', async () => {
    // Uma linha pendente que entrasse aqui viraria um numero citado numa
    // conversa -- pior que aparecer num grafico, porque texto soa definitivo.
    comLinhas([
      linha({ id: 'ok' }),
      linha({ id: 'pendente', reviewStatus: 'PENDENTE_DE_REVISAO', value: null }),
      linha({ id: 'censurado', valueQualifier: '<', value: 0.01 }),
      linha({ id: 'sem-valor', value: null }),
      linha({ id: 'sem-data', collectedAt: null }),
      linha({ id: 'outra-unidade', unit: 'nmol/L' }),
    ]);
    const saida = (await analitosTool.run({ analyteCode: VITAMINA_D }, IDENTIDADE)) as {
      series: { coletas: { id: string }[]; naoComparaveis: { id: string; motivo: string }[] }[];
    };
    expect(saida.series[0].coletas.map((c) => c.id)).toEqual(['ok']);
    expect(saida.series[0].naoComparaveis).toHaveLength(5);
  });

  it('cada linha excluida sai COM o motivo, nunca em silencio', async () => {
    comLinhas([
      linha({ id: 'ok' }),
      linha({ id: 'p', reviewStatus: 'PENDENTE_DE_REVISAO', value: null }),
    ]);
    const saida = (await analitosTool.run({ analyteCode: VITAMINA_D }, IDENTIDADE)) as {
      series: { naoComparaveis: { id: string; motivo: string }[] }[];
    };
    expect(saida.series[0].naoComparaveis[0]).toMatchObject({
      id: 'p',
      motivo: expect.any(String),
    });
  });

  it('os motivos desta tool sao OS MESMOS da EPIC de serie, um a um', () => {
    // Guarda contra divergencia silenciosa: se a tela passar a excluir por um
    // motivo que a conversa nao conhece, a conversa citaria um numero que a
    // tela esconde -- e ninguem perceberia ate alguem comparar as duas.
    const fonte = readFileSync('src/services/analyteSeries.ts', 'utf8');
    const inicio = fonte.indexOf('export type ExclusionReason');
    const bloco = fonte.slice(inicio, fonte.indexOf(';', inicio));
    const daSerie = [...bloco.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]).sort();
    expect(daSerie.length).toBeGreaterThan(0);
    expect(Object.keys(MOTIVOS_DE_EXCLUSAO).sort()).toEqual(daSerie);
  });
});

describe('tool de analitos -- ausencia e busca', () => {
  it('analito sem nenhuma coleta devolve ausencia explicita, nao erro', async () => {
    comLinhas([]);
    const saida = (await analitosTool.run({ analyteCode: GLICOSE }, IDENTIDADE)) as {
      disponivel: boolean;
    };
    expect(saida.disponivel).toBe(false);
    expect(saida).not.toHaveProperty('erro');
  });

  it('busca por nome em portugues resolve para o codigo, sem o modelo digitar codigo', async () => {
    // Pedir ao modelo que produza um codigo LOINC de cabeca e exatamente o que
    // a D27 proibe -- inclusive para ele.
    comLinhas([linha()]);
    const saida = (await analitosTool.run({ termo: 'vitamina D' }, IDENTIDADE)) as {
      analyteCode: string;
    };
    expect(saida.analyteCode).toBe(VITAMINA_D);
  });

  it('termo que nao existe no catalogo nem no historico e ausencia, nao erro', async () => {
    const saida = (await analitosTool.run({ termo: 'xisdrola' }, IDENTIDADE)) as {
      disponivel: boolean;
      explicacao?: string;
    };
    expect(saida.disponivel).toBe(false);
    expect(typeof saida.explicacao).toBe('string');
  });

  it('acha tambem o analito de codigo LOCAL, que nao esta no catalogo (D32)', async () => {
    // Com a D32, 100% do laudo vira linha -- e a parte que nao tem codigo
    // LOINC recebe um codigo derivado do rotulo. Se a busca so olhasse o
    // catalogo, a conversa nao alcancaria justamente o que a tela ja mostra.
    comLinhas([
      linha({ id: 'x1', analyteCode: 'X-ZINCO', projectLabel: 'Zinco', unit: 'ug/dL', value: 80 }),
    ]);
    const saida = (await analitosTool.run({ termo: 'zinco' }, IDENTIDADE)) as {
      disponivel: boolean;
      analyteCode: string;
    };
    expect(saida.disponivel).toBe(true);
    expect(saida.analyteCode).toBe('X-ZINCO');
  });
});

describe('tool de analitos -- o que ela nao pode devolver', () => {
  it('nao devolve nenhum campo de interpretacao clinica', async () => {
    comLinhas([linha()]);
    const saida = await analitosTool.run({ analyteCode: VITAMINA_D }, IDENTIDADE);
    expect(JSON.stringify(saida)).not.toMatch(/alterado|gravidade|risco/i);
  });

  it('a consulta e filtrada pelo dono do token', async () => {
    comLinhas([linha()]);
    await analitosTool.run({ analyteCode: VITAMINA_D }, IDENTIDADE);
    const entrada = (mockSend.mock.calls[0][0] as { input: Record<string, unknown> }).input;
    expect(JSON.stringify(entrada.ExpressionAttributeValues)).toContain('s-1::u-1');
  });
});
