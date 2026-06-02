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
import {
  getTodayDate,
  createExamDocument,
  type DocumentType,
} from '@/services/examService';

type DocumentTypeState = DocumentType | null;

export interface AddExamScreenProps {
  fileName: string;
  filePath: string;
  fileSize: number;
}

export function AddExamScreen({ fileName, filePath, fileSize }: AddExamScreenProps) {
  const [documentType, setDocumentType] = useState<DocumentTypeState>(null);
  const [documentName, setDocumentName] = useState('');
  const [documentDate, setDocumentDate] = useState(getTodayDate());
  const [expirationDate, setExpirationDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);

    try {
      await createExamDocument({
        fileName,
        filePath,
        fileSize,
        documentType: documentType || 'exam',
        documentName,
        documentDate,
        expirationDate,
      });

      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar documento';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  }

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
              <Text style={styles.title}>Adicionar documento</Text>
              <Text style={styles.subtitle}>Configure os detalhes do seu arquivo</Text>
            </View>
          </View>

          {/* File Preview Card */}
          <Card variant="outlined" style={styles.fileCard}>
            <View style={styles.filePreview}>
              <Text style={styles.fileIcon}>📄</Text>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={2}>
                  {fileName}
                </Text>
                <Text style={styles.fileSize}>
                  {(fileSize / 1024).toFixed(1)} KB
                </Text>
              </View>
              <Pressable style={styles.reuploadButton}>
                <Text style={styles.reuploadButtonText}>✎</Text>
              </Pressable>
            </View>
          </Card>

          {/* Document Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tipo de documento</Text>
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
          </View>

          {/* Form Fields */}
          <View style={styles.section}>
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
          </View>

          {/* Info Card */}
          <Card variant="outlined" style={styles.infoCard}>
            <View style={styles.infoContent}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                Seus documentos serão salvos de forma segura. Você pode editar ou deletar
                posteriormente.
              </Text>
            </View>
          </Card>

          <Button
            title="Salvar documento"
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={styles.submitButton}
          />
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
  reuploadButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reuploadButtonText: {
    fontSize: 16,
  },
  section: {
    marginBottom: SIZES.large,
  },
  sectionTitle: {
    ...FONTS.subtitle,
    color: COLORS.text,
    marginBottom: SIZES.base,
  },
  typeButtonContainer: {
    flexDirection: 'row',
    gap: SIZES.base,
  },
  typeButton: {
    flex: 1,
    paddingVertical: SIZES.large,
    paddingHorizontal: SIZES.base,
    borderRadius: SIZES.radius,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  typeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}15`,
  },
  typeButtonIcon: {
    fontSize: 28,
    marginBottom: SIZES.small,
  },
  typeButtonLabel: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '500',
  },
  typeButtonLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  infoCard: {
    marginBottom: SIZES.large,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.base,
  },
  infoIcon: {
    fontSize: 18,
    marginTop: 2,
  },
  infoText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    flex: 1,
  },
  submitButton: {
    marginBottom: SIZES.base,
  },
});
