// =============================================================================
// Arquivo: agendaDateRange.ts
// Descricao: Aritmetica de data da Agenda — modulo PURO (sem React, sem Amplify)
// =============================================================================
//
// CONTRATO DE DATA (specs/02-perfil-home-agenda/agenda-navegacao-temporal/spec.md §6):
// `Appointment.scheduledAt` e gravado como "AAAA-MM-DDTHH:mm" — hora LOCAL
// ingenua, sem offset. Pela especificacao do ECMAScript, `new Date()` interpreta
// uma string data-e-hora sem offset como LOCAL, mas uma string so de data como
// UTC. Depender dessa distincao ja produziu um defeito real (o filtro da Home
// escondia compromissos de hoje ainda por vir, em UTC-3). Por isso NENHUM codigo
// de agenda constroi Date a partir de scheduledAt fora de `parseScheduledAt`.
//
// =============================================================================

import type { CalendarDateItem } from '@/types/models';

export type AgendaScope = 'dia' | 'semana' | 'mes' | 'ano';
export type AgendaListOverride = 'proximos' | 'historico';
export type DateRange = { start: Date; end: Date };

const WEEKDAY_LONG_FORMATTER = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
const MONTH_LONG_FORMATTER = new Intl.DateTimeFormat('pt-BR', { month: 'long' });

// Grupos: 1=ano 2=mes 3=dia 4=hora 5=minuto. Hora e minuto sao opcionais (string
// so de data) e segundos, quando presentes, sao ignorados (registros legados).
const SCHEDULED_AT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/;

export function parseScheduledAt(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const match = SCHEDULED_AT_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = match[4] ? Number(match[4]) : 0;
  const minute = match[5] ? Number(match[5]) : 0;

  if (hour > 23 || minute > 59) {
    return null;
  }

  const date = new Date(year, month - 1, day, hour, minute, 0, 0);

  // O construtor normaliza valores fora de faixa em silencio: 2026-02-31 viraria
  // 03/03. Aqui isso e um dado corrompido, nao uma data — rejeitamos.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function buildRange(scope: AgendaScope, anchor: Date): DateRange {
  switch (scope) {
    case 'dia':
      return { start: startOfDay(anchor), end: endOfDay(anchor) };

    case 'semana': {
      // getDay(): 0 = domingo. A semana comeca no domingo (ver Global Constraints).
      const sunday = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - anchor.getDay());
      const saturday = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + 6);
      return { start: startOfDay(sunday), end: endOfDay(saturday) };
    }

    case 'mes': {
      const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      // Dia 0 do mes seguinte = ultimo dia deste mes. Resolve 28/29/30/31 sozinho.
      const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      return { start: startOfDay(first), end: endOfDay(last) };
    }

    case 'ano':
      return {
        start: startOfDay(new Date(anchor.getFullYear(), 0, 1)),
        end: endOfDay(new Date(anchor.getFullYear(), 11, 31)),
      };
  }
}

export function shiftAnchor(scope: AgendaScope, anchor: Date, direction: -1 | 1): Date {
  switch (scope) {
    case 'dia':
      return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + direction);

    case 'semana':
      return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + 7 * direction);

    case 'mes':
      // Ancorar no dia 1 e deliberado: 31/01 + 1 mes com o dia preservado viraria
      // 03/03. Como o periodo cobre o mes inteiro, o dia da ancora e irrelevante.
      return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);

    case 'ano':
      return new Date(anchor.getFullYear() + direction, anchor.getMonth(), 1);
  }
}

export function isDateWithinRange(date: Date, range: DateRange): boolean {
  const time = date.getTime();
  return time >= range.start.getTime() && time <= range.end.getTime();
}

export function isWithinRange(scheduledAt: string, range: DateRange): boolean {
  const date = parseScheduledAt(scheduledAt);
  return date ? isDateWithinRange(date, range) : false;
}

// Devolve null para data invalida: quem chama decide o que fazer com o registro
// corrompido. A Agenda o joga no fim do "Historico", para poder ser excluido —
// um registro que a interface nao alcanca e exatamente o defeito que esta EPIC
// existe para eliminar.
export function isPast(scheduledAt: string, now: Date): boolean | null {
  const date = parseScheduledAt(scheduledAt);
  if (!date) {
    return null;
  }
  return date.getTime() < now.getTime();
}

