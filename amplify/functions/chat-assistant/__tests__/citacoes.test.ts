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

/**
 * Bloco 10 -- achado da rodada automatica da L7, reproduzido contra o modelo
 * real: "quais sao os valores do meu exame?" citou 20 linhas, e o indice estava
 * VAZIO. A `consultar_resultados` nasceu no Bloco 8 e devolve linha de exame,
 * mas o indice continuava lendo so a `consultar_analito` -- o comentario dele
 * dizia que nenhuma outra tool devolvia linha. As 20 citacoes eram descartadas
 * no enriquecimento, e a pessoa via os numeros sem origem nenhuma.
 */
describe('indexarLinhasCitaveis -- a consultar_resultados (Bloco 10)', () => {
  const saidaDeResultados = {
    name: 'consultar_resultados',
    output: {
      disponivel: true,
      resultados: [
        {
          id: 'r-7',
          analito: 'Hemoglobina',
          valor: 16.1,
          unidade: 'g/dL',
          dataDaColeta: '2025-10-04',
          documentoId: 'doc-9',
        },
      ],
    },
  };

  it('indexa cada linha que ela devolve', () => {
    expect(indexarLinhasCitaveis([saidaDeResultados]).get('r-7')).toEqual({
      resultId: 'r-7',
      documentId: 'doc-9',
      analyteLabel: 'Hemoglobina',
      value: '16,1',
      unit: 'g/dL',
      collectedAt: '2025-10-04',
    });
  });

  it('as duas tools no mesmo turno somam, e nao se sobrescrevem', () => {
    const indice = indexarLinhasCitaveis([saidaDeAnalito, saidaDeResultados]);
    expect(indice.has('l-1')).toBe(true);
    expect(indice.has('r-7')).toBe(true);
  });

  it('nao quebra com saida fora do formato esperado', () => {
    expect(indexarLinhasCitaveis([{ name: 'consultar_resultados', output: null }]).size).toBe(0);
    expect(indexarLinhasCitaveis([{ name: 'consultar_resultados', output: { resultados: 'x' } }]).size).toBe(0);
  });
});
