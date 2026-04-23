import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import LoginRoute from '@/app/index';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));

describe('LoginRoute', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
  });

  it('redireciona para o dashboard quando o login e valido', async () => {
    const { getByText, getByLabelText } = render(<LoginRoute />);

    fireEvent.changeText(getByLabelText('E-mail'), 'pessoa@exemplo.com');
    fireEvent.changeText(getByLabelText('Senha'), '12345678');
    fireEvent.press(getByText('Entrar'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('envia o usuario para cadastro quando ele escolhe criar conta', () => {
    const { getByText } = render(<LoginRoute />);

    fireEvent.press(getByText('Criar conta gratuita'));

    expect(mockPush).toHaveBeenCalledWith('/register');
  });
});
