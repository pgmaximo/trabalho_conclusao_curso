/**
 * Resumo do arquivo:
 * A saida de `consultar_receitas` (E4, 4.1): linhas do banco -> o que o modelo
 * le. Modulo PURO; a leitura fica em `receitas.ts`.
 *
 * Duas decisoes moldam este arquivo:
 * - D4.1 = A: o app nao tem tela que mostre nem confira item de receita, entao
 *   todo item vai como leitura automatica da foto. So `CONFIRMADO_PELO_USUARIO`
 *   conta como conferido (hoje nenhum item chega la), e o aviso sai em toda
 *   saida, nao so quando ha item duvidoso.
 * - D4.2 = A: dose, unidade, frequencia, duracao e o texto bruto lidos do papel
 *   NAO saem daqui. A garantia e estrutural: `ItemDeReceita` nao tem campo onde
 *   eles caibam, e o nome do remedio sai sem a concentracao. Um filtro "tira a
 *   dose antes de mandar" esqueceria o proximo campo que o schema ganhasse.
 */
import { formatarData } from '../formatoPtBr';
import type { DegradedBlock } from '../types';
import { nomeSemPosologia } from './nomeSemPosologia';
import { maisRecentePrimeiro, texto, type LinhaDoBanco } from './ownerScopedRead';
import {
  EXPLICACAO_DA_LEITURA,
  leituraDoDocumento,
  type LeituraDoDocumento,
  type SituacaoDaLeitura,
} from './situacaoDaLeitura';

/** Tetos da saida. A maioria das pessoas tem uma ou duas receitas com poucos
 *  itens; o teto existe para o pior caso nao estourar o contexto do modelo. */
export const MAX_RECEITAS = 5;
export const MAX_ITENS_POR_RECEITA = 15;
export const MAX_NOME_DO_REMEDIO = 80;

/** O que um item de receita leva ao modelo. Sem `dose`, `unit`, `frequency`,
 *  `duration`, `rawText` e `confidence` -- de proposito (D4.2). */
export type ItemDeReceita = {
  remedio: string;
  /** O papel trazia alguma posologia. O modelo diz que ela esta NA RECEITA,
   *  sem repeti-la. */
  temPosologiaNoPapel: boolean;
  conferidoPelaPessoa: boolean;
  /** A extracao leu com baixa confianca: o nome pode estar errado. */
  leituraDuvidosa: boolean;
};

export type ReceitaParaOModelo = {
  documentId: string;
  titulo: string | null;
  dataDaReceita: string | null;
  validaAte: string | null;
  leitura: LeituraDoDocumento;
  itens: ItemDeReceita[];
  itensOmitidos: number;
  /** A consulta dos itens desta receita falhou agora (risco 4 do E4). As
   *  outras receitas saem; esta diz que nao foi possivel, e nao que esta vazia. */
  itensIndisponiveis?: true;
};

export type SaidaDeReceitas = {
  disponivel: boolean;
  total: number;
  receitasOmitidas: number;
  receitas: ReceitaParaOModelo[];
  avisoDosItens: string;
  avisoDeIndisponiveis?: string;
  explicacaoDaLeitura?: string;
  explicacao?: string;
};

// "Arquivo", e nao "foto": a receita pode ter sido guardada em PDF. E o caminho
// termina no botao que existe: a tela do documento nao mostra a imagem, so
// oferece baixa-la (revisao do E4).
const AVISO_DOS_ITENS =
  'Os nomes dos remédios foram lidos automaticamente do arquivo da receita e ninguém os conferiu. leituraDuvidosa marca um nome que pode ter sido lido errado. A forma de usar está escrita na receita: no aplicativo, em Exames, toque no documento e em Baixar documento.';

const AVISO_DE_INDISPONIVEIS =
  'Nas receitas com itensIndisponiveis, não foi possível ler os remédios agora: diga isso, sem dizer que a receita está vazia, e que a pessoa pode perguntar de novo daqui a pouco ou abrir a receita no aplicativo.';

const NOME_ILEGIVEL = 'nome não legível';

