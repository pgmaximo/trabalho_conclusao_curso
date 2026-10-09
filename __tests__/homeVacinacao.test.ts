import { countVaccineDoses, isDoseOverdue } from '@/services/homeVaccination';

// O atalho de Vacinação do Início mostra uma linha de apoio com as doses da
// carteira (specs/02-perfil-home-agenda/home-acesso-completo/spec.md, D2). A
// contagem usa a MESMA regra da Carteira (`mapToItem`, em useVaccinationData):
// aplicada = tem `appliedDate`; atrasada = sem `appliedDate` e `dueDate` antes
// de hoje; pendente = o resto. Se as duas telas discordassem, o Início diria
// "1 dose atrasada" e a Carteira não mostraria nenhuma.

const HOJE = '2026-10-09';

describe('isDoseOverdue', () => {
  it('considera atrasada a dose sem aplicacao cuja data devida ja passou', () => {
    expect(isDoseOverdue({ dueDate: '2026-10-08' }, HOJE)).toBe(true);
  });

  it('nao considera atrasada a dose que vence hoje', () => {
    expect(isDoseOverdue({ dueDate: HOJE }, HOJE)).toBe(false);
  });

  it('nao considera atrasada a dose ja aplicada, mesmo com data devida no passado', () => {
    expect(isDoseOverdue({ appliedDate: '2026-01-10', dueDate: '2026-01-01' }, HOJE)).toBe(false);
  });

  it('nao considera atrasada a dose sem data devida', () => {
    expect(isDoseOverdue({ dueDate: null }, HOJE)).toBe(false);
    expect(isDoseOverdue({}, HOJE)).toBe(false);
  });
});

describe('countVaccineDoses', () => {
  it('devolve tudo zerado para uma carteira vazia', () => {
    expect(countVaccineDoses([], HOJE)).toEqual({ overdue: 0, pending: 0, applied: 0 });
  });

  it('separa as doses em atrasadas, pendentes e aplicadas', () => {
    const doses = [
      { appliedDate: '2025-03-14' },
      { appliedDate: '2026-02-01', dueDate: '2026-01-15' },
      { dueDate: '2020-01-01' },
      { dueDate: '2026-12-01' },
      { dueDate: HOJE },
      { dueDate: null },
    ];

    expect(countVaccineDoses(doses, HOJE)).toEqual({ overdue: 1, pending: 3, applied: 2 });
  });
});
