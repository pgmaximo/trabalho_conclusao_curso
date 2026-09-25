/**
 * A segunda porta da tela de evolucao por analito.
 *
 * Ate aqui ela tinha UMA entrada: abrir um documento e tocar numa linha de
 * resultado. Quem nao soubesse que aquela linha era tocavel nao encontrava a
 * EPIC inteira. A spec da serie ja previa a entrada sem analito escolhido -- o
 * seletor existe justamente para isso --, mas o caminho nunca foi construido.
 */
jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { DocumentProvider } from '@/contexts/DocumentContext';
import { ExamsScreen } from '@/screens/ExamsScreen';

type Props = React.ComponentProps<typeof ExamsScreen>;

function props(over: Partial<Props> = {}): Props {
  return {
    filterOptions: ['Todos'],
    searchQuery: '',
    activeFilter: 'Todos',
    documents: [],
    hasAnyDocuments: true,
    isLoading: false,
    errorMessage: null,
    onRetry: jest.fn(),
    onSearchChange: jest.fn(),
    onFilterChange: jest.fn(),
    ...over,
  } as Props;
}

function renderTela(over: Partial<Props> = {}) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { bottom: 24, left: 0, right: 0, top: 44 },
      }}
    >
      <DocumentProvider>
        <ExamsScreen {...props(over)} />
      </DocumentProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => (router.push as jest.Mock).mockReset());

describe('a entrada para a evolucao, a partir da lista de exames', () => {
  it('existe e leva a tela de evolucao SEM analito escolhido', () => {
    // Sem codigo na rota, a tela abre no resultado com mais historico e mostra
    // o seletor -- que e o comportamento que a spec desenhou para esta porta.
    renderTela();
    fireEvent.press(screen.getByLabelText(/evolução dos seus resultados/i));
    expect(router.push).toHaveBeenCalledWith('/analyte-series');
  });

  it('NAO aparece quando a pessoa ainda nao tem documento nenhum', () => {
    // Oferecer a comparacao a quem nao tem o que comparar e mandar a pessoa
    // para uma tela vazia. A porta so faz sentido depois do primeiro exame.
    renderTela({ hasAnyDocuments: false });
    expect(screen.queryByLabelText(/evolução dos seus resultados/i)).toBeNull();
  });

  it('a copy da porta nao promete leitura do resultado', () => {
    // "Ver se melhorou" seria interpretacao clinica na propria porta de
    // entrada, antes mesmo de a tela abrir.
    renderTela();
    // `props` inteiro nao serializa: o Pressable carrega uma referencia
    // circular do Provider da area segura. O que interessa aqui e a copy, e
    // ela sao o rotulo e o texto do botao.
    const botao = screen.getByLabelText(/evolução dos seus resultados/i);
    const rotulo = String(botao.props.accessibilityLabel ?? '');
    const visivel = screen.getByText('Evolução').props.children as string;
    expect(`${rotulo} ${visivel}`.toLowerCase()).not.toMatch(/melhor|pior|alterado|normal/);
  });
});
