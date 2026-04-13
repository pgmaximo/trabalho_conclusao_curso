import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MetricCard } from '@/components/MetricCard';
import { EventCard } from '@/components/EventCard';
import { QuickAccessButton } from '@/components/QuickAccessButton';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

export function DashboardScreen() {
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
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
              icon="🧠"
              label="IA p/ Exames"
              onPress={() => {}}
            />
            <QuickAccessButton
              icon="📝"
              label="+ Exame"
              onPress={() => {}}
            />
            <QuickAccessButton
              icon="📅"
              label="+ Consulta"
              onPress={() => {}}
            />
            <QuickAccessButton
              icon="⌚"
              label="Wearable"
              onPress={() => {}}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
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
