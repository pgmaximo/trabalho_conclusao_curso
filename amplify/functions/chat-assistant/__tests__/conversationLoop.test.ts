/**
 * O laco de tools. Os testes daqui cobrem os tres limites, a forma da chamada
 * ao modelo, e a propriedade que a D31 exige e que e a mais facil de perder de
 * vista: a SEGUNDA geracao nao refaz as consultas.
 *
 * O plano trazia um `converseFalso` com metodos (`sempreChamaTool`,
 * `depoisResponde`, `limparContagem`) que nao existem em lugar nenhum. O
 * duplo abaixo e escrito aqui.
 */
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: class {
    send(comando: unknown) {
      return mockSend(comando);
    }
  },
  ConverseCommand: class {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  },
}));

const mockRunTool = jest.fn();
jest.mock('../tools', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { z } = require('zod') as typeof import('zod');
  return {
    CHAT_TOOLS: [
      {
        name: 'consultar_analito',
        description: 'Consulta o histórico de um resultado. NÃO interpreta.',
        inputSchema: z.object({ termo: z.string().optional() }).strict(),
        readOnly: true,
        run: jest.fn(),
      },
      {
        name: 'consultar_consultas',
        description: 'Lista as consultas agendadas. NÃO agenda nada.',
        inputSchema: z.object({}).strict(),
        readOnly: true,
        run: jest.fn(),
      },
    ],
    runTool: (...a: unknown[]) => mockRunTool(...a),
    findTool: () => undefined,
  };
});

import { LANGUAGE_RULES_PROMPT } from '../../ai-language-rules/rulesPrompt';
import {
  HISTORY_WINDOW,
  MAX_OUTPUT_TOKENS,
  MAX_TOOL_ITERATIONS,
  regenerateAnswer,
  runConversationTurn,
  type TurnInput,
} from '../conversationLoop';

const ENTRADA: TurnInput = {
  message: 'como está minha vitamina D comparada ao exame anterior?',
  history: [],
  identity: { sub: 's-1', username: 'u-1', owner: 's-1::u-1' },
  modelId: 'us.anthropic.claude-sonnet-4-6',
  guardrailId: 'gr-1',
  guardrailVersion: '1',
};

/** Uma resposta final do modelo: texto com o envelope JSON que o schema exige. */
function respondeTexto(texto: string, citacoes: unknown[] = []) {
  return {
    stopReason: 'end_turn',
    usage: { inputTokens: 100, outputTokens: 50 },
    output: {
      message: { role: 'assistant', content: [{ text: JSON.stringify({ texto, citacoes }) }] },
    },
  };
}

/** Uma resposta do modelo pedindo uma ferramenta. */
function pedeTool(name: string, id = 'tu-1') {
  return {
    stopReason: 'tool_use',
    usage: { inputTokens: 100, outputTokens: 20 },
    output: {
      message: {
        role: 'assistant',
        content: [{ toolUse: { toolUseId: id, name, input: {} } }],
      },
    },
  };
}

function ultimaChamada(): Record<string, any> {
  return (mockSend.mock.calls.at(-1)?.[0] as { input: Record<string, any> }).input;
}

beforeEach(() => {
  mockSend.mockReset();
  mockRunTool.mockReset().mockResolvedValue({ disponivel: true, series: [] });
});

describe('os tres limites', () => {
  it('sao numeros no codigo, nao nocoes', () => {
    expect(MAX_TOOL_ITERATIONS).toBeGreaterThan(0);
    expect(MAX_TOOL_ITERATIONS).toBeLessThanOrEqual(8);
    expect(HISTORY_WINDOW).toBeGreaterThan(0);
    expect(MAX_OUTPUT_TOKENS).toBeGreaterThan(0);
  });

  it('atingir o teto de iteracoes e indisponibilidade honesta, NUNCA resposta parcial', async () => {
    // Uma resposta parcial apresentada como completa e o pior resultado
    // possivel: ela parece uma resposta.
    mockSend.mockResolvedValue(pedeTool('consultar_analito'));
    const r = await runConversationTurn(ENTRADA);
    expect(r.ok).toBe(false);
    expect(mockSend).toHaveBeenCalledTimes(MAX_TOOL_ITERATIONS);
  });

  it('o teto nao devolve o que juntou ate ali como se fosse a resposta', async () => {
    mockSend.mockResolvedValue(pedeTool('consultar_analito'));
    const r = await runConversationTurn(ENTRADA);
    if (!r.ok) expect(r).not.toHaveProperty('answer');
  });

  it('manda maxTokens explicito', async () => {
    mockSend.mockResolvedValue(respondeTexto('Uma resposta.'));
    await runConversationTurn(ENTRADA);
    expect(ultimaChamada().inferenceConfig.maxTokens).toBe(MAX_OUTPUT_TOKENS);
  });

  it('manda so a janela de historico, nao a conversa inteira', async () => {
    mockSend.mockResolvedValue(respondeTexto('Uma resposta.'));
    const history = Array.from({ length: 200 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `mensagem ${i}`,
    }));
    await runConversationTurn({ ...ENTRADA, history });
    expect(ultimaChamada().messages.length).toBeLessThanOrEqual(HISTORY_WINDOW + 1);
  });

  it('a janela guarda as mensagens MAIS RECENTES, nao as primeiras', async () => {
    // Cortar pelo comeco entregaria ao modelo o inicio de uma conversa longa e
    // esconderia justamente o que acabou de ser dito.
    mockSend.mockResolvedValue(respondeTexto('Uma resposta.'));
    const history = Array.from({ length: 50 }, (_, i) => ({
      role: 'user' as const,
      content: `mensagem ${i}`,
    }));
    await runConversationTurn({ ...ENTRADA, history });
    expect(JSON.stringify(ultimaChamada().messages)).toContain('mensagem 49');
    expect(JSON.stringify(ultimaChamada().messages)).not.toContain('mensagem 0"');
  });
});

