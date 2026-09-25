/**
 * Defeito achado no teste do app (2026-09-25): entrar com e-mail e senha
 * levava a um Perfil vazio. O `UserProvider` so busca o perfil quando o app
 * monta -- e, na tela de login, ainda nao ha sessao, entao a busca volta
 * vazia. Depois do login ninguem pedia de novo; o perfil so aparecia depois de
 * recarregar o app.
 *
 * A rota de login e o unico ponto por onde passam o login por senha e o do
 * Google, entao e nela que o perfil e recarregado -- ANTES de trocar de tela,
 * para a proxima ja abrir com os dados.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

const ordem: string[] = [];
const mockRefreshUser = jest.fn(async () => {
  ordem.push('refreshUser');
});

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn((rota: string) => {
      ordem.push(`replace:${rota}`);
    }),
    push: jest.fn(),
  },
}));
jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: jest.fn(() => Promise.reject(new Error('sem sessao'))),
}));
jest.mock('@/services/auth', () => ({
  resolvePostAuthRoute: jest.fn(async () => '/dashboard'),
}));
jest.mock('@/contexts/UserContext', () => ({
  useUserContext: () => ({ refreshUser: mockRefreshUser }),
}));

let capturado: { onLogin: () => Promise<void>; onGoogleAuthSuccess: () => Promise<void> };
jest.mock('@/screens/LoginScreen', () => ({
  LoginScreen: (props: typeof capturado) => {
    capturado = props;
    return null;
  },
}));

let doCadastro: { onGoogleAuthSuccess: () => Promise<void> };
jest.mock('@/screens/RegisterScreen', () => ({
  RegisterScreen: (props: typeof doCadastro) => {
    doCadastro = props;
    return null;
  },
}));

import LoginRoute from '../src/app/index';
import RegisterRoute from '../src/app/register';

beforeEach(() => {
  ordem.length = 0;
  mockRefreshUser.mockClear();
});

async function montar() {
  render(<LoginRoute />);
  await waitFor(() => expect(capturado).toBeDefined());
}

it('login por senha recarrega o perfil antes de sair da tela de login', async () => {
  await montar();
  await capturado.onLogin();
  expect(ordem).toEqual(['refreshUser', 'replace:/dashboard']);
});

it('login pelo Google tambem recarrega o perfil antes de sair da tela', async () => {
  await montar();
  await capturado.onGoogleAuthSuccess();
  expect(ordem).toEqual(['refreshUser', 'replace:/dashboard']);
});

it('entrar pelo Google a partir do cadastro tambem recarrega o perfil', async () => {
  // Conta do Google que ja tinha perfil vai direto para o Inicio.
  render(<RegisterRoute />);
  await capturadoDoCadastro();
  await doCadastro.onGoogleAuthSuccess();
  expect(ordem).toEqual(['refreshUser', 'replace:/dashboard']);
});

async function capturadoDoCadastro() {
  await waitFor(() => expect(doCadastro).toBeDefined());
}
