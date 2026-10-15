/**
 * A leitura da memória e o bloco que ela vira no prompt (M6).
 *
 * O espião aqui é o próprio cliente do DynamoDB, e não um objeto solto: o
 * Bloco E registrou um teste de filtro por dono que afirmava sobre uma lista
 * sempre vazia e teria passado mesmo sem filtro nenhum. Aqui a afirmação é
 * sobre a consulta que de fato foi montada.
 */
const mockSend = jest.fn();

// O SDK e mockado INTEIRO, sem `requireActual`: o pacote publicado e ESM e o
// jest-expo o carrega como CommonJS.
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

import { blocoDeMemoria, lerMemoria, montarSystemPrompt } from '../memoria/leitura';
import { MAX_FATOS } from '../memoria/regras';
import { SYSTEM_PROMPT } from '../chatPrompt';

const IDENTIDADE = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

function fato(id: string, text: string, kind = 'ROTINA', confirmedAt = '2026-09-10T12:00:00Z') {
  return { id, text, kind, confirmedAt, owner: IDENTIDADE.owner };
}

beforeAll(() => {
  process.env.ASSISTANT_MEMORY_TABLE_NAME = 't-memoria';
});

beforeEach(() => mockSend.mockReset().mockResolvedValue({ Items: [] }));

describe('a leitura passa pela porta única', () => {
  it('a consulta é montada com o dono do TOKEN', async () => {
    await lerMemoria(IDENTIDADE);
    expect(mockSend).toHaveBeenCalled();
    expect(JSON.stringify(mockSend.mock.calls)).toContain('s-1::u-1');
  });

  it('a consulta é na tabela de fatos, e não em outra', async () => {
    await lerMemoria(IDENTIDADE);
    expect(JSON.stringify(mockSend.mock.calls)).toContain('t-memoria');
  });

  it('sem tabela configurada, devolve lista vazia em vez de derrubar o turno', async () => {
    // Configuração ausente é falha nossa. Ela não pode custar a resposta da
    // pessoa: sem memória, o assistente continua respondendo.
    const antes = process.env.ASSISTANT_MEMORY_TABLE_NAME;
    delete process.env.ASSISTANT_MEMORY_TABLE_NAME;
    await expect(lerMemoria(IDENTIDADE)).resolves.toEqual([]);
    process.env.ASSISTANT_MEMORY_TABLE_NAME = antes;
  });
});

describe('o que a leitura devolve', () => {
  it('descarta fato com tipo que não está mais na lista fechada', async () => {
    // A lista pode encolher. Um fato órfão não pode entrar no prompt por um
    // tipo que ninguém mais reconhece -- seria finalidade sem decisão.
    mockSend.mockResolvedValue({
      Items: [fato('f-1', 'Trabalho de madrugada', 'ROTINA'), fato('f-2', 'Tenho diabetes', 'CONDICAO')],
    });
    const fatos = await lerMemoria(IDENTIDADE);
    expect(fatos.map((f) => f.id)).toEqual(['f-1']);
  });

  it('descarta fato sem texto', async () => {
    mockSend.mockResolvedValue({ Items: [fato('f-1', '   '), fato('f-2', 'Trabalho de madrugada')] });
    const fatos = await lerMemoria(IDENTIDADE);
    expect(fatos.map((f) => f.id)).toEqual(['f-2']);
  });

  it('corta no teto, ficando com os mais recentes', async () => {
    const muitos = Array.from({ length: MAX_FATOS + 5 }, (_, i) =>
      fato(`f-${i}`, `fato ${i}`, 'ROTINA', `2026-09-${String(i + 1).padStart(2, '0')}T12:00:00Z`),
    );
    mockSend.mockResolvedValue({ Items: muitos });
    const fatos = await lerMemoria(IDENTIDADE);
    expect(fatos).toHaveLength(MAX_FATOS);
    // O mais novo da lista sobreviveu, e o mais velho não.
    expect(fatos.map((f) => f.id)).toContain(`f-${MAX_FATOS + 4}`);
    expect(fatos.map((f) => f.id)).not.toContain('f-0');
  });
});

describe('o bloco que entra no prompt', () => {
  const FATOS = [
    { id: 'f-1', texto: 'Prefiro respostas curtas', tipo: 'PREFERENCIA_DE_RESPOSTA' as const },
    { id: 'f-2', texto: 'Trabalho de madrugada', tipo: 'ROTINA' as const },
  ];

  it('sem fato nenhum, nenhum bloco entra', () => {
    expect(blocoDeMemoria([])).toBe('');
    expect(montarSystemPrompt([])).toBe(SYSTEM_PROMPT);
  });

  it('o bloco traz o texto de cada fato', () => {
    const bloco = blocoDeMemoria(FATOS);
    expect(bloco).toContain('Prefiro respostas curtas');
    expect(bloco).toContain('Trabalho de madrugada');
  });

  it('o bloco diz que aquilo foi a PESSOA que pediu para lembrar', () => {
    expect(blocoDeMemoria(FATOS)).toMatch(/pediu para (você |voce )?(lembrar|guardar)/i);
  });

  it('o bloco diz que NÃO é registro de saúde', () => {
    // Sem esta linha, "faço caminhada três vezes por semana" poderia ser citado
    // como se fosse dado registrado, com a autoridade que só o registro tem.
    expect(blocoDeMemoria(FATOS)).toMatch(/não é registro|nao e registro/i);
  });

  it('o bloco diz que NÃO serve como fonte de número', () => {
    // A R4 continua valendo inteira: todo número citado vem de ferramenta, com
    // documento de origem.
    expect(blocoDeMemoria(FATOS)).toMatch(/número|numero/i);
    expect(blocoDeMemoria(FATOS)).toMatch(/ferramenta/i);
  });

  it('o prompt montado continua trazendo as regras de linguagem', () => {
    // Texto novo no prompt não pode empurrar as regras para fora.
    const montado = montarSystemPrompt(FATOS);
    expect(montado).toContain(SYSTEM_PROMPT);
    expect(montado.length).toBeGreaterThan(SYSTEM_PROMPT.length);
  });

  it('o bloco não usa o termo vetado', () => {
    const raiz = ['defi', 'nitiv'].join('');
    expect(blocoDeMemoria(FATOS).toLowerCase()).not.toContain(raiz);
  });
});
