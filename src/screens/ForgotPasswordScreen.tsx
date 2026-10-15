import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { confirmResetPassword, resetPassword } from 'aws-amplify/auth';
import { useColorScheme } from 'nativewind';

import { AuthInput } from '@/components/AuthInput';
import { BackHeader } from '@/components/BackHeader';
import { Button } from '@/components/Button';
import { PasswordVisibilityToggle } from '@/components/PasswordVisibilityToggle';
import { SuccessSnackbar } from '@/components/SuccessSnackbar';
import { useThemeColors } from '@/constants/theme';
import { serializeAuthError } from '@/services/auth';
import { blurActiveWebElement } from '@/utils/webFocus';

type ForgotPasswordScreenProps = {
  onBackToLogin: () => void;
};

type Step = 1 | 2;

// Tempo para a pessoa ler que a senha foi alterada antes de a tela trocar
// (o mesmo do "Bem-vindo(a) de volta!" do Login).
const SUCCESS_NAVIGATION_DELAY_MS = 900;

export function ForgotPasswordScreen({ onBackToLogin }: ForgotPasswordScreenProps) {
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  // As falhas e o que falta aparecem na tela, e não em pop-ups do sistema
  // (specs/00-fundacao/consistencia-e-textos/spec.md, D4).
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stepLabel = step === 1 ? 'Passo 1 de 2' : 'Passo 2 de 2';

  // NFR (spec.md §6): nenhuma senha em texto puro deve sobreviver ao unmount.
  useEffect(() => {
    return () => {
      setNewPassword('');
      setConfirmPassword('');
      if (navigationTimer.current) {
        clearTimeout(navigationTimer.current);
      }
    };
  }, []);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const emailReason = !email.trim() ? 'Informe seu e-mail.' : undefined;
  const newPasswordReason = !code.trim()
    ? 'Digite o código de 6 dígitos.'
    : !newPassword
      ? 'Crie a nova senha.'
      : !confirmPassword
        ? 'Repita a nova senha para confirmar.'
        : mismatch
          ? 'Corrija a confirmação da senha.'
          : undefined;

  function handleBackToLogin() {
    blurActiveWebElement();
    onBackToLogin();
  }

  // "Trocar o e-mail" e a seta "‹" do passo 2 voltam ao passo 1 sem chamar a
  // API novamente — e-mail permanece preenchido/editável, código e senhas
  // digitados são descartados pois um novo código precisará ser solicitado.
  function goToStep1() {
    setErrorMessage(null);
    setStep(1);
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
  }

  function handleHeaderBack() {
    if (step === 2) {
      goToStep1();
      return;
    }

    handleBackToLogin();
  }

  async function handleSendCode() {
    const normalizedEmail = email.trim().toLowerCase();

    if (emailReason) {
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      await resetPassword({ username: normalizedEmail });
      setEmail(normalizedEmail);
      setStep(2);
      setSnackbarMessage('Código enviado para seu e-mail');
    } catch (error: any) {
      console.log('Erro ao solicitar recuperacao:', serializeAuthError(error));
      setErrorMessage(getResetRequestMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirmPassword() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || newPasswordReason) {
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    // Com a senha alterada, a tela continua ocupada até trocar: o código já
    // foi usado, e um segundo toque em "Alterar senha" só daria erro.
    let changed = false;

    try {
      await confirmResetPassword({
        username: normalizedEmail,
        confirmationCode: code.trim(),
        newPassword,
      });

      setNewPassword('');
      setConfirmPassword('');

      changed = true;
      setSnackbarMessage('Senha alterada. Entre com a nova senha.');
      navigationTimer.current = setTimeout(handleBackToLogin, SUCCESS_NAVIGATION_DELAY_MS);
    } catch (error: any) {
      console.log('Erro ao confirmar recuperacao:', serializeAuthError(error));
      setErrorMessage(getConfirmResetMessage(error));
    } finally {
      if (!changed) {
        setIsLoading(false);
      }
    }
  }

  function getResetRequestMessage(error: any) {
    if (error?.name === 'UserNotFoundException') return 'Usuário não encontrado.';
    if (error?.name === 'LimitExceededException') return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';

    return 'Não foi possível enviar o código. Tente novamente.';
  }

  function getConfirmResetMessage(error: any) {
    if (error?.name === 'CodeMismatchException') return 'Código inválido.';
    if (error?.name === 'ExpiredCodeException') return 'Código expirado. Solicite um novo código.';
    if (error?.name === 'InvalidPasswordException') return 'A nova senha não atende aos requisitos mínimos.';
    if (error?.name === 'LimitExceededException') return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';

    return 'Não foi possível atualizar a senha. Tente novamente.';
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
            onBack={handleHeaderBack}
            subtitle={stepLabel}
            testID="forgot-password-header"
            title="Recuperar senha"
          />

          <View className="mb-6 flex-row gap-2">
            <View
              className="flex-1 bg-app-primary dark:bg-app-dark-primary"
              style={{ height: 8, borderRadius: 4 }}
            />
            <View
              className={
                step === 2
                  ? 'flex-1 bg-app-primary dark:bg-app-dark-primary'
                  : 'flex-1 bg-app-progressTrack dark:bg-app-dark-progressTrack'
              }
              style={{ height: 8, borderRadius: 4 }}
            />
          </View>

          <View
            className="rounded-card border border-app-neutralSoft bg-app-surface p-5 dark:border-app-dark-neutralSoft dark:bg-app-dark-surface"
            style={{ boxShadow: `0px 2px 10px ${colors.shadow}0D` }}
          >
            {step === 1 ? (
              <>
                <Text className="mb-3 text-xl font-semibold leading-[26px] text-app-text dark:text-app-dark-text">
                  Qual é o seu e-mail?
                </Text>
                <Text className="mb-2 text-[15px] leading-[22px] text-app-textSecondary dark:text-app-dark-textSecondary">
                  Vamos enviar um código de 6 dígitos para você criar uma senha nova.
                </Text>

                <AuthInput
                  autoCapitalize="none"
                  editable={!isLoading}
                  icon={<MaterialIcons color={colors.placeholder} name="email" size={20} />}
                  keyboardType="email-address"
                  label="E-mail"
                  onChangeText={(value) => {
                    setErrorMessage(null);
                    setEmail(value);
                  }}
                  placeholder="Digite seu e-mail"
                  value={email}
                />

                {errorMessage ? (
                  <Text
                    accessibilityRole="alert"
                    className="mt-3 text-[16px] leading-[22px] text-app-danger dark:text-app-dark-danger"
                  >
                    {errorMessage}
                  </Text>
                ) : null}

                {isLoading ? (
                  <ActivityIndicator
                    color={colors.primary}
                    size="large"
                    style={{ marginBottom: 24, marginTop: 12 }}
                  />
                ) : (
                  <Button
                    disabled={Boolean(emailReason)}
                    disabledReason={emailReason}
                    onPress={handleSendCode}
                    title="Enviar código"
                  />
                )}
              </>
            ) : (
              <>
                <Text className="mb-3 text-xl font-semibold leading-[26px] text-app-text dark:text-app-dark-text">
                  Crie uma nova senha
                </Text>
                <Text className="mb-2 text-[15px] leading-[22px] text-app-textSecondary dark:text-app-dark-textSecondary">
                  Digite o código enviado para {email}.
                </Text>

                <AuthInput
                  editable={!isLoading}
                  icon={
                    <MaterialIcons
                      color={colors.placeholder}
                      name="confirmation-number"
                      size={20}
                    />
                  }
                  inputClassName="text-center text-xl"
                  keyboardType="number-pad"
                  label="Código de 6 dígitos"
                  onChangeText={(value) => {
                    setErrorMessage(null);
                    setCode(value);
                  }}
                  placeholder="000000"
                  style={{ letterSpacing: 0.3 * 20 }}
                  value={code}
                />

                <AuthInput
                  editable={!isLoading}
                  icon={<MaterialIcons color={colors.placeholder} name="lock" size={20} />}
                  label="Nova senha"
                  onChangeText={setNewPassword}
                  placeholder="Mínimo 8 caracteres, 1 número, 1 especial"
                  secureTextEntry={!isNewPasswordVisible}
                  trailingAction={
                    <PasswordVisibilityToggle
                      disabled={isLoading}
                      onToggle={() => setIsNewPasswordVisible((current) => !current)}
                      target="nova senha"
                      visible={isNewPasswordVisible}
                    />
                  }
                  value={newPassword}
                />

                <AuthInput
                  editable={!isLoading}
                  errorMessage={mismatch ? 'As senhas não são iguais.' : undefined}
                  hasError={mismatch}
                  icon={<MaterialIcons color={colors.placeholder} name="lock" size={20} />}
                  label="Confirmar nova senha"
                  onChangeText={setConfirmPassword}
                  placeholder="Confirme a nova senha"
                  secureTextEntry={!isConfirmPasswordVisible}
                  trailingAction={
                    <PasswordVisibilityToggle
                      disabled={isLoading}
                      onToggle={() => setIsConfirmPasswordVisible((current) => !current)}
                      target="confirmação da nova senha"
                      visible={isConfirmPasswordVisible}
                    />
                  }
                  value={confirmPassword}
                />

                {errorMessage ? (
                  <Text
                    accessibilityRole="alert"
                    className="mt-3 text-[16px] leading-[22px] text-app-danger dark:text-app-dark-danger"
                  >
                    {errorMessage}
                  </Text>
                ) : null}

                {isLoading ? (
                  <ActivityIndicator
                    color={colors.primary}
                    size="large"
                    style={{ marginBottom: 24, marginTop: 12 }}
                  />
                ) : (
                  <View className="gap-3">
                    <Button
                      disabled={Boolean(newPasswordReason)}
                      disabledReason={newPasswordReason}
                      onPress={handleConfirmPassword}
                      title="Alterar senha"
                    />
                    <Button onPress={goToStep1} title="Trocar o e-mail" variant="secondary" />
                  </View>
                )}
              </>
            )}
          </View>

          {step === 1 ? (
            <Pressable
              className="mt-6 self-center"
              disabled={isLoading}
              onPress={handleBackToLogin}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Text className="text-[15px] font-semibold leading-[22px] text-app-secondary dark:text-app-dark-secondary">
                Voltar para entrar
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <SuccessSnackbar
        message={snackbarMessage ?? ''}
        onHide={() => setSnackbarMessage(null)}
        visible={snackbarMessage !== null}
      />
    </SafeAreaView>
  );
}
