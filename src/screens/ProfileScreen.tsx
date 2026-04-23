import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AllergiesDisplay } from '@/components/AllergiesDisplay';
import { EmptyState } from '@/components/EmptyState';
import { HealthDataRow } from '@/components/HealthDataRow';
import { ProfileCard } from '@/components/ProfileCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { Section } from '@/components/Section';
import { SettingsMenuItem } from '@/components/SettingsMenuItem';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import type { UserProfileSnapshot } from '@/types/models';

type ProfileScreenProps = {
  profile: UserProfileSnapshot;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onLogout?: () => void;
};

export function ProfileScreen({
  profile,
  isLoading,
  errorMessage,
  onRetry,
  onLogout,
}: ProfileScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <ScreenSkeleton blocks={3} />
          ) : errorMessage ? (
            <EmptyState
              icon="👤"
              title="Nao foi possivel carregar o perfil"
              description={errorMessage}
              tone="error"
              actionLabel="Tentar novamente"
              onActionPress={onRetry}
            />
          ) : (
            <>
              <ScreenHeader
                title="Perfil"
                subtitle="Resumo consolidado dos dados pessoais e de saude do usuario."
              />

              <ProfileCard
                name={profile.name}
                email={profile.email}
                initials={profile.initials}
                completionPercentage={profile.completionPercentage}
              />

              <Section title="Dados de saúde" subtitle="Informacoes principais mantidas no perfil.">
                <HealthDataRow items={profile.healthData} />
              </Section>

              <Section title="Alergias e condições" subtitle="Itens que merecem destaque clinico.">
                <AllergiesDisplay title="Condições registradas" items={profile.allergiesAndConditions} />
              </Section>

              <Section title="Configurações" subtitle="Entradas preparadas para futuras integrações.">
                {profile.settings.length > 0 ? (
                  profile.settings.map((setting) => (
                    <SettingsMenuItem
                      key={setting.title}
                      icon={setting.icon}
                      title={setting.title}
                      onPress={() => {}}
                    />
                  ))
                ) : (
                  <EmptyState
                    icon="⚙️"
                    title="Nenhuma configuração disponível"
                    description="As opções de conta e integração aparecerão nesta área."
                  />
                )}
              </Section>

              <Pressable
                style={({ pressed }) => [
                  styles.logoutButton,
                  pressed && styles.logoutButtonPressed,
                ]}
                onPress={onLogout}
              >
                <Text style={styles.logoutButtonText}>Sair da conta</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
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
  logoutButton: {
    backgroundColor: COLORS.dangerSoft,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.danger,
    paddingVertical: SIZES.base,
    alignItems: 'center',
    marginTop: SIZES.large,
  },
  logoutButtonPressed: {
    opacity: 0.85,
  },
  logoutButtonText: {
    ...FONTS.body,
    color: COLORS.danger,
    fontWeight: '600',
  },
});
