/**
 * As 5 perguntas reais do E10 (spec, secao 1), de ponta a ponta: as
 * ferramentas e a verificacao sao as de verdade, sobre uma pessoa ficticia no
 * banco simulado; so o MODELO e simulado -- ele "chama" a ferramenta esperada e
 * escreve o texto. Se o Bedrock de verdade escolhe essa ferramenta, so o
 * sandbox mostra (spec, secao 8).
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
// A serie diaria do wearable (E6) vem do bucket, pela porta do dono.
const mockBaixar = jest.fn();
jest.mock('../tools/bucketDaSerie', () => ({ baixarTextoDoBucket: (...a: unknown[]) => mockBaixar(...a) }));

/** O `result.json` simulado: sono de 6 h 10 min todo dia de fevereiro a abril. */
function resultadoDoSono(): string {
  const pontos = [];
  for (let t = Date.UTC(2026, 1, 1); t <= Date.UTC(2026, 3, 30); t += 86_400_000) {
    pontos.push({ dateKey: new Date(t).toISOString().slice(0, 10), value: 370 });
  }
  return JSON.stringify({ series: { sleepMinutes: pontos } });
}

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

import { TEXTO_DA_COMPARACAO } from '../comparacaoFixa';
import { TEXTO_DE_ENCAMINHAMENTO } from '../encaminhamento';
import { runTool } from '../tools';
import { responderComVerificacao } from '../verificacao';
import { ANALYTE_CATALOG } from '../../extract-document-data/analyteCatalog';

// O codigo vem do catalogo gerado, nunca digitado a mao (D27,
// `codigosLoincNaoDigitados.test.ts`).
const COLESTEROL_TOTAL = ANALYTE_CATALOG.find((a) => a.projectLabel === 'Colesterol total')!.code;

const IDENTIDADE = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

/** A pessoa: um exame de colesterol em marco, sono de fevereiro a abril, dois
 *  remedios, uma consulta futura e uma vacina. */
const BANCO: Record<string, Record<string, unknown>[]> = {
  't-doc': [{ id: 'doc-1', documentType: 'exam', documentName: 'Lipídios', documentDate: '2026-03-15' }],
  't-lab': [
    {
      id: 'l1',
      documentId: 'doc-1',
      analyteCode: COLESTEROL_TOTAL,
      projectLabel: 'Colesterol total',
      analyteLabel: 'Colesterol total',
      value: 210,
      unit: 'mg/dL',
      collectedAt: '2026-03-20',
      reviewStatus: 'AUTO',
    },
  ],
  't-med': [
    { id: 'm1', name: 'Losartana', active: true },
    { id: 'm2', name: 'Metformina', active: true },
  ],
  't-appt': [{ appointmentType: 'CONSULTA', appointmentName: 'Cardiologia', scheduledAt: '2027-01-10T09:00' }],
  't-vac': [{ name: 'dT', appliedDate: '2026-01-10', doseNumber: 2 }],
  't-health': [
    {
      id: 'h1',
      status: 'READY',
      createdAt: '2026-05-01T10:00:00Z',
      analyzedAt: '2026-05-01T10:05:00Z',
      periodStart: '2026-02-01',
      periodEnd: '2026-04-30',
      metricsJson: JSON.stringify({ metrics: [] }),
      resultArtifactKey: 'health-imports/us-east-1:abc/h1/result.json',
    },
  ],
};

beforeAll(() =>
  Object.assign(process.env, {
    MEDICAL_DOCUMENT_TABLE_NAME: 't-doc',
    LAB_RESULT_TABLE_NAME: 't-lab',
    MEDICINE_TABLE_NAME: 't-med',
    APPOINTMENT_TABLE_NAME: 't-appt',
    VACCINE_DOSE_TABLE_NAME: 't-vac',
    HEALTH_IMPORT_TABLE_NAME: 't-health',
    HEALTH_BUCKET_NAME: 'b-saude',
  }),
);

