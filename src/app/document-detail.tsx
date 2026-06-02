import React from 'react';
import { useSelectedDocument } from '@/contexts/DocumentContext';
import { DocumentDetailScreen } from '@/screens/DocumentDetailScreen';

export default function DocumentDetailPage() {
  const { selectedDocument } = useSelectedDocument();

  if (!selectedDocument) {
    return null;
  }

  // Convert MedicalDocument to MedicalDocumentMetadata
  const document = {
    id: selectedDocument.id,
    fileId: '',
    s3FileName: selectedDocument.s3FileName,
    originalFileName: selectedDocument.originalFileName,
    userId: '',
    documentType: selectedDocument.documentType,
    documentName: selectedDocument.documentName,
    documentDate: selectedDocument.documentDate,
    expirationDate: selectedDocument.expirationDate,
    fileSize: 0,
    createdAt: '',
  };

  return <DocumentDetailScreen document={document} />;
}
