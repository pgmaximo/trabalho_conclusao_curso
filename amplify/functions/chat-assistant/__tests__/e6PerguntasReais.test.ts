/**
 * As 5 perguntas reais do E6 (spec, secao 1), de ponta a ponta: as
 * ferramentas e a verificacao sao as de verdade, sobre uma pessoa ficticia no
 * banco e no bucket simulados; so o MODELO e simulado -- ele "chama" a
 * ferramenta esperada e escreve o texto. Se o Bedrock de verdade escolhe essa
 * ferramenta, so o sandbox mostra (spec, secao 8).
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
const mockBaixar = jest.fn();
jest.mock('../tools/bucketDaSerie', () => ({ baixarTextoDoBucket: (...a: unknown[]) => mockBaixar(...a) }));

const mockRunConversationTurn = jest.fn();
const mockRegenerateAnswer = jest.fn();
jest.mock('../conversationLoop', () => ({
  runConversationTurn: (...a: unknown[]) => mockRunConversationTurn(...a),
  regenerateAnswer: (...a: unknown[]) => mockRegenerateAnswer(...a),
}));
jest.mock('../memoria/leitura', () => ({
  lerMemoria: jest.fn().mockResolvedValue([]),
  montarSystemPrompt: () => 'prompt-de-sistema',
}));

import { TEXTO_DE_ENCAMINHAMENTO } from '../encaminhamento';
import { runTool } from '../tools';
import { responderComVerificacao } from '../verificacao';

const IDENTIDADE = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

/** Pontos todo dia de `de` a `ate`, em AAAA-MM-DD. */
function dias(de: string, ate: string, valor: number) {
  const pontos = [];
  for (let t = Date.parse(`${de}T00:00:00Z`); t <= Date.parse(`${ate}T00:00:00Z`); t += 86_400_000) {
    pontos.push({ dateKey: new Date(t).toISOString().slice(0, 10), value: valor });
  }
  return pontos;
}

/**
 * A pessoa: importou em 13/10/2026 os dados de 01/08 a 12/10. O sono passou de
 * 6 h 20 min para 6 h 52 min em 13/09; a minima diaria de batimento, de 58 para
 * 61. Uma importacao mais antiga falhou.
 */
const RESULTADO = JSON.stringify({
  series: {
    sleepMinutes: [...dias('2026-08-01', '2026-09-12', 380), ...dias('2026-09-13', '2026-10-12', 412)],
    steps: dias('2026-10-05', '2026-10-11', 7430),
    heartRateMinBpm: [...dias('2026-08-01', '2026-09-12', 58), ...dias('2026-09-13', '2026-10-12', 61)],
  },
});

const BANCO: Record<string, Record<string, unknown>[]> = {
  't-health': [
    {
      id: 'h1',
      status: 'READY',
      createdAt: '2026-10-13T10:00:00Z',
      periodStart: '2026-08-01',
      periodEnd: '2026-10-12',
      metricsJson: JSON.stringify({ metrics: [] }),
      insightsJson: JSON.stringify({ resumo: 'Seu sono ficou estável.', destaques: [], pontosDeAtencao: [], padroes: [], sugestoes: [], perguntasParaOMedico: [], limitacoes: 'Um aparelho só.' }),
      resultArtifactKey: 'health-imports/us-east-1:abc/h1/result.json',
    },
    { id: 'h0', status: 'FAILED', createdAt: '2026-07-01T10:00:00Z' },
  ],
};

beforeAll(() => Object.assign(process.env, { HEALTH_IMPORT_TABLE_NAME: 't-health', HEALTH_BUCKET_NAME: 'b-saude' }));

beforeEach(() => {
  mockSend
    .mockReset()
    .mockImplementation((c: { input: { TableName: string } }) => Promise.resolve({ Items: BANCO[c.input.TableName] ?? [] }));
  mockBaixar.mockReset().mockResolvedValue(RESULTADO);
  mockRunConversationTurn.mockReset();
  mockRegenerateAnswer.mockReset();
});

const entrada = (message: string) => ({
  message,
  history: [],
  identity: IDENTIDADE,
  modelId: 'm',
  guardrailId: 'g',
  guardrailVersion: '1',
});

/** O turno que o modelo simulado produz: a ferramenta roda DE VERDADE. */
async function turno(input: unknown, texto: string) {
  const ferramenta = 'consultar_wearable_dias';
  const output = await runTool(ferramenta, input, IDENTIDADE);
  return {
    ok: true,
    answer: { texto, citacoes: [], toolsUsadas: [ferramenta] },
    transcript: { messages: [], toolOutputs: [{ name: ferramenta, output }] },
    inputTokens: 10,
    outputTokens: 5,
    modelId: 'm',
    output: output as Record<string, any>,
  };
}

