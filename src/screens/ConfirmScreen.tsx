import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { confirmSignUp } from 'aws-amplify/auth';
import { AuthInput } from '@/components/AuthInput';
import { Button } from '@/components/Button';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

type ConfirmScreenProps = {
  email: string;
  onConfirmSuccess: () => void;
};

export function ConfirmScreen({ email, onConfirmSuccess }: ConfirmScreenProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Verifique seu e-mail</Text>
          <Text style={styles.subtitle}>Digitamos o código enviado para {email}</Text>

          <View style={styles.card}>
            <AuthInput
              label="Código de Confirmação"
              icon="🔢"
              placeholder="Digite o código de 6 dígitos"
              keyboardType="number-pad"
              value={code}
              onChangeText={setCode}
              editable={!isLoading}
            />

            {isLoading ? (
              <ActivityIndicator size="large" color={COLORS.primary} />
            ) : (
              <Button title="Confirmar Conta" onPress={handleConfirm} />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  content: { padding: SIZES.large, justifyContent: 'center', flex: 1 },
  title: { ...FONTS.title, textAlign: 'center' },
  subtitle: { ...FONTS.subtitle, textAlign: 'center', marginBottom: SIZES.large },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.cardRadius,
    padding: SIZES.large,
    elevation: 5,
  },
});