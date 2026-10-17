/**
 * A saida que `consultar_prevencao` entrega ao modelo (E7, CA-10, CA-11 e
 * CA-12). Ela e PURA de proposito: ordenar, cortar e contar sao as tres
 * decisoes que fazem a resposta ser honesta sobre o tamanho da lista, e
 * testa-las sem rede nem banco e o que permite afirmar cada uma com numero.
 */
import type {
  UspstfDataset,
  UspstfSpecificRecommendation,
} from '../../uspstf-shared/uspstfClient';
import {
  MAX_CARACTERES_TEXTO,
  MAX_RECOMENDACOES,
  montarSaida,
} from '../tools/prevencaoSaida';

const TODOS_OS_FILTROS = { idade: true as const, sexo: true, imc: true };

function rec(
  id: number,
  grade: string,
  extra: Partial<UspstfSpecificRecommendation> = {},
): UspstfSpecificRecommendation {
  return { id, title: `Recomendacao ${id}`, grade, gradeVer: 0, text: `Texto ${id}`, ...extra };
}

const DATASET: UspstfDataset = {
  specificRecommendations: [],
  grades: { A: ['Recomenda, com alta certeza.'], B: ['Recomenda.'], D: ['Recomenda contra.'] },
  generalRecommendations: { '7': { topic: 'Colorectal Cancer', topicYear: '2021' } },
  lastUpdated: '2026-01-15',
};

