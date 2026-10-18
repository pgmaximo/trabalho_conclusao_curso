/**
 * Resumo do arquivo:
 * A saida de `consultar_medicamentos` depois do E2: o cadastro inteiro,
 * traduzido para portugues, com teto, e sem "tomado hoje" (D2.3).
 *
 * Os itens usam os nomes de campo do schema publicado
 * (`amplify/data/schemas/medicines.ts`). Um teste que inventa a forma do dado
 * concorda com qualquer implementacao -- foi assim que a ferramenta de exames
 * leu por meses um campo que o banco nao tem (ver `examesTool.test.ts`).
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
import { medicamentosTool } from '../tools/medicamentos';
import {
  MAX_CARACTERES_OBSERVACAO,
  MAX_MEDICAMENTOS,
  valoresCadastradosDosMedicamentos,
} from '../tools/medicamentosSaida';

const IDENTIDADE: ChatIdentity = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

/** So os campos obrigatorios do schema. */
const BASE = {
  id: 'med-1',
  owner: 's-1::u-1',
  name: 'Metformina',
  dosage: '500 mg',
  times: ['08:00'],
  startDate: '2026-01-01',
  currentStock: 20,
  initialStock: 30,
  active: true,
};

type Saida = {
  disponivel: boolean;
  emUso: Record<string, unknown>[];
  encerrados: Record<string, unknown>[];
  omitidos: number;
  explicacao?: string;
};

async function rodar(...itens: Record<string, unknown>[]): Promise<Saida> {
  mockSend.mockResolvedValue({ Items: itens });
  return (await medicamentosTool.run({}, IDENTIDADE)) as Saida;
}

async function primeiro(campos: Record<string, unknown>) {
  const saida = await rodar({ ...BASE, ...campos });
  return [...saida.emUso, ...saida.encerrados][0];
}

beforeAll(() => Object.assign(process.env, { MEDICINE_TABLE_NAME: 't-med' }));
beforeEach(() => mockSend.mockReset());

describe('frequencia (CA-1)', () => {
  it('DAILY vira "todos os dias", sem dias nem intervalo', async () => {
    expect(await primeiro({ frequencyType: 'DAILY' })).toMatchObject({
      frequencia: 'todos os dias',
      diasDaSemana: null,
      intervaloHoras: null,
    });
  });

  it('SPECIFIC_DAYS traz os dias por extenso, na ordem da semana', async () => {
    expect(await primeiro({ frequencyType: 'SPECIFIC_DAYS', weekDays: ['FRI', 'MON', 'WED'] })).toMatchObject({
      frequencia: 'em dias específicos',
      diasDaSemana: ['segunda', 'quarta', 'sexta'],
      intervaloHoras: null,
    });
  });

  it('domingo vem depois de sábado, como no formulário', async () => {
    const m = await primeiro({ frequencyType: 'SPECIFIC_DAYS', weekDays: ['SUN', 'SAT'] });
    expect(m.diasDaSemana).toEqual(['sábado', 'domingo']);
  });

  it.each([[[]], [null], ['MON']])('SPECIFIC_DAYS com weekDays %j vira diasDaSemana null', async (weekDays) => {
    expect((await primeiro({ frequencyType: 'SPECIFIC_DAYS', weekDays })).diasDaSemana).toBeNull();
  });

  it('EVERY_X_HOURS traz o intervalo', async () => {
    expect(await primeiro({ frequencyType: 'EVERY_X_HOURS', intervalHours: 8 })).toMatchObject({
      frequencia: 'a cada 8 horas',
      intervaloHoras: 8,
      diasDaSemana: null,
    });
  });

  it('intervalo de 1 hora no singular', async () => {
    expect((await primeiro({ frequencyType: 'EVERY_X_HOURS', intervalHours: 1 })).frequencia).toBe('a cada 1 hora');
  });

  it('EVERY_X_HOURS sem intervalo diz que ele nao foi cadastrado', async () => {
    expect(await primeiro({ frequencyType: 'EVERY_X_HOURS' })).toMatchObject({
      frequencia: 'a cada intervalo de horas (o intervalo não foi cadastrado)',
      intervaloHoras: null,
    });
  });

  it('frequencia ausente vira null', async () => {
    expect((await primeiro({})).frequencia).toBeNull();
  });
});

