/**
 * Resumo do arquivo:
 * As contas sobre a serie diaria do wearable (E6, 6.2): ler o `result.json` que
 * a importacao gravou, recortar dias, tirar a media dos dias com registro,
 * formatar e contar datas. Modulo PURO -- quem le o arquivo e
 * `lerSerieDaImportacao` (`ownerScopedRead.ts`).
 *
 * Um lugar so para essas contas porque duas ferramentas as fazem:
 * `consultar_wearable_dias` (um dia, alguns dias, dois periodos) e
 * `consultar_comparacao` (os 28 dias antes de uma coleta). Duas copias de
 * "media dos dias com registro" acabariam contando o dia sem registro de jeitos
 * diferentes, e a pessoa veria duas medias para o mesmo mes.
 *
 * Datas sao TEXTO `AAAA-MM-DD`, com a conta feita em UTC so para somar dias: a
 * serie ja vem com o dia do calendario da pessoa (`dateKey`), e um `Date` local
 * trocaria o dia perto da meia-noite.
 */
import type { DailySeries } from '../../analyze-health-import/dailyAggregator';
import type { MetricId } from '../../analyze-health-import/metricCatalog';
import { mean } from '../../analyze-health-import/mathUtils';
import { deriveComputedMetrics } from '../../analyze-health-import/summaryBuilder';
import { somarDias } from '../../medicine-schedule-shared/doseSchedule';
import { DIA_DA_SEMANA } from '../contextoDeHoje';
import { formatarInteiro, partesNoFuso } from '../formatoPtBr';

// A soma de dias de calendario ja existe para as doses (E3); uma segunda copia
// divergiria em silencio. Reexportada para quem conta dias da serie.
export { somarDias };

export type MetricaDiaria = 'sono' | 'passos' | 'fc_repouso' | 'fc_media' | 'estresse';

/** A lista FECHADA da entrada (spec, C1.7). O tipo do catalogo faz um id
 *  escrito errado nao compilar. */
export const METRICAS_DIARIAS: Record<MetricaDiaria, MetricId> = {
  sono: 'sleepMinutes',
  passos: 'steps',
  fc_repouso: 'restingHeartRateBpm',
  fc_media: 'heartRateAvgBpm',
  estresse: 'stressScore',
};

export type PontoDiario = { dia: string; valor: number };
export type SerieDiaria = Partial<Record<MetricId, PontoDiario[]>>;

const DIA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * As metricas que o arquivo precisa entregar: as da entrada, e a minima diaria
 * de batimento, de onde sai a FC de repouso. O `result.json` traz umas 29, e
 * guardar todas no cache do turno custaria varios MB de objetos que nenhuma
 * ferramenta le (revisao de eficiencia do E6).
 */
const METRICAS_LIDAS = new Set<string>([...Object.values(METRICAS_DIARIAS), 'heartRateMinBpm']);

/**
 * O `result.json` vira serie, ou `null`. O arquivo e escrito pela nossa funcao
 * de analise, mas mora num bucket e e lido como dado de fora: ponto que nao tem
 * a forma certa e descartado um a um, e nao derruba a serie inteira.
 *
 * A FC de repouso passa por `deriveComputedMetrics`, a MESMA derivacao do
 * resumo da tela (a minima do dia): o arquivo guarda a serie antes dela, e sem
 * isto o chat e a tela dariam numeros diferentes para o mesmo dia (spec, C1.8).
 */
