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
import { registerSchema, type RegisterFormValues } from '@/validation/forms';

type RegisterScreenProps = {
  onNavigateToLogin: () => void;
  onRegister: (values: RegisterFormValues) => void | Promise<void>;
};

export function RegisterScreen({ onNavigateToLogin, onRegister }: RegisterScreenProps) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    resolver: zodResolver(registerSchema),
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
              title="Criar conta gratuita"
              subtitle="Validamos seus dados agora para que a integração com Cognito entre depois sem retrabalho."
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
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field }) => (
                <FormField
                  label="Confirmar senha"
                  icon="🔒"
                  placeholder="Confirme sua senha"
                  secureTextEntry
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  errorMessage={errors.confirmPassword?.message}
                />
              )}
            />

            <Button
              title={isSubmitting ? 'Criando conta...' : 'Criar conta'}
              onPress={handleSubmit(onRegister)}
              disabled={isSubmitting}
            />

            <SectionDivider label="ou continue com" />

            <View style={styles.socialRow}>
              <SocialButton title="G  Google" onPress={() => {}} />
              <SocialButton title="Apple ID" onPress={() => {}} />
            </View>

            <Text style={styles.termsText}>
              Ao criar sua conta, você concorda com os Termos de Uso e Política de Privacidade (LGPD)
            </Text>

            <TouchableOpacity activeOpacity={0.7} style={styles.loginLink} onPress={onNavigateToLogin}>
              <Text style={styles.loginLinkText}>Já tem uma conta? <Text style={styles.loginLinkBold}>Entrar</Text></Text>
            </TouchableOpacity>
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
  loginLink: {
    alignSelf: 'center',
    marginTop: SIZES.large,
  },
  loginLinkText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
  },
  loginLinkBold: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
