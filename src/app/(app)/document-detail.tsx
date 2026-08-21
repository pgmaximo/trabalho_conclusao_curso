import React, { useEffect, useState } from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { useSelectedDocument } from '@/contexts/DocumentContext';
import { getDocumentById } from '@/hooks/useExamsData';
import { DocumentDetailScreen } from '@/screens/DocumentDetailScreen';

/**
 * Fallback de deep link vazio (GAP_ANALYSIS.md item 20, P0 desta EPIC): a rota nunca
 * renderiza `null`/tela em branco. Três caminhos, ver
 * specs/03-exames-receitas/detalhe-documento/plan.md §3 (Opção B):
 * (a) `selectedDocument` já populado no contexto (navegação normal a partir de 3a/Home
 *     via `setSelectedDocument`) → renderiza direto;
 * (b) contexto vazio mas `?id=` presente na URL (deep link/cold start, ex. Home já
 *     navega assim em `dashboard.tsx`) → busca pontual via `getDocumentById`, com estado
 *     de carregamento e um estado de erro claro ("Documento não encontrado") em caso de
 *     falha/id inexistente;
 * (c) nem contexto nem `id` presentes (acesso direto à rota sem nenhum contexto) →
 *     redireciona para `/exams`.
 */
export default function DocumentDetailPage() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { selectedDocument, setSelectedDocument } = useSelectedDocument();
  const [fetchState, setFetchState] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    if (selectedDocument || !id) {
      return undefined;
    }

    let cancelled = false;
    setFetchState('loading');

    getDocumentById(id)
      .then((doc) => {
        if (cancelled) {
          return;
        }
        if (doc) {
          setSelectedDocument(doc);
          setFetchState('idle');
        } else {
          setFetchState('error');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFetchState('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, selectedDocument, setSelectedDocument]);

  if (selectedDocument) {
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

  if (!id) {
    return <Redirect href="/exams" />;
  }

  if (fetchState === 'error') {
    return (
      <SafeAreaView className="flex-1 bg-app-background px-6 dark:bg-app-dark-background">
        <EmptyState
          actionLabel="Voltar para Exames"
          description="Não foi possível encontrar este documento. Ele pode ter sido excluído ou o link pode estar desatualizado."
          icon="alert-circle-outline"
          onActionPress={() => router.replace('/exams')}
          title="Documento não encontrado"
          tone="error"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-app-background px-6 pt-6 dark:bg-app-dark-background">
      <ScreenSkeleton blocks={2} />
    </SafeAreaView>
  );
}