export function escolherReceitas(documentos: LinhaDoBanco[]): { escolhidas: LinhaDoBanco[]; omitidas: number } {
  // Documento sem tipo nao conta como receita: dizer que um exame antigo e uma
  // receita poria nome de remedio onde nao ha.
  // Sem id, nao ha chave para consultar os itens -- e a consulta com chave
  // vazia derrubaria a ferramenta inteira (revisao do E4).
  const receitas = maisRecentePrimeiro(
    documentos.filter((d) => d.documentType === 'prescription' && texto(d.id) !== null),
    'documentDate',
  );
  return { escolhidas: receitas.slice(0, MAX_RECEITAS), omitidas: Math.max(0, receitas.length - MAX_RECEITAS) };
}

/**
 * O nome sem concentracao nem posologia (D4.2). O corte mora em
 * `nomeSemPosologia.ts` desde o E11, que o divide com o lembrete proposto.
 * Nenhum numero do papel chega ao modelo, nem ao modo degradado, que nao passa
 * pela verificacao de linguagem.
 */
export function nomeDoRemedio(medicationLabel: unknown): string {
  const nome = nomeSemPosologia(typeof medicationLabel === 'string' ? medicationLabel : '');
  return nome ? nome.slice(0, MAX_NOME_DO_REMEDIO) : NOME_ILEGIVEL;
}

function itemParaOModelo(linha: LinhaDoBanco): ItemDeReceita {
  return {
    remedio: nomeDoRemedio(linha.medicationLabel),
    temPosologiaNoPapel: [linha.dose, linha.unit, linha.frequency, linha.duration].some((c) => texto(c) !== null),
    conferidoPelaPessoa: linha.reviewStatus === 'CONFIRMADO_PELO_USUARIO',
    leituraDuvidosa: linha.reviewStatus === 'PENDENTE_DE_REVISAO',
  };
}

/**
 * Um item por remedio. O id do item inclui a dose, e duas linhas da mesma
 * leitura ("50" e "50 mg", ou a mesma linha do papel lida duas vezes) sao,
 * sem a dose, o mesmo nome repetido (revisao do E4). Os avisos se juntam pelo lado cauteloso:
 * duvidosa se alguma leitura foi; conferido so se todas foram.
 */
function umPorRemedio(itens: ItemDeReceita[]): ItemDeReceita[] {
  const porNome = new Map<string, ItemDeReceita>();
  for (const item of itens) {
    const visto = porNome.get(item.remedio);
    porNome.set(
      item.remedio,
      visto
        ? {
            remedio: item.remedio,
            temPosologiaNoPapel: visto.temPosologiaNoPapel || item.temPosologiaNoPapel,
            conferidoPelaPessoa: visto.conferidoPelaPessoa && item.conferidoPelaPessoa,
            leituraDuvidosa: visto.leituraDuvidosa || item.leituraDuvidosa,
          }
        : item,
    );
  }
  return [...porNome.values()];
}

const LEITURAS_CONCLUIDAS = new Set<unknown>(['SUCCEEDED', 'NO_RESULTS']);

