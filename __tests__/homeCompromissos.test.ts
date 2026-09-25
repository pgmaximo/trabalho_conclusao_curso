import {
  buildDashboardTodaySummary,
  buildTodaySummaryText,
  isSameCalendarDay,
  selectUpcomingAppointments,
} from '@/services/homeAppointments';

// Constrói "AAAA-MM-DDTHH:mm" a partir de componentes LOCAIS, no mesmo dia de
// `referencia`. Nunca escrever a string à mão: uma string fixa amarraria a
// suíte a UTC-3 e passaria a falhar em qualquer outra máquina.
function noMesmoDia(referencia: Date, hora: number, minuto = 0): string {
  const d = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate(), hora, minuto);
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${ano}-${mes}-${dia}T${hh}:${mm}`;
}

function emDias(referencia: Date, offset: number, hora: number): string {
  const d = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate() + offset);
  return noMesmoDia(d, hora);
}

const AGORA = new Date(2026, 8, 18, 14, 0); // 18/09/2026, 14:00 LOCAL

function compromisso(scheduledAt: string, time: string) {
  return { scheduledAt, time };
}

describe('selectUpcomingAppointments', () => {
  it('inclui um compromisso de hoje daqui a duas horas — o defeito relatado', () => {
    // Com a comparação antiga (scheduledAt >= new Date().toISOString()), em UTC-3
    // "2026-09-18T16:00" perde para "2026-09-18T17:00:00.000Z" e este compromisso
    // sumia da Home faltando duas horas para ele.
    const lista = [compromisso(noMesmoDia(AGORA, 16), '16:00')];

    const resultado = selectUpcomingAppointments(lista, AGORA, 2);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].time).toBe('16:00');
  });

  it('exclui um compromisso de hoje que ja passou', () => {
    const lista = [compromisso(noMesmoDia(AGORA, 9), '09:00')];

    expect(selectUpcomingAppointments(lista, AGORA, 2)).toHaveLength(0);
  });

  it('ordena do mais proximo ao mais distante e respeita o limite', () => {
    const lista = [
      compromisso(emDias(AGORA, 5, 8), '08:00'),
      compromisso(noMesmoDia(AGORA, 16), '16:00'),
      compromisso(emDias(AGORA, 1, 10), '10:00'),
    ];

    const resultado = selectUpcomingAppointments(lista, AGORA, 2);

    expect(resultado.map((item) => item.time)).toEqual(['16:00', '10:00']);
  });

  it('omite registro com data corrompida em vez de deixa-lo entrar', () => {
    // `!isPast(...)` deixaria este passar, porque !null é true.
    const lista = [compromisso('lixo', '??:??'), compromisso(noMesmoDia(AGORA, 16), '16:00')];

    const resultado = selectUpcomingAppointments(lista, AGORA, 2);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].time).toBe('16:00');
  });
});

describe('isSameCalendarDay', () => {
  it('reconhece o mesmo dia local', () => {
    expect(isSameCalendarDay(noMesmoDia(AGORA, 9), AGORA)).toBe(true);
  });

  it('nao confunde o dia seguinte', () => {
    expect(isSameCalendarDay(emDias(AGORA, 1, 9), AGORA)).toBe(false);
  });

  it('devolve false para data invalida', () => {
    expect(isSameCalendarDay('lixo', AGORA)).toBe(false);
  });
});

describe('buildTodaySummaryText', () => {
  it('nao cita um compromisso de hoje que ja passou', () => {
    const noite = new Date(2026, 8, 18, 20, 0);
    const lista = [compromisso(noMesmoDia(noite, 15), '15:00')];

    expect(buildTodaySummaryText(lista, noite)).toBe('Nenhum compromisso ou pendência para hoje.');
  });

  it('conta so o que falta e cita o proximo horario', () => {
    const manha = new Date(2026, 8, 18, 10, 0);
    const lista = [
      compromisso(noMesmoDia(manha, 9), '09:00'),
      compromisso(noMesmoDia(manha, 15), '15:00'),
    ];

    expect(buildTodaySummaryText(lista, manha)).toBe('1 consulta às 15:00');
  });

  it('pluraliza quando ha mais de um por vir', () => {
    const manha = new Date(2026, 8, 18, 10, 0);
    const lista = [
      compromisso(noMesmoDia(manha, 15), '15:00'),
      compromisso(noMesmoDia(manha, 18), '18:00'),
    ];

    expect(buildTodaySummaryText(lista, manha)).toBe('2 consultas às 15:00');
  });

  it('ignora compromissos de outros dias', () => {
    const lista = [compromisso(emDias(AGORA, 1, 10), '10:00')];

    expect(buildTodaySummaryText(lista, AGORA)).toBe('Nenhum compromisso ou pendência para hoje.');
  });
});

describe('buildDashboardTodaySummary', () => {
  it('compoe as duas clausulas quando ha compromisso por vir e remedio pendente', () => {
    const lista = [compromisso(noMesmoDia(AGORA, 16), '16:00')];

    expect(buildDashboardTodaySummary(lista, 2, AGORA)).toBe('1 consulta às 16:00 · 2 medicamentos pendentes');
  });

  it('mostra so os medicamentos quando todos os compromissos de hoje ja passaram', () => {
    const noite = new Date(2026, 8, 18, 20, 0);
    const lista = [compromisso(noMesmoDia(noite, 15), '15:00')];

    expect(buildDashboardTodaySummary(lista, 1, noite)).toBe('1 medicamento pendente');
  });

  it('cai no texto de dia vazio quando nao ha nem compromisso por vir nem remedio', () => {
    const noite = new Date(2026, 8, 18, 20, 0);
    const lista = [compromisso(noMesmoDia(noite, 15), '15:00')];

    expect(buildDashboardTodaySummary(lista, 0, noite)).toBe('Nenhum compromisso ou pendência para hoje.');
  });
});
