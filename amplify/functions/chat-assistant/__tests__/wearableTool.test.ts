/**
 * `consultar_wearable` depois do E6: o que ja devolvia, mais `dadosAte`, a
 * lista das importacoes e a analise da tela. A ausencia continua a mesma, agora
 * com a lista, para o modelo dizer que ha uma importacao anterior pronta.
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
import { SEM_IMPORTACAO_PRONTA, wearableTool } from '../tools/wearable';

const IDENTIDADE: ChatIdentity = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

const PRONTA = {
  id: 'h1',
  status: 'READY',
  createdAt: '2026-10-13T10:00:00Z',
  periodStart: '2026-09-01',
  periodEnd: '2026-10-12',
  dayCount: 42,
  metricsJson: JSON.stringify({ metrics: [{ metric: 'sleepMinutes', mean: 400 }] }),
  insightsJson: JSON.stringify({
    resumo: 'Seu sono ficou estável.',
    destaques: [],
    pontosDeAtencao: [],
    padroes: [],
    sugestoes: [],
    perguntasParaOMedico: [],
    limitacoes: 'Um aparelho só.',
  }),
  warnings: ['1 linha ignorada'],
  fileKeys: ['health-imports/x/h1/a.zip'],
  fileNames: ['a.zip'],
  resultArtifactKey: 'health-imports/x/h1/result.json',
  errorMessage: null,
  modelId: 'modelo',
};
const ANTIGA = { ...PRONTA, id: 'h0', createdAt: '2026-06-01T10:00:00Z' };
const FALHOU = { id: 'h2', status: 'FAILED', createdAt: '2026-10-15T10:00:00Z', errorMessage: 'ERRO-INTERNO' };

let linhas: Record<string, unknown>[] = [];
beforeAll(() => Object.assign(process.env, { HEALTH_IMPORT_TABLE_NAME: 't-health' }));
beforeEach(() => mockSend.mockReset().mockImplementation(() => Promise.resolve({ Items: linhas })));

describe('consultar_wearable (E6)', () => {
  it('a pronta traz ate quando vao os dados, a lista e a analise da tela', async () => {
    linhas = [PRONTA, ANTIGA];
    const saida = (await wearableTool.run({}, IDENTIDADE)) as Record<string, any>;
    expect(saida).toMatchObject({
      disponivel: true,
      dadosAte: '2026-10-12',
      periodo: { inicio: '2026-09-01', fim: '2026-10-12', dias: 42 },
      metricas: { metrics: [{ metric: 'sleepMinutes', mean: 400 }] },
      importacoesOmitidas: 0,
      analiseDaTela: { resumo: 'Seu sono ficou estável.', avisosDeLeitura: 1 },
    });
    expect(saida.importacoes).toHaveLength(2);
  });

  it('nenhum campo interno da importacao sai', async () => {
    linhas = [PRONTA];
    const texto = JSON.stringify(await wearableTool.run({}, IDENTIDADE));
    for (const campo of ['fileKeys', 'fileNames', 'resultArtifactKey', 'errorMessage', 'modelId', '1 linha ignorada']) {
      expect(texto).not.toContain(campo);
    }
  });

  it('a mais recente nao concluiu: a mesma ausencia, com a lista (C3.5)', async () => {
    linhas = [PRONTA, FALHOU];
    const saida = (await wearableTool.run({}, IDENTIDADE)) as Record<string, any>;
    expect(saida.disponivel).toBe(false);
    expect(saida.explicacao).toBe(SEM_IMPORTACAO_PRONTA);
    expect(saida.importacoes.map((i: Record<string, unknown>) => i.situacao)).toEqual(['não concluiu', 'pronta']);
    expect(JSON.stringify(saida)).not.toContain('ERRO-INTERNO');
  });

  it('sem importacao nenhuma: a ausencia de sempre, sem lista', async () => {
    linhas = [];
    expect(await wearableTool.run({}, IDENTIDADE)).toEqual({ disponivel: false, explicacao: SEM_IMPORTACAO_PRONTA });
  });

  it('no modo degradado, um resumo que as regras reprovam fica de fora (revisao)', async () => {
    linhas = [{ ...PRONTA, insightsJson: JSON.stringify({ resumo: 'Você tem apneia do sono.', limitacoes: 'x' }) }];
    const bloco = wearableTool.renderDegraded!(await wearableTool.run({}, IDENTIDADE))!;
    expect(bloco.linhas).toEqual(['Período de 2026-09-01 a 2026-10-12']);
  });

  it('o modo degradado acrescenta so o resumo da analise', async () => {
    linhas = [PRONTA];
    const bloco = wearableTool.renderDegraded!(await wearableTool.run({}, IDENTIDADE))!;
    expect(bloco.linhas).toEqual(['Período de 2026-09-01 a 2026-10-12', 'Análise da tela: Seu sono ficou estável.']);
  });
});
