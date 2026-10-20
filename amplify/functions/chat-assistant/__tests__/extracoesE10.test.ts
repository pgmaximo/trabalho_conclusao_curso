/**
 * As regras que o panorama e a comparacao (E10) reaproveitam, exportadas das
 * ferramentas que ja as tinham. Exportadas, e nao copiadas: duas copias de
 * "qual e a proxima consulta" dariam duas respostas sobre o mesmo registro.
 * Cada teste prova que a funcao exportada e a MESMA regra da ferramenta.
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
import { analitosTool, serieDoAnalito } from '../tools/analitos';
import { separarConsultas } from '../tools/consultas';
import { comoLinha } from '../tools/linhasDeResultado';
import { dosesAplicadasPorRecencia } from '../tools/vacinasSaida';
import { ultimaImportacaoPronta } from '../tools/wearable';
import { ANALYTE_CATALOG } from '../../extract-document-data/analyteCatalog';

// O codigo vem do catalogo gerado, nunca digitado a mao (D27,
// `codigosLoincNaoDigitados.test.ts`).
const COLESTEROL_TOTAL = ANALYTE_CATALOG.find((a) => a.projectLabel === 'Colesterol total')!.code;

const IDENTIDADE: ChatIdentity = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

beforeAll(() => Object.assign(process.env, { LAB_RESULT_TABLE_NAME: 't-lab' }));

const LINHA = {
  id: 'l-1',
  owner: 's-1::u-1',
  documentId: 'doc-1',
  analyteCode: COLESTEROL_TOTAL,
  analyteLabel: 'Colesterol total',
  projectLabel: 'Colesterol total',
  value: 210,
  unit: 'mg/dL',
  collectedAt: '2026-03-12',
  reviewStatus: 'AUTO',
};

describe('serieDoAnalito', () => {
  it('sem leitura, da o mesmo que consultar_analito sobre as mesmas linhas', async () => {
    mockSend.mockReset().mockResolvedValue({ Items: [LINHA] });
    const daFerramenta = await analitosTool.run({ termo: 'colesterol total' }, IDENTIDADE);
    expect(serieDoAnalito([LINHA].map(comoLinha), { termo: 'colesterol total' })).toEqual(daFerramenta);
  });

  it('termo que nao resolve da ausencia, nao erro', () => {
    expect(serieDoAnalito([], { termo: '' })).toMatchObject({ disponivel: false });
  });
});

describe('separarConsultas', () => {
  it('nao aplica teto: o teto continua na ferramenta', () => {
    const linhas = Array.from({ length: 25 }, (_, i) => ({
      appointmentName: `c${i}`,
      scheduledAt: `2027-01-${String(i + 1).padStart(2, '0')}T10:00`,
    }));
    const { futuras, passadas } = separarConsultas(linhas, '2026-10-19T12:00');
    expect(futuras).toHaveLength(25);
    expect(passadas).toHaveLength(0);
    expect(futuras[0].nome).toBe('c0');
  });
});

describe('dosesAplicadasPorRecencia', () => {
  it('ignora dose sem data e desempata pelo numero da dose', () => {
    const doses = dosesAplicadasPorRecencia([
      { name: 'dT', appliedDate: '2026-01-10', doseNumber: 1 },
      { name: 'dT', appliedDate: '2026-01-10', doseNumber: 2 },
      { name: 'Gripe', dueDate: '2027-04-01' },
      { name: 'Hepatite B', appliedDate: '2025-05-01', doseNumber: 1 },
    ]);
    expect(doses.map((d) => [d.name, d.doseNumber])).toEqual([
      ['dT', 2],
      ['dT', 1],
      ['Hepatite B', 1],
    ]);
  });
});

describe('ultimaImportacaoPronta', () => {
  it('a mais recente que nao concluiu da nulo, mesmo havendo uma pronta mais antiga', () => {
    expect(
      ultimaImportacaoPronta([
        { id: 'a', status: 'READY', createdAt: '2026-05-01T10:00:00Z' },
        { id: 'b', status: 'FAILED', createdAt: '2026-09-01T10:00:00Z' },
      ]),
    ).toBeNull();
  });

  it('a mais recente pronta e devolvida', () => {
    expect(
      ultimaImportacaoPronta([
        { id: 'a', status: 'READY', createdAt: '2026-05-01T10:00:00Z' },
        { id: 'b', status: 'READY', createdAt: '2026-09-01T10:00:00Z' },
      ])?.id,
    ).toBe('b');
  });

  it('sem importacao, nulo', () => {
    expect(ultimaImportacaoPronta([])).toBeNull();
  });
});
