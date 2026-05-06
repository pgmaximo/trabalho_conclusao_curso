// =============================================================================
// Arquivo: HomeScreen.tsx
// Descrição: Tela inicial de autenticação com login por e-mail/senha ou Google.
// Componente/screen pertencente: HomeScreen
// =============================================================================
//
// Funcionalidades:
// - Exibe imagem introdutória da tela de login.
// - Valida preenchimento de e-mail e senha antes do login.
// - Executa login via AWS Amplify e login social com Google.
// - Navega para cadastro e recuperação de senha.
//
// Estrutura visual:
// - Área segura com status bar clara.
// - Imagem superior centralizada e conectada visualmente ao card.
// - Card com campos, ações principais, divisor e login social.
//
// =============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StatusBar } from 'expo-status-bar';

// AWS Amplify
import { signIn, signOut } from 'aws-amplify/auth';

import { AuthInput } from '@/components/AuthInput';
import { Button } from '@/components/Button';
import { SocialButton } from '@/components/SocialButton';
import { SectionDivider } from '@/components/SectionDivider';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { serializeAuthError, signInWithGoogle } from '@/services/auth';
import { blurActiveWebElement } from '@/utils/webFocus';

const loginImage = require('../../assets/images/login_image.png');
const googleLogo = require('../../assets/images/google_Glogo.png');

type HomeScreenProps = {
  onNavigateToRegister: () => void;
  onNavigateToForgotPassword: () => void;
  onLogin: () => void;
  onGoogleAuthSuccess: () => void;
};

export function HomeScreen({
  onNavigateToRegister,
  onNavigateToForgotPassword,
  onLogin,
  onGoogleAuthSuccess,
}: HomeScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      Alert.alert('Atenção', 'Por favor, preencha e-mail e senha.');
      return;
    }

    setIsLoading(true);

    try {
      // Limpa sessões antigas para evitar o erro de 'UserAlreadyAuthenticated'
      await signOut().catch(() => {});

      const { isSignedIn, nextStep } = await signIn({
        username: normalizedEmail,
        password,
        options: {
          authFlowType: 'USER_PASSWORD_AUTH',
        },
      });

      if (isSignedIn) {
        onLogin();
      } else if (nextStep.signInStep === 'CONFIRM_SIGN_UP') {
        Alert.alert('Conta não confirmada', 'Verifique seu e-mail para confirmar seu cadastro.');
      }
    } catch (error: any) {
      console.log('Erro detalhado:', error);
      let message = 'Ocorreu um erro ao entrar. Tente novamente.';

      if (error.name === 'UserNotFoundException') message = 'Usuário não encontrado.';
      if (error.name === 'NotAuthorizedException') message = 'E-mail ou senha incorretos.';
      if (error.name === 'UserNotConfirmedException') message = 'Usuário ainda não confirmado.';

      // Tratamento para caso o fluxo de senha esteja desativado no console
      if (error.name === 'InvalidParameterException' && error.message.includes('USER_PASSWORD_AUTH')) {
        message = 'Erro de configuração: Habilite ALLOW_USER_PASSWORD_AUTH no console da AWS.';
      }

      Alert.alert('Erro no Login', message);
    } finally {
      setIsLoading(false);
    }
  }

  // Função para Login Social
  async function handleGoogleLogin() {
    blurActiveWebElement();
    setIsLoading(true);

    try {
      await signInWithGoogle();
      onGoogleAuthSuccess();
    } catch (error: any) {
      console.log('Erro no login com Google:', serializeAuthError(error));
      setIsLoading(false);
      Alert.alert('Erro', 'Não foi possível conectar com o Google.');
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
          <View style={styles.loginComposition}>
            {/* A margem negativa conecta a imagem ao card para parecer que ela sai do formulário. */}
            <View style={styles.loginImageWrapper}>
              <Image source={loginImage} style={styles.loginImage} resizeMode="contain" />
            </View>

            {/* Campos de login */}
            <View style={styles.card}>
            <Text style={styles.cardTitle}>Entre na sua conta</Text>

            <AuthInput
              label="E-mail"
              icon={<MaterialIcons name="email" size={20} color={COLORS.placeholder} />}
              containerStyle={styles.firstField}
              placeholder="Digite seu e-mail"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
            />

            <AuthInput
              label="Senha"
              icon={<MaterialIcons name="lock" size={20} color={COLORS.placeholder} />}
              placeholder="Digite sua senha"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
            />

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.forgotPassword}
              onPress={onNavigateToForgotPassword}
              disabled={isLoading}
            >
              <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
            </TouchableOpacity>

            {/* Botão de Login com estado de carregamento */}
            {isLoading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={styles.loadingIndicator} />
            ) : (
              <View style={styles.primaryAction}>
                <Button title="Entrar" onPress={handleLogin} />
              </View>
            )}

            <SectionDivider label="ou continue com" />

            {/* Botões de Login Social */}
            <View style={styles.socialRow}>
              <SocialButton title="Google" iconSource={googleLogo} onPress={handleGoogleLogin} />
            </View>

            {/* Opção de registro */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.loginLink}
              onPress={onNavigateToRegister}
              disabled={isLoading}
            >
              <Text style={styles.loginLinkText}>Não tem uma conta? <Text style={styles.loginLinkBold}>Criar conta</Text></Text>
            </TouchableOpacity>
            </View>
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
    paddingTop: SIZES.small,
    paddingBottom: SIZES.large,
  },
  loginComposition: {
    alignItems: 'stretch',
  },
  loginImageWrapper: {
    alignItems: 'center',
    zIndex: 2,
    marginBottom: -SIZES.medium,
  },
  loginImage: {
    width: '100%',
    maxWidth: 300,
    height: 230,
    alignSelf: 'center',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: SIZES.small,
    marginBottom: SIZES.medium,
  },
  forgotPasswordText: {
    ...FONTS.body,
    color: COLORS.primary,
  },
  loadingIndicator: {
    marginTop: SIZES.small,
    marginBottom: SIZES.large,
  },
  primaryAction: {
    gap: SIZES.small,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.cardRadius,
    padding: SIZES.large,
    paddingTop: SIZES.large + SIZES.small,
    boxShadow: `0px 12px 30px ${COLORS.shadow}14`,
    elevation: 5,
  },
  cardTitle: {
    ...FONTS.heading,
    marginBottom: SIZES.large,
  },
  firstField: {
    marginTop: 0,
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
