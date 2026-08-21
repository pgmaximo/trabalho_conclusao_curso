import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from 'nativewind';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import { BottomSheet } from '@/components/BottomSheet';
import { EmptyState } from '@/components/EmptyState';
import { ExamItem } from '@/components/ExamItem';
import { FilterChips } from '@/components/FilterChips';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { Section } from '@/components/Section';
import { RADII, useThemeColors } from '@/constants/theme';
import type { MedicalDocument, MedicalDocumentFilter } from '@/types/models';
import { useSelectedDocument } from '@/contexts/DocumentContext';

// Filtro sem dado real de status de resultado clínico — ver
// specs/03-exames-receitas/lista/plan.md §2 (Opção A). Desabilitado na UI em vez de
// aparentar funcionar e nunca retornar resultado.
const DISABLED_FILTERS: MedicalDocumentFilter[] = ['Alterados'];

type ExamsScreenProps = {
  filterOptions: MedicalDocumentFilter[];
  searchQuery: string;
  activeFilter: MedicalDocumentFilter;
  documents: MedicalDocument[];
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: MedicalDocumentFilter) => void;
};

export function ExamsScreen({
  filterOptions,
  searchQuery,
  activeFilter,
  documents,
  isLoading,
  errorMessage,
  onRetry,
  onSearchChange,
  onFilterChange,
}: ExamsScreenProps) {
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [isPickingFile, setIsPickingFile] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const { setSelectedDocument } = useSelectedDocument();

  // Distingue "vazio real" (nenhum documento ainda) de "busca sem resultado" — spec.md
  // cenário "Busca sem resultados" e critério de aceite correspondente.
  const hasActiveSearchOrFilter = searchQuery.trim() !== '' || activeFilter !== 'Todos';
  const isEmptySearchResult = documents.length === 0 && hasActiveSearchOrFilter;

  function clearFilters() {
    onSearchChange('');
    onFilterChange('Todos');
  }

  async function pickDocument() {
    try {
      setIsPickingFile(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        setIsSheetVisible(false);

        router.push({
          pathname: '/add-exam',
          params: {
            fileName: asset.name,
            filePath: asset.uri,
            fileSize: asset.size || 0,
          },
        });
      }
    } catch (error) {
      console.error('Error picking document:', error);
      alert('Erro ao selecionar o documento. Tente novamente.');
    } finally {
      setIsPickingFile(false);
    }
  }

  async function captureWithCamera() {
    try {
      setIsCapturing(true);
      setCameraPermissionError(null);

      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setCameraPermissionError(
          'Permissão de câmera negada. Habilite o acesso à câmera nas configurações do dispositivo para capturar documentos.',
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `captura-${Date.now()}.jpg`;

        setIsSheetVisible(false);

        router.push({
          pathname: '/add-exam',
          params: {
            fileName,
            filePath: asset.uri,
            fileSize: asset.fileSize || 0,
          },
        });
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      alert('Erro ao capturar a foto. Tente novamente.');
    } finally {
      setIsCapturing(false);
    }
  }

  const emptyState = isEmptySearchResult ? (
    <EmptyState
      icon="search-outline"
      title="Nenhum documento encontrado"
      description="Ajuste os filtros ou a busca para encontrar outro item."
      actionLabel="Limpar filtros"
      onActionPress={clearFilters}
    />
  ) : (
    <EmptyState
      icon="folder-open-outline"
      title="Você ainda não tem documentos"
      description="Adicione seu primeiro exame ou receita para começar a organizar seu histórico."
      actionLabel="Adicionar documento"
      onActionPress={() => setIsSheetVisible(true)}
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-app-background dark:bg-app-dark-background">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-6 pt-6 pb-32" showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <ScreenSkeleton blocks={3} />
          ) : errorMessage ? (
            <EmptyState
              icon="alert-circle-outline"
              title="Não foi possível carregar os documentos"
              description={errorMessage}
              tone="error"
              actionLabel="Tentar novamente"
              onActionPress={onRetry}
            />
          ) : (
            <>
              <ScreenHeader title="Exames e receitas" />

              <View
                style={[
                  styles.searchField,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                ]}
              >
                <Ionicons name="search-outline" size={18} color={colors.iconMuted} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Buscar por nome do exame..."
                  placeholderTextColor={colors.placeholder}
                  value={searchQuery}
                  onChangeText={onSearchChange}
                />
              </View>

              <FilterChips
                options={filterOptions}
                activeFilter={activeFilter}
                onFilterChange={(value) => onFilterChange(value as MedicalDocumentFilter)}
                disabledOptions={DISABLED_FILTERS}
              />

              <Section title="Documentos disponíveis">
                <View className="mb-4">
                  {documents.length > 0
                    ? documents.map((document) => (
                        <ExamItem
                          key={document.id}
                          icon={document.icon}
                          title={document.title}
                          subtitle={document.subtitle}
                          documentType={document.documentType}
                          validityStatus={document.validityStatus}
                          onPress={() => {
                            setSelectedDocument(document);
                            router.push({
                              pathname: '/(app)/document-detail',
                              params: { id: document.id },
                            });
                          }}
                        />
                      ))
                    : emptyState}
                </View>
              </Section>
            </>
          )}
        </ScrollView>

        {/* FAB único (Canvas 3a §3) — ponto de entrada exclusivo para o bottom sheet */}
        {!isLoading && !errorMessage ? (
          <Pressable
            accessibilityLabel="Adicionar documento"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.fab,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.9 },
            ]}
            onPress={() => setIsSheetVisible(true)}
          >
            <Ionicons name="add" size={28} color={colors.onPrimary} />
          </Pressable>
        ) : null}
      </View>

      <BottomSheet
        visible={isSheetVisible}
        title="Adicionar documento"
        onClose={() => setIsSheetVisible(false)}
      >
        <Pressable
          style={({ pressed }) => [
            styles.sheetRow,
            { borderColor: colors.border },
            pressed && { opacity: 0.85 },
          ]}
          disabled={isPickingFile}
          onPress={pickDocument}
        >
          <Ionicons name="document-outline" size={22} color={colors.primary} />
          <Text style={[styles.sheetRowText, { color: colors.text }]}>Enviar PDF ou imagem</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.sheetRow,
            { borderColor: colors.border },
            pressed && { opacity: 0.85 },
          ]}
          disabled={isCapturing}
          onPress={captureWithCamera}
        >
          <Ionicons name="camera-outline" size={22} color={colors.info} />
          <Text style={[styles.sheetRowText, { color: colors.text }]}>Capturar com câmera</Text>
        </Pressable>

        {cameraPermissionError ? (
          <Text style={[styles.permissionError, { color: colors.danger }]}>
            {cameraPermissionError}
          </Text>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.cancelButton,
            { backgroundColor: colors.background },
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => setIsSheetVisible(false)}
        >
          <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancelar</Text>
        </Pressable>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: RADII.field,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 6px 16px rgba(16,121,78,0.35)',
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 56,
    borderRadius: RADII.field,
    borderWidth: 1.5,
    paddingHorizontal: 16,
  },
  sheetRowText: {
    fontSize: 17,
    fontWeight: '600',
  },
  permissionError: {
    fontSize: 14,
    marginTop: -4,
  },
  cancelButton: {
    height: 52,
    borderRadius: RADII.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
