import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { confirmSignUp, resendSignUpCode, signIn } from 'aws-amplify/auth';
import { useColorScheme } from 'nativewind';

import { BackHeader } from '@/components/BackHeader';
import { Button } from '@/components/Button';
import { useThemeColors } from '@/constants/theme';
import { initializeUserSession } from '@/services/auth/userSessionService';
import { blurActiveWebElement } from '@/utils/webFocus';

const DIGIT_COUNT = 6;
const EMPTY_DIGITS = Array<string>(DIGIT_COUNT).fill('');

type ConfirmScreenProps = {
  email: string;
  password?: string;
  onConfirmSuccess: () => void;
  onBackToLogin?: () => void;
};

export function ConfirmScreen({ email, password, onConfirmSuccess, onBackToLogin }: ConfirmScreenProps) {
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();
  const [digits, setDigits] = useState<string[]>(EMPTY_DIGITS);
  const [isLoading, setIsLoading] = useState(false);
  // ATTENTION: cooldown inicia em 60 pois o código já foi enviado pelo RegisterScreen
  const [cooldown, setCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>(Array(DIGIT_COUNT).fill(null));

  const codeFull = digits.every((digit) => digit.length === 1);

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

  function handleDigitChange(index: number, rawValue: string) {
    // Aceita apenas dígitos; se mais de 1 caractere chegar (ex.: colar código
    // completo), usa só o último para manter o comportamento "1 caixa = 1 dígito".
    const sanitized = rawValue.replace(/[^0-9]/g, '');
    const value = sanitized.slice(-1);

    setDigits((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });

    if (value && index < DIGIT_COUNT - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(index: number, event: NativeSyntheticEvent<TextInputKeyPressEventData>) {
    if (event.nativeEvent.key !== 'Backspace') {
      return;
    }

    if (digits[index] === '' && index > 0) {
      setDigits((current) => {
        const next = [...current];
        next[index - 1] = '';
        return next;
      });
      inputRefs.current[index - 1]?.focus();
    }
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
    if (!codeFull) {
      return;
    }

    setIsLoading(true);

    try {
      await confirmSignUp({
        username: email,
        confirmationCode: digits.join(''),
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center px-6 pb-3 pt-5"
          keyboardShouldPersistTaps="handled"
        >
          <BackHeader
            bordered
            disabled={isLoading}
            onBack={handleBackToLogin}
            testID="confirm-header"
            title="Confirmar conta"
          />

          <View
            className="mb-5 flex-row items-start gap-3 border border-app-infoBadgeBorder bg-app-infoSoft p-4 dark:border-app-dark-infoBadgeBorder dark:bg-app-dark-infoSoft"
            style={{ borderRadius: 16 }}
          >
            <View className="size-7 items-center justify-center rounded-[8px] bg-app-infoIconBg dark:bg-app-dark-infoIconBg">
              <MaterialIcons color={colors.onPrimary} name="mail-outline" size={16} />
            </View>
            <Text className="flex-1 text-[17px] leading-[24px] text-app-text dark:text-app-dark-text">
              <Text className="font-bold">Verifique seu e-mail.</Text> Enviamos um código de 6
              dígitos para {email || 'seu e-mail'}.
            </Text>
          </View>

          <View
            className="rounded-card border border-app-neutralSoft bg-app-surface p-5 dark:border-app-dark-neutralSoft dark:bg-app-dark-surface"
            style={{ boxShadow: `0px 2px 10px ${colors.shadow}0D` }}
          >
            <Text className="mb-4 text-xl font-semibold leading-[26px] text-app-text dark:text-app-dark-text">
              Digite o código
            </Text>

            <View className="flex-row justify-between gap-1.5">
              {digits.map((digit, index) => (
                <TextInput
                  key={`digit-box-${index}`}
                  accessibilityLabel={`Dígito ${index + 1} de 6`}
                  autoFocus={index === 0}
                  className="h-[60px] w-[52px] rounded-[12px] border-[1.5px] border-app-border bg-app-surface text-center text-2xl font-semibold text-app-text dark:border-app-dark-border dark:bg-app-dark-surface dark:text-app-dark-text"
                  editable={!isLoading}
                  keyboardType="number-pad"
                  maxLength={1}
                  onChangeText={(value) => handleDigitChange(index, value)}
                  onKeyPress={(event) => handleKeyPress(index, event)}
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  value={digit}
                />
              ))}
            </View>

            <Button
              disabled={!codeFull}
              loading={isLoading}
              loadingTitle="Confirmando..."
              onPress={handleConfirm}
              title="Confirmar"
            />

            {codeFull ? (
              <Text className="mt-3 text-center text-base leading-6 text-app-textSecondary dark:text-app-dark-textSecondary">
                Tudo pronto — toque em Confirmar.
              </Text>
            ) : null}

            <View className="my-5 h-px bg-app-neutralSoft dark:bg-app-dark-neutralSoft" />

            <Text className="mb-4 text-[17px] leading-[24px] text-app-textSecondary dark:text-app-dark-textSecondary">
              Não recebeu? Confira a caixa de spam.
            </Text>

            <Pressable
              accessibilityLabel="Reenviar código"
              accessibilityRole="button"
              accessibilityState={{ disabled: cooldown > 0 || isResending }}
              className="h-14 w-full flex-row items-center justify-center rounded-field border-[1.5px] border-app-border bg-app-surface dark:border-app-dark-border dark:bg-app-dark-surface"
              disabled={cooldown > 0 || isResending}
              onPress={handleResend}
              style={({ pressed }) => [
                pressed && cooldown === 0 && !isResending ? { opacity: 0.85 } : null,
              ]}
            >
              <Text
                className={[
                  'text-[17px] font-semibold leading-6',
                  cooldown > 0
                    ? 'text-app-textMuted dark:text-app-dark-textMuted'
                    : 'text-app-secondary dark:text-app-dark-secondary',
                ].join(' ')}
              >
                {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
              </Text>
            </Pressable>
          </View>

          {onBackToLogin ? (
            <Pressable
              className="mt-6 self-center"
              disabled={isLoading}
              onPress={handleBackToLogin}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Text className="text-[17px] font-semibold leading-6 text-app-secondary dark:text-app-dark-secondary">
                Voltar para entrar
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
