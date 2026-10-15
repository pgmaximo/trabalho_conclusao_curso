// =============================================================================
// Arquivo: agendaTimeline.ts
// Descricao: Achatamento da agenda numa lista de linhas tipadas — modulo PURO
// =============================================================================
//
// Por que linhas achatadas e nao secoes: a tela abre ancorada em hoje, o que
// exige rolar ate um indice. Calcular esse indice em cima de `SectionList` e
// fragil (o indice intercala cabecalhos, rodapes e separadores), e a
// biblioteca que resolve isso esta fora de cogitacao pela regra 3 da
// constituicao. Achatando, a ancoragem vira logica pura — `findTodayRowIndex`
// — que um teste verifica sem renderizar nada.
//
// `now` e sempre injetado: e o que torna os cenarios de virada de dia testaveis
// sem relogio falso.
//
// =============================================================================

import { compareScheduled, isPast, parseScheduledAt, toIsoDate } from '@/services/agendaDateRange';

export type TimelineAppointment = { scheduledAt: string };

export type TimelineRow<T> =
  | { kind: 'header'; key: string; label: string; isToday: boolean; isPast: boolean }
  | { kind: 'card'; key: string; appointment: T; isPast: boolean }
  | { kind: 'todayEmpty'; key: string }
  | { kind: 'futureEmpty'; key: string };

const WEEKDAY_LONG_FORMATTER = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
const MONTH_LONG_FORMATTER = new Intl.DateTimeFormat('pt-BR', { month: 'long' });

const ROTULO_DATA_INVALIDA = 'Data inválida';

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDayLabel(date: Date, now: Date): string {
  const hojeIso = toIsoDate(now);
  const amanha = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const iso = toIsoDate(date);

  if (iso === hojeIso) return 'Hoje';
  if (iso === toIsoDate(amanha)) return 'Amanhã';

  const diaMes = `${date.getDate()} de ${MONTH_LONG_FORMATTER.format(date)}`;
  const base = capitalize(`${WEEKDAY_LONG_FORMATTER.format(date)}, ${diaMes}`);

  return date.getFullYear() === now.getFullYear() ? base : `${base} de ${date.getFullYear()}`;
}

export function buildTimelineRows<T extends TimelineAppointment>(
  appointments: T[],
  now: Date,
): TimelineRow<T>[] {
  if (appointments.length === 0) {
    // Sem nenhum compromisso a tela mostra o estado de primeira vez, que nao e
    // uma lista — por isso nem a secao de hoje entra aqui.
    return [];
  }

  const validos: T[] = [];
  const invalidos: T[] = [];

  for (const appointment of appointments) {
    if (parseScheduledAt(appointment.scheduledAt)) {
      validos.push(appointment);
    } else {
      invalidos.push(appointment);
    }
  }

  validos.sort((a, b) => compareScheduled(a.scheduledAt, b.scheduledAt));

  const hojeIso = toIsoDate(now);
  const rows: TimelineRow<T>[] = [];
  let hojeInserido = false;
  let temFuturo = false;
  let isoAtual: string | null = null;

  function inserirCabecalhoDeHoje() {
    rows.push({ kind: 'header', key: `header-${hojeIso}`, label: 'Hoje', isToday: true, isPast: false });
    rows.push({ kind: 'todayEmpty', key: 'todayEmpty' });
    hojeInserido = true;
  }

  for (const appointment of validos) {
    const date = parseScheduledAt(appointment.scheduledAt) as Date;
    const iso = toIsoDate(date);
    const passado = iso < hojeIso;

    // `temFuturo` responde "ainda ha algo pela frente?", que e pergunta de HORA, nao
    // de dia: um compromisso hoje as 09:00 ja passou quando sao 14:00. `passado`
    // acima continua em granularidade de dia de proposito — ele governa a atenuacao
    // visual da secao inteira, e atenuar por hora faria um compromisso da manha
    // escurecer enquanto o resto da secao de hoje segue normal.
    // `=== false` e nao `!isPast(...)`: `isPast` devolve `boolean | null`, e `null`
    // (data corrompida) nao e futuro.
    if (isPast(appointment.scheduledAt, now) === false) {
      temFuturo = true;
    }

    // A secao de hoje entra antes do primeiro compromisso futuro, quando hoje
    // nao tem nenhum: e ela que ancora a rolagem e comunica "nada hoje".
    if (!hojeInserido && iso > hojeIso) {
      inserirCabecalhoDeHoje();
    }

    if (iso !== isoAtual) {
      isoAtual = iso;
      const isToday = iso === hojeIso;
      if (isToday) {
        hojeInserido = true;
      }
      rows.push({
        kind: 'header',
        key: `header-${iso}`,
        label: formatDayLabel(date, now),
        isToday,
        isPast: passado,
      });
    }

    rows.push({ kind: 'card', key: `card-${iso}-${rows.length}`, appointment, isPast: passado });
  }

  if (!hojeInserido) {
    inserirCabecalhoDeHoje();
  }

  if (!temFuturo) {
    rows.push({ kind: 'futureEmpty', key: 'futureEmpty' });
  }

  if (invalidos.length > 0) {
    rows.push({
      kind: 'header',
      key: 'header-invalido',
      label: ROTULO_DATA_INVALIDA,
      isToday: false,
      isPast: false,
    });

    invalidos.forEach((appointment, index) => {
      rows.push({ kind: 'card', key: `card-invalido-${index}`, appointment, isPast: false });
    });
  }

  return rows;
}

export function findTodayRowIndex(rows: TimelineRow<unknown>[]): number {
  return rows.findIndex((row) => row.kind === 'header' && row.isToday);
}
