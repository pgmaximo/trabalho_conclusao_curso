import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateInput } from '@/components/DateInput';
import { FormField } from '@/components/FormField';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { updateExamDocument, deleteExamDocument, type DocumentType, type MedicalDocumentMetadata } from '@/services/examService';
import { invalidateExamsCache } from '@/hooks/useExamsData';

export interface DocumentDetailScreenProps {
  document: MedicalDocumentMetadata;
}

export function DocumentDetailScreen({ document }: DocumentDetailScreenProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>(document.documentType);
  const [documentName, setDocumentName] = useState(document.documentName);
  const [documentDate, setDocumentDate] = useState(document.documentDate);
  const [expirationDate, setExpirationDate] = useState(document.expirationDate || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  console.log('=== DocumentDetailScreen Mounted ===');
  console.log('Document prop:', document);
  console.log('State values:', { documentType, documentName, documentDate, expirationDate });

  async function handleSave() {
    setIsSubmitting(true);

    try {
      await updateExamDocument({
        id: document.id,
        documentType,
        documentName,
        documentDate,
        expirationDate,
      });

      await invalidateExamsCache();
      setIsEditMode(false);
      alert('Documento atualizado com sucesso!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar documento';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    console.log('=== handleDelete called ===');
    console.log('Document ID:', document.id);
    console.log('S3 FileName:', document.s3FileName);
    
    const confirmed = confirm(
      'Tem certeza que deseja deletar este documento? Esta ação não pode ser desfeita.'
    );
    
    if (!confirmed) {
      console.log('Delete cancelled');
      return;
    }

    console.log('Delete confirmed, starting deletion...');
    setIsDeleting(true);
    try {
      await deleteExamDocument(document.id, document.s3FileName);
      alert('Documento deletado com sucesso!');
      router.back();
    } catch (error) {
      console.error('Delete error:', error);
      const message = error instanceof Error ? error.message : 'Erro ao deletar documento';
      alert(message);
    } finally {
      setIsDeleting(false);
    }
  }

  const isReadOnly = !isEditMode;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </Pressable>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>
                {isEditMode ? 'Editar documento' : 'Detalhes do documento'}
              </Text>
              {!isEditMode && (
                <Text style={styles.subtitle}>{'Clique em "Editar" para fazer alterações'}</Text>
              )}
            </View>
          </View>

          {/* Document Preview */}
          <Card variant="outlined" style={styles.fileCard}>
            <View style={styles.filePreview}>
              <Text style={styles.fileIcon}>📄</Text>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={2}>
                  {document.originalFileName}
                </Text>
                <Text style={styles.fileSize}>
                  {document.s3FileName}
                </Text>
              </View>
            </View>
          </Card>

          {/* Document Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tipo de documento</Text>
            {isReadOnly ? (
              <View style={styles.readOnlyTypeDisplay}>
                <Text style={styles.readOnlyTypeIcon}>
                  {documentType === 'exam' ? '🩺' : '💊'}
                </Text>
                <Text style={styles.readOnlyTypeText}>
                  {documentType === 'exam' ? 'Exame' : 'Receita'}
                </Text>
              </View>
            ) : (
              <View style={styles.typeButtonContainer}>
                <Pressable
                  style={[
                    styles.typeButton,
                    documentType === 'exam' && styles.typeButtonActive,
                  ]}
                  onPress={() => setDocumentType('exam')}
                >
                  <Text style={styles.typeButtonIcon}>🩺</Text>
                  <Text
                    style={[
                      styles.typeButtonLabel,
                      documentType === 'exam' && styles.typeButtonLabelActive,
                    ]}
                  >
                    Exame
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.typeButton,
                    documentType === 'prescription' && styles.typeButtonActive,
                  ]}
                  onPress={() => setDocumentType('prescription')}
                >
                  <Text style={styles.typeButtonIcon}>💊</Text>
                  <Text
                    style={[
                      styles.typeButtonLabel,
                      documentType === 'prescription' && styles.typeButtonLabelActive,
                    ]}
                  >
                    Receita
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Form Fields */}
          <View style={styles.section}>
            {isReadOnly ? (
              <>
                <View style={styles.readOnlyField}>
                  <Text style={styles.fieldLabel}>Nome do documento</Text>
                  <Text style={styles.readOnlyValue}>{documentName}</Text>
                </View>
                <View style={styles.readOnlyField}>
                  <Text style={styles.fieldLabel}>Data do documento</Text>
                  <Text style={styles.readOnlyValue}>{documentDate}</Text>
                </View>
                {expirationDate && (
                  <View style={styles.readOnlyField}>
                    <Text style={styles.fieldLabel}>Data de validade</Text>
                    <Text style={styles.readOnlyValue}>{expirationDate}</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <FormField
                  label="Nome do documento"
                  placeholder="ex: Hemograma, Tomografia, Receita de Amoxicilina"
                  value={documentName}
                  onChangeText={setDocumentName}
                />

                <DateInput
                  label="Data do documento"
                  value={documentDate}
                  onChange={setDocumentDate}
                  placeholder="DD/MM/YYYY"
                />

                {documentType === 'prescription' && (
                  <DateInput
                    label="Data de validade"
                    value={expirationDate}
                    onChange={setExpirationDate}
                    placeholder="DD/MM/YYYY"
                  />
                )}
              </>
            )}
          </View>

          {/* Action Buttons */}
          {!isEditMode ? (
            <View style={styles.buttonGroup}>
              <Button
                title="Editar documento"
                onPress={() => setIsEditMode(true)}
                style={styles.editButton}
              />
              <Pressable
                onPress={handleDelete}
                disabled={isDeleting}
                style={({ pressed }) => [
                  styles.deleteButtonContainer,
                  pressed && !isDeleting && styles.deleteButtonPressed,
                  isDeleting && styles.deleteButtonDisabled,
                ]}
              >
                <Text style={styles.deleteButtonText}>
                  {isDeleting ? 'Deletando...' : 'Deletar documento'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.buttonGroup}>
              <Button
                title="Salvar"
                onPress={handleSave}
                disabled={isSubmitting}
                style={styles.saveButton}
              />
              <Button
                title="Cancelar"
                onPress={() => {
                  setIsEditMode(false);
                  // Reset to original values
                  setDocumentType(document.documentType);
                  setDocumentName(document.documentName);
                  setDocumentDate(document.documentDate);
                  setExpirationDate(document.expirationDate || '');
                }}
                variant="secondary"
                style={styles.cancelButton}
              />
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SIZES.large,
    paddingTop: SIZES.base,
    paddingBottom: SIZES.large * 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SIZES.large,
    gap: SIZES.base,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: COLORS.text,
    fontWeight: '600',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...FONTS.title,
    color: COLORS.text,
    marginBottom: SIZES.small,
  },
  subtitle: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
  },
  fileCard: {
    marginBottom: SIZES.large,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.base,
  },
  fileIcon: {
    fontSize: 32,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    ...FONTS.body,
    color: COLORS.text,
    marginBottom: 4,
  },
  fileSize: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: SIZES.large,
  },
  sectionTitle: {
    ...FONTS.subtitle,
    color: COLORS.text,
    marginBottom: SIZES.base,
  },
  readOnlyTypeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.base,
    paddingVertical: SIZES.base,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    gap: SIZES.base,
  },
  readOnlyTypeIcon: {
    fontSize: 24,
  },
  readOnlyTypeText: {
    ...FONTS.body,
    color: COLORS.text,
  },
  typeButtonContainer: {
    flexDirection: 'row',
    gap: SIZES.base,
  },
  typeButton: {
    flex: 1,
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.small,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.small,
  },
  typeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}15`,
  },
  typeButtonIcon: {
    fontSize: 28,
  },
  typeButtonLabel: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
  },
  typeButtonLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  readOnlyField: {
    marginBottom: SIZES.base,
  },
  fieldLabel: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SIZES.small,
  },
  readOnlyValue: {
    ...FONTS.body,
    color: COLORS.text,
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.base,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
  },
  editButton: {
    marginBottom: SIZES.base,
  },
  deleteButton: {
    marginBottom: SIZES.base,
  },
  deleteButtonContainer: {
    marginBottom: SIZES.base,
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.large,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonPressed: {
    backgroundColor: '#DC2626',
    opacity: 0.8,
  },
  deleteButtonDisabled: {
    backgroundColor: '#FCA5A5',
    opacity: 0.6,
  },
  deleteButtonText: {
    ...FONTS.body,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonGroup: {
    gap: SIZES.base,
  },
  saveButton: {
    marginBottom: SIZES.small,
  },
  cancelButton: {
    marginBottom: SIZES.small,
  },
});
