import React from 'react';
import { useSelectedDocument } from '@/contexts/DocumentContext';
import { DocumentDetailScreen } from '@/screens/DocumentDetailScreen';

export default function DocumentDetailPage() {
  const { selectedDocument } = useSelectedDocument();

  if (!selectedDocument) {
    return null;
  }

  // Converte MedicalDocument -> MedicalDocumentMetadata.
  // expirationDate vem como string | null; o metadata espera string | undefined.
  const document = {
    id: selectedDocument.id,
    fileId: '',
    s3FileName: selectedDocument.s3FileName,
    originalFileName: selectedDocument.originalFileName,
    userId: '',
    documentType: selectedDocument.documentType,
    documentName: selectedDocument.documentName,
    documentDate: selectedDocument.documentDate,
    expirationDate: selectedDocument.expirationDate ?? undefined,
    fileSize: 0,
    createdAt: '',
  };

  return <DocumentDetailScreen document={document} />;
}
