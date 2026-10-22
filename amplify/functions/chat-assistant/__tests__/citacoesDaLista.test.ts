/**
 * Toda ferramenta que devolve uma linha de exame a deixa CITAVEL (E10, risco D).
 *
 * `citacoes.ts` reconhece as linhas citaveis pelo nome da ferramenta e pela
 * forma da saida, que mora em outro arquivo. Se a forma mudar, ou se uma
 * ferramenta nova passar a devolver valor de exame sem entrar no indice, a
 * citacao some em silencio: a bolha mostra o numero sem origem (R4). Um gancho
 * por ferramenta foi estudado e custaria carregar o registro de ferramentas (e
 * o SDK) dentro da verificacao; este teste prova o mesmo contrato sobre a LISTA
 * INTEIRA, de ida e volta: roda cada ferramenta de verdade sobre um banco com
 * uma linha de exame e afirma que, se o id dela aparece na saida, ele esta no
 * indice.
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
  GetCommand: class {
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
// A serie do wearable (E6): sem arquivo, a comparacao ainda devolve a linha do exame.
jest.mock('../tools/bucketDaSerie', () => ({ baixarTextoDoBucket: jest.fn().mockResolvedValue(null) }));

import type { ChatIdentity } from '../auth';
import { indexarLinhasCitaveis } from '../citacoes';
import { CHAT_TOOLS, runTool } from '../tools';
import { ANALYTE_CATALOG } from '../../extract-document-data/analyteCatalog';

// O codigo vem do catalogo gerado, nunca digitado a mao (D27,
// `codigosLoincNaoDigitados.test.ts`).
const COLESTEROL_TOTAL = ANALYTE_CATALOG.find((a) => a.projectLabel === 'Colesterol total')!.code;

const IDENTIDADE: ChatIdentity = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };
const ID_DA_LINHA = 'linha-citavel-1';

const BANCO: Record<string, Record<string, unknown>[]> = {
  't-doc': [{ id: 'doc-1', owner: 's-1::u-1', documentType: 'exam', documentName: 'Lipídios', documentDate: '2026-03-20' }],
  't-lab': [
    {
      id: ID_DA_LINHA,
      owner: 's-1::u-1',
      documentId: 'doc-1',
      analyteCode: COLESTEROL_TOTAL,
      projectLabel: 'Colesterol total',
      analyteLabel: 'Colesterol total',
      value: 210,
      unit: 'mg/dL',
      collectedAt: '2026-03-20',
      reviewStatus: 'AUTO',
    },
  ],
  't-health': [
    {
      id: 'h1',
      owner: 's-1::u-1',
      status: 'READY',
      createdAt: '2026-05-01T10:00:00Z',
      periodStart: '2026-02-01',
      periodEnd: '2026-04-30',
      metricsJson: JSON.stringify({ metrics: [{ metric: 'sleepMinutes', monthly: [{ month: '2026-03', mean: 370 }] }] }),
    },
  ],
};

/** A entrada que faz cada ferramenta devolver a linha, quando ela devolve linha. */
const ENTRADA: Record<string, unknown> = {
  consultar_analito: { termo: 'colesterol' },
  consultar_comparacao: { termo: 'colesterol', dadoDoWearable: 'sono' },
};

beforeAll(() =>
  Object.assign(process.env, {
    USER_PROFILE_TABLE_NAME: 't-profile',
    MEDICAL_DOCUMENT_TABLE_NAME: 't-doc',
    LAB_RESULT_TABLE_NAME: 't-lab',
    APPOINTMENT_TABLE_NAME: 't-appt',
    MEDICINE_TABLE_NAME: 't-med',
    VACCINE_DOSE_TABLE_NAME: 't-vac',
    HEALTH_IMPORT_TABLE_NAME: 't-health',
    SITE_CACHE_TABLE_NAME: 't-site',
    MEDICINE_DOSE_LOG_TABLE_NAME: 't-dose',
    PRESCRIPTION_ITEM_TABLE_NAME: 't-presc',
    HEALTH_BUCKET_NAME: 'b-saude',
  }),
);
beforeEach(() =>
  mockSend
    .mockReset()
    .mockImplementation((c: { input: { TableName: string } }) =>
      Promise.resolve({ Items: BANCO[c.input.TableName] ?? [] }),
    ),
);

describe('toda linha de exame devolvida e citavel (E10, risco D)', () => {
  it.each(CHAT_TOOLS.map((t) => t.name))('%s', async (nome) => {
    const output = await runTool(nome, ENTRADA[nome] ?? {}, IDENTIDADE, { local: null });
    if (!JSON.stringify(output).includes(ID_DA_LINHA)) return;
    expect(indexarLinhasCitaveis([{ name: nome, output }]).has(ID_DA_LINHA)).toBe(true);
  });

  it('o teste nao e vazio: as tres ferramentas de valor devolvem a linha', async () => {
    for (const nome of ['consultar_analito', 'consultar_resultados', 'consultar_comparacao']) {
      const output = await runTool(nome, ENTRADA[nome] ?? {}, IDENTIDADE, { local: null });
      expect(JSON.stringify(output)).toContain(ID_DA_LINHA);
    }
  });
});