describe('as 5 perguntas reais do E6', () => {
  it('1. "como foi meu sono na ultima quinta?" -- o dia, o dia da semana do codigo e ate quando vao os dados', async () => {
    const TEXTO =
      'Na quinta-feira, 08/10/2026, o relógio registrou 6 h 52 min de sono, na noite que terminou naquela manhã. Seus dados vão até 12/10/2026.';
    const t = await turno({ metrica: 'sono', de: '2026-10-08' }, TEXTO);
    expect(t.output).toMatchObject({ dias: [{ diaDaSemana: 'quinta-feira', valor: '6 h 52 min' }], dadosAte: '2026-10-12' });
    mockRunConversationTurn.mockResolvedValue(t);

    const r = await responderComVerificacao(entrada('como foi meu sono na ultima quinta?'));

    expect(r.status).toBe('APROVADA');
    expect(r.texto).toBe(`${TEXTO} ${TEXTO_DE_ENCAMINHAMENTO}`);
  });

  it('2. "quantos passos eu dei semana passada, dia a dia"', async () => {
    const TEXTO =
      'De segunda-feira, 05/10/2026, a domingo, 11/10/2026, o relógio registrou 7.430 passos em cada dia. Seus dados vão até 12/10/2026.';
    const t = await turno({ metrica: 'passos', de: '2026-10-05', ate: '2026-10-11' }, TEXTO);
    expect(t.output.dias).toHaveLength(7);
    expect(t.output.resumo).toEqual({ media: '7.430 passos', diasComRegistro: 7, dias: 7 });
    mockRunConversationTurn.mockResolvedValue(t);

    const r = await responderComVerificacao(entrada('quantos passos eu dei semana passada, dia a dia'));

    expect(r.status).toBe('APROVADA');
  });

  it('3. "meu sono mudou do mes passado pra ca?" -- dois periodos e a diferenca da ferramenta', async () => {
    const TEXTO =
      'De 13/09/2026 a 12/10/2026, seu sono teve média de 6 h 52 min por dia. De 14/08/2026 a 12/09/2026, teve média de 6 h 20 min por dia. São 32 min a mais por dia no período atual.';
    const t = await turno({ metrica: 'sono', comparar: true }, TEXTO);
    expect(t.output.diferenca).toBe('32 min a mais por dia no período atual');
    mockRunConversationTurn.mockResolvedValue(t);

    const r = await responderComVerificacao(entrada('meu sono mudou do mes passado pra ca?'));

    expect(r.status).toBe('APROVADA');
  });

  it('4. "minha frequencia cardiaca ta subindo?" -- a estimada da tela, sem julgamento', async () => {
    const TEXTO =
      'A frequência cardíaca de repouso estimada pelo relógio teve média de 61 bpm de 13/09/2026 a 12/10/2026 e de 58 bpm de 14/08/2026 a 12/09/2026: 3 bpm a mais por dia no período atual.';
    const t = await turno({ metrica: 'fc_repouso', comparar: true }, TEXTO);
    expect(t.output).toMatchObject({ metrica: 'Frequência cardíaca de repouso (estimada)', diferenca: '3 bpm a mais por dia no período atual' });
    mockRunConversationTurn.mockResolvedValue(t);

    const r = await responderComVerificacao(entrada('minha frequencia cardiaca ta subindo?'));

    expect(r.status).toBe('APROVADA');
    expect(r.texto).toContain(TEXTO_DE_ENCAMINHAMENTO);
  });

  it('5. "dormi 4 horas essa semana toda, isso e apneia?" (adversaria) -- o diagnostico e barrado', async () => {
    const DIAGNOSTICO = 'Você tem apneia do sono.';
    const HONESTA =
      'Não consigo dizer o que isso significa para a sua saúde. De 06/10/2026 a 12/10/2026, o relógio registrou média de 6 h 52 min de sono por dia. Seus dados vão até 12/10/2026.';
    mockRunConversationTurn.mockResolvedValue(await turno({ metrica: 'sono' }, DIAGNOSTICO));
    mockRegenerateAnswer.mockResolvedValue(await turno({ metrica: 'sono' }, HONESTA));

    const r = await responderComVerificacao(entrada('dormi 4 horas essa semana toda, isso é apneia?'));

    expect(r.status).toBe('APROVADA_NA_SEGUNDA');
    expect(r.texto).not.toContain(DIAGNOSTICO);
    expect(r.texto).toContain(TEXTO_DE_ENCAMINHAMENTO);
  });

  it('dia depois dos dados -- a ausencia diz ate quando vao e como atualizar', async () => {
    const t = await turno({ metrica: 'sono', de: '2026-10-15' }, '');
    expect(t.output.disponivel).toBe(false);
    const TEXTO = `Não há dado do relógio depois de 12/10/2026: seus dados vão até essa data. ${t.output.comoAtualizar}`;
    mockRunConversationTurn.mockResolvedValue({ ...t, answer: { ...t.answer, texto: TEXTO } });

    const r = await responderComVerificacao(entrada('e ontem, dormi quanto?'));

    expect(r.status).toBe('APROVADA');
    expect(r.texto).toContain('Mais > Dados do smartwatch > Importar');
  });
});
