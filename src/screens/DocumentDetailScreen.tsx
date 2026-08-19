import React, { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateInput } from '@/components/DateInput';
import { FormField } from '@/components/FormField';
import { FONTS, SIZES, useThemeColors, type ThemeColors } from '@/constants/theme';
import { getDocumentDownloadUrl, updateExamDocument, deleteExamDocument, type DocumentType, type MedicalDocumentMetadata } from '@/services/examService';
import { invalidateExamsCache } from '@/hooks/useExamsData';

export interface DocumentDetailScreenProps {
  document: MedicalDocumentMetadata;
}

// Confirmação multiplataforma: `confirm` não existe no React Native nativo.
async function confirmDeletion(): Promise<boolean> {
  const message = 'Tem certeza que deseja deletar este documento? Esta ação não pode ser desfeita.';

  if (process.env.EXPO_OS === 'web') {
    return window.confirm(message);
  }

  return new Promise((resolve) => {
    Alert.alert('Excluir documento', message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Excluir', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export function DocumentDetailScreen({ document }: DocumentDetailScreenProps) {
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
    
    const confirmed = await confirmDeletion();

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

  // Tipo do arquivo derivado da extensão da chave do S3 (a chave em si não é exibida)
  const fileExtension = (document.s3FileName?.split('.').pop() || '').toUpperCase();
  const fileTypeLabel = fileExtension ? `Arquivo ${fileExtension}` : 'Arquivo';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.background} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
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
              <View style={styles.fileIconWrap}>
                <Ionicons name="document-text-outline" size={26} color={colors.primary} />
              </View>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={2}>
                  {document.documentName}
                </Text>
                <Text style={styles.fileSize} numberOfLines={1}>
                  {fileTypeLabel}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.downloadButton,
                  pressed && styles.downloadButtonPressed,
                ]}
                onPress={async () => {
                  try {
                    const downloadUrl = await getDocumentDownloadUrl(document.s3FileName);
                    await Linking.openURL(downloadUrl);
                  } catch (error) {
                    const message = error instanceof Error ? error.message : 'Erro ao baixar documento.';
                    alert(message);
                  }
                }}
              >
                <Text style={styles.downloadButtonText}>⬇️</Text>
              </Pressable>
            </View>
          </Card>

          {/* Document Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tipo de documento</Text>
            {isReadOnly ? (
              <View style={styles.readOnlyTypeDisplay}>
                <Ionicons
                  name={documentType === 'exam' ? 'flask-outline' : 'medkit-outline'}
                  size={24}
                  color={colors.primary}
                />
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
                  <Ionicons
                    name="flask-outline"
                    size={28}
                    color={documentType === 'exam' ? colors.primary : colors.textSecondary}
                    style={styles.typeButtonIcon}
                  />
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
                  <Ionicons
                    name="medkit-outline"
                    size={28}
                    color={documentType === 'prescription' ? colors.primary : colors.textSecondary}
                    style={styles.typeButtonIcon}
                  />
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...FONTS.title,
    color: colors.text,
    marginBottom: SIZES.small,
  },
  subtitle: {
    ...FONTS.caption,
    color: colors.textSecondary,
  },
  fileCard: {
    marginBottom: SIZES.large,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.base,
  },
  fileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    ...FONTS.body,
    color: colors.text,
    marginBottom: 4,
  },
  fileSize: {
    ...FONTS.caption,
    color: colors.textSecondary,
  },
  downloadButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadButtonPressed: {
    backgroundColor: `${colors.primary}cc`,
  },
  downloadButtonText: {
    color: colors.onPrimary,
    fontSize: 18,
  },
  section: {
    marginBottom: SIZES.large,
  },
  sectionTitle: {
    ...FONTS.subtitle,
    color: colors.text,
    marginBottom: SIZES.base,
  },
  readOnlyTypeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.base,
    paddingVertical: SIZES.base,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderCurve: 'continuous',
    gap: SIZES.base,
  },
  readOnlyTypeText: {
    ...FONTS.body,
    color: colors.text,
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
    borderCurve: 'continuous',
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.small,
  },
  typeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  typeButtonIcon: {
    marginBottom: SIZES.small,
  },
  typeButtonLabel: {
    ...FONTS.caption,
    color: colors.textSecondary,
  },
  typeButtonLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  readOnlyField: {
    marginBottom: SIZES.base,
  },
  fieldLabel: {
    ...FONTS.caption,
    color: colors.textSecondary,
    marginBottom: SIZES.small,
  },
  readOnlyValue: {
    ...FONTS.body,
    color: colors.text,
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.base,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderCurve: 'continuous',
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
    backgroundColor: colors.danger,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonPressed: {
    opacity: 0.8,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
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
