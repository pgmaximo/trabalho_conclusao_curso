/**
 * A comparacao lado a lado (E10, 10.2, D10.1 = B): um resultado de exame ao lado
 * da media de sono ou de passos dos 28 DIAS ANTES DA COLETA (D10.5, cumprida no
 * E6 com a serie diaria). A serie do exame vem da mesma funcao de
 * `consultar_analito`; a do wearable, na forma que `serieDoResultado` devolve.
 */
jest.mock('@aws-sdk/lib-dynamodb', () => ({ DynamoDBDocumentClient: { from: () => ({}) } }));
jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));
jest.mock('../tools/bucketDaSerie', () => ({ baixarTextoDoBucket: jest.fn() }));

import { checkLanguageRules } from '../../ai-language-rules/languageRules';
import { TEXTO_DA_COMPARACAO } from '../comparacaoFixa';
import { serieDoAnalito } from '../tools/analitos';
import {
  AVISO_DO_ALINHAMENTO,
  formatarMediaDoWearable,
  datasDasColetasMostradas,
  montarComparacao,
  proximasParaLer,
  renderizarComparacao,
} from '../tools/comparacaoSaida';
import { comoLinha } from '../tools/linhasDeResultado';
import { somarDias, type SerieDiaria } from '../tools/serieDiaria';
import { ANALYTE_CATALOG } from '../../extract-document-data/analyteCatalog';

// O codigo vem do catalogo gerado, nunca digitado a mao (D27,
// `codigosLoincNaoDigitados.test.ts`).
const COLESTEROL_TOTAL = ANALYTE_CATALOG.find((a) => a.projectLabel === 'Colesterol total')!.code;

function coleta(id: string, data: string, valor = 210, extra: Record<string, unknown> = {}) {
  return {
    id,
    documentId: `doc-${id}`,
    analyteCode: COLESTEROL_TOTAL,
    projectLabel: 'Colesterol total',
    analyteLabel: 'Colesterol total',
    value: valor,
    unit: 'mg/dL',
    collectedAt: data,
    reviewStatus: 'AUTO',
    ...extra,
  };
}

const serieDe = (...linhas: Record<string, unknown>[]) =>
  serieDoAnalito(linhas.map(comoLinha), { termo: 'colesterol total' });

function importacao(id: string, periodo: [string, string], extra: Record<string, unknown> = {}) {
  return { id, status: 'READY', createdAt: '2026-05-01T10:00:00Z', periodStart: periodo[0], periodEnd: periodo[1], ...extra };
}

/** Pontos todo dia de `de` a `ate`. */
function dias(de: string, ate: string, valor: number) {
  const pontos = [];
  for (let d = de; d <= ate; d = somarDias(d, 1)) pontos.push({ dia: d, valor });
  return pontos;
}

const FEV_A_ABR: SerieDiaria = { sleepMinutes: dias('2026-02-01', '2026-04-30', 370), steps: dias('2026-02-01', '2026-04-30', 7430.4) };
const IMPORTACAO = importacao('h', ['2026-02-01', '2026-04-30']);
const SERIES = new Map<string, SerieDiaria | null>([['h', FEV_A_ABR]]);

type Par = {
  exame: { id: string; dataDaColeta: string; momento: string | null };
  wearable: { de: string; ate: string; media: string; diasComRegistro: number } | null;
  explicacaoDoWearable?: string;
};
type ComPares = { pares: Par[]; omitidas: number };

