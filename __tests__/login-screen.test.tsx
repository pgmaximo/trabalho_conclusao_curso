import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { confirmResetPassword, confirmSignUp, resetPassword, signIn } from 'aws-amplify/auth';

import { ConfirmScreen } from '@/screens/ConfirmScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';

jest.mock('aws-amplify/auth', () => ({
  confirmResetPassword: jest.fn(),
  confirmSignUp: jest.fn(),
  resendSignUpCode: jest.fn(),
  resetPassword: jest.fn(),
  signIn: jest.fn(),
}));

// ForgotPasswordScreen importa serializeAuthError de '@/services/auth' (barrel),
// que transitivamente carrega 'aws-amplify/data' → uuid (ESM não transformado pelo Jest).
// Stubar o módulo evita o crash de load sem afetar o comportamento testado.
jest.mock('aws-amplify/data', () => ({
  generateClient: jest.fn(() => ({})),
}));

describe('auth support screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests a password reset code and then confirms a new password', async () => {
    const onBackToLogin = jest.fn();

    (resetPassword as jest.Mock).mockResolvedValueOnce({});
    (confirmResetPassword as jest.Mock).mockResolvedValueOnce({});

    const view = render(<ForgotPasswordScreen onBackToLogin={onBackToLogin} />);

    expect(view.getByText('Recuperar senha')).toBeTruthy();
    expect(view.getByPlaceholderText('Digite seu e-mail')).toBeTruthy();

    fireEvent.changeText(view.getByLabelText('E-mail'), ' Pessoa@Email.com ');
    fireEvent.press(view.getByText('Enviar código'));

    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith({ username: 'pessoa@email.com' });
    });

    expect(await view.findByText('Crie uma nova senha')).toBeTruthy();

    fireEvent.changeText(view.getByLabelText('Código de 6 dígitos'), '123456');
    fireEvent.changeText(view.getByLabelText('Nova senha'), 'Senha@123');
    fireEvent.changeText(view.getByLabelText('Confirmar nova senha'), 'Senha@123');
    fireEvent.press(view.getByText('Alterar senha'));

    await waitFor(() => {
      expect(confirmResetPassword).toHaveBeenCalledWith({
        username: 'pessoa@email.com',
        confirmationCode: '123456',
        newPassword: 'Senha@123',
      });
    });

    // A tela diz que a senha foi alterada e so entao volta para o Login
    // (antes era um pop-up do sistema por cima da troca de tela).
    expect(await view.findByText('Senha alterada. Entre com a nova senha.')).toBeTruthy();
    await waitFor(() => expect(onBackToLogin).toHaveBeenCalledTimes(1), { timeout: 3000 });
  });

  it('validates empty reset e-mail before calling Amplify', () => {
    render(<ForgotPasswordScreen onBackToLogin={jest.fn()} />);

    fireEvent.press(screen.getByText('Enviar código'));

    // O botao fica desabilitado e diz o motivo, em vez de abrir um pop-up
    // (specs/00-fundacao/consistencia-e-textos/spec.md, D4).
    expect(resetPassword).not.toHaveBeenCalled();
    expect(screen.getByText('Informe seu e-mail.')).toBeTruthy();
  });

  it('confirms account sign-up with the provided e-mail and code', async () => {
    const onConfirmSuccess = jest.fn();

    (confirmSignUp as jest.Mock).mockResolvedValueOnce({});

    render(
      <ConfirmScreen
        email="pessoa@email.com"
        onConfirmSuccess={onConfirmSuccess}
        onBackToLogin={jest.fn()}
      />,
    );

    expect(screen.getByText('Verifique seu e-mail.')).toBeTruthy();
    expect(
      screen.getByText(
        'Verifique seu e-mail. Enviamos um código de 6 dígitos para pessoa@email.com.',
      ),
    ).toBeTruthy();

    '654321'.split('').forEach((digit, index) => {
      fireEvent.changeText(screen.getByLabelText(`Dígito ${index + 1} de 6`), digit);
    });
    fireEvent.press(screen.getByText('Confirmar'));

    await waitFor(() => {
      expect(confirmSignUp).toHaveBeenCalledWith({
        username: 'pessoa@email.com',
        confirmationCode: '654321',
      });
    });

    expect(onConfirmSuccess).toHaveBeenCalledTimes(1);
  });

  it('keeps the confirm button disabled and does not call Amplify while the code is incomplete', () => {
    render(<ConfirmScreen email="pessoa@email.com" onConfirmSuccess={jest.fn()} />);

    const confirmButton = screen.getByText('Confirmar');
    expect(confirmButton.parent?.parent?.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );

    fireEvent.press(confirmButton);

    expect(confirmSignUp).not.toHaveBeenCalled();
  });
});
