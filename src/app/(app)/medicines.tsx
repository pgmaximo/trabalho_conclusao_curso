// =============================================================================
// Arquivo: (app)/medicines.tsx
// Descrição: Rota de controle de medicamentos e doses (Canvas 3d)
// =============================================================================

import React from 'react';
import { MedicinesScreen } from '@/screens/MedicinesScreen';
import { useMedicinesData } from '@/hooks/useMedicinesData';

export default function MedicinesRoute() {
  const medicines = useMedicinesData();

  return (
    <MedicinesScreen
      medicines={medicines.medicines}
      stocks={medicines.stocks}
      hasMedicines={medicines.hasMedicines}
      pendingCount={medicines.pendingCount}
      isLoading={medicines.isLoading}
      errorMessage={medicines.errorMessage}
      onRetry={medicines.retry}
      onToggleMedicineStatus={medicines.onToggleMedicineStatus}
    />
  );
}