describe('montarComparacao', () => {
  it('a serie de exemplo e real: o termo resolve', () => {
    expect(serieDe(coleta('l1', '2026-03-20')).disponivel).toBe(true);
  });

  it('C5.1: par completo, com a media dos 28 dias antes da coleta e o aviso do alinhamento', () => {
    const saida = montarComparacao(serieDe(coleta('l1', '2026-03-12')), [IMPORTACAO], SERIES, 'sono');
    expect(saida).toEqual({
      disponivel: true,
      analito: 'Colesterol total',
      dadoDoWearable: 'sono',
      pares: [
        {
          exame: { id: 'l1', valor: 210, unidade: 'mg/dL', dataDaColeta: '2026-03-12', documentoId: 'doc-l1', momento: null },
          wearable: { de: '2026-02-12', ate: '2026-03-11', media: '6 h 10 min por dia', diasComRegistro: 28 },
        },
      ],
      omitidas: 0,
      naoComparaveis: 0,
      avisoDoAlinhamento: AVISO_DO_ALINHAMENTO,
    });
  });

  it('o aviso diz que a media e dos 28 dias antes da coleta, so dos dias com registro', () => {
    expect(AVISO_DO_ALINHAMENTO).toBe(
      'A média do wearable é dos 28 dias antes da coleta, e considera só os dias em que houve registro.',
    );
  });

  it('formata a media no codigo, nunca no modelo', () => {
    expect(formatarMediaDoWearable('sono', 360)).toBe('6 h por dia');
    expect(formatarMediaDoWearable('sono', 45.4)).toBe('45 min por dia');
    expect(formatarMediaDoWearable('passos', 7430.4)).toBe('7.430 passos por dia');
  });

  it('passos: usa a metrica de passos', () => {
    const saida = montarComparacao(serieDe(coleta('l1', '2026-03-20')), [IMPORTACAO], SERIES, 'passos') as ComPares;
    expect(saida.pares[0].wearable).toMatchObject({ media: '7.430 passos por dia' });
  });

  it('a janela atravessa a virada do ano', () => {
    const virada = new Map([['v', { sleepMinutes: dias('2025-11-01', '2026-01-31', 400) }]]);
    const saida = montarComparacao(serieDe(coleta('l1', '2026-01-01')), [importacao('v', ['2025-11-01', '2026-01-31'])], virada, 'sono') as ComPares;
    expect(saida.pares[0].wearable).toMatchObject({ de: '2025-12-04', ate: '2025-12-31' });
  });

  it('C2.3: tres coletas mais recentes, e as outras contadas', () => {
    const saida = montarComparacao(
      serieDe(
        coleta('a', '2025-01-10'),
        coleta('b', '2025-06-10'),
        coleta('c', '2026-02-10'),
        coleta('d', '2026-03-20'),
        coleta('e', '2026-04-20'),
      ),
      [IMPORTACAO],
      SERIES,
      'sono',
    ) as ComPares;
    expect(saida.pares.map((p) => p.exame.id)).toEqual(['e', 'd', 'c']);
    expect(saida.omitidas).toBe(2);
  });

  it('coleta fora do periodo mostra o exame, sem wearable, com explicacao', () => {
    const saida = montarComparacao(serieDe(coleta('l1', '2025-06-10')), [IMPORTACAO], SERIES, 'sono') as ComPares;
    expect(saida.pares[0].wearable).toBeNull();
    expect(saida.pares[0].explicacaoDoWearable).toMatch(/não cobrem esse período/);
  });

  it('C5.2: 13 dias com registro nao dao media; 14 dao', () => {
    const coletaEm = '2026-03-29';
    const treze = new Map([['h', { sleepMinutes: dias('2026-03-15', '2026-03-27', 370) }]]);
    const quatorze = new Map([['h', { sleepMinutes: dias('2026-03-15', '2026-03-28', 370) }]]);
    const comTreze = montarComparacao(serieDe(coleta('l1', coletaEm)), [IMPORTACAO], treze, 'sono') as ComPares;
    expect(comTreze.pares[0].wearable).toBeNull();
    expect(comTreze.pares[0].explicacaoDoWearable).toMatch(/13 dos 28 dias/);
    const comQuatorze = montarComparacao(serieDe(coleta('l1', coletaEm)), [IMPORTACAO], quatorze, 'sono') as ComPares;
    expect(comQuatorze.pares[0].wearable).toMatchObject({ diasComRegistro: 14 });
  });

  it('a importacao sem a metrica nao da media', () => {
    const semSono = new Map([['h', { steps: dias('2026-02-01', '2026-04-30', 7000) }]]);
    const saida = montarComparacao(serieDe(coleta('l1', '2026-03-20')), [IMPORTACAO], semSono, 'sono') as ComPares;
    expect(saida.pares[0].wearable).toBeNull();
    expect(saida.pares[0].explicacaoDoWearable).toMatch(/0 dos 28 dias/);
  });

  describe('C5.3: qual importacao', () => {
    const antiga = importacao('antiga', ['2026-02-01', '2026-03-31'], { createdAt: '2026-04-01T10:00:00Z' });
    const nova = importacao('nova', ['2026-02-01', '2026-04-30'], { createdAt: '2026-05-01T10:00:00Z' });

    it('vale a criada por ultimo', () => {
      const series = new Map([
        ['antiga', { sleepMinutes: dias('2026-02-01', '2026-03-31', 300) }],
        ['nova', { sleepMinutes: dias('2026-02-01', '2026-04-30', 420) }],
      ]);
      const saida = montarComparacao(serieDe(coleta('l1', '2026-03-20')), [antiga, nova], series, 'sono') as ComPares;
      expect(saida.pares[0].wearable).toMatchObject({ media: '7 h por dia' });
    });

    it('a mais nova sem serie cede a mais antiga', () => {
      const series = new Map<string, SerieDiaria | null>([
        ['antiga', { sleepMinutes: dias('2026-02-01', '2026-03-31', 420) }],
        ['nova', null],
      ]);
      const saida = montarComparacao(serieDe(coleta('l1', '2026-03-20')), [antiga, nova], series, 'sono') as ComPares;
      expect(saida.pares[0].wearable).toMatchObject({ media: '7 h por dia' });
    });

    it('nenhuma com serie: a explicacao diz que a serie dia a dia nao esta disponivel', () => {
      const series = new Map<string, SerieDiaria | null>([['nova', null]]);
      const saida = montarComparacao(serieDe(coleta('l1', '2026-03-20')), [nova], series, 'sono') as ComPares;
      expect(saida.pares[0].wearable).toBeNull();
      expect(saida.pares[0].explicacaoDoWearable).toMatch(/série dia a dia/);
    });

    it('importacao que nao foi lida (fora do teto de leituras) diz isso, sem prometer nada (revisao)', () => {
      const saida = montarComparacao(serieDe(coleta('l1', '2026-03-20')), [nova], new Map(), 'sono') as ComPares;
      expect(saida.pares[0].explicacaoDoWearable).toMatch(/não foi consultada/);
    });

    it('a serie indisponivel nao promete que importar de novo resolve (revisao)', () => {
      const saida = montarComparacao(serieDe(coleta('l1', '2026-03-20')), [nova], new Map([['nova', null]]), 'sono') as ComPares;
      expect(saida.pares[0].explicacaoDoWearable).not.toMatch(/nova importação/);
    });

    it('FAILED e sem periodo sao ignoradas', () => {
      const falhou = importacao('f', ['2026-02-01', '2026-04-30'], { status: 'FAILED', createdAt: '2026-06-01T10:00:00Z' });
      const semPeriodo = importacao('s', ['2026-02-01', '2026-04-30'], { periodStart: null, createdAt: '2026-06-02T10:00:00Z' });
      const series = new Map([
        ['nova', { sleepMinutes: dias('2026-02-01', '2026-04-30', 420) }],
        ['f', { sleepMinutes: dias('2026-02-01', '2026-04-30', 60) }],
        ['s', { sleepMinutes: dias('2026-02-01', '2026-04-30', 60) }],
      ]);
      const saida = montarComparacao(serieDe(coleta('l1', '2026-03-20')), [nova, falhou, semPeriodo], series, 'sono') as ComPares;
      expect(saida.pares[0].wearable).toMatchObject({ media: '7 h por dia' });
    });
  });

  describe('proximasParaLer', () => {
    const a = importacao('a', ['2025-01-01', '2025-03-31'], { createdAt: '2025-04-01T00:00:00Z' });
    const b = importacao('b', ['2025-05-01', '2025-07-31'], { createdAt: '2025-08-01T00:00:00Z' });
    const c = importacao('c', ['2026-01-01', '2026-04-30'], { createdAt: '2026-05-01T00:00:00Z' });
    const velha = importacao('velha', ['2026-01-01', '2026-04-30'], { createdAt: '2026-04-01T00:00:00Z' });
    const datas = ['2026-03-20', '2025-06-10', '2025-03-01'];
    const ids = (series: Map<string, SerieDiaria | null>) =>
      proximasParaLer([a, b, c, velha], datas, series, 'sono').map((l) => l.id);

    it('nada lido: por janela, a pronta criada por ultimo que a toca, na ordem de preferencia', () => {
      expect(ids(new Map())).toEqual(['c', 'b', 'a']);
    });

    it('a preferida lida sem serie cede a proxima da mesma janela (revisao)', () => {
      expect(ids(new Map([['c', null], ['b', { sleepMinutes: dias('2025-05-01', '2025-07-31', 400) }]]))).toEqual(['velha', 'a']);
    });

    it('janela ja atendida nao pede mais leitura', () => {
      const servem = new Map([
        ['c', { sleepMinutes: dias('2026-01-01', '2026-04-30', 400) }],
        ['b', { sleepMinutes: dias('2025-05-01', '2025-07-31', 400) }],
        ['a', { sleepMinutes: dias('2025-01-01', '2025-03-31', 400) }],
      ]);
      expect(ids(servem)).toEqual([]);
    });

    it('janela que nenhuma importacao toca nao le nada', () => {
      expect(proximasParaLer([IMPORTACAO], ['2020-01-01'], new Map(), 'sono')).toEqual([]);
    });

    it('data de coleta que nao existe nao pede leitura', () => {
      expect(proximasParaLer([IMPORTACAO], ['2026-13-01'], new Map(), 'sono')).toEqual([]);
    });
  });

  it('importacao com periodo que nao e data e ignorada, sem erro (code-review)', () => {
    const torta = importacao('t', ['2026-02-01', '2026-13-01'], { createdAt: '2026-06-01T10:00:00Z' });
    const series = new Map([...SERIES, ['t', FEV_A_ABR]]);
    const saida = montarComparacao(serieDe(coleta('l1', '2026-03-12')), [torta, IMPORTACAO], series, 'sono') as ComPares;
    expect(saida.pares[0].wearable).toMatchObject({ media: '6 h 10 min por dia' });
    expect(proximasParaLer([torta], ['2026-03-12'], new Map(), 'sono')).toEqual([]);
  });

  it('as datas lidas sao as das coletas que viram par: uma funcao so (code-review)', () => {
    const serie = serieDe(coleta('a', '2025-01-10'), coleta('b', '2026-02-10'), coleta('c', '2026-03-20'), coleta('d', '2026-04-20'));
    expect(datasDasColetasMostradas(serie)).toEqual(['2026-04-20', '2026-03-20', '2026-02-10']);
    const saida = montarComparacao(serie, [IMPORTACAO], SERIES, 'sono') as ComPares;
    expect(saida.pares.map((p) => p.exame.dataDaColeta)).toEqual(datasDasColetasMostradas(serie));
  });

  it('data de coleta que nao existe nao derruba a comparacao (revisao)', () => {
    const saida = montarComparacao(serieDe(coleta('l1', '2026-02-30')), [IMPORTACAO], SERIES, 'sono') as ComPares;
    expect(saida.pares[0].wearable).toBeNull();
    expect(saida.pares[0].explicacaoDoWearable).toMatch(/data desta coleta/);
  });

  it('C2.7: serie indisponivel passa adiante a explicacao', () => {
    expect(montarComparacao(serieDe(), [IMPORTACAO], SERIES, 'sono')).toMatchObject({ disponivel: false });
  });

  it('C2.7: so coletas nao comparaveis -- nenhum par, indisponivel com explicacao, e elas contadas', () => {
    const saida = montarComparacao(
      serieDe(coleta('l1', '2026-03-20', 210, { reviewStatus: 'PENDENTE_DE_REVISAO' })),
      [IMPORTACAO],
      SERIES,
      'sono',
    );
    expect(saida).toEqual({
      disponivel: false,
      naoComparaveis: 1,
      explicacao: expect.stringMatching(/não podem entrar na comparação/),
    });
  });

  it('C2.8: sem importacao pronta, indisponivel', () => {
    const saida = montarComparacao(serieDe(coleta('l1', '2026-03-20')), [{ ...IMPORTACAO, status: 'PROCESSING' }], SERIES, 'sono');
    expect(saida).toEqual({ disponivel: false, explicacao: expect.stringMatching(/não importou dados de wearable/) });
  });

  it('C2.12: cada par diz o momento da coleta', () => {
    const saida = montarComparacao(
      serieDe(
        coleta('j', '2026-03-17', 95, { collectionMoment: 'jejum' }),
        coleta('p', '2026-03-18', 140, { collectionMoment: '120 minutos' }),
      ),
      [IMPORTACAO],
      SERIES,
      'sono',
    ) as ComPares;
    expect(saida.pares.map((p) => p.exame.momento)).toEqual(['120 minutos', 'jejum']);
  });

  it.each(['sono', 'passos'] as const)('a media formatada de %s nao viola a R3', (dado) => {
    const media = formatarMediaDoWearable(dado, dado === 'sono' ? 370 : 7430);
    const r = checkLanguageRules(`Sono em março: ${media}.`, { questionKind: 'clinica', temOrigem: true });
    expect(r.ok ? [] : r.violations.filter((v) => v.rule === 'R3')).toEqual([]);
  });

  it('o aviso do alinhamento passa nas regras de linguagem', () => {
    for (const questionKind of ['clinica', 'operacional'] as const) {
      const r = checkLanguageRules(AVISO_DO_ALINHAMENTO, { questionKind, temOrigem: true });
      expect(r.ok ? [] : r.violations.filter((v) => v.rule !== 'R2')).toEqual([]);
    }
  });
});

describe('renderizarComparacao (modo degradado)', () => {
  const bloco = () =>
    renderizarComparacao(montarComparacao(serieDe(coleta('l1', '2026-03-12')), [IMPORTACAO], SERIES, 'sono'));

  it('um bloco por par, a citacao do exame, e a frase fixa no fim', () => {
    expect(bloco()?.linhas).toEqual([
      'Colesterol total — 12/03/2026 — 210 mg/dL',
      'Sono de 12/02/2026 a 11/03/2026: 6 h 10 min por dia',
      TEXTO_DA_COMPARACAO,
    ]);
    expect(bloco()?.citacoes).toEqual([{ resultId: 'l1', documentId: 'doc-l1', collectedAt: '2026-03-12' }]);
  });

  it('sem par, nada a mostrar', () => {
    expect(renderizarComparacao({ disponivel: false, explicacao: 'x' })).toBeNull();
  });

  it('nenhuma linha do degradado viola a R3', () => {
    const r = checkLanguageRules(bloco()!.linhas.join('. '), { questionKind: 'clinica', temOrigem: true });
    expect(r.ok ? [] : r.violations.filter((v) => v.rule === 'R3')).toEqual([]);
  });
});
