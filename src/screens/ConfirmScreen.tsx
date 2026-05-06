// =============================================================================
// Arquivo: ConfirmScreen.tsx
// Descricao: Tela de confirmacao de cadastro por codigo enviado por e-mail.
// Componente/screen pertencente: ConfirmScreen
// =============================================================================
//
// Funcionalidades:
// - Recebe o e-mail da rota de confirmacao.
// - Valida preenchimento do codigo antes de chamar AWS Amplify.
// - Confirma cadastro com `confirmSignUp` e avanca para a proxima etapa.
//
// Estrutura visual:
// - Area segura com status bar clara.
// - Imagem superior centralizada e conectada visualmente ao card.
// - Card com campo de codigo, acao principal e retorno opcional ao login.
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
import { confirmSignUp } from 'aws-amplify/auth';

import { AuthInput } from '@/components/AuthInput';
import { Button } from '@/components/Button';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { blurActiveWebElement } from '@/utils/webFocus';

const confirmImage = require('../../assets/images/confirm_image.png');

type ConfirmScreenProps = {
  email: string;
  onConfirmSuccess: () => void;
  onBackToLogin?: () => void;
};

export function ConfirmScreen({ email, onConfirmSuccess, onBackToLogin }: ConfirmScreenProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function handleBackToLogin() {
    blurActiveWebElement();
    onBackToLogin?.();
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.confirmComposition}>
            {/* A margem negativa conecta a imagem ao card para parecer que ela sai do formulario. */}
            <View style={styles.confirmImageWrapper}>
              <Image source={confirmImage} style={styles.confirmImage} resizeMode="contain" />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Verifique seu e-mail</Text>
              <Text style={styles.cardSubtitle}>
                Digite o codigo enviado para {email || 'seu e-mail'}.
              </Text>

              <AuthInput
                label="Codigo de Confirmacao"
                icon={
                  <MaterialIcons
                    name="confirmation-number"
                    size={20}
                    color={COLORS.placeholder}
                  />
                }
                containerStyle={styles.firstField}
                placeholder="Digite o codigo de 6 digitos"
                keyboardType="number-pad"
                value={code}
                onChangeText={setCode}
                editable={!isLoading}
              />

              {isLoading ? (
                <ActivityIndicator
                  size="large"
                  color={COLORS.primary}
                  style={styles.loadingIndicator}
                />
              ) : (
                <View style={styles.primaryAction}>
                  <Button title="Confirmar conta" onPress={handleConfirm} />
                </View>
              )}

              {onBackToLogin ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.loginLink}
                  onPress={handleBackToLogin}
                  disabled={isLoading}
                >
                  <Text style={styles.loginLinkText}>Voltar para entrar</Text>
                </TouchableOpacity>
              ) : null}
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
  confirmComposition: {
    alignItems: 'stretch',
  },
  confirmImageWrapper: {
    alignItems: 'center',
    zIndex: 2,
    marginBottom: -SIZES.medium,
  },
  confirmImage: {
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
