/**
 * Resumo do arquivo:
 * A parte PURA da gravacao: montar o comando de escrita e decidir o que pode
 * ser gravado. Separado de resultRepository.ts pela mesma razao que
 * formatoDoArquivo.ts e separado do handler -- nenhum teste deste
 * repositorio importa VALOR do SDK da AWS. `import type` e apagado na
 * compilacao e por isso e seguro aqui.
 *
 * Toda escrita desta feature e UpdateCommand, nunca PutCommand: PutCommand
 * apagaria owner/__typename/createdAt, que aqui nao sao escritos por nenhum
 * resolver do AppSync -- a linha de LabResult e criada pela LAMBDA.
 */
import type { UpdateCommandInput } from '@aws-sdk/lib-dynamodb';

import {
  buildUpdateExpression,
  type UpdateExpressionResult,
} from '../health-import-shared/updateExpressionBuilder';

import type { NormalizedLabResult } from './analyteNormalizer';

export type LabResultRow = NormalizedLabResult & {
  id: string;
  owner: string;
  documentId: string;
};

/**
 * Insere `createdAt` dentro da clausula SET sem quebrar um eventual REMOVE.
 * Concatenar no fim da expressao inteira seria bug: quando ha campo nulo, a
 * expressao termina em "REMOVE #value", e o createdAt viraria parte do REMOVE
 * -- apagando a data de criacao em vez de preserva-la.
 */
function comCreatedAtUmaVezSo(
  base: UpdateExpressionResult,
  createdAt: string,
): UpdateExpressionResult {
  const trecho = '#createdAt = if_not_exists(#createdAt, :createdAt)';
  const expressao = base.UpdateExpression.startsWith('SET ')
    ? base.UpdateExpression.replace('SET ', `SET ${trecho}, `)
    : `SET ${trecho} ${base.UpdateExpression}`;

  return {
    UpdateExpression: expressao,
    ExpressionAttributeNames: { ...base.ExpressionAttributeNames, '#createdAt': 'createdAt' },
    ExpressionAttributeValues: { ...base.ExpressionAttributeValues, ':createdAt': createdAt },
  };
}

/**
 * Monta o comando, sem envia-lo -- e o que torna esta parte testavel sem AWS.
 * Campo `null` vira REMOVE (ver updateExpressionBuilder): uma linha que caiu
 * em revisao na segunda passagem APAGA o valor gravado na primeira, em vez de
 * deixar um numero velho parecendo atual (D29).
 */
export function buildLabResultUpdate(row: LabResultRow, tableName: string): UpdateCommandInput {
  const agora = new Date().toISOString();

  const base = buildUpdateExpression({
    __typename: 'LabResult',
    owner: row.owner,
    documentId: row.documentId,
    analyteCode: row.analyteCode,
    analyteLabel: row.analyteLabel,
    projectLabel: row.projectLabel,
    value: row.value,
    valueQualifier: row.valueQualifier,
    unit: row.unit,
    rawValue: row.rawValue,
    rawUnit: row.rawUnit,
    referenceLow: row.referenceLow,
    referenceHigh: row.referenceHigh,
    rawReferenceText: row.rawReferenceText,
    collectedAt: row.collectedAt,
    collectionMoment: row.collectionMoment,
    sourcePage: row.sourcePage,
    confidence: row.confidence,
    reviewStatus: row.reviewStatus,
    updatedAt: agora,
  });

  const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } =
    comCreatedAtUmaVezSo(base, agora);

  return {
    TableName: tableName,
    Key: { id: row.id },
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
  };
}

/**
 * O porteiro da gravacao. Existe por causa de DOIS defeitos encontrados
 * rodando a pipeline contra um laudo real, e nenhum dos dois estava no plano.
 * Os dois perdem dado EM SILENCIO -- o modo de falha que a D22 existe para
 * fechar, reaparecendo por outras duas portas.
 *
 * 1. LINHA SEM CODIGO. O laudo do Delboni trouxe VPM, SHBG, Testosterona
 *    Biodisponivel e Zinco, que estao fora da cobertura de 79 analitos. As
 *    quatro sairiam com `analyteCode` vazio, e as quatro gerariam O MESMO id
 *    deterministico -- o UpdateCommand gravaria uma e sobrescreveria as
 *    outras tres sem levantar erro.
 *
 *    A D32 mudou o remedio: essas quatro agora recebem codigo local `X-` no
 *    normalizador e sao gravadas normalmente. Sobra aqui um residuo, e so
 *    ele: a linha cujo ROTULO nao identifica analito nenhum, da qual nao da
 *    para derivar codigo. Ela continua fora, pela mesma razao de sempre --
 *    duas linhas assim colidiriam --, mas o motivo que vai no aviso e outro,
 *    e a copy precisa dizer a verdade nova.
 *
 * 2. CODIGO REPETIDO NO MESMO MOMENTO. O modelo rotulou "Neutrofilos" tanto
 *    para 3.515 /uL quanto para 63,9 % -- sao dois analitos, com dois codigos
 *    LOINC. Se ele mapear os dois para um codigo so, o id colide. Aqui NAO se
 *    escolhe um vencedor: as duas linhas vao para revisao, porque nao ha como
 *    saber qual estava certa.
 *
 * O que NAO e colisao: o mesmo codigo em momentos de coleta diferentes. Curva
 * glicemica e jejum/60/120 minutos, e o id ja os distingue (D22).
 */
export function separarLinhasGravaveis(linhas: LabResultRow[]): {
  gravaveis: LabResultRow[];
  avisos: string[];
} {
  const avisos: string[] = [];

  const semCodigo = linhas.filter((l) => l.analyteCode.trim() === '');
  const comCodigo = linhas.filter((l) => l.analyteCode.trim() !== '');

  if (semCodigo.length > 0) {
    const nomes = semCodigo.map((l) => `${l.projectLabel} (${l.rawValue} ${l.rawUnit ?? ''})`.trim());
    avisos.push(
      `Não conseguimos identificar de qual exame são estes valores, e por isso eles não entraram na lista: ${nomes.join('; ')}. Eles continuam no documento original.`,
    );
  }

  const porChave = new Map<string, LabResultRow[]>();
  for (const linha of comCodigo) {
    const chave = `${linha.analyteCode}|${(linha.collectionMoment ?? '').trim()}`;
    porChave.set(chave, [...(porChave.get(chave) ?? []), linha]);
  }

  const gravaveis: LabResultRow[] = [];
  for (const [chave, grupo] of porChave) {
    if (grupo.length === 1) {
      gravaveis.push(grupo[0]);
      continue;
    }
    const codigo = chave.split('|')[0];
    avisos.push(
      `O documento trouxe ${grupo.length} leituras para o mesmo código ${codigo} no mesmo momento de coleta. Elas ficaram marcadas para conferência, porque não dá para saber qual é qual.`,
    );
    for (const linha of grupo) {
      gravaveis.push({ ...linha, reviewStatus: 'PENDENTE_DE_REVISAO' });
    }
  }

  return { gravaveis, avisos };
}
