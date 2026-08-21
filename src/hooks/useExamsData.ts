import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

import { useAsyncResource } from '@/hooks/useAsyncResource';
import type { DocumentValidityStatus, MedicalDocument, MedicalDocumentFilter } from '@/types/models';
import { formatDateForDisplay, getTodayDate } from '@/services/examService';

/**
 * Calcula o status de validade de uma receita comparando `expirationDate` com a data atual.
 * Só se aplica a receitas — exames não têm nenhuma fonte de dado real de resultado clínico
 * (ver specs/03-exames-receitas/lista/plan.md §2, Opção A), então retornam `undefined`.
 */
function computeValidityStatus(
  documentType: 'exam' | 'prescription',
  expirationDate: string | null,
): DocumentValidityStatus | undefined {
  if (documentType !== 'prescription' || !expirationDate) {
    return undefined;
  }
  return expirationDate >= getTodayDate() ? 'valida' : 'vencida';
}

const client = generateClient<Schema>();
const EXAMS_CACHE_KEY = '@SuaSaude:examsCache';

/**
 * Converte um registro cru do DynamoDB (`Schema['MedicalDocument']['type']`, ou o
 * subconjunto de campos retornado por `.get()`) para o formato `MedicalDocument` da UI.
 * Extraído de `fetchMedicalDocuments` para ser reaproveitado por `getDocumentById`
 * (busca pontual usada pelo fallback de deep link de `document-detail`) sem duplicar a
 * lógica de mapeamento.
 */
function mapDocumentToMedicalDocument(doc: {
  id: string;
  documentType: string | null;
  documentName: string | null;
  documentDate: string;
  expirationDate: string | null;
  s3FileName: string;
  originalFileName?: string | null;
}): MedicalDocument {
  const isExam = doc.documentType === 'exam';
  const documentType = (doc.documentType || 'exam') as 'exam' | 'prescription';
  const expirationDate = doc.expirationDate || null;
  const formattedDate = formatDateForDisplay(doc.documentDate);

  return {
    id: doc.id,
    icon: isExam ? 'flask-outline' : 'medkit-outline',
    title: doc.documentName || 'Sem nome',
    subtitle: isExam ? `Exame · ${formattedDate}` : `Receita · emitida ${formattedDate}`,
    category: isExam ? 'Exames' : 'Receitas',
    documentType,
    documentName: doc.documentName || '',
    documentDate: doc.documentDate,
    expirationDate,
    s3FileName: doc.s3FileName,
    // Documentos criados antes deste campo existir não têm `originalFileName` no banco —
    // cai para `s3FileName` (comportamento anterior) só como fallback, nunca esconde o dado
    // real quando ele existe (GAP_ANALYSIS.md #38).
    originalFileName: doc.originalFileName || doc.s3FileName,
    validityStatus: computeValidityStatus(documentType, expirationDate),
  } satisfies MedicalDocument;
}

/**
 * Busca um único documento pelo `id` diretamente no DynamoDB (via `client.models.
 * MedicalDocument.get`), sem passar pelo cache de lista. Usado por `document-detail`
 * quando o `DocumentContext` está vazio (deep link/cold start) mas a rota carrega um
 * `?id=` — ver specs/03-exames-receitas/detalhe-documento/plan.md §3, Opção B.
 * Retorna `null` quando o documento não existe/não pertence ao usuário, para que a UI
 * decida o estado "Documento não encontrado" em vez de propagar uma exceção genérica.
 */
export async function getDocumentById(id: string): Promise<MedicalDocument | null> {
  const { data: doc, errors } = await client.models.MedicalDocument.get({ id });

  if (errors?.length || !doc) {
    return null;
  }

  return mapDocumentToMedicalDocument(doc);
}

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

    // Transform raw database documents to UI format
    const transformedDocuments = documents.map(mapDocumentToMedicalDocument);

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
  return ['Todos', 'Exames', 'Receitas', 'Alterados'];
}

/**
 * Filter documents based on search query and active filter.
 *
 * "Alterados" nunca tem correspondência real: o schema `MedicalDocument` não tem nenhum
 * campo de resultado clínico (Normal/Alterado), então este filtro retorna sempre lista
 * vazia — comportamento honesto e documentado (não simula dado falso), ver
 * specs/03-exames-receitas/lista/plan.md §2. A UI (`ExamsScreen`) trata o chip como
 * desabilitado com indicação "Em breve".
 */
function filterMedicalDocuments(
  documents: MedicalDocument[],
  searchQuery: string,
  activeFilter: MedicalDocumentFilter,
): MedicalDocument[] {
  if (activeFilter === 'Alterados') {
    return [];
  }

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
    // Total bruto (sem filtro/busca) — distingue "vazio real" de "busca sem
    // resultado" em ExamsScreen mesmo quando a conta não tem nenhum documento
    // e o usuário digita uma busca (ver GAP_ANALYSIS.md #33).
    hasAnyDocuments: documents.length > 0,
    isLoading: status === 'loading',
    errorMessage,
    retry,
  };
}
