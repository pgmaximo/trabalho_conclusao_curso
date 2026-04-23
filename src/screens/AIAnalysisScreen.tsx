import React from 'react';
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

import { ActionButtonRow } from '@/components/ActionButtonRow';
import { AnalysisTable } from '@/components/AnalysisTable';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { MessageBubble } from '@/components/MessageBubble';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { Section } from '@/components/Section';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import type { AIAnalysisSnapshot } from '@/types/models';

type AIAnalysisScreenProps = {
  analysis: AIAnalysisSnapshot | null;
  searchQuery: string;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onSearchChange: (value: string) => void;
};

export function AIAnalysisScreen({
  analysis,
  searchQuery,
  isLoading,
  errorMessage,
  onRetry,
  onSearchChange,
}: AIAnalysisScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <ScreenSkeleton blocks={3} />
          ) : errorMessage ? (
            <EmptyState
              icon="🧠"
              title="Nao foi possivel carregar a analise"
              description={errorMessage}
              tone="error"
              actionLabel="Tentar novamente"
              onActionPress={onRetry}
            />
          ) : analysis ? (
            <>
              <ScreenHeader
                title="Análise de Exames"
                subtitle="Assistente orientado a explicabilidade para apoiar a leitura inicial dos dados."
                badgeLabel="IA em contexto"
                badgeVariant="secondary"
              />

              <MessageBubble type="ai" content={analysis.introMessage} />
              <MessageBubble type="user" content={analysis.userMessage} />

              <Section title="Leitura estruturada" subtitle="Tabela de métricas e interpretação resumida.">
                <MessageBubble
                  type="ai"
                  content={
                    <View>
                      <Text style={styles.aiResponseTitle}>{analysis.analysisTitle}</Text>
                      <Text style={styles.aiResponseSubtitle}>{analysis.analysisSubtitle}</Text>
                      <AnalysisTable data={analysis.metrics} />
                      <Text style={styles.aiResponseInfo}>{analysis.recommendation}</Text>
                    </View>
                  }
                />
              </Section>

              <Section title="Ações rápidas" subtitle="Atalhos para continuidade do cuidado.">
                <ActionButtonRow
                  actions={analysis.actions.map((action) => ({
                    icon: action.icon,
                    label: action.label,
                    onPress: () => {},
                  }))}
                />
              </Section>

              <Card variant="soft">
                <Pressable
                  style={({ pressed }) => [styles.historyLink, pressed && styles.historyLinkPressed]}
                  onPress={() => {}}
                >
                  <Text style={styles.historyLinkText}>{analysis.historyLabel}</Text>
                  <Text style={styles.historyLinkCount}>{analysis.historyCount}</Text>
                </Pressable>
              </Card>
            </>
          ) : (
            <EmptyState
              icon="🧪"
              title="Nenhuma analise disponivel"
              description="Assim que houver uma conversa ou leitura iniciada, o historico aparecera aqui."
            />
          )}
        </ScrollView>

        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Pergunte sobre seus exames..."
              placeholderTextColor={COLORS.placeholder}
              value={searchQuery}
              onChangeText={onSearchChange}
            />
            <Pressable
              style={({ pressed }) => [styles.sendButton, pressed && styles.sendButtonPressed]}
              onPress={() => {}}
            >
              <Text style={styles.sendIcon}>➤</Text>
            </Pressable>
          </View>
        </View>
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
    paddingTop: SIZES.large,
    paddingBottom: SIZES.large * 2,
  },
  aiResponseTitle: {
    ...FONTS.heading,
    color: COLORS.secondary,
    marginBottom: SIZES.small,
  },
  aiResponseSubtitle: {
    ...FONTS.body,
    color: COLORS.secondary,
    marginBottom: SIZES.base,
  },
  aiResponseInfo: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: SIZES.base,
    lineHeight: 20,
  },
  historyLink: {
    marginTop: SIZES.small,
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
    ...FONTS.body,
    color: COLORS.text,
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
