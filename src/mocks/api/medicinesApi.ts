/**
 * Resumo do arquivo:
 * Mock API de medicamentos usada enquanto a integracao real de backend nao existe.
 * Mantem snapshot simulado e funcoes puras para alternar status de doses.
 */
import { MEDICINES_SNAPSHOT } from '@/mocks/medicines';
import type { MedicineDose } from '@/types/models';

import { simulateRequest } from './requestSimulator';

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
