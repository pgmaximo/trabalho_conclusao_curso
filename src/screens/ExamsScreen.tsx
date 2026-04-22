import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FilterChips } from '@/components/FilterChips';
import { ExamItem } from '@/components/ExamItem';
import { BottomTabBar } from '@/components/BottomTabBar';
import { Button } from '@/components/Button';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

const FILTER_OPTIONS = ['Todos', 'Exames', 'Receitas', 'Laudos'];

const EXAM_DATA = [
  {
    icon: '✅',
    title: 'Hemograma completo',
    subtitle: '15 jan 2025 - Dr. Silva',
    statusLabel: 'PDF',
    statusColor: '#F39C12',
  },
  {
    icon: '💊',
    title: 'Receita — Losartana 50mg',
    subtitle: '10 jan 2025 - Dr. Gomes',
    statusLabel: 'Receita',
    statusColor: '#3498DB',
  },
  {
    icon: '❤️',
    title: 'ECG — Eletrocardiograma',
    subtitle: '05 dez 2024 - Hospital IMT',
    statusLabel: 'Laudo',
    statusColor: '#27AE60',
  },
  {
    icon: '🩸',
    title: 'Colesterol total e frações',
    subtitle: 'Mar 2024 - Lab Central',
    statusLabel: 'Expirado',
    statusColor: '#E74C3C',
  },
  {
    icon: '📋',
    title: 'TSH e T4 livre',
    subtitle: 'Jul 2023 - Lab Central',
    statusLabel: 'Expirado',
    statusColor: '#E74C3C',
  },
];

const TAB_ITEMS = [
  { icon: '🏠', label: 'Início', id: 'home' },
  { icon: '📋', label: 'Exames', id: 'exams' },
  { icon: '🧠', label: 'IA', id: 'ai' },
  { icon: '⌚', label: 'Watch', id: 'watch' },
  { icon: '👤', label: 'Perfil', id: 'profile' },
];

export function ExamsScreen({ onTabPress }: { onTabPress?: (tabId: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [activeTab, setActiveTab] = React.useState('exams');

  const filteredExams = EXAM_DATA.filter((exam) => {
    const matchesSearch =
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.subtitle.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeFilter === 'Todos') return matchesSearch;
    if (activeFilter === 'Exames') return matchesSearch && exam.statusLabel === 'PDF';
    if (activeFilter === 'Receitas') return matchesSearch && exam.statusLabel === 'Receita';
    if (activeFilter === 'Laudos') return matchesSearch && exam.statusLabel === 'Laudo';
    return matchesSearch;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Exames & Receitas</Text>
            <Pressable style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}>
              <Text style={styles.addButtonText}>+</Text>
            </Pressable>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar exames, receitas..."
              placeholderTextColor={COLORS.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Filter Chips */}
          <FilterChips
            options={FILTER_OPTIONS}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />

          {/* Exam List */}
          <View style={styles.listContainer}>
            {filteredExams.map((exam, index) => (
              <ExamItem
                key={index}
                icon={exam.icon}
                title={exam.title}
                subtitle={exam.subtitle}
                statusLabel={exam.statusLabel}
                statusColor={exam.statusColor}
                onPress={() => {}}
              />
            ))}
          </View>

          {/* Add Document Button */}
          <Button
            title="+ Adicionar novo documento"
            onPress={() => {}}
            style={styles.addDocumentButton}
          />

          {/* Footer Note */}
          <View style={styles.footerNote}>
            <Text style={styles.footerIcon}>🔒</Text>
            <Text style={styles.footerText}>
              Seus documentos são armazenados de forma encriptada em conformidade com a LGPD
            </Text>
          </View>
        </ScrollView>

        <BottomTabBar 
          items={TAB_ITEMS} 
          activeTab={activeTab} 
          onTabPress={(tabId) => {
            setActiveTab(tabId);
            onTabPress?.(tabId);
          }} 
        />
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
    flexDirection: 'column',
  },
  content: {
    paddingHorizontal: SIZES.large,
    paddingTop: SIZES.large,
    paddingBottom: SIZES.large * 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.large,
  },
  title: {
    ...FONTS.heading,
    fontSize: 24,
    color: COLORS.text,
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
    color: COLORS.text,
    ...FONTS.body,
    paddingVertical: 12,
    minHeight: 44,
  },
  listContainer: {
    marginBottom: SIZES.large,
  },
  addDocumentButton: {
    marginBottom: SIZES.large,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.inputBackground,
    borderRadius: SIZES.radius,
    padding: SIZES.base,
    marginBottom: SIZES.large * 2,
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
    lineHeight: 18,
  },
});
