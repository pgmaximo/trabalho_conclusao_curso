import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DocumentProvider } from '@/contexts/DocumentContext';
import { ExamsScreen } from '@/screens/ExamsScreen';

// Pedido do dono do projeto (2026-10-09): levar o botao de adicionar para o
// rodape da pagina. Ele flutuava 100dp acima da barra de abas.
//
// A causa: o Canvas 3a posiciona o botao a `bottom:100px` da MOLDURA do
// celular, que inclui a barra de abas (64px) e a faixa do indicador (22px) --
// ou seja, uns 14px acima da barra. No app a tela termina no topo da barra,
// entao os mesmos 100 punham o botao 100dp acima dela.

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

function renderExams(props: Partial<React.ComponentProps<typeof ExamsScreen>> = {}) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { bottom: 24, left: 0, right: 0, top: 44 },
      }}
    >
      <DocumentProvider>
        <ExamsScreen
          activeFilter="Todos"
          documents={[]}
          errorMessage={null}
          filterOptions={['Todos', 'Exames', 'Receitas', 'Alterados']}
          hasAnyDocuments={false}
          isLoading={false}
          onFilterChange={jest.fn()}
          onRetry={jest.fn()}
          onSearchChange={jest.fn()}
          searchQuery=""
          {...props}
        />
      </DocumentProvider>
    </SafeAreaProvider>,
  );
}

function estiloDoBotao() {
  return StyleSheet.flatten(screen.getByRole('button', { name: 'Adicionar documento' }).props.style);
}

describe('Exames - botao de adicionar', () => {
  it('fica no rodape da pagina, logo acima da barra de abas', () => {
    renderExams();

    const estilo = estiloDoBotao();
    expect(estilo.position).toBe('absolute');
    expect(estilo.bottom).toBeLessThanOrEqual(24);
    expect(estilo.bottom).toBeGreaterThanOrEqual(12);
  });

  it('continua sendo o botao redondo de 56dp, a direita', () => {
    renderExams();

    expect(estiloDoBotao()).toMatchObject({ width: 56, height: 56, borderRadius: 28, right: 20 });
  });

  it('continua abrindo as opcoes de envio', () => {
    renderExams();

    fireEvent.press(screen.getByRole('button', { name: 'Adicionar documento' }));

    expect(screen.getByText('Enviar PDF ou imagem')).toBeTruthy();
    expect(screen.getByText('Capturar com câmera')).toBeTruthy();
  });
});
