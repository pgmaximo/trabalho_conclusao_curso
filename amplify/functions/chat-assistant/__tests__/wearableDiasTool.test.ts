/**
 * `consultar_wearable_dias` (E6): o schema fechado, a leitura da importacao
 * pelo dono e a da serie pela porta. A forma da saida e de
 * `wearableDiasSaida.test.ts`.
 */
const mockSend = jest.fn();
const mockBaixar = jest.fn();

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
jest.mock('../tools/bucketDaSerie', () => ({ baixarTextoDoBucket: (...a: unknown[]) => mockBaixar(...a) }));

import { z } from 'zod';

import type { ChatIdentity } from '../auth';
import type { ContextoDoTurno } from '../types';
import { SEM_IMPORTACAO_PRONTA } from '../tools/wearable';
import { wearableDiasTool } from '../tools/wearableDias';
import { ANALYTE_CATALOG } from '../../extract-document-data/analyteCatalog';

// O codigo vem do catalogo gerado, nunca digitado a mao (D27,
// `codigosLoincNaoDigitados.test.ts`).
const COLESTEROL_TOTAL = ANALYTE_CATALOG.find((a) => a.projectLabel === 'Colesterol total')!.code;

const IDENTIDADE: ChatIdentity = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };
const CHAVE = 'health-imports/us-east-1:abc/h1/result.json';

const PRONTA = {
  id: 'h1',
  owner: 's-1::u-1',
  status: 'READY',
  createdAt: '2026-10-13T10:00:00Z',
  periodStart: '2026-09-01',
  periodEnd: '2026-10-12',
  resultArtifactKey: CHAVE,
};
const ARQUIVO = JSON.stringify({
  series: { sleepMinutes: [{ dateKey: '2026-10-08', value: 400 }, { dateKey: '2026-10-12', value: 420 }] },
});

let linhas: Record<string, unknown>[] = [PRONTA];

beforeAll(() => Object.assign(process.env, { HEALTH_IMPORT_TABLE_NAME: 't-health', HEALTH_BUCKET_NAME: 'b-saude' }));
beforeEach(() => {
  linhas = [PRONTA];
  mockSend.mockReset().mockImplementation(() => Promise.resolve({ Items: linhas }));
  mockBaixar.mockReset().mockResolvedValue(ARQUIVO);
});

describe('consultar_wearable_dias: schema (C1.7)', () => {
  const aceita = (entrada: unknown) => wearableDiasTool.inputSchema.safeParse(entrada).success;

  it('aceita so a metrica, e os campos completos', () => {
    expect(aceita({ metrica: 'sono' })).toBe(true);
    expect(
      aceita({
        metrica: 'fc_repouso',
        de: '2026-09-13',
        ate: '2026-10-12',
        comparar: true,
        compararDe: '2026-08-14',
        compararAte: '2026-09-12',
      }),
    ).toBe(true);
  });

  it.each([
    ['metrica fora da lista', { metrica: 'peso' }],
    ['sem metrica', {}],
    ['data em outro formato', { metrica: 'sono', de: '08/10/2026' }],
    ['data que nao existe', { metrica: 'sono', de: '2026-02-30' }],
    ['de depois de ate', { metrica: 'sono', de: '2026-10-12', ate: '2026-10-01' }],
    ['compararDe sem compararAte', { metrica: 'sono', compararDe: '2026-08-01' }],
    ['compararDe depois de compararAte', { metrica: 'sono', compararDe: '2026-08-10', compararAte: '2026-08-01' }],
    ['dono na entrada', { metrica: 'sono', owner: 'x' }],
    ['chave na entrada', { metrica: 'sono', chave: CHAVE }],
  ])('reprova %s', (_nome, entrada) => {
    expect(aceita(entrada)).toBe(false);
  });

  it('o schema vira JSON Schema para o Bedrock', () => {
    expect(() => z.toJSONSchema(wearableDiasTool.inputSchema)).not.toThrow();
  });

  it('o formato da data chega ao modelo na descricao do campo (revisao do E6)', () => {
    // runTool troca o motivo da recusa por uma frase generica; a descricao e o que o modelo le.
    const props = (z.toJSONSchema(wearableDiasTool.inputSchema) as { properties: Record<string, { description?: string }> }).properties;
    for (const campo of ['de', 'ate', 'compararDe', 'compararAte']) {
      expect(props[campo].description).toMatch(/AAAA-MM-DD/);
    }
  });
});

