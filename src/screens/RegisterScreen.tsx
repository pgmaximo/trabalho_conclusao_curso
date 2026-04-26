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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// AWS Amplify
import { signUp } from 'aws-amplify/auth';

import { AuthInput } from '@/components/AuthInput';
import { Button } from '@/components/Button';
import { SocialButton } from '@/components/SocialButton';
import { SectionDivider } from '@/components/SectionDivider';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { serializeAuthError, signInWithGoogle } from '@/services/google-auth';

type RegisterScreenProps = {
  onNavigateToLogin: () => void;
  onRegisterSuccess: (email: string) => void;
  onGoogleAuthSuccess: () => void;
};

export function RegisterScreen({
  onNavigateToLogin,
  onRegisterSuccess,
  onGoogleAuthSuccess,
}: RegisterScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password || !confirmPassword) {
      Alert.alert('Atenção', 'Por favor, preencha todos os campos.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
      return;
    }

    setIsLoading(true);

    try {
      const { nextStep } = await signUp({
        username: normalizedEmail,
        password,
        options: {
          userAttributes: {
            email: normalizedEmail,
          },
          autoSignIn: true,
        },
      });

      if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        Alert.alert('Quase lá!', 'Enviamos um código de confirmação para o seu e-mail.');
        onRegisterSuccess(normalizedEmail);
      }
    } catch (error: any) {
      console.log('Erro detalhado:', error);
      let message = 'Ocorreu um erro ao criar a conta. Tente novamente.';

      if (error.name === 'UsernameExistsException') message = 'Este e-mail já está em uso.';
      if (error.name === 'InvalidPasswordException') message = 'A senha não atende aos requisitos mínimos de segurança.';
      if (error.name === 'InvalidParameterException') message = 'Verifique se o e-mail está em um formato válido.';

      Alert.alert('Erro no Cadastro', message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleRegister() {
    setIsLoading(true);

    try {
      await signInWithGoogle();
      onGoogleAuthSuccess();
    } catch (error: any) {
      console.log('Erro no cadastro com Google:', serializeAuthError(error));
      Alert.alert('Erro', 'Nao foi possivel conectar com o Google.');
      setIsLoading(false);
    }
  }

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
            <Text style={styles.cardTitle}>Criar conta gratuita</Text>

            <AuthInput
              label="E-mail"
              icon="✉️"
              placeholder="Digite seu e-mail"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
            />

            <AuthInput
              label="Senha"
              icon="🔒"
              placeholder="Digite sua senha"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
            />

            <AuthInput
              label="Confirmar senha"
              icon="🔒"
              placeholder="Confirme sua senha"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isLoading}
            />

            {isLoading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 20 }} />
            ) : (
              <Button title="Criar conta" onPress={handleRegister} />
            )}

            <SectionDivider label="ou continue com" />

            <View style={styles.socialRow}>
              <SocialButton title="Google" onPress={handleGoogleRegister} disabled={isLoading} />
              <SocialButton title="Apple ID" onPress={() => {}} disabled={isLoading} />
            </View>

            <Text style={styles.termsText}>
              Ao criar sua conta, você concorda com os Termos de Uso e Política de Privacidade (LGPD)
            </Text>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.loginLink}
              onPress={onNavigateToLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginLinkText}>Já tem uma conta? <Text style={styles.loginLinkBold}>Entrar</Text></Text>
            </TouchableOpacity>
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
