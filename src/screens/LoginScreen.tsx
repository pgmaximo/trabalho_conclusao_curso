import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import {
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

import { AuthAppHeader } from '@/components/AuthAppHeader';
import { AuthInput } from '@/components/AuthInput';
import { Button } from '@/components/Button';
import { SectionDivider } from '@/components/SectionDivider';
import { SocialButton } from '@/components/SocialButton';
import { SuccessSnackbar } from '@/components/SuccessSnackbar';
import { useThemeColors } from '@/constants/theme';
import { serializeAuthError, signInWithGoogle } from '@/services/auth';
import { initializeUserSession } from '@/services/auth/userSessionService';
import { blurActiveWebElement } from '@/utils/webFocus';

const googleLogo = require('../../assets/images/google_Glogo.png');
const invalidLoginMessage = 'E-mail ou senha incorretos. Verifique os dados e tente novamente.';
const emptyFieldsMessage = 'Por favor, preencha e-mail e senha.';
const genericLoginErrorMessage = 'Ocorreu um erro ao entrar. Tente novamente.';
const genericGoogleErrorMessage = 'Não foi possível conectar com o Google.';
const unconfirmedAccountMessage = 'Confirme seu cadastro pelo e-mail antes de entrar.';
// Copy genérica — o nome real do usuário nem sempre está disponível
// imediatamente após o signIn (decisão documentada em plan.md §4).
const successToastMessage = 'Bem-vindo(a) de volta!';
// Tempo para o usuário ver o snackbar de sucesso antes de navegar embora.
const SUCCESS_NAVIGATION_DELAY_MS = 900;

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
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isTogglePressed, setIsTogglePressed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginErrorMessage, setLoginErrorMessage] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
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

  function togglePasswordVisibility() {
    setIsPasswordVisible((current) => !current);
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

  function celebrateSuccessAndNavigate(navigate: () => void) {
    setShowSuccessToast(true);
    setTimeout(() => {
      navigate();
    }, SUCCESS_NAVIGATION_DELAY_MS);
  }

  async function handleLogin() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setLoginErrorMessage(emptyFieldsMessage);
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
        celebrateSuccessAndNavigate(onLogin);
        return;
      }

      if (nextStep.signInStep === 'CONFIRM_SIGN_UP') {
        setLoginErrorMessage(unconfirmedAccountMessage);
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
    } catch (error: any) {
      console.log('Erro detalhado:', error);

      if (error.name === 'UserNotFoundException' || error.name === 'NotAuthorizedException') {
        setLoginErrorMessage(invalidLoginMessage);
        triggerLoginErrorFeedback();
        setIsLoading(false);
        return;
      }

      let message = genericLoginErrorMessage;

      if (error.name === 'UserNotConfirmedException') message = 'Usuário ainda não confirmado.';

      if (
        error.name === 'InvalidParameterException' &&
        error.message?.includes('USER_PASSWORD_AUTH')
      ) {
        message = 'Erro de configuração: Habilite ALLOW_USER_PASSWORD_AUTH no console da AWS.';
      }

      setLoginErrorMessage(message);
      setIsLoading(false);
    }
  }

  async function handleGoogleLogin() {
    blurActiveWebElement();
    setLoginErrorMessage(null);
    setIsLoading(true);

    try {
      await signInWithGoogle();
      // Initialize user session before routing
      await initializeUserSession();
      celebrateSuccessAndNavigate(onGoogleAuthSuccess);
    } catch (error: any) {
      console.log('Erro no login com Google:', serializeAuthError(error));
      setLoginErrorMessage(genericGoogleErrorMessage);
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-app-background dark:bg-app-dark-background">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center px-6 pb-3 pt-5"
          keyboardShouldPersistTaps="handled"
        >
          <AuthAppHeader />

          <View
            className="rounded-card border border-app-border bg-app-surface p-5 dark:border-app-dark-border dark:bg-app-dark-surface"
            style={{ boxShadow: `0px 2px 10px ${colors.shadow}0D` }}
          >
            <Text className="mb-[18px] text-[22px] font-semibold leading-[29px] text-app-text dark:text-app-dark-text">
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
              placeholder="seu@email.com"
              value={email}
            />

            <AuthInput
              editable={!isLoading}
              hasError={hasLoginError}
              icon={<MaterialIcons color={colors.placeholder} name="lock" size={20} />}
              label="Senha"
              onChangeText={handlePasswordChange}
              placeholder="Digite sua senha"
              secureTextEntry={!isPasswordVisible}
              trailingAction={
                <Pressable
                  accessibilityRole="button"
                  disabled={isLoading}
                  hitSlop={8}
                  onPress={togglePasswordVisibility}
                  onPressIn={() => setIsTogglePressed(true)}
                  onPressOut={() => setIsTogglePressed(false)}
                  // `style` NÃO pode ser função aqui — sem `className`, o NativeWind
                  // (jsxImportSource global) descarta o resultado da função e o Pressable
                  // renderiza sem nenhum estilo.
                  style={[isTogglePressed && { opacity: 0.7 }]}
                >
                  <Text className="text-[16px] font-semibold text-app-secondary dark:text-app-dark-secondary">
                    {isPasswordVisible ? 'Ocultar' : 'Mostrar'}
                  </Text>
                </Pressable>
              }
              value={password}
            />

            <Pressable
              className="mt-[10px] items-end"
              disabled={isLoading}
              onPress={onNavigateToForgotPassword}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Text className="p-1 text-[16px] font-semibold text-app-secondary dark:text-app-dark-secondary">
                Esqueceu a senha?
              </Text>
            </Pressable>

            {loginErrorMessage ? (
              <Text
                accessibilityRole="alert"
                className="mt-3 text-[16px] leading-[22px] text-app-danger dark:text-app-dark-danger"
              >
                {loginErrorMessage}
              </Text>
            ) : null}

            <Animated.View style={{ transform: [{ translateX: shakeAnimation }] }}>
              <Button
                loading={isLoading}
                loadingTitle="Entrando..."
                onPress={handleLogin}
                title="Entrar"
              />
            </Animated.View>

            <SectionDivider label="ou continue com" />

            <View className="flex-row justify-between">
              <SocialButton
                disabled={isLoading}
                iconSource={googleLogo}
                onPress={handleGoogleLogin}
                title="Continuar com Google"
              />
            </View>
          </View>

          <Pressable
            className="mt-[18px] self-center"
            disabled={isLoading}
            onPress={onNavigateToRegister}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <Text className="text-[17px] leading-[23px] text-app-textSecondary dark:text-app-dark-textSecondary">
              Não tem conta?{' '}
              <Text className="font-semibold text-app-secondary dark:text-app-dark-secondary">
                Criar conta
              </Text>
            </Text>
          </Pressable>

          <Text className="mt-[6px] text-center text-base leading-[22px] text-app-textSecondary dark:text-app-dark-textSecondary">
            Ao entrar você aceita os Termos de Uso e a Política de Privacidade (LGPD).
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <SuccessSnackbar
        message={successToastMessage}
        onHide={() => setShowSuccessToast(false)}
        visible={showSuccessToast}
      />
    </SafeAreaView>
  );
}
