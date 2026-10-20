/**
 * `consultar_panorama` (E10, 10.1): seis leituras do dono, em paralelo, que
 * entram no registro do turno -- a ferramenta do assunto chamada depois nao le
 * de novo. A forma da saida e de `panoramaSaida.test.ts`.
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
import { examesTool } from '../tools/exames';
import type { LeiturasDoTurno } from '../tools/ownerScopedRead';
import { panoramaTool } from '../tools/panorama';

const IDENTIDADE: ChatIdentity = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

const TABELAS = {
  MEDICAL_DOCUMENT_TABLE_NAME: 't-doc',
  LAB_RESULT_TABLE_NAME: 't-lab',
  MEDICINE_TABLE_NAME: 't-med',
  APPOINTMENT_TABLE_NAME: 't-appt',
  VACCINE_DOSE_TABLE_NAME: 't-vac',
  HEALTH_IMPORT_TABLE_NAME: 't-health',
};

beforeAll(() => Object.assign(process.env, TABELAS));
beforeEach(() => mockSend.mockReset().mockResolvedValue({ Items: [] }));

const tabelasLidas = () =>
  mockSend.mock.calls.map(([c]) => (c as { input: { TableName: string } }).input.TableName);

describe('consultar_panorama', () => {
  it('le as seis tabelas, todas com o dono do token', async () => {
    await panoramaTool.run({}, IDENTIDADE);
    expect(tabelasLidas().sort()).toEqual(Object.values(TABELAS).sort());
    for (const [c] of mockSend.mock.calls) {
      expect((c as { input: { ExpressionAttributeValues: Record<string, string> } }).input.ExpressionAttributeValues[':owner']).toBe(
        IDENTIDADE.owner,
      );
    }
  });

  it('as seis leituras saem juntas, sem uma esperar a outra', async () => {
    // Cada `send` so resolve quando os seis estiverem pendentes: lidas em
    // sequencia, a primeira nunca resolveria.
    const pendentes: (() => void)[] = [];
    mockSend.mockImplementation(
      () =>
        new Promise((resolve) => {
          pendentes.push(() => resolve({ Items: [] }));
          if (pendentes.length === 6) pendentes.forEach((r) => r());
        }),
    );
    const saida = await Promise.race([
      panoramaTool.run({}, IDENTIDADE),
      new Promise((_, rejeita) => setTimeout(() => rejeita(new Error('leitura em sequencia')), 500)),
    ]);
    expect(saida).toMatchObject({ disponivel: false });
  });

  it('com o registro do turno, consultar_exames depois nao rele documentos nem resultados', async () => {
    const leituras: LeiturasDoTurno = new Map();
    await panoramaTool.run({}, IDENTIDADE, { local: null, leituras });
    await examesTool.run({}, IDENTIDADE, { local: null, leituras });
    expect(tabelasLidas()).toHaveLength(6);
  });

  it('entrada com campo a mais e reprovada pelo schema', () => {
    expect(panoramaTool.inputSchema.safeParse({ owner: 'outro' }).success).toBe(false);
  });

  it('a descricao diz o que NAO faz', () => {
    expect(panoramaTool.description).toMatch(/NÃO traz valores de exame/);
    expect(panoramaTool.readOnly).toBe(true);
  });

  it('o modo degradado mostra o resumo, sem citacao', async () => {
    mockSend.mockImplementation((c: { input: { TableName: string } }) =>
      Promise.resolve({
        Items: c.input.TableName === 't-med' ? [{ id: 'm1', name: 'Losartana', active: true }] : [],
      }),
    );
    const saida = await panoramaTool.run({}, IDENTIDADE);
    expect(panoramaTool.renderDegraded?.(saida)?.linhas).toEqual(['Remédios cadastrados: 1 em uso, 0 encerrados']);
  });
});
