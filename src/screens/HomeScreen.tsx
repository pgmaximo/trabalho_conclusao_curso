import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthInput } from '@/components/AuthInput';
import { Button } from '@/components/Button';
import { SocialButton } from '@/components/SocialButton';
import { SectionDivider } from '@/components/SectionDivider';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

type HomeScreenProps = {
  onNavigateToRegister: () => void;
  onLogin: () => void;
};

export function HomeScreen({ onNavigateToRegister, onLogin }: HomeScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.badge}>
              <Text style={styles.badgeIcon}>💚</Text>
            </View>
            <Text style={styles.title}>SuaSaúde</Text>
            <Text style={styles.subtitle}>Gerencie sua saúde com IA e dispositivos vestíveis</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Entre na sua conta</Text>
            <AuthInput
              label="E-mail"
              icon="✉️"
              placeholder="Digite seu e-mail"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <AuthInput
              label="Senha"
              icon="🔒"
              placeholder="Digite sua senha"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity activeOpacity={0.7} style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
            </TouchableOpacity>

            <Button title="Entrar" onPress={onLogin} />
            <Button title="Criar conta gratuita" variant="secondary" onPress={onNavigateToRegister} />

            <SectionDivider label="ou continue com" />

            <View style={styles.socialRow}>
              <SocialButton title="Google" onPress={() => {}} />
              <SocialButton title="Apple ID" onPress={() => {}} />
            </View>

            <Text style={styles.termsText}>
              Ao entrar, você concorda com os Termos de Uso e Política de Privacidade (LGPD)
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    padding: SIZES.large,
    paddingTop: SIZES.large * 1.5,
  },
  hero: {
    alignItems: 'center',
    marginBottom: SIZES.large,
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.large,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 6,
  },
  badgeIcon: {
    fontSize: 28,
  },
  title: {
    ...FONTS.title,
    textAlign: 'center',
  },
  subtitle: {
    ...FONTS.subtitle,
    textAlign: 'center',
    marginTop: SIZES.small,
    maxWidth: 320,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.cardRadius,
    padding: SIZES.large,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 5,
  },
  cardTitle: {
    ...FONTS.heading,
    marginBottom: SIZES.large,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: SIZES.small,
  },
  forgotPasswordText: {
    ...FONTS.body,
    color: COLORS.primary,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SIZES.small,
  },
  termsText: {
    ...FONTS.caption,
    textAlign: 'center',
    marginTop: SIZES.large,
    lineHeight: 18,
  },
});
