import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MEDICAL_DOCUMENT_FILTERS } from '@/constants/documentFilters';
import { DocumentProvider } from '@/contexts/DocumentContext';
import { ExamsScreen } from '@/screens/ExamsScreen';

// Pedido do dono do projeto (2026-10-09): tirar o filtro "Alterados · Em breve".
//
// O chip estava desabilitado desde a primeira versao da lista, porque um
// documento nao guardava nada sobre o resultado. Hoje o app le os exames, mas a
// regra 4 proibe marcar um valor como alterado
// (specs/06-ia-leitura-exames/extracao-de-documentos/spec.md, §6). "Em breve"
// era uma promessa que as regras do proprio projeto dizem que nao sera cumprida
// (specs/00-fundacao/correcoes-menores/spec.md, D1).

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

function renderExames() {
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
          filterOptions={MEDICAL_DOCUMENT_FILTERS}
          hasAnyDocuments={false}
          isLoading={false}
          onFilterChange={jest.fn()}
          onRetry={jest.fn()}
          onSearchChange={jest.fn()}
          searchQuery=""
        />
      </DocumentProvider>
    </SafeAreaProvider>,
  );
}

describe('filtros da tela de Exames', () => {
  it('sao tres: Todos, Exames e Receitas', () => {
    expect(MEDICAL_DOCUMENT_FILTERS).toEqual(['Todos', 'Exames', 'Receitas']);
  });

  it('a tela mostra os tres, e nada que diga "Em breve"', () => {
    renderExames();

    for (const filtro of MEDICAL_DOCUMENT_FILTERS) {
      expect(screen.getByText(filtro)).toBeTruthy();
    }
    expect(screen.queryByText(/Alterados/)).toBeNull();
    expect(screen.queryByText(/Em breve/)).toBeNull();
  });
});
