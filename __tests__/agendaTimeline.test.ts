import {
  buildTimelineRows,
  findTodayRowIndex,
} from '@/services/agendaTimeline';

const AGORA = new Date(2026, 8, 18, 14, 0); // sexta, 18/09/2026, 14:00 local

function emDias(offset: number, hora = 9): { scheduledAt: string } {
  const d = new Date(AGORA.getFullYear(), AGORA.getMonth(), AGORA.getDate() + offset, hora, 0);
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  return { scheduledAt: `${ano}-${mes}-${dia}T${hh}:00` };
}

function rotulos(rows: ReturnType<typeof buildTimelineRows>): string[] {
  return rows.filter((row) => row.kind === 'header').map((row) => (row as { label: string }).label);
}

describe('buildTimelineRows', () => {
  it('devolve lista vazia quando nao ha nenhum compromisso', () => {
    expect(buildTimelineRows([], AGORA)).toEqual([]);
  });

  it('ordena cronologicamente e agrupa por dia', () => {
    const rows = buildTimelineRows([emDias(2), emDias(-3), emDias(2, 15)], AGORA);
    const cards = rows.filter((row) => row.kind === 'card');

    expect(cards).toHaveLength(3);
    expect(rotulos(rows)[0]).toContain('15 de setembro');
  });

  it('rotula hoje e amanha por nome', () => {
    const rows = buildTimelineRows([emDias(0), emDias(1)], AGORA);

    expect(rotulos(rows)).toContain('Hoje');
    expect(rotulos(rows)).toContain('Amanhã');
  });

  it('inclui o ano no rotulo quando o compromisso e de outro ano', () => {
    const rows = buildTimelineRows([{ scheduledAt: '2027-03-10T09:00' }], AGORA);

    expect(rotulos(rows).some((label) => label.includes('2027'))).toBe(true);
  });

  it('insere a secao de hoje mesmo vazia, com a linha de dia sem compromisso', () => {
    const rows = buildTimelineRows([emDias(1)], AGORA);

    expect(rotulos(rows)).toContain('Hoje');
    expect(rows.some((row) => row.kind === 'todayEmpty')).toBe(true);
  });

  it('nao duplica a secao de hoje quando ja existe compromisso hoje', () => {
    const rows = buildTimelineRows([emDias(0)], AGORA);

    expect(rotulos(rows).filter((label) => label === 'Hoje')).toHaveLength(1);
    expect(rows.some((row) => row.kind === 'todayEmpty')).toBe(false);
  });

  it('acrescenta a linha de futuro vazio quando so ha passado', () => {
    const rows = buildTimelineRows([emDias(-5)], AGORA);

    expect(rows.some((row) => row.kind === 'futureEmpty')).toBe(true);
  });

  it('nao acrescenta a linha de futuro vazio quando ha futuro', () => {
    const rows = buildTimelineRows([emDias(-5), emDias(5)], AGORA);

    expect(rows.some((row) => row.kind === 'futureEmpty')).toBe(false);
  });

  it('acrescenta a linha de futuro vazio quando o unico compromisso de hoje ja passou', () => {
    // AGORA e 14:00; o compromisso foi as 09:00. Em granularidade de dia ele nao
    // e "passado", mas em hora ele e — e a pergunta que futureEmpty responde e
    // de hora.
    const rows = buildTimelineRows([emDias(0, 9)], AGORA);

    expect(rows.some((row) => row.kind === 'futureEmpty')).toBe(true);
  });

  it('nao acrescenta a linha de futuro vazio quando ainda ha compromisso hoje mais tarde', () => {
    const rows = buildTimelineRows([emDias(0, 20)], AGORA);

    expect(rows.some((row) => row.kind === 'futureEmpty')).toBe(false);
  });

  it('marca isPast nos cabecalhos e cards anteriores a hoje', () => {
    const rows = buildTimelineRows([emDias(-3), emDias(3)], AGORA);
    const cabecalhos = rows.filter((row) => row.kind === 'header') as { isPast: boolean }[];

    expect(cabecalhos[0].isPast).toBe(true);
    expect(cabecalhos[cabecalhos.length - 1].isPast).toBe(false);
  });

  it('joga registros com data invalida para o fim, sob o rotulo "Data inválida"', () => {
    const rows = buildTimelineRows([{ scheduledAt: 'lixo' }, emDias(1)], AGORA);
    const labels = rotulos(rows);

    expect(labels[labels.length - 1]).toBe('Data inválida');
  });

  it('gera chaves unicas para todas as linhas', () => {
    const rows = buildTimelineRows([emDias(-2), emDias(0), emDias(2), { scheduledAt: 'lixo' }], AGORA);
    const chaves = rows.map((row) => row.key);

    expect(new Set(chaves).size).toBe(chaves.length);
  });
});

describe('findTodayRowIndex', () => {
  it('devolve o indice do cabecalho de hoje', () => {
    const rows = buildTimelineRows([emDias(-2), emDias(1)], AGORA);
    const indice = findTodayRowIndex(rows);

    expect(indice).toBeGreaterThanOrEqual(0);
    expect(rows[indice].kind).toBe('header');
    expect((rows[indice] as { isToday: boolean }).isToday).toBe(true);
  });

  it('devolve -1 quando nao ha linhas', () => {
    expect(findTodayRowIndex([])).toBe(-1);
  });
});
