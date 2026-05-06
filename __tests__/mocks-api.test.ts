import {
  countPendingMedicines,
  getDashboardTodayLabel,
  toggleMedicineStatus,
} from '@/mocks/api';

describe('mock APIs', () => {
  it('formats the dashboard date label in pt-BR', () => {
    const label = getDashboardTodayLabel(new Date('2026-05-02T12:00:00.000Z'));

    expect(label).toContain('2026');
    expect(label).toContain('maio');
  });

  it('toggles medicine status and counts pending medicines', () => {
    const medicines = [
      { id: 1, status: 'pending' },
      { id: 2, status: 'taken' },
    ] as any;

    const updatedMedicines = toggleMedicineStatus(medicines, 1);

    expect(updatedMedicines[0].status).toBe('taken');
    expect(updatedMedicines[1].status).toBe('taken');
    expect(countPendingMedicines(updatedMedicines)).toBe(0);
  });
});
