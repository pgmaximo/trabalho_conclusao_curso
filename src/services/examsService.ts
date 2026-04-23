import { MEDICAL_DOCUMENT_FILTERS, MEDICAL_DOCUMENTS } from '@/mocks/exams';
import { simulateRequest } from '@/services/requestSimulator';
import type { MedicalDocument, MedicalDocumentFilter } from '@/types/models';

export function getMedicalDocumentFilters() {
  return MEDICAL_DOCUMENT_FILTERS;
}

export function getMedicalDocuments() {
  return simulateRequest(MEDICAL_DOCUMENTS, {
    delayMs: 320,
    errorMessage: 'Nao foi possivel carregar os documentos medicos.',
  });
}

export function filterMedicalDocuments(
  documents: MedicalDocument[],
  searchQuery: string,
  activeFilter: MedicalDocumentFilter
) {
  const normalizedSearch = searchQuery.trim().toLowerCase();

  return documents.filter((document) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      document.title.toLowerCase().includes(normalizedSearch) ||
      document.subtitle.toLowerCase().includes(normalizedSearch);

    if (!matchesSearch) {
      return false;
    }

    if (activeFilter === 'Todos') {
      return true;
    }

    return document.category === activeFilter;
  });
}
