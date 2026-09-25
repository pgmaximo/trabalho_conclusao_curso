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
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateInput } from '@/components/DateInput';
import { DetailHeader } from '@/components/DetailHeader';
import { FormField } from '@/components/FormField';
import { HachuraPlaceholder } from '@/components/HachuraPlaceholder';
import { InlineError } from '@/components/InlineError';
import { FONTS, RADII, SIZES, useThemeColors, type ThemeColors } from '@/constants/theme';
import {
  getTodayDate,
  createExamDocument,
  ehImagem,
  formatFileSize,
  getExamDocumentIncompleteReason,
  isExamDocumentComplete,
  MAXIMO_DE_FOLHAS,
  type ArquivoSelecionado,
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
  const [documentDate, setDocumentDate] = useState(() => getTodayDate());
  const [expirationDate, setExpirationDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // As folhas 2 a N de um laudo em papel (Bloco 11, E6). So foto ganha folha:
  // PDF ja tem paginas. O teto e o mesmo da extracao.
  const [folhas, setFolhas] = useState<ArquivoSelecionado[]>([]);
  const [erroDaFolha, setErroDaFolha] = useState<string | null>(null);
  const podeFotografarFolha = ehImagem(fileName) && folhas.length + 1 < MAXIMO_DE_FOLHAS;

  async function fotografarFolha() {
    setErroDaFolha(null);
    try {
      const permissao = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissao.granted) {
        setErroDaFolha(
          'Permissão de câmera negada. Habilite o acesso à câmera nas configurações do dispositivo para fotografar as folhas.',
        );
        return;
      }
      const resultado = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
      const foto = resultado.canceled ? null : resultado.assets?.[0];
      if (!foto) return;
      setFolhas((atuais) => [
        ...atuais,
        {
          fileName: foto.fileName || `folha-${Date.now()}.jpg`,
          filePath: foto.uri,
          fileSize: foto.fileSize || 0,
        },
      ]);
    } catch {
      setErroDaFolha('Não foi possível fotografar a folha. Tente novamente.');
    }
  }

  // Estado visual preventivo (Canvas 3b): o botão só habilita quando tipo,
  // nome, data (e validade se receita) estão completos — não depende de
  // alerta reativo pós-toque. Ver isExamDocumentComplete/
  // getExamDocumentIncompleteReason em examService.ts (fonte única de
  // verdade compartilhada com validateExamDocument).
  const formFields = { documentType, documentName, documentDate, expirationDate };
  const isFormValid = isExamDocumentComplete(formFields);
  // spec.md §6: botão desabilitado sempre com motivo (padrão já usado em 1d/Cadastro).
  const disabledReason = isFormValid ? undefined : getExamDocumentIncompleteReason(formFields);

  async function handleSubmit() {
    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await createExamDocument({
        fileName,
        filePath,
        fileSize,
        // documentType já é garantido não-nulo neste ponto por isFormValid (a checagem em
        // getCoreValidationErrors exige tipo selecionado) — o fallback `|| 'exam'` era
        // inalcançável e, com o tipo agora imutável após a criação (3c), enganoso.
        documentType: documentType as DocumentType,
        documentName,
        documentDate,
        expirationDate,
        folhasAdicionais: folhas,
      });

      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar documento';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.background} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <DetailHeader title="Adicionar documento" onBack={() => router.back()} />

          {/* Pré-visualização do arquivo — fundo hachurado decorativo, conforme Canvas 3b
              (specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html linha 298). */}
          <HachuraPlaceholder
            bgColor={colors.background}
            borderColor={colors.borderStrong}
            borderRadius={RADII.card}
            stripeColor={colors.surfaceMuted}
            style={[styles.fileCard, { padding: SIZES.base }]}
          >
            <View style={styles.filePreview}>
              <View style={styles.fileIconWrap}>
                <Ionicons name="document-text-outline" size={26} color={colors.primary} />
              </View>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={2}>
                  {fileName}
                </Text>
                <Text style={styles.fileSize}>
                  {formatFileSize(fileSize)}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Remover arquivo selecionado"
                accessibilityRole="button"
                hitSlop={8}
                style={styles.reuploadButton}
                onPress={() => router.back()}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          </HachuraPlaceholder>

          {/* As outras folhas do laudo (Bloco 11, E6). O Canvas 3b mostra um
              arquivo so; cada folha extra e uma linha no mesmo tom do card, e o
              acrescimo usa o botao secundario do design (constituicao, regra 8). */}
          {folhas.map((folha, i) => (
            <View key={`${folha.filePath}-${i}`} style={styles.folhaRow}>
              <Ionicons name="image-outline" size={20} color={colors.primary} />
              <View style={styles.fileInfo}>
                <Text style={styles.fileName}>{`Folha ${i + 2}`}</Text>
                <Text style={styles.fileSize}>{formatFileSize(folha.fileSize)}</Text>
              </View>
              <Pressable
                accessibilityLabel={`Remover a folha ${i + 2}`}
                accessibilityRole="button"
                hitSlop={8}
                style={styles.reuploadButton}
                onPress={() => setFolhas((atuais) => atuais.filter((_, j) => j !== i))}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          ))}

          {erroDaFolha ? <InlineError message={erroDaFolha} /> : null}

          {podeFotografarFolha ? (
            <Button
              onPress={fotografarFolha}
              style={styles.folhaButton}
              title="Fotografar outra folha"
              variant="secondary"
            />
          ) : null}

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
                  size={20}
                  color={documentType === 'exam' ? colors.primaryDark : colors.textSecondary}
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
                  size={20}
                  color={documentType === 'prescription' ? colors.primaryDark : colors.textSecondary}
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
              placeholder="Ex.: Hemograma completo"
              value={documentName}
              onChangeText={setDocumentName}
            />

            {/* B5 do Bloco 9: o campo mudou de NOME, e nao de comportamento.
                Ele continua vindo preenchido com hoje -- o que produzia o erro
                era o rotulo antigo, lido pela pessoa como "data do exame".
                A data do exame vem do laudo, e a leitura automatica a mostra. */}
            <DateInput
              label={documentType === 'prescription' ? 'Data da receita' : 'Guardado em'}
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

          {submitError ? <InlineError message={submitError} /> : null}

          <Button
            title="Salvar documento"
            onPress={handleSubmit}
            disabled={!isFormValid}
            disabledReason={disabledReason}
            loading={isSubmitting}
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
  fileCard: {
    marginBottom: SIZES.large,
  },
  folhaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.base,
    paddingVertical: SIZES.small,
    paddingHorizontal: SIZES.base,
    marginTop: -SIZES.base,
    marginBottom: SIZES.large,
    borderRadius: RADII.card,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.background,
  },
  folhaButton: {
    marginTop: -SIZES.base,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
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
    flexDirection: 'row',
    height: 56,
    paddingHorizontal: SIZES.base,
    borderRadius: RADII.field,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.small,
    backgroundColor: colors.surface,
  },
  typeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  typeButtonIcon: {
    marginBottom: 0,
  },
  typeButtonLabel: {
    ...FONTS.apoio,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  typeButtonLabelActive: {
    color: colors.primaryDark,
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