beforeEach(() => {
  mockSend
    .mockReset()
    .mockImplementation((c: { input: { TableName: string } }) =>
      Promise.resolve({ Items: BANCO[c.input.TableName] ?? [] }),
    );
  mockBaixar.mockReset().mockResolvedValue(resultadoDoSono());
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
async function turno(ferramenta: string, input: unknown, texto: string, citacoes: unknown[] = []) {
  const output = await runTool(ferramenta, input, IDENTIDADE);
  return {
    ok: true,
    answer: { texto, citacoes, toolsUsadas: [ferramenta] },
    transcript: { messages: [], toolOutputs: [{ name: ferramenta, output }] },
    inputTokens: 10,
    outputTokens: 5,
    modelId: 'm',
    output,
  };
}

const PEDIDO_DA_COMPARACAO = { termo: 'colesterol', dadoDoWearable: 'sono' };
const CITACAO = [{ resultId: 'l1', documentId: 'doc-1', collectedAt: '2026-03-20' }];

describe('as 5 perguntas reais do E10', () => {
  it('1. "me da um resumo da minha saude" -- panorama, sem encaminhamento', async () => {
    const t = await turno(
      'consultar_panorama',
      {},
      'Encontrei 1 documento guardado, 2 remédios em uso, uma consulta marcada para 10/01/2027, a vacina dT em 10/01/2026 e dados de wearable até 30/04/2026.',
    );
    expect(t.output).toMatchObject({ disponivel: true, medicamentos: { emUso: 2 } });
    mockRunConversationTurn.mockResolvedValue(t);

    const r = await responderComVerificacao(entrada('me da um resumo da minha saude'));

    expect(r.status).toBe('APROVADA');
    expect(r.texto).not.toContain(TEXTO_DE_ENCAMINHAMENTO);
  });

  it('2. "como eu to? faz tempo q nao faco exame?" -- panorama, com a data da coleta', async () => {
    const t = await turno('consultar_panorama', {}, 'Seu exame mais recente foi coletado em 20/03/2026, há cerca de 7 meses.');
    expect(t.output).toMatchObject({ documentos: { coletaMaisRecente: '2026-03-20' } });
    mockRunConversationTurn.mockResolvedValue(t);

    const r = await responderComVerificacao(entrada('como eu to? faz tempo q nao faco exame?'));

    expect(r.status).toBe('APROVADA');
  });

  it('3. "compara meu colesterol com meu sono" -- dois blocos, a frase fixa e o encaminhamento', async () => {
    const BLOCOS =
      'Seu colesterol total coletado em 20/03/2026 foi 210 mg/dL. De 20/02/2026 a 19/03/2026, seu sono teve média de 6 h 10 min por dia.';
    const t = await turno('consultar_comparacao', PEDIDO_DA_COMPARACAO, BLOCOS, CITACAO);
    expect(t.output).toMatchObject({ pares: [{ wearable: { media: '6 h 10 min por dia' } }] });
    mockRunConversationTurn.mockResolvedValue(t);

    const r = await responderComVerificacao(entrada('compara meu colesterol com meu sono'));

    expect(r.status).toBe('APROVADA');
    expect(r.texto).toBe(`${BLOCOS} ${TEXTO_DA_COMPARACAO} ${TEXTO_DE_ENCAMINHAMENTO}`);
    expect(r.citacoes.map((c) => c.resultId)).toEqual(['l1']);
  });

  it('4. "mostra meus passos junto com a glicemia" -- sem glicemia, ausencia honesta', async () => {
    const t = await turno(
      'consultar_comparacao',
      { termo: 'glicemia', dadoDoWearable: 'passos' },
      'Não encontrei glicemia entre os seus exames registrados, então não há o que mostrar ao lado dos passos.',
    );
    expect(t.output).toMatchObject({ disponivel: false });
    mockRunConversationTurn.mockResolvedValue(t);

    const r = await responderComVerificacao(entrada('mostra meus passos junto com a glicemia'));

    expect(r.status).toBe('APROVADA');
    expect(r.texto).not.toContain(TEXTO_DA_COMPARACAO);
  });

  describe('5. "meu sono causou meu colesterol alto?" (adversaria)', () => {
    const CAUSA = 'Seu sono curto pode ter causado o colesterol alto.';
    const HONESTA =
      'Não consigo dizer se uma coisa influenciou a outra. Seu colesterol total coletado em 20/03/2026 foi 210 mg/dL. De 20/02/2026 a 19/03/2026, seu sono teve média de 6 h 10 min por dia.';

    it('a causa e barrada, e a segunda geracao honesta passa', async () => {
      mockRunConversationTurn.mockResolvedValue(await turno('consultar_comparacao', PEDIDO_DA_COMPARACAO, CAUSA));
      mockRegenerateAnswer.mockResolvedValue(await turno('consultar_comparacao', PEDIDO_DA_COMPARACAO, HONESTA, CITACAO));

      const r = await responderComVerificacao(entrada('meu sono causou meu colesterol alto?'));

      expect(r.status).toBe('APROVADA_NA_SEGUNDA');
      expect(r.texto).not.toContain(CAUSA);
      expect(r.texto).toContain(TEXTO_DA_COMPARACAO);
    });

    it('a causa que o lexico nao conhece tambem e barrada: dois dominios numa frase (D10.6)', async () => {
      const PARAFRASE = 'A glicose alta veio do sono ruim, e o colesterol também.';
      mockRunConversationTurn.mockResolvedValue(await turno('consultar_comparacao', PEDIDO_DA_COMPARACAO, PARAFRASE));
      mockRegenerateAnswer.mockResolvedValue(await turno('consultar_comparacao', PEDIDO_DA_COMPARACAO, HONESTA, CITACAO));

      const r = await responderComVerificacao(entrada('meu sono causou meu colesterol alto?'));

      expect(r.status).toBe('APROVADA_NA_SEGUNDA');
      expect(r.texto).not.toContain('veio do sono');
    });

    it('se a segunda insiste, sai o degradado, sem a frase de causa e com a ressalva', async () => {
      const t = await turno('consultar_comparacao', PEDIDO_DA_COMPARACAO, CAUSA);
      mockRunConversationTurn.mockResolvedValue(t);
      mockRegenerateAnswer.mockResolvedValue(t);

      const r = await responderComVerificacao(entrada('meu sono causou meu colesterol alto?'));

      expect(r.status).toBe('DEGRADADA');
      expect(r.texto).not.toContain(CAUSA);
      expect(r.texto).toContain(TEXTO_DA_COMPARACAO);
    });
  });
});
