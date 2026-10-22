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
 *
 * A QUARTA porta (E6, D6.1 = A): `lerSerieDaImportacao`, a unica leitura de
 * BUCKET das ferramentas. Ela le a serie diaria do wearable (`result.json`), e
 * recebe a LINHA que `lerDoDono` trouxe -- nunca uma chave solta, para nao
 * existir assinatura por onde uma chave escrita pelo modelo chegue ao S3.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

import { isFileKeyValid } from '../../health-import-shared/fileKeyValidation';
import type { ChatIdentity } from '../auth';

import { baixarTextoDoBucket } from './bucketDaSerie';
import { serieDoResultado, type SerieDiaria } from './serieDiaria';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient());

/** Teto de paginas por consulta. Sem ele, uma tabela grande vira uma varredura
 *  sem fim dentro de um turno de conversa que a pessoa esta esperando. */
const MAX_PAGINAS = 10;

export type LinhaDoBanco = Record<string, unknown>;

/**
 * As leituras ja feitas NESTE turno, por dono e tabela (risco 3 do E4). Quando
 * o modelo chama duas ferramentas que leem a mesma tabela -- exames e receitas
 * leem os documentos; medicamentos, doses e interacoes, os remedios --, a
 * tabela e lida uma vez. Vive so durante um pedido: o laco cria um registro
 * novo a cada turno, entao nada de um turno vaza para o seguinte, nem dado
 * velho fica guardado no conteiner.
 */
export type LeiturasDoTurno = Map<string, Promise<LeituraDoDono>>;

/**
 * O que uma leitura trouxe, e se ela PAROU NO TETO de paginas (E10, D10.4 =
 * B1). O Scan le a tabela de todo mundo, e depois de `MAX_PAGINAS` as linhas do
 * dono que estao adiante nunca sao vistas. Sem este sinal, uma contagem
 * truncada saia como exata.
 */
export type LeituraDoDono = { linhas: LinhaDoBanco[]; incompleta: boolean };

export async function lerDoDono(
  tableName: string | undefined,
  identity: ChatIdentity,
  leituras?: LeiturasDoTurno,
): Promise<LinhaDoBanco[]> {
  return (await lerDoDonoComCorte(tableName, identity, leituras)).linhas;
}

/**
 * `lerDoDono` que tambem diz se a leitura parou no teto. Uma porta irma, e nao
 * uma mudanca de `lerDoDono`, para as ferramentas que nao contam nada seguirem
 * como estao; quem devolve contagem (o panorama e a comparacao do E10) usa esta.
 */
export async function lerDoDonoComCorte(
  tableName: string | undefined,
  identity: ChatIdentity,
  leituras?: LeiturasDoTurno,
): Promise<LeituraDoDono> {
  if (!tableName) {
    // Configuracao ausente e falha nossa, nao do usuario. Lancar aqui faz o
    // despachante devolver erro tratado ao modelo, e o rastro fica no log.
    throw new Error('Nome de tabela nao configurado.');
  }
  if (!leituras) return lerTabelaDoDono(tableName, identity);

  const chave = `${identity.owner}|${tableName}`;
  let leitura = leituras.get(chave);
  if (!leitura) {
    leitura = lerTabelaDoDono(tableName, identity);
    leituras.set(chave, leitura);
    // Falha nao fica guardada: a proxima ferramenta tenta de novo.
    leitura.catch(() => leituras.delete(chave));
  }
  // Uma copia por chamada: a ferramenta que reordena nao mexe na lista da outra.
  const { linhas, incompleta } = await leitura;
  return { linhas: [...linhas], incompleta };
}