function dataLida(valor: unknown): number | null {
  const ms = typeof valor === 'string' ? Date.parse(valor) : NaN;
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Os itens que a ULTIMA leitura gravou (risco 1 do E4). A extracao grava
 * `updatedAt` em cada item que escreve, depois do `extractionStartedAt` da
 * leitura; item com data anterior sobrou de uma leitura velha. Desde o E4 a
 * Lambda apaga esses itens na releitura -- este filtro cobre os que ja estavam
 * no banco antes disso.
 *
 * So vale para leitura CONCLUIDA (lida, ou sem nenhum remedio): ai a tela so
 * mostra o que a ultima leitura achou. Numa releitura que falhou, os itens sao
 * os da leitura anterior, e a tela diz isso. Sem data para comparar, o item fica:
 * esconder um remedio por falta de data seria pior que mostrar um a mais.
 */
function daUltimaLeitura(doc: LinhaDoBanco, linhas: LinhaDoBanco[]): LinhaDoBanco[] {
  const inicio = dataLida(doc.extractionStartedAt);
  if (!LEITURAS_CONCLUIDAS.has(doc.extractionStatus) || inicio === null) return linhas;
  // O conferido fica, como na Lambda (`regravacaoDaReceita.ts`): a leitura da
  // maquina nao desfaz o que uma pessoa disse que esta certo.
  return linhas.filter((l) => {
    const gravado = dataLida(l.updatedAt);
    return gravado === null || gravado >= inicio || l.reviewStatus === 'CONFIRMADO_PELO_USUARIO';
  });
}

function receitaParaOModelo(doc: LinhaDoBanco, linhas: LinhaDoBanco[] | null, agora: Date): ReceitaParaOModelo {
  // Ordem estavel por nome: o item nao tem posicao gravada, e a ordem do
  // indice mudaria entre duas perguntas iguais.
  const itens = umPorRemedio(daUltimaLeitura(doc, linhas ?? []).map(itemParaOModelo)).sort((a, b) =>
    a.remedio.localeCompare(b.remedio, 'pt-BR'),
  );
  return {
    documentId: String(doc.id),
    titulo: texto(doc.documentName),
    dataDaReceita: texto(doc.documentDate),
    validaAte: texto(doc.expirationDate),
    leitura: leituraDoDocumento(doc, agora),
    itens: itens.slice(0, MAX_ITENS_POR_RECEITA),
    itensOmitidos: Math.max(0, itens.length - MAX_ITENS_POR_RECEITA),
    ...(linhas === null ? { itensIndisponiveis: true as const } : {}),
  };
}

export function montarSaidaDeReceitas(
  escolhidas: LinhaDoBanco[],
  /** `null` = a consulta dos itens daquela receita falhou. */
  itensPorReceita: (LinhaDoBanco[] | null)[],
  receitasOmitidas: number,
  agora: Date,
): SaidaDeReceitas {
  const receitas = escolhidas.map((doc, i) => receitaParaOModelo(doc, itensPorReceita[i] === undefined ? [] : itensPorReceita[i], agora));
  return {
    disponivel: receitas.length > 0,
    total: receitas.length + receitasOmitidas,
    receitasOmitidas,
    receitas,
    avisoDosItens: AVISO_DOS_ITENS,
    ...(receitas.some((r) => r.itensIndisponiveis) ? { avisoDeIndisponiveis: AVISO_DE_INDISPONIVEIS } : {}),
    // Sem receita, a explicacao das situacoes so gastaria contexto.
    ...(receitas.length > 0
      ? { explicacaoDaLeitura: EXPLICACAO_DA_LEITURA }
      : { explicacao: 'O usuário ainda não guardou nenhuma receita no aplicativo.' }),
  };
}

/** Receita sem item: o que dizer depende da leitura. "Nenhum remedio lido"
 *  de uma receita que ainda esta sendo lida diria que o papel nao tinha
 *  remedio (revisao do E4). */
const SEM_ITEM: Record<SituacaoDaLeitura, string> = {
  lido: 'nenhum remédio lido',
  sem_valores: 'nenhum remédio lido',
  na_fila: 'leitura em andamento',
  lendo: 'leitura em andamento',
  demorando: 'leitura em andamento',
  nunca_lido: 'ainda não lida',
  falhou: 'a leitura não deu certo',
  desconhecida: 'situação da leitura desconhecida',
};

/** O modo degradado (D31): os nomes, sem posologia, com a ressalva de que
 *  ninguem os conferiu. Sem citacao: nome de remedio nao e valor de exame. */
export function blocoDegradadoDeReceitas(output: unknown): DegradedBlock | null {
  const saida = output as Partial<SaidaDeReceitas> | null;
  if (!saida?.receitas?.length) return null;
  return {
    titulo: 'Receitas guardadas',
    linhas: [
      ...saida.receitas.map((r) => {
        const cabeca = `${r.titulo ?? 'Receita sem título'} · ${formatarData(r.dataDaReceita)}`;
        const nomes = r.itens.length
          ? r.itens.map((i) => i.remedio).join(', ')
          : r.itensIndisponiveis
            ? 'não foi possível ler os remédios agora'
            : SEM_ITEM[r.leitura.situacao];
        return `${cabeca}: ${nomes}`;
      }),
      'Nomes lidos do arquivo da receita, sem conferência.',
    ],
    citacoes: [],
  };
}
