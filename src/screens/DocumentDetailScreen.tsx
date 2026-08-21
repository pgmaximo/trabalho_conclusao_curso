// =============================================================================
// Arquivo: DocumentDetailScreen.tsx
// Descrição: Tela 3c do Canvas — "Detalhe do documento (ver/editar/excluir)".
// Modos: visualização (card somente-leitura Tipo/Nome/Data[/Data de validade] +
// "Baixar documento"), edição (Nome/Data/[Data de validade] editáveis) e exclusão
// (painel de confirmação inline vermelho — nunca `Alert.alert`/`confirm()` nativo,
// ver specs/design/GAP_ANALYSIS.md item 18 e
// specs/03-exames-receitas/detalhe-documento/spec.md).
// =============================================================================

import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateInput } from '@/components/DateInput';
import { DeleteConfirmPanel } from '@/components/DeleteConfirmPanel';
import { FormField } from '@/components/FormField';
import { InlineError } from '@/components/InlineError';
import { SuccessSnackbar } from '@/components/SuccessSnackbar';
import { useThemeColors } from '@/constants/theme';
import {
  formatDateForDisplay,
  getDocumentDownloadUrl,
  getExamDocumentIncompleteReason,
  isExamDocumentComplete,
  updateExamDocument,
  deleteExamDocument,
  type MedicalDocumentMetadata,
} from '@/services/examService';

export interface DocumentDetailScreenProps {
  document: MedicalDocumentMetadata;
}

