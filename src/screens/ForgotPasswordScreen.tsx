import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { confirmResetPassword, resetPassword } from 'aws-amplify/auth';

import { AuthInput } from '@/components/AuthInput';
import { Button } from '@/components/Button';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

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
      onBackToLogin();
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
          <View style={styles.hero}>
            <View style={styles.badge}>
              <Text style={styles.badgeIcon}>#</Text>
            </View>
            <Text style={styles.title}>Recuperar senha</Text>
            <Text style={styles.subtitle}>
              Informe seu e-mail para receber o codigo de recuperacao.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {codeSent ? 'Defina uma nova senha' : 'Enviar codigo'}
            </Text>

            <AuthInput
              label="E-mail"
              icon="@"
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
                  icon="#"
                  placeholder="Digite o codigo recebido"
                  keyboardType="number-pad"
                  value={code}
                  onChangeText={setCode}
                  editable={!isLoading}
                />

                <AuthInput
                  label="Nova senha"
                  icon="*"
                  placeholder="Digite a nova senha"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  editable={!isLoading}
                />

                <AuthInput
                  label="Confirmar nova senha"
                  icon="*"
                  placeholder="Confirme a nova senha"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!isLoading}
                />
              </>
            ) : null}

            {isLoading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
            ) : (
              <View style={styles.buttonGroup}>
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
              onPress={onBackToLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginLinkText}>Voltar para entrar</Text>
            </TouchableOpacity>
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
    paddingTop: SIZES.large * 1.5,
  },
  hero: {
    alignItems: 'center',
    marginBottom: SIZES.large,
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.large,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 6,
  },
  badgeIcon: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '700',
  },
  title: {
    ...FONTS.title,
    textAlign: 'center',
  },
  subtitle: {
    ...FONTS.subtitle,
    textAlign: 'center',
    marginTop: SIZES.small,
    maxWidth: 320,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.cardRadius,
    padding: SIZES.large,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 5,
  },
  cardTitle: {
    ...FONTS.heading,
    marginBottom: SIZES.large,
  },
  loader: {
    marginVertical: 20,
  },
  buttonGroup: {
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
