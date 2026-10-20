/**
 * Resumo do arquivo:
 * Se o aplicativo ja leu um documento, em linguagem simples (E4, 4.2). Uma
 * regra so, usada por `consultar_exames` e `consultar_receitas`: uma copia em
 * cada ferramenta acabaria dizendo "lendo" numa e "travado" na outra sobre o
 * mesmo documento.
 *
 * Os estados sao os de `EXTRACTION_STATUS`, e nao os do PRD (que citava READY,
 * do enum do wearable). Valor fora da lista vira `desconhecida`, e nao
 * "nunca lido": dizer que um documento nunca foi lido quando o banco diz outra
 * coisa e afirmar o que nao se sabe.
 *
 * O que NAO sai daqui, de proposito:
 * - o texto de `extractionWarnings`. Parte dele e escrita pelo modelo de
 *   extracao a partir do papel (achado A4), e papel e dado de terceiro, que
 *   pode trazer instrucao plantada. Sai so a contagem;
 * - `extractionError` que nao seja frase da lista fechada (`motivoDeFalha.ts`):
 *   documento que falhou antes dela pode ter texto tecnico gravado ali;
 * - prazo. A tela diz "leva alguns minutos"; o chat nao promete (PRD 4.2),
 *   nem pela frase da falha generica (ver `MOTIVOS_QUE_SAEM`).
 *
 * Modulo PURO: `agora` vem por parametro, para o travado ser testavel.
 */
import { EXTRACTION_STATUS, passouDaJanelaDeTravamento, type ExtractionStatus } from '../../../data/schemas/extractionEnums';
import { COPY_DA_FALHA } from '../../extract-document-data/motivoDeFalha';
import { texto, type LinhaDoBanco } from './ownerScopedRead';

export type SituacaoDaLeitura =
  | 'nunca_lido'
  | 'na_fila'
  | 'lendo'
  | 'demorando'
  | 'lido'
  | 'sem_valores'
  | 'falhou'
  | 'desconhecida';

export type LeituraDoDocumento = {
  situacao: SituacaoDaLeitura;
  /** So em `falhou`, e so quando o texto gravado e frase da lista fechada. */
  motivoDaFalha?: string;
  /** So quando a leitura deixou avisos. O texto deles fica na tela. */
  avisosDaLeitura?: number;
};

/** Dita uma vez por saida, e nao por documento: repetir em cada linha so
 *  gastaria contexto. As palavras sao as da tela do documento. */
export const EXPLICACAO_DA_LEITURA =
  'leitura.situacao diz se o aplicativo já leu o documento. nunca_lido: o aplicativo ainda não leu este documento; na tela do documento há o botão Ler agora. na_fila e lendo: a leitura está em andamento. demorando: a leitura está demorando mais do que o normal, e a tela do documento pode ainda mostrar que está lendo. lido: a leitura terminou. sem_valores: o documento não tem valores acompanháveis, como laudos descritivos, culturas e sorologias; numa receita, sem_valores quer dizer que nenhum remédio foi lido; o arquivo continua guardado. falhou: a leitura não deu certo. Se o documento ainda traz itens ou valores, eles são da leitura anterior e continuam guardados; se vier motivoDaFalha, repita-o, porque ele diz o que fazer; se não vier, diga que na tela do documento há o botão Tentar de novo. desconhecida: não se sabe a situação. avisosDaLeitura conta o que a leitura não conseguiu ler; o que ficou de fora aparece na tela do documento. Nunca diga quanto tempo a leitura vai levar.';

/** Palavra de prazo (CA-13). Exportada para os testes afirmarem a MESMA lista
 *  que filtra os motivos abaixo. */
export const PROMETE_PRAZO = /(?<![\wÀ-ÿ])(minutos?|logo|em breve|horas?|amanhã)(?![\wÀ-ÿ])/i;

/** As frases da lista fechada (`motivoDeFalha.ts`) que o chat pode repetir,
 *  montadas uma vez. A da falha generica diz "tente de novo em alguns
 *  minutos"; repetida pelo chat, vira promessa de tempo, que o PRD 4.2 proibe.
 *  Ela fica de fora, e a explicacao manda ao botao Tentar de novo. Texto fora
 *  da lista (erro tecnico gravado antes dela) tambem nao sai. */
const MOTIVOS_QUE_SAEM = new Set<unknown>(Object.values(COPY_DA_FALHA).filter((c) => !PROMETE_PRAZO.test(c)));

const FINAIS: Partial<Record<ExtractionStatus, SituacaoDaLeitura>> = {
  SUCCEEDED: 'lido',
  NO_RESULTS: 'sem_valores',
  FAILED: 'falhou',
};

function ehEstado(valor: unknown): valor is ExtractionStatus {
  return (EXTRACTION_STATUS as readonly unknown[]).includes(valor);
}

/** A primeira das datas que se le. Data ausente ou ilegivel e pulada. */
function primeiraData(...datas: unknown[]): number | null {
  for (const data of datas) {
    const ms = typeof data === 'string' ? Date.parse(data) : NaN;
    if (!Number.isNaN(ms)) return ms;
  }
  return null;
}

/** Sem data que se leia, "nao passou": sem saber quando comecou, dizer
 *  "demorando" seria chute. */
function passouDaJanela(inicio: number | null, agora: Date): boolean {
  return passouDaJanelaDeTravamento(inicio, agora.getTime());
}

function situacaoDe(doc: LinhaDoBanco, agora: Date): SituacaoDaLeitura {
  const estado = doc.extractionStatus;
  if (estado === null || estado === undefined) return 'nunca_lido';
  if (!ehEstado(estado)) return 'desconhecida';
  if (estado === 'PROCESSING') {
    return passouDaJanela(primeiraData(doc.extractionStartedAt), agora) ? 'demorando' : 'lendo';
  }
  if (estado === 'PENDING') {
    // Nenhum fluxo atual grava PENDING com inicio (a Lambda de inicio marca
    // PROCESSING direto). Sem o `createdAt`, um documento esquecido na fila
    // ficaria "na fila" para sempre (plan.md, secao 8). Inicio vazio ou
    // ilegivel cai para a criacao, e nao para "na fila" (revisao do E4).
    return passouDaJanela(primeiraData(doc.extractionStartedAt, doc.createdAt), agora) ? 'demorando' : 'na_fila';
  }
  return FINAIS[estado] ?? 'desconhecida';
}

function contarAvisos(avisos: unknown): number {
  if (!Array.isArray(avisos)) return 0;
  return avisos.filter((a) => texto(a) !== null).length;
}

export function leituraDoDocumento(doc: LinhaDoBanco, agora: Date): LeituraDoDocumento {
  const situacao = situacaoDe(doc, agora);
  const avisos = contarAvisos(doc.extractionWarnings);
  const motivo = doc.extractionError;
  return {
    situacao,
    ...(situacao === 'falhou' && MOTIVOS_QUE_SAEM.has(motivo) ? { motivoDaFalha: motivo as string } : {}),
    ...(avisos > 0 ? { avisosDaLeitura: avisos } : {}),
  };
}
