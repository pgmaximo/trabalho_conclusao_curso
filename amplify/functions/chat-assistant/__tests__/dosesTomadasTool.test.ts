/**
 * Resumo do arquivo:
 * A ferramenta `consultar_doses_tomadas` (E3) como o despachante a ve: o que
 * ela recusa na entrada, como le (o cadastro pela porta do dono, o historico
 * pelo indice, uma consulta por remedio e todas juntas), o que faz quando a
 * leitura falha, e o modo degradado. As regras da saida estao em
 * `dosesTomadasSaida.test.ts`.
 *
 * "Agora" e 2026-10-21T18:00Z, ou seja, 15h de quarta em Brasilia.
 */
const mockSend = jest.fn();

jest.mock('@aws-sdk/lib-dynamodb', () => {
  class Comando {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }
  return {
    DynamoDBDocumentClient: { from: () => ({ send: (...a: unknown[]) => mockSend(...a) }) },
    GetCommand: class GetCommand extends Comando {},
    QueryCommand: class QueryCommand extends Comando {},
    ScanCommand: class ScanCommand extends Comando {},
  };
});
jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));

import { checkLanguageRules } from '../../ai-language-rules/languageRules';
import type { ChatIdentity } from '../auth';
import { buildDegradedAnswer } from '../degradedAnswer';
import { CHAT_TOOLS, runTool } from '../tools';
import { dosesTomadasTool } from '../tools/dosesTomadas';
import type { SaidaDasDoses } from '../tools/dosesTomadasSaida';

const IDENTIDADE: ChatIdentity = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

const remedio = (id: string, name: string, campos: Record<string, unknown> = {}) => ({
  id,
  owner: 's-1::u-1',
  name,
  dosage: '50 mg',
  times: ['08:00', '20:00'],
  frequencyType: 'DAILY',
  startDate: '2026-10-01',
  currentStock: 10,
  initialStock: 30,
  active: true,
  ...campos,
});

type Enviado = { constructor: { name: string }; input: Record<string, unknown> };
const enviados = (tipo: string) =>
  mockSend.mock.calls.map(([c]) => c as Enviado).filter((c) => c.constructor.name === tipo);

/** O Scan devolve os remedios; cada Query, as marcacoes daquele remedio. */
function banco(remedios: Record<string, unknown>[], marcacoes: Record<string, unknown>[] = []) {
  mockSend.mockImplementation(async (c: Enviado) => {
    if (c.constructor.name === 'ScanCommand') return { Items: remedios };
    const chave = (c.input.ExpressionAttributeValues as Record<string, string>)[':chave'];
    return { Items: marcacoes.filter((m) => m.medicineId === chave) };
  });
}

beforeAll(() => {
  process.env.MEDICINE_TABLE_NAME = 't-med';
  process.env.MEDICINE_DOSE_LOG_TABLE_NAME = 't-dose';
});
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-21T18:00:00Z'));
  mockSend.mockReset();
  banco([]);
});
afterEach(() => jest.useRealTimers());

