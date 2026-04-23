import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { HomeScreen } from '@/screens/HomeScreen';

describe('HomeScreen', () => {
  it('bloqueia envio quando os dados do formulario sao invalidos', async () => {
    const onLogin = jest.fn();
    const { getByText, getByLabelText } = render(
      <HomeScreen onNavigateToRegister={() => {}} onLogin={onLogin} />
    );

    fireEvent.changeText(getByLabelText('E-mail'), 'email-invalido');
    fireEvent.changeText(getByLabelText('Senha'), '123');
    fireEvent.press(getByText('Entrar'));

    await waitFor(() => {
      expect(onLogin).not.toHaveBeenCalled();
    });

    expect(getByText('Informe um e-mail valido.')).toBeTruthy();
    expect(getByText('A senha deve ter pelo menos 8 caracteres.')).toBeTruthy();
  });
});
