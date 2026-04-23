import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { ProfileSetupScreen } from '@/screens/ProfileSetupScreen';

describe('ProfileSetupScreen', () => {
  it('mantem o usuario na tela quando o perfil esta invalido', async () => {
    const onComplete = jest.fn();
    const { getByText, getByLabelText } = render(
      <ProfileSetupScreen onBack={() => {}} onComplete={onComplete} />
    );

    fireEvent.changeText(getByLabelText('Nome completo'), 'Jo');
    fireEvent.changeText(getByLabelText('Data de nascimento'), '01011990');
    fireEvent.changeText(getByLabelText('Sexo biológico'), 'M');
    fireEvent.changeText(getByLabelText('Peso (kg)'), 'abc');
    fireEvent.changeText(getByLabelText('Altura (cm)'), '');
    fireEvent.changeText(getByLabelText('Doenças crônicas'), '');
    fireEvent.changeText(getByLabelText('Medicamentos em uso atual'), '');
    fireEvent.changeText(getByLabelText('Alergias conhecidas'), '');

    fireEvent.press(getByText('Próxima etapa →'));

    await waitFor(() => {
      expect(onComplete).not.toHaveBeenCalled();
    });

    expect(getByText('Informe o nome completo.')).toBeTruthy();
    expect(getByText('Use o formato DD/MM/AAAA.')).toBeTruthy();
    expect(getByText('Este campo e obrigatorio.')).toBeTruthy();
    expect(getByText('Informe um peso valido.')).toBeTruthy();
    expect(getByText('Informe uma altura valida.')).toBeTruthy();
  });
});
