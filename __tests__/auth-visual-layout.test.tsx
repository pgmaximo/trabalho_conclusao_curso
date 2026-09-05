import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { SocialButton } from '@/components/SocialButton';
import { ConfirmScreen } from '@/screens/ConfirmScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';

const googleLogo = require('../assets/images/google_Glogo.png');

jest.mock('aws-amplify/auth', () => ({
  confirmResetPassword: jest.fn(),
  confirmSignUp: jest.fn(),
  resetPassword: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  signUp: jest.fn(),
}));

jest.mock('@/services/auth', () => ({
  serializeAuthError: jest.fn((error) => error),
  signInWithGoogle: jest.fn(),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');

describe('auth visual layout', () => {
  it.each([
    [
      'login',
      <LoginScreen
        onGoogleAuthSuccess={jest.fn()}
        onLogin={jest.fn()}
        onNavigateToForgotPassword={jest.fn()}
        onNavigateToRegister={jest.fn()}
      />,
      'auth-app-header',
    ],
    [
      'register',
      <RegisterScreen
        onGoogleAuthSuccess={jest.fn()}
        onNavigateToLogin={jest.fn()}
        onRegisterSuccess={jest.fn()}
      />,
      'register-header',
    ],
    ['forgot-password', <ForgotPasswordScreen onBackToLogin={jest.fn()} />, 'forgot-password-header'],
    [
      'confirm',
      <ConfirmScreen
        email="pessoa@email.com"
        onBackToLogin={jest.fn()}
        onConfirmSuccess={jest.fn()}
      />,
      'confirm-header',
    ],
  ])('renders the Canvas-accurate header on %s', (_name, element, headerTestId) => {
    render(element);

    // Bloco 1 substituiu o AuthIllustrationCard centralizado por cabeçalhos
    // dedicados por tela: AuthAppHeader (ícone + tagline) no Login e
    // BackHeader (chevron + título) nas telas internas de fluxo.
    expect(screen.getByTestId(headerTestId)).toBeTruthy();
  });

  it('keeps the Google logo balanced inside the social button', () => {
    render(<SocialButton iconSource={googleLogo} onPress={jest.fn()} title="Google" />);

    expect(screen.getByTestId('social-button-icon').props.style).toEqual(
      expect.objectContaining({ height: 20, width: 20 }),
    );
  });
});
