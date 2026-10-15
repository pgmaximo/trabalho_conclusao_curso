import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signUp } from 'aws-amplify/auth';
import { useColorScheme } from 'nativewind';

import { AuthInput } from '@/components/AuthInput';
import { AuthAppHeader } from '@/components/AuthAppHeader';
import { Button } from '@/components/Button';
import { PasswordVisibilityToggle } from '@/components/PasswordVisibilityToggle';
import { SectionDivider } from '@/components/SectionDivider';
import { SocialButton } from '@/components/SocialButton';
import { useThemeColors } from '@/constants/theme';
import { serializeAuthError, signInWithGoogle } from '@/services/auth';
import { initializeUserSession } from '@/services/auth/userSessionService';
import { blurActiveWebElement } from '@/utils/webFocus';

const googleLogo = require('../../assets/images/google_Glogo.png');
const mismatchMessage = 'As senhas não são iguais.';

type PasswordRequirement = {
  label: string;
  isMet: boolean;
};

type RegisterScreenProps = {
  onNavigateToLogin: () => void;
  onRegisterSuccess: (email: string, password: string) => void;
  onGoogleAuthSuccess: () => void;
};

function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    { label: 'Ter pelo menos 8 caracteres', isMet: password.length >= 8 },
    { label: 'Contém pelo menos 1 número', isMet: /\d/.test(password) },
    { label: 'Contém pelo menos 1 caractere especial', isMet: /[^A-Za-z0-9]/.test(password) },
    { label: 'Contém pelo menos 1 letra maiúscula', isMet: /[A-Z]/.test(password) },
    { label: 'Contém pelo menos 1 letra minúscula', isMet: /[a-z]/.test(password) },
  ];
}

