import type { MedicinesSnapshot } from '@/types/models';

export const MEDICINES_SNAPSHOT: MedicinesSnapshot = {
  pendingMedicines: [
    {
      id: 1,
      name: 'Losartana 50mg',
      dosage: 'Hipertensão',
      time: '08h00',
      status: 'pending',
    },
    {
      id: 2,
      name: 'Atenolol 25mg',
      dosage: 'Cardíaco',
      time: '12h00',
      status: 'pending',
    },
    {
      id: 3,
      name: 'Vitamina D3 2000UI',
      dosage: 'Suplementação',
      time: '07:30',
      status: 'taken',
    },
  ],
  stocks: [
    {
      id: 1,
      name: 'Losartana 50mg',
      quantity: 34,
      unit: 'comp.',
      status: 'low',
      percentage: 45,
    },
    {
      id: 2,
      name: 'Atenolol 25mg',
      quantity: 28,
      unit: 'comp.',
      status: 'ok',
      percentage: 70,
    },
    {
      id: 3,
      name: 'Vitamina D3 2000UI',
      quantity: 60,
      unit: 'caps.',
      status: 'ok',
      percentage: 100,
    },
  ],
  reminder: {
    title: 'Lembrete ativado',
    description: 'Notificações 15 min antes de cada dose',
  },
};
