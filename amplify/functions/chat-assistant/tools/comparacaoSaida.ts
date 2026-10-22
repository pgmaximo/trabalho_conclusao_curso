/**
 * Resumo do arquivo:
 * A saida de `consultar_comparacao` (E10, 10.2, D10.1 = B): um resultado de
 * exame AO LADO da media de sono ou de passos dos 28 DIAS ANTES DA COLETA.
 * Modulo puro -- quem le o banco e o bucket e `comparacao.ts`.
 *
 * Dois blocos separados, e nada que os ligue. A ressalva de que a comparacao
 * nao mostra causa nao mora aqui: e escrita pelo aplicativo no fim da resposta
 * (`comparacaoFixa.ts`), para nao depender do modelo lembrar.
 *
 * A janela e a dos 28 dias reais antes da coleta, lida da serie diaria (D10.5,
 * cumprida no E6). Ate o E6 era o mes com mais dias nessas 4 semanas, do resumo
 * mensal, e a saida dizia a imprecisao; agora a media e exatamente desses dias,
 * so dos que tiveram registro, e abaixo de 14 deles nao ha media (a mesma regua
 * de 14 do E10). Sem serie diaria nao ha volta ao mes: um caminho so.
 */
import { TEXTO_DA_COMPARACAO } from '../comparacaoFixa';
import { formatarData, formatarDecimal } from '../formatoPtBr';
import type { DegradedBlock } from '../types';
import type { SaidaDoAnalito } from './analitos';
import { maisRecentePrimeiro, texto, type LinhaDoBanco } from './ownerScopedRead';
import {
  diaValido,
  formatarValorDiario,
  mediaNoIntervalo,
  METRICAS_DIARIAS,
  somarDias,
  type MetricaDiaria,
  type SerieDiaria,
} from './serieDiaria';
import { periodoDaImportacao } from './wearableSaida';

/** O par fechado que a D10.1 permite, um pedaco da lista das metricas diarias:
 *  o nome vira id do catalogo pelo mesmo mapa da ferramenta de dias. */
export type DadoDoWearable = Extract<MetricaDiaria, 'sono' | 'passos'>;

/** Quantos pares vao ao modelo. As coletas mais antigas ficam de fora, contadas. */
export const MAX_PARES = 3;

/** A janela: os 28 dias antes da coleta, sem o dia dela. */
const DIAS_DA_JANELA = 28;

/** Abaixo disto, a "media das 4 semanas" seria a media de poucas noites. */
const MIN_DIAS_NA_JANELA = 14;

/** Quantos `result.json` uma chamada le, no maximo: cada um pode ter alguns
 *  MB, e 3 coletas em anos diferentes nao justificam 3 arquivos. */
export const MAX_SERIES_LIDAS = 2;

export const AVISO_DO_ALINHAMENTO =
  'A média do wearable é dos 28 dias antes da coleta, e considera só os dias em que houve registro.';

const SEM_IMPORTACAO =
  'O usuário ainda não importou dados de wearable, ou nenhuma importação concluiu.';

type BlocoDoWearable = { de: string; ate: string; media: string; diasComRegistro: number };

type ParLadoALado = {
  exame: {
    id: string;
    valor: number | null;
    unidade: string | null;
    dataDaColeta: string;
    documentoId: string;
    momento: string | null;
  };
  wearable: BlocoDoWearable | null;
  /** So quando `wearable` e nulo: por que nao ha media nessa janela. */
  explicacaoDoWearable?: string;
};

type SaidaDaComparacao =
  | {
      disponivel: true;
      analito: string;
      dadoDoWearable: DadoDoWearable;
      pares: ParLadoALado[];
      omitidas: number;
      naoComparaveis: number;
      avisoDoAlinhamento: string;
    }
  | { disponivel: false; explicacao: string; naoComparaveis?: number };

/** Media em texto, no codigo: o modelo repete, nao converte minuto em hora. */
export function formatarMediaDoWearable(dado: DadoDoWearable, media: number): string {
  return `${formatarValorDiario(dado, media)} por dia`;
}

type Janela = { de: string; ate: string };

/** A janela da coleta, ou `null` se a data dela nao existe (a leitura do laudo
 *  aceita mes 13): sem janela, as contas de dias lancariam. */
function janelaDaColeta(dataDaColeta: string): Janela | null {
  if (!diaValido(dataDaColeta)) return null;
  return { de: somarDias(dataDaColeta, -DIAS_DA_JANELA), ate: somarDias(dataDaColeta, -1) };
}

/** Uma importacao pronta com periodo valido. `linha` e o que a porta do dono le. */
export type Importacao = { linha: LinhaDoBanco; id: string; inicio: string; fim: string };

/**
 * So as importacoes prontas com periodo valido, da criada por ultimo para a
 * mais antiga -- a ordem de preferencia, feita uma vez so. A mais recente e a
 * preferida pela mesma razao de `consultar_wearable` (plan.md do E10, secao 6).
 */
