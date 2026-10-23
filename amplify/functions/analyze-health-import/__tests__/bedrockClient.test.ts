/**
 * A analise do wearable volta a tool forcada (2026-10-23). A saida estruturada
 * (`output_config`) ficou lenta por episodios no Bedrock -- uma analise de
 * producao levou 265 s numa so chamada e a Lambda estourou os 300 s --, e a
 * conta segue no Sonnet 4.6, que aceita a tool forcada. Estes testes fixam a
 * forma da chamada para ela nao voltar a saida estruturada sem querer.
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
import { ANALYSIS_TOOL_NAME } from '../insightPrompt';
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
const OPCOES = { modelId: 'us.anthropic.claude-sonnet-4-6', guardrailId: 'g', guardrailVersion: '1' };

function resposta(conteudo: unknown[], stopReason = 'tool_use') {
  return { output: { message: { content: conteudo } }, usage: { inputTokens: 10, outputTokens: 5 }, stopReason };
}

const comoTool = (payload: unknown) => resposta([{ toolUse: { toolUseId: 't-1', name: ANALYSIS_TOOL_NAME, input: payload } }]);

jest.mock('../insightPrompt', () => ({
  ...jest.requireActual('../insightPrompt'),
  buildUserText: () => 'dados',
}));

beforeEach(() => mockSend.mockReset());

describe('requestInsights -- a chamada com a tool forcada', () => {
  it('forca a tool da analise e nao manda saida estruturada', async () => {
    mockSend.mockResolvedValueOnce(comoTool(INSIGHTS));

    await requestInsights(RESUMO, OPCOES);

    const enviado = mockSend.mock.calls[0][0].input;
    expect(enviado.toolConfig.toolChoice).toEqual({ tool: { name: ANALYSIS_TOOL_NAME } });
    expect(enviado).not.toHaveProperty('additionalModelRequestFields');
  });

  it('le a analise do bloco toolUse', async () => {
    mockSend.mockResolvedValueOnce(comoTool(INSIGHTS));

    const r = await requestInsights(RESUMO, OPCOES);

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.result.insights.resumo).toBe(INSIGHTS.resumo);
  });

  it('resposta sem toolUse vale como falha de formato e pede o reparo uma vez', async () => {
    mockSend.mockResolvedValueOnce(resposta([{ text: 'nao chamou a tool' }], 'end_turn')).mockResolvedValueOnce(comoTool(INSIGHTS));

    const r = await requestInsights(RESUMO, OPCOES);

    expect(r.ok).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });
});
