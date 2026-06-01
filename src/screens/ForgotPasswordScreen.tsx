import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { confirmResetPassword, resetPassword } from 'aws-amplify/auth';

import { AuthInput } from '@/components/AuthInput';
import { AuthBackgroundGlow } from '@/components/AuthBackgroundGlow';
import { AuthIllustrationCard } from '@/components/AuthIllustrationCard';
import { Button } from '@/components/Button';
import { useThemeColors } from '@/constants/theme';
import { blurActiveWebElement } from '@/utils/webFocus';

const forgotPasswordImage = require('../../assets/images/forgot_password_image.png');

type ForgotPasswordScreenProps = {
  onBackToLogin: () => void;
};

export function ForgotPasswordScreen({ onBackToLogin }: ForgotPasswordScreenProps) {
  const colors = useThemeColors();
  const colorScheme = useColorScheme();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  function handleBackToLogin() {
    blurActiveWebElement();
    onBackToLogin();
  }

  async function handleSendCode() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      Alert.alert('Atencao', 'Digite seu e-mail para recuperar a senha.');
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword({ username: normalizedEmail });
      setEmail(normalizedEmail);
      setCodeSent(true);
      Alert.alert('Codigo enviado', 'Enviamos um codigo de recuperacao para o seu e-mail.');
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
      Alert.alert('Atencao', 'Preencha todos os campos.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Atencao', 'As senhas nao coincidem.');
      return;
    }

    setIsLoading(true);

    try {
      await confirmResetPassword({
        username: normalizedEmail,
        confirmationCode: code.trim(),
        newPassword,
      });

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
    if (error?.name === 'UserNotFoundException') return 'Usuario nao encontrado.';
    if (error?.name === 'LimitExceededException') return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';

    return 'Nao foi possivel enviar o codigo. Tente novamente.';
  }

  function getConfirmResetMessage(error: any) {
    if (error?.name === 'CodeMismatchException') return 'Codigo invalido.';
    if (error?.name === 'ExpiredCodeException') return 'Codigo expirado. Solicite um novo codigo.';
    if (error?.name === 'InvalidPasswordException') return 'A nova senha nao atende aos requisitos minimos.';
    if (error?.name === 'LimitExceededException') return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';

    return 'Nao foi possivel atualizar a senha. Tente novamente.';
  }

  function serializeAuthError(error: any) {
    return {
      name: error?.name,
      message: error?.message,
      recoverySuggestion: error?.recoverySuggestion,
      underlyingName: error?.underlyingError?.name,
      underlyingMessage: error?.underlyingError?.message,
    };
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
          <AuthIllustrationCard imageSource={forgotPasswordImage}>
                <Text className="mb-3 text-xl font-bold leading-[26px] text-app-text dark:text-app-dark-text">
                  {codeSent ? 'Defina uma nova senha' : 'Recuperar senha'}
                </Text>
                <Text className="mb-6 text-[15px] leading-[22px] text-app-textSecondary dark:text-app-dark-textSecondary">
                  {codeSent
                    ? 'Digite o codigo recebido e escolha uma nova senha.'
                    : 'Informe seu e-mail para receber o codigo de recuperacao.'}
                </Text>

                <AuthInput
                  autoCapitalize="none"
                  containerClassName="mt-0"
                  editable={!isLoading && !codeSent}
                  icon={<MaterialIcons color={colors.placeholder} name="email" size={20} />}
                  keyboardType="email-address"
                  label="E-mail"
                  onChangeText={setEmail}
                  placeholder="Digite seu e-mail"
                  value={email}
                />

                {codeSent ? (
                  <>
                    <AuthInput
                      editable={!isLoading}
                      icon={
                        <MaterialIcons
                          color={colors.placeholder}
                          name="confirmation-number"
                          size={20}
                        />
                      }
                      keyboardType="number-pad"
                      label="Codigo"
                      onChangeText={setCode}
                      placeholder="Digite o codigo recebido"
                      value={code}
                    />

                    <AuthInput
                      editable={!isLoading}
                      icon={<MaterialIcons color={colors.placeholder} name="lock" size={20} />}
                      label="Nova senha"
                      onChangeText={setNewPassword}
                      placeholder="Digite a nova senha"
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
                  </>
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
                      onPress={codeSent ? handleConfirmPassword : handleSendCode}
                      title={codeSent ? 'Alterar senha' : 'Enviar codigo'}
                    />

                    {codeSent ? (
                      <Button onPress={handleSendCode} title="Reenviar codigo" variant="secondary" />
                    ) : null}
                  </View>
                )}

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
          </AuthIllustrationCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
