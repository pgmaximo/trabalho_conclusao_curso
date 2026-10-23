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
const mockFindTool = jest.fn();
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
    findTool: (...a: unknown[]) => mockFindTool(...a),
  };
});

import { LANGUAGE_RULES_PROMPT } from '../../ai-language-rules/rulesPrompt';
import { SYSTEM_PROMPT } from '../chatPrompt';
import {
  HISTORY_WINDOW,
  MAX_OUTPUT_TOKENS,
  MAX_TOOL_ITERATIONS,
  regenerateAnswer,
  TEMPO_MAXIMO_DA_CHAMADA_MS,
  runConversationTurn,
  type TurnInput,
} from '../conversationLoop';

const ENTRADA: TurnInput = {
  message: 'como está minha vitamina D comparada ao exame anterior?',
  history: [],
  identity: { sub: 's-1', username: 'u-1', owner: 's-1::u-1' },
  modelId: 'us.anthropic.claude-opus-5-5',
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

  // Claude Opus 5.5: thinking sempre ligado e `temperature` recusada (400). O
  // thinking divide o teto de saida com a resposta, e o esforco e explicito
  // porque o padrao do modelo e `medium` e o app espera so 90 s.
  // DS16.3 = B: a parte fixa (ferramentas e prompt de sistema, ~10,5 mil
  // tokens) e reenviada em cada ida ao modelo; o cache a le em vez de
  // reprocessar. O contexto do dia fica DEPOIS do ponto de cache, senao a data
  // o invalidaria todo dia.
  describe('o cache de prompt na parte fixa (DS16.3)', () => {
    it('ponto de cache no fim das ferramentas', async () => {
      mockSend.mockResolvedValue(respondeTexto('Uma resposta.'));
      await runConversationTurn(ENTRADA);
      const tools = ultimaChamada().toolConfig.tools;
      expect(tools.at(-1)).toEqual({ cachePoint: { type: 'default' } });
      expect(tools.filter((t: object) => 'toolSpec' in t)).toHaveLength(tools.length - 1);
    });

    it('ponto de cache depois do prompt de sistema e antes do contexto do dia', async () => {
      mockSend.mockResolvedValue(respondeTexto('Uma resposta.'));
      await runConversationTurn({ ...ENTRADA, contextoDeHoje: 'Hoje é quinta-feira, 22/10/2026.' });
      const sistema = ultimaChamada().system;
      expect(sistema[0]).toHaveProperty('text');
      expect(sistema[1]).toEqual({ cachePoint: { type: 'default' } });
      expect(sistema[2]).toEqual({ text: 'Hoje é quinta-feira, 22/10/2026.' });
    });
  });

  describe('a chamada ao Claude Opus 5.5', () => {
    it('nao manda temperature na primeira nem na segunda geracao', async () => {
      mockSend.mockResolvedValue(respondeTexto('Uma resposta.'));
      const primeira = await runConversationTurn(ENTRADA);
      expect(ultimaChamada().inferenceConfig).not.toHaveProperty('temperature');
      if (!primeira.ok) throw new Error('a primeira geracao deveria passar');
      await regenerateAnswer(ENTRADA, primeira.transcript, 'Motivo.');
      expect(ultimaChamada().inferenceConfig).not.toHaveProperty('temperature');
    });

    it('manda o esforco explicito, baixo, e sem saida estruturada', async () => {
      mockSend.mockResolvedValue(respondeTexto('Uma resposta.'));
      await runConversationTurn(ENTRADA);
      expect(ultimaChamada().additionalModelRequestFields.output_config).toEqual({ effort: 'low' });
      expect(ultimaChamada().additionalModelRequestFields).not.toHaveProperty('thinking');
    });

    it('o envelope depois de prosa passa na primeira geracao', async () => {
      const envelope = JSON.stringify({ texto: 'Vá em Remédios > botão +.', citacoes: [] });
      mockSend.mockResolvedValue({
        ...respondeTexto(''),
        output: { message: { role: 'assistant', content: [{ text: `Para cadastrar, vá em Remédios. ${envelope}` }] } },
      });
      const r = await runConversationTurn(ENTRADA);
      expect(r.ok && r.answer.texto).toBe('Vá em Remédios > botão +.');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('o teto de saida cabe o thinking alem da resposta', () => {
      expect(MAX_OUTPUT_TOKENS).toBeGreaterThanOrEqual(16000);
    });

    it('o bloco de raciocinio volta ao modelo sem mudanca na ida seguinte', async () => {
      const raciocinio = { reasoningContent: { reasoningText: { text: '', signature: 'assinatura' } } };
      const comTool = pedeTool('consultar_analito');
      (comTool.output.message.content as unknown[]).unshift(raciocinio);
      mockSend.mockResolvedValueOnce(comTool).mockResolvedValueOnce(respondeTexto('Uma resposta.'));
      await runConversationTurn(ENTRADA);
      const assistente = ultimaChamada().messages.filter((m: { role: string }) => m.role === 'assistant').at(-1);
      expect(assistente.content[0]).toEqual(raciocinio);
    });
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
    // As 2 tools do mock e o ponto de cache no fim (DS16.3).
    expect(ultimaChamada().toolConfig.tools.filter((t: object) => 'toolSpec' in t)).toHaveLength(2);
    expect(ultimaChamada().toolConfig.toolChoice).toBeUndefined();
  });
});

describe('o laco', () => {
  it('chama a tool que o modelo pediu e devolve o resultado a ele', async () => {
    mockSend
      .mockResolvedValueOnce(pedeTool('consultar_analito'))
      .mockResolvedValueOnce(respondeTexto('Você tem duas coletas.'));
    const r = await runConversationTurn(ENTRADA);
    // O quarto argumento e o contexto do turno (E8). Sem `local` na entrada,
    // ele vai explicito e nulo -- a ferramenta nunca precisa adivinhar.
    expect(mockRunTool).toHaveBeenCalledWith('consultar_analito', {}, ENTRADA.identity, expect.objectContaining({ local: null }));
    expect(r.ok).toBe(true);
  });

  it('entrega a cidade do pedido a ferramenta, como contexto do turno (E8)', async () => {
    mockSend
      .mockResolvedValueOnce(pedeTool('consultar_analito'))
      .mockResolvedValueOnce(respondeTexto('Pronto.'));
    const local = { uf: 'SP', codigoMunicipio: '355030' };
    await runConversationTurn({ ...ENTRADA, local });
    expect(mockRunTool).toHaveBeenCalledWith('consultar_analito', {}, ENTRADA.identity, expect.objectContaining({ local }));
  });

  it('as ferramentas de um turno dividem o registro de leituras; outro turno tem o seu (risco 3 do E4)', async () => {
    // Duas ferramentas DIFERENTES no mesmo turno: a mesma, com a mesma entrada,
    // nao roda de novo (A8).
    mockSend
      .mockResolvedValueOnce(pedeTool('consultar_analito'))
      .mockResolvedValueOnce(pedeTool('consultar_consultas'))
      .mockResolvedValueOnce(respondeTexto('Pronto.'))
      .mockResolvedValueOnce(pedeTool('consultar_analito'))
      .mockResolvedValueOnce(respondeTexto('Pronto.'));
    await runConversationTurn(ENTRADA);
    await runConversationTurn(ENTRADA);
    const registros = mockRunTool.mock.calls.map(([, , , contexto]) => (contexto as { leituras: unknown }).leituras);
    expect(registros).toHaveLength(3);
    expect(registros[0]).toBeInstanceOf(Map);
    expect(registros[1]).toBe(registros[0]);
    expect(registros[2]).not.toBe(registros[0]);
  });

  it('a cidade NAO vai ao modelo -- so a saida das ferramentas vai (E8, LGPD)', async () => {
    mockSend
      .mockResolvedValueOnce(pedeTool('consultar_analito'))
      .mockResolvedValueOnce(respondeTexto('Pronto.'));
    await runConversationTurn({ ...ENTRADA, local: { uf: 'SP', codigoMunicipio: '355030' } });
    for (const [comando] of mockSend.mock.calls) {
      const { messages, system } = (comando as { input: Record<string, unknown> }).input;
      expect(JSON.stringify({ messages, system })).not.toMatch(/355030|"uf"/);
    }
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

/**
 * Bloco 10 -- a rodada automatica da L7 achou que "quais sao os valores do meu
 * exame?" NUNCA recebe resposta com prosa: 4 de 4 tentativas cairam no modo
 * degradado. Tres causas empilhadas, e nenhuma deixava rastro:
 *
 * 1. o schema aceita no maximo 20 citacoes, mas o `maxItems` e retirado do que
 *    vai ao Bedrock -- o modelo nao sabe do limite e tenta citar as 48 linhas;
 * 2. o teto de saida (2000) estoura no meio do JSON de 48 citacoes;
 * 3. as duas falhas voltavam `NAO_MONTEI` sem uma linha de log.
 */
describe('a falha da geracao deixa rastro (Bloco 10)', () => {
  let info: jest.SpyInstance;
  beforeEach(() => {
    info = jest.spyOn(console, 'info').mockImplementation(() => {});
  });
  afterEach(() => info.mockRestore());
  const eventos = () => info.mock.calls.map((c) => String(c[0])).filter((l) => l.includes('geracao-falhou'));

  it('resposta cortada pelo teto de saida registra o motivo max_tokens', async () => {
    mockSend.mockResolvedValue({
      stopReason: 'max_tokens',
      usage: { inputTokens: 1, outputTokens: 1 },
      output: { message: { content: [{ text: '{"citacoes":[{"resultId":"abc' }] } },
    });
    const r = await runConversationTurn(ENTRADA);
    expect(r.ok).toBe(false);
    expect(eventos()).toHaveLength(1);
    expect(eventos()[0]).toContain('"motivo":"max_tokens"');
  });

  it('resposta fora do schema registra o motivo formato, com o CAMPO e sem o conteudo', async () => {
    mockSend.mockResolvedValue(respondeTexto(''));
    await runConversationTurn(ENTRADA);
    expect(eventos()[0]).toContain('"motivo":"formato"');
    expect(eventos()[0]).toContain('texto');
  });

  it('teto de iteracoes registra o motivo teto-de-iteracoes', async () => {
    mockSend.mockResolvedValue(pedeTool('consultar_analito'));
    await runConversationTurn(ENTRADA);
    expect(eventos()[0]).toContain('"motivo":"teto-de-iteracoes"');
  });

  it('o teto de saida cabe uma resposta com o maximo de citacoes', () => {
    // 20 citacoes de ~45 tokens cada, mais o texto de 20 linhas.
    expect(MAX_OUTPUT_TOKENS).toBeGreaterThanOrEqual(4000);
  });
});

describe('a falha da SEGUNDA geracao tambem deixa rastro (Bloco 10)', () => {
  let info: jest.SpyInstance;
  beforeEach(() => {
    info = jest.spyOn(console, 'info').mockImplementation(() => {});
  });
  afterEach(() => info.mockRestore());
  const eventos = () => info.mock.calls.map((c) => String(c[0])).filter((l) => l.includes('geracao-falhou'));

  const primeiraTranscricao = async () => {
    mockSend
      .mockResolvedValueOnce(pedeTool('consultar_analito'))
      .mockResolvedValueOnce(respondeTexto('Uma resposta.'));
    return (await runConversationTurn(ENTRADA)).transcript;
  };

  it('resposta fora do formato na segunda registra formato, na etapa segunda', async () => {
    const t = await primeiraTranscricao();
    mockSend.mockReset().mockResolvedValue(respondeTexto(''));
    await regenerateAnswer(ENTRADA, t, 'motivo');
    expect(eventos()).toHaveLength(1);
    expect(eventos()[0]).toContain('"motivo":"formato"');
    expect(eventos()[0]).toContain('"etapa":"segunda"');
  });

  it('pedir ferramenta de novo na segunda registra o motivo proprio', async () => {
    const t = await primeiraTranscricao();
    mockSend.mockReset().mockResolvedValue(pedeTool('consultar_analito'));
    await regenerateAnswer(ENTRADA, t, 'motivo');
    expect(eventos()[0]).toContain('"motivo":"ferramenta-na-segunda"');
  });
});

describe('os valores cadastrados de cada tool (E2, D2.4)', () => {
  // A tool que conhece a forma da propria saida diz quais valores devolveu,
  // como o `renderDegraded`. O laco grava isso no transcript, e a verificacao
  // so le -- sem saber o nome de nenhuma tool.
  it('grava no transcript o que o gancho da tool devolveu', async () => {
    mockFindTool.mockReturnValue({ valoresCadastrados: () => ['500|mg'] });
    mockSend
      .mockResolvedValueOnce(pedeTool('consultar_analito'))
      .mockResolvedValueOnce(respondeTexto('Ok.'));
    const r = await runConversationTurn(ENTRADA);
    expect(r.transcript.toolOutputs[0].valoresCadastrados).toEqual(['500|mg']);
  });

  it('sem gancho, a tool nao tem valor cadastrado', async () => {
    mockFindTool.mockReturnValue(undefined);
    mockSend
      .mockResolvedValueOnce(pedeTool('consultar_analito'))
      .mockResolvedValueOnce(respondeTexto('Ok.'));
    const r = await runConversationTurn(ENTRADA);
    expect(r.transcript.toolOutputs[0].valoresCadastrados).toBeUndefined();
  });
});

/**
 * A data do turno (E1, D1.1): um SEGUNDO bloco de `system`, depois do prompt
 * fixo. Fora de `messages` e do `guardContent`, porque e instrucao de sistema
 * e nao texto de fora; e sem ela o pedido sai byte a byte como antes (regra 5).
 */
describe('a data do turno', () => {
  const PONTO = { cachePoint: { type: 'default' } };
  const CONTEXTO =
    'Data e hora deste turno, informadas pelo aplicativo: hoje é sábado, 17/10/2026, e agora são 22h30 no horário de Brasília.';

  // O ponto de cache entre o prompt e a data (DS16.3): a data fica fora do cache.
  it('com contextoDeHoje, system leva o prompt, o ponto de cache e depois a data', async () => {
    mockSend.mockResolvedValue(respondeTexto('Uma resposta.'));
    await runConversationTurn({ ...ENTRADA, contextoDeHoje: CONTEXTO });
    expect(ultimaChamada().system).toHaveLength(3);
    expect(ultimaChamada().system[0].text).toContain(LANGUAGE_RULES_PROMPT);
    expect(ultimaChamada().system[1]).toEqual(PONTO);
    expect(ultimaChamada().system[2]).toEqual({ text: CONTEXTO });
  });

  it('sem contextoDeHoje, system leva so o prompt e o ponto de cache', async () => {
    mockSend.mockResolvedValue(respondeTexto('Uma resposta.'));
    await runConversationTurn(ENTRADA);
    expect(ultimaChamada().system).toEqual([{ text: SYSTEM_PROMPT }, PONTO]);
  });

  it('a data nao vai em messages nem no guardContent', async () => {
    mockSend.mockResolvedValue(respondeTexto('Uma resposta.'));
    await runConversationTurn({ ...ENTRADA, contextoDeHoje: CONTEXTO });
    expect(JSON.stringify(ultimaChamada().messages)).not.toContain('22h30');
  });

  it('a segunda geracao leva o mesmo bloco de data', async () => {
    mockSend.mockResolvedValue(respondeTexto('Uma resposta.'));
    const entrada = { ...ENTRADA, contextoDeHoje: CONTEXTO };
    const primeira = await runConversationTurn(entrada);
    await regenerateAnswer(entrada, primeira.transcript, 'Motivo de teste.');
    expect(ultimaChamada().system).toEqual([{ text: SYSTEM_PROMPT }, PONTO, { text: CONTEXTO }]);
  });
});

/**
 * A6 da conferencia no sandbox (DS7): a cota da conta e de 10 chamadas por
 * minuto ao modelo, e com duas pessoas ao mesmo tempo o Bedrock devolve
 * ThrottlingException. A pessoa lia "nao consegui montar uma resposta", como se
 * a pergunta fosse o problema. O laco marca a sobrecarga, sem vazar o nome do
 * erro, e quem chama mostra a frase honesta.
 */
describe('sobrecarga do modelo (A6)', () => {
  const throttling = () => Object.assign(new Error('Too many requests'), { name: 'ThrottlingException' });

  it('na primeira geracao, volta marcada como sobrecarga', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSend.mockRejectedValue(throttling());

    const r = await runConversationTurn(ENTRADA);

    expect(r.ok).toBe(false);
    expect(!r.ok && 'sobrecarga' in r && r.sobrecarga).toBe(true);
    expect(!r.ok && r.message).toMatch(/tente de novo/i);
    expect(!r.ok && r.message).not.toMatch(/Throttling/);
  });

  it('outra falha continua sendo a mensagem de sempre', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSend.mockRejectedValue(new Error('rede'));

    const r = await runConversationTurn(ENTRADA);

    expect(!r.ok && 'sobrecarga' in r).toBe(false);
  });

  // DS15.3 = B: o Bedrock chegou a 80 s de media por chamada (CloudWatch,
  // 2026-10-22). A chamada que passa do limite vira o mesmo aviso de
  // sobrecarga, dentro dos 90 s que o aplicativo espera.
  describe('o limite de tempo por chamada (DS15.3)', () => {
    afterEach(() => jest.useRealTimers());

    it('cabe no que o aplicativo espera', () => {
      expect(TEMPO_MAXIMO_DA_CHAMADA_MS).toBeGreaterThan(0);
      expect(TEMPO_MAXIMO_DA_CHAMADA_MS).toBeLessThan(90_000);
    });

    it('a chamada que passa do limite vira o aviso de sobrecarga', async () => {
      jest.useFakeTimers();
      jest.spyOn(console, 'error').mockImplementation(() => {});
      mockSend.mockReturnValue(new Promise(() => {}));

      const turno = runConversationTurn(ENTRADA);
      await jest.advanceTimersByTimeAsync(TEMPO_MAXIMO_DA_CHAMADA_MS + 1);
      const r = await turno;

      expect(r.ok).toBe(false);
      expect(!r.ok && 'sobrecarga' in r && r.sobrecarga).toBe(true);
    });

    it('a chamada que responde antes do limite segue normal', async () => {
      jest.useFakeTimers();
      mockSend.mockResolvedValue(respondeTexto('Uma resposta.'));

      const r = await runConversationTurn(ENTRADA);

      expect(r.ok).toBe(true);
    });
  });
});

describe('a fala da pessoa chega as ferramentas (A7)', () => {
  it('o contexto do turno leva a mensagem do turno', async () => {
    mockSend.mockResolvedValueOnce(pedeTool('consultar_consultas')).mockResolvedValueOnce(respondeTexto('Ok.'));

    await runConversationTurn(ENTRADA);

    expect(mockRunTool.mock.calls[0][3]).toEqual(expect.objectContaining({ falaDaPessoa: ENTRADA.message }));
  });
});

/**
 * A8 da conferencia no sandbox (DS9): "mas e seguro tomar junto, ne?" fez o
 * modelo chamar a mesma ferramenta, com a mesma entrada, ate o teto de
 * iteracoes -- seis idas ao modelo (e a cota, A6) para nada. A repeticao no
 * mesmo turno nao roda de novo: volta o aviso de que ja foi consultado.
 */
describe('a mesma consulta repetida no turno (A8)', () => {
  it('roda uma vez; a repeticao recebe o aviso e nao entra de novo no transcript', async () => {
    mockSend
      .mockResolvedValueOnce(pedeTool('consultar_consultas', 'tu-1'))
      .mockResolvedValueOnce(pedeTool('consultar_consultas', 'tu-2'))
      .mockResolvedValueOnce(respondeTexto('Ok.'));

    const r = await runConversationTurn(ENTRADA);

    expect(mockRunTool).toHaveBeenCalledTimes(1);
    const resultado = ultimaChamada().messages.at(-1).content[0].toolResult;
    expect(resultado.toolUseId).toBe('tu-2');
    expect(JSON.stringify(resultado.content)).toMatch(/já foi consultad/);
    // O aviso pede a resposta agora: sem isso o modelo repetia a chamada mais
    // duas ou tres vezes antes de responder, gastando cota (A6).
    expect(JSON.stringify(resultado.content)).toMatch(/responda agora/i);
    expect(r.ok && r.transcript.toolOutputs).toHaveLength(1);
  });
});