export function compareScheduled(a: string, b: string): number {
  const dateA = parseScheduledAt(a);
  const dateB = parseScheduledAt(b);

  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;
  if (!dateB) return -1;

  return dateA.getTime() - dateB.getTime();
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatPeriodLabel(scope: AgendaScope, anchor: Date, today: Date): string {
  switch (scope) {
    case 'dia': {
      const dayMonth = `${anchor.getDate()} de ${MONTH_LONG_FORMATTER.format(anchor)}`;
      if (isSameDay(anchor, today)) {
        return `Hoje, ${dayMonth}`;
      }
      return capitalize(`${WEEKDAY_LONG_FORMATTER.format(anchor)}, ${dayMonth}`);
    }

    case 'semana': {
      const { start, end } = buildRange('semana', anchor);
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} a ${end.getDate()} de ${MONTH_LONG_FORMATTER.format(end)}`;
      }
      return (
        `${start.getDate()} de ${MONTH_LONG_FORMATTER.format(start)} a ` +
        `${end.getDate()} de ${MONTH_LONG_FORMATTER.format(end)}`
      );
    }

    case 'mes':
      return `${capitalize(MONTH_LONG_FORMATTER.format(anchor))} de ${anchor.getFullYear()}`;

    case 'ano':
      return String(anchor.getFullYear());
  }
}

export type AgendaMonthCell = {
  month: number;   // 0-11
  label: string;   // "Março"
  count: number;
  isoDate: string; // primeiro dia do mes, para o drill-down
};

const MONTH_SHORT_FORMATTER = new Intl.DateTimeFormat('pt-BR', { month: 'short' });

function formatMonthAbbrev(date: Date): string {
  return MONTH_SHORT_FORMATTER.format(date).replace('.', '').toLowerCase();
}

// Indice absoluto do dia, via Date.UTC — exato e imune a horario de verao, ao
// contrario de dividir a diferenca de milissegundos entre dois Date locais.
function dayIndex(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

function toIsoDateSet(scheduledAtList: string[]): Set<string> {
  const set = new Set<string>();
  for (const value of scheduledAtList) {
    const date = parseScheduledAt(value);
    if (date) {
      set.add(toIsoDate(date));
    }
  }
  return set;
}

function toCell(date: Date, occupied: Set<string>, today: Date): CalendarDateItem {
  const isoDate = toIsoDate(date);
  return {
    isoDate,
    day: date.getDate(),
    month: formatMonthAbbrev(date),
    hasAppointments: occupied.has(isoDate),
    isToday: isoDate === toIsoDate(today),
  };
}

// Blocos de 7 dias ALINHADOS A HOJE: com a ancora em hoje..hoje+6 a faixa e
// exatamente hoje..hoje+6 (identica ao Canvas 2c), e selecionar um dia dentro do
// bloco visivel nunca desloca a faixa debaixo do dedo do usuario.
export function buildDayCells(anchor: Date, scheduledAtList: string[], today: Date): CalendarDateItem[] {
  const occupied = toIsoDateSet(scheduledAtList);
  const offset = dayIndex(anchor) - dayIndex(today);
  const blockStart = Math.floor(offset / 7) * 7;

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + blockStart + index);
    return toCell(date, occupied, today);
  });
}

// A semana do escopo Semana e domingo-sabado da ancora, exatamente o periodo de
// buildRange('semana', anchor) — as celulas marcadas e a lista abaixo delas tem
// de recortar os mesmos sete dias.
export function buildWeekCells(anchor: Date, scheduledAtList: string[], today: Date): CalendarDateItem[] {
  const occupied = toIsoDateSet(scheduledAtList);
  const { start } = buildRange('semana', anchor);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return toCell(date, occupied, today);
  });
}

export function buildMonthCells(
  anchor: Date,
  scheduledAtList: string[],
  today: Date,
): (CalendarDateItem | null)[][] {
  const occupied = toIsoDateSet(scheduledAtList);
  const { start, end } = buildRange('mes', anchor);

  const cells: (CalendarDateItem | null)[] = Array(start.getDay()).fill(null);

  for (let day = 1; day <= end.getDate(); day += 1) {
    cells.push(toCell(new Date(anchor.getFullYear(), anchor.getMonth(), day), occupied, today));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: (CalendarDateItem | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  return weeks;
}

export function buildYearCells(anchor: Date, scheduledAtList: string[]): AgendaMonthCell[] {
  const year = anchor.getFullYear();
  const counts = Array<number>(12).fill(0);

  for (const value of scheduledAtList) {
    const date = parseScheduledAt(value);
    if (date && date.getFullYear() === year) {
      counts[date.getMonth()] += 1;
    }
  }

  return counts.map((count, month) => {
    const first = new Date(year, month, 1);
    return {
      month,
      label: capitalize(MONTH_LONG_FORMATTER.format(first)),
      count,
      isoDate: toIsoDate(first),
    };
  });
}
