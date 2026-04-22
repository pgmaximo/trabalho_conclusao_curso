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
import { ProfileCard } from '@/components/ProfileCard';
import { HealthDataRow } from '@/components/HealthDataRow';
import { AllergiesDisplay } from '@/components/AllergiesDisplay';
import { SettingsMenuItem } from '@/components/SettingsMenuItem';
import { BottomTabBar } from '@/components/BottomTabBar';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

const TAB_ITEMS = [
  { icon: '🏠', label: 'Início', id: 'home' },
  { icon: '📋', label: 'Exames', id: 'exams' },
  { icon: '🧠', label: 'IA', id: 'ai' },
  { icon: '⌚', label: 'Watch', id: 'watch' },
  { icon: '👤', label: 'Perfil', id: 'profile' },
];

const HEALTH_DATA = [
  { label: 'Tipo sanguíneo', value: 'O+' },
  { label: 'Peso', value: '78 kg' },
  { label: 'Altura', value: '1,78 m' },
  { label: 'IMC', value: '24.6' },
];

const SETTINGS = [
  { icon: '🔔', title: 'Notificações e lembretes' },
  { icon: '🔒', title: 'Privacidade e LGPD' },
  { icon: '📱', title: 'Dispositivos conectados' },
  { icon: '👨‍⚕️', title: 'Profissionais de saúde' },
  { icon: '📤', title: 'Exportar meus dados' },
  { icon: '🌐', title: 'Idioma e acessibilidade' },
  { icon: 'ℹ️', title: 'Sobre a SuaSaúde' },
];

export function ProfileScreen({
  onTabPress,
  onLogout,
}: {
  onTabPress?: (tabId: string) => void;
  onLogout?: () => void;
}) {
  const [activeTab, setActiveTab] = useState('profile');

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
          <Text style={styles.title}>Perfil</Text>

          {/* Profile Card */}
          <ProfileCard
            name="Pedro Gabriel Máximo"
            email="pedrograximo@gmail.com"
            initials="PM"
            completionPercentage={45}
          />

          {/* Health Data */}
          <Text style={styles.sectionTitle}>Dados de saúde</Text>
          <HealthDataRow items={HEALTH_DATA} />

          {/* Allergies and Conditions */}
          <AllergiesDisplay
            title="Alergias e condições"
            items={['Hipertensão', 'Alergia à Dipirona']}
          />

          {/* Settings Section */}
          <Text style={styles.sectionTitle}>Configurações</Text>
          {SETTINGS.map((setting, index) => (
            <SettingsMenuItem
              key={index}
              icon={setting.icon}
              title={setting.title}
              onPress={() => {}}
            />
          ))}

          {/* Logout Button */}
          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.logoutButtonPressed,
            ]}
            onPress={onLogout}
          >
            <Text style={styles.logoutButtonText}>Sair da conta</Text>
          </Pressable>
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
  title: {
    ...FONTS.heading,
    fontSize: 24,
    color: COLORS.text,
    marginBottom: SIZES.large,
  },
  sectionTitle: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SIZES.base,
    fontSize: 13,
  },
  logoutButton: {
    backgroundColor: '#FFF5F5',
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: '#E74C3C',
    paddingVertical: SIZES.base,
    alignItems: 'center',
    marginTop: SIZES.large,
  },
  logoutButtonPressed: {
    opacity: 0.85,
  },
  logoutButtonText: {
    ...FONTS.body,
    color: '#E74C3C',
    fontWeight: '600',
  },
});
