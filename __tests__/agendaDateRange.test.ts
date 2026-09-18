import {
  buildRange,
  compareScheduled,
  formatPeriodLabel,
  isPast,
  isWithinRange,
  parseScheduledAt,
  shiftAnchor,
  toIsoDate,
} from '@/services/agendaDateRange';

describe('parseScheduledAt', () => {
  it('interpreta a string sem offset como horario LOCAL', () => {
    const date = parseScheduledAt('2026-10-01T09:00');
    expect(date).not.toBeNull();
    expect(date!.getFullYear()).toBe(2026);
    expect(date!.getMonth()).toBe(9); // outubro
    expect(date!.getDate()).toBe(1);
    expect(date!.getHours()).toBe(9);
    expect(date!.getMinutes()).toBe(0);
  });

  it('aceita string apenas de data, assumindo meia-noite local', () => {
    const date = parseScheduledAt('2026-10-01');
    expect(date!.getDate()).toBe(1);
    expect(date!.getHours()).toBe(0);
  });

  it('tolera segundos no fim da string (registros legados)', () => {
    const date = parseScheduledAt('2026-09-02T15:00:00');
    expect(date!.getHours()).toBe(15);
  });

  it('devolve null para entrada vazia, malformada ou data inexistente', () => {
    expect(parseScheduledAt('')).toBeNull();
    expect(parseScheduledAt(null)).toBeNull();
    expect(parseScheduledAt('lixo')).toBeNull();
    expect(parseScheduledAt('2026-02-31T10:00')).toBeNull();
    expect(parseScheduledAt('2026-13-01T10:00')).toBeNull();
  });
});

describe('buildRange', () => {
  it('dia: cobre de 00:00:00.000 a 23:59:59.999', () => {
    const range = buildRange('dia', new Date(2026, 8, 18, 15, 30));
    expect(range.start.getHours()).toBe(0);
    expect(range.end.getHours()).toBe(23);
    expect(range.end.getMilliseconds()).toBe(999);
    expect(range.start.getDate()).toBe(18);
    expect(range.end.getDate()).toBe(18);
  });

  it('semana: de domingo a sabado', () => {
    // 18/09/2026 e uma sexta-feira.
    const range = buildRange('semana', new Date(2026, 8, 18));
    expect(range.start.getDay()).toBe(0);
    expect(range.start.getDate()).toBe(13);
    expect(range.end.getDay()).toBe(6);
    expect(range.end.getDate()).toBe(19);
  });

  it('semana: quando a ancora ja e domingo, a semana comeca nela mesma', () => {
    const range = buildRange('semana', new Date(2026, 8, 13));
    expect(range.start.getDate()).toBe(13);
    expect(range.end.getDate()).toBe(19);
  });

  it('mes: do dia 1 ao ultimo dia', () => {
    const range = buildRange('mes', new Date(2026, 8, 18));
    expect(range.start.getDate()).toBe(1);
    expect(range.end.getDate()).toBe(30);
  });

  it('mes: fevereiro de ano bissexto termina em 29', () => {
    const range = buildRange('mes', new Date(2028, 1, 15));
    expect(range.end.getDate()).toBe(29);
  });

  it('ano: de 1 de janeiro a 31 de dezembro', () => {
    const range = buildRange('ano', new Date(2026, 5, 10));
    expect(range.start.getMonth()).toBe(0);
    expect(range.start.getDate()).toBe(1);
    expect(range.end.getMonth()).toBe(11);
    expect(range.end.getDate()).toBe(31);
  });
});

describe('shiftAnchor', () => {
  it('dia: 31/12 + 1 vira 01/01 do ano seguinte', () => {
    const next = shiftAnchor('dia', new Date(2026, 11, 31), 1);
    expect(next.getFullYear()).toBe(2027);
    expect(next.getMonth()).toBe(0);
    expect(next.getDate()).toBe(1);
  });

  it('semana: desloca exatamente 7 dias', () => {
    const next = shiftAnchor('semana', new Date(2026, 8, 18), 1);
    expect(next.getDate()).toBe(25);
  });

  it('mes: 31/01 + 1 mes vira fevereiro, nunca marco', () => {
    const next = shiftAnchor('mes', new Date(2026, 0, 31), 1);
    expect(next.getMonth()).toBe(1);
  });

  it('ano: desloca o ano preservando o mes', () => {
    const next = shiftAnchor('ano', new Date(2026, 5, 10), -1);
    expect(next.getFullYear()).toBe(2025);
    expect(next.getMonth()).toBe(5);
  });
});

describe('isPast — o bug de fuso horario', () => {
  it('compromisso de hoje as 15:00, avaliado as 14:00, NAO e passado', () => {
    const now = new Date(2026, 8, 18, 14, 0);
    expect(isPast('2026-09-18T15:00', now)).toBe(false);
  });

  it('compromisso de hoje as 09:00, avaliado as 14:00, e passado', () => {
    const now = new Date(2026, 8, 18, 14, 0);
    expect(isPast('2026-09-18T09:00', now)).toBe(true);
  });

  it('devolve null para data invalida, para o chamador decidir', () => {
    expect(isPast('lixo', new Date())).toBeNull();
  });
});

describe('isWithinRange', () => {
  it('inclui os dois extremos do periodo', () => {
    const range = buildRange('mes', new Date(2026, 9, 15));
    expect(isWithinRange('2026-10-01T00:00', range)).toBe(true);
    expect(isWithinRange('2026-10-31T23:59', range)).toBe(true);
    expect(isWithinRange('2026-11-01T00:00', range)).toBe(false);
  });

  it('data invalida nunca cai em periodo nenhum', () => {
    expect(isWithinRange('lixo', buildRange('ano', new Date(2026, 0, 1)))).toBe(false);
  });
});

describe('compareScheduled', () => {
  it('ordena cronologicamente e joga datas invalidas para o fim', () => {
    const ordenado = ['2026-10-05T10:00', 'lixo', '2026-10-01T08:00'].sort(compareScheduled);
    expect(ordenado).toEqual(['2026-10-01T08:00', '2026-10-05T10:00', 'lixo']);
  });
});

describe('toIsoDate', () => {
  it('formata com zero a esquerda', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('formatPeriodLabel', () => {
  const hoje = new Date(2026, 8, 18);

  it('dia: usa "Hoje" quando a ancora e a data atual', () => {
    expect(formatPeriodLabel('dia', hoje, hoje)).toBe('Hoje, 18 de setembro');
  });

  it('dia: usa o dia da semana quando nao e hoje', () => {
    expect(formatPeriodLabel('dia', new Date(2026, 8, 25), hoje)).toContain('25 de setembro');
  });

  it('semana: mostra o intervalo', () => {
    expect(formatPeriodLabel('semana', hoje, hoje)).toBe('13 a 19 de setembro');
  });

  it('semana: nomeia os dois meses quando o intervalo os atravessa', () => {
    expect(formatPeriodLabel('semana', new Date(2026, 8, 30), hoje))
      .toBe('27 de setembro a 3 de outubro');
  });

  it('mes: nome do mes capitalizado mais o ano', () => {
    expect(formatPeriodLabel('mes', hoje, hoje)).toBe('Setembro de 2026');
  });

  it('ano: so o ano', () => {
    expect(formatPeriodLabel('ano', hoje, hoje)).toBe('2026');
  });
});
