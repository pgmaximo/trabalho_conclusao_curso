/**
 * Resumo do arquivo:
 * A UNICA porta de leitura das tools. Ela existe para que o filtro por dono
 * nao seja uma disciplina que cada tool precise lembrar de cumprir.
 *
 * O dono entra por parametro proprio, do tipo `ChatIdentity`, e a expressao de
 * filtro e montada AQUI. Uma tool nao recebe como montar consulta: ela diz que
 * tabela quer e, no maximo, um filtro adicional sobre campos que nao sao o
 * dono. Nao existe caminho por onde um valor vindo da entrada da ferramenta
 * vire o `:owner` da consulta.
 *
 * Por que Scan e nao Query: nenhuma destas tabelas tem indice por dono. E o
 * mesmo caminho que a get-prevention-recommendations ja usa, e a mesma
 * armadilha vale -- `Limit` no Scan limita quantos itens sao AVALIADOS antes
 * do filtro, e nao quantos voltam, entao o corte e feito depois, em memoria.
 *
 * O plano montava a consulta de wearable com `IndexName: 'byOwner'`. Esse
 * indice nao existe em nenhuma tabela deste repositorio, e a chamada teria
 * falhado na primeira execucao real.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

import type { ChatIdentity } from '../auth';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient());

/** Teto de paginas por consulta. Sem ele, uma tabela grande vira uma varredura
 *  sem fim dentro de um turno de conversa que a pessoa esta esperando. */
const MAX_PAGINAS = 10;

export type LinhaDoBanco = Record<string, unknown>;

export async function lerDoDono(
  tableName: string | undefined,
  identity: ChatIdentity,
): Promise<LinhaDoBanco[]> {
  if (!tableName) {
    // Configuracao ausente e falha nossa, nao do usuario. Lancar aqui faz o
    // despachante devolver erro tratado ao modelo, e o rastro fica no log.
    throw new Error('Nome de tabela nao configurado.');
  }

  const linhas: LinhaDoBanco[] = [];
  let cursor: Record<string, unknown> | undefined;
  let pagina = 0;

  do {
    const saida = await ddb.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: '#owner = :owner',
        ExpressionAttributeNames: { '#owner': 'owner' },
        // O unico lugar do codigo das tools em que um owner vira valor de
        // consulta, e ele so pode vir da identidade.
        ExpressionAttributeValues: { ':owner': identity.owner },
        ExclusiveStartKey: cursor,
      }),
    );
    linhas.push(...((saida.Items ?? []) as LinhaDoBanco[]));
    cursor = saida.LastEvaluatedKey as Record<string, unknown> | undefined;
    pagina += 1;
  } while (cursor && pagina < MAX_PAGINAS);

  return linhas;
}

/** Texto de campo, quando ele existe e nao esta vazio. */
export function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : null;
}

/** Ordena por uma data em texto ISO, da mais recente para a mais antiga.
 *  Linha sem data vai para o fim -- nunca some. */
export function maisRecentePrimeiro<T extends LinhaDoBanco>(linhas: T[], campo: string): T[] {
  return [...linhas].sort((a, b) => {
    const da = texto(a[campo]) ?? '';
    const db = texto(b[campo]) ?? '';
    if (da === db) return 0;
    if (da === '') return 1;
    if (db === '') return -1;
    return db.localeCompare(da);
  });
}
