/**
 * Resumo do arquivo:
 * O que `consultar_wearable` acrescenta no E6: a lista das importacoes (6.1) e
 * a analise da tela recortada (D6.2 = A). Modulo puro -- quem le e
 * `wearable.ts`.
 *
 * A lista NAO traz medias: cada exportacao do Samsung traz o historico inteiro,
 * e a media de uma importacao e quase a da outra (D6.3 = A). Quem compara e
 * `consultar_wearable_dias`, entre periodos de dias.
 *
 * Da analise, que e texto de outra IA, vao o resumo e os TITULOS -- o que a
 * pessoa reconhece da tela -- e as contagens do resto. O texto das sugestoes
 * nao vai: o modelo o devolveria como orientacao dele. Os avisos de leitura vao
 * so como contagem, como os do E4.
 */
import { dataEmSaoPaulo } from '../formatoPtBr';
import { caminhoDaTela } from '../mapaDoApp';
import { maisRecentePrimeiro, texto, type LinhaDoBanco } from './ownerScopedRead';
import { diaValido } from './serieDiaria';

export const MAX_IMPORTACOES_LISTADAS = 5;

export type ItemDaImportacao = {
  importadaEm: string | null;
  situacao: 'pronta' | 'em processamento' | 'não concluiu' | 'não pôde ser lida';
  periodo: { inicio: string; fim: string } | null;
};

/**
 * O resumo da importacao (`metricsJson`), ou `{ ok: false }` se ele nao puder
 * ser lido. Sem `metricsJson` e resumo vazio, e nao ilegivel. Um criterio so
 * para `consultar_wearable` e para a lista: as duas nao podem se contradizer.
 */
export function lerMetricas(linha: LinhaDoBanco): { ok: true; valor: unknown } | { ok: false } {
  try {
    return { ok: true, valor: JSON.parse(String(linha.metricsJson ?? '{}')) };
  } catch {
    return { ok: false };
  }
}

/**
 * O periodo da importacao, so com datas que existem. Vem de uma linha que o
 * dono pode editar, e uma data impossivel faria as contas de dias lancarem.
 * Um ponto so para quem faz conta com o periodo (os dias e a comparacao).
 */
export function periodoDaImportacao(linha: LinhaDoBanco): { inicio: string; fim: string } | null {
  const inicio = texto(linha.periodStart);
  const fim = texto(linha.periodEnd);
  return inicio && fim && diaValido(inicio) && diaValido(fim) ? { inicio, fim } : null;
}

function situacao(linha: LinhaDoBanco): ItemDaImportacao['situacao'] {
  if (linha.status === 'READY') return lerMetricas(linha).ok ? 'pronta' : 'não pôde ser lida';
  if (linha.status === 'FAILED') return 'não concluiu';
  // PENDING, PROCESSING e nulo: o cliente trata nulo como PENDING (schema).
  return 'em processamento';
}

export function listarImportacoes(linhas: LinhaDoBanco[]): {
  importacoes: ItemDaImportacao[];
  importacoesOmitidas: number;
} {
  const ordenadas = maisRecentePrimeiro(linhas, 'createdAt');
  const importacoes = ordenadas.slice(0, MAX_IMPORTACOES_LISTADAS).map((l): ItemDaImportacao => {
    const inicio = texto(l.periodStart);
    const fim = texto(l.periodEnd);
    return {
      importadaEm: dataDaImportacao(l.createdAt),
      situacao: situacao(l),
      periodo: inicio && fim ? { inicio, fim } : null,
    };
  });
  return { importacoes, importacoesOmitidas: ordenadas.length - importacoes.length };
}

/** O dia em Brasilia: `createdAt` e UTC, e uma importacao feita as 22h sairia
 *  no dia seguinte. */
export function dataDaImportacao(valor: unknown): string | null {
  const instante = Date.parse(texto(valor) ?? '');
  return Number.isFinite(instante) ? dataEmSaoPaulo(new Date(instante)) : null;
}

/**
 * Tetos do texto da analise. O resumo da tela vai ate 600 caracteres e as
 * limitacoes ate 1.400 (um export real chegou perto disso): sem teto, o
 * acrescimo passaria do que a spec promete (abaixo de 500 tokens). O resto
 * esta na tela, e `textoCortado` diz isso ao modelo.
 */
const MAX_RESUMO = 300;
const MAX_LIMITACOES = 200;
const MAX_TITULO = 60;

export type AnaliseDaTela = {
  resumo: string;
  destaques: string[];
  pontosDeAtencao: string[];
  padroes: string[];
  limitacoes: string | null;
  /** Algum texto acima foi cortado: o inteiro esta na tela. */
  textoCortado: boolean;
  sugestoes: number;
  perguntasParaOMedico: number;
  avisosDeLeitura: number;
  ondeVer: string;
};

const lista = (valor: unknown): Record<string, unknown>[] =>
  Array.isArray(valor) ? valor.filter((v) => v && typeof v === 'object') : [];

const titulos = (valor: unknown, campo: string): string[] =>
  lista(valor).flatMap((item) => texto(item[campo]) ?? []);

/** Corta e anota se cortou, para o modelo nao tratar o trecho como o todo. */
function comTeto(valor: string, teto: number, cortes: { houve: boolean }): string {
  if (valor.length > teto) cortes.houve = true;
  return valor.slice(0, teto);
}

/** A analise da tela recortada, ou `null` se ela nao puder ser lida. */
export function analiseDaTela(insightsJson: unknown, warnings: unknown): AnaliseDaTela | null {
  let analise: Record<string, unknown>;
  try {
    analise = JSON.parse(String(insightsJson ?? ''));
  } catch {
    return null;
  }
  const resumo = texto(analise?.resumo);
  if (!resumo) return null;

  const cortes = { houve: false };
  const cortados = (valor: unknown, campo: string) =>
    titulos(valor, campo).map((t) => comTeto(t, MAX_TITULO, cortes));
  const limitacoes = texto(analise.limitacoes);

  return {
    resumo: comTeto(resumo, MAX_RESUMO, cortes),
    destaques: cortados(analise.destaques, 'metrica'),
    pontosDeAtencao: cortados(analise.pontosDeAtencao, 'titulo'),
    padroes: cortados(analise.padroes, 'titulo'),
    limitacoes: limitacoes === null ? null : comTeto(limitacoes, MAX_LIMITACOES, cortes),
    textoCortado: cortes.houve,
    sugestoes: lista(analise.sugestoes).length,
    perguntasParaOMedico: Array.isArray(analise.perguntasParaOMedico) ? analise.perguntasParaOMedico.length : 0,
    avisosDeLeitura: Array.isArray(warnings) ? warnings.length : 0,
    ondeVer: caminhoDaTela('health-data'),
  };
}