describe('o prompt e a mensagem', () => {
  it('o prompt de sistema vem de LANGUAGE_RULES_PROMPT, nao copiado a mao', async () => {
    mockSend.mockResolvedValue(respondeTexto('Uma resposta.'));
    await runConversationTurn(ENTRADA);
    expect(ultimaChamada().system[0].text).toContain(LANGUAGE_RULES_PROMPT);
  });

  it('a mensagem do usuario entra no bloco protegido contra instrucao plantada', async () => {
    mockSend.mockResolvedValue(respondeTexto('Uma resposta.'));
    await runConversationTurn(ENTRADA);
    const conteudo = ultimaChamada().messages.at(-1).content[0];
    expect(conteudo).toHaveProperty('guardContent');
  });

  it('o guardrail vai na chamada, e o rastro fica DESLIGADO', async () => {
    // Ligado, o rastro exporia na resposta o texto que disparou um filtro de
    // PII -- ou seja, devolveria o dado que o filtro existe para esconder.
    mockSend.mockResolvedValue(respondeTexto('Uma resposta.'));
    await runConversationTurn(ENTRADA);
    expect(ultimaChamada().guardrailConfig).toMatchObject({
      guardrailIdentifier: 'gr-1',
      guardrailVersion: '1',
      trace: 'disabled',
    });
  });

  it('as tools vao SEM escolha forcada -- o modelo precisa poder so conversar', async () => {
    // Diferente da extracao, em que a saida estruturada e o produto: aqui
    // "bom dia" e uma pergunta legitima e nao exige consulta nenhuma.
    mockSend.mockResolvedValue(respondeTexto('Bom dia.'));
    await runConversationTurn(ENTRADA);
    expect(ultimaChamada().toolConfig.tools).toHaveLength(2);
    expect(ultimaChamada().toolConfig.toolChoice).toBeUndefined();
  });
});

describe('o laco', () => {
  it('chama a tool que o modelo pediu e devolve o resultado a ele', async () => {
    mockSend
      .mockResolvedValueOnce(pedeTool('consultar_analito'))
      .mockResolvedValueOnce(respondeTexto('Você tem duas coletas.'));
    const r = await runConversationTurn(ENTRADA);
    expect(mockRunTool).toHaveBeenCalledWith('consultar_analito', {}, ENTRADA.identity);
    expect(r.ok).toBe(true);
  });

  it('registra quais tools foram usadas -- e o que classifica a pergunta depois', async () => {
    mockSend
      .mockResolvedValueOnce(pedeTool('consultar_analito'))
      .mockResolvedValueOnce(respondeTexto('Você tem duas coletas.'));
    const r = await runConversationTurn(ENTRADA);
    if (r.ok) expect(r.answer.toolsUsadas).toContain('consultar_analito');
  });

  it('devolve o transcript mesmo quando falha -- o modo degradado precisa dele', async () => {
    mockSend.mockResolvedValue(pedeTool('consultar_analito'));
    const r = await runConversationTurn(ENTRADA);
    expect(r.transcript.toolOutputs.map((t) => t.name)).toContain('consultar_analito');
  });

  it('soma o consumo de todas as idas ao modelo, nao so da ultima', async () => {
    // Medir so a ultima subestimaria o custo de um turno com laco -- que e
    // justamente o turno caro, e o que a C10 precisa enxergar.
    mockSend
      .mockResolvedValueOnce(pedeTool('consultar_analito'))
      .mockResolvedValueOnce(respondeTexto('Uma resposta.'));
    const r = await runConversationTurn(ENTRADA);
    if (r.ok) expect(r.inputTokens).toBe(200);
  });
});

