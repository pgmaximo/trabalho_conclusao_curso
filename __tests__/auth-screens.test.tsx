import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { confirmResetPassword, confirmSignUp, resetPassword } from 'aws-amplify/auth';

import { ConfirmScreen } from '@/screens/ConfirmScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';

jest.mock('aws-amplify/auth', () => ({
  confirmResetPassword: jest.fn(),
  confirmSignUp: jest.fn(),
  resetPassword: jest.fn(),
}));

describe('auth support screens', () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

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
    fireEvent.press(view.getByText('Enviar codigo'));

    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith({ username: 'pessoa@email.com' });
    });

    expect(await view.findByText('Defina uma nova senha')).toBeTruthy();

    fireEvent.changeText(view.getByLabelText('Codigo'), '123456');
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

    expect(onBackToLogin).toHaveBeenCalledTimes(1);
  });

  it('validates empty reset e-mail before calling Amplify', () => {
    render(<ForgotPasswordScreen onBackToLogin={jest.fn()} />);

    fireEvent.press(screen.getByText('Enviar codigo'));

    expect(resetPassword).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'Atencao',
      'Digite seu e-mail para recuperar a senha.',
    );
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

    expect(screen.getByText('Verifique seu e-mail')).toBeTruthy();
    expect(screen.getByText('Digite o codigo enviado para pessoa@email.com.')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Codigo de Confirmacao'), '654321');
    fireEvent.press(screen.getByText('Confirmar conta'));

    await waitFor(() => {
      expect(confirmSignUp).toHaveBeenCalledWith({
        username: 'pessoa@email.com',
        confirmationCode: '654321',
      });
    });

    expect(onConfirmSuccess).toHaveBeenCalledTimes(1);
  });

  it('validates empty confirmation code before calling Amplify', () => {
    render(<ConfirmScreen email="pessoa@email.com" onConfirmSuccess={jest.fn()} />);

    fireEvent.press(screen.getByText('Confirmar conta'));

    expect(confirmSignUp).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'Atenção',
      'Por favor, digite o código de confirmação.',
    );
  });
});
