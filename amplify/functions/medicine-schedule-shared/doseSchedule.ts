/**
 * Resumo do arquivo:
 * A regra que diz QUAIS horarios de um remedio eram esperados num dia: inicio,
 * termino, `active`, dias da semana e a expansao de "a cada X horas". Fonte
 * unica (E3): a tela de Medicamentos a usa por `src/utils/medicineSchedule.ts`,
 * que so reexporta, e o chat a usa em `consultar_doses_tomadas`. Duas copias
 * contariam horarios diferentes, e o chat diria "sem marcacao" para um horario
 * que a tela nem mostra -- a Lambda de lembretes ainda tem uma copia propria, e
 * ela ja diverge desta (divida registrada na spec do E3, fora do escopo).
 *
 * Mora em `amplify/functions/` porque a Lambda nao empacota `src/` (o alias `@/`
 * nem existe la); o app importa daqui, como ja faz com as interacoes (E9).
 */

/** O minimo da linha do remedio que a regra le. Estrutural de proposito: serve
 *  tanto ao `MedicineRecord` do app quanto a linha crua do DynamoDB. */
export type RemedioComAgenda = {
  active?: boolean | null;
  startDate: string;
  endDate?: string | null;
  frequencyType?: string | null;
  weekDays?: readonly string[] | null;
  intervalHours?: number | null;
  times: readonly string[];
};

const WEEKDAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// Quanto tempo depois do horário uma dose ainda não tomada passa a ser mostrada
// como atrasada. Uma hora é a janela usual para considerar um remédio "tomado
// na hora"; marcar atraso no minuto seguinte ao horário só assustaria.
export const LATE_DOSE_TOLERANCE_MINUTES = 60;

/**
 * "08:30" -> 510. A hora pode vir sem o zero ("8:30"): o formulario grava hh:mm,
 * mas um registro antigo pode nao ter, e lido como ilegivel ele nunca ficava
 * atrasado (revisao do E3). Minuto acima de 59 e hora acima de 23 voltam null,
 * nunca um numero -- "08:60" seria lido como 09:00.
 */
export function minutesFromTime(time: string): number | null {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(time);
  if (!match || Number(match[1]) > 23) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Ja passou do horario alem da tolerancia? `minutosAgora` sao os minutos desde a
 * meia-noite no relogio de quem pergunta: a tela le o do aparelho; o chat, o do
 * fuso da pessoa. Horario ilegivel nunca passou -- marcar atraso num horario que
 * nao se sabe ler so assustaria.
 */
export function passouDaTolerancia(
  time: string,
  minutosAgora: number,
  toleranceMinutes: number = LATE_DOSE_TOLERANCE_MINUTES,
): boolean {
  const scheduled = minutesFromTime(time);
  return scheduled !== null && minutosAgora - scheduled > toleranceMinutes;
}

/**
 * Os horarios do campo antigo `takenToday` quando ele e de HOJE (D3.1 do E3).
 * Malformado, de outro dia ou ausente nao marca nada. O JSON e
 * {"date":"YYYY-MM-DD","times":["08:00"]} (schema `Medicine`).
 */
export function horariosMarcadosNoCampoAntigo(takenToday: unknown, today: string): Set<string> {
  if (typeof takenToday !== 'string' || takenToday === '') return new Set();
  try {
    const parsed = JSON.parse(takenToday) as { date?: unknown; times?: unknown };
    return parsed.date === today && Array.isArray(parsed.times) ? new Set(parsed.times.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function daysBetween(start: string, end: string): number {
  return Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
}

/** AAAA-MM-DD mais `n` dias. Em UTC: e aritmetica de calendario, e o fuso do
 *  processo nao pode desloca-la. */
export function somarDias(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * O codigo do dia da semana ("MON"...) de uma data. Em UTC, e nao no fuso
 * local: a data e um dia de calendario, e o fuso do processo (UTC na Lambda,
 * Brasilia no aparelho) nao pode mudar o dia da semana dela.
 */
export function codigoDoDia(date: string): string {
  return WEEKDAY_CODES[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

export function isMedicineScheduledOnDate(medicine: RemedioComAgenda, date: string): boolean {
  if (!medicine.active || medicine.startDate > date || (medicine.endDate && medicine.endDate < date)) return false;
  if (medicine.frequencyType !== 'SPECIFIC_DAYS') return true;
  return (medicine.weekDays ?? []).includes(codigoDoDia(date));
}

/**
 * Retorna os horarios reais previstos para um dia, inclusive "a cada X horas".
 * Sem repeticao: o formulario recusa horario duplicado, mas uma linha antiga com
 * ['08:00', '08:00'] daria duas doses no mesmo horario -- na tela, com a mesma
 * chave; no chat, contadas duas vezes.
 */
export function getMedicineDoseTimesForDate(medicine: RemedioComAgenda, date: string): string[] {
  if (!isMedicineScheduledOnDate(medicine, date)) return [];
  if (medicine.frequencyType !== 'EVERY_X_HOURS') return [...new Set(medicine.times)].sort();

  const intervalMinutes = (medicine.intervalHours ?? 0) * 60;
  const anchor = medicine.times[0];
  const anchorMinutes = anchor ? minutesFromTime(anchor) : null;
  if (!intervalMinutes || anchorMinutes === null) return [];

  const elapsedBeforeDate = daysBetween(medicine.startDate, date) * 24 * 60;
  if (elapsedBeforeDate < 0) return [];
  const times: string[] = [];
  for (let minute = 0; minute < 24 * 60; minute += 1) {
    const elapsed = elapsedBeforeDate + minute - anchorMinutes;
    if (elapsed >= 0 && elapsed % intervalMinutes === 0) {
      times.push(`${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`);
    }
  }
  return times;
}
