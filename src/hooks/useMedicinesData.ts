import { useEffect, useState } from 'react';

import { useAsyncResource } from '@/hooks/useAsyncResource';
import {
  countPendingMedicines,
  getMedicinesSnapshot,
  toggleMedicineStatus,
} from '@/services/medicinesService';

export function useMedicinesData() {
  const { data, status, errorMessage, retry } = useAsyncResource(getMedicinesSnapshot);
  const [medicines, setMedicines] = useState<ReturnType<typeof toggleMedicineStatus>>([]);

  useEffect(() => {
    if (data) {
      setMedicines(data.pendingMedicines);
    }
  }, [data]);

  const snapshot = data;

  return {
    medicines,
    stocks: snapshot?.stocks ?? [],
    reminder: snapshot?.reminder ?? { title: '', description: '' },
    pendingCount: countPendingMedicines(medicines),
    onToggleMedicineStatus: (medicineId: number) => {
      setMedicines((currentMedicines) => toggleMedicineStatus(currentMedicines, medicineId));
    },
    isLoading: status === 'loading',
    errorMessage,
    retry,
  };
}
