import { MEDICINES_SNAPSHOT } from '@/mocks/medicines';
import { simulateRequest } from '@/services/requestSimulator';
import type { MedicineDose } from '@/types/models';

export function getMedicinesSnapshot() {
  return simulateRequest(MEDICINES_SNAPSHOT, {
    delayMs: 340,
    errorMessage: 'Nao foi possivel carregar os medicamentos.',
  });
}

export function toggleMedicineStatus(medicines: MedicineDose[], medicineId: number) {
  return medicines.map((medicine) => {
    if (medicine.id !== medicineId) {
      return medicine;
    }

    return {
      ...medicine,
      status: medicine.status === 'taken' ? ('pending' as const) : ('taken' as const),
    };
  });
}

export function countPendingMedicines(medicines: MedicineDose[]) {
  return medicines.filter((medicine) => medicine.status === 'pending').length;
}
