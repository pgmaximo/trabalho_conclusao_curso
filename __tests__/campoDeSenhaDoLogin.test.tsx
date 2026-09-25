/**
 * Achado do teste do app (2026-09-25): o botao de texto "Mostrar" da senha,
 * na largura de um celular, saia para fora da caixa do campo. Virou um icone
 * de olho (e olho riscado) -- ocupa um lugar fixo e pequeno, e o nome do botao
 * continua dito para o leitor de tela.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { LoginScreen } from '@/screens/LoginScreen';

jest.mock('aws-amplify/auth', () => ({ signIn: jest.fn(), signOut: jest.fn() }));
jest.mock('@/services/auth', () => ({
  serializeAuthError: jest.fn((error) => error),
  signInWithGoogle: jest.fn(),
}));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');

function renderizar() {
  render(
    <LoginScreen
      onGoogleAuthSuccess={jest.fn()}
      onLogin={jest.fn()}
      onNavigateToForgotPassword={jest.fn()}
      onNavigateToRegister={jest.fn()}
    />,
  );
}

const campoDeSenha = () => screen.getByPlaceholderText('Digite sua senha');

it('o botao da senha e um icone de olho, sem a palavra escrita', () => {
  renderizar();
  expect(screen.queryByText('Mostrar')).toBeNull();
  const botao = screen.getByRole('button', { name: 'Mostrar senha' });
  expect(botao).toBeTruthy();
  expect(screen.UNSAFE_getByProps({ name: 'visibility' })).toBeTruthy();
  expect(campoDeSenha().props.secureTextEntry).toBe(true);
});

it('tocar no olho mostra a senha e troca para o olho riscado', () => {
  renderizar();
  fireEvent.press(screen.getByRole('button', { name: 'Mostrar senha' }));

  expect(campoDeSenha().props.secureTextEntry).toBe(false);
  expect(screen.getByRole('button', { name: 'Ocultar senha' })).toBeTruthy();
  expect(screen.UNSAFE_getByProps({ name: 'visibility-off' })).toBeTruthy();
  expect(screen.queryByText('Ocultar')).toBeNull();
});
