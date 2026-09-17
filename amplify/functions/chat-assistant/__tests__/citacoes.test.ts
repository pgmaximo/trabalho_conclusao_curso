import { enriquecerCitacoes, indexarLinhasCitaveis } from '../citacoes';

const saidaDeAnalito = {
  name: 'consultar_analito',
  output: {
    nome: 'Vitamina D (25-OH)',
    series: [
      {
        unidade: 'ng/mL',
        coletas: [
          { id: 'l-1', valor: 32.5, unidade: 'ng/mL', dataDaColeta: '2026-03-12', documentoId: 'doc-1' },
        ],
      },
    ],
  },
};

describe('indexarLinhasCitaveis', () => {
  it('indexa cada coleta pelo id da linha', () => {
    const indice = indexarLinhasCitaveis([saidaDeAnalito]);
    expect(indice.get('l-1')).toEqual({
      resultId: 'l-1',
      documentId: 'doc-1',
      analyteLabel: 'Vitamina D (25-OH)',
      value: '32,5',
      unit: 'ng/mL',
      collectedAt: '2026-03-12',
    });
  });

  it('ignora as tools que nao devolvem linha de exame', () => {
    // Citacao aponta para a LINHA de onde um valor saiu. Uma consulta agendada
    // nao e uma linha de exame.
    const indice = indexarLinhasCitaveis([
      { name: 'consultar_consultas', output: { futuras: [{ nome: 'Cardiologista' }] } },
    ]);
    expect(indice.size).toBe(0);
  });

  it('nao quebra com saida fora do formato esperado', () => {
    expect(indexarLinhasCitaveis([{ name: 'consultar_analito', output: null }]).size).toBe(0);
    expect(indexarLinhasCitaveis([{ name: 'consultar_analito', output: { series: 'x' } }]).size).toBe(0);
  });
});

describe('enriquecerCitacoes', () => {
  it('troca o identificador do modelo pelo dado real', () => {
    // O valor e a unidade vem do BANCO, nunca do que o modelo repetiu: pedir
    // que ele repita o numero abriria uma segunda via para ele divergir.
    const indice = indexarLinhasCitaveis([saidaDeAnalito]);
    expect(enriquecerCitacoes([{ resultId: 'l-1' }], indice)).toEqual([indice.get('l-1')]);
  });

  it('DESCARTA citacao que nao esta no indice', () => {
    // Ela ja reprovou a verificacao da R4; deixa-la na bolha daria a pessoa um
    // atalho para um documento que pode nao existir.
    const indice = indexarLinhasCitaveis([saidaDeAnalito]);
    expect(enriquecerCitacoes([{ resultId: 'inventada' }], indice)).toEqual([]);
  });
});
