// Fonte unica de verdade dos enums da extracao, importada pelo schema
// (medical-documents.ts) e pela Lambda extract-document-data, que escreve
// estes campos DIRETO no DynamoDB. Mesma razao de healthImportEnums.ts: se a
// Lambda gravar "succeeded" onde o enum diz "SUCCEEDED", o AppSync falha a
// serializacao e o campo volta nulo pro cliente, sem erro.
export const EXTRACTION_STATUS = [
  'PENDING', // documento gravado, extracao ainda nao disparada
  'PROCESSING', // a Lambda esta rodando
  'SUCCEEDED', // concluiu e gravou pelo menos uma linha
  'NO_RESULTS', // concluiu e NAO havia valor acompanhavel. Nao e falha.
  'FAILED', // nao concluiu
] as const;
export type ExtractionStatus = (typeof EXTRACTION_STATUS)[number];

/**
 * Um documento em PROCESSING ha mais do que isto esta travado, nao rodando: a
 * extract-document-data tem teto de 10 minutos, entao o que passa disso e resto
 * de uma execucao que morreu sem marcar FAILED. Mora aqui, e nao no handler da
 * start-document-extraction, porque o chat (E4) diz "demorando" pela MESMA
 * janela que deixa reprocessar -- duas janelas fariam o chat dizer "lendo" de
 * um documento que o botao ja trata como travado.
 */
export const JANELA_DE_TRAVAMENTO_MS = 11 * 60 * 1000;

/** Passou da janela? A REGRA, e nao so o numero, e uma so: com a constante
 *  compartilhada e a comparacao em cada lado, a Lambda usava `<` e o chat `>`,
 *  e no instante exato das 11 min um dizia "pode reprocessar" e o outro
 *  "lendo". Sem inicio (`null`), nao passou: quem chama decide o que isso quer
 *  dizer para ele. */
export function passouDaJanelaDeTravamento(inicioMs: number | null, agoraMs: number): boolean {
  return inicioMs !== null && agoraMs - inicioMs > JANELA_DE_TRAVAMENTO_MS;
}

export const REVIEW_STATUS = [
  'AUTO', // leitura aceita pela pipeline
  'PENDENTE_DE_REVISAO', // nao participa de comparacao ate ser confirmada
  'CONFIRMADO_PELO_USUARIO', // uma pessoa olhou o papel e disse que esta certo
] as const;
export type ReviewStatus = (typeof REVIEW_STATUS)[number];
