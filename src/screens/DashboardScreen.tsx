import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MetricCard } from '@/components/MetricCard';
import { EventCard } from '@/components/EventCard';
import { QuickAccessButton } from '@/components/QuickAccessButton';
import { BottomTabBar } from '@/components/BottomTabBar';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

const TAB_ITEMS = [
  { icon: '🏠', label: 'Início', id: 'home' },
  { icon: '📋', label: 'Exames', id: 'exams' },
  { icon: '🧠', label: 'IA', id: 'ai' },
  { icon: '⌚', label: 'Watch', id: 'watch' },
  { icon: '👤', label: 'Perfil', id: 'profile' },
];

type DashboardScreenProps = {
  onTabPress?: (tabId: string) => void;
  onNavigateToMedicines?: () => void;
  onNavigateToAppointments?: () => void;
  onNavigateToPrevention?: () => void;
};

export function DashboardScreen({ onTabPress, onNavigateToMedicines, onNavigateToAppointments, onNavigateToPrevention }: DashboardScreenProps) {
  const [activeTab, setActiveTab] = React.useState('home');
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, André 👋</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
        </View>

        {/* Today's Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seu resumo de hoje</Text>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryValue}>72 bpm</Text>
            <Text style={styles.summaryStatus}>Normal</Text>
          </View>
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricsRow}>
            <MetricCard
              label="Freq. Cardíaca"
              value="72 bpm"
              status="Normal"
              statusColor="#E74C3C"
              progressPercent={65}
            />
            <MetricCard
              label="Sono Ontem"
              value="7h 24min"
              status="Bom"
              statusColor="#3498DB"
              progressPercent={70}
            />
          </View>
          <View style={styles.metricsRow}>
            <MetricCard
              label="Passos Hoje"
              value="6.842"
              status="68% da meta"
              statusColor="#9B59B6"
              progressPercent={68}
            />
            <MetricCard
              label="Medicamentos"
              value="2 pend."
              status="Atenção"
              statusColor="#F39C12"
              progressPercent={40}
            />
          </View>
        </View>

        {/* Upcoming Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Próximos eventos</Text>
          <EventCard
            icon="📋"
            title="Consulta — Cardiologista"
            subtitle="Amanhã, 10h00"
            actionLabel="Consulta"
            actionColor={COLORS.primary}
            onActionPress={() => {}}
          />
          <EventCard
            icon="✅"
            title="Hemograma completo"
            subtitle="Pendente — recomendado"
            actionLabel="Exame"
            actionColor="#F39C12"
            onActionPress={() => {}}
          />
          <EventCard
            icon="💊"
            title="Losartana 50mg"
            subtitle="Dose das 12h pendente"
            actionLabel="Medicamento"
            actionColor="#E74C3C"
            onActionPress={() => {}}
          />
        </View>

        {/* Alert Section */}
        <View style={styles.section}>
          <EventCard
            icon="⚠️"
            title="Alerta preventivo"
            subtitle="Colesterol não medido há 14 meses. Protocolo anual recomendado."
            variant="alert"
          />
        </View>

        {/* Quick Access */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acesso rápido</Text>
          <View style={styles.quickAccessRow}>
            <QuickAccessButton
              icon="📅"
              label="Agendas"
              onPress={onNavigateToAppointments}
            />
            <QuickAccessButton
              icon="🧠"
              label="IA p/ Exames"
              onPress={() => {}}
            />
            <QuickAccessButton
              icon="💊"
              label="Medicamentos"
              onPress={onNavigateToMedicines}
            />
            <QuickAccessButton
              icon="⌚"
              label="Wearable"
              onPress={() => {}}
            />
          </View>
          <View style={styles.quickAccessRow}>
            <QuickAccessButton
              icon="🛡️"
              label="Prevenção"
              onPress={onNavigateToPrevention}
            />
          </View>
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
    marginBottom: SIZES.large,
  },
  greeting: {
    ...FONTS.title,
    fontSize: 28,
    color: COLORS.text,
  },
  date: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: SIZES.large * 1.5,
  },
  sectionTitle: {
    ...FONTS.heading,
    marginBottom: SIZES.base,
  },
  summaryBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.base,
    paddingVertical: SIZES.small,
    alignSelf: 'flex-start',
  },
  summaryValue: {
    ...FONTS.body,
    color: '#fff',
    fontWeight: '700',
  },
  summaryStatus: {
    ...FONTS.caption,
    color: '#fff',
    marginTop: 2,
  },
  metricsGrid: {
    marginBottom: SIZES.large,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: SIZES.medium,
  },
  quickAccessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
