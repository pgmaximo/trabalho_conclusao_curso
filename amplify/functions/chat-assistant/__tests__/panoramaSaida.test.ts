/**
 * O panorama (E10, 10.1): contagens e datas de seis assuntos, e nada de valor
 * clinico. Os nomes de campo das linhas sao os do schema publicado.
 */
// `texto` e `LinhaDoBanco` moram na porta de leitura, que importa o SDK; mesma
// simulacao de `vacinasSaida.test.ts`.
jest.mock('@aws-sdk/lib-dynamodb', () => ({ DynamoDBDocumentClient: { from: () => ({}) } }));
jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));

import { montarPanorama, renderizarPanorama, type LinhasDoPanorama } from '../tools/panoramaSaida';

const AGORA = new Date('2026-10-19T12:00:00-03:00');

const VAZIO: LinhasDoPanorama = {
  documentos: [],
  resultados: [],
  medicamentos: [],
  consultas: [],
  vacinas: [],
  importacoes: [],
};

const COMPLETO: LinhasDoPanorama = {
  documentos: [
    { id: 'd1', documentType: 'exam', documentName: 'Hemograma', documentDate: '2026-01-10' },
    { id: 'd2', documentType: 'exam', documentName: 'Lipídios', documentDate: '2026-05-02' },
    { id: 'd3', documentType: 'prescription', documentName: 'Receita', documentDate: '2026-03-01' },
  ],
  resultados: [
    { id: 'l1', documentId: 'd2', value: 210, unit: 'mg/dL', collectedAt: '2026-04-28' },
    { id: 'l2', documentId: 'd1', value: 13.2, unit: 'g/dL', collectedAt: '2025-12-01' },
  ],
  medicamentos: [
    { id: 'm1', name: 'Losartana', dosage: '50', active: true, stockQuantity: 20, notes: 'tomar cedo' },
    { id: 'm2', name: 'Metformina', dosage: '500' },
    { id: 'm3', name: 'Amoxicilina', active: false },
  ],
  consultas: [
    // Tres horas a frente de AGORA: futura no horario de Brasilia, passada em UTC.
    { appointmentType: 'CONSULTA', appointmentName: 'Cardiologia', professionalName: 'Dra. Ana', scheduledAt: '2026-10-19T15:00', address: 'Rua A' },
    { appointmentType: 'EXAME', appointmentName: 'Ultrassom', scheduledAt: '2026-11-03T08:00' },
    { appointmentType: 'CONSULTA', appointmentName: 'Clínico', scheduledAt: '2026-02-01T09:00' },
  ],
  vacinas: [
    { name: 'Hepatite B', appliedDate: '2025-05-01', doseNumber: 1 },
    { name: 'dT', appliedDate: '2026-01-10', doseNumber: 2 },
    { name: 'Gripe', dueDate: '2027-04-01' },
  ],
  importacoes: [
    {
      id: 'h1',
      status: 'READY',
      createdAt: '2026-10-01T09:00:00Z',
      analyzedAt: '2026-10-01T10:00:00Z',
      periodStart: '2026-07-01',
      periodEnd: '2026-09-30',
      metricsJson: '{"metrics":[{"metric":"sleepMinutes","mean":370}]}',
    },
  ],
};

