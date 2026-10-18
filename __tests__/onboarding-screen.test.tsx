import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ACEITES_DO_CADASTRO, VERSAO_DOS_TERMOS } from '@/data/termosEPrivacidade';
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
      <OnboardingScreen onBack={jest.fn()} onComplete={jest.fn()} onOpenTerms={jest.fn()} {...props} />
    </SafeAreaProvider>,
  );
}

/** Preenche o obrigatório e avança até a etapa de revisão. */
async function irAteARevisao() {
  fireEvent.changeText(screen.getByLabelText('Nome Completo'), 'Maria Silva');
  fireEvent.changeText(screen.getByLabelText('Data de nascimento'), '06052000');
  fireEvent.press(screen.getByText('Continuar'));
  await waitFor(() => expect(screen.getByText('Histórico clínico')).toBeTruthy());
  fireEvent.press(screen.getByText('Continuar'));
  await waitFor(() => expect(screen.getByText('Consome bebida alcoólica?')).toBeTruthy());
  fireEvent.press(screen.getByText('Continuar'));
  await waitFor(() =>
    expect(
      screen.getByText('Confira antes de concluir. Você pode editar depois no seu Perfil.'),
    ).toBeTruthy(),
  );
}

function marcarAceites(ids: string[] = ACEITES_DO_CADASTRO.map((aceite) => aceite.id)) {
  for (const aceite of ACEITES_DO_CADASTRO) {
    if (ids.includes(aceite.id)) {
      fireEvent.press(screen.getByLabelText(aceite.texto));
    }
  }
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
    expect(screen.getByText('Outro')).toBeTruthy();
    expect(screen.queryByText('Você está grávida?')).toBeNull();
    expect(screen.getByText('Altura (cm)')).toBeTruthy();
    expect(screen.getByText('Peso (kg)')).toBeTruthy();
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
    expect(screen.getByLabelText('Sexo biológico: Outro').props.accessibilityState).toEqual({
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
      expect(screen.getByText('Consome bebida alcoólica?')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Continuar'));

    await waitFor(() => {
      expect(
        screen.getByText('Confira antes de concluir. Você pode editar depois no seu Perfil.'),
      ).toBeTruthy();
    });

    marcarAceites();
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

    expect(await screen.findByText('Informe seu nome completo.')).toBeTruthy();
    expect(await screen.findByText('Informe sua data de nascimento.')).toBeTruthy();
    expect(screen.getByText('Pessoais')).toBeTruthy();
  });

  it('keeps blocking progression when only the full name is missing', async () => {
    renderOnboardingScreen();

    fireEvent.changeText(screen.getByLabelText('Data de nascimento'), '06052000');
    fireEvent.press(screen.getByText('Continuar'));

    expect(await screen.findByText('Informe seu nome completo.')).toBeTruthy();
    expect(screen.getByText('Pessoais')).toBeTruthy();
  });

  it('accepts height directly in whole centimeters while typing', () => {
    renderOnboardingScreen();

    fireEvent.changeText(screen.getByLabelText('Altura (cm)'), '165');

    expect(screen.getByLabelText('Altura (cm)').props.value).toBe('165');
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

describe('OnboardingScreen: aceite dos termos', () => {
  it('as tres caixas comecam desmarcadas -- consentimento nao e pre-marcado', async () => {
    renderOnboardingScreen();
    await irAteARevisao();

    for (const aceite of ACEITES_DO_CADASTRO) {
      expect(screen.getByLabelText(aceite.texto).props.accessibilityState).toEqual({
        checked: false,
      });
    }
  });

  it('nao conclui sem as tres caixas, e diz por que', async () => {
    const onComplete = jest.fn();
    renderOnboardingScreen({ onComplete });
    await irAteARevisao();

    // Duas de tres nao bastam: cada consentimento e especifico.
    marcarAceites(['termos', 'dadosDeSaude']);
    fireEvent.press(screen.getByLabelText('Concluir perfil'));

    expect(screen.getByText('Marque as três autorizações dos termos para concluir.')).toBeTruthy();
    expect(screen.getByLabelText('Concluir perfil').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    await waitFor(() => expect(onComplete).not.toHaveBeenCalled());
  });

  it('com as tres caixas, conclui e entrega a prova do aceite (versao e hora)', async () => {
    const onComplete = jest.fn();
    renderOnboardingScreen({ onComplete });
    await irAteARevisao();

    marcarAceites();
    expect(screen.queryByText('Marque as três autorizações dos termos para concluir.')).toBeNull();
    fireEvent.press(screen.getByLabelText('Concluir perfil'));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const aceite = onComplete.mock.calls[0][1];
    expect(aceite.versao).toBe(VERSAO_DOS_TERMOS);
    expect(Number.isNaN(Date.parse(aceite.aceitoEm))).toBe(false);
  });

  it('desmarcar uma caixa volta a bloquear', async () => {
    renderOnboardingScreen();
    await irAteARevisao();

    marcarAceites();
    marcarAceites(['transferenciaInternacional']);

    expect(screen.getByText('Marque as três autorizações dos termos para concluir.')).toBeTruthy();
  });

  it('o texto integral fica a um toque, sem sair do cadastro', async () => {
    const onOpenTerms = jest.fn();
    renderOnboardingScreen({ onOpenTerms });
    await irAteARevisao();

    fireEvent.press(screen.getByText('Ler os Termos de Uso e a Política de Privacidade'));

    expect(onOpenTerms).toHaveBeenCalledTimes(1);
  });
});
