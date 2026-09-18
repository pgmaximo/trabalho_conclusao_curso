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
  sendMessageWithSources: jest.fn(),
}));

// `chatHistoryService` puxa `aws-amplify/data`, que e ESM e o jest-expo nao
// carrega. Quem cobre a persistencia e `chatPersistence.test.ts`, e quem cobre
// a gaveta e `gavetaDeHistorico.test.tsx`.
jest.mock('@/services/chatHistoryService', () => ({
  listarConversas: jest.fn().mockResolvedValue([]),
  criarConversa: jest.fn().mockResolvedValue('c-1'),
  salvarTurno: jest.fn().mockResolvedValue(undefined),
  lerMensagens: jest.fn().mockResolvedValue([]),
  apagarConversa: jest.fn().mockResolvedValue(undefined),
}));


// `aws-amplify/storage` e ESM e o jest-expo nao o carrega. Nenhum teste deste
// arquivo anexa nada -- quem cobre o anexo e `anexoNoChat.test.tsx`.
jest.mock('@/services/chatAttachmentService', () => ({ uploadAnexoDoChat: jest.fn() }));

const { sendMessageWithSources: mockSendMessage } = jest.requireMock(
  '@/services/aiAssistantService',
);

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
    // As outras duas sugestoes mudaram nesta EPIC: as antigas pediam
    // explicacao generica e uma acao de escrita, e nenhuma das duas sobrevive
    // as ferramentas somente-leitura. Ver `chatComOrigem.test.tsx`.
    expect(screen.getByText('Como está minha vitamina D comparada ao exame anterior?')).toBeTruthy();
    expect(screen.getByText('Quando é minha próxima consulta?')).toBeTruthy();
  });

  it('has no dismiss control on the disclaimer banner', () => {
    renderChatBotScreen();

    expect(screen.queryByLabelText('Fechar aviso')).toBeNull();
    expect(screen.queryByText('×', { exact: true })).toBeNull();
  });

  it('shows the typing indicator while awaiting a reply and keeps the banner visible', async () => {
    let resolveReply: (value: { text: string; citations: []; ruleCheckStatus: string }) => void =
      () => {};
    mockSendMessage.mockImplementation(
      () =>
        new Promise((resolve) => {
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

    resolveReply({ text: 'Resposta mock.', citations: [], ruleCheckStatus: 'APROVADA' });
    await waitFor(() => expect(screen.getByText('Resposta mock.')).toBeTruthy());
  });

  it('shows a friendly error message and clears the typing state when the service fails', async () => {
    // A mensagem passou a ser a que a propria camada de servico escreveu:
    // ela distingue "sessao expirou" de "indisponivel nesta versao", e uma
    // frase fixa aqui apagaria essa diferenca.
    mockSendMessage.mockRejectedValue(
      new Error('Não consegui responder agora. Tente novamente em instantes.'),
    );

    renderChatBotScreen();

    fireEvent.press(screen.getByText('Quando é minha próxima consulta?'));

    await waitFor(() =>
      expect(
        screen.getByText('Não consegui responder agora. Tente novamente em instantes.'),
      ).toBeTruthy(),
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