describe('consultar_wearable_dias: leitura', () => {
  it('le as importacoes com o dono do token e a serie pela chave da linha', async () => {
    const saida = (await wearableDiasTool.run({ metrica: 'sono', de: '2026-10-08' }, IDENTIDADE)) as Record<string, any>;
    expect(mockSend.mock.calls[0][0].input.ExpressionAttributeValues[':owner']).toBe('s-1::u-1');
    expect(mockBaixar).toHaveBeenCalledWith('b-saude', CHAVE, expect.any(Number));
    expect(saida).toMatchObject({ disponivel: true, tipo: 'dias', dias: [{ dia: '2026-10-08', valor: '6 h 40 min' }] });
  });

  it('a importacao mais recente que nao concluiu: a ausencia de consultar_wearable, sem S3', async () => {
    linhas = [PRONTA, { id: 'h2', status: 'PROCESSING', createdAt: '2026-10-15T10:00:00Z' }];
    const saida = await wearableDiasTool.run({ metrica: 'sono' }, IDENTIDADE);
    expect(saida).toEqual({ disponivel: false, explicacao: SEM_IMPORTACAO_PRONTA });
    expect(mockBaixar).not.toHaveBeenCalled();
  });

  it('sem importacao nenhuma: a mesma ausencia', async () => {
    linhas = [];
    expect(await wearableDiasTool.run({ metrica: 'sono' }, IDENTIDADE)).toEqual({
      disponivel: false,
      explicacao: SEM_IMPORTACAO_PRONTA,
    });
  });

  it('serie indisponivel: ausencia que diz como gerar de novo (C4.3)', async () => {
    mockBaixar.mockResolvedValue(null);
    const saida = (await wearableDiasTool.run({ metrica: 'sono' }, IDENTIDADE)) as Record<string, any>;
    expect(saida.disponivel).toBe(false);
    expect(saida.explicacao).toMatch(/dia a dia/);
    // Nao promete que importar de novo resolve: a causa pode ser o arquivo
    // grande demais ou a chave fora da forma (revisao do E6).
    expect(saida.explicacao).not.toMatch(/nova importação/);
    expect(saida.explicacao).toMatch(/tela de Wearable/);
  });

  it('importacao com periodo que nao e data: ausencia, sem S3 e sem erro (code-review)', async () => {
    linhas = [{ ...PRONTA, periodEnd: '2026-13-01' }];
    const saida = (await wearableDiasTool.run({ metrica: 'sono' }, IDENTIDADE)) as Record<string, any>;
    expect(saida.disponivel).toBe(false);
    expect(mockBaixar).not.toHaveBeenCalled();
  });

  it('importacao sem periodo: ausencia, sem S3', async () => {
    linhas = [{ ...PRONTA, periodStart: null }];
    const saida = (await wearableDiasTool.run({ metrica: 'sono' }, IDENTIDADE)) as Record<string, any>;
    expect(saida.disponivel).toBe(false);
    expect(mockBaixar).not.toHaveBeenCalled();
  });

  it('duas chamadas no mesmo turno baixam o arquivo uma vez (C4.5)', async () => {
    const contexto: ContextoDoTurno = { local: null, leituras: new Map(), series: new Map() };
    await wearableDiasTool.run({ metrica: 'sono' }, IDENTIDADE, contexto);
    await wearableDiasTool.run({ metrica: 'sono', comparar: true }, IDENTIDADE, contexto);
    expect(mockBaixar).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('os dias e a comparacao com exame no mesmo turno baixam o arquivo uma vez (C4.5, CA 12)', async () => {
    process.env.LAB_RESULT_TABLE_NAME = 't-lab';
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- o jest do projeto nao executa import()
    const { comparacaoTool } = require('../tools/comparacao') as typeof import('../tools/comparacao');
    const colesterol = {
      id: 'l1',
      owner: 's-1::u-1',
      documentId: 'doc-1',
      analyteCode: COLESTEROL_TOTAL,
      projectLabel: 'Colesterol total',
      analyteLabel: 'Colesterol total',
      value: 210,
      unit: 'mg/dL',
      collectedAt: '2026-10-10',
      reviewStatus: 'AUTO',
    };
    mockSend.mockImplementation((c: { input: { TableName: string } }) =>
      Promise.resolve({ Items: c.input.TableName === 't-lab' ? [colesterol] : linhas }),
    );
    const contexto: ContextoDoTurno = { local: null, leituras: new Map(), series: new Map() };
    await wearableDiasTool.run({ metrica: 'sono' }, IDENTIDADE, contexto);
    await wearableDiasTool.run({ metrica: 'sono', de: '2026-10-08' }, IDENTIDADE, contexto);
    await comparacaoTool.run({ termo: 'colesterol', dadoDoWearable: 'sono' }, IDENTIDADE, contexto);
    expect(mockBaixar).toHaveBeenCalledTimes(1);
  });

  it('o modo degradado e o da saida', () => {
    expect(wearableDiasTool.renderDegraded?.({ disponivel: false, explicacao: 'x' })).toBeNull();
  });
});
