import React, { useMemo, useState } from 'react';
import {
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
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.background} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </Pressable>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Adicionar documento</Text>
              <Text style={styles.subtitle}>Configure os detalhes do seu arquivo</Text>
            </View>
          </View>

          {/* File Preview Card */}
          <Card variant="outlined" style={styles.fileCard}>
            <View style={styles.filePreview}>
              <View style={styles.fileIconWrap}>
                <Ionicons name="document-text-outline" size={26} color={colors.primary} />
              </View>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={2}>
                  {fileName}
                </Text>
                <Text style={styles.fileSize}>
                  {(fileSize / 1024).toFixed(1)} KB
                </Text>
              </View>
              <Pressable style={styles.reuploadButton}>
                <Ionicons name="create-outline" size={18} color={colors.text} />
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
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={colors.info}
                style={styles.infoIcon}
              />
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
  reuploadButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: SIZES.large,
  },
  sectionTitle: {
    ...FONTS.subtitle,
    color: colors.text,
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
    borderCurve: 'continuous',
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  typeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  typeButtonIcon: {
    marginBottom: SIZES.small,
  },
  typeButtonLabel: {
    ...FONTS.body,
    color: colors.text,
    fontWeight: '500',
  },
  typeButtonLabelActive: {
    color: colors.primary,
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
    marginTop: 2,
  },
  infoText: {
    ...FONTS.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  submitButton: {
    marginBottom: SIZES.base,
  },
});
