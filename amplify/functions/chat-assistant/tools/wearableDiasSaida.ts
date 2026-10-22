/**
 * Resumo do arquivo:
 * A saida de `consultar_wearable_dias` (E6): um recorte dia a dia (6.2) ou dois
 * periodos lado a lado (6.1, D6.3 = A), sobre a serie ja lida. Modulo puro --
 * quem le a importacao e o arquivo e `wearableDias.ts`; as contas sao de
 * `serieDiaria.ts`.
 *
 * A DATA DE HOJE NAO ENTRA AQUI. A importacao e manual e os dados param no dia
 * da exportacao (spec do E6, secao 2): "os ultimos 7 dias" sao os 7 ate o fim
 * dos dados, e um pedido depois dele e ausencia com a data e o caminho para
 * importar de novo. Contar ate hoje daria "sem registro" em quase todo pedido,
 * e a pessoa concluiria que o relogio nao gravou nada.
 *
 * A diferenca entre dois periodos sai pronta e neutra ("32 min a mais por dia
 * no periodo atual"). Quem diz se isso e bom ou ruim e o profissional; o
 * modelo so repete.
 */
import { getMetric } from '../../analyze-health-import/metricCatalog';
import { formatarData } from '../formatoPtBr';
import { caminhoDaTela } from '../mapaDoApp';
import type { DegradedBlock } from '../types';
import {
  diaDaSemana,
  diasEntre,
  formatarDiferenca,
  formatarValorDiario,
  mediaNoIntervalo,
  METRICAS_DIARIAS,
  somarDias,
  type MetricaDiaria,
  type PontoDiario,
  type SerieDiaria,
} from './serieDiaria';

export const MAX_DIAS_LISTADOS = 14;
export const DIAS_PADRAO = 7;
export const DIAS_DA_COMPARACAO = 30;
/** Abaixo disto (ou de metade dos dias do periodo), a media seria de poucas
 *  noites e pareceria a do periodo inteiro. */
export const MIN_DIAS_COM_REGISTRO = 7;

export type PedidoDeDias = {
  metrica: MetricaDiaria;
  de?: string;
  ate?: string;
  comparar?: boolean;
  compararDe?: string;
  compararAte?: string;
};

/** De quando a quando vao os dados da importacao (`periodStart`/`periodEnd`). */
export type PeriodoDaSerie = { inicio: string; fim: string };

type Comum = {
  /** O nome da metrica como a tela o mostra, do catalogo da importacao. */
  metrica: string;
  dadosDesde: string;
  dadosAte: string;
  comoAtualizar: string;
  notaDoSono?: string;
};

type DiaDaSaida = { dia: string; diaDaSemana: string; valor?: string; semRegistro?: true };

type BlocoDoPeriodo = {
  de: string;
  ate: string;
  dias: number;
  diasComRegistro: number;
  media: string | null;
  semMediaPorque?: string;
};

export type SaidaDeDias =
  | (Comum & {
      disponivel: true;
      tipo: 'dias';
      de: string;
      ate: string;
      dias: DiaDaSaida[];
      resumo: { media: string | null; diasComRegistro: number; dias: number; semMediaPorque?: string };
      diasOmitidos: number;
      diasDepoisDosDados: number;
    })
  | (Comum & {
      disponivel: true;
      tipo: 'periodos';
      atual: BlocoDoPeriodo;
      anterior: BlocoDoPeriodo;
      diferenca: string | null;
      aviso: string | null;
      diasDepoisDosDados: number;
    })
  | (Comum & { disponivel: false; explicacao: string });

const NOTA_DO_SONO = 'O sono de um dia é a noite que terminou na manhã daquele dia.';

const rotulo = (metrica: MetricaDiaria) => getMetric(METRICAS_DIARIAS[metrica]).label;

function comum(pedido: PedidoDeDias, periodo: PeriodoDaSerie): Comum {
  return {
    metrica: rotulo(pedido.metrica),
    dadosDesde: periodo.inicio,
    dadosAte: periodo.fim,
    comoAtualizar:
      `Para ver dias depois de ${formatarData(periodo.fim)}, exporte de novo do app de saúde do celular ` +
      `e importe em ${caminhoDaTela('import-health-data')}.`,
    ...(pedido.metrica === 'sono' ? { notaDoSono: NOTA_DO_SONO } : {}),
  };
}

function foraDosDados(base: Comum): SaidaDeDias {
  return {
    ...base,
    disponivel: false,
    explicacao:
      `Os dados de ${base.metrica.toLowerCase()} vêm da última importação, e vão de ` +
      `${formatarData(base.dadosDesde)} a ${formatarData(base.dadosAte)}. ${base.comoAtualizar}`,
  };
}

