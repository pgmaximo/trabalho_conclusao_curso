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

// `useChatBot` passou a ler a memoria do usuario (D34, M8). Mockado como
// servico, e nao como SDK, seguindo o que este arquivo ja faz com o historico:
// estes testes sao sobre a tela do chat, e a memoria tem suite propria.
jest.mock('@/services/assistantMemoryService', () => ({
  lerInterruptor: jest.fn().mockResolvedValue(true),
  guardarFato: jest.fn().mockResolvedValue({ ok: true }),
}));


// `aws-amplify/storage` e ESM e o jest-expo nao o carrega. Nenhum teste deste
// arquivo anexa nada -- quem cobre o anexo e `anexoNoChat.test.tsx`.
jest.mock('@/services/chatAttachmentService', () => ({ uploadAnexoDoChat: jest.fn() }));

const { sendMessageWithSources: mockSendMessage } = jest.requireMock(
  '@/services/aiAssistantService',
);

function renderChatBotScreen(props: React.ComponentProps<typeof ChatBotScreen> = {}) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { bottom: 24, left: 0, right: 0, top: 44 },
      }}
    >
      <ChatBotScreen {...props} />
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


describe('abrir uma conversa vinda de fora da tela (M11)', () => {
  it('a conversa indicada pela rota e carregada', async () => {
    // O atalho da tela de memoria leva a conversa de ONDE o fato veio. Sem
    // isto ele navegaria para o chat e mostraria outra coisa -- uma origem que
    // promete e nao cumpre, que e pior do que origem nenhuma.
    const { lerMensagens } = require('@/services/chatHistoryService');
    lerMensagens.mockResolvedValue([
      { id: 'm-1', role: 'user', content: 'pergunta antiga', createdAt: null, citations: [] },
      { id: 'm-2', role: 'assistant', content: 'resposta antiga', createdAt: null, citations: [] },
    ]);

    renderChatBotScreen({ conversaInicial: 'c-9' });

    await waitFor(() => expect(lerMensagens).toHaveBeenCalledWith('c-9'));
    expect(await screen.findByText('resposta antiga')).toBeTruthy();
  });

  it('sem conversa indicada, a tela abre nova como antes', async () => {
    const { lerMensagens } = require('@/services/chatHistoryService');
    lerMensagens.mockClear();
    renderChatBotScreen();
    await waitFor(() => expect(lerMensagens).not.toHaveBeenCalled());
  });
});

describe('a recusa de uma proposta de memoria vale para a conversa inteira (M8)', () => {
  async function perguntar(texto: string) {
    fireEvent.changeText(screen.getByPlaceholderText(/digite sua pergunta/i), texto);
    fireEvent.press(screen.getByLabelText('Enviar mensagem'));
  }

  it('depois de "Agora nao", o MESMO fato nao e proposto de novo', async () => {
    // Repetir um pedido de consentimento ja recusado e insistir, e insistencia
    // e o que transforma o consentimento do art. 11, I em ruido clicado sem
    // ler. A spec afirmava isto e so metade tinha teste.
    const proposta = { texto: 'Prefiro respostas curtas', tipo: 'PREFERENCIA_DE_RESPOSTA' };
    mockSendMessage.mockResolvedValue({
      text: 'Certo.',
      citations: [],
      ruleCheckStatus: 'APROVADA',
      memoriaProposta: proposta,
    });

    renderChatBotScreen();

    await perguntar('pode responder mais curto?');
    fireEvent.press(await screen.findByText('Agora não'));
    expect(screen.queryByText('Agora não')).toBeNull();

    // O modelo propoe o MESMO fato de novo no turno seguinte.
    await perguntar('e minha consulta?');
    await waitFor(() => expect(mockSendMessage).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Agora não')).toBeNull();
  });

  it('um fato DIFERENTE continua sendo proposto', async () => {
    // A recusa e daquele fato, e nao da memoria inteira -- desligar a memoria e
    // outra coisa, e tem interruptor proprio.
    mockSendMessage
      .mockResolvedValueOnce({
        text: 'Certo.',
        citations: [],
        ruleCheckStatus: 'APROVADA',
        memoriaProposta: { texto: 'Prefiro respostas curtas', tipo: 'PREFERENCIA_DE_RESPOSTA' },
      })
      .mockResolvedValueOnce({
        text: 'Anotado.',
        citations: [],
        ruleCheckStatus: 'APROVADA',
        memoriaProposta: { texto: 'Trabalho de madrugada', tipo: 'ROTINA' },
      });

    renderChatBotScreen();

    await perguntar('pode responder mais curto?');
    fireEvent.press(await screen.findByText('Agora não'));

    await perguntar('trabalho a noite');
    expect(await screen.findByText(/Trabalho de madrugada/)).toBeTruthy();
  });
});
