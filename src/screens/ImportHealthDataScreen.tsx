/**
 * Resumo do arquivo:
 * Tela de importação de dados de wearables — consentimento LGPD, seleção de
 * arquivos (CSV/JSON/ZIP do Samsung Health ou de um exportador do Apple
 * Health), validação e upload. Ao concluir, navega para o dashboard já
 * acompanhando o status da nova importação (useHealthImportStatus).
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import * as DocumentPicker from 'expo-document-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

import { BackHeader } from '@/components/BackHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InlineError } from '@/components/InlineError';
import { useThemeColors } from '@/constants/theme';
import {
  createHealthImport,
  MAX_FILE_COUNT,
  MAX_STANDALONE_FILE_SIZE_BYTES,
  MAX_ZIP_SIZE_BYTES,
  type PickedHealthFile,
  validatePickedFiles,
} from '@/services/healthImportService';
import { invalidateHealthImportCache } from '@/hooks/healthImportCache';

const PICKER_MIME_TYPES = [
  'text/csv',
  'text/comma-separated-values',
  'application/json',
  'application/zip',
  'application/x-zip-compressed',
];

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1).replace('.', ',')} KB`;
  return `${(kb / 1024).toFixed(1).replace('.', ',')} MB`;
}

export function ImportHealthDataScreen() {
  const { colorScheme } = useColorScheme();
  const colors = useThemeColors();

  const [consentAccepted, setConsentAccepted] = useState(false);
  const [files, setFiles] = useState<PickedHealthFile[]>([]);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationErrors = validatePickedFiles(files);
  const canSubmit = files.length > 0 && validationErrors.length === 0 && !isSubmitting;

  async function handlePickFiles() {
    setPickerError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: PICKER_MIME_TYPES,
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets) return;

      const newFiles: PickedHealthFile[] = result.assets.map((asset) => ({
        name: asset.name,
        uri: asset.uri,
        size: asset.size ?? 0,
      }));

      setFiles((current) => {
        const combined = [...current, ...newFiles];
        // Remove duplicados exatos (mesmo nome + tamanho) sem excluir
        // arquivos diferentes que coincidentemente compartilham nome.
        const seen = new Set<string>();
        return combined.filter((file) => {
          const key = `${file.name}::${file.size}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      });
    } catch (error) {
      console.error('Error picking health files:', error);
      setPickerError('Erro ao selecionar os arquivos. Tente novamente.');
    }
  }

  function handleRemoveFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const { importId } = await createHealthImport(files);
      await invalidateHealthImportCache();
      router.replace({ pathname: '/health-data', params: { importId } });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível iniciar a importação.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-app-background dark:bg-app-dark-background" edges={['top']}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      <ScrollView contentContainerClassName="px-6 pb-12 pt-6" showsVerticalScrollIndicator={false}>
        <BackHeader onBack={() => router.back()} title="Importar dados de saúde" />
        {!consentAccepted ? (
          <ConsentStep onAccept={() => setConsentAccepted(true)} />
        ) : (
          <>
            <Card padding="regular" style={{ marginBottom: 16 }}>
              <Text className="mb-2 text-[16px] font-semibold text-app-text dark:text-app-dark-text">
                Como exportar seus dados
              </Text>
              <Text className="mb-2 text-[14px] leading-[20px] text-app-textSecondary dark:text-app-dark-textSecondary">
                <Text className="font-semibold">Samsung Health:</Text> abra o app → menu (⋮) → Configurações → Baixar
                dados pessoais. Envie aqui o arquivo .zip inteiro — nós selecionamos os arquivos necessários.
              </Text>
              <Text className="text-[14px] leading-[20px] text-app-textSecondary dark:text-app-dark-textSecondary">
                <Text className="font-semibold">iPhone (Saúde):</Text> o app Saúde da Apple exporta um arquivo XML
                muito grande, que ainda não conseguimos processar. Use um app exportador (ex.: Health Auto Export)
                para gerar CSV ou JSON e selecione esses arquivos aqui.
              </Text>
            </Card>

            {pickerError ? <InlineError message={pickerError} /> : null}
            {submitError ? <InlineError message={submitError} /> : null}
            {validationErrors.length > 0 && files.length > 0 ? (
              <InlineError message={validationErrors[0]?.message ?? ''} />
            ) : null}

            <View className="mb-4 gap-2">
              {files.map((file, index) => (
                <View
                  className="flex-row items-center justify-between rounded-app border border-app-border bg-app-surface p-3 dark:border-app-dark-border dark:bg-app-dark-surface"
                  key={`${file.name}-${index}`}
                >
                  <View className="mr-2 flex-1 flex-row items-center gap-2">
                    <Ionicons color={colors.iconMuted} name="document-outline" size={20} />
                    <View className="flex-1">
                      <Text className="text-[14px] text-app-text dark:text-app-dark-text" numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text className="text-[12px] text-app-textMuted dark:text-app-dark-textMuted">
                        {formatFileSize(file.size)}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    accessibilityLabel={`Remover ${file.name}`}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => handleRemoveFile(index)}
                  >
                    <Ionicons color={colors.danger} name="close-circle" size={22} />
                  </Pressable>
                </View>
              ))}
            </View>

            <Button
              disabled={files.length >= MAX_FILE_COUNT}
              disabledReason={files.length >= MAX_FILE_COUNT ? `Máximo de ${MAX_FILE_COUNT} arquivos.` : undefined}
              onPress={handlePickFiles}
              title={files.length === 0 ? 'Selecionar arquivos' : 'Adicionar mais arquivos'}
              variant="secondary"
            />

            <Text className="mb-4 mt-2 text-[12px] text-app-textMuted dark:text-app-dark-textMuted">
              Até {MAX_FILE_COUNT} arquivos · CSV/JSON até {Math.round(MAX_STANDALONE_FILE_SIZE_BYTES / (1024 * 1024))} MB
              · ZIP até {Math.round(MAX_ZIP_SIZE_BYTES / (1024 * 1024))} MB
            </Text>

            <Button
              disabled={!canSubmit}
              disabledReason={files.length === 0 ? 'Selecione pelo menos um arquivo.' : undefined}
              loading={isSubmitting}
              loadingTitle="Enviando…"
              onPress={handleSubmit}
              title="Importar e analisar"
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type ConsentStepProps = {
  onAccept: () => void;
};

function ConsentStep({ onAccept }: ConsentStepProps) {
  return (
    <View>
      <Card padding="spacious" style={{ marginBottom: 16 }}>
        <Text className="mb-3 text-[18px] font-bold text-app-text dark:text-app-dark-text">
          Antes de importar
        </Text>
        <Text className="mb-3 text-[15px] leading-[22px] text-app-textSecondary dark:text-app-dark-textSecondary">
          Os arquivos que você enviar são processados pela Amazon Bedrock, dentro da conta AWS deste projeto — seus
          dados não são compartilhados com nenhum outro serviço, e a Bedrock não usa o conteúdo para treinar modelos.
        </Text>
        <Text className="mb-3 text-[15px] leading-[22px] text-app-textSecondary dark:text-app-dark-textSecondary">
          Os arquivos brutos ficam guardados por até 30 dias e depois são apagados automaticamente. Você pode excluir
          uma importação (e seus arquivos) a qualquer momento.
        </Text>
        <Text className="text-[15px] leading-[22px] text-app-textSecondary dark:text-app-dark-textSecondary">
          A análise gerada é um apoio informativo — nunca um diagnóstico. Consulte sempre um profissional de saúde.
        </Text>
      </Card>

      <Button onPress={onAccept} title="Concordar e continuar" />
    </View>
  );
}
