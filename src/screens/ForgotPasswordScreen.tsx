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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { confirmResetPassword, resetPassword } from 'aws-amplify/auth';
import { useColorScheme } from 'nativewind';

import { AuthInput } from '@/components/AuthInput';
import { AuthBackgroundGlow } from '@/components/AuthBackgroundGlow';
import { BackHeader } from '@/components/BackHeader';
import { Button } from '@/components/Button';
import { SuccessSnackbar } from '@/components/SuccessSnackbar';
import { useThemeColors } from '@/constants/theme';
import { serializeAuthError } from '@/services/auth';
import { blurActiveWebElement } from '@/utils/webFocus';

type ForgotPasswordScreenProps = {
  onBackToLogin: () => void;
};

type Step = 1 | 2;

export function ForgotPasswordScreen({ onBackToLogin }: ForgotPasswordScreenProps) {
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);

  const stepLabel = step === 1 ? 'Passo 1 de 2' : 'Passo 2 de 2';

  // NFR (spec.md §6): nenhuma senha em texto puro deve sobreviver ao unmount.
  useEffect(() => {
    return () => {
      setNewPassword('');
      setConfirmPassword('');
    };
  }, []);

  function handleBackToLogin() {
    blurActiveWebElement();
    onBackToLogin();
  }

  // "Trocar o e-mail" e a seta "‹" do passo 2 voltam ao passo 1 sem chamar a
  // API novamente — e-mail permanece preenchido/editável, código e senhas
  // digitados são descartados pois um novo código precisará ser solicitado.
  function goToStep1() {
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

    if (!normalizedEmail) {
      Alert.alert('Atenção', 'Digite seu e-mail para recuperar a senha.');
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword({ username: normalizedEmail });
      setEmail(normalizedEmail);
      setStep(2);
      setShowSuccessSnackbar(true);
    } catch (error: any) {
      console.log('Erro ao solicitar recuperacao:', serializeAuthError(error));
      Alert.alert('Erro', getResetRequestMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirmPassword() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !code || !newPassword || !confirmPassword) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
      return;
    }

    setIsLoading(true);

    try {
      await confirmResetPassword({
        username: normalizedEmail,
        confirmationCode: code.trim(),
        newPassword,
      });

      setNewPassword('');
      setConfirmPassword('');

      Alert.alert('Senha atualizada', 'Sua senha foi alterada com sucesso.');
      handleBackToLogin();
    } catch (error: any) {
      console.log('Erro ao confirmar recuperacao:', serializeAuthError(error));
      Alert.alert('Erro', getConfirmResetMessage(error));
    } finally {
      setIsLoading(false);
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
      <AuthBackgroundGlow corner="topLeft" />
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
                  onChangeText={setEmail}
                  placeholder="Digite seu e-mail"
                  value={email}
                />

                {isLoading ? (
                  <ActivityIndicator
                    color={colors.primary}
                    size="large"
                    style={{ marginBottom: 24, marginTop: 12 }}
                  />
                ) : (
                  <Button onPress={handleSendCode} title="Enviar código" />
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
                  onChangeText={setCode}
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
                  secureTextEntry
                  value={newPassword}
                />

                <AuthInput
                  editable={!isLoading}
                  icon={<MaterialIcons color={colors.placeholder} name="lock" size={20} />}
                  label="Confirmar nova senha"
                  onChangeText={setConfirmPassword}
                  placeholder="Confirme a nova senha"
                  secureTextEntry
                  value={confirmPassword}
                />

                {isLoading ? (
                  <ActivityIndicator
                    color={colors.primary}
                    size="large"
                    style={{ marginBottom: 24, marginTop: 12 }}
                  />
                ) : (
                  <View className="gap-3">
                    <Button onPress={handleConfirmPassword} title="Alterar senha" />
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
        message="Código enviado para seu e-mail"
        onHide={() => setShowSuccessSnackbar(false)}
        visible={showSuccessSnackbar}
      />
    </SafeAreaView>
  );
}
