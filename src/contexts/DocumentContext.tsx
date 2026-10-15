import React, { createContext, useContext, useState } from 'react';
import type { MedicalDocument } from '@/types/models';

interface DocumentContextType {
  selectedDocument: MedicalDocument | null;
  setSelectedDocument: (doc: MedicalDocument | null) => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: React.ReactNode }) {
  const [selectedDocument, setSelectedDocument] = useState<MedicalDocument | null>(null);

  return (
    <DocumentContext.Provider value={{ selectedDocument, setSelectedDocument }}>
      {children}
    </DocumentContext.Provider>
  );
}

export function useSelectedDocument() {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useSelectedDocument must be used within DocumentProvider');
  }
  return context;
}
