import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ChatBotScreen } from '@/screens/ChatBotScreen';

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('@/services/aiAssistantService', () => ({
  sendMessage: jest.fn(),
}));

const { sendMessage: mockSendMessage } = jest.requireMock('@/services/aiAssistantService');

function renderChatBotScreen() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { bottom: 24, left: 0, right: 0, top: 44 },
      }}
    >
      <ChatBotScreen />
    </SafeAreaProvider>,
  );
}

describe('ChatBotScreen', () => {
  beforeEach(() => {
    mockSendMessage.mockReset();
  });

  it('renders the empty state with the disclaimer banner and the 3 Canvas suggestions', () => {
    renderChatBotScreen();

    expect(screen.getByText('Assistente de IA')).toBeTruthy();
    expect(
      screen.getByText('Apoio informativo — não substitui avaliação médica.'),
    ).toBeTruthy();
    expect(screen.getByText('Como posso ajudar?')).toBeTruthy();
    expect(screen.getByText('Analisar meu último exame')).toBeTruthy();
    expect(screen.getByText('O que significa colesterol alto?')).toBeTruthy();
    expect(screen.getByText('Lembrar de tomar remédio')).toBeTruthy();
  });

  it('has no dismiss control on the disclaimer banner', () => {
    renderChatBotScreen();

    expect(screen.queryByLabelText('Fechar aviso')).toBeNull();
    expect(screen.queryByText('×', { exact: true })).toBeNull();
  });

  it('shows the typing indicator while awaiting a reply and keeps the banner visible', async () => {
    let resolveReply: (value: string) => void = () => {};
    mockSendMessage.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveReply = resolve;
        }),
    );

    renderChatBotScreen();

    fireEvent.press(screen.getByText('Analisar meu último exame'));

    await waitFor(() => {
      expect(screen.getByLabelText('Histórico de conversas')).toBeTruthy();
    });

    expect(
      screen.getByText('Apoio informativo — não substitui avaliação médica.'),
    ).toBeTruthy();

    resolveReply('Resposta mock.');
    await waitFor(() => expect(screen.getByText('Resposta mock.')).toBeTruthy());
  });

  it('shows a friendly error message and clears the typing state when the service fails', async () => {
    mockSendMessage.mockRejectedValue(new Error('network error'));

    renderChatBotScreen();

    fireEvent.press(screen.getByText('Lembrar de tomar remédio'));

    await waitFor(() =>
      expect(screen.getByText('Desculpe, ocorreu um erro. Tente novamente.')).toBeTruthy(),
    );
  });

  it('opens the history drawer with the empty-history copy', () => {
    renderChatBotScreen();

    fireEvent.press(screen.getByLabelText('Histórico de conversas'));

    expect(screen.getByText('Histórico')).toBeTruthy();
    expect(screen.getByText('+ Nova conversa')).toBeTruthy();
    expect(screen.getByText('Nenhuma conversa anterior.')).toBeTruthy();
  });
});
