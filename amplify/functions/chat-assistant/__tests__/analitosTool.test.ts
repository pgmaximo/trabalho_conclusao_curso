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

import { ANALYTE_CATALOG } from '../../extract-document-data/analyteCatalog';
import type { ChatIdentity } from '../auth';
import { MOTIVOS_DE_EXCLUSAO, analitosTool } from '../tools/analitos';

const IDENTIDADE: ChatIdentity = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

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

  it('acha tambem o analito de codigo LOCAL, mesmo depois de ele entrar no catalogo (D32)', async () => {
    // Com a D32, 100% do laudo vira linha -- e a parte que nao tem codigo
    // LOINC recebe um codigo derivado do rotulo. Se a busca so olhasse o
    // catalogo, a conversa nao alcancaria justamente o que a tela ja mostra.
    //
    // Bloco 10: este caso usava o zinco como exemplo de analito FORA do
    // catalogo, e a ampliacao o pos para dentro -- o teste falhou, e a falha
    // era real. As linhas gravadas antes da ampliacao continuam com o codigo
    // local, e "zinco" passou a resolver para o codigo LOINC, que ninguem tem.
    // A busca agora so deixa o catalogo vencer quando ha linha com o codigo
    // dele.
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

describe('tool de analitos -- o catalogo continua vencendo quando ha linha dele', () => {
  it('com linha LOINC e linha local do mesmo nome, a de codigo LOINC vence', async () => {
    const ZINCO = ANALYTE_CATALOG.find((a) => a.projectLabel === 'Zinco')!;
    comLinhas([
      linha({ id: 'x1', analyteCode: 'X-ZINCO', projectLabel: 'Zinco', unit: 'ug/dL', value: 80 }),
      linha({ id: 'x2', analyteCode: ZINCO.code, projectLabel: 'Zinco', unit: 'ug/dL', value: 85 }),
    ]);
    const saida = (await analitosTool.run({ termo: 'zinco' }, IDENTIDADE)) as { analyteCode: string };
    expect(saida.analyteCode).toBe(ZINCO.code);
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

/**
 * Bloco 10 -- a rodada automatica da L7: "Meu colesterol LDL esta bom?" teve
 * como resposta que nao havia LDL registrado. Havia. A busca so testava "o
 * rotulo CONTEM o termo", e "colesterol LDL" nao esta contido em "LDL".
 */
describe('tool de analitos -- a busca nos dois sentidos (Bloco 10)', () => {
  const LDL = doCatalogo('LDL').code;
  const GLICADA = doCatalogo('Hemoglobina glicada').code;
  const HEMOGLOBINA = doCatalogo('Hemoglobina').code;

  it('"colesterol LDL" acha o LDL, e NAO o colesterol total', async () => {
    // A rodada 2 mostrou a primeira versao deste conserto escolhendo o
    // colesterol TOTAL: "colesterol LDL" contem "colesterol" (sinonimo do total,
    // 10 letras) e "LDL" (3), e o mais longo vencia. Este caso, com so a linha
    // do LDL no historico, passava assim mesmo -- a volta para o historico
    // escondia a escolha errada. Com as duas linhas, ele discrimina.
    const TOTAL = doCatalogo('Colesterol total').code;
    comLinhas([
      linha({ id: 'c1', analyteCode: TOTAL, projectLabel: 'Colesterol total', unit: 'mg/dL', value: 167 }),
      linha({ id: 'l1', analyteCode: LDL, projectLabel: 'LDL', unit: 'mg/dL', value: 90 }),
    ]);
    const saida = (await analitosTool.run({ termo: 'colesterol LDL' }, IDENTIDADE)) as { analyteCode: string };
    expect(saida.analyteCode).toBe(LDL);
  });

  it('"minha hemoglobina glicada" acha a glicada, e NAO a hemoglobina -- o rotulo mais longo vence', async () => {
    comLinhas([
      linha({ id: 'h1', analyteCode: HEMOGLOBINA, projectLabel: 'Hemoglobina', unit: 'g/dL', value: 16 }),
      linha({ id: 'h2', analyteCode: GLICADA, projectLabel: 'Hemoglobina glicada', unit: '%', value: 5.1 }),
    ]);
    const saida = (await analitosTool.run({ termo: 'minha hemoglobina glicada' }, IDENTIDADE)) as { analyteCode: string };
    expect(saida.analyteCode).toBe(GLICADA);
  });

  it('"vitamina D" continua achando a 25-OH, e nao a 1,25 que entrou no catalogo', async () => {
    // As DUAS no historico: com so a 25-OH, a volta para o historico mascarava
    // uma ordem errada no catalogo -- a mutacao que invertia a ordem sobreviveu.
    const UM_VINTE_E_CINCO = doCatalogo('1,25-di-hidroxivitamina D').code;
    comLinhas([
      linha(),
      linha({ id: 'v2', analyteCode: UM_VINTE_E_CINCO, projectLabel: '1,25-di-hidroxivitamina D', unit: 'pg/mL', value: 40 }),
    ]);
    const saida = (await analitosTool.run({ termo: 'vitamina D' }, IDENTIDADE)) as { analyteCode: string };
    expect(saida.analyteCode).toBe(VITAMINA_D);
  });
});
