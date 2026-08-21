import { useEffect, useMemo } from 'react';

import { useAsyncResource } from '@/hooks/useAsyncResource';
import {
  loadCachedMedicines,
  registerMedicinesRefetchCallback,
  saveMedicinesCache,
} from '@/hooks/medicinesCache';
import {
  listMedicinesForUser,
  updateMedicine,
  type MedicineRecord,
} from '@/services/medicineService';
import type { MedicineDose, MedicineInventoryItem, MedicineStockStatus } from '@/types/models';

const UNIT_LABELS: Record<string, string> = {
  COMP: 'comp.',
  ML: 'ml',
  CAPS: 'caps.',
};

const WEEKDAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isMedicineActiveToday(medicine: MedicineRecord, today: string): boolean {
  if (!medicine.active) return false;
  if (medicine.startDate && medicine.startDate > today) return false;
  if (medicine.endDate && medicine.endDate < today) return false;

  if (medicine.frequencyType === 'SPECIFIC_DAYS') {
    const todayCode = WEEKDAY_CODES[new Date().getDay()];
    return (medicine.weekDays ?? []).includes(todayCode);
  }

  return true;
}

function parseTakenToday(takenToday: string | null | undefined, today: string): Set<string> {
  if (!takenToday) return new Set();
  try {
    const parsed = JSON.parse(takenToday) as { date?: string; times?: string[] };
    if (parsed.date !== today) return new Set();
    return new Set(parsed.times ?? []);
  } catch {
    return new Set();
  }
}

function deriveDosesForToday(medicines: MedicineRecord[]): MedicineDose[] {
  const today = getTodayIsoDate();
  const doses: MedicineDose[] = [];

  medicines.forEach((medicine) => {
    if (!isMedicineActiveToday(medicine, today)) return;
    const takenTimes = parseTakenToday(medicine.takenToday, today);

    medicine.times.forEach((time) => {
      doses.push({
        id: `${medicine.id}__${time}`,
        medicineId: medicine.id,
        time,
        name: medicine.name,
        dosage: medicine.dosage,
        status: takenTimes.has(time) ? 'taken' : 'pending',
      });
    });
  });

  return doses.sort((a, b) => a.time.localeCompare(b.time));
}

function deriveStockStatus(medicine: MedicineRecord): MedicineStockStatus {
  if (medicine.lowStockThreshold !== undefined && medicine.currentStock <= medicine.lowStockThreshold) {
    return 'low';
  }
  return 'ok';
}

function deriveStocks(medicines: MedicineRecord[]): MedicineInventoryItem[] {
  return medicines.map((medicine) => ({
    id: medicine.id,
    name: medicine.name,
    quantity: medicine.currentStock,
    unit: medicine.unit ? (UNIT_LABELS[medicine.unit] ?? medicine.unit) : '',
    status: deriveStockStatus(medicine),
    percentage: medicine.initialStock > 0
      ? Math.max(0, Math.min(100, Math.round((medicine.currentStock / medicine.initialStock) * 100)))
      : 0,
  }));
}

async function fetchMedicines(): Promise<MedicineRecord[]> {
  const cached = await loadCachedMedicines<MedicineRecord[]>();
  if (cached) {
    return cached;
  }

  const records = await listMedicinesForUser();
  await saveMedicinesCache(records);
  return records;
}

export function useMedicinesData() {
  const { data, status, errorMessage, retry } = useAsyncResource(fetchMedicines);

  useEffect(() => {
    const unregister = registerMedicinesRefetchCallback(() => {
      retry();
    });
    return unregister;
  }, [retry]);

  const records = useMemo(() => data ?? [], [data]);

  const medicines = useMemo(() => deriveDosesForToday(records), [records]);
  const stocks = useMemo(() => deriveStocks(records), [records]);
  const pendingCount = useMemo(
    () => medicines.filter((dose) => dose.status === 'pending').length,
    [medicines],
  );

  async function onToggleMedicineStatus(doseId: string) {
    const dose = medicines.find((d) => d.id === doseId);
    if (!dose) return;

    const medicine = records.find((m) => m.id === dose.medicineId);
    if (!medicine) return;

    const today = getTodayIsoDate();
    const takenTimes = parseTakenToday(medicine.takenToday, today);

    if (takenTimes.has(dose.time)) {
      takenTimes.delete(dose.time);
    } else {
      takenTimes.add(dose.time);
    }

    await updateMedicine(medicine.id, {
      takenToday: JSON.stringify({ date: today, times: Array.from(takenTimes) }),
    });
  }

  return {
    medicines,
    stocks,
    hasMedicines: records.length > 0,
    pendingCount,
    isLoading: status === 'loading',
    errorMessage,
    retry,
    onToggleMedicineStatus,
  };
}
