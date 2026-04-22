import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { UrgentAlert } from '@/components/UrgentAlert';
import { PreventiveScore } from '@/components/PreventiveScore';
import { HealthCheckItem } from '@/components/HealthCheckItem';
import { BottomTabBar } from '@/components/BottomTabBar';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

const TAB_ITEMS = [
  { icon: '🏠', label: 'Início', id: 'home' },
  { icon: '📋', label: 'Exames', id: 'exams' },
  { icon: '🧠', label: 'IA', id: 'ai' },
  { icon: '⌚', label: 'Watch', id: 'watch' },
  { icon: '👤', label: 'Perfil', id: 'profile' },
];

const HEALTH_CHECKS = [
  {
    id: 1,
    title: 'Hemograma completo',
    date: 'Jan 2025',
    status: 'em_dia' as const,
  },
  {
    id: 2,
    title: 'Eletrocardiograma',
    date: 'Dez 2024',
    status: 'em_dia' as const,
  },
  {
    id: 3,
    title: 'Colesterol total e frações',
    date: 'Mar 2024 — Vencido',
    status: 'vencido' as const,
  },
  {
    id: 4,
    title: 'Glicemia em jejum',
    date: 'Não realizado',
    status: 'pendente' as const,
  },
  {
    id: 5,
    title: 'TSH e T4 livre',
    date: 'Não realizado',
    status: 'pendente' as const,
  },
  {
    id: 6,
    title: 'Pressão arterial (monit.)',
    date: 'Contínuo via wearable',
    status: 'em_dia' as const,
  },
];

export function PreventionScreen({
  onTabPress,
}: {
  onTabPress?: (tabId: string) => void;
}) {
  const [activeTab, setActiveTab] = useState('home');

  const handleTabPress = (tabId: string) => {
    setActiveTab(tabId);
    onTabPress?.(tabId);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Prevenção & Alertas</Text>
            <Text style={styles.subtitle}>Baseado no seu perfil de saúde</Text>
          </View>

          {/* Urgent Alert */}
          <UrgentAlert
            title="Atenção urgente"
            description="Colesterol total não medido há 14 meses. Protocolo para sua faixa etária recomenda exame anual."
            actionLabel="Agendar exame agora"
            onActionPress={() => {}}
          />

          {/* Preventive Score */}
          <PreventiveScore score={68} maxScore={100} status="Bom" />

          {/* Health Checks Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seus exames e verificações</Text>
            {HEALTH_CHECKS.map((check) => (
              <HealthCheckItem
                key={check.id}
                title={check.title}
                date={check.date}
                status={check.status}
                onPress={() => {}}
              />
            ))}
          </View>
        </ScrollView>

        <BottomTabBar
          items={TAB_ITEMS}
          activeTab={activeTab}
          onTabPress={handleTabPress}
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
    marginBottom: SIZES.large,
  },
  title: {
    ...FONTS.heading,
    fontSize: 24,
    color: COLORS.text,
    marginBottom: SIZES.small,
  },
  subtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  section: {
    marginTop: SIZES.large,
  },
  sectionTitle: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SIZES.base,
    fontSize: 13,
  },
});