/** O intervalo pedido, cortado ao periodo dos dados; `null` se nao toca nele. */
function cortar(de: string, ate: string, periodo: PeriodoDaSerie): { de: string; ate: string } | null {
  if (de > periodo.fim || ate < periodo.inicio) return null;
  return { de: de < periodo.inicio ? periodo.inicio : de, ate: ate > periodo.fim ? periodo.fim : ate };
}

export function montarSaidaDeDias(serie: SerieDiaria, periodo: PeriodoDaSerie, pedido: PedidoDeDias): SaidaDeDias {
  const base = comum(pedido, periodo);
  const pontos = serie[METRICAS_DIARIAS[pedido.metrica]];
  if (!pontos?.length) {
    return { ...base, disponivel: false, explicacao: `Esta importação não trouxe ${base.metrica.toLowerCase()}.` };
  }
  return pedido.comparar || pedido.compararDe
    ? montarPeriodos(pontos, periodo, pedido, base)
    : montarRecorte(pontos, periodo, pedido, base);
}

function montarRecorte(pontos: PontoDiario[], periodo: PeriodoDaSerie, pedido: PedidoDeDias, base: Comum): SaidaDeDias {
  const ate = pedido.ate ?? pedido.de ?? periodo.fim;
  const de = pedido.de ?? somarDias(ate, -(DIAS_PADRAO - 1));
  const recorte = cortar(de, ate, periodo);
  if (!recorte) return foraDosDados(base);

  const valorDoDia = new Map(pontos.map((p) => [p.dia, p.valor]));
  const inicioDaLista = maior(recorte.de, somarDias(recorte.ate, -(MAX_DIAS_LISTADOS - 1)));
  const dias: DiaDaSaida[] = [];
  for (let d = inicioDaLista; d <= recorte.ate; d = somarDias(d, 1)) {
    const valor = valorDoDia.get(d);
    dias.push({
      dia: d,
      diaDaSemana: diaDaSemana(d),
      ...(valor === undefined ? { semRegistro: true as const } : { valor: formatarValorDiario(pedido.metrica, valor) }),
    });
  }

  // O resumo do recorte pede so metade dos dias com registro (minimo 0): os
  // dias ja vem listados, e o minimo de 7 dos periodos apagaria a media de uma
  // semana com uma noite sem registro. Sem regua nenhuma, uma noite viraria "a
  // media das duas semanas" (code-review do E6).
  const { bloco: resumo } = bloco(pontos, recorte, pedido.metrica, base.metrica.toLowerCase(), 0);
  const { de: _de, ate: _ate, ...semDatas } = resumo;
  return {
    ...base,
    disponivel: true,
    tipo: 'dias',
    de: recorte.de,
    ate: recorte.ate,
    dias,
    resumo: semDatas,
    diasOmitidos: diasEntre(recorte.de, inicioDaLista) - 1,
    diasDepoisDosDados: diasDepois(ate, periodo),
  };
}

/** Quantos dias pedidos ficaram depois do fim dos dados. */
const diasDepois = (ate: string, periodo: PeriodoDaSerie) => (ate > periodo.fim ? diasEntre(periodo.fim, ate) - 1 : 0);

const maior = (a: string, b: string) => (a > b ? a : b);

/**
 * A media de um periodo, e a regua que diz se ela serve: ao menos metade dos
 * dias com registro, e ao menos `minimo` dias. Uma funcao so para o resumo do
 * recorte (minimo 0) e para os periodos (`MIN_DIAS_COM_REGISTRO`), para as duas
 * reguas nao divergirem sem ninguem ver. A media crua volta a parte: so a
 * diferenca a usa, e ela nunca vai ao modelo.
 */
function bloco(
  pontos: PontoDiario[],
  { de, ate }: { de: string; ate: string },
  metrica: MetricaDiaria,
  rotuloMinusculo: string,
  minimo: number,
): { bloco: BlocoDoPeriodo; media: number | null } {
  const { dias, diasComRegistro, media } = mediaNoIntervalo(pontos, de, ate);
  if (media !== null && diasComRegistro >= minimo && diasComRegistro * 2 >= dias) {
    return { bloco: { de, ate, dias, diasComRegistro, media: formatarValorDiario(metrica, media) }, media };
  }
  const semMediaPorque = `Só ${diasComRegistro} de ${dias} dias tiveram registro de ${rotuloMinusculo} neste período, poucos para uma média.`;
  return { bloco: { de, ate, dias, diasComRegistro, media: null, semMediaPorque }, media: null };
}