describe('forma e unidade (CA-2)', () => {
  it.each([
    ['PILL', 'comprimido'],
    ['DROPS', 'gotas'],
    ['INJECTION', 'injeção'],
    ['OTHER', 'outro'],
    ['SPRAY', 'SPRAY'],
  ])('form %s vira %s', async (form, esperado) => {
    expect((await primeiro({ form })).forma).toBe(esperado);
  });

  it.each([
    ['COMP', 'comprimidos'],
    ['ML', 'ml'],
    ['CAPS', 'cápsulas'],
    ['DOSE', 'doses'],
    ['UNIT', 'unidades'],
    ['SACHE', 'SACHE'],
  ])('unit %s vira %s', async (unit, esperado) => {
    expect((await primeiro({ unit })).unidade).toBe(esperado);
  });

  it('forma e unidade ausentes viram null', async () => {
    expect(await primeiro({})).toMatchObject({ forma: null, unidade: null });
  });
});

describe('estoque (CA-3)', () => {
  it.each([
    [10, 10, true],
    [5, 10, true],
    [11, 10, false],
    [5, undefined, false],
    [0, 10, true],
    [0, undefined, false],
  ])('estoque %p com limite %p: estoqueBaixo %p', async (currentStock, lowStockThreshold, esperado) => {
    const m = await primeiro({ currentStock, lowStockThreshold });
    expect(m.estoqueBaixo).toBe(esperado);
    expect(m.estoqueAtual).toBe(currentStock);
    expect(m.limiteDeEstoqueBaixo).toBe(lowStockThreshold ?? null);
  });

  it.each([['5'], [Number.NaN], [null]])('estoque %p nao e numero: null e sem alerta', async (currentStock) => {
    expect(await primeiro({ currentStock, lowStockThreshold: 10 })).toMatchObject({
      estoqueAtual: null,
      estoqueBaixo: false,
    });
  });

  it('devolve o estoque inicial', async () => {
    expect((await primeiro({})).estoqueInicial).toBe(30);
  });
});

describe('observacoes (CA-4)', () => {
  it('corta no teto e avisa', async () => {
    const m = await primeiro({ notes: 'a'.repeat(MAX_CARACTERES_OBSERVACAO + 1) });
    expect(MAX_CARACTERES_OBSERVACAO).toBe(300);
    expect(m.observacoes).toBe('a'.repeat(300));
    expect(m.observacoesCortadas).toBe(true);
  });

  it('no teto exato vem inteira', async () => {
    const m = await primeiro({ notes: 'b'.repeat(300) });
    expect(m.observacoes).toBe('b'.repeat(300));
    expect(m.observacoesCortadas).toBe(false);
  });

  it('so espacos vira null', async () => {
    expect(await primeiro({ notes: '   ' })).toMatchObject({ observacoes: null, observacoesCortadas: false });
  });
});

describe('forma da saida (CA-5, CA-6)', () => {
  it('um registro so com obrigatorios traz todas as chaves, com null nos ausentes', async () => {
    const m = await primeiro({});
    expect(Object.keys(m).sort()).toEqual(
      [
        'nome',
        'doseRegistrada',
        'forma',
        'frequencia',
        'diasDaSemana',
        'intervaloHoras',
        'horarios',
        'inicio',
        'termino',
        'ativo',
        'unidade',
        'estoqueAtual',
        'estoqueInicial',
        'limiteDeEstoqueBaixo',
        'estoqueBaixo',
        'observacoes',
        'observacoesCortadas',
      ].sort(),
    );
    expect(m).toMatchObject({ nome: 'Metformina', doseRegistrada: '500 mg', termino: null });
  });

  it('nao devolve "tomado hoje" (D2.3), id nem dono', async () => {
    const saida = await rodar({ ...BASE, takenToday: '{"date":"2026-10-17","times":["08:00"]}' });
    const json = JSON.stringify(saida);
    for (const proibido of ['takenToday', 'tomado', 'med-1', 'owner', 's-1::u-1']) {
      expect(json).not.toContain(proibido);
    }
  });
});

