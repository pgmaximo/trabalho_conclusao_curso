/**
 * `consultar_comparacao` (E10, 10.2): a leitura, o schema fechado e o par
 * citavel. A forma da saida e de `comparacaoSaida.test.ts`.
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
// A serie diaria do wearable (E6) vem do bucket, pela porta do dono.
const mockBaixar = jest.fn();
jest.mock('../tools/bucketDaSerie', () => ({ baixarTextoDoBucket: (...a: unknown[]) => mockBaixar(...a) }));

/** O `result.json` simulado: sono de 6 h 10 min todo dia de fevereiro a abril. */
function resultadoDoSono(): string {
  const pontos = [];
  for (let t = Date.UTC(2026, 1, 1); t <= Date.UTC(2026, 3, 30); t += 86_400_000) {
    pontos.push({ dateKey: new Date(t).toISOString().slice(0, 10), value: 370 });
  }
  return JSON.stringify({ series: { sleepMinutes: pontos } });
}

import type { ChatIdentity } from '../auth';
import { indexarLinhasCitaveis } from '../citacoes';
import { runTool } from '../tools';
import { comparacaoTool } from '../tools/comparacao';
import { wearableTool } from '../tools/wearable';
import { ANALYTE_CATALOG } from '../../extract-document-data/analyteCatalog';

// O codigo vem do catalogo gerado, nunca digitado a mao (D27,
// `codigosLoincNaoDigitados.test.ts`).
const COLESTEROL_TOTAL = ANALYTE_CATALOG.find((a) => a.projectLabel === 'Colesterol total')!.code;

const IDENTIDADE: ChatIdentity = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

const COLESTEROL = {
  id: 'l1',
  owner: 's-1::u-1',
  documentId: 'doc-1',
  analyteCode: COLESTEROL_TOTAL,
  projectLabel: 'Colesterol total',
  analyteLabel: 'Colesterol total',
  value: 210,
  unit: 'mg/dL',
  collectedAt: '2026-03-20',
  reviewStatus: 'AUTO',
};

const IMPORTACAO = {
  id: 'h1',
  owner: 's-1::u-1',
  status: 'READY',
  createdAt: '2026-05-01T10:00:00Z',
  periodStart: '2026-02-01',
  periodEnd: '2026-04-30',
  resultArtifactKey: 'health-imports/us-east-1:abc/h1/result.json',
};

beforeAll(() =>
  Object.assign(process.env, { LAB_RESULT_TABLE_NAME: 't-lab', HEALTH_IMPORT_TABLE_NAME: 't-health', HEALTH_BUCKET_NAME: 'b-saude' }),
);
beforeEach(() => mockBaixar.mockReset().mockResolvedValue(resultadoDoSono()));
beforeEach(() =>
  mockSend
    .mockReset()
    .mockImplementation((c: { input: { TableName: string } }) =>
      Promise.resolve({ Items: c.input.TableName === 't-lab' ? [COLESTEROL] : [IMPORTACAO] }),
    ),
);