describe('montarPanorama', () => {
  it('perfil vazio: tudo indisponivel, cada secao com explicacao', () => {
    const saida = montarPanorama(VAZIO, AGORA);
    expect(saida.disponivel).toBe(false);
    for (const secao of [saida.documentos, saida.medicamentos, saida.consultas, saida.vacinas, saida.wearable]) {
      expect(secao.disponivel).toBe(false);
      if (!secao.disponivel) expect(secao.explicacao.length).toBeGreaterThan(0);
    }
  });

  it('perfil completo: contagens e datas', () => {
    const saida = montarPanorama(COMPLETO, AGORA);
    expect(saida.disponivel).toBe(true);
    expect(saida.documentos).toEqual({
      disponivel: true,
      total: 3,
      exames: 2,
      receitas: 1,
      coletaMaisRecente: '2026-04-28',
      registroMaisRecente: '2026-05-02',
    });
    expect(saida.medicamentos).toEqual({ disponivel: true, emUso: 2, encerrados: 1 });
    expect(saida.consultas).toEqual({
      disponivel: true,
      futuras: 2,
      passadas: 1,
      proxima: { quando: '2026-10-19T15:00', tipo: 'CONSULTA', nome: 'Cardiologia' },
    });
    expect(saida.vacinas).toEqual({
      disponivel: true,
      registrosAplicados: 2,
      maisRecente: { nome: 'dT', aplicadaEm: '2026-01-10' },
    });
    expect(saida.wearable).toEqual({ disponivel: true, dadosAte: '2026-09-30', importadoEm: '2026-10-01' });
    expect(saida.ondeVerDetalhes).toMatch(/consultar_exames/);
    // A contagem de receitas aponta para a ferramenta das receitas (revisao do E10).
    expect(saida.ondeVerDetalhes).toMatch(/consultar_receitas/);
  });

  it('a importacao feita as 22h em Brasilia e do dia, como em consultar_wearable (revisao do E6)', () => {
    const noite = { ...COMPLETO.importacoes[0], createdAt: '2026-10-02T01:30:00Z', analyzedAt: '2026-10-03T10:00:00Z' };
    const saida = montarPanorama({ ...VAZIO, importacoes: [noite] }, AGORA);
    expect(saida.wearable).toMatchObject({ importadoEm: '2026-10-01' });
  });

  it('parcial: so remedios', () => {
    const saida = montarPanorama({ ...VAZIO, medicamentos: COMPLETO.medicamentos }, AGORA);
    expect(saida.disponivel).toBe(true);
    expect(saida.medicamentos.disponivel).toBe(true);
    expect(saida.documentos.disponivel).toBe(false);
    expect(saida.wearable.disponivel).toBe(false);
  });

  it('so consultas passadas: secao disponivel, sem proxima', () => {
    const saida = montarPanorama({ ...VAZIO, consultas: [COMPLETO.consultas[2]] }, AGORA);
    expect(saida.consultas).toEqual({ disponivel: true, futuras: 0, passadas: 1, proxima: null });
  });

  it('nenhum valor clinico sai: exame, dose, estoque, observacao, nome de remedio, metrica', () => {
    const json = JSON.stringify(montarPanorama(COMPLETO, AGORA));
    for (const proibido of ['210', '13.2', 'mg/dL', 'dosage', 'stock', 'observ', 'tomar cedo', 'Losartana', 'Metformina', 'Amoxicilina', 'metrics', 'sleepMinutes', 'Dra. Ana', 'Rua A']) {
      expect(json).not.toContain(proibido);
    }
  });

  it('wearable cuja ultima importacao nao concluiu: indisponivel, pela regra de consultar_wearable', () => {
    const saida = montarPanorama(
      {
        ...VAZIO,
        importacoes: [
          ...COMPLETO.importacoes,
          { id: 'h2', status: 'PROCESSING', createdAt: '2026-10-18T09:00:00Z' },
        ],
      },
      AGORA,
    );
    expect(saida.wearable.disponivel).toBe(false);
  });

  it('dose so prevista nao conta como vacina aplicada', () => {
    const saida = montarPanorama({ ...VAZIO, vacinas: [COMPLETO.vacinas[2]] }, AGORA);
    expect(saida.vacinas.disponivel).toBe(false);
  });
});

describe('renderizarPanorama (modo degradado)', () => {
  it('uma linha por secao disponivel, sem citacao', () => {
    const bloco = renderizarPanorama(montarPanorama(COMPLETO, AGORA));
    expect(bloco?.linhas).toHaveLength(5);
    expect(bloco?.citacoes).toEqual([]);
  });

  it('perfil vazio: nada a mostrar', () => {
    expect(renderizarPanorama(montarPanorama(VAZIO, AGORA))).toBeNull();
  });
});
