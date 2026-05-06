// =============================================================================
// Arquivo: RegisterScreen.tsx
// Descrição: Tela de cadastro com registro por e-mail/senha ou Google.
// Componente/screen pertencente: RegisterScreen
// =============================================================================
//
// Funcionalidades:
// - Exibe imagem introdutória da tela de registro.
// - Valida preenchimento de e-mail, senha e confirmação antes do cadastro.
// - Mostra requisitos de senha em tempo real enquanto a senha é preenchida.
// - Executa cadastro via AWS Amplify e autenticação social com Google.
// - Navega para login ou para a confirmação de cadastro.
//
// Estrutura visual:
// - Área segura com status bar clara.
// - Imagem superior centralizada e conectada visualmente ao card.
// - Card com campos, ação principal, divisor, cadastro social e link de login.
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
import { signUp } from 'aws-amplify/auth';

import { AuthInput } from '@/components/AuthInput';
import { Button } from '@/components/Button';
import { SocialButton } from '@/components/SocialButton';
import { SectionDivider } from '@/components/SectionDivider';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { serializeAuthError, signInWithGoogle } from '@/services/auth';
import { blurActiveWebElement } from '@/utils/webFocus';

const registerImage = require('../../assets/images/register_image.png');
const googleLogo = require('../../assets/images/google_Glogo.png');

type PasswordRequirement = {
  label: string;
  isMet: boolean;
};

type RegisterScreenProps = {
  onNavigateToLogin: () => void;
  onRegisterSuccess: (email: string) => void;
  onGoogleAuthSuccess: () => void;
};

function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      label: 'Ter pelo menos 8 caracteres',
      isMet: password.length >= 8,
    },
    {
      label: 'Contém pelo menos 1 número',
      isMet: /\d/.test(password),
    },
    {
      label: 'Contém pelo menos 1 caractere especial',
      isMet: /[^A-Za-z0-9]/.test(password),
    },
    {
      label: 'Contém pelo menos 1 letra maiúscula',
      isMet: /[A-Z]/.test(password),
    },
    {
      label: 'Contém pelo menos 1 letra minúscula',
      isMet: /[a-z]/.test(password),
    },
  ];
}

export function RegisterScreen({
  onNavigateToLogin,
  onRegisterSuccess,
  onGoogleAuthSuccess,
}: RegisterScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const passwordRequirements = getPasswordRequirements(password);
  const isPasswordRequirementsVisible = isPasswordFocused || password.length > 0;
  const isPasswordValid = passwordRequirements.every((requirement) => requirement.isMet);

  async function handleRegister() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password || !confirmPassword) {
      Alert.alert('Atenção', 'Por favor, preencha todos os campos.');
      return;
    }

    if (!isPasswordValid) {
      Alert.alert('Atenção', 'Sua senha ainda não atende a todos os requisitos.');
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
    blurActiveWebElement();
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
          <View style={styles.registerComposition}>
            {/* A margem negativa conecta a imagem ao card para parecer que ela sai do formulário. */}
            <View style={styles.registerImageWrapper}>
              <Image source={registerImage} style={styles.registerImage} resizeMode="contain" />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Criar conta gratuita</Text>

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
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                editable={!isLoading}
              />

              {isPasswordRequirementsVisible ? (
                <View style={styles.passwordRequirementsBox}>
                  {passwordRequirements.map((requirement) => (
                    <View key={requirement.label} style={styles.passwordRequirementItem}>
                      <MaterialIcons
                        name={requirement.isMet ? 'check-circle' : 'radio-button-unchecked'}
                        size={16}
                        color={requirement.isMet ? COLORS.success : COLORS.textMuted}
                      />
                      <Text
                        style={[
                          styles.passwordRequirementText,
                          requirement.isMet && styles.passwordRequirementTextMet,
                        ]}
                      >
                        {requirement.label}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <AuthInput
                label="Confirmar senha"
                icon={<MaterialIcons name="lock" size={20} color={COLORS.placeholder} />}
                placeholder="Confirme sua senha"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!isLoading}
              />

              {isLoading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={styles.loadingIndicator} />
              ) : (
                <View style={styles.primaryAction}>
                  <Button title="Criar conta" onPress={handleRegister} />
                </View>
              )}

              <SectionDivider label="ou continue com" />

              <View style={styles.socialRow}>
                <SocialButton
                  title="Google"
                  iconSource={googleLogo}
                  onPress={handleGoogleRegister}
                  disabled={isLoading}
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.loginLink}
                onPress={onNavigateToLogin}
                disabled={isLoading}
              >
                <Text style={styles.loginLinkText}>Já tem uma conta? <Text style={styles.loginLinkBold}>Entrar</Text></Text>
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
  registerComposition: {
    alignItems: 'stretch',
  },
  registerImageWrapper: {
    alignItems: 'center',
    zIndex: 2,
    marginBottom: -SIZES.medium,
  },
  registerImage: {
    width: '100%',
    maxWidth: 300,
    height: 230,
    alignSelf: 'center',
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
  passwordRequirementsBox: {
    backgroundColor: COLORS.surfaceMuted,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    gap: SIZES.small,
    marginTop: SIZES.small,
    padding: SIZES.small,
  },
  passwordRequirementItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SIZES.small,
  },
  passwordRequirementText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    flex: 1,
  },
  passwordRequirementTextMet: {
    color: COLORS.success,
    textDecorationLine: 'line-through',
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