describe('quando nao da para responder', () => {
  it('guardrail intervindo NAO e tratado como falha tecnica', async () => {
    mockSend.mockResolvedValue({ stopReason: 'guardrail_intervened', output: { message: { content: [] } } });
    const r = await runConversationTurn(ENTRADA);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).not.toMatch(/erro|falha|exce/i);
  });

  it('a conversa continua utilizavel depois de um bloqueio', async () => {
    // Nao e tela travada: o turno seguinte funciona.
    mockSend.mockResolvedValueOnce({
      stopReason: 'guardrail_intervened',
      output: { message: { content: [] } },
    });
    await runConversationTurn(ENTRADA);
    mockSend.mockResolvedValue(respondeTexto('Uma resposta.'));
    expect((await runConversationTurn(ENTRADA)).ok).toBe(true);
  });

  it('resposta fora do formato e falha, nunca texto solto exibido como resposta', async () => {
    // Sem o envelope nao ha campo de citacao, e sem campo de citacao a R4 nao
    // tem como ser verificada -- exibir o texto assim mesmo esvaziaria a D11.
    mockSend.mockResolvedValue({
      stopReason: 'end_turn',
      usage: { inputTokens: 1, outputTokens: 1 },
      output: { message: { content: [{ text: 'sua vitamina D está ótima' }] } },
    });
    const r = await runConversationTurn(ENTRADA);
    expect(r.ok).toBe(false);
  });

  it('excecao na chamada vira falha tratada, nao excecao que sobe', async () => {
    mockSend.mockRejectedValue(new Error('ThrottlingException'));
    const r = await runConversationTurn(ENTRADA);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).not.toMatch(/Throttling/);
  });
});

describe('a segunda geracao (D31)', () => {
  async function primeiroTurno() {
    mockSend
      .mockResolvedValueOnce(pedeTool('consultar_analito'))
      .mockResolvedValueOnce(respondeTexto('Uma resposta.'));
    return runConversationTurn(ENTRADA);
  }

  it('NAO chama ferramenta nenhuma de novo', async () => {
    const primeira = await primeiroTurno();
    mockRunTool.mockClear();
    mockSend.mockReset().mockResolvedValue(respondeTexto('Outra resposta.'));
    await regenerateAnswer(ENTRADA, primeira.transcript, 'Não indique quantidade de medicamento.');
    expect(mockRunTool).not.toHaveBeenCalled();
  });

  it('faz UMA ida ao modelo, nao duas', async () => {
    const primeira = await primeiroTurno();
    mockSend.mockReset().mockResolvedValue(respondeTexto('Outra resposta.'));
    await regenerateAnswer(ENTRADA, primeira.transcript, 'motivo');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('ve as MESMAS evidencias da primeira -- os resultados das tools continuam na conversa', async () => {
    const primeira = await primeiroTurno();
    mockSend.mockReset().mockResolvedValue(respondeTexto('Outra resposta.'));
    await regenerateAnswer(ENTRADA, primeira.transcript, 'motivo');
    expect(JSON.stringify(ultimaChamada().messages)).toContain('toolResult');
  });

  it('o bilhete vai ao modelo como ultima mensagem', async () => {
    const primeira = await primeiroTurno();
    mockSend.mockReset().mockResolvedValue(respondeTexto('Outra resposta.'));
    await regenerateAnswer(ENTRADA, primeira.transcript, 'Não indique quantidade de medicamento.');
    const ultima = ultimaChamada().messages.at(-1);
    expect(JSON.stringify(ultima)).toContain('Não indique quantidade de medicamento.');
  });

  it('se o modelo pedir ferramenta de novo, NAO ha terceira tentativa', async () => {
    const primeira = await primeiroTurno();
    mockSend.mockReset().mockResolvedValue(pedeTool('consultar_analito', 'tu-2'));
    const r = await regenerateAnswer(ENTRADA, primeira.transcript, 'motivo');
    expect(r.ok).toBe(false);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('o transcript da segunda geracao continua o da primeira', async () => {
    // O modo degradado vem depois dela, e precisa do mesmo dado de ferramenta.
    const primeira = await primeiroTurno();
    mockSend.mockReset().mockResolvedValue(pedeTool('consultar_analito', 'tu-2'));
    const r = await regenerateAnswer(ENTRADA, primeira.transcript, 'motivo');
    expect(r.transcript.toolOutputs).toHaveLength(1);
  });
});