export function RegisterScreen({
  onNavigateToLogin,
  onRegisterSuccess,
  onGoogleAuthSuccess,
}: RegisterScreenProps) {
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [registerErrorMessage, setRegisterErrorMessage] = useState<string | null>(null);

  const passwordRequirements = getPasswordRequirements(password);
  const isPasswordRequirementsVisible = isPasswordFocused || password.length > 0;
  const isPasswordValid = passwordRequirements.every((requirement) => requirement.isMet);
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  // DECISION (specs/00-fundacao/consistencia-e-textos/spec.md, D4): o botão diz
  // o que falta, um item de cada vez e na ordem dos campos. Antes ele só
  // desabilitava pela senha; e-mail vazio e senhas diferentes eram avisados por
  // um pop-up do sistema, depois do toque.
  const disabledReason = !email.trim()
    ? 'Informe seu e-mail.'
    : !password
      ? 'Crie uma senha.'
      : !isPasswordValid
        ? 'A senha ainda não atende a todos os itens da lista.'
        : !confirmPassword
          ? 'Repita a senha para confirmar.'
          : mismatch
            ? 'Corrija a confirmação da senha.'
            : undefined;

  function clearRegisterError() {
    if (registerErrorMessage) {
      setRegisterErrorMessage(null);
    }
  }

  async function handleRegister() {
    if (disabledReason) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    setRegisterErrorMessage(null);
    setIsLoading(true);

    try {
      const { nextStep } = await signUp({
        username: normalizedEmail,
        password,
        options: {
          userAttributes: {
            email: normalizedEmail,
          },
          autoSignIn: true,
        },
      });

      if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        // Sem pop-up de "enviamos um código": a tela de confirmação abre
        // dizendo exatamente isso, com o e-mail.
        // DECISION: Passa password para ConfirmScreen para auto-signin apos confirmar email
        onRegisterSuccess(normalizedEmail, password);
      }
    } catch (error: any) {
      console.log('Erro detalhado:', error);
      let message = 'Ocorreu um erro ao criar a conta. Tente novamente.';

      if (error.name === 'UsernameExistsException') message = 'Este e-mail já está em uso.';
      if (error.name === 'InvalidPasswordException') message = 'A senha não atende aos requisitos mínimos de segurança.';
      if (error.name === 'InvalidParameterException') message = 'Verifique se o e-mail está em um formato válido.';

      setRegisterErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleRegister() {
    blurActiveWebElement();
    setRegisterErrorMessage(null);
    setIsLoading(true);

    try {
      await signInWithGoogle();
      // Initialize user session after Google sign-in
      await initializeUserSession();
      onGoogleAuthSuccess();
    } catch (error: any) {
      console.log('Erro no cadastro com Google:', serializeAuthError(error));
      setRegisterErrorMessage('Não foi possível conectar com o Google.');
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
          <AuthAppHeader />

          <View
            className="rounded-card border border-app-border bg-app-surface p-4 dark:border-app-dark-border dark:bg-app-dark-surface"
            style={{ boxShadow: `0px 2px 10px ${colors.shadow}0D` }}
          >
            <AuthInput
              autoCapitalize="none"
              containerClassName="mt-0"
              editable={!isLoading}
              icon={<MaterialIcons color={colors.placeholder} name="email" size={20} />}
              keyboardType="email-address"
              label="E-mail"
              onChangeText={(value) => {
                clearRegisterError();
                setEmail(value);
              }}
              placeholder="seu@email.com"
              value={email}
            />

            {/* Os dois campos de senha têm o olho do Login: quem cria a senha
                precisa conferir o que digitou mais do que quem só a repete
                (specs/00-fundacao/consistencia-e-textos/spec.md, D6). */}
            <AuthInput
              editable={!isLoading}
              icon={<MaterialIcons color={colors.placeholder} name="lock" size={20} />}
              label="Senha"
              onBlur={() => setIsPasswordFocused(false)}
              onChangeText={(value) => {
                clearRegisterError();
                setPassword(value);
              }}
              onFocus={() => setIsPasswordFocused(true)}
              placeholder="Crie uma senha"
              secureTextEntry={!isPasswordVisible}
              trailingAction={
                <PasswordVisibilityToggle
                  disabled={isLoading}
                  onToggle={() => setIsPasswordVisible((current) => !current)}
                  visible={isPasswordVisible}
                />
              }
              value={password}
            />

            {isPasswordRequirementsVisible ? (
              <View className="mt-3 gap-3 rounded-app border border-app-border bg-app-surfaceMuted p-3 dark:border-app-dark-border dark:bg-app-dark-surfaceMuted">
                {passwordRequirements.map((requirement) => (
                  <View className="flex-row items-center gap-3" key={requirement.label}>
                    <MaterialIcons
                      color={requirement.isMet ? colors.success : colors.textMuted}
                      name={requirement.isMet ? 'check-circle' : 'radio-button-unchecked'}
                      size={16}
                    />
                    <Text
                      className={[
                        'flex-1 text-[13px] leading-[18px] text-app-textSecondary dark:text-app-dark-textSecondary',
                        requirement.isMet
                          ? 'text-app-success line-through dark:text-app-dark-success'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {requirement.label}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <AuthInput
              editable={!isLoading}
              errorMessage={mismatch ? mismatchMessage : undefined}
              hasError={mismatch}
              icon={<MaterialIcons color={colors.placeholder} name="lock" size={20} />}
              label="Confirmar senha"
              onChangeText={(value) => {
                clearRegisterError();
                setConfirmPassword(value);
              }}
              placeholder="Repita a senha"
              secureTextEntry={!isConfirmPasswordVisible}
              trailingAction={
                <PasswordVisibilityToggle
                  disabled={isLoading}
                  onToggle={() => setIsConfirmPasswordVisible((current) => !current)}
                  target="confirmação da senha"
                  visible={isConfirmPasswordVisible}
                />
              }
              value={confirmPassword}
            />

            {/* A falha ao criar a conta aparece aqui, como no Login, e não num
                pop-up do sistema. */}
            {registerErrorMessage ? (
              <Text
                accessibilityRole="alert"
                className="mt-3 text-[16px] leading-[22px] text-app-danger dark:text-app-dark-danger"
              >
                {registerErrorMessage}
              </Text>
            ) : null}

            <Button
              disabled={Boolean(disabledReason)}
              disabledReason={disabledReason}
              loading={isLoading}
              loadingTitle="Criando conta..."
              onPress={handleRegister}
              title="Criar conta"
            />

            <SectionDivider label="ou continue com" />

            <View className="flex-row justify-between">
              <SocialButton
                disabled={isLoading}
                iconSource={googleLogo}
                onPress={handleGoogleRegister}
                title="Continuar com Google"
              />
            </View>
          </View>

          {/* O mesmo link do Login ("Não tem conta? Criar conta"), no mesmo
              tamanho e na mesma cor. Aqui ele era menor e verde. */}
          <Pressable
            className="mt-[18px] self-center"
            disabled={isLoading}
            onPress={onNavigateToLogin}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <Text className="text-[17px] leading-[23px] text-app-textSecondary dark:text-app-dark-textSecondary">
              Já tem conta?{' '}
              <Text className="font-semibold text-app-secondary dark:text-app-dark-secondary">
                Entrar
              </Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
