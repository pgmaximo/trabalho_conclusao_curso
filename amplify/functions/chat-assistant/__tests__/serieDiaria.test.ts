/**
 * As contas sobre a serie diaria do wearable (E6): leitura do `result.json`,
 * media dos dias com registro, formatacao e datas em texto. Modulo puro, usado
 * por `consultar_wearable_dias` e por `consultar_comparacao`.
 */
import {
  diaDaSemana,
  diasEntre,
  formatarDiferenca,
  formatarValorDiario,
  mediaNoIntervalo,
  pontosNoIntervalo,
  serieDoResultado,
  somarDias,
} from '../tools/serieDiaria';

const resultado = (series: unknown) => JSON.stringify({ series, summary: {}, insights: {} });

describe('serieDoResultado', () => {
  it('JSON invalido, sem series, ou sem ponto valido: null', () => {
    expect(serieDoResultado('{')).toBeNull();
    expect(serieDoResultado('{"summary":{}}')).toBeNull();
    expect(serieDoResultado(resultado([]))).toBeNull();
    expect(serieDoResultado(resultado({ sleepMinutes: [{ dateKey: 'x', value: 1 }] }))).toBeNull();
  });

  it('descarta ponto com dia malformado ou valor nao finito', () => {
    const serie = serieDoResultado(
      resultado({
        sleepMinutes: [
          { dateKey: '2026-10-08', value: 400, sampleCount: 3 },
          { dateKey: 'x', value: 1 },
          { dateKey: '2026-10-07', value: null },
          { dateKey: '2026-10-06', value: 'NaN' },
        ],
      }),
    );
    expect(serie).toEqual({ sleepMinutes: [{ dia: '2026-10-08', valor: 400 }] });
  });

  it('a FC de repouso e a minima do dia, como no resumo da tela', () => {
    const serie = serieDoResultado(
      resultado({ heartRateMinBpm: [{ dateKey: '2026-10-08', value: 52, sampleCount: 1 }] }),
    );
    expect(serie?.restingHeartRateBpm).toEqual([{ dia: '2026-10-08', valor: 52 }]);
  });

  it('ordena e fica com um ponto por dia (o ultimo lido)', () => {
    const serie = serieDoResultado(
      resultado({
        steps: [
          { dateKey: '2026-10-09', value: 100 },
          { dateKey: '2026-10-08', value: 200 },
          { dateKey: '2026-10-09', value: 300 },
        ],
      }),
    );
    expect(serie?.steps).toEqual([
      { dia: '2026-10-08', valor: 200 },
      { dia: '2026-10-09', valor: 300 },
    ]);
  });
});

describe('intervalos', () => {
  const pontos = [
    { dia: '2026-10-05', valor: 999 },
    { dia: '2026-10-08', valor: 400 },
    { dia: '2026-10-10', valor: 380 },
    { dia: '2026-10-14', valor: 999 },
  ];

  it('pontosNoIntervalo inclui as duas pontas', () => {
    expect(pontosNoIntervalo(pontos, '2026-10-08', '2026-10-10').map((p) => p.dia)).toEqual([
      '2026-10-08',
      '2026-10-10',
    ]);
  });

  it('a media considera so os dias com registro', () => {
    expect(mediaNoIntervalo(pontos, '2026-10-07', '2026-10-13')).toEqual({
      dias: 7,
      diasComRegistro: 2,
      media: 390,
    });
  });

  it('sem registro, a media e nula', () => {
    expect(mediaNoIntervalo(pontos, '2026-10-01', '2026-10-04')).toEqual({ dias: 4, diasComRegistro: 0, media: null });
  });
});

describe('formatarValorDiario', () => {
  it.each([
    ['sono', 400, '6 h 40 min'],
    ['sono', 45, '45 min'],
    ['sono', 420, '7 h'],
    ['passos', 7430.4, '7.430 passos'],
    ['fc_repouso', 61.6, '62 bpm'],
    ['fc_media', 70, '70 bpm'],
    ['estresse', 38.2, '38 pontos'],
  ] as const)('%s %p -> %s', (metrica, valor, texto) => {
    expect(formatarValorDiario(metrica, valor)).toBe(texto);
  });
});

describe('formatarDiferenca', () => {
  it('a mais e a menos, no periodo atual', () => {
    expect(formatarDiferenca('sono', 412, 380)).toBe('32 min a mais por dia no período atual');
    expect(formatarDiferenca('sono', 380, 445)).toBe('1 h 5 min a menos por dia no período atual');
    expect(formatarDiferenca('passos', 8680, 7430)).toBe('1.250 passos a mais por dia no período atual');
  });

  it('iguais depois do arredondamento da exibicao', () => {
    expect(formatarDiferenca('passos', 7430, 7430.4)).toBe('a mesma média nos dois períodos');
  });
});

describe('datas em texto', () => {
  it('somarDias atravessa mes e ano bissexto', () => {
    expect(somarDias('2028-03-01', -1)).toBe('2028-02-29');
    expect(somarDias('2026-01-01', -28)).toBe('2025-12-04');
    expect(somarDias('2026-10-12', 1)).toBe('2026-10-13');
  });

  it('diasEntre conta as duas pontas', () => {
    expect(diasEntre('2026-10-06', '2026-10-12')).toBe(7);
    expect(diasEntre('2026-10-06', '2026-10-06')).toBe(1);
  });

  it('diaDaSemana pelo calendario, sem fuso', () => {
    expect(diaDaSemana('2026-10-08')).toBe('quinta-feira');
    expect(diaDaSemana('2026-10-11')).toBe('domingo');
  });
});
