/**
 * Resumo do arquivo:
 * A casca de `consultar_vacinas` (E5): le as doses do dono e entrega a saida
 * de `vacinasSaida.ts`. A regra de cada campo e do reforco esta testada em
 * `vacinasSaida.test.ts`; aqui, a ligacao e o modo degradado, que segue sem
 * lote nem observacao (D31: o degradado mostra so o que nao reprova).
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
import { vacinasTool } from '../tools/vacinas';
import type { SaidaDasVacinas } from '../tools/vacinasSaida';

const IDENTIDADE: ChatIdentity = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

const GRIPE = {
  id: 'v-1',
  owner: 's-1::u-1',
  name: 'Influenza (gripe)',
  doseNumber: 1,
  appliedDate: '2026-04-01',
  lot: 'AB123',
  manufacturer: 'Butantan',
  notes: 'braço esquerdo',
  recommendedIntervalYears: 1,
};

async function rodar(...linhas: Record<string, unknown>[]): Promise<SaidaDasVacinas> {
  mockSend.mockResolvedValue({ Items: linhas });
  return (await vacinasTool.run({}, IDENTIDADE)) as SaidaDasVacinas;
}

beforeAll(() => Object.assign(process.env, { VACCINE_DOSE_TABLE_NAME: 't-vacinas' }));
beforeEach(() => mockSend.mockReset());

describe('consultar_vacinas (E5)', () => {
  it('entrega lote, fabricante e o reforco previsto pelo registro', async () => {
    const saida = await rodar(GRIPE);
    expect(saida.aplicadas[0]).toMatchObject({ lote: 'AB123', fabricante: 'Butantan' });
    expect(saida.reforcosPrevistos).toEqual([
      { vacina: 'Influenza (gripe)', ultimaDoseEm: '2026-04-01', intervaloAnos: 1, previstoPara: '2027-04-01' },
    ]);
  });

  it('sem doses, responde que nao ha dado', async () => {
    const saida = await rodar();
    expect(saida.disponivel).toBe(false);
    expect(saida.explicacao).toBeDefined();
  });

  it('o modo degradado segue igual: sem lote nem observacao', async () => {
    const saida = await rodar(GRIPE);
    expect(vacinasTool.renderDegraded?.(saida)).toEqual({
      titulo: 'Doses registradas',
      linhas: ['Influenza (gripe) · 1a dose · 2026-04-01'],
      citacoes: [],
    });
  });
});
