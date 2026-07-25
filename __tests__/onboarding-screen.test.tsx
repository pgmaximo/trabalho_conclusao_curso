import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OnboardingScreen } from '@/screens/OnboardingScreen';

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

function renderOnboardingScreen(props?: Partial<React.ComponentProps<typeof OnboardingScreen>>) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { bottom: 24, left: 0, right: 0, top: 44 },
      }}
    >
      <OnboardingScreen onBack={jest.fn()} onComplete={jest.fn()} {...props} />
    </SafeAreaProvider>,
  );
}

describe('OnboardingScreen', () => {
  it('renders the first health profile step with the requested composition', () => {
    renderOnboardingScreen();

    expect(screen.getByText('Perfil de Saúde')).toBeTruthy();
    expect(
      screen.getByText('Conte-nos sobre você para personalizar suas recomendações de prevenção.'),
    ).toBeTruthy();
    expect(screen.getByText('Pessoais')).toBeTruthy();
    expect(screen.getByText('Etapa 1 de 4')).toBeTruthy();
    expect(screen.getByText('Nome Completo')).toBeTruthy();
    expect(screen.getByText('Data de nascimento')).toBeTruthy();
    expect(screen.getByText('Sexo biológico')).toBeTruthy();
    expect(screen.getByText('Feminino')).toBeTruthy();
    expect(screen.getByText('Masculino')).toBeTruthy();
    expect(screen.getByText('Desejo não informar')).toBeTruthy();
    expect(screen.queryByText('Você está grávida?')).toBeNull();
    expect(screen.getByText('m')).toBeTruthy();
    expect(screen.getByText('kg')).toBeTruthy();
    expect(screen.queryByLabelText('Voltar etapa')).toBeNull();
    expect(screen.getByLabelText('Continuar para próxima etapa')).toBeTruthy();
  });

  it('starts without a selected biological sex option', () => {
    renderOnboardingScreen();

    expect(screen.getByLabelText('Sexo biológico: Feminino').props.accessibilityState).toEqual({
      selected: false,
    });
    expect(screen.getByLabelText('Sexo biológico: Masculino').props.accessibilityState).toEqual({
      selected: false,
    });
    expect(screen.getByLabelText('Sexo biológico: Desejo não informar').props.accessibilityState).toEqual({
      selected: false,
    });
    expect(
      screen.getByText(
        'Suas informações são seguras e nos ajudam a preparar recomendações de prevenção mais relevantes para você no futuro.',
      ),
    ).toBeTruthy();
  });

  it('lets biological sex stay unselected and lets optional fields stay empty', async () => {
    const onComplete = jest.fn();

    renderOnboardingScreen({ onComplete });

    fireEvent.changeText(screen.getByLabelText('Nome Completo'), 'Maria Silva');
    fireEvent.changeText(screen.getByLabelText('Data de nascimento'), '06052000');
    fireEvent.press(screen.getByText('Continuar'));

    await waitFor(() => {
      expect(screen.getByText('Histórico clínico')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Continuar'));

    await waitFor(() => {
      expect(screen.getByText('Hábitos de vida')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Continuar'));

    await waitFor(() => {
      expect(
        screen.getByText('Confira as respostas principais antes de concluir o Perfil de Saúde.'),
      ).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Concluir perfil'));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    expect(onComplete.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        fullName: 'Maria Silva',
        birthDate: '06/05/2000',
        biologicalSex: '',
        pregnancyStatus: 'unknown',
        tobaccoUse: 'unknown',
        sexuallyActive: 'unknown',
      }),
    );
  });

  it('shows pregnancy question only when female is selected', () => {
    renderOnboardingScreen();

    expect(screen.queryByText('Você está grávida?')).toBeNull();

    fireEvent.press(screen.getByText('Feminino'));

    expect(screen.getByText('Você está grávida?')).toBeTruthy();

    fireEvent.press(screen.getByText('Masculino'));

    expect(screen.queryByText('Você está grávida?')).toBeNull();
  });

  it('blocks progression until required personal fields are filled', async () => {
    renderOnboardingScreen();

    fireEvent.press(screen.getByText('Continuar'));

    expect(await screen.findByText('Nome completo e obrigatorio')).toBeTruthy();
    expect(await screen.findByText('Data de nascimento e obrigatoria')).toBeTruthy();
    expect(screen.getByText('Pessoais')).toBeTruthy();
  });

  it('keeps blocking progression when only the full name is missing', async () => {
    renderOnboardingScreen();

    fireEvent.changeText(screen.getByLabelText('Data de nascimento'), '06052000');
    fireEvent.press(screen.getByText('Continuar'));

    expect(await screen.findByText('Nome completo e obrigatorio')).toBeTruthy();
    expect(screen.getByText('Pessoais')).toBeTruthy();
  });

  it('formats height with a decimal comma while typing', () => {
    renderOnboardingScreen();

    fireEvent.changeText(screen.getByLabelText('Altura'), '165');

    expect(screen.getByLabelText('Altura').props.value).toBe('1,65');
  });

  it('hides the header back arrow on the first step and shows it after advancing', async () => {
    renderOnboardingScreen();

    expect(screen.queryByLabelText('Voltar')).toBeNull();

    fireEvent.changeText(screen.getByLabelText('Nome Completo'), 'Maria Silva');
    fireEvent.changeText(screen.getByLabelText('Data de nascimento'), '06052000');
    fireEvent.press(screen.getByLabelText('Continuar para próxima etapa'));

    await waitFor(() => {
      expect(screen.getByText('Histórico clínico')).toBeTruthy();
    });

    expect(screen.getByLabelText('Voltar')).toBeTruthy();
  });

  it('shows the footer back button only after leaving the first step', async () => {
    renderOnboardingScreen();

    expect(screen.queryByLabelText('Voltar etapa')).toBeNull();

    fireEvent.changeText(screen.getByLabelText('Nome Completo'), 'Maria Silva');
    fireEvent.changeText(screen.getByLabelText('Data de nascimento'), '06052000');
    fireEvent.press(screen.getByLabelText('Continuar para próxima etapa'));

    await waitFor(() => {
      expect(screen.getByText('Histórico clínico')).toBeTruthy();
    });

    expect(screen.getByLabelText('Voltar etapa')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Voltar etapa'));

    await waitFor(() => {
      expect(screen.getByText('Pessoais')).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.queryByLabelText('Voltar etapa')).toBeNull();
    });
  });
});