function lerTabelaDoDono(tableName: string, identity: ChatIdentity): Promise<LeituraDoDono> {
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
async function todasAsPaginas(comando: (cursor: Cursor) => ScanCommand | QueryCommand): Promise<LeituraDoDono> {
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

  // Saiu com cursor: havia mais pagina, e o teto a cortou.
  return { linhas, incompleta: Boolean(cursor) };
}

/**
 * Os indices que a porta pessoal por indice aceita. Lista FECHADA, como
 * `TABELAS_PUBLICAS`: o nome do indice e os atributos da condicao de chave sao
 * nomes tecnicos, e vem daqui, nunca de quem chama. O nome do indice e o que o
 * Amplify gerou, conferido em `amplify_outputs.json`: para
 * `index('medicineId').sortKeys(['scheduledDate'])` (E3) e para
 * `index('documentId')` de `PrescriptionItem` (E4), que nao tem ordenacao.
 */
type EntradaDeIndice = { env: string; indice: string; chave: string; ordenacao?: string };

export const INDICES_DO_DONO = {
  DOSES_POR_REMEDIO: {
    env: 'MEDICINE_DOSE_LOG_TABLE_NAME',
    indice: 'medicineDoseLogsByMedicineIdAndScheduledDate',
    chave: 'medicineId',
    ordenacao: 'scheduledDate',
  },
  // Os itens lidos de uma receita (E4). Pelo indice, e nao por Scan, pelo
  // mesmo motivo das doses (D3.2): o Scan leria os itens de todo mundo.
  ITENS_POR_RECEITA: {
    env: 'PRESCRIPTION_ITEM_TABLE_NAME',
    indice: 'prescriptionItemsByDocumentId',
    chave: 'documentId',
  },
} as const satisfies Record<string, EntradaDeIndice>;

type IndiceDoDono = keyof typeof INDICES_DO_DONO;

/**
 * Query num indice da lista, com a chave igual a `valorDaChave` e, quando o
 * indice tem ordenacao, a ordenacao dentro de `intervalo` -- e o filtro de
 * dono, sempre, com o dono do token. Mesmo teto de paginas de `lerDoDono`.
 *
 * Intervalo e ordenacao andam juntos: um intervalo num indice sem ordenacao
 * seria ignorado em silencio, e um indice com ordenacao lido sem intervalo
 * traria o historico inteiro (as doses de anos) -- os dois lancam.
 */
export async function lerDoDonoPorIndice(
  indice: IndiceDoDono,
  valorDaChave: string,
  intervalo: { de: string; ate: string } | undefined,
  identity: ChatIdentity,
): Promise<LinhaDoBanco[]> {
  // O tipo some no JavaScript; um nome vindo de outro lugar nao vira consulta.
  if (!Object.hasOwn(INDICES_DO_DONO, indice)) {
    throw new Error('Indice fora da lista de leitura por dono.');
  }
  const { env, indice: indexName, chave, ordenacao }: EntradaDeIndice = INDICES_DO_DONO[indice];
  if (Boolean(ordenacao) !== Boolean(intervalo)) {
    throw new Error('Intervalo so cabe em indice com ordenacao, e e obrigatorio nele.');
  }
  const tableName = process.env[env];
  if (!tableName) throw new Error('Nome de tabela nao configurado.');

  const { linhas } = await todasAsPaginas(
    (cursor) =>
      new QueryCommand({
        TableName: tableName,
        IndexName: indexName,
        KeyConditionExpression: `#chave = :chave${intervalo ? ' AND #ordem BETWEEN :de AND :ate' : ''}`,
        FilterExpression: '#owner = :owner',
        // A checagem acima garante: com intervalo, ha ordenacao.
        ExpressionAttributeNames: { '#owner': 'owner', '#chave': chave, ...(intervalo && { '#ordem': ordenacao! }) },
        ExpressionAttributeValues: {
          ':owner': identity.owner,
          ':chave': valorDaChave,
          ...(intervalo && { ':de': intervalo.de, ':ate': intervalo.ate }),
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

/**
 * As series ja lidas NESTE turno, por importacao (E6). Mesma vida e mesmo
 * motivo de `LeiturasDoTurno`: duas ferramentas no mesmo turno (os dias e a
 * comparacao com exame) leem o arquivo, de alguns MB, uma vez so.
 */
export type SeriesDoTurno = Map<string, Promise<SerieDiaria | null>>;

/** Acima disto o arquivo nao e lido: uma exportacao de 7,7 anos da alguns MB,
 *  e o teto separa o arquivo grande do arquivo que nao devia estar ali. */
export const TETO_DO_RESULTADO_BYTES = 20 * 1024 * 1024;

/**
 * A chave so serve se for `health-imports/<pasta>/<id DESTA linha>/result.json`.
 *
 * POR QUE O `importId` PROVA A POSSE (D6.1 = A): o dono edita a propria linha
 * de `HealthImport`, inclusive `resultArtifactKey`, e o chat nao conhece o
 * identityId que nomeia a pasta (so o `sub`, ver `metadadoDoDono.ts`). O que A
 * nao consegue e ter uma linha com o id de uma importacao de B: o id e a chave
 * primaria da tabela, e e um UUID. Entao o arquivo que a analise gravou para B
 * fica fora do alcance de A. E a mesma garantia que `start-health-analysis` ja
 * usa para os arquivos brutos, pelo mesmo `isFileKeyValid`. A pasta continua
 * sem conferencia: quem pode gravar ali com o id da importacao de A e o dono da
 * pasta, entregando o proprio dado.
 */
function chaveDaPropriaImportacao(linha: LinhaDoBanco): { key: string; importId: string } | null {
  const key = linha.resultArtifactKey;
  const importId = texto(linha.id);
  if (typeof key !== 'string' || !importId) return null;
  return isFileKeyValid(key, importId) && key.endsWith('/result.json') ? { key, importId } : null;
}

/**
 * A serie diaria de uma importacao, ou `null` (ausencia, nunca erro): chave
 * fora da forma, arquivo inexistente, grande demais, ilegivel, ou o S3
 * recusando. A `linha` TEM de vir de `lerDoDono`.
 */
export async function lerSerieDaImportacao(linha: LinhaDoBanco, series?: SeriesDoTurno): Promise<SerieDiaria | null> {
  const bucket = process.env.HEALTH_BUCKET_NAME;
  if (!bucket) throw new Error('Nome do bucket nao configurado.');

  const chave = chaveDaPropriaImportacao(linha);
  // Recusada aqui, antes do S3: nem a existencia do objeto de outra pessoa e
  // perguntada.
  if (!chave) return null;

  // Sem o registro do turno (testes), um mapa so desta chamada: um caminho so.
  const cache = series ?? new Map();
  let leitura = cache.get(chave.importId);
  if (!leitura) {
    leitura = baixarSerie(bucket, chave.key);
    cache.set(chave.importId, leitura);
  }
  return leitura;
}

async function baixarSerie(bucket: string, key: string): Promise<SerieDiaria | null> {
  try {
    const conteudo = await baixarTextoDoBucket(bucket, key, TETO_DO_RESULTADO_BYTES);
    return conteudo === null ? null : serieDoResultado(conteudo);
  } catch (erro) {
    // So o nome do erro: a mensagem do SDK traz a chave, e o conteudo do
    // arquivo e dado de saude.
    console.warn(JSON.stringify({ evento: 'serie-do-wearable-indisponivel', erro: (erro as Error)?.name ?? 'desconhecido' }));
    return null;
  }
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
