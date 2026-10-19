/**
 * A data "de hoje" do chat e a de Sao Paulo, e nao a do relogio da funcao, que
 * roda em UTC (E8). Entre 21h e meia-noite de Brasilia o UTC ja e o dia
 * seguinte -- e e exatamente no ultimo dia de uma campanha que isso mudaria a
 * resposta.
 */
import { dataEmSaoPaulo, momentoEmSaoPaulo } from '../formatoPtBr';

describe('dataEmSaoPaulo', () => {
  it('23h30 de Brasilia ainda e o mesmo dia, mesmo com o UTC ja no seguinte', () => {
    expect(dataEmSaoPaulo(new Date('2026-05-31T02:30:00Z'))).toBe('2026-05-30');
  });

  it('meia-noite de Brasilia ja e o dia seguinte', () => {
    expect(dataEmSaoPaulo(new Date('2026-05-31T03:00:00Z'))).toBe('2026-05-31');
  });

  it('o formato e AAAA-MM-DD, com zero a esquerda', () => {
    expect(dataEmSaoPaulo(new Date('2026-01-05T15:00:00Z'))).toBe('2026-01-05');
  });
});

/**
 * O instante de corte das consultas (E1, achado A1). A Agenda grava
 * `scheduledAt` em hora LOCAL ingenua, "AAAA-MM-DDTHH:mm"; comparar com o
 * `toISOString()` do UTC punha como passada a consulta das proximas 3 horas.
 */
describe('momentoEmSaoPaulo', () => {
  it('devolve a hora local de Brasilia, no formato em que a Agenda grava', () => {
    expect(momentoEmSaoPaulo(new Date('2026-10-18T01:30:00Z'))).toBe('2026-10-17T22:30');
    expect(momentoEmSaoPaulo(new Date('2026-10-18T03:00:00Z'))).toBe('2026-10-18T00:00');
    expect(momentoEmSaoPaulo(new Date('2026-10-18T12:05:00Z'))).toBe('2026-10-18T09:05');
  });
});
