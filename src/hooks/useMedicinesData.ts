import { useEffect, useMemo } from 'react';

import { useAsyncResource } from '@/hooks/useAsyncResource';
import {
  loadCachedMedicines,
  registerMedicinesRefetchCallback,
  saveMedicinesCache,
} from '@/hooks/medicinesCache';
import {
  listMedicineDoseLogsForDate,
  isDoseHistoryBackendUnavailable,
  listMedicinesForUser,
  toggleMedicineDose,
  updateMedicine,
  type MedicineDoseLog,
  type MedicineRecord,
} from '@/services/medicineService';
import type { MedicineDose, MedicineInventoryItem, MedicineStockStatus } from '@/types/models';
import { getLocalIsoDate, getMedicineDoseTimesForDate } from '@/utils/medicineSchedule';
import { syncMedicineReminders } from '@/services/medicineReminderService';

const UNIT_LABELS: Record<string, string> = {
  COMP: 'comp.',
  ML: 'ml',
  CAPS: 'caps.',
};

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

function deriveDosesForToday(medicines: MedicineRecord[], logs: MedicineDoseLog[], today: string): MedicineDose[] {
  const doses: MedicineDose[] = [];

  medicines.forEach((medicine) => {
    const scheduledTimes = getMedicineDoseTimesForDate(medicine, today);
    if (scheduledTimes.length === 0) return;
    const takenTimes = parseTakenToday(medicine.takenToday, today);

    scheduledTimes.forEach((time) => {
      const hasLog = logs.some((log) => log.medicineId === medicine.id && log.scheduledTime === time);
      doses.push({
        id: `${medicine.id}__${time}`,
        medicineId: medicine.id,
        time,
        name: medicine.name,
        dosage: medicine.dosage,
        status: hasLog || takenTimes.has(time) ? 'taken' : 'pending',
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

type MedicinesDataPayload = { date: string; records: MedicineRecord[]; logs: MedicineDoseLog[] };

async function fetchMedicines(): Promise<MedicinesDataPayload> {
  const today = getLocalIsoDate();
  const cached = await loadCachedMedicines<MedicinesDataPayload>();
  if (cached && cached.date === today) {
    return cached;
  }

  const [records, logs] = await Promise.all([listMedicinesForUser(), listMedicineDoseLogsForDate(today)]);
  const payload = { date: today, records, logs };
  await saveMedicinesCache(payload);
  return payload;
}

export function useMedicinesData() {
  const { data, status, errorMessage, retry } = useAsyncResource(fetchMedicines);

  useEffect(() => {
    const unregister = registerMedicinesRefetchCallback(() => {
      retry();
    });
    return unregister;
  }, [retry]);

  const records = useMemo(() => data?.records ?? [], [data]);
  const logs = useMemo(() => data?.logs ?? [], [data]);
  const today = data?.date ?? getLocalIsoDate();

  // Reconciliacao no retorno a tela: cobre permissao de notificacao concedida
  // depois do cadastro, reinstalacao e mudancas feitas em outro aparelho.
  useEffect(() => {
    if (status !== 'success' || records.length === 0) return;
    void Promise.all(records.map((record) => syncMedicineReminders(record))).catch((error) => {
      console.warn('Nao foi possivel reconciliar os lembretes de medicamento:', error);
    });
  }, [records, status]);

  const medicines = useMemo(() => deriveDosesForToday(records, logs, today), [logs, records, today]);
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

    const existingLog = logs.find((log) => log.medicineId === medicine.id && log.scheduledDate === today && log.scheduledTime === dose.time);
    const takenTimes = parseTakenToday(medicine.takenToday, today);

    // Registros antigos usavam apenas `takenToday`. Mantemos a possibilidade de
    // desmarcá-los sem alterar retrospectivamente o estoque e passamos a usar o
    // histórico persistente em todas as novas marcações.
    if (!existingLog && takenTimes.has(dose.time)) {
      takenTimes.delete(dose.time);
      await updateMedicine(medicine.id, {
        takenToday: JSON.stringify({ date: today, times: Array.from(takenTimes) }),
      });
      return;
    }

    try {
      await toggleMedicineDose(medicine, today, dose.time, existingLog);
    } catch (error) {
      // Durante o rollout, clientes que ainda apontam para o schema anterior
      // continuam funcionando com o campo legado em vez de quebrar a tela.
      if (!isDoseHistoryBackendUnavailable(error)) throw error;
      const nextTimes = takenTimes.has(dose.time)
        ? Array.from(takenTimes).filter((time) => time !== dose.time)
        : [...Array.from(takenTimes), dose.time];
      await updateMedicine(medicine.id, {
        takenToday: JSON.stringify({ date: today, times: nextTimes }),
      });
    }
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
