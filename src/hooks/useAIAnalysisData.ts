import { useState } from 'react';

import { useAsyncResource } from '@/hooks/useAsyncResource';
import { getAIAnalysisSnapshot } from '@/services/aiAnalysisService';

export function useAIAnalysisData() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data, status, errorMessage, retry } = useAsyncResource(getAIAnalysisSnapshot);

  return {
    searchQuery,
    setSearchQuery,
    analysis: data,
    isLoading: status === 'loading',
    errorMessage,
    retry,
  };
}
