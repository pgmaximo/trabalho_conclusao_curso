import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signIn, signOut } from 'aws-amplify/auth';

import { AuthInput } from '@/components/AuthInput';
import { AuthBackgroundGlow } from '@/components/AuthBackgroundGlow';
import { AuthIllustrationCard } from '@/components/AuthIllustrationCard';
import { Button } from '@/components/Button';
import { SectionDivider } from '@/components/SectionDivider';
import { SocialButton } from '@/components/SocialButton';
import { useThemeColors } from '@/constants/theme';
import { serializeAuthError, signInWithGoogle } from '@/services/auth';
import { initializeUserSession } from '@/services/auth/userSessionService';
import { blurActiveWebElement } from '@/utils/webFocus';

const loginImage = require('../../assets/images/login_image.png');
const googleLogo = require('../../assets/images/google_Glogo.png');
const invalidLoginMessage = 'E-mail ou senha incorretos. Verifique os dados e tente novamente.';

type LoginScreenProps = {
  onNavigateToRegister: () => void;
  onNavigateToForgotPassword: () => void;
  onLogin: () => void;
  onGoogleAuthSuccess: () => void;
};

export function LoginScreen({
  onNavigateToRegister,
  onNavigateToForgotPassword,
  onLogin,
  onGoogleAuthSuccess,
}: LoginScreenProps) {
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginErrorMessage, setLoginErrorMessage] = useState<string | null>(null);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  const hasLoginError = Boolean(loginErrorMessage);

  function clearLoginError() {
    if (loginErrorMessage) {
      setLoginErrorMessage(null);
    }
  }

  function handleEmailChange(value: string) {
    clearLoginError();
    setEmail(value);
  }

  function handlePasswordChange(value: string) {
    clearLoginError();
    setPassword(value);
  }

  function triggerLoginErrorFeedback() {
    shakeAnimation.setValue(0);

    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: -8, duration: 48, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 8, duration: 48, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -6, duration: 48, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 6, duration: 48, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 48, useNativeDriver: true }),
    ]).start();
  }

  async function handleLogin() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      Alert.alert('Atenção', 'Por favor, preencha e-mail e senha.');
      return;
    }

    setLoginErrorMessage(null);
    setIsLoading(true);

    try {
      await signOut().catch(() => {});

      const { isSignedIn, nextStep } = await signIn({
        username: normalizedEmail,
        password,
        options: {
          authFlowType: 'USER_PASSWORD_AUTH',
        },
      });

      if (isSignedIn) {
        // Initialize user session before routing
        await initializeUserSession();
        onLogin();
      } else if (nextStep.signInStep === 'CONFIRM_SIGN_UP') {
        Alert.alert('Conta não confirmada', 'Verifique seu e-mail para confirmar seu cadastro.');
      }
    } catch (error: any) {
      console.log('Erro detalhado:', error);
      let message = 'Ocorreu um erro ao entrar. Tente novamente.';

      if (error.name === 'UserNotFoundException' || error.name === 'NotAuthorizedException') {
        setLoginErrorMessage(invalidLoginMessage);
        triggerLoginErrorFeedback();
        return;
      }

      if (error.name === 'UserNotConfirmedException') message = 'Usuário ainda não confirmado.';

      if (
        error.name === 'InvalidParameterException' &&
        error.message?.includes('USER_PASSWORD_AUTH')
      ) {
        message = 'Erro de configuração: Habilite ALLOW_USER_PASSWORD_AUTH no console da AWS.';
      }

      Alert.alert('Erro no Login', message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleLogin() {
    blurActiveWebElement();
    setIsLoading(true);

    try {
      await signInWithGoogle();
      // Initialize user session before routing
      await initializeUserSession();
      onGoogleAuthSuccess();
    } catch (error: any) {
      console.log('Erro no login com Google:', serializeAuthError(error));
      setIsLoading(false);
      Alert.alert('Erro', 'Não foi possível conectar com o Google.');
    }
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-app-background dark:bg-app-dark-background">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <AuthBackgroundGlow corner="bottomRight" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center px-6 pb-3 pt-5"
          keyboardShouldPersistTaps="handled"
        >
          <AuthIllustrationCard imageSource={loginImage}>
                <Text className="mb-6 text-xl font-bold leading-[26px] text-app-text dark:text-app-dark-text">
                  Entre na sua conta
                </Text>

                <AuthInput
                  autoCapitalize="none"
                  containerClassName="mt-0"
                  editable={!isLoading}
                  hasError={hasLoginError}
                  icon={<MaterialIcons color={colors.placeholder} name="email" size={20} />}
                  keyboardType="email-address"
                  label="E-mail"
                  onChangeText={handleEmailChange}
                  placeholder="Digite seu e-mail"
                  value={email}
                />

                <AuthInput
                  editable={!isLoading}
                  hasError={hasLoginError}
                  icon={<MaterialIcons color={colors.placeholder} name="lock" size={20} />}
                  label="Senha"
                  onChangeText={handlePasswordChange}
                  placeholder="Digite sua senha"
                  secureTextEntry
                  value={password}
                />

                <Pressable
                  className="mb-[18px] mt-3 self-end"
                  disabled={isLoading}
                  onPress={onNavigateToForgotPassword}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                >
                  <Text className="text-[15px] leading-[22px] text-app-primary dark:text-app-dark-primary">
                    Esqueceu a senha?
                  </Text>
                </Pressable>

                {isLoading ? (
                  <ActivityIndicator
                    color={colors.primary}
                    size="large"
                    style={{ marginBottom: 24, marginTop: 12 }}
                  />
                ) : (
                  <>
                    {loginErrorMessage ? (
                      <Text
                        accessibilityRole="alert"
                        className="mb-3 text-[13px] leading-[18px] text-app-danger dark:text-app-dark-danger"
                      >
                        {loginErrorMessage}
                      </Text>
                    ) : null}

                    <Animated.View style={{ transform: [{ translateX: shakeAnimation }] }}>
                      <Button
                        onPress={handleLogin}
                        style={
                          hasLoginError
                            ? {
                                backgroundColor: colors.danger,
                                boxShadow: `0px 8px 18px ${colors.danger}29`,
                              }
                            : undefined
                        }
                        title="Entrar"
                      />
                    </Animated.View>
                  </>
                )}

                <SectionDivider label="ou continue com" />

                <View className="flex-row justify-between">
                  <SocialButton iconSource={googleLogo} onPress={handleGoogleLogin} title="Google" />
                </View>

                <Pressable
                  className="mt-6 self-center"
                  disabled={isLoading}
                  onPress={onNavigateToRegister}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                >
                  <Text className="text-[15px] leading-[22px] text-app-textSecondary dark:text-app-dark-textSecondary">
                    Não tem uma conta?{' '}
                    <Text className="font-semibold text-app-primary dark:text-app-dark-primary">
                      Criar conta
                    </Text>
                  </Text>
                </Pressable>
          </AuthIllustrationCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
