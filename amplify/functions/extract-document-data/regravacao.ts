/**
 * Resumo do arquivo:
 * O que uma leitura nova faz com o que a leitura anterior do MESMO documento
 * deixou gravado. Existe por dois defeitos do reprocessamento (Bloco 11):
 *
 * - E1: a gravacao e idempotente pelo id (D22), e reescrever o mesmo id com o
 *   que o modelo leu agora DESFAZIA a correcao que a pessoa fez olhando o papel;
 * - E2: o id inclui o codigo do analito, e a linha lida com codigo LOCAL antes
 *   da ampliacao do catalogo (Bloco 10) e relida com codigo LOINC tinha id
 *   diferente -- as duas ficavam, dois pontos na serie.
 *
 * O principio e o do resto da extracao, virado para o lado de apagar: NA
 * DUVIDA, NAO APAGA. Linha antiga so sai quando a correspondencia com a nova e
 * inequivoca. O custo de errar para o lado de ficar e um ponto duplicado, que
 * se ve; o de errar para o lado de apagar e um resultado sumido, que nao se ve.
 *
 * Linha antiga que nao reaparece na leitura nova FICA: a omissao do modelo e
 * instavel (47, 47, 42, 47 linhas do mesmo laudo), e a segunda passagem SOMA.
 *
 * Modulo PURO: sem AWS, sem I/O.
 */
import { REVIEW_STATUS, type ReviewStatus } from '../../data/schemas/extractionEnums';

import { findAnalyteByCode } from './analyteCatalog';
import { isLocalAnalyteCode, localAnalyteCode } from './localAnalyteCode';
import type { LabResultRow } from './resultWriteBuilder';

/** O que a leitura anterior deixou, com o que importa para decidir. */
export type LinhaExistente = {
  id: string;
  analyteCode: string;
  projectLabel: string;
  collectionMoment: string | null;
  value: number | null;
  valueQualifier: '<' | '>' | null;
  unit: string | null;
  reviewStatus: ReviewStatus;
  correctedAt: string | null;
};

/**
 * A linha nova e o rotulo COMO ESTAVA NO PAPEL. O rotulo precisa vir junto
 * porque a linha de catalogo o perde: `analyteLabel` vira o nome do LOINC. E
 * ele que liga a linha nova ao codigo local que a leitura antiga derivou dele.
 */
export type LinhaNova = { linha: LabResultRow; rotuloDoPapel: string };

export type PlanoDeRegravacao = {
  /** Na ordem em que chegaram, ja com o que a pessoa conferiu preservado. */
  gravar: LabResultRow[];
  /** Ids das linhas de codigo local substituidas. Apagar DEPOIS de gravar. */
  apagar: string[];
  avisos: string[];
  preservadas: number;
  substituidas: number;
};

const CONFERIDA: ReviewStatus = 'CONFIRMADO_PELO_USUARIO';

const momento = (m: string | null | undefined): string => (m ?? '').trim();

/**
 * Todo codigo local que uma leitura antiga PODERIA ter dado a esta linha: o do
 * rotulo do papel, e o de cada nome que o catalogo conhece para o analito. A
 * leitura antiga guardou o rotulo que o modelo escreveu naquele dia, que nem
 * sempre e o de hoje ("VPM" contra "Volume plaquetário Médio (MPV)").
 */
export function codigosLocaisDe(nova: LinhaNova): Set<string> {
  const nomes = [nova.rotuloDoPapel];
  const analito = findAnalyteByCode(nova.linha.analyteCode);
  if (analito) nomes.push(analito.label, analito.projectLabel, ...analito.synonyms);

  const codigos = new Set<string>();
  for (const nome of nomes) {
    const codigo = localAnalyteCode(nome);
    if (codigo) codigos.add(codigo);
  }
  return codigos;
}

/** Os quatro campos que sao da pessoa depois que ela conferiu. */
function comOQueAPessoaConferiu(linha: LabResultRow, conferida: LinhaExistente): LabResultRow {
  return {
    ...linha,
    value: conferida.value,
    valueQualifier: conferida.valueQualifier,
    unit: conferida.unit ?? linha.unit,
    reviewStatus: CONFERIDA,
  };
}

function discorda(linha: LabResultRow, conferida: LinhaExistente): boolean {
  return linha.value !== conferida.value || linha.valueQualifier !== conferida.valueQualifier;
}

