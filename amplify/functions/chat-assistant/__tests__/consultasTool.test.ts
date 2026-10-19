/**
 * Resumo do arquivo:
 * O corte entre consultas futuras e passadas de `consultar_consultas` (E1,
 * achado A1). A Agenda grava `scheduledAt` em hora LOCAL ingenua
 * ("AAAA-MM-DDTHH:mm", contrato em `src/services/agendaDateRange.ts`), e a
 * ferramenta comparava esse texto com o UTC: como Brasilia esta 3 h atras, a
 * consulta das proximas 3 horas saia como passada -- justamente na pergunta
 * "tenho consulta hoje?".
 *
 * As linhas usam os nomes de campo do schema publicado
 * (`amplify/data/schemas/appointments.ts`).
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
import { consultasTool } from '../tools/consultas';

const IDENTIDADE: ChatIdentity = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

type Saida = {
  disponivel: boolean;
  futuras: { quando: string | null }[];
  passadas: { quando: string | null }[];
  proxima: { quando: string | null } | null;
  explicacao?: string;
};

function consulta(scheduledAt: string) {
  return {
    id: `c-${scheduledAt}`,
    owner: 's-1::u-1',
    appointmentType: 'CONSULTA',
    appointmentName: 'Cardiologista',
    scheduledAt,
  };
}

/** So o `Date` e falso: as promessas do mock do banco seguem reais. */
function relogioEm(iso: string) {
  jest.useFakeTimers({
    now: new Date(iso),
    doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval'],
  });
}

async function rodarCom(agoraIso: string, ...scheduledAt: string[]): Promise<Saida> {
  relogioEm(agoraIso);
  mockSend.mockResolvedValue({ Items: scheduledAt.map(consulta) });
  return (await consultasTool.run({}, IDENTIDADE)) as Saida;
}

beforeAll(() => Object.assign(process.env, { APPOINTMENT_TABLE_NAME: 't-agenda' }));
beforeEach(() => mockSend.mockReset());
afterEach(() => jest.useRealTimers());

describe('consultar_consultas: o corte usa a hora de Brasilia', () => {
  it('as 08h de Brasilia, a consulta das 10h de hoje e futura e proxima', async () => {
    const saida = await rodarCom('2026-10-18T11:00:00Z', '2026-10-18T10:00');
    expect(saida.futuras).toHaveLength(1);
    expect(saida.proxima?.quando).toBe('2026-10-18T10:00');
    expect(saida.passadas).toHaveLength(0);
  });

  it('as 10h01 de Brasilia, a mesma consulta e passada', async () => {
    const saida = await rodarCom('2026-10-18T13:01:00Z', '2026-10-18T10:00');
    expect(saida.futuras).toHaveLength(0);
    expect(saida.passadas).toHaveLength(1);
    expect(saida.proxima).toBeNull();
  });

  it('as 22h30 de Brasilia (01h30 UTC do dia seguinte), a das 23h e futura', async () => {
    const saida = await rodarCom('2026-10-18T01:30:00Z', '2026-10-17T23:00');
    expect(saida.futuras.map((c) => c.quando)).toEqual(['2026-10-17T23:00']);
    expect(saida.passadas).toHaveLength(0);
  });

  it('consulta so com data vale 00h00, como na Agenda: a de hoje ja passou', async () => {
    // `parseScheduledAt` (src/services/agendaDateRange.ts) le "AAAA-MM-DD"
    // como meia-noite local, e a Agenda a mostra no historico. O chat dizer
    // "sua proxima consulta e hoje" seria uma segunda resposta sobre o mesmo
    // registro.
    const saida = await rodarCom('2026-10-18T11:00:00Z', '2026-10-18');
    expect(saida.futuras).toHaveLength(0);
    expect(saida.passadas.map((c) => c.quando)).toEqual(['2026-10-18']);
  });

  it('consulta so com data, de amanha, e futura', async () => {
    const saida = await rodarCom('2026-10-18T11:00:00Z', '2026-10-19');
    expect(saida.futuras.map((c) => c.quando)).toEqual(['2026-10-19']);
  });

  it('consulta so com data, de ontem, e passada', async () => {
    const saida = await rodarCom('2026-10-18T11:00:00Z', '2026-10-17');
    expect(saida.futuras).toHaveLength(0);
    expect(saida.passadas.map((c) => c.quando)).toEqual(['2026-10-17']);
  });

  it('a forma da saida nao muda', async () => {
    const comConsulta = await rodarCom('2026-10-18T11:00:00Z', '2026-10-18T10:00');
    expect(Object.keys(comConsulta).sort()).toEqual(['disponivel', 'futuras', 'passadas', 'proxima']);

    const vazia = await rodarCom('2026-10-18T11:00:00Z');
    expect(Object.keys(vazia).sort()).toEqual([
      'disponivel',
      'explicacao',
      'futuras',
      'passadas',
      'proxima',
    ]);
    expect(vazia.disponivel).toBe(false);
  });
});
