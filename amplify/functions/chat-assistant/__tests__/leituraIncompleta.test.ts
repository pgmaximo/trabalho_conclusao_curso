/**
 * O teto de paginas sinalizado (E10, D10.4 = B1). O `Scan` filtrado por dono le
 * no maximo 10 paginas da TABELA (de todo mundo); depois disso, as linhas do
 * dono que estao adiante nunca sao vistas. Ate aqui isso acontecia em silencio,
 * e uma contagem truncada parecia exata. A porta agora diz quando parou no teto.
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
import { comparacaoTool } from '../tools/comparacao';
import { lerDoDono, lerDoDonoComCorte, type LeiturasDoTurno } from '../tools/ownerScopedRead';
import { panoramaTool } from '../tools/panorama';

const IDENTIDADE: ChatIdentity = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

/** Sempre ha proxima pagina: a leitura so para pelo teto. */
const semFim = () => Promise.resolve({ Items: [{ id: 'x', owner: 's-1::u-1' }], LastEvaluatedKey: { id: 'x' } });

beforeAll(() =>
  Object.assign(process.env, {
    MEDICAL_DOCUMENT_TABLE_NAME: 't-doc',
    LAB_RESULT_TABLE_NAME: 't-lab',
    MEDICINE_TABLE_NAME: 't-med',
    APPOINTMENT_TABLE_NAME: 't-appt',
    VACCINE_DOSE_TABLE_NAME: 't-vac',
    HEALTH_IMPORT_TABLE_NAME: 't-health',
  }),
);
beforeEach(() => mockSend.mockReset().mockResolvedValue({ Items: [] }));

describe('lerDoDonoComCorte', () => {
  it('parou no teto: incompleta, depois de 10 paginas', async () => {
    mockSend.mockImplementation(semFim);
    const leitura = await lerDoDonoComCorte('t-lab', IDENTIDADE);
    expect(leitura.incompleta).toBe(true);
    expect(leitura.linhas).toHaveLength(10);
    expect(mockSend).toHaveBeenCalledTimes(10);
  });

  it('acabou antes do teto: completa', async () => {
    const leitura = await lerDoDonoComCorte('t-lab', IDENTIDADE);
    expect(leitura).toEqual({ linhas: [], incompleta: false });
  });

  it('o sinal fica no registro do turno: a segunda leitura nao rele e sabe do corte', async () => {
    mockSend.mockImplementation(semFim);
    const leituras: LeiturasDoTurno = new Map();
    await lerDoDono('t-lab', IDENTIDADE, leituras);
    const segunda = await lerDoDonoComCorte('t-lab', IDENTIDADE, leituras);
    expect(segunda.incompleta).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(10);
  });

  it('lerDoDono continua devolvendo so as linhas', async () => {
    mockSend.mockResolvedValue({ Items: [{ id: 'a', owner: 's-1::u-1' }] });
    expect(await lerDoDono('t-lab', IDENTIDADE)).toEqual([{ id: 'a', owner: 's-1::u-1' }]);
  });
});

describe('o panorama e a comparacao avisam o corte', () => {
  it('panorama: uma tabela no teto liga leituraIncompleta', async () => {
    mockSend.mockImplementation((c: { input: { TableName: string } }) =>
      c.input.TableName === 't-med' ? semFim() : Promise.resolve({ Items: [] }),
    );
    expect(await panoramaTool.run({}, IDENTIDADE)).toMatchObject({ leituraIncompleta: true });
  });

  it('panorama: leitura completa nao traz o campo (cada token conta)', async () => {
    expect(await panoramaTool.run({}, IDENTIDADE)).not.toHaveProperty('leituraIncompleta');
  });

  it('comparacao: resultados no teto ligam leituraIncompleta, mesmo sem par', async () => {
    mockSend.mockImplementation((c: { input: { TableName: string } }) =>
      c.input.TableName === 't-lab' ? semFim() : Promise.resolve({ Items: [] }),
    );
    const saida = await comparacaoTool.run({ termo: 'colesterol', dadoDoWearable: 'sono' }, IDENTIDADE);
    expect(saida).toMatchObject({ leituraIncompleta: true });
  });
});
