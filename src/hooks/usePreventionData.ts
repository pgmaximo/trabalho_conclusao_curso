import { useAsyncResource } from '@/hooks/useAsyncResource';
import { getPreventionSnapshot } from '@/mocks/api';

export function usePreventionData() {
  const { data, status, errorMessage, retry } = useAsyncResource(getPreventionSnapshot);

  return {
    prevention: data,
    isLoading: status === 'loading',
    errorMessage,
    retry,
  };
}
