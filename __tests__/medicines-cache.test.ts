import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadCachedMedicines, MEDICINES_CACHE_TTL_MS, saveMedicinesCache } from '@/hooks/medicinesCache';

describe('medicines cache', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns a newly saved value', async () => {
    await saveMedicinesCache([{ id: 'med-1' }]);
    await expect(loadCachedMedicines()).resolves.toEqual([{ id: 'med-1' }]);
  });

  it('does not reuse an expired or legacy cache entry', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify({
      value: [{ id: 'old' }],
      savedAt: Date.now() - MEDICINES_CACHE_TTL_MS - 1,
    }));
    await expect(loadCachedMedicines()).resolves.toBeNull();

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([{ id: 'legacy' }]));
    await expect(loadCachedMedicines()).resolves.toBeNull();
  });
});
