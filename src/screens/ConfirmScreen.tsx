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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { confirmSignUp } from 'aws-amplify/auth';

import { AuthInput } from '@/components/AuthInput';
import { AuthBackgroundGlow } from '@/components/AuthBackgroundGlow';
import { AuthIllustrationCard } from '@/components/AuthIllustrationCard';
import { Button } from '@/components/Button';
import { useThemeColors } from '@/constants/theme';
import { blurActiveWebElement } from '@/utils/webFocus';

const confirmImage = require('../../assets/images/confirm_image.png');

type ConfirmScreenProps = {
  email: string;
  onConfirmSuccess: () => void;
  onBackToLogin?: () => void;
};

export function ConfirmScreen({ email, onConfirmSuccess, onBackToLogin }: ConfirmScreenProps) {
  const colors = useThemeColors();
  const colorScheme = useColorScheme();
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
                  Digite o codigo enviado para {email || 'seu e-mail'}.
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
                  label="Codigo de Confirmacao"
                  onChangeText={setCode}
                  placeholder="Digite o codigo de 6 digitos"
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
