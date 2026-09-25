import { ANALYTE_CATALOG } from '../amplify/functions/extract-document-data/analyteCatalog';
import { buildAnalyteSeries, sharedReferenceRange } from '@/services/analyteSeries';
import type { LabResultView } from '@/services/extractionService';

// D27: nenhum codigo LOINC e digitado a mao, nem como exemplo em teste, e
// comentario dizendo "vem do extrato oficial" nao e verificacao -- um literal
// errado e o comentario ao lado dele erram juntos. O codigo sai do catalogo
// gerado a partir do extrato, buscado pelo rotulo em portugues, que e campo
// nosso e pode ser digitado.
const doCatalogo = (rotulo: string) => {
  const achado = ANALYTE_CATALOG.find((a) => a.projectLabel === rotulo);
  if (!achado) throw new Error(`Analito "${rotulo}" nao esta no catalogo gerado.`);
  return achado;
};

const VITAMINA_D = doCatalogo('Vitamina D (25-OH)');
const GLICOSE = doCatalogo('Glicose');

function linha(over: Partial<LabResultView> = {}): LabResultView {
  return {
    id: 'l1',
    documentId: 'doc-marco',
    analyteCode: VITAMINA_D.code,
    projectLabel: VITAMINA_D.projectLabel,
    analyteLabel: VITAMINA_D.label,
    value: 32.5,
    valueQualifier: null,
    unit: 'ng/mL',
    rawValue: '32,5',
    rawUnit: 'ng/mL',
    referenceLow: 30,
    referenceHigh: 100,
    collectedAt: '2026-03-12',
    collectionMoment: null,
    sourcePage: 2,
    reviewStatus: 'AUTO',
    ...over,
  };
}

describe('buildAnalyteSeries', () => {
  it('poe as duas coletas na mesma serie, em ordem de data de coleta', () => {
    const series = buildAnalyteSeries([
      linha({ id: 'b', collectedAt: '2026-09-20', value: 41, documentId: 'doc-setembro' }),
      linha({ id: 'a', collectedAt: '2026-03-12', value: 32.5 }),
    ]);
    expect(series).toHaveLength(1);
    expect(series[0].points.map((p) => p.id)).toEqual(['a', 'b']);
    expect(series[0].unit).toBe('ng/mL');
  });

  it('linha pendente sai da serie COM MOTIVO, nunca em silencio', () => {
    // A EPIC de extracao prometeu isto nos criterios de aceite dela. E aqui
    // que a promessa e cumprida ou quebrada.
    const series = buildAnalyteSeries([
      linha({ id: 'ok' }),
      linha({ id: 'pendente', reviewStatus: 'PENDENTE_DE_REVISAO', value: null }),
    ]);
    expect(series[0].points.map((p) => p.id)).toEqual(['ok']);
    expect(series[0].excluded).toHaveLength(1);
    expect(series[0].excluded[0]).toMatchObject({ id: 'pendente', reason: 'pendente-de-revisao' });
  });

  it('linha confirmada pela pessoa ENTRA na serie', () => {
    const series = buildAnalyteSeries([
      linha({ id: 'x', reviewStatus: 'CONFIRMADO_PELO_USUARIO' }),
    ]);
    expect(series[0].points.map((p) => p.id)).toEqual(['x']);
  });

  it('valor ausente sai com motivo -- nunca vira zero (D29)', () => {
    const series = buildAnalyteSeries([linha({ id: 'ok' }), linha({ id: 'sem', value: null })]);
    expect(series[0].points.map((p) => p.id)).toEqual(['ok']);
    expect(series[0].excluded[0].reason).toBe('sem-valor');
    // O que NAO pode acontecer de jeito nenhum:
    expect(series[0].points.some((p) => p.value === 0)).toBe(false);
  });

  it('valor censurado sai do traco e CONTINUA listado como limite (D21)', () => {
    // Desenhar <0,01 como 0,01 afirma uma medida que o laboratorio declarou
    // nao ter feito, e ligar isso aos vizinhos por uma reta transforma uma
    // nao-medida em tendencia.
    const series = buildAnalyteSeries([
      linha({ id: 'medida' }),
      linha({ id: 'limite', value: 0.01, valueQualifier: '<', rawValue: '<0,01' }),
    ]);
    expect(series[0].points.map((p) => p.id)).toEqual(['medida']);
    expect(series[0].excluded[0]).toMatchObject({ id: 'limite', reason: 'limite-de-deteccao' });
  });

  it('unidade divergente sai com motivo -- a tela nao converte (D29)', () => {
    const series = buildAnalyteSeries([
      linha({ id: 'a' }),
      linha({ id: 'b', unit: 'nmol/L', value: 79.87, collectedAt: '2026-09-20' }),
    ]);
    expect(series[0].points.map((p) => p.id)).toEqual(['a']);
    expect(series[0].excluded[0].reason).toBe('unidade-divergente');
  });

  it('curva glicemica vira DUAS series, nunca uma serra (D22)', () => {
    const glicose = {
      analyteCode: GLICOSE.code,
      projectLabel: GLICOSE.projectLabel,
      unit: 'mg/dL',
      rawUnit: 'mg/dL',
    };
    const series = buildAnalyteSeries([
      linha({ ...glicose, id: 'j1', value: 92, collectionMoment: 'jejum', collectedAt: '2026-03-12' }),
      linha({ ...glicose, id: 'c1', value: 128, collectionMoment: '120 minutos', collectedAt: '2026-03-12' }),
      linha({ ...glicose, id: 'j2', value: 97, collectionMoment: 'jejum', collectedAt: '2026-09-20' }),
      linha({ ...glicose, id: 'c2', value: 134, collectionMoment: '120 minutos', collectedAt: '2026-09-20' }),
    ]);
    expect(series).toHaveLength(2);
    const jejum = series.find((s) => s.collectionMoment === 'jejum');
    expect(jejum?.points.map((p) => p.id)).toEqual(['j1', 'j2']);
  });

  it('momento vazio e momento ausente sao a mesma serie', () => {
    const series = buildAnalyteSeries([
      linha({ id: 'a', collectionMoment: null }),
      linha({ id: 'b', collectionMoment: '', collectedAt: '2026-09-20' }),
    ]);
    expect(series).toHaveLength(1);
  });

  it('a chave nao confunde analito com momento', () => {
    // Concatenar codigo e momento sem separador faz "X-AB" sem momento e
    // "X-A" no momento "B" virarem a MESMA serie -- duas substancias
    // diferentes num traco so. Com codigo local (D32) isso deixa de ser
    // hipotese: os codigos sao derivados de rotulo e tem tamanho livre.
    const series = buildAnalyteSeries([
      linha({ id: 'a', analyteCode: 'X-AB', collectionMoment: null }),
      linha({ id: 'b', analyteCode: 'X-A', collectionMoment: 'B', collectedAt: '2026-09-20' }),
    ]);
    expect(series).toHaveLength(2);
  });

  it('duas coletas na mesma data desempatam por id, NUNCA por valor', () => {
    // Desempatar por valor produziria uma serie artificialmente crescente --
    // um padrao que a pessoa leria como evolucao e que nao existe.
    const a = buildAnalyteSeries([linha({ id: 'zz', value: 10 }), linha({ id: 'aa', value: 90 })]);
    expect(a[0].points.map((p) => p.id)).toEqual(['aa', 'zz']);
  });

  it('linha sem data de coleta sai com o motivo CERTO, e nao como "sem valor"', () => {
    // A EPIC anterior garante a reserva da data do formulario, mas um dado
    // antigo pode nao ter passado por ela. Dizer "sem valor" de uma linha que
    // TEM valor e uma explicacao falsa, e a tela existe para explicar.
    const series = buildAnalyteSeries([linha({ id: 'a', collectedAt: null })]);
    expect(series[0].points).toHaveLength(0);
    expect(series[0].excluded[0].reason).toBe('sem-data');
  });

  it('linha pendente nao decide a unidade da serie', () => {
    // Se uma linha que nem vai ser comparada pudesse fixar a unidade, uma
    // leitura duvidosa de unidade errada expulsaria do traco todas as linhas
    // boas -- uma serie inteira sumiria por causa da pior linha dela.
    const series = buildAnalyteSeries([
      linha({ id: 'boa1', unit: 'ng/mL', collectedAt: '2026-03-12' }),
      linha({ id: 'boa2', unit: 'ng/mL', collectedAt: '2026-09-20' }),
      linha({
        id: 'duvidosa',
        unit: 'nmol/L',
        collectedAt: '2026-10-01',
        reviewStatus: 'PENDENTE_DE_REVISAO',
      }),
    ]);
    expect(series[0].unit).toBe('ng/mL');
    expect(series[0].points.map((p) => p.id)).toEqual(['boa1', 'boa2']);
  });

  it('lista vazia devolve lista vazia, sem lancar', () => {
    expect(buildAnalyteSeries([])).toEqual([]);
  });
});

