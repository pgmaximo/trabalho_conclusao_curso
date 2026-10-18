/**
 * Resumo do arquivo:
 * Como uma importação de wearable é nomeada na tela — o mesmo texto na lista
 * "Suas importações" e no painel que mostra uma delas, para a pessoa
 * reconhecer de uma tela para a outra qual envio está vendo.
 *
 * Como em metricDisplay.ts, NÃO usa toLocaleString: o suporte a locale do
 * Hermes varia por plataforma e versão. A regra é explícita e testada.
 */

function doisDigitos(valor: number): string {
  return String(valor).padStart(2, '0');
}

/**
 * "Importação de 12/10/2026 às 14:32", no fuso do aparelho. A hora entra
 * porque duas importações no mesmo dia teriam o mesmo nome na lista.
 */
export function formatImportLabel(createdAt: string): string {
  const data = new Date(createdAt);
  if (Number.isNaN(data.getTime())) return 'Importação';

  const dia = `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}/${data.getFullYear()}`;
  const hora = `${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`;
  return `Importação de ${dia} às ${hora}`;
}

/**
 * A série mensal de uma métrica como pontos de gráfico, com os meses sem
 * dado preenchidos com `null` entre o primeiro e o último. O backend só
 * manda os meses que têm dado; desenhar o array cru por índice ligava, por
 * exemplo, março/2020 a setembro/2020 numa reta, como se houvesse medição
 * nos meses do meio — interpolação, que a regra 2 da constituição proíbe.
 * Com o `null`, o gráfico quebra o traço ali.
 */
export function monthlyChartPoints(monthly: { month: string; mean: number | null }[]): { dateKey: string; value: number | null }[] {
  const first = monthly[0];
  const last = monthly[monthly.length - 1];
  if (!first || !last) return [];

  const byMonth = new Map(monthly.map((point) => [point.month, point.mean]));
  const points: { dateKey: string; value: number | null }[] = [];
  let [year, month] = first.month.split('-').map(Number) as [number, number];
  const [lastYear, lastMonth] = last.month.split('-').map(Number) as [number, number];
  if (!year || !month || !lastYear || !lastMonth) return [];

  while (year < lastYear || (year === lastYear && month <= lastMonth)) {
    const key = `${year}-${doisDigitos(month)}`;
    points.push({ dateKey: `${key}-01`, value: byMonth.get(key) ?? null });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return points;
}

/** "11/2018" a partir de um dateKey AAAA-MM-DD — rótulo do eixo X dos gráficos mensais. */
export function formatMonthLabel(dateKey?: string): string {
  const [year, month] = (dateKey ?? '').split('-');
  return year && month ? `${month}/${year}` : '';
}

/** "01/01/2026 a 31/03/2026" a partir de duas datas AAAA-MM-DD; '' sem uma delas. */
export function formatImportPeriod(periodStart: string | null, periodEnd: string | null): string {
  if (!periodStart || !periodEnd) return '';
  const format = (d: string) => {
    const [year, month, day] = d.split('-');
    return `${day}/${month}/${year}`;
  };
  return `${format(periodStart)} a ${format(periodEnd)}`;
}
