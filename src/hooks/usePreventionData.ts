import { useAsyncResource } from '@/hooks/useAsyncResource';
import { getPreventionSnapshot } from '@/services/preventionService';

export function usePreventionData() {
  const { data, status, errorMessage, retry } = useAsyncResource(getPreventionSnapshot);

  return {
    prevention: data,
    isLoading: status === 'loading',
    errorMessage,
    retry,
  };
}
