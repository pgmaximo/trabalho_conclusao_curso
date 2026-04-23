import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { FormField } from '@/components/FormField';
import { SocialButton } from '@/components/SocialButton';
import { SectionDivider } from '@/components/SectionDivider';
import { ScreenHeader } from '@/components/ScreenHeader';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { loginSchema, type LoginFormValues } from '@/validation/forms';

type HomeScreenProps = {
  onNavigateToRegister: () => void;
  onLogin: (values: LoginFormValues) => void | Promise<void>;
};

export function HomeScreen({ onNavigateToRegister, onLogin }: HomeScreenProps) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
    },
    resolver: zodResolver(loginSchema),
  });

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

          <Card padding="spacious" style={styles.card}>
            <ScreenHeader
              title="Entre na sua conta"
              subtitle="Use seu e-mail e senha para acessar os recursos principais do aplicativo."
            />
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <FormField
                  label="E-mail"
                  icon="✉️"
                  placeholder="Digite seu e-mail"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  errorMessage={errors.email?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <FormField
                  label="Senha"
                  icon="🔒"
                  placeholder="Digite sua senha"
                  secureTextEntry
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  errorMessage={errors.password?.message}
                />
              )}
            />

            <TouchableOpacity activeOpacity={0.7} style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
            </TouchableOpacity>

            <Button
              title={isSubmitting ? 'Entrando...' : 'Entrar'}
              onPress={handleSubmit(onLogin)}
              disabled={isSubmitting}
            />
            <Button title="Criar conta gratuita" variant="secondary" onPress={onNavigateToRegister} />

            <SectionDivider label="ou continue com" />

            <View style={styles.socialRow}>
              <SocialButton title="Google" onPress={() => {}} />
              <SocialButton title="Apple ID" onPress={() => {}} />
            </View>

            <Text style={styles.termsText}>
              Ao entrar, você concorda com os Termos de Uso e Política de Privacidade (LGPD)
            </Text>
          </Card>
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
    borderRadius: SIZES.cardRadius,
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
