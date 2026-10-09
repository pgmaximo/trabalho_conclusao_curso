import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AddAppointmentScreen } from '@/screens/AddAppointmentScreen';

// O formulario abria sem nenhum tipo marcado, e o tipo nao era obrigatorio:
// quem nao tocava num dos tres tinha o compromisso salvo como "Consulta" sem
// ver isso em lugar nenhum. Um exame marcado assim aparecia na Agenda com o
// selo e a cor de consulta. Agora "Consulta" ja vem marcado: o que a tela
// mostra e o que sera salvo
// (specs/00-fundacao/correcoes-menores/spec.md, D3).

jest.mock('aws-amplify/auth', () => ({ fetchAuthSession: jest.fn(), getCurrentUser: jest.fn() }));
jest.mock('aws-amplify/data', () => ({ generateClient: jest.fn(() => ({})) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

function tipo(nome: string) {
  return screen.getByRole('button', { name: `Tipo: ${nome}` });
}

function estaMarcado(nome: string): boolean {
  return tipo(nome).props.accessibilityState?.selected === true;
}

function renderFormulario() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { bottom: 24, left: 0, right: 0, top: 44 },
      }}
    >
      <AddAppointmentScreen />
    </SafeAreaProvider>,
  );
}

describe('Novo compromisso - tipo', () => {
  it('abre com "Consulta" marcado, e so ele', () => {
    renderFormulario();

    expect(estaMarcado('Consulta')).toBe(true);
    expect(estaMarcado('Exame')).toBe(false);
    expect(estaMarcado('Cirurgia')).toBe(false);
  });

  it('tocar em outro tipo troca a marca', () => {
    renderFormulario();

    fireEvent.press(tipo('Exame'));

    expect(estaMarcado('Exame')).toBe(true);
    expect(estaMarcado('Consulta')).toBe(false);
  });
});