function avisoDeDiscordancia(rotulo: string): string {
  return `Você conferiu "${rotulo}" no papel. A leitura nova trouxe outro valor, e mantivemos o que você conferiu.`;
}

/**
 * As substituicoes 1 para 1: indice da linha nova -> linha antiga. Uma antiga
 * casada com duas novas (o "Neutr" do absoluto e do percentual) ou uma nova
 * casada com duas antigas nao entra -- nao ha como saber qual e qual.
 */
function substituicoes(existentes: LinhaExistente[], novas: LinhaNova[]): Map<number, LinhaExistente> {
  const idsNovos = new Set(novas.map((n) => n.linha.id));
  const locais = existentes.filter(
    (e) => isLocalAnalyteCode(e.analyteCode) && !idsNovos.has(e.id),
  );

  const casamentos: Array<[number, LinhaExistente]> = [];
  novas.forEach((nova, indice) => {
    if (isLocalAnalyteCode(nova.linha.analyteCode)) return;
    const codigos = codigosLocaisDe(nova);
    for (const antiga of locais) {
      if (
        momento(antiga.collectionMoment) === momento(nova.linha.collectionMoment) &&
        codigos.has(antiga.analyteCode)
      ) {
        casamentos.push([indice, antiga]);
      }
    }
  });

  const contar = <T>(chaves: T[]) =>
    chaves.reduce((m, c) => m.set(c, (m.get(c) ?? 0) + 1), new Map<T, number>());
  const porNova = contar(casamentos.map(([i]) => i));
  const porAntiga = contar(casamentos.map(([, a]) => a.id));

  return new Map(
    casamentos.filter(([i, a]) => porNova.get(i) === 1 && porAntiga.get(a.id) === 1),
  );
}

export function planejarRegravacao(
  existentes: LinhaExistente[],
  novas: LinhaNova[],
): PlanoDeRegravacao {
  const porId = new Map(existentes.map((e) => [e.id, e]));
  const trocas = substituicoes(existentes, novas);

  const avisos: string[] = [];
  let preservadas = 0;

  const gravar = novas.map(({ linha }, indice) => {
    // Regra 1 -- a mesma linha, ja conferida pela pessoa.
    const mesma = porId.get(linha.id);
    if (mesma?.reviewStatus === CONFERIDA) {
      preservadas += 1;
      if (discorda(linha, mesma)) avisos.push(avisoDeDiscordancia(linha.projectLabel));
      return comOQueAPessoaConferiu(linha, mesma);
    }

    // Regra 2 -- a linha antiga, de codigo local, que esta substitui. A
    // correcao dela vem junto, com a data: foi naquele dia que a pessoa olhou.
    const antiga = trocas.get(indice);
    if (antiga?.reviewStatus === CONFERIDA) {
      if (discorda(linha, antiga)) avisos.push(avisoDeDiscordancia(linha.projectLabel));
      return {
        ...comOQueAPessoaConferiu(linha, antiga),
        ...(antiga.correctedAt ? { correctedAt: antiga.correctedAt } : {}),
      };
    }
    return linha;
  });

  const apagar = [...trocas.values()].map((a) => a.id);
  return { gravar, apagar, avisos, preservadas, substituidas: apagar.length };
}

const texto = (v: unknown): string | null => (typeof v === 'string' ? v : null);

/**
 * O item como o DynamoDB devolve. Atributo removido NAO volta como nulo --
 * volta ausente (a gravacao troca nulo por REMOVE) --, e status que nao e da
 * lista nunca vira "conferida": preservar valor por engano e pior que reescrever.
 */
export function comoLinhaExistente(item: Record<string, unknown>): LinhaExistente | null {
  const id = texto(item.id);
  const analyteCode = texto(item.analyteCode);
  if (!id || !analyteCode) return null;

  const status = REVIEW_STATUS.find((s) => s === item.reviewStatus) ?? 'AUTO';
  const qualificador = item.valueQualifier === '<' || item.valueQualifier === '>' ? item.valueQualifier : null;

  return {
    id,
    analyteCode,
    projectLabel: texto(item.projectLabel) ?? analyteCode,
    collectionMoment: texto(item.collectionMoment),
    value: typeof item.value === 'number' ? item.value : null,
    valueQualifier: qualificador,
    unit: texto(item.unit),
    reviewStatus: status,
    correctedAt: texto(item.correctedAt),
  };
}