export function serieDoResultado(textoDoArquivo: string): SerieDiaria | null {
  let bruto: unknown;
  try {
    bruto = JSON.parse(textoDoArquivo);
  } catch {
    return null;
  }
  const series = (bruto as { series?: unknown } | null)?.series;
  if (!series || typeof series !== 'object' || Array.isArray(series)) return null;

  const validas: DailySeries = {};
  for (const [metrica, pontos] of Object.entries(series as Record<string, unknown>)) {
    if (!METRICAS_LIDAS.has(metrica) || !Array.isArray(pontos)) continue;
    // Um ponto por dia: o ultimo lido vence. A serie da analise ja vem assim; o
    // mapa so garante que um dia repetido nao conte duas vezes na media.
    const porDia = new Map<string, number>();
    for (const p of pontos as { dateKey?: unknown; value?: unknown }[]) {
      if (typeof p?.dateKey === 'string' && DIA.test(p.dateKey) && typeof p.value === 'number' && Number.isFinite(p.value)) {
        porDia.set(p.dateKey, p.value);
      }
    }
    if (porDia.size === 0) continue;
    validas[metrica as MetricId] = [...porDia.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, value]) => ({ dateKey, value, sampleCount: 1 }));
  }

  const derivada = deriveComputedMetrics(validas);
  const serie: SerieDiaria = {};
  for (const [metrica, pontos] of Object.entries(derivada)) {
    if (pontos?.length) serie[metrica as MetricId] = pontos.map((p) => ({ dia: p.dateKey, valor: p.value }));
  }
  return Object.keys(serie).length ? serie : null;
}

/** Os pontos entre `de` e `ate`, com as duas pontas. */
export function pontosNoIntervalo(pontos: PontoDiario[], de: string, ate: string): PontoDiario[] {
  return pontos.filter((p) => p.dia >= de && p.dia <= ate);
}

/** A media so dos dias COM registro: dia sem ponto nao e zero. */
export function mediaNoIntervalo(
  pontos: PontoDiario[],
  de: string,
  ate: string,
): { dias: number; diasComRegistro: number; media: number | null } {
  const dentro = pontosNoIntervalo(pontos, de, ate);
  return { dias: diasEntre(de, ate), diasComRegistro: dentro.length, media: mean(dentro.map((p) => p.valor)) };
}

/** Minutos em "6 h 40 min" -- o modelo repete, nao converte. */
function duracao(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

const UNIDADE: Record<Exclude<MetricaDiaria, 'sono'>, string> = {
  passos: 'passos',
  fc_repouso: 'bpm',
  fc_media: 'bpm',
  estresse: 'pontos',
};

/** O valor como a pessoa le: sono em horas e minutos, o resto em inteiro. */
export function formatarValorDiario(metrica: MetricaDiaria, valor: number): string {
  const inteiro = Math.round(valor);
  return metrica === 'sono' ? duracao(inteiro) : `${formatarInteiro(inteiro)} ${UNIDADE[metrica]}`;
}

/**
 * A diferenca entre duas medias, em texto neutro. Compara os valores JA
 * arredondados como na exibicao: "7.430 contra 7.430, 0,4 a mais" seria uma
 * diferenca que a pessoa nao consegue ver nos dois numeros.
 */
export function formatarDiferenca(metrica: MetricaDiaria, atual: number, anterior: number): string {
  const delta = Math.round(atual) - Math.round(anterior);
  if (delta === 0) return 'a mesma média nos dois períodos';
  const sentido = delta > 0 ? 'a mais' : 'a menos';
  return `${formatarValorDiario(metrica, Math.abs(delta))} ${sentido} por dia no período atual`;
}

const diaUtc = (dia: string) => Date.parse(`${dia}T00:00:00Z`) / 86_400_000;

/**
 * `AAAA-MM-DD` que existe no calendario: "2026-02-30" tem a forma e nao
 * existe. Sem esta conferencia, `somarDias` de uma data assim lanca, e a
 * leitura do laudo aceita mes 13 (revisao do E6).
 */
export function diaValido(dia: string): boolean {
  if (!DIA.test(dia)) return false;
  const n = diaUtc(dia);
  return Number.isFinite(n) && new Date(n * 86_400_000).toISOString().startsWith(dia);
}

/** Dias de `de` a `ate`, com as duas pontas: `diasEntre(d, d)` e 1. */
export function diasEntre(de: string, ate: string): number {
  return diaUtc(ate) - diaUtc(de) + 1;
}

/** O dia da semana do CALENDARIO, calculado no codigo: o modelo confere a data
 *  que pediu ("ultima quinta") contra isto, em vez de contar sozinho. Em UTC,
 *  porque a data ja e o dia do calendario da pessoa. */
export function diaDaSemana(dia: string): string {
  return DIA_DA_SEMANA[partesNoFuso(new Date(`${dia}T12:00:00Z`), 'UTC').diaDaSemana];
}