const ponto = (low: number | null, high: number | null, id = 'p') => ({
  id,
  documentId: 'd',
  collectedAt: '2026-03-12',
  value: 32,
  referenceLow: low,
  referenceHigh: high,
  rawValue: '32',
  rawUnit: 'ng/mL',
});

describe('sharedReferenceRange', () => {
  it('devolve a faixa quando todos os laboratorios concordam', () => {
    expect(sharedReferenceRange([ponto(30, 100, 'a'), ponto(30, 100, 'b')])).toEqual({
      low: 30,
      high: 100,
    });
  });

  it('devolve nulo quando QUALQUER ponto diverge', () => {
    // Desenhar a faixa do laboratorio mais recente por cima dos pontos de
    // outro afirma um criterio que nao vale para eles.
    expect(sharedReferenceRange([ponto(30, 100, 'a'), ponto(20, 100, 'b')])).toBeNull();
  });

  it('faixa parcial conta como faixa e e comparada como tal', () => {
    expect(sharedReferenceRange([ponto(30, null, 'a'), ponto(30, null, 'b')])).toEqual({
      low: 30,
      high: null,
    });
    expect(sharedReferenceRange([ponto(30, null, 'a'), ponto(30, 100, 'b')])).toBeNull();
  });

  it('devolve nulo quando nenhum ponto tem faixa', () => {
    expect(sharedReferenceRange([ponto(null, null, 'a'), ponto(null, null, 'b')])).toBeNull();
  });

  it('um ponto so tem faixa comum -- a dele', () => {
    expect(sharedReferenceRange([ponto(30, 100)])).toEqual({ low: 30, high: 100 });
  });

  it('um ponto COM faixa e outro SEM nao tem faixa comum', () => {
    // O ponto sem faixa nao concorda com nada: ele nao tem criterio. Desenhar
    // a banda do primeiro por cima dele afirmaria um criterio que o
    // laboratorio dele nao deu.
    expect(sharedReferenceRange([ponto(30, 100, 'a'), ponto(null, null, 'b')])).toBeNull();
  });

  it('lista vazia devolve nulo, sem lancar', () => {
    expect(sharedReferenceRange([])).toBeNull();
  });
});
