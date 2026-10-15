import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppShell } from '@/components/AppShell';
import { AvisoDeSucesso } from '@/components/AvisoDeSucesso';
import { avisarSucesso, dispensarAviso } from '@/hooks/avisoDeSucesso';

// Salvar um compromisso, um documento, um medicamento ou uma vacina fechava o
// formulario e pronto: a unica confirmacao era a tela ter mudado. So a edicao
// de um documento dizia "salvo"
// (specs/00-fundacao/consistencia-e-textos/spec.md, D5).
//
// O formulario fecha ao salvar, entao quem confirma e a tela para onde a
// pessoa volta. O aviso fica fora do React para atravessar a navegacao.

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  Slot: () => null,
  usePathname: () => '/dashboard',
}));

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

beforeEach(() => {
  jest.useFakeTimers();
  act(() => dispensarAviso());
});

afterEach(() => {
  jest.useRealTimers();
});

describe('aviso de sucesso', () => {
  it('nao mostra nada enquanto ninguem avisou', () => {
    render(<AvisoDeSucesso />);

    expect(screen.queryByTestId('success-snackbar')).toBeNull();
  });

  it('mostra a mensagem de quem salvou, mesmo avisada antes de a tela existir', () => {
    // E o caso real: o formulario avisa e so entao navega para a lista.
    avisarSucesso('Compromisso salvo.');

    render(<AvisoDeSucesso />);

    expect(screen.getByText('Compromisso salvo.')).toBeTruthy();
  });

  it('some sozinho depois de 4 segundos', () => {
    render(<AvisoDeSucesso />);
    act(() => avisarSucesso('Documento salvo.'));
    expect(screen.getByText('Documento salvo.')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(screen.queryByText('Documento salvo.')).toBeNull();
  });

  it('um aviso novo troca o anterior e recomeca a contagem', () => {
    render(<AvisoDeSucesso />);
    act(() => avisarSucesso('Medicamento salvo.'));
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    act(() => avisarSucesso('Medicamento excluído.'));
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // 6 segundos depois do primeiro, 3 depois do segundo: o segundo continua.
    expect(screen.queryByText('Medicamento salvo.')).toBeNull();
    expect(screen.getByText('Medicamento excluído.')).toBeTruthy();
  });

  it('a mesma mensagem duas vezes seguidas aparece de novo', () => {
    render(<AvisoDeSucesso />);
    act(() => avisarSucesso('Vacina salva.'));
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(screen.queryByText('Vacina salva.')).toBeNull();

    act(() => avisarSucesso('Vacina salva.'));

    expect(screen.getByText('Vacina salva.')).toBeTruthy();
  });

  it('aparece dentro do app, acima da barra de abas', () => {
    render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { height: 844, width: 390, x: 0, y: 0 },
          insets: { bottom: 24, left: 0, right: 0, top: 44 },
        }}
      >
        <AppShell />
      </SafeAreaProvider>,
    );

    act(() => avisarSucesso('Perfil atualizado.'));

    expect(screen.getByText('Perfil atualizado.')).toBeTruthy();
  });
});