describe('a entrada (CA-14)', () => {
  it.each([
    [{ owner: 'vitima::vitima' }],
    [{ medicineId: 'med-de-outro' }],
    [{ dias: 0 }],
    [{ dias: 31 }],
    [{ dias: 2.5 }],
    [{ medicamento: '' }],
    [{ medicamento: 'a'.repeat(81) }],
  ])('%j e recusada, e nenhuma leitura acontece', async (entrada) => {
    const saida = await runTool('consultar_doses_tomadas', entrada, IDENTIDADE);
    expect(saida).toMatchObject({ erro: expect.any(String) });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('esta registrada logo depois de consultar_medicamentos, e so le', () => {
    const nomes = CHAT_TOOLS.map((t) => t.name);
    expect(nomes.indexOf('consultar_doses_tomadas')).toBe(nomes.indexOf('consultar_medicamentos') + 1);
    expect(dosesTomadasTool.readOnly).toBe(true);
  });
});

describe('a leitura (CA-15)', () => {
  it('uma Query por remedio em uso, com o periodo de Brasilia', async () => {
    banco([remedio('med-1', 'Losartana'), remedio('med-2', 'Metformina'), remedio('med-3', 'Antigo', { active: false })]);

    await runTool('consultar_doses_tomadas', {}, IDENTIDADE);

    const consultas = enviados('QueryCommand').map((c) => c.input.ExpressionAttributeValues);
    expect(consultas).toEqual([
      { ':owner': 's-1::u-1', ':chave': 'med-1', ':de': '2026-10-15', ':ate': '2026-10-21' },
      { ':owner': 's-1::u-1', ':chave': 'med-2', ':de': '2026-10-15', ':ate': '2026-10-21' },
    ]);
  });

  it('com dias 30, o periodo comeca 29 dias antes de hoje', async () => {
    banco([remedio('med-1', 'Losartana', { startDate: '2026-09-01' })]);
    await runTool('consultar_doses_tomadas', { dias: 30 }, IDENTIDADE);
    expect(enviados('QueryCommand')[0].input.ExpressionAttributeValues).toMatchObject({ ':de': '2026-09-22' });
  });

  it('as consultas saem todas antes de qualquer uma responder (em paralelo)', async () => {
    const pendentes: Array<() => void> = [];
    mockSend.mockImplementation((c: Enviado) =>
      c.constructor.name === 'ScanCommand'
        ? Promise.resolve({ Items: [remedio('med-1', 'Losartana'), remedio('med-2', 'Metformina')] })
        : new Promise((resolve) => pendentes.push(() => resolve({ Items: [] }))),
    );

    const resposta = runTool('consultar_doses_tomadas', {}, IDENTIDADE);
    for (let i = 0; i < 20; i += 1) await Promise.resolve();

    // Em serie, a segunda so sairia depois que a primeira respondesse.
    expect(pendentes).toHaveLength(2);
    pendentes.forEach((responder) => responder());
    expect(await resposta).toMatchObject({ disponivel: true });
  });

  it('a resposta leva as marcacoes de cada remedio ao seu remedio', async () => {
    banco(
      [remedio('med-1', 'Losartana')],
      [{ medicineId: 'med-1', scheduledDate: '2026-10-21', scheduledTime: '08:00', owner: 's-1::u-1' }],
    );
    const saida = (await runTool('consultar_doses_tomadas', { medicamento: 'losartana', dias: 1 }, IDENTIDADE)) as SaidaDasDoses;
    expect(saida.medicamentos[0].hoje).toEqual([
      { horario: '08:00', situacao: 'marcado' },
      { horario: '20:00', situacao: 'pendente' },
    ]);
  });
});

describe('o fuso da pessoa (D3.5)', () => {
  it('no Acre, as 07:01 locais, o horario das 08:00 ainda nao chegou', async () => {
    jest.setSystemTime(new Date('2026-10-21T12:01:00Z')); // 09:01 em Brasilia
    banco([remedio('med-1', 'Losartana')]);

    const noAcre = (await runTool('consultar_doses_tomadas', { dias: 1 }, IDENTIDADE, {
      local: { uf: 'AC', codigoMunicipio: null },
    })) as SaidaDasDoses;
    expect(noAcre.medicamentos[0].hoje[0]).toEqual({ horario: '08:00', situacao: 'pendente' });

    const semUf = (await runTool('consultar_doses_tomadas', { dias: 1 }, IDENTIDADE)) as SaidaDasDoses;
    expect(semUf.medicamentos[0].hoje[0]).toEqual({ horario: '08:00', situacao: 'sem marcação' });
  });
});

describe('a falha (CA-18)', () => {
  it('Query que falha vira o erro generico do despachante', async () => {
    mockSend.mockImplementation(async (c: Enviado) => {
      if (c.constructor.name === 'ScanCommand') return { Items: [remedio('med-1', 'Losartana')] };
      throw new Error('AccessDeniedException na tabela t-dose');
    });
    const saida = await runTool('consultar_doses_tomadas', {}, IDENTIDADE);
    expect(saida).toEqual({ erro: 'Não foi possível consultar esse dado agora.' });
  });
});

describe('o modo degradado (CA-20)', () => {
  const saida = (semMarcacao: number, omitidos = 0): SaidaDasDoses => ({
    disponivel: true,
    periodo: { de: '2026-10-15', ate: '2026-10-21', dias: 7 },
    omitidos,
    medicamentos: [
      {
        nome: 'Losartana',
        termino: null,
        hoje: [
          { horario: '08:00', situacao: 'marcado' },
          { horario: '20:00', situacao: 'pendente' },
        ],
        contagem: { horariosEsperados: 14, marcados: 13 - semMarcacao, semMarcacao, pendentes: 1 },
        semMarcacao: [],
        semMarcacaoOmitidos: 0,
        marcacoesForaDoHorarioAtual: 0,
      },
    ],
  });

  it('uma linha por remedio, em horarios', () => {
    expect(dosesTomadasTool.renderDegraded!(saida(3))!.linhas[0]).toBe(
      'Losartana · hoje: 08:00 marcado, 20:00 pendente · sem marcação no período: 3 horários',
    );
    expect(dosesTomadasTool.renderDegraded!(saida(1))!.linhas[0]).toMatch(/: 1 horário$/);
    expect(dosesTomadasTool.renderDegraded!(saida(0))!.linhas[0]).toBe('Losartana · hoje: 08:00 marcado, 20:00 pendente');
  });

  it('conta os remedios que ficaram de fora', () => {
    expect(dosesTomadasTool.renderDegraded!(saida(0, 2))!.linhas).toContain('E mais 2 remédios na tela de Medicamentos.');
  });

  it('nunca diz "dose", e passa pelas regras de linguagem', () => {
    const resposta = buildDegradedAnswer([{ name: 'consultar_doses_tomadas', output: saida(3, 1) }])!;
    expect(resposta.texto).not.toMatch(/dose/i);
    for (const questionKind of ['clinica', 'operacional'] as const) {
      expect(checkLanguageRules(resposta.texto, { questionKind, temOrigem: false })).toEqual({ ok: true });
    }
  });

  it('com horario sem marcacao, diz que sem marcacao nao e nao ter tomado (revisao do E3)', () => {
    const linhas = dosesTomadasTool.renderDegraded!(saida(3))!.linhas;
    expect(linhas[linhas.length - 1]).toBe(
      'Sem marcação não quer dizer que você não tomou: você pode marcar na tela de Medicamentos.',
    );
    expect(dosesTomadasTool.renderDegraded!(saida(0))!.linhas).not.toContainEqual(expect.stringMatching(/^Sem marcação/));
  });

  it('sem remedio, nao ha bloco', () => {
    expect(dosesTomadasTool.renderDegraded!({ ...saida(0), medicamentos: [] })).toBeNull();
  });
});
