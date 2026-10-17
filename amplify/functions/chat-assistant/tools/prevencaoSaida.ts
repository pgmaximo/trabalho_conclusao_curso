/**
 * Resumo do arquivo:
 * Monta, a partir das recomendacoes da USPSTF que casaram com o perfil, a
 * saida que `consultar_prevencao` entrega ao modelo (E7). PURO: sem rede, sem
 * banco, sem relogio. Ordenar, cortar e contar sao decisoes que precisam de
 * teste com numero, e aqui elas tem.
 *
 * Tres escolhas que sao contrato, e o risco que cada uma evita:
 * - TETO COM CONTAGEM. Cada recomendacao em ingles custa centenas de tokens no
 *   contexto de todo o laco. A lista e cortada, mas `omitidas` diz quantas
 *   ficaram de fora: uma lista cortada em silencio parece completa.
 * - NOTA D E I NAO SAO ESCONDIDAS. Esconde-las tambem faria a lista parecer
 *   completa. A D ("recomenda contra") vem logo depois de A e B, para o teto
 *   nao corta-la primeiro -- ela e informacao de seguranca --, e todas levam
 *   `significadoDaNota`, que impede o modelo de ler "D" como "faca".
 * - SEM JUSTIFICATIVA NEM TRADUCAO. A justificativa e longa e a tela a mostra;
 *   a traducao e do modelo (D7.2 = A).
 */
import { resolveGeneral, resolveGradeText } from '../../uspstf-shared/uspstfFilter';
import type {
  UspstfDataset,
  UspstfSpecificRecommendation,
} from '../../uspstf-shared/uspstfClient';

export const MAX_RECOMENDACOES = 12;
export const MAX_CARACTERES_TEXTO = 400;

/**
 * Tudo o que o chat sabe sobre as notas, num lugar so: a ORDEM (de
 * apresentacao, e portanto do corte) e o SENTIDO em uma linha, que o modo
 * degradado mostra ao lado da letra. Nota fora da tabela vai para o fim e sai
 * so com a letra.
 */
const NOTAS: Array<{ nota: string; sentido: string }> = [
  { nota: 'A', sentido: 'a fonte recomenda' },
  { nota: 'B', sentido: 'a fonte recomenda' },
  { nota: 'D', sentido: 'a fonte recomenda não fazer' },
  { nota: 'C', sentido: 'a fonte recomenda oferecer conforme o caso' },
  { nota: 'I', sentido: 'a fonte considera a evidência insuficiente' },
];

/** "Nota D (a fonte recomenda não fazer)" -- sem o sentido, "Nota D" sob o
 *  titulo "Recomendacoes" seria lida como conselho de fazer. */
export function rotuloDaNota(nota: string): string {
  const sentido = NOTAS.find((n) => n.nota === nota)?.sentido;
  return sentido ? `Nota ${nota} (${sentido})` : `Nota ${nota}`;
}

const SIGNIFICADO_AUSENTE = 'A fonte não informou o significado desta nota.';

export type RecomendacaoParaOModelo = {
  nota: string;
  significadoDaNota: string;
  titulo: string;
  texto: string;
  /** O texto foi cortado no teto. O modelo precisa saber, para nao adaptar
   *  um trecho como se fosse a recomendacao inteira. */
  textoCortado: boolean;
  ano: string | null;
  tema: string | null;
  faixaEtaria: { de: number; ate: number } | null;
  sexo: string | null;
  imc: string | null;
};

export type FiltrosAplicados = { idade: true; sexo: boolean; imc: boolean };

export type SaidaPrevencao = {
  disponivel: true;
  fonte: 'USPSTF';
  atualizadoEm: string | null;
  totalQueCasam: number;
  omitidas: number;
  /** Diz ao modelo quais dimensoes do perfil filtraram a lista. Falso aqui
   *  significa que a lista pode trazer recomendacoes de outros grupos. */
  filtrosAplicados: FiltrosAplicados;
  recomendacoes: RecomendacaoParaOModelo[];
};

function posicaoDaNota(nota: string): number {
  const posicao = NOTAS.findIndex((n) => n.nota === nota);
  return posicao === -1 ? NOTAS.length : posicao;
}

function cortar(texto: string): string {
  if (texto.length <= MAX_CARACTERES_TEXTO) return texto;
  return `${texto.slice(0, MAX_CARACTERES_TEXTO - 1)}…`;
}

function paraOModelo(
  dataset: UspstfDataset,
  rec: UspstfSpecificRecommendation,
): RecomendacaoParaOModelo {
  const geral = resolveGeneral(dataset, rec.general);
  const original = rec.text ?? '';
  return {
    nota: rec.grade,
    significadoDaNota: resolveGradeText(dataset, rec.grade, rec.gradeVer) || SIGNIFICADO_AUSENTE,
    titulo: rec.title,
    texto: cortar(original),
    textoCortado: original.length > MAX_CARACTERES_TEXTO,
    ano: geral?.topicYear ?? null,
    tema: geral?.topic ?? null,
    faixaEtaria: rec.ageRange ? { de: rec.ageRange[0], ate: rec.ageRange[1] } : null,
    sexo: rec.sex ?? null,
    imc: rec.bmi ?? null,
  };
}

export function montarSaida(
  dataset: UspstfDataset,
  casam: UspstfSpecificRecommendation[],
  filtros: FiltrosAplicados,
): SaidaPrevencao {
  // `sort` e estavel desde o ES2019: dentro da mesma nota, fica a ordem da
  // fonte, e ha teste para isso.
  const ordenadas = [...casam].sort((a, b) => posicaoDaNota(a.grade) - posicaoDaNota(b.grade));

  const entregues = ordenadas.slice(0, MAX_RECOMENDACOES);

  return {
    disponivel: true,
    fonte: 'USPSTF',
    atualizadoEm: dataset.lastUpdated || null,
    totalQueCasam: casam.length,
    omitidas: casam.length - entregues.length,
    filtrosAplicados: filtros,
    recomendacoes: entregues.map((rec) => paraOModelo(dataset, rec)),
  };
}
