// =============================================================================
// Arquivo: homeAppointments.ts
// Descricao: Selecao e resumo de compromissos da Home — modulo PURO
// =============================================================================
//
// Sem React, sem Amplify. O instante de referencia (`now`) e sempre injetado,
// nunca lido do relogio aqui dentro: e o que permite testar os cenarios de fuso
// sem relogio falso e sem renderizar tela.
//
// Toda leitura de `scheduledAt` passa por `parseScheduledAt`. O motivo esta
// documentado em agendaDateRange.ts: a string e local ingenua, sem offset, e
// compara-la com `new Date().toISOString()` escondia da Home todo compromisso
// das proximas tres horas (spec.md §2.1, D1).
//
// =============================================================================

import { compareScheduled, isPast, parseScheduledAt } from '@/services/agendaDateRange';

export type HomeAppointment = {
  scheduledAt: string;
  time: string;
};

export function isSameCalendarDay(scheduledAt: string, reference: Date): boolean {
  const date = parseScheduledAt(scheduledAt);
  if (!date) {
    // Uma data ilegivel nao e "o mesmo dia" que coisa nenhuma.
    return false;
  }

  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

// `=== false` e nao `!isPast(...)`: `isPast` devolve `boolean | null`, e `!null`
// e `true`, o que deixaria um registro com data corrompida entrar na Home com
// data ilegivel. E o oposto do `!== false` que a Agenda usa no modo "Historico",
// e os dois estao certos — a Home e vitrine, o Historico e a ferramenta de
// recuperacao (ver AgendaScreen.tsx).
function ehFuturo(appointment: HomeAppointment, now: Date): boolean {
  return isPast(appointment.scheduledAt, now) === false;
}

export function selectUpcomingAppointments<T extends HomeAppointment>(
  appointments: T[],
  now: Date,
  limit: number,
): T[] {
  return appointments
    .filter((appointment) => ehFuturo(appointment, now))
    .sort((a, b) => compareScheduled(a.scheduledAt, b.scheduledAt))
    .slice(0, limit);
}

export function selectTodayUpcoming<T extends HomeAppointment>(appointments: T[], now: Date): T[] {
  return appointments
    .filter((appointment) => isSameCalendarDay(appointment.scheduledAt, now) && ehFuturo(appointment, now))
    .sort((a, b) => compareScheduled(a.scheduledAt, b.scheduledAt));
}

function resumoDoQueFalta(todayUpcoming: HomeAppointment[]): string {
  if (todayUpcoming.length === 0) {
    // DECISION (spec plan.md §4): quando havia compromissos hoje mas todos ja
    // passaram, reaproveitamos este mesmo texto. Distinguir "nao havia nada" de
    // "ja passou tudo" exigiria uma terceira frase fora do Canvas, e o card se
    // chama "Resumo de hoje" — ele responde ao que ainda esta pela frente.
    return 'Nenhum compromisso ou pendência para hoje.';
  }

  const [next] = todayUpcoming;
  const label = todayUpcoming.length === 1 ? 'consulta' : 'consultas';

  return `${todayUpcoming.length} ${label} às ${next.time}`;
}

export function buildTodaySummaryText(appointments: HomeAppointment[], now: Date): string {
  return resumoDoQueFalta(selectTodayUpcoming(appointments, now));
}

export function buildDashboardTodaySummary(
  appointments: HomeAppointment[],
  pendingMedicines: number,
  now: Date,
): string {
  // Filtra UMA vez e reaproveita: a versao anterior refazia o filtro para saber
  // se havia compromissos, e as duas contas podiam discordar.
  const todayUpcoming = selectTodayUpcoming(appointments, now);
  const appointmentText = resumoDoQueFalta(todayUpcoming);

  const medicineText =
    pendingMedicines > 0
      ? `${pendingMedicines} medicamento${pendingMedicines === 1 ? '' : 's'} pendente${pendingMedicines === 1 ? '' : 's'}`
      : '';

  if (todayUpcoming.length === 0) {
    return medicineText || appointmentText;
  }

  return medicineText ? `${appointmentText} · ${medicineText}` : appointmentText;
}
