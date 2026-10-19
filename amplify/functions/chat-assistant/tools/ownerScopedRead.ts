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
 *
 * A EXCECAO, e ela e uma so (E8, D8.3 = A): `lerPublicoPorChave`, no fim do
 * arquivo, le dado PUBLICO sem dono -- o cache de postos de vacinacao, que e
 * igual para todo mundo. Ela e uma porta SEPARADA, e nao um modo de
 * `lerDoDono`, de proposito: um parametro "sem filtro de dono" na porta pessoal
 * transformaria um descuido em vazamento de dado de outra pessoa. A porta
 * publica so aceita as tabelas de uma lista fechada, e o nome do atributo-chave
 * vem da TABELA, nunca de quem chama.
 *
 * A SEGUNDA porta pessoal (E3, D3.2 = A): `lerDoDonoPorIndice`, logo depois de
 * `lerDoDono`. O historico de doses cresce todo dia, para todo mundo, e um Scan
 * dele a cada pergunta leria a tabela inteira -- e, com o teto de paginas,
 * passaria a perder doses sem avisar. A porta nova consulta o INDICE, mas o
 * filtro de dono continua montado aqui e vindo so da identidade: nem o valor da
 * chave (um `medicineId`) consegue trazer linha de outra pessoa. O indice e o
 * atributo-chave vem de uma lista fechada, como as tabelas publicas.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

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

  return todasAsPaginas(
    (cursor) =>
      new ScanCommand({
        TableName: tableName,
        FilterExpression: '#owner = :owner',
        ExpressionAttributeNames: { '#owner': 'owner' },
        // Um dos dois lugares do codigo das tools em que um owner vira valor de
        // consulta (o outro e `lerDoDonoPorIndice`), e ele so pode vir da
        // identidade.
        ExpressionAttributeValues: { ':owner': identity.owner },
        ExclusiveStartKey: cursor,
      }),
  );
}

type Cursor = Record<string, unknown> | undefined;

/** As paginas de uma consulta, ate `MAX_PAGINAS`. Um laco so para as duas
 *  portas pessoais: o teto nao pode ser diferente entre elas. */
async function todasAsPaginas(comando: (cursor: Cursor) => ScanCommand | QueryCommand): Promise<LinhaDoBanco[]> {
  const linhas: LinhaDoBanco[] = [];
  let cursor: Cursor;
  let pagina = 0;

  do {
    // `send` e sobrecarregado por comando; a uniao nao escolhe sobrecarga.
    const saida = await ddb.send(comando(cursor) as ScanCommand);
    linhas.push(...((saida.Items ?? []) as LinhaDoBanco[]));
    cursor = saida.LastEvaluatedKey as Cursor;
    pagina += 1;
  } while (cursor && pagina < MAX_PAGINAS);

  return linhas;
}

/**
 * Os indices que a porta pessoal por indice aceita. Lista FECHADA, como
 * `TABELAS_PUBLICAS`: o nome do indice e os atributos da condicao de chave sao
 * nomes tecnicos, e vem daqui, nunca de quem chama. O nome do indice e o que o
 * Amplify gerou para `index('medicineId').sortKeys(['scheduledDate'])`,
 * conferido em `amplify_outputs.json` (E3).
 */
export const INDICES_DO_DONO = {
  DOSES_POR_REMEDIO: {
    env: 'MEDICINE_DOSE_LOG_TABLE_NAME',
    indice: 'medicineDoseLogsByMedicineIdAndScheduledDate',
    chave: 'medicineId',
    ordenacao: 'scheduledDate',
  },
} as const;

type IndiceDoDono = keyof typeof INDICES_DO_DONO;

/**
 * Query num indice da lista, com a chave igual a `valorDaChave` e a ordenacao
 * dentro de `intervalo` -- e o filtro de dono, sempre, com o dono do token.
 * Mesmo teto de paginas de `lerDoDono`.
 */
export async function lerDoDonoPorIndice(
  indice: IndiceDoDono,
  valorDaChave: string,
  intervalo: { de: string; ate: string },
  identity: ChatIdentity,
): Promise<LinhaDoBanco[]> {
  // O tipo some no JavaScript; um nome vindo de outro lugar nao vira consulta.
  if (!Object.hasOwn(INDICES_DO_DONO, indice)) {
    throw new Error('Indice fora da lista de leitura por dono.');
  }
  const { env, indice: indexName, chave, ordenacao } = INDICES_DO_DONO[indice];
  const tableName = process.env[env];
  if (!tableName) throw new Error('Nome de tabela nao configurado.');

  const linhas = await todasAsPaginas(
    (cursor) =>
      new QueryCommand({
        TableName: tableName,
        IndexName: indexName,
        KeyConditionExpression: '#chave = :chave AND #ordem BETWEEN :de AND :ate',
        FilterExpression: '#owner = :owner',
        ExpressionAttributeNames: { '#owner': 'owner', '#chave': chave, '#ordem': ordenacao },
        ExpressionAttributeValues: {
          ':owner': identity.owner,
          ':chave': valorDaChave,
          ':de': intervalo.de,
          ':ate': intervalo.ate,
        },
        ExclusiveStartKey: cursor,
      }),
  );
  // Segunda trava (revisao do E3): o filtro acima ja impede linha de outro dono
  // no DynamoDB, mas a chave desta porta e um `medicineId`, e nao o dono. Se um
  // dia a consulta mudar e o filtro sumir, o que sai daqui continua sendo so da
  // pessoa -- e linha sem dono tambem nao sai.
  return linhas.filter((l) => l.owner === identity.owner);
}

/**
 * As tabelas sem dono que o chat pode ler. Lista FECHADA: cada entrada diz a
 * variavel de ambiente do nome e o atributo-chave. Acrescentar uma tabela aqui
 * e uma decisao (D8.3), e o teste da porta afirma a lista inteira.
 */
export const TABELAS_PUBLICAS = {
  CACHE_DE_POSTOS: { env: 'SITE_CACHE_TABLE_NAME', chave: 'codigoMunicipio' },
} as const;

type TabelaPublica = keyof typeof TABELAS_PUBLICAS;

/**
 * GetItem por chave numa tabela publica. Sem Scan e sem filtro: a tabela e
 * indexada pela propria chave, e nao ha dono para filtrar.
 *
 * A checagem em tempo de execucao repete o que o tipo ja garante porque o tipo
 * some no JavaScript: um nome vindo de outro lugar ("UserProfile", ou
 * "toString", que existe em todo objeto) nao pode virar consulta.
 */
export async function lerPublicoPorChave(
  tabela: TabelaPublica,
  valorDaChave: string,
): Promise<LinhaDoBanco | null> {
  if (!Object.hasOwn(TABELAS_PUBLICAS, tabela)) {
    throw new Error('Tabela fora da lista de leitura publica.');
  }
  const { env, chave } = TABELAS_PUBLICAS[tabela];
  const tableName = process.env[env];
  if (!tableName) throw new Error('Nome de tabela nao configurado.');

  const saida = await ddb.send(
    new GetCommand({ TableName: tableName, Key: { [chave]: valorDaChave } }),
  );
  return (saida.Item as LinhaDoBanco | undefined) ?? null;
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
