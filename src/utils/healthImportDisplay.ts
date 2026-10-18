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

/** "01/01/2026 a 31/03/2026" a partir de duas datas AAAA-MM-DD; '' sem uma delas. */
export function formatImportPeriod(periodStart: string | null, periodEnd: string | null): string {
  if (!periodStart || !periodEnd) return '';
  const format = (d: string) => {
    const [year, month, day] = d.split('-');
    return `${day}/${month}/${year}`;
  };
  return `${format(periodStart)} a ${format(periodEnd)}`;
}