function importacoesProntas(linhas: LinhaDoBanco[]): Importacao[] {
  return maisRecentePrimeiro(linhas, 'createdAt').flatMap((linha) => {
    const id = texto(linha.id);
    const periodo = periodoDaImportacao(linha);
    return linha.status === 'READY' && id && periodo ? [{ linha, id, ...periodo }] : [];
  });
}

const tocaAJanela = (imp: Importacao, { de, ate }: Janela) => imp.inicio <= ate && imp.fim >= de;

/** A media da janela nesta serie, ou por que ela nao serve. */
function mediaDaJanela(serie: SerieDiaria, janela: Janela, dado: DadoDoWearable): { media: number; diasComRegistro: number } | string {
  const { diasComRegistro, media } = mediaNoIntervalo(serie[METRICAS_DIARIAS[dado]] ?? [], janela.de, janela.ate);
  if (media === null || diasComRegistro < MIN_DIAS_NA_JANELA) {
    return `Só ${diasComRegistro} dos 28 dias antes desta coleta têm registro de ${dado}, poucos para uma média.`;
  }
  return { media, diasComRegistro };
}

type Avaliacao =
  | { serve: true; media: number; diasComRegistro: number }
  | { serve: false; motivo: string | null; naoLida: Importacao | null };

/**
 * O que as importacoes dizem desta janela: a criada por ultimo cuja serie foi
 * lida e da media; ou, se nenhuma serve, o motivo da mais recente e a primeira
 * que ainda nao foi lida. Uma funcao so para a escolha do que ler
 * (`proximasParaLer`) e para o bloco mostrado (`blocoDaColeta`): duas escadas
 * iguais em dois lugares divergiriam, e um par diria "nao consultada" para um
 * dado que existia.
 *
 * Uma nova sem serie ou com pouco registro nao esconde uma antiga que serve
 * (revisoes do E10 e do E6). Os motivos sao neutros: "importe de novo" seria
 * promessa falsa quando a causa e o arquivo grande demais ou a chave fora da
 * forma.
 */
function avaliarJanela(
  janela: Janela,
  importacoes: Importacao[],
  series: Map<string, SerieDiaria | null>,
  dado: DadoDoWearable,
): Avaliacao {
  let motivo: string | null = null;
  let naoLida: Importacao | null = null;
  for (const imp of importacoes) {
    if (!tocaAJanela(imp, janela)) continue;
    if (!series.has(imp.id)) {
      naoLida ??= imp;
      motivo ??= 'A série dia a dia dessa importação de wearable não foi consultada nesta resposta.';
      continue;
    }
    const serie = series.get(imp.id);
    if (!serie) {
      motivo ??= 'A série dia a dia dessa importação de wearable não está disponível.';
      continue;
    }
    const resultado = mediaDaJanela(serie, janela, dado);
    if (typeof resultado === 'string') {
      motivo ??= resultado;
      continue;
    }
    return { serve: true, ...resultado };
  }
  return { serve: false, motivo, naoLida };
}

/**
 * Os proximos arquivos a ler: por janela ainda sem media, a primeira importacao
 * que a toca e ainda nao foi lida, na ordem de preferencia. Quem chama le em
 * rodadas, ate o teto de `MAX_SERIES_LIDAS`. Data de coleta que nao existe nao
 * pede nada.
 */
export function proximasParaLer(
  linhas: LinhaDoBanco[],
  datasDasColetas: string[],
  series: Map<string, SerieDiaria | null>,
  dado: DadoDoWearable,
): Importacao[] {
  const prontas = importacoesProntas(linhas);
  const escolhidas = new Set<Importacao>();
  for (const data of datasDasColetas) {
    const janela = janelaDaColeta(data);
    if (!janela) continue;
    const avaliacao = avaliarJanela(janela, prontas, series, dado);
    if (!avaliacao.serve && avaliacao.naoLida) escolhidas.add(avaliacao.naoLida);
  }
  return prontas.filter((i) => escolhidas.has(i));
}

/** O bloco do wearable para uma coleta, ou por que ele nao existe. */
function blocoDaColeta(
  dataDaColeta: string,
  importacoes: Importacao[],
  series: Map<string, SerieDiaria | null>,
  dado: DadoDoWearable,
): Pick<ParLadoALado, 'wearable' | 'explicacaoDoWearable'> {
  const janela = janelaDaColeta(dataDaColeta);
  if (!janela) {
    return {
      wearable: null,
      explicacaoDoWearable: 'A data desta coleta não pôde ser lida, e por isso não há período do wearable para comparar.',
    };
  }
  const avaliacao = avaliarJanela(janela, importacoes, series, dado);
  if (avaliacao.serve) {
    return {
      wearable: { ...janela, media: formatarMediaDoWearable(dado, avaliacao.media), diasComRegistro: avaliacao.diasComRegistro },
    };
  }
  return {
    wearable: null,
    explicacaoDoWearable:
      avaliacao.motivo ??
      `Não há dado de ${dado} nos 28 dias antes desta coleta: as importações de wearable não cobrem esse período.`,
  };
}