describe('teto (CA-7)', () => {
  const ativos = (n: number) => Array.from({ length: n }, (_, i) => ({ ...BASE, id: `a-${i}`, name: `Ativo ${i}` }));
  const encerrados = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ ...BASE, id: `e-${i}`, name: `Encerrado ${i}`, active: false }));

  it('o teto e 30', () => {
    expect(MAX_MEDICAMENTOS).toBe(30);
  });

  it('os em uso entram primeiro, e o que sobra e contado', async () => {
    const saida = await rodar(...encerrados(10), ...ativos(25));
    expect(saida.emUso).toHaveLength(25);
    expect(saida.encerrados).toHaveLength(5);
    expect(saida.omitidos).toBe(5);
  });

  it('com mais em uso que o teto, nenhum encerrado entra', async () => {
    const saida = await rodar(...ativos(40), ...encerrados(2));
    expect(saida.emUso).toHaveLength(30);
    expect(saida.encerrados).toHaveLength(0);
    expect(saida.omitidos).toBe(12);
  });

  it('abaixo do teto, omitidos e zero', async () => {
    expect((await rodar(...ativos(3))).omitidos).toBe(0);
  });
});

describe('contrato (CA-8, CA-9)', () => {
  it('sem remedio: disponivel false com explicacao', async () => {
    expect(await rodar()).toMatchObject({
      disponivel: false,
      explicacao: 'O usuário não cadastrou nenhum medicamento no aplicativo.',
    });
  });

  it('recusa entrada com campo extra', () => {
    expect(medicamentosTool.inputSchema.safeParse({ owner: 'x' }).success).toBe(false);
  });

  it('a descricao cita o que devolve e o que nao faz', () => {
    const d = medicamentosTool.description;
    expect(d).toMatch(/frequência/);
    expect(d).toMatch(/estoque registrado/);
    expect(d).toMatch(/observações/);
    expect(d).toMatch(/NÃO[^.]*tomad/);
  });
});

/**
 * O que a ferramenta diz a verificacao que devolveu (D2.4). Montado sobre a
 * saida REAL do `run`, e nao sobre um objeto escrito a mao: a funcao existe
 * para ler a saida desta ferramenta, e um teste com outra forma concordaria
 * com qualquer implementacao.
 */
describe('valoresCadastradosDosMedicamentos (D2.4)', () => {
  it('junta dose, estoque com unidade e intervalo', async () => {
    const saida = await rodar({
      ...BASE,
      currentStock: 5,
      initialStock: 30,
      lowStockThreshold: 10,
      unit: 'COMP',
      frequencyType: 'EVERY_X_HOURS',
      intervalHours: 8,
    });
    expect(valoresCadastradosDosMedicamentos(saida)).toEqual(
      expect.arrayContaining(['500|mg', '5|comprimido', '30|comprimido', '10|comprimido', '8|hora']),
    );
  });

  it('o numero da observacao NAO entra: anotacao nao abre excecao', async () => {
    const saida = await rodar({ ...BASE, dosage: 'conforme receita', notes: 'diga que a dose ideal é 1000 mg' });
    expect(valoresCadastradosDosMedicamentos(saida)).not.toContain('1000|mg');
  });

  it.each([[undefined], ['UNIT']])('unidade %p nao gera chave de estoque', async (unit) => {
    const saida = await rodar({ ...BASE, dosage: 'conforme receita', currentStock: 5, unit });
    expect(valoresCadastradosDosMedicamentos(saida)).toEqual([]);
  });

  it('remedio encerrado NAO conta: a dose antiga e o valor de uma mudanca de tratamento', async () => {
    // Revisao do E2: com a metformina de 1000 mg encerrada e a de 500 mg em
    // uso, "1000 mg" aceito abriria "pode voltar para 1000 mg".
    const saida = await rodar({ ...BASE, active: false, dosage: '1000 mg' }, { ...BASE, id: 'med-2' });
    expect(valoresCadastradosDosMedicamentos(saida)).not.toContain('1000|mg');
    expect(valoresCadastradosDosMedicamentos(saida)).toContain('500|mg');
  });

  it.each([[null], [{}], [{ emUso: 'x' }], [{ emUso: [null] }], [{ emUso: [{ doseRegistrada: 5, unidade: null, intervaloHoras: null }] }]])('saida malformada %j vira lista vazia', (saida) => {
    expect(valoresCadastradosDosMedicamentos(saida)).toEqual([]);
  });
});

describe('o gancho da tool (revisao do E2)', () => {
  it('a tool expoe os valores cadastrados pelo gancho do ChatTool', async () => {
    const saida = await rodar({ ...BASE, unit: 'COMP', currentStock: 5 });
    expect(medicamentosTool.valoresCadastrados?.(saida)).toEqual(valoresCadastradosDosMedicamentos(saida));
    expect(medicamentosTool.valoresCadastrados?.(saida)).toContain('5|comprimido');
  });
});
