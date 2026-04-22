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
import { MessageBubble } from '@/components/MessageBubble';
import { AnalysisTable } from '@/components/AnalysisTable';
import { ActionButtonRow } from '@/components/ActionButtonRow';
import { BottomTabBar } from '@/components/BottomTabBar';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

const TAB_ITEMS = [
  { icon: '🏠', label: 'Início', id: 'home' },
  { icon: '📋', label: 'Exames', id: 'exams' },
  { icon: '🧠', label: 'IA', id: 'ai' },
  { icon: '⌚', label: 'Watch', id: 'watch' },
  { icon: '👤', label: 'Perfil', id: 'profile' },
];

const ANALYSIS_DATA = [
  { label: 'Ferritina', value: '18 ng/mL', status: 'Baixo', statusColor: '#F39C12' },
  { label: 'Glicose', value: '92 mg/dL', status: 'Normal', statusColor: '#27AE60' },
  { label: 'Colesterol total', value: '182 mg/dL', status: 'Normal', statusColor: '#27AE60' },
  { label: 'Hemoglobina', value: '11.2 g/dL', status: 'Atenção', statusColor: '#E74C3C' },
];

export function AIAnalysisScreen({ onTabPress }: { onTabPress?: (tabId: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ai');

  const handleTabPress = (tabId: string) => {
    setActiveTab(tabId);
    onTabPress?.(tabId);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Análise de Exames</Text>
            <Text style={styles.subtitle}>Assistente de saúde por IA</Text>
          </View>

          {/* Tip Message */}
          <MessageBubble
            type="ai"
            content="Envie a foto ou PDF do seu exame e faço uma análise preliminar dos resultados."
          />

          {/* User Message */}
          <MessageBubble type="user" content="Aqui está meu hemograma" />

          {/* AI Response with Analysis */}
          <MessageBubble
            type="ai"
            content={
              <View>
                <Text style={styles.aiResponseTitle}>Hemograma — Análise preliminar</Text>
                <Text style={styles.aiResponseSubtitle}>Identifiquei os seguintes pontos:</Text>
                <AnalysisTable data={ANALYSIS_DATA} />
                <Text style={styles.aiResponseInfo}>
                  A ferritina está abaixo do nível. Converse com seu médico sobre suplementação de ferro.
                </Text>
              </View>
            }
          />

          {/* Action Buttons */}
          <ActionButtonRow
            actions={[
              { icon: '📷', label: 'Câmera', onPress: () => {} },
              { icon: '📄', label: 'PDF', onPress: () => {} },
              { icon: '📊', label: 'Histórico', onPress: () => {} },
            ]}
          />

          {/* History Link */}
          <Pressable
            style={({ pressed }) => [styles.historyLink, pressed && styles.historyLinkPressed]}
            onPress={() => {}}
          >
            <Text style={styles.historyLinkText}>Ver histórico de análises anteriores →</Text>
            <Text style={styles.historyLinkCount}>5 análises nos últimos 6 meses</Text>
          </Pressable>
        </ScrollView>

        {/* Search Input */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Pergunte sobre seus exames..."
              placeholderTextColor={COLORS.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <Pressable
              style={({ pressed }) => [styles.sendButton, pressed && styles.sendButtonPressed]}
              onPress={() => {}}
            >
              <Text style={styles.sendIcon}>➤</Text>
            </Pressable>
          </View>
        </View>

        <BottomTabBar items={TAB_ITEMS} activeTab={activeTab} onTabPress={handleTabPress} />
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
    marginBottom: SIZES.large,
  },
  title: {
    ...FONTS.heading,
    fontSize: 22,
    color: COLORS.text,
    marginBottom: SIZES.small,
  },
  subtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
  },
  aiResponseTitle: {
    ...FONTS.heading,
    color: '#5B3B8F',
    marginBottom: SIZES.small,
  },
  aiResponseSubtitle: {
    ...FONTS.body,
    color: '#5B3B8F',
    marginBottom: SIZES.base,
  },
  aiResponseInfo: {
    ...FONTS.caption,
    color: '#5B3B8F',
    marginTop: SIZES.base,
    lineHeight: 20,
  },
  historyLink: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.base,
    paddingVertical: SIZES.small,
    marginBottom: SIZES.large,
    backgroundColor: '#E8F5EB',
    marginTop: SIZES.large,
  },
  historyLinkPressed: {
    opacity: 0.85,
  },
  historyLinkText: {
    ...FONTS.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
  historyLinkCount: {
    ...FONTS.caption,
    color: COLORS.primary,
    marginTop: 4,
  },
  searchSection: {
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.base,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.base,
    paddingRight: SIZES.small,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    ...FONTS.body,
    paddingVertical: 12,
    minHeight: 44,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonPressed: {
    opacity: 0.85,
  },
  sendIcon: {
    fontSize: 18,
    color: '#fff',
  },
});
