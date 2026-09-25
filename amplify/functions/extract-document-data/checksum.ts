/**
 * Resumo do arquivo:
 * O que torna o reprocessamento idempotente. O id de uma linha de analito e
 * derivado do conteudo, nao sorteado -- entao reenviar o mesmo PDF reescreve
 * as mesmas linhas em vez de criar linhas novas, e a gravacao pode usar
 * UpdateCommand sem nenhuma consulta previa.
 *
 * Este arquivo usa `node:crypto` e por isso NAO pode ser importado pelo
 * aplicativo (ver D30). O unico modulo compartilhado e o numberParser.
 */
import { createHash } from 'node:crypto';

export function fileChecksum(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Separador que nao aparece em nenhum dos quatro componentes: codigo LOINC e
 * digito e hifen, id do Amplify e uuid, a soma e hexadecimal, e o momento da
 * coleta e texto do laudo. Usar "|" evitaria colisao por concatenacao
 * ("ab"+"c" vs "a"+"bc"), mas o momento da coleta vem do papel e um dia
 * PODERIA conter "|" -- por isso o campo tambem entra com o proprio tamanho.
 */
const SEP = String.fromCharCode(31); // US -- unit separator

/**
 * QUATRO componentes, e o quarto entrou na revisao de 2026-09-16. Sem ele,
 * curva glicemica (jejum / 60 / 120 minutos) e cortisol de manha e tarde
 * colidem, e o UpdateCommand sobrescreve SEM LEVANTAR ERRO: sobraria uma
 * linha e as outras sumiriam caladas (D22).
 *
 * Momento ausente e momento vazio sao o MESMO id -- laudo com um valor so nao
 * pode gerar id diferente conforme o modelo devolva null ou "".
 */
export function labResultId(
  documentId: string,
  checksum: string,
  analyteCode: string,
  collectionMoment: string | null,
): string {
  const momento = (collectionMoment ?? '').trim();
  const partes = [documentId, checksum, analyteCode, `${momento.length}:${momento}`];
  return createHash('sha256').update(partes.join(SEP)).digest('hex');
}

/** Mesma regra para receita, com o nome do medicamento no lugar do analito. */
export function prescriptionItemId(
  documentId: string,
  checksum: string,
  medicationLabel: string,
  dose: string | null,
): string {
  const remedio = medicationLabel.trim().toLowerCase();
  const dosagem = (dose ?? '').trim().toLowerCase();
  const partes = [documentId, checksum, `${remedio.length}:${remedio}`, dosagem];
  return createHash('sha256').update(partes.join(SEP)).digest('hex');
}

/**
 * A soma de um documento de varias folhas (Bloco 11, E6): a soma das somas de
 * cada folha, em ordem. Somar as somas, e nao os bytes emendados, e o que faz a
 * fronteira entre folhas contar -- [1,2]+[3] e [1]+[2,3] sao documentos
 * diferentes com os mesmos bytes.
 *
 * UMA folha e a soma do arquivo, sem mudar nada: todo documento gravado antes
 * desta EPIC tem uma folha, e a soma entra no id de cada linha (D22). Mudar a
 * soma dele faria a releitura gerar ids novos e duplicar tudo.
 */
export function somaDasFolhas(folhas: Uint8Array[]): string {
  if (folhas.length === 1) return fileChecksum(folhas[0]);
  return createHash('sha256').update(folhas.map(fileChecksum).join(SEP)).digest('hex');
}
