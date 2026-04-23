import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ExamItem } from '@/components/ExamItem';
import { FilterChips } from '@/components/FilterChips';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { Section } from '@/components/Section';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import type { MedicalDocument, MedicalDocumentFilter } from '@/types/models';

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
  const [isSheetVisible, setIsSheetVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <ScreenSkeleton blocks={3} />
          ) : errorMessage ? (
            <EmptyState
              icon="📄"
              title="Nao foi possivel carregar os documentos"
              description={errorMessage}
              tone="error"
              actionLabel="Tentar novamente"
              onActionPress={onRetry}
            />
          ) : (
            <>
              <ScreenHeader
                title="Exames & Receitas"
                subtitle="Seus documentos ficam organizados aqui para acesso rapido e seguro."
                action={
                  <Pressable
                    style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
                    onPress={() => setIsSheetVisible(true)}
                  >
                    <Text style={styles.addButtonText}>+</Text>
                  </Pressable>
                }
              />

              <View style={styles.searchContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar exames, receitas..."
                  placeholderTextColor={COLORS.placeholder}
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
                subtitle="A lista ja responde aos filtros e ao campo de busca."
              >
                <View style={styles.listContainer}>
                  {documents.length > 0 ? (
                    documents.map((document) => (
                      <ExamItem
                        key={`${document.title}-${document.subtitle}`}
                        icon={document.icon}
                        title={document.title}
                        subtitle={document.subtitle}
                        statusLabel={document.statusLabel}
                        statusColor={document.statusColor}
                        onPress={() => {}}
                      />
                    ))
                  ) : (
                    <EmptyState
                      icon="🗂️"
                      title="Nenhum documento encontrado"
                      description="Ajuste os filtros ou a busca para encontrar outro item."
                    />
                  )}
                </View>
              </Section>

              <Button
                title="+ Adicionar novo documento"
                onPress={() => setIsSheetVisible(true)}
                style={styles.addDocumentButton}
              />

              <Card variant="outlined">
                <View style={styles.footerNote}>
                  <Text style={styles.footerIcon}>🔒</Text>
                  <Text style={styles.footerText}>
                    Seus documentos sao armazenados de forma segura e a camada de servicos ja esta
                    preparada para migrar de mocks para AWS no backend real.
                  </Text>
                </View>
              </Card>
            </>
          )}
        </ScrollView>
      </View>

      <BottomSheet
        visible={isSheetVisible}
        title="Adicionar documento"
        description="Escolha o tipo de origem que voce pretende integrar no futuro."
        onClose={() => setIsSheetVisible(false)}
      >
        <Button title="Enviar PDF ou imagem" onPress={() => setIsSheetVisible(false)} />
        <Button
          title="Capturar com a camera"
          variant="secondary"
          onPress={() => setIsSheetVisible(false)}
        />
      </BottomSheet>
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
    paddingTop: SIZES.large,
    paddingBottom: SIZES.large * 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonPressed: {
    opacity: 0.85,
  },
  addButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.base,
    marginBottom: SIZES.large,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: SIZES.small,
  },
  searchInput: {
    flex: 1,
    ...FONTS.body,
    color: COLORS.text,
    paddingVertical: 12,
    minHeight: 44,
  },
  listContainer: {
    marginBottom: SIZES.base,
  },
  addDocumentButton: {
    marginBottom: SIZES.large,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  footerIcon: {
    fontSize: 16,
    marginRight: SIZES.small,
    marginTop: 2,
  },
  footerText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    flex: 1,
  },
});