describe('montarSaida', () => {
  it('os tetos sao 12 itens e 400 caracteres', () => {
    expect(MAX_RECOMENDACOES).toBe(12);
    expect(MAX_CARACTERES_TEXTO).toBe(400);
  });

  it('com 15 que casam, entrega 12 e conta as 3 que ficaram de fora', () => {
    const casam = Array.from({ length: 15 }, (_, i) => rec(i + 1, 'B'));

    const saida = montarSaida(DATASET, casam, TODOS_OS_FILTROS);

    expect(saida.recomendacoes).toHaveLength(12);
    expect(saida.totalQueCasam).toBe(15);
    expect(saida.omitidas).toBe(3);
  });

  it('dentro do teto, nada fica de fora', () => {
    const saida = montarSaida(DATASET, [rec(1, 'A'), rec(2, 'B')], TODOS_OS_FILTROS);

    expect(saida.omitidas).toBe(0);
    expect(saida.totalQueCasam).toBe(2);
  });

  it('ordena por nota -- A, B, D, C, I, e a desconhecida por ultimo', () => {
    // D ("recomenda contra") vem logo depois de A e B: e informacao de
    // seguranca, e o teto nao pode corta-la antes das demais (achado da
    // revisao do E7, 2026-10-17).
    const casam = ['I', 'B', 'X', 'A', 'D', 'C'].map((nota, i) => rec(i + 1, nota));

    const notas = montarSaida(DATASET, casam, TODOS_OS_FILTROS).recomendacoes.map((r) => r.nota);

    expect(notas).toEqual(['A', 'B', 'D', 'C', 'I', 'X']);
  });

  it('a ordem e estavel dentro da mesma nota', () => {
    const casam = [rec(1, 'B'), rec(2, 'A'), rec(3, 'B')];

    const titulos = montarSaida(DATASET, casam, TODOS_OS_FILTROS).recomendacoes.map((r) => r.titulo);

    expect(titulos).toEqual(['Recomendacao 2', 'Recomendacao 1', 'Recomendacao 3']);
  });

  it('com a lista cheia, uma nota D nao e a primeira a ser cortada', () => {
    const casam = [...Array.from({ length: 12 }, (_, i) => rec(i + 1, 'C')), rec(99, 'D')];

    const notas = montarSaida(DATASET, casam, TODOS_OS_FILTROS).recomendacoes.map((r) => r.nota);

    expect(notas).toContain('D');
  });

  it('marca o texto cortado, para o modelo nao o adaptar como se fosse inteiro', () => {
    const saida = montarSaida(
      DATASET,
      [rec(1, 'A', { text: 'a'.repeat(1000) }), rec(2, 'A')],
      TODOS_OS_FILTROS,
    );

    expect(saida.recomendacoes[0].textoCortado).toBe(true);
    expect(saida.recomendacoes[1].textoCortado).toBe(false);
  });

  it('o corte prioriza as notas A e B: uma A no fim da lista entra', () => {
    const casam = [...Array.from({ length: 12 }, (_, i) => rec(i + 1, 'I')), rec(99, 'A')];

    const saida = montarSaida(DATASET, casam, TODOS_OS_FILTROS);

    expect(saida.recomendacoes[0].titulo).toBe('Recomendacao 99');
  });

  it('texto longo e cortado em 400 caracteres e termina em reticencias', () => {
    const saida = montarSaida(DATASET, [rec(1, 'A', { text: 'a'.repeat(1000) })], TODOS_OS_FILTROS);

    const texto = saida.recomendacoes[0].texto;
    expect(texto).toHaveLength(400);
    expect(texto.endsWith('…')).toBe(true);
  });

  it('texto de exatamente 400 caracteres sai inteiro, sem reticencias', () => {
    const exato = 'b'.repeat(400);

    const saida = montarSaida(DATASET, [rec(1, 'A', { text: exato })], TODOS_OS_FILTROS);

    expect(saida.recomendacoes[0].texto).toBe(exato);
  });

  it('nao entrega justificativa, id nem traducao', () => {
    const casam = [rec(1, 'A', { rationale: 'Justificativa longa.', general: '7' })];

    const serializada = JSON.stringify(montarSaida(DATASET, casam, TODOS_OS_FILTROS));

    expect(serializada).not.toMatch(/"rationale"|"id"|"titlePt"|"textPt"|Justificativa longa/);
  });

  it('o significado da nota vem da fonte, e nunca some quando falta', () => {
    const saida = montarSaida(DATASET, [rec(1, 'D'), rec(2, 'I')], TODOS_OS_FILTROS);

    expect(saida.recomendacoes[0].significadoDaNota).toBe('Recomenda contra.');
    expect(saida.recomendacoes[1].significadoDaNota).toBe(
      'A fonte não informou o significado desta nota.',
    );
  });

  it('ano e tema vem da recomendacao geral; sem ela, ficam nulos', () => {
    const saida = montarSaida(
      DATASET,
      [rec(1, 'A', { general: '7' }), rec(2, 'A')],
      TODOS_OS_FILTROS,
    );

    expect(saida.recomendacoes[0]).toMatchObject({ ano: '2021', tema: 'Colorectal Cancer' });
    expect(saida.recomendacoes[1]).toMatchObject({ ano: null, tema: null });
  });

  it('faixa etaria, sexo e IMC da recomendacao; ausentes viram nulo', () => {
    const casam = [
      rec(1, 'A', { ageRange: [45, 75], sex: 'men and women', bmi: 'OB' }),
      rec(2, 'A'),
    ];

    const [com, sem] = montarSaida(DATASET, casam, TODOS_OS_FILTROS).recomendacoes;

    expect(com).toMatchObject({ faixaEtaria: { de: 45, ate: 75 }, sexo: 'men and women', imc: 'OB' });
    expect(sem).toMatchObject({ faixaEtaria: null, sexo: null, imc: null });
  });

  it('repassa os filtros aplicados, a fonte e a data de atualizacao', () => {
    const filtros = { idade: true as const, sexo: false, imc: false };

    const saida = montarSaida(DATASET, [rec(1, 'A')], filtros);

    expect(saida).toMatchObject({
      disponivel: true,
      fonte: 'USPSTF',
      atualizadoEm: '2026-01-15',
      filtrosAplicados: filtros,
    });
  });

  it('sem data de atualizacao no dataset, atualizadoEm e nulo', () => {
    const { lastUpdated: _, ...semData } = DATASET;

    expect(montarSaida(semData, [rec(1, 'A')], TODOS_OS_FILTROS).atualizadoEm).toBeNull();
  });
});