describe('consultar_comparacao', () => {
  it('le resultados e importacoes, com o dono do token, e monta o par', async () => {
    const saida = await comparacaoTool.run({ termo: 'colesterol', dadoDoWearable: 'sono' }, IDENTIDADE);
    const tabelas = mockSend.mock.calls.map(([c]) => (c as { input: { TableName: string } }).input.TableName);
    expect(tabelas.sort()).toEqual(['t-health', 't-lab']);
    for (const [c] of mockSend.mock.calls) {
      expect(
        (c as { input: { ExpressionAttributeValues: Record<string, string> } }).input.ExpressionAttributeValues[':owner'],
      ).toBe(IDENTIDADE.owner);
    }
    expect(saida).toMatchObject({
      disponivel: true,
      pares: [{ exame: { id: 'l1' }, wearable: { de: '2026-02-20', ate: '2026-03-19', media: '6 h 10 min por dia' } }],
    });
  });

  it.each([
    [{ termo: 'colesterol', dadoDoWearable: 'estresse' }],
    [{ termo: 'colesterol', dadoDoWearable: 'sono', owner: 'outro' }],
    [{ termo: '', dadoDoWearable: 'sono' }],
    [{ dadoDoWearable: 'sono' }],
  ])('entrada fora do contrato e reprovada, sem leitura: %j', async (entrada) => {
    expect(await runTool('consultar_comparacao', entrada, IDENTIDADE)).toEqual({ erro: expect.any(String) });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('o valor do exame vira linha citavel', async () => {
    const output = await comparacaoTool.run({ termo: 'colesterol', dadoDoWearable: 'sono' }, IDENTIDADE);
    const indice = indexarLinhasCitaveis([{ name: 'consultar_comparacao', output }]);
    expect(indice.get('l1')).toEqual({
      resultId: 'l1',
      documentId: 'doc-1',
      analyteLabel: 'Colesterol total',
      value: '210',
      unit: 'mg/dL',
      collectedAt: '2026-03-20',
    });
  });

  it('le a serie pela chave da linha do dono (E6)', async () => {
    await comparacaoTool.run({ termo: 'colesterol', dadoDoWearable: 'sono' }, IDENTIDADE);
    expect(mockBaixar).toHaveBeenCalledWith('b-saude', 'health-imports/us-east-1:abc/h1/result.json', expect.any(Number));
  });

  it('tres coletas em janelas de importacoes diferentes leem no maximo 2 arquivos (C5.3)', async () => {
    const linha = (id: string, data: string) => ({ ...COLESTEROL, id, collectedAt: data });
    const imp = (id: string, de: string, ate: string, criada: string) => ({
      ...IMPORTACAO,
      id,
      periodStart: de,
      periodEnd: ate,
      createdAt: criada,
      resultArtifactKey: `health-imports/us-east-1:abc/${id}/result.json`,
    });
    mockSend.mockImplementation((c: { input: { TableName: string } }) =>
      Promise.resolve({
        Items:
          c.input.TableName === 't-lab'
            ? [linha('a', '2024-03-20'), linha('b', '2025-03-20'), linha('c', '2026-03-20')]
            : [
                imp('i1', '2024-01-01', '2024-04-30', '2024-05-01T00:00:00Z'),
                imp('i2', '2025-01-01', '2025-04-30', '2025-05-01T00:00:00Z'),
                imp('i3', '2026-01-01', '2026-04-30', '2026-05-01T00:00:00Z'),
              ],
      }),
    );
    await comparacaoTool.run({ termo: 'colesterol', dadoDoWearable: 'sono' }, IDENTIDADE);
    expect(mockBaixar).toHaveBeenCalledTimes(2);
  });

  it('a importacao mais nova sem serie cede a anterior, lida de verdade (revisao do E6)', async () => {
    const antiga = { ...IMPORTACAO, id: 'h0', createdAt: '2026-04-20T10:00:00Z', resultArtifactKey: 'health-imports/us-east-1:abc/h0/result.json' };
    const nova = { ...IMPORTACAO, id: 'h1', createdAt: '2026-05-01T10:00:00Z', resultArtifactKey: '' };
    mockSend.mockImplementation((c: { input: { TableName: string } }) =>
      Promise.resolve({ Items: c.input.TableName === 't-lab' ? [COLESTEROL] : [nova, antiga] }),
    );
    const saida = await comparacaoTool.run({ termo: 'colesterol', dadoDoWearable: 'sono' }, IDENTIDADE);
    expect(saida).toMatchObject({ pares: [{ wearable: { media: '6 h 10 min por dia' } }] });
    expect(mockBaixar).toHaveBeenCalledTimes(1);
  });

  it('a descricao diz que nao relaciona um com o outro', () => {
    expect(comparacaoTool.description).toMatch(/NÃO relaciona/);
    expect(comparacaoTool.readOnly).toBe(true);
    // A janela e a dos 28 dias desde o E6; a descricao nao fala mais em mes.
    expect(comparacaoTool.description).toMatch(/28 dias antes da coleta/);
    expect(comparacaoTool.description).not.toMatch(/mês da coleta/);
  });
});

describe('a descricao do wearable (E10)', () => {
  it('continua sem relacionar com exames, e aponta a comparacao', () => {
    expect(wearableTool.description).toMatch(/NÃO relaciona/);
    expect(wearableTool.description).toMatch(/consultar_comparacao/);
  });
});
