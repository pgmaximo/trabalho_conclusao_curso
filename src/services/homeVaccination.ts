// =============================================================================
// Arquivo: homeVaccination.ts
// Descrição: Contagem das doses de vacina para o Início — módulo PURO
// =============================================================================
//
// Sem React, sem Amplify. O dia de referência (`today`, "AAAA-MM-DD") é sempre
// injetado, nunca lido do relógio aqui dentro, como em homeAppointments.ts.
//
// A regra é a MESMA da Carteira (`mapToItem`, em src/hooks/useVaccinationData.ts):
// aplicada = tem `appliedDate`; atrasada = sem `appliedDate` e `dueDate` antes
// de hoje; pendente = o resto. O Início e a Carteira precisam contar igual.
//
// =============================================================================

export type HomeVaccineDose = {
  appliedDate?: string | null;
  dueDate?: string | null;
};

export type VaccineDoseCounts = {
  overdue: number;
  pending: number;
  applied: number;
};

export function isDoseOverdue(dose: HomeVaccineDose, today: string): boolean {
  return !dose.appliedDate && Boolean(dose.dueDate) && dose.dueDate! < today;
}

export function countVaccineDoses(doses: HomeVaccineDose[], today: string): VaccineDoseCounts {
  const counts: VaccineDoseCounts = { overdue: 0, pending: 0, applied: 0 };

  for (const dose of doses) {
    if (dose.appliedDate) {
      counts.applied += 1;
    } else if (isDoseOverdue(dose, today)) {
      counts.overdue += 1;
    } else {
      counts.pending += 1;
    }
  }

  return counts;
}
