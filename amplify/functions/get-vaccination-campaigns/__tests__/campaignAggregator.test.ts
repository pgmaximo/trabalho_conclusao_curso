import { aggregateCampanhas, computeDataAsOf } from '../campaignAggregator';
import type { CampanhaDefinicao } from '../campaignCalendar';
import type { PniDoseRecordRaw } from '../pniClient';

const CAMPANHA: CampanhaDefinicao = {
  id: 'multivacinacao-2026',
  nome: 'Campanha Nacional de Multivacinação',
  janelaInicio: '2026-08-03',
  janelaFim: '2026-09-01',
  fonteUrl: 'https://exemplo.gov.br/campanha',
};

function record(dataVacina: string, uf: string): PniDoseRecordRaw {
  return {
    data_vacina: `${dataVacina} 00:00:00-03`,
    sigla_uf_estabelecimento: uf,
    codigo_municipio_estabelecimento: '355030',
  };
}

describe('computeDataAsOf', () => {
  it('retorna a maior data_vacina da amostra', () => {
    const records = [record('2026-06-01', 'SP'), record('2026-08-15', 'RJ'), record('2026-07-01', 'MG')];
    expect(computeDataAsOf(records)).toBe('2026-08-15');
  });

  it('retorna null para amostra vazia', () => {
    expect(computeDataAsOf([])).toBeNull();
  });

  it('ignora registros sem data_vacina', () => {
    expect(computeDataAsOf([{ sigla_uf_estabelecimento: 'SP' }])).toBeNull();
  });
});

describe('aggregateCampanhas', () => {
  it('conta apenas registros dentro da janela da campanha e da UF pedida', () => {
    const records = [
      record('2026-08-10', 'SP'), // dentro da janela, SP
      record('2026-08-20', 'SP'), // dentro da janela, SP
      record('2026-08-15', 'RJ'), // dentro da janela, mas outra UF
      record('2026-06-01', 'SP'), // fora da janela
    ];

    const [result] = aggregateCampanhas([CAMPANHA], records, 'SP');

    expect(result.dosesNoPeriodo).toBe(2);
    expect(result.ufReferencia).toBe('SP');
  });

  it('conta nacionalmente quando uf é null', () => {
    const records = [record('2026-08-10', 'SP'), record('2026-08-15', 'RJ')];
    const [result] = aggregateCampanhas([CAMPANHA], records, null);
    expect(result.dosesNoPeriodo).toBe(2);
  });

  it('retorna null (não zero) quando a amostra não alcança a janela da campanha', () => {
    const records = [record('2026-01-01', 'SP'), record('2026-02-01', 'SP')];
    const [result] = aggregateCampanhas([CAMPANHA], records, 'SP');
    expect(result.dosesNoPeriodo).toBeNull();
  });

  it('retorna 0 (não null) quando a amostra alcança a janela mas não há doses na UF pedida', () => {
    const records = [record('2026-08-10', 'RJ')];
    const [result] = aggregateCampanhas([CAMPANHA], records, 'SP');
    expect(result.dosesNoPeriodo).toBe(0);
  });
});
