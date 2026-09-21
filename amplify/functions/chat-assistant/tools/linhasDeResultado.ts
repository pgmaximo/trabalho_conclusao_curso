/**
 * Resumo do arquivo:
 * A linha de resultado como as tools a enxergam, e as regras de exclusao que a
 * EPIC de serie definiu.
 *
 * EXTRAIDO de `analitos.ts` em 2026-09-19 (U5), quando a tool
 * `consultar_resultados` passou a precisar das mesmas regras. Uma segunda
 * implementacao divergiria da primeira em silencio, e a divergencia apareceria
 * para a pessoa como o MESMO exame contado de dois jeitos -- um na tela de
 * serie, outro na conversa.
 *
 * Refatoracao pura: nenhuma regra mudou ao sair daqui, e as suites de
 * `analitosTool.test.ts` estavam verdes antes e depois.
 */
import { texto } from './ownerScopedRead';

export const MOTIVOS_DE_EXCLUSAO = {
  'pendente-de-revisao': 'aguarda conferência do usuário',
  'sem-valor': 'não pôde ser lido com segurança',
  'limite-de-deteccao': 'o laboratório informou um limite, não uma medida',
  'unidade-divergente': 'está em outra unidade de medida',
  'sem-data': 'está sem a data da coleta',
} as const;

export type MotivoDeExclusao = keyof typeof MOTIVOS_DE_EXCLUSAO;

export type LinhaDeResultado = {
  id: string;
  documentId: string;
  analyteCode: string;
  projectLabel: string | null;
  analyteLabel: string | null;
  value: number | null;
  valueQualifier: string | null;
  unit: string | null;
  rawValue: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  /** A faixa como o laudo a escreveu, quando ela nao e um par de numeros --
   *  tabela por risco, por idade, por sexo. Vem na unidade do PAPEL e nunca
   *  foi convertida (Bloco 9, decisao E3). */
  rawReferenceText: string | null;
  collectedAt: string | null;
  collectionMoment: string | null;
  reviewStatus: string | null;
};

export function numero(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

export function comoLinha(bruta: Record<string, unknown>): LinhaDeResultado {
  return {
    id: String(bruta.id ?? ''),
    documentId: String(bruta.documentId ?? ''),
    analyteCode: String(bruta.analyteCode ?? ''),
    projectLabel: texto(bruta.projectLabel),
    analyteLabel: texto(bruta.analyteLabel),
    value: numero(bruta.value),
    valueQualifier: texto(bruta.valueQualifier),
    unit: texto(bruta.unit),
    rawValue: texto(bruta.rawValue),
    referenceLow: numero(bruta.referenceLow),
    referenceHigh: numero(bruta.referenceHigh),
    rawReferenceText: texto(bruta.rawReferenceText),
    collectedAt: texto(bruta.collectedAt),
    collectionMoment: texto(bruta.collectionMoment),
    reviewStatus: texto(bruta.reviewStatus),
  };
}

/**
 * A unidade da serie e a da coleta COMPARAVEL mais ANTIGA -- a mesma regra da
 * EPIC de serie, e pela mesma razao: a unidade da serie e a lingua que ela
 * sempre falou, e uma coleta nova em outra unidade e a anomalia. O contrario
 * faria uma unica coleta nova expulsar o historico inteiro.
 */
export function unidadeDaSerie(linhas: LinhaDeResultado[]): string {
  const comparaveis = linhas
    .filter((l) => l.unit && l.value !== null && l.reviewStatus !== 'PENDENTE_DE_REVISAO')
    .sort((a, b) => (a.collectedAt ?? '9999').localeCompare(b.collectedAt ?? '9999'));
  return comparaveis[0]?.unit ?? linhas[0]?.unit ?? '';
}

/** A ORDEM e a mesma da EPIC de serie, e cada degrau dela e uma decisao. */
export function motivoDaExclusao(
  linha: LinhaDeResultado,
  unidade: string,
): MotivoDeExclusao | null {
  if (linha.reviewStatus === 'PENDENTE_DE_REVISAO') return 'pendente-de-revisao';
  if (linha.value === null) return 'sem-valor';
  if (linha.valueQualifier) return 'limite-de-deteccao';
  if (linha.unit !== unidade) return 'unidade-divergente';
  if (!linha.collectedAt) return 'sem-data';
  return null;
}

/**
 * A exclusao para quem NAO compara ao longo do tempo.
 *
 * `consultar_resultados` lista o que um documento trouxe, e nao uma serie:
 * duas coletas do mesmo dia em unidades diferentes nao atrapalham ninguem
 * porque nao ha traco a desenhar. Entao `unidade-divergente` e `sem-data`
 * saem, e o resto fica -- linha pendente continua fora, e limite de deteccao
 * continua sendo limite e nao medida.
 */
export function motivoDeExclusaoPontual(linha: LinhaDeResultado): MotivoDeExclusao | null {
  if (linha.reviewStatus === 'PENDENTE_DE_REVISAO') return 'pendente-de-revisao';
  if (linha.value === null) return 'sem-valor';
  if (linha.valueQualifier) return 'limite-de-deteccao';
  return null;
}
