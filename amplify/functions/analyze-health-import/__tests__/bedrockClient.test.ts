/**
 * A analise do wearable no Claude Sonnet 5.5 (2026-10-22). O modelo recusa a
 * tool forcada (`toolChoice`) e `temperature` diferente do padrao (400), entao
 * a saida estruturada passa a ser o `output_config`, como a extracao ja faz
 * (D19), e a resposta vem em bloco de texto, nao em `toolUse`.
 *
 * Mocka o SDK do Bedrock em vez de importar valor dele, que e a regra do
 * repositorio.
 */
const mockSend = jest.fn();

jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: class {
    send(...args: unknown[]) {
      return mockSend(...args);
    }
  },
  ConverseCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
  ApplyGuardrailCommand: class {},
}));

import { requestInsights } from '../bedrockClient';
import type { AnalysisSummary } from '../summaryBuilder';

const INSIGHTS = {
  resumo: 'Resumo de teste com pelo menos algum conteúdo.',
  destaques: [{ metrica: 'Passos', valor: '8.200/dia', comparacao: 'acima da média do período', tom: 'positivo' }],
  pontosDeAtencao: [],
  padroes: [],
  sugestoes: [],
  perguntasParaOMedico: ['Minha variabilidade de sono é motivo de preocupação?'],
  limitacoes: 'Cobertura de sono limitada a 40% dos dias no período.',
};

const RESUMO = { metrics: [], correlations: [] } as unknown as AnalysisSummary;
const OPCOES = { modelId: 'us.anthropic.claude-sonnet-5-5', guardrailId: 'g', guardrailVersion: '1' };

function resposta(conteudo: unknown[], stopReason = 'end_turn') {
  return { output: { message: { content: conteudo } }, usage: { inputTokens: 10, outputTokens: 5 }, stopReason };
}

const comoTexto = (payload: unknown) => resposta([{ text: JSON.stringify(payload) }]);

jest.mock('../insightPrompt', () => ({
  ...jest.requireActual('../insightPrompt'),
  buildUserText: () => 'dados',
}));

beforeEach(() => mockSend.mockReset());

describe('requestInsights -- a chamada ao Claude Sonnet 5.5', () => {
  it('sem tool forcada nem temperature; saida estruturada com esforco explicito', async () => {
    mockSend.mockResolvedValueOnce(comoTexto(INSIGHTS));

    await requestInsights(RESUMO, OPCOES);

    const enviado = mockSend.mock.calls[0][0].input;
    expect(enviado).not.toHaveProperty('toolConfig');
    expect(enviado.inferenceConfig).not.toHaveProperty('temperature');
    expect(enviado.inferenceConfig.maxTokens).toBeGreaterThanOrEqual(24000);
    expect(enviado.additionalModelRequestFields.output_config.effort).toBe('low');
    expect(enviado.additionalModelRequestFields.output_config.format.type).toBe('json_schema');
  });

  it('le a analise do bloco de texto, mesmo com o raciocinio antes', async () => {
    mockSend.mockResolvedValueOnce(
      resposta([{ reasoningContent: { reasoningText: { text: '' } } }, { text: JSON.stringify(INSIGHTS) }]),
    );

    const r = await requestInsights(RESUMO, OPCOES);

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.result.insights.resumo).toBe(INSIGHTS.resumo);
  });

  it('texto que nao e JSON vale como falha de formato e pede o reparo uma vez', async () => {
    mockSend.mockResolvedValueOnce(resposta([{ text: 'nao e json' }])).mockResolvedValueOnce(comoTexto(INSIGHTS));

    const r = await requestInsights(RESUMO, OPCOES);

    expect(r.ok).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(mockSend.mock.calls[1][0].input.messages)).not.toContain('tool');
  });
});