type SerieDisponivel = Extract<SaidaDoAnalito, { disponivel: true }>['series'][number];
type ColetaMostrada = SerieDisponivel['coletas'][number] & { momento: SerieDisponivel['momento']; dataDaColeta: string };

/**
 * As coletas que viram par, da mais recente para a mais antiga, ja cortadas em
 * `MAX_PARES`. Uma funcao so para a montagem e para a leitura (`comparacao.ts`):
 * se as duas escolhessem as coletas de jeitos diferentes, um par mostrado
 * diria "serie nao consultada" para um dado que existia (code-review do E6).
 */
function coletasMostradas(serie: Extract<SaidaDoAnalito, { disponivel: true }>): { todas: ColetaMostrada[]; mostradas: ColetaMostrada[] } {
  const todas = serie.series
    .flatMap((s) => s.coletas.map((c) => ({ ...c, momento: s.momento })))
    .filter((c): c is ColetaMostrada => c.dataDaColeta !== null)
    .sort((a, b) => b.dataDaColeta.localeCompare(a.dataDaColeta));
  return { todas, mostradas: todas.slice(0, MAX_PARES) };
}

/** As datas das coletas que viram par: o que a leitura das series precisa. */
export function datasDasColetasMostradas(serie: SaidaDoAnalito): string[] {
  return serie.disponivel ? coletasMostradas(serie).mostradas.map((c) => c.dataDaColeta) : [];
}

export function montarComparacao(
  serie: SaidaDoAnalito,
  linhasDeImportacao: LinhaDoBanco[],
  series: Map<string, SerieDiaria | null>,
  dado: DadoDoWearable,
): SaidaDaComparacao {
  if (!serie.disponivel) return { disponivel: false, explicacao: serie.explicacao };

  const importacoes = importacoesProntas(linhasDeImportacao);
  if (importacoes.length === 0) return { disponivel: false, explicacao: SEM_IMPORTACAO };

  // As coletas comparaveis ja passaram pelas exclusoes de `consultar_analito`:
  // a comparacao nao cita numero que a serie esconde.
  const { todas: coletas, mostradas } = coletasMostradas(serie);

  const naoComparaveis = serie.series.reduce((n, s) => n + s.naoComparaveis.length, 0);
  if (coletas.length === 0) {
    // Ha resultado, mas nenhum se compara: dizer "disponivel" sem par nenhum
    // deixaria o modelo sem o que mostrar e sem saber por que (revisao do E10).
    return {
      disponivel: false,
      naoComparaveis,
      explicacao:
        'Os resultados deste exame não podem entrar na comparação: aguardam conferência, não têm valor medido ou data, ou estão em outra unidade.',
    };
  }

  const pares = mostradas.map((c) => ({
    exame: {
      id: c.id,
      valor: c.valor,
      unidade: c.unidade || null,
      dataDaColeta: c.dataDaColeta,
      documentoId: c.documentoId,
      momento: c.momento,
    },
    ...blocoDaColeta(c.dataDaColeta, importacoes, series, dado),
  }));

  return {
    disponivel: true,
    analito: serie.nome,
    dadoDoWearable: dado,
    pares,
    omitidas: coletas.length - pares.length,
    naoComparaveis,
    avisoDoAlinhamento: AVISO_DO_ALINHAMENTO,
  };
}

/**
 * O modo degradado (D31): os dois blocos de cada par e a frase fixa. Sem
 * prosa gerada, e por isso a frase fixa entra aqui tambem -- o caminho
 * degradado nao passa pela costura de `verificacao.ts`.
 */
export function renderizarComparacao(output: unknown): DegradedBlock | null {
  const s = output as Partial<Extract<SaidaDaComparacao, { disponivel: true }>> | null;
  if (!s?.disponivel || !s.pares?.length) return null;
  const rotulo = s.dadoDoWearable === 'passos' ? 'Passos' : 'Sono';
  const linhas = s.pares.flatMap((p) => [
    [s.analito, formatarData(p.exame.dataDaColeta), `${formatarDecimal(p.exame.valor)} ${p.exame.unidade ?? ''}`.trim()]
      .filter(Boolean)
      .join(' — '),
    p.wearable
      ? `${rotulo} de ${formatarData(p.wearable.de)} a ${formatarData(p.wearable.ate)}: ${p.wearable.media}`
      : `${rotulo}: ${p.explicacaoDoWearable ?? 'sem dado nesse período'}`,
  ]);
  return {
    titulo: `${s.analito ?? 'Exame'} e ${rotulo.toLowerCase()}`,
    linhas: [...linhas, TEXTO_DA_COMPARACAO],
    citacoes: s.pares.map((p) => ({
      resultId: p.exame.id,
      documentId: p.exame.documentoId,
      collectedAt: p.exame.dataDaColeta,
    })),
  };
}
