import { useState } from 'react';

import { useAsyncResource } from '@/hooks/useAsyncResource';
import {
  filterMedicalDocuments,
  getMedicalDocumentFilters,
  getMedicalDocuments,
} from '@/services/examsService';
import type { MedicalDocumentFilter } from '@/types/models';

export function useExamsData() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<MedicalDocumentFilter>('Todos');
  const { data, status, errorMessage, retry } = useAsyncResource(getMedicalDocuments, []);
  const documents = data ?? [];

  return {
    filterOptions: getMedicalDocumentFilters(),
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    documents: filterMedicalDocuments(documents, searchQuery, activeFilter),
    isLoading: status === 'loading',
    errorMessage,
    retry,
  };
}
