import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

import { useAsyncResource } from '@/hooks/useAsyncResource';
import type { MedicalDocument, MedicalDocumentFilter } from '@/types/models';
import { formatDateForDisplay } from '@/services/examService';

const client = generateClient<Schema>();
const EXAMS_CACHE_KEY = '@SuaSaude:examsCache';

// Global cache version to signal refetch when cache is invalidated
let cacheVersion = 0;
let refetchCallbacks: Array<() => void> = [];

/**
 * Register a refetch callback - called when cache is invalidated
 */
function registerRefetchCallback(callback: () => void) {
  refetchCallbacks.push(callback);
  return () => {
    refetchCallbacks = refetchCallbacks.filter((cb) => cb !== callback);
  };
}

/**
 * Invalidate the exams cache - call this after add/edit/delete operations
 */
export async function invalidateExamsCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(EXAMS_CACHE_KEY);
    // Increment cache version to trigger hook refetch
    cacheVersion++;
    console.log('Exams cache invalidated, version:', cacheVersion);
    // Notify all registered callbacks to refetch
    console.log(`Triggering refetch for ${refetchCallbacks.length} listeners`);
    refetchCallbacks.forEach((callback) => callback());
  } catch (error) {
    console.error('Error invalidating exams cache:', error);
  }
}

/**
 * Fetch all medical documents from DynamoDB for the current user
 */
async function fetchMedicalDocuments(): Promise<MedicalDocument[]> {
  try {
    // Check cache first
    const cachedData = await AsyncStorage.getItem(EXAMS_CACHE_KEY);
    if (cachedData) {
      console.log('Loading exams from cache');
      return JSON.parse(cachedData);
    }

    console.log('Fetching exams from AWS');
    const { data: documents, errors } = await client.models.MedicalDocument.list();

    if (errors?.length) {
      throw new Error(`Failed to fetch documents: ${errors[0]?.message}`);
    }

    if (!documents) {
      return [];
    }

    // Debug: Log raw documents from DB
    console.log('Raw documents from DynamoDB:', documents);
    documents.forEach((doc) => {
      console.log('Document:', { 
        documentType: doc.documentType, 
        documentName: doc.documentName,
        documentDate: doc.documentDate,
        expirationDate: doc.expirationDate 
      });
    });

    // Transform raw database documents to UI format
    const transformedDocuments = documents.map((doc) => {
      const isExam = doc.documentType === 'exam';
      const documentType = (doc.documentType || 'exam') as 'exam' | 'prescription';
      
      return {
        id: doc.id,
        icon: isExam ? 'flask-outline' : 'medkit-outline',
        title: doc.documentName || 'Sem nome',
        subtitle: formatDateForDisplay(doc.documentDate),
        statusLabel: isExam ? 'Exame' : 'Receita',
        statusColor: isExam ? '#FBBF24' : '#3B82F6',
        category: isExam ? 'Exames' : 'Receitas',
        // Full document data
        documentType,
        documentName: doc.documentName || '',
        documentDate: doc.documentDate,
        expirationDate: doc.expirationDate || null,
        s3FileName: doc.s3FileName,
        originalFileName: doc.s3FileName, // This might need to be stored separately
      } satisfies MedicalDocument;
    });

    // Cache the results
    try {
      await AsyncStorage.setItem(EXAMS_CACHE_KEY, JSON.stringify(transformedDocuments));
      console.log('Exams cached successfully');
    } catch (cacheError) {
      console.warn('Failed to cache exams:', cacheError);
    }

    return transformedDocuments;
  } catch (error) {
    console.error('Erro ao carregar documentos:', error);
    throw error;
  }
}

/**
 * Get available filter options
 */
function getMedicalDocumentFilters(): MedicalDocumentFilter[] {
  return ['Todos', 'Exames', 'Receitas', 'Laudos'];
}

/**
 * Filter documents based on search query and active filter
 */
function filterMedicalDocuments(
  documents: MedicalDocument[],
  searchQuery: string,
  activeFilter: MedicalDocumentFilter,
): MedicalDocument[] {
  return documents.filter((doc) => {
    // Filter by category
    if (activeFilter !== 'Todos' && doc.category !== activeFilter) {
      return false;
    }

    // Filter by search query
    if (searchQuery.trim() === '') {
      return true;
    }

    const query = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(query) ||
      doc.subtitle.toLowerCase().includes(query)
    );
  });
}

export function useExamsData() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<MedicalDocumentFilter>('Todos');
  const { data, status, errorMessage, retry } = useAsyncResource(fetchMedicalDocuments, []);

  // Register refetch callback that gets called when cache is invalidated
  useEffect(() => {
    const unregister = registerRefetchCallback(() => {
      console.log('Cache invalidated, refetching exams');
      retry();
    });
    return unregister;
  }, [retry]);

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
