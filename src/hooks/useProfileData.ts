import { useAsyncResource } from '@/hooks/useAsyncResource';
import { getUserProfileSnapshot } from '@/mocks/api';

export function useProfileData() {
  const { data, status, errorMessage, retry } = useAsyncResource(getUserProfileSnapshot);

  return {
    profile: data,
    isLoading: status === 'loading',
    errorMessage,
    retry,
  };
}