/** Periodo do qual a importacao nao tem nenhum dia. */
const blocoVazio = (de: string, ate: string): { bloco: BlocoDoPeriodo; media: null } => ({
  bloco: { de, ate, dias: 0, diasComRegistro: 0, media: null, semMediaPorque: 'A importação não tem dados deste período.' },
  media: null,
});

function montarPeriodos(pontos: PontoDiario[], periodo: PeriodoDaSerie, pedido: PedidoDeDias, base: Comum): SaidaDeDias {
  const ateAtual = pedido.ate ?? periodo.fim;
  const deAtual = pedido.de ?? somarDias(ateAtual, -(DIAS_DA_COMPARACAO - 1));
  const atualCortado = cortar(deAtual, ateAtual, periodo);
  if (!atualCortado) return foraDosDados(base);

  // O anterior tem o MESMO numero de dias do atual, logo antes dele -- a nao
  // ser que a pessoa tenha pedido outro. Ele tambem e cortado aos dados, e o
  // corte o deixa menor: isso vira aviso, nunca uma media de poucos dias
  // apresentada como a do periodo.
  const tamanho = diasEntre(atualCortado.de, atualCortado.ate);
  const deAnterior = pedido.compararDe ?? somarDias(atualCortado.de, -tamanho);
  const ateAnterior = pedido.compararAte ?? somarDias(atualCortado.de, -1);
  const anteriorCortado = cortar(deAnterior, ateAnterior, periodo);

  const nome = base.metrica.toLowerCase();
  const atual = bloco(pontos, atualCortado, pedido.metrica, nome, MIN_DIAS_COM_REGISTRO);
  const anterior = anteriorCortado
    ? bloco(pontos, anteriorCortado, pedido.metrica, nome, MIN_DIAS_COM_REGISTRO)
    : blocoVazio(deAnterior, ateAnterior);

  let aviso: string | null = null;
  if (anterior.bloco.dias === 0) {
    // O motivo depende de quem escolheu o periodo: o pedido pode estar depois
    // dos dados, e "nao tem dias antes" seria falso (code-review do E6).
    aviso = pedido.compararDe
      ? `O período pedido para comparar fica fora dos dados da importação, que vão de ${formatarData(periodo.inicio)} a ${formatarData(periodo.fim)}.`
      : `A importação não tem dias antes de ${formatarData(atual.bloco.de)}, e por isso não há período anterior para comparar.`;
  } else if (anterior.bloco.ate >= atual.bloco.de && anterior.bloco.de <= atual.bloco.ate) {
    aviso = 'Os dois períodos têm dias em comum, e por isso não são comparados.';
  } else if (anterior.bloco.dias !== atual.bloco.dias) {
    aviso = `Os dois períodos têm números de dias diferentes (${atual.bloco.dias} e ${anterior.bloco.dias}), e não são diretamente comparáveis.`;
  }

  const diferenca =
    aviso === null && atual.media !== null && anterior.media !== null
      ? formatarDiferenca(pedido.metrica, atual.media, anterior.media)
      : null;

  return {
    ...base,
    disponivel: true,
    tipo: 'periodos',
    atual: atual.bloco,
    anterior: anterior.bloco,
    diferenca,
    aviso,
    diasDepoisDosDados: diasDepois(ateAtual, periodo),
  };
}

const linhaDoPeriodo = (nome: string, b: BlocoDoPeriodo) =>
  `${nome}, de ${formatarData(b.de)} a ${formatarData(b.ate)}: ` +
  (b.media ? `${b.media} por dia (${b.diasComRegistro} dias com registro)` : 'sem média');

/**
 * O modo degradado (D31): os dias, ou os dois periodos e a diferenca, sem
 * prosa gerada. A linha de "ate quando" entra sempre: e o aviso que mais
 * importa quando os dados nao sao de hoje.
 */
export function renderizarWearableDias(output: unknown): DegradedBlock | null {
  const s = output as SaidaDeDias | null;
  if (!s?.disponivel) return null;
  const ateQuando = `Dados da última importação, até ${formatarData(s.dadosAte)}`;
  if (s.tipo === 'dias') {
    return {
      titulo: s.metrica,
      linhas: [
        ...s.dias.map((d) => `${d.diaDaSemana}, ${formatarData(d.dia)}: ${d.valor ?? 'sem registro'}`),
        ateQuando,
      ],
      citacoes: [],
    };
  }
  return {
    titulo: s.metrica,
    linhas: [
      linhaDoPeriodo('Período atual', s.atual),
      linhaDoPeriodo('Período anterior', s.anterior),
      ...(s.diferenca ? [`Diferença: ${s.diferenca}`] : []),
      ...(s.aviso ? [s.aviso] : []),
      ateQuando,
    ],
    citacoes: [],
  };
}
