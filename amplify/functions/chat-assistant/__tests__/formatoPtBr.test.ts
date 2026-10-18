/**
 * A data "de hoje" do chat e a de Sao Paulo, e nao a do relogio da funcao, que
 * roda em UTC (E8). Entre 21h e meia-noite de Brasilia o UTC ja e o dia
 * seguinte -- e e exatamente no ultimo dia de uma campanha que isso mudaria a
 * resposta.
 */
import { dataEmSaoPaulo } from '../formatoPtBr';

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
