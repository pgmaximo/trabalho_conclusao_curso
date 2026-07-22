import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { confirmSignUp, resendSignUpCode, signIn } from 'aws-amplify/auth';
import { useColorScheme } from 'nativewind';

import { AuthInput } from '@/components/AuthInput';
import { AuthBackgroundGlow } from '@/components/AuthBackgroundGlow';
import { AuthIllustrationCard } from '@/components/AuthIllustrationCard';
import { Button } from '@/components/Button';
import { useThemeColors } from '@/constants/theme';
import { initializeUserSession } from '@/services/auth/userSessionService';
import { blurActiveWebElement } from '@/utils/webFocus';

const confirmImage = require('../../assets/images/confirm_image.png');

type ConfirmScreenProps = {
  email: string;
  password?: string;
  onConfirmSuccess: () => void;
  onBackToLogin?: () => void;
};

export function ConfirmScreen({ email, password, onConfirmSuccess, onBackToLogin }: ConfirmScreenProps) {
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // ATTENTION: cooldown inicia em 60 pois o código já foi enviado pelo RegisterScreen
  const [cooldown, setCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);

  // DECISION: setInterval com cleanup no unmount evita memory leak do timer
  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const intervalId = setInterval(() => {
      setCooldown((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [cooldown]);

  function handleBackToLogin() {
    blurActiveWebElement();
    onBackToLogin?.();
  }

  async function handleResend() {
    if (cooldown > 0 || isResending) {
      return;
    }

    setIsResending(true);

    try {
      await resendSignUpCode({ username: email });
      setCooldown(60);
    } catch (error) {
      console.log('Erro ao reenviar código:', error);
      Alert.alert('Erro', 'Não foi possível reenviar o código.');
    } finally {
      setIsResending(false);
    }
  }

  async function handleConfirm() {
    if (!code) {
      Alert.alert('Atenção', 'Por favor, digite o código de confirmação.');
      return;
    }

    setIsLoading(true);

    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code,
      });

      // DECISION: Apos confirmar, tenta fazer auto-signin com a senha (se disponivel).
      // Sem isso, o usuario nao tem tokens JWT para acessar o DynamoDB.
      // Se password foi passado (normal signup flow), faz signin automaticamente.
      // Se nao (reset password ou login manual), usuario tera que fazer login separadamente.
      if (password) {
        try {
          await signIn({
            username: email,
            password,
            options: {
              authFlowType: 'USER_PASSWORD_AUTH',
            },
          });
          console.log('[Confirm] Auto-signin realizado com sucesso apos confirmacao');
        } catch (signInError) {
          console.log('[Confirm] Auto-signin falhou, tentando inicializar sessao via autoSignIn:', signInError);
          // Se auto-signin falhar, tenta inicializar sessao normal
          // (pode estar autenticado via autoSignIn do signUp)
        }
      }

      // Inicializa a sessao local com tokens agora disponiveis
      try {
        await initializeUserSession();
        console.log('[Confirm] Sessao do usuario inicializada com sucesso');
      } catch (sessionError) {
        console.log('[Confirm] Aviso: Sessao pode nao estar completamente pronta:', sessionError);
        // Nao eh bloqueante - pode ser que os tokens estejam disponiveis mesmo assim
      }

      Alert.alert('Sucesso!', 'Sua conta foi confirmada com sucesso.');
      blurActiveWebElement();
      onConfirmSuccess();
    } catch (error: any) {
      console.log('Erro na confirmação:', error);
      Alert.alert('Erro', 'Código inválido ou expirado.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-app-background dark:bg-app-dark-background">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <AuthBackgroundGlow corner="topRight" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center px-6 pb-3 pt-5"
          keyboardShouldPersistTaps="handled"
        >
          <AuthIllustrationCard imageSource={confirmImage}>
                <Text className="mb-3 text-xl font-bold leading-[26px] text-app-text dark:text-app-dark-text">
                  Verifique seu e-mail
                </Text>
                <Text className="mb-6 text-[15px] leading-[22px] text-app-textSecondary dark:text-app-dark-textSecondary">
                  Digite o código enviado para {email || 'seu e-mail'}.
                </Text>

                <AuthInput
                  containerClassName="mt-0"
                  editable={!isLoading}
                  icon={
                    <MaterialIcons
                      color={colors.placeholder}
                      name="confirmation-number"
                      size={20}
                    />
                  }
                  keyboardType="number-pad"
                  label="Código de Confirmação"
                  onChangeText={setCode}
                  placeholder="Digite o código de 6 dígitos"
                  value={code}
                />

                {isLoading ? (
                  <ActivityIndicator
                    color={colors.primary}
                    size="large"
                    style={{ marginBottom: 24, marginTop: 12 }}
                  />
                ) : (
                  <Button onPress={handleConfirm} title="Confirmar conta" />
                )}

                <Pressable
                  className="mt-4 self-center"
                  disabled={cooldown > 0 || isResending}
                  onPress={handleResend}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                >
                  <Text
                    className={[
                      'text-[15px] leading-[22px]',
                      cooldown > 0
                        ? 'text-app-textMuted dark:text-app-dark-textMuted'
                        : 'font-semibold text-app-primary dark:text-app-dark-primary',
                    ].join(' ')}
                  >
                    {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
                  </Text>
                </Pressable>

                {onBackToLogin ? (
                  <Pressable
                    className="mt-6 self-center"
                    disabled={isLoading}
                    onPress={handleBackToLogin}
                    style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                  >
                    <Text className="text-[15px] font-semibold leading-[22px] text-app-primary dark:text-app-dark-primary">
                      Voltar para entrar
                    </Text>
                  </Pressable>
                ) : null}
          </AuthIllustrationCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