export function DocumentDetailScreen({ document }: DocumentDetailScreenProps) {
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();

  const [isEditMode, setIsEditMode] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Tipo do documento não é editável no Canvas 3c (modo edição só expõe Nome/Data/Data de
  // validade) — mantido só como valor de leitura para a linha "Tipo" e para a condição da
  // Data de validade, ver specs/03-exames-receitas/detalhe-documento/spec.md §3.
  const documentType = document.documentType;

  // "Baseline" dos campos editáveis: começa nos valores originais do documento e é
  // atualizada para os valores recém-salvos após um `handleSave` bem-sucedido. Sem isso,
  // `handleCancelEdit` sempre restauraria o dado original (A), mesmo depois de um save
  // que já persistiu um valor novo (B) — sequência editar A→B, Salvar, Editar de novo,
  // Cancelar voltaria a mostrar A com o banco já em B (achado #3 da revisão final).
  const [baseline, setBaseline] = useState({
    documentName: document.documentName,
    documentDate: document.documentDate,
    expirationDate: document.expirationDate || '',
  });

  const [documentName, setDocumentName] = useState(baseline.documentName);
  const [documentDate, setDocumentDate] = useState(baseline.documentDate);
  const [expirationDate, setExpirationDate] = useState(baseline.expirationDate);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isPrescription = documentType === 'prescription';
  const typeLabel = documentType === 'exam' ? 'Exame' : 'Receita';

  // Mesma fonte única de verdade de validação usada em `AddExamScreen.tsx` (3b) — nunca
  // grava nome/data/validade vazios silenciosamente (achado #1 da revisão final). Tipo é
  // sempre não-nulo aqui (documento já existe e é imutável em 3c).
  const formFields = { documentType, documentName, documentDate, expirationDate };
  const isFormValid = isExamDocumentComplete(formFields);
  const disabledReason = isFormValid ? undefined : getExamDocumentIncompleteReason(formFields);
  const isSaveDisabled = isSubmitting || !isFormValid;

  async function handleSave() {
    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);
    setSaveError(null);

    try {
      await updateExamDocument({
        id: document.id,
        documentName,
        documentDate,
        expirationDate: isPrescription ? expirationDate : undefined,
      });

      // updateExamDocument já invalida o cache internamente (achado #2 da revisão final).
      setBaseline({ documentName, documentDate, expirationDate });
      setIsEditMode(false);
      setSuccessMessage('Documento atualizado com sucesso!');
    } catch (error) {
      // Campos editados permanecem preenchidos e a tela continua em modo edição —
      // spec.md cenário "Salvar edição (erro)".
      const message = error instanceof Error ? error.message : 'Erro ao atualizar documento.';
      setSaveError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancelEdit() {
    setIsEditMode(false);
    setSaveError(null);
    setDocumentName(baseline.documentName);
    setDocumentDate(baseline.documentDate);
    setExpirationDate(baseline.expirationDate);
  }

  async function handleConfirmDelete() {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteExamDocument(document.id, document.s3FileName);
      router.replace('/exams');
    } catch (error) {
      // Painel fecha e o usuário permanece na tela do documento para nova tentativa —
      // spec.md cenário "Confirmar exclusão (erro)".
      const message = error instanceof Error ? error.message : 'Erro ao excluir documento.';
      setDeleteError(message);
      setIsConfirmingDelete(false);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDownload() {
    setDownloadError(null);

    try {
      const downloadUrl = await getDocumentDownloadUrl(document.s3FileName);
      await Linking.openURL(downloadUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao baixar documento.';
      setDownloadError(message);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-app-background dark:bg-app-dark-background">
      <StatusBar backgroundColor={colors.background} style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-6 pt-6 pb-32" showsVerticalScrollIndicator={false}>
          {/* Cabeçalho: voltar + título dinâmico + "Editar" (só em modo visualização) */}
          <View className="mb-6 flex-row items-center gap-3">
            <Pressable
              accessibilityLabel="Voltar"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              className="size-12 items-center justify-center rounded-field border-[1.5px] border-app-border dark:border-app-dark-border"
            >
              <Ionicons color={colors.text} name="chevron-back" size={22} />
            </Pressable>

            <Text className="flex-1 text-[20px] font-semibold text-app-text dark:text-app-dark-text">
              {isEditMode ? 'Editar documento' : 'Detalhes do documento'}
            </Text>

            {!isEditMode ? (
              <Pressable
                accessibilityLabel="Editar documento"
                accessibilityRole="button"
                onPress={() => setIsEditMode(true)}
                style={({ pressed }) => [pressed && { opacity: 0.8 }]}
                className="h-12 items-center justify-center rounded-field border-[1.5px] border-app-border px-4 dark:border-app-dark-border"
              >
                <Text className="text-[15px] font-semibold text-app-secondary dark:text-app-dark-secondary">
                  Editar
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Pré-visualização do arquivo — placeholder decorativo, não é preview real do
              conteúdo (spec.md §3: "fundo hachurado ... placeholder visual"). */}
          <View
            className="mb-6 items-center justify-center rounded-2xl border-[1.5px] border-dashed border-app-border bg-app-surfaceMuted dark:border-app-dark-border dark:bg-app-dark-surfaceMuted"
            style={{ height: 150 }}
          >
            <View
              className="items-center justify-center rounded-2xl border-2 border-app-textMuted dark:border-app-dark-textMuted"
              style={{ height: 80, width: 64 }}
            >
              <Ionicons color={colors.textMuted} name="document-text-outline" size={32} />
            </View>
          </View>

          {isEditMode ? (
            <>
              {saveError ? <InlineError message={saveError} /> : null}

              <FormField
                label="Nome do documento"
                placeholder="ex: Hemograma, Tomografia, Receita de Amoxicilina"
                value={documentName}
                onChangeText={setDocumentName}
              />

              <DateInput
                label="Data do documento"
                onChange={setDocumentDate}
                placeholder="DD/MM/YYYY"
                value={documentDate}
              />

              {isPrescription ? (
                <DateInput
                  label="Data de validade"
                  onChange={setExpirationDate}
                  placeholder="DD/MM/YYYY"
                  value={expirationDate}
                />
              ) : null}

              {/* Botões lado a lado (spec.md §3) — Pressables dedicados em vez de <Button>
                  porque este último força `w-full`, incompatível com um layout flex-1 de
                  duas colunas. */}
              <View className="mt-8 flex-row gap-[10px]">
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={handleCancelEdit}
                  style={({ pressed }) => [pressed && !isSubmitting && { opacity: 0.85 }]}
                  className="h-14 flex-1 items-center justify-center rounded-field border border-app-primary dark:border-app-dark-primary"
                >
                  <Text className="text-[17px] font-semibold text-app-primary dark:text-app-dark-primary">
                    Cancelar
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ busy: isSubmitting, disabled: isSaveDisabled }}
                  disabled={isSaveDisabled}
                  onPress={handleSave}
                  style={({ pressed }) => [pressed && !isSaveDisabled && { opacity: 0.88 }]}
                  className={
                    !isFormValid && !isSubmitting
                      ? 'h-14 flex-1 items-center justify-center rounded-field border border-app-border bg-app-border dark:border-app-dark-border dark:bg-app-dark-border'
                      : isSubmitting
                        ? 'h-14 flex-1 items-center justify-center rounded-field bg-app-primaryDark dark:bg-app-dark-primaryDark'
                        : 'h-14 flex-1 items-center justify-center rounded-field bg-app-primary dark:bg-app-dark-primary'
                  }
                >
                  <Text
                    className={
                      !isFormValid && !isSubmitting
                        ? 'text-[17px] font-semibold text-app-textMuted dark:text-app-dark-textMuted'
                        : 'text-[17px] font-semibold text-app-onPrimary dark:text-app-dark-onPrimary'
                    }
                  >
                    {isSubmitting ? 'Salvando…' : 'Salvar'}
                  </Text>
                </Pressable>
              </View>

              {disabledReason && !isSubmitting ? (
                <Text className="mt-2 text-center text-[13px] text-app-textSecondary dark:text-app-dark-textSecondary">
                  {disabledReason}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              {/* Card somente-leitura: Tipo/Nome/Data(/Data de validade), linhas com divisor */}
              <Card padding="regular" style={{ marginBottom: 20 }} variant="surface">
                <View className="border-b border-app-border pb-3 dark:border-app-dark-border">
                  <Text className="text-[16px] text-app-textSecondary dark:text-app-dark-textSecondary">
                    Tipo
                  </Text>
                  <Text className="mt-1 text-[17px] font-semibold text-app-text dark:text-app-dark-text">
                    {typeLabel}
                  </Text>
                </View>

                <View className="border-b border-app-border py-3 dark:border-app-dark-border">
                  <Text className="text-[16px] text-app-textSecondary dark:text-app-dark-textSecondary">
                    Nome
                  </Text>
                  <Text className="mt-1 text-[17px] font-semibold text-app-text dark:text-app-dark-text">
                    {documentName}
                  </Text>
                </View>

                <View
                  className={isPrescription && expirationDate ? 'border-b border-app-border py-3 dark:border-app-dark-border' : 'pt-3'}
                >
                  <Text className="text-[16px] text-app-textSecondary dark:text-app-dark-textSecondary">
                    Data
                  </Text>
                  <Text className="mt-1 text-[17px] font-semibold text-app-text dark:text-app-dark-text">
                    {formatDateForDisplay(documentDate)}
                  </Text>
                </View>

                {isPrescription && expirationDate ? (
                  <View className="pt-3">
                    <Text className="text-[16px] text-app-textSecondary dark:text-app-dark-textSecondary">
                      Data de validade
                    </Text>
                    <Text className="mt-1 text-[17px] font-semibold text-app-text dark:text-app-dark-text">
                      {formatDateForDisplay(expirationDate)}
                    </Text>
                  </View>
                ) : null}
              </Card>

              {downloadError ? <InlineError message={downloadError} /> : null}

              <Pressable
                accessibilityLabel="Baixar documento"
                accessibilityRole="button"
                onPress={handleDownload}
                style={({ pressed }) => [pressed && { opacity: 0.85 }]}
                className="mb-6 h-14 flex-row items-center justify-center gap-2 rounded-field border-[1.5px] border-app-primary dark:border-app-dark-primary"
              >
                <Ionicons color={colors.primaryDark} name="arrow-down-outline" size={20} />
                <Text className="text-[17px] font-semibold text-app-primaryDark dark:text-app-dark-primaryDark">
                  Baixar documento
                </Text>
              </Pressable>

              {deleteError ? <InlineError message={deleteError} /> : null}

              {isConfirmingDelete ? (
                <DeleteConfirmPanel
                  isDeleting={isDeleting}
                  onCancel={() => setIsConfirmingDelete(false)}
                  onConfirm={handleConfirmDelete}
                />
              ) : (
                <Button
                  onPress={() => setIsConfirmingDelete(true)}
                  style={{ marginTop: 0 }}
                  title="Excluir documento"
                  variant="destructive"
                />
              )}
            </>
          )}
        </ScrollView>
      </View>

      <SuccessSnackbar
        durationMs={4000}
        message={successMessage ?? ''}
        onHide={() => setSuccessMessage(null)}
        visible={successMessage !== null}
      />
    </SafeAreaView>
  );
}
