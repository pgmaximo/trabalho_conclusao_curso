import React, { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from 'nativewind';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ExamItem } from '@/components/ExamItem';
import { FilterChips } from '@/components/FilterChips';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { Section } from '@/components/Section';
import { useThemeColors } from '@/constants/theme';
import type { MedicalDocument, MedicalDocumentFilter } from '@/types/models';
import { useSelectedDocument } from '@/contexts/DocumentContext';

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
  const { setSelectedDocument } = useSelectedDocument();

  async function pickDocument() {
    try {
      setIsPickingFile(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Close the bottom sheet
        setIsSheetVisible(false);

        // Navigate to AddExamScreen with file details
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

  return (
    <SafeAreaView className="flex-1 bg-app-background dark:bg-app-dark-background">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-6 pt-6 pb-12" showsVerticalScrollIndicator={false}>
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
              <ScreenHeader
                title="Exames & Receitas"
                subtitle="Seus documentos ficam organizados aqui para acesso rápido e seguro."
                action={
                  <Pressable
                    className="h-10 w-10 items-center justify-center rounded-full bg-app-primary dark:bg-app-dark-primary"
                    style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
                    onPress={() => setIsSheetVisible(true)}
                  >
                    <Ionicons name="add" size={24} color={colors.onPrimary} />
                  </Pressable>
                }
              />

              <View className="mb-6 flex-row items-center rounded-app border border-app-border bg-app-inputBackground px-4 dark:border-app-dark-border dark:bg-app-dark-inputBackground">
                <Ionicons className="mr-3" name="search-outline" size={18} color={colors.iconMuted} />
                <TextInput
                  className="flex-1 py-3 text-[15px] text-app-text dark:text-app-dark-text"
                  placeholder="Buscar exames, receitas..."
                  placeholderTextColor={colors.placeholder}
                  value={searchQuery}
                  onChangeText={onSearchChange}
                />
              </View>

              <FilterChips
                options={filterOptions}
                activeFilter={activeFilter}
                onFilterChange={(value) => onFilterChange(value as MedicalDocumentFilter)}
              />

              <Section
                title="Documentos disponíveis"
                subtitle="A lista já responde aos filtros e ao campo de busca."
              >
                <View className="mb-4">
                  {documents.length > 0 ? (
                    documents.map((document) => (
                      <ExamItem
                        key={`${document.title}-${document.subtitle}`}
                        icon={document.icon}
                        title={document.title}
                        subtitle={document.subtitle}
                        statusLabel={document.statusLabel}
                        statusColor={document.statusColor}
                        onPress={() => {
                          setSelectedDocument(document);
                          // Navigate to document detail screen
                          router.push('/(app)/document-detail');
                        }}
                      />
                    ))
                  ) : (
                    <EmptyState
                      icon="folder-open-outline"
                      title="Nenhum documento encontrado"
                      description="Ajuste os filtros ou a busca para encontrar outro item."
                    />
                  )}
                </View>
              </Section>

              <Button
                title="+ Adicionar novo documento"
                onPress={() => setIsSheetVisible(true)}
              />
            </>
          )}
        </ScrollView>
      </View>

      <BottomSheet
        visible={isSheetVisible}
        title="Adicionar documento"
        description="Selecione o tipo de documento para adicionar."
        onClose={() => setIsSheetVisible(false)}
      >
        <Button
          title="Enviar PDF ou imagem"
          onPress={pickDocument}
          disabled={isPickingFile}
        />
        <Button
          title="Capturar com a câmera"
          variant="secondary"
          onPress={() => setIsSheetVisible(false)}
        />
      </BottomSheet>
    </SafeAreaView>
  );
}
