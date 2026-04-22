import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MedicineCard } from '@/components/MedicineCard';
import { MedicineStock } from '@/components/MedicineStock';
import { ReminderBanner } from '@/components/ReminderBanner';
import { BottomTabBar } from '@/components/BottomTabBar';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

const TAB_ITEMS = [
  { icon: '🏠', label: 'Início', id: 'home' },
  { icon: '📋', label: 'Exames', id: 'exams' },
  { icon: '🧠', label: 'IA', id: 'ai' },
  { icon: '⌚', label: 'Watch', id: 'watch' },
  { icon: '👤', label: 'Perfil', id: 'profile' },
];

const PENDING_MEDICINES = [
  {
    id: 1,
    name: 'Losartana 50mg',
    dosage: 'Hipertensão',
    time: '08h00',
    status: 'pending' as const,
  },
  {
    id: 2,
    name: 'Atenolol 25mg',
    dosage: 'Cardíaco',
    time: '12h00',
    status: 'pending' as const,
  },
  {
    id: 3,
    name: 'Vitamina D3 2000UI',
    dosage: 'Suplementação',
    time: '07:30',
    status: 'taken' as const,
  },
];

const MEDICINE_STOCKS = [
  {
    id: 1,
    name: 'Losartana 50mg',
    quantity: 34,
    unit: 'comp.',
    status: 'low' as const,
    percentage: 45,
  },
  {
    id: 2,
    name: 'Atenolol 25mg',
    quantity: 28,
    unit: 'comp.',
    status: 'ok' as const,
    percentage: 70,
  },
  {
    id: 3,
    name: 'Vitamina D3 2000UI',
    quantity: 60,
    unit: 'caps.',
    status: 'ok' as const,
    percentage: 100,
  },
];

export function MedicinesScreen({ onTabPress }: { onTabPress?: (tabId: string) => void }) {
  const [activeTab, setActiveTab] = useState('home');
  const [medicines, setMedicines] = useState(PENDING_MEDICINES);

  const handleTabPress = (tabId: string) => {
    setActiveTab(tabId);
    onTabPress?.(tabId);
  };

  const handleToggleMedicineStatus = (medicineId: number) => {
    setMedicines((prev) =>
      prev.map((med) =>
        med.id === medicineId
          ? {
              ...med,
              status: med.status === 'taken' ? 'pending' : 'taken',
            }
          : med
      )
    );
  };

  const pendingCount = medicines.filter((m) => m.status === 'pending').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.title}>Medicamentos</Text>
              <Pressable
                style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
                onPress={() => {}}
              >
                <Text style={styles.addButtonText}>+</Text>
              </Pressable>
            </View>
            <Text style={styles.subtitle}>
              {pendingCount} dose{pendingCount !== 1 ? 's' : ''} pendente{pendingCount !== 1 ? 's' : ''} hoje
            </Text>
          </View>

          {/* Pending Medicines Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Próximos medicamentos</Text>
            {medicines.map((medicine) => (
              <MedicineCard
                key={medicine.id}
                name={medicine.name}
                dosage={medicine.dosage}
                time={medicine.time}
                status={medicine.status}
                onToggle={() => handleToggleMedicineStatus(medicine.id)}
              />
            ))}
          </View>

          {/* Stock Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estoques de medicamentos</Text>
            {MEDICINE_STOCKS.map((stock) => (
              <MedicineStock
                key={stock.id}
                name={stock.name}
                quantity={stock.quantity}
                unit={stock.unit}
                status={stock.status}
                percentage={stock.percentage}
              />
            ))}
          </View>

          {/* Reminders Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lembretes ativados</Text>
            <ReminderBanner
              title="Lembrete ativado"
              description="Notificações 15 min antes de cada dose"
            />
          </View>

          {/* Add Medicine Button */}
          <Pressable
            style={({ pressed }) => [styles.addMedicineButton, pressed && styles.addMedicineButtonPressed]}
            onPress={() => {}}
          >
            <Text style={styles.addMedicineButtonText}>+ Adicionar medicamento</Text>
          </Pressable>
        </ScrollView>

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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.small,
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
    fontWeight: 'bold',
  },
  subtitle: {
    ...FONTS.body,
    color: '#F39C12',
    fontWeight: '500',
  },
  section: {
    marginBottom: SIZES.large,
  },
  sectionTitle: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SIZES.base,
    fontSize: 13,
  },
  addMedicineButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.base,
    alignItems: 'center',
    marginTop: SIZES.base,
  },
  addMedicineButtonPressed: {
    opacity: 0.85,
  },
  addMedicineButtonText: {
    ...FONTS.body,
    color: '#fff',
    fontWeight: '600',
  },
});
