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

  it('a forma da saida: a do E1 mais omitidas (E5)', async () => {
    const comConsulta = await rodarCom('2026-10-18T11:00:00Z', '2026-10-18T10:00');
    expect(Object.keys(comConsulta).sort()).toEqual(['disponivel', 'futuras', 'omitidas', 'passadas', 'proxima']);

    const vazia = await rodarCom('2026-10-18T11:00:00Z');
    expect(Object.keys(vazia).sort()).toEqual([
      'disponivel',
      'explicacao',
      'futuras',
      'omitidas',
      'passadas',
      'proxima',
    ]);
    expect(vazia.disponivel).toBe(false);
    expect((vazia as Saida & { omitidas: number }).omitidas).toBe(0);
  });
});


/**
 * Observacoes e teto (E5). A observacao e o que a pessoa anotou ("jejum de 12
 * horas"); o teto existe porque cada consulta com observacao cheia custa perto de 110 tokens,
 * e `omitidas` porque sem a contagem a lista pareceria completa.
 */
type ConsultaE5 = { quando: string | null; observacoes: string | null; observacoesCortadas: boolean };
type SaidaE5 = {
  futuras: ConsultaE5[];
  passadas: ConsultaE5[];
  proxima: ConsultaE5 | null;
  omitidas: number;
};

async function rodarComLinhas(linhas: Record<string, unknown>[]): Promise<SaidaE5> {
  relogioEm('2026-10-18T11:00:00Z');
  mockSend.mockResolvedValue({ Items: linhas });
  return (await consultasTool.run({}, IDENTIDADE)) as SaidaE5;
}

/** "2026-10-19T08:00" mais `n` dias, para gerar listas longas e ordenadas. */
function diaDepois(base: string, n: number): string {
  const d = new Date(`${base}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

describe('consultar_consultas: observacoes e teto (E5)', () => {
  it('consulta com observacao devolve o texto anotado (CA-1)', async () => {
    const saida = await rodarComLinhas([
      { ...consulta('2026-10-22T07:30'), observations: 'jejum de 12 horas, levar exames antigos' },
    ]);
    expect(saida.futuras[0]).toMatchObject({
      observacoes: 'jejum de 12 horas, levar exames antigos',
      observacoesCortadas: false,
    });
  });

  it('consulta sem observacao devolve null (CA-1)', async () => {
    const saida = await rodarComLinhas([consulta('2026-10-22T07:30')]);
    expect(saida.futuras[0]).toMatchObject({ observacoes: null, observacoesCortadas: false });
  });

  it('observacao longa volta cortada em 300 e avisa (CA-2)', async () => {
    const saida = await rodarComLinhas([{ ...consulta('2026-10-22T07:30'), observations: 'x'.repeat(800) }]);
    expect(saida.futuras[0].observacoes).toHaveLength(300);
    expect(saida.futuras[0].observacoesCortadas).toBe(true);
  });

  it('25 futuras e 30 passadas: 20 mais proximas, 20 mais recentes, 15 omitidas (CA-4)', async () => {
    const futuras = Array.from({ length: 25 }, (_, i) => consulta(`${diaDepois('2026-10-19', i)}T08:00`));
    const passadas = Array.from({ length: 30 }, (_, i) => consulta(`${diaDepois('2026-08-01', i)}T08:00`));
    const saida = await rodarComLinhas([...passadas, ...futuras].reverse());

    expect(saida.futuras).toHaveLength(20);
    expect(saida.futuras[0].quando).toBe('2026-10-19T08:00');
    expect(saida.proxima?.quando).toBe('2026-10-19T08:00');
    expect(saida.passadas).toHaveLength(20);
    expect(saida.passadas[19].quando).toBe(`${diaDepois('2026-08-01', 29)}T08:00`);
    expect(saida.passadas[0].quando).toBe(`${diaDepois('2026-08-01', 10)}T08:00`);
    expect(saida.omitidas).toBe(15);
  });

  it('sem corte, omitidas e zero', async () => {
    const saida = await rodarComLinhas([consulta('2026-10-22T07:30'), consulta('2026-10-01T07:30')]);
    expect(saida.omitidas).toBe(0);
  });

  it('com 21 passadas, a consulta sem data e a cortada', async () => {
    const passadas = Array.from({ length: 20 }, (_, i) => consulta(`${diaDepois('2026-08-01', i)}T08:00`));
    const semData = { id: 'c-sem-data', owner: 's-1::u-1', appointmentName: 'Sem data' };
    const saida = await rodarComLinhas([semData, ...passadas]);
    expect(saida.passadas).toHaveLength(20);
    expect(saida.passadas.every((c) => c.quando !== null)).toBe(true);
    expect(saida.omitidas).toBe(1);
  });

  it('o modo degradado nao mostra a observacao (CA-6)', async () => {
    const saida = await rodarComLinhas([
      { ...consulta('2026-10-22T07:30'), observations: 'tomar 2 comprimidos antes' },
    ]);
    const bloco = consultasTool.renderDegraded?.(saida);
    expect(bloco?.linhas).toHaveLength(1);
    expect(JSON.stringify(bloco)).not.toContain('comprimidos');
  });
});
