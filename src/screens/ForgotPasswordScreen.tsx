// =============================================================================
// Arquivo: ForgotPasswordScreen.tsx
// Descricao: Tela de recuperacao e redefinicao de senha por e-mail.
// Componente/screen pertencente: ForgotPasswordScreen
// =============================================================================
//
// Funcionalidades:
// - Solicita codigo de recuperacao via AWS Amplify.
// - Permite confirmar codigo e definir uma nova senha.
// - Mantem acao para reenviar codigo e voltar ao login.
//
// Estrutura visual:
// - Area segura com status bar clara.
// - Imagem superior centralizada e conectada visualmente ao card.
// - Card com campos, acoes principais/secundarias e link de retorno.
//
// =============================================================================

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StatusBar } from 'expo-status-bar';
import { confirmResetPassword, resetPassword } from 'aws-amplify/auth';

import { AuthInput } from '@/components/AuthInput';
import { Button } from '@/components/Button';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { blurActiveWebElement } from '@/utils/webFocus';

const forgotPasswordImage = require('../../assets/images/forgot_password_image.png');

type ForgotPasswordScreenProps = {
  onBackToLogin: () => void;
};

export function ForgotPasswordScreen({ onBackToLogin }: ForgotPasswordScreenProps) {
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.forgotPasswordComposition}>
            {/* A margem negativa conecta a imagem ao card para parecer que ela sai do formulario. */}
            <View style={styles.forgotPasswordImageWrapper}>
              <Image
                source={forgotPasswordImage}
                style={styles.forgotPasswordImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {codeSent ? 'Defina uma nova senha' : 'Recuperar senha'}
              </Text>
              <Text style={styles.cardSubtitle}>
                {codeSent
                  ? 'Digite o codigo recebido e escolha uma nova senha.'
                  : 'Informe seu e-mail para receber o codigo de recuperacao.'}
              </Text>

              <AuthInput
                label="E-mail"
                icon={<MaterialIcons name="email" size={20} color={COLORS.placeholder} />}
                containerStyle={styles.firstField}
                placeholder="Digite seu e-mail"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!isLoading && !codeSent}
              />

              {codeSent ? (
                <>
                  <AuthInput
                    label="Codigo"
                    icon={
                      <MaterialIcons
                        name="confirmation-number"
                        size={20}
                        color={COLORS.placeholder}
                      />
                    }
                    placeholder="Digite o codigo recebido"
                    keyboardType="number-pad"
                    value={code}
                    onChangeText={setCode}
                    editable={!isLoading}
                  />

                  <AuthInput
                    label="Nova senha"
                    icon={<MaterialIcons name="lock" size={20} color={COLORS.placeholder} />}
                    placeholder="Digite a nova senha"
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                    editable={!isLoading}
                  />

                  <AuthInput
                    label="Confirmar nova senha"
                    icon={<MaterialIcons name="lock" size={20} color={COLORS.placeholder} />}
                    placeholder="Confirme a nova senha"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!isLoading}
                  />
                </>
              ) : null}

              {isLoading ? (
                <ActivityIndicator
                  size="large"
                  color={COLORS.primary}
                  style={styles.loadingIndicator}
                />
              ) : (
                <View style={styles.primaryAction}>
                  <Button
                    title={codeSent ? 'Alterar senha' : 'Enviar codigo'}
                    onPress={codeSent ? handleConfirmPassword : handleSendCode}
                  />

                  {codeSent ? (
                    <Button title="Reenviar codigo" variant="secondary" onPress={handleSendCode} />
                  ) : null}
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.loginLink}
                onPress={handleBackToLogin}
                disabled={isLoading}
              >
                <Text style={styles.loginLinkText}>Voltar para entrar</Text>
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
  forgotPasswordComposition: {
    alignItems: 'stretch',
  },
  forgotPasswordImageWrapper: {
    alignItems: 'center',
    zIndex: 2,
    marginBottom: -SIZES.medium,
  },
  forgotPasswordImage: {
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
    marginBottom: SIZES.small,
  },
  cardSubtitle: {
    ...FONTS.body,
    marginBottom: SIZES.large,
  },
  firstField: {
    marginTop: 0,
  },
  loadingIndicator: {
    marginTop: SIZES.small,
    marginBottom: SIZES.large,
  },
  primaryAction: {
    gap: SIZES.small,
  },
  loginLink: {
    alignSelf: 'center',
    marginTop: SIZES.large,
  },
  loginLinkText: {
    ...FONTS.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
