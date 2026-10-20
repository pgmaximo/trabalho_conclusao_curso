/**
 * Resumo do arquivo:
 * A acao proposta na tela do chat (E11). O que se prova: um cartao por vez,
 * abaixo da conversa; "Abrir formulario" so navega, com os campos como
 * parametros; "Agora nao" nao deixa a mesma proposta voltar nesta conversa; e
 * NADA e gravado entre a resposta e o toque em Salvar no formulario (CA-15).
 */
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

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

jest.mock('@/services/aiAssistantService', () => ({ sendMessageWithSources: jest.fn() }));

// Mesmos recortes de `chatbot-screen.test.tsx`: os servicos que puxam ESM do
// Amplify sao mockados como servico, e cada um tem suite propria.
jest.mock('@/services/chatHistoryService', () => ({
  listarConversas: jest.fn().mockResolvedValue([]),
  criarConversa: jest.fn().mockResolvedValue('c-1'),
  salvarTurno: jest.fn().mockResolvedValue(undefined),
  lerMensagens: jest.fn().mockResolvedValue([]),
  apagarConversa: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/services/assistantMemoryService', () => ({
  lerInterruptor: jest.fn().mockResolvedValue(true),
  guardarFato: jest.fn().mockResolvedValue({ ok: true }),
}));
jest.mock('@/services/chatAttachmentService', () => ({ uploadAnexoDoChat: jest.fn() }));

// Os servicos de gravacao sao vigiados: o chat nao pode chamar nenhum deles.
jest.mock('@/services/appointmentService', () => ({ createAppointment: jest.fn() }));
jest.mock('@/services/medicineService', () => ({ createMedicine: jest.fn() }));

const { router } = jest.requireMock('expo-router');
const { sendMessageWithSources: mockSend } = jest.requireMock('@/services/aiAssistantService');
const { salvarTurno } = jest.requireMock('@/services/chatHistoryService');
const { createAppointment } = jest.requireMock('@/services/appointmentService');
const { createMedicine } = jest.requireMock('@/services/medicineService');

const ACAO = {
  tipo: 'ABRIR_NOVO_AGENDAMENTO',
  campos: { appointmentName: 'retorno', scheduledDate: '2026-10-30', scheduledTime: '14:00' },
};
const OUTRA = { tipo: 'ABRIR_NOVO_LEMBRETE', campos: { name: 'vitamina d', times: ['08:00'] } };

function resposta(acaoProposta?: unknown) {
  return { text: 'Preparei o formulário para você conferir e salvar.', citations: [], ruleCheckStatus: 'APROVADA', acaoProposta };
}

function renderChat() {
  return render(
    <SafeAreaProvider
      initialMetrics={{ frame: { height: 844, width: 390, x: 0, y: 0 }, insets: { bottom: 24, left: 0, right: 0, top: 44 } }}
    >
      <ChatBotScreen />
    </SafeAreaProvider>,
  );
}

async function perguntar(texto: string) {
  fireEvent.changeText(screen.getByPlaceholderText(/digite sua pergunta/i), texto);
  fireEvent.press(screen.getByLabelText('Enviar mensagem'));
  await waitFor(() => expect(salvarTurno).toHaveBeenCalled());
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('a acao proposta no chat (E11)', () => {
  it('mostra um cartao, e so um', async () => {
    mockSend.mockResolvedValue(resposta(ACAO));
    renderChat();

    await perguntar('marca retorno dia 30 as 14h');

    expect(await screen.findByText('Novo compromisso')).toBeTruthy();
    expect(screen.getAllByLabelText('Abrir formulário')).toHaveLength(1);
  });

  it('abrir so navega, com os campos como parametros, e o cartao some', async () => {
    mockSend.mockResolvedValue(resposta(ACAO));
    renderChat();
    await perguntar('marca retorno dia 30 as 14h');

    fireEvent.press(await screen.findByLabelText('Abrir formulário'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/add-appointment',
      params: { tipo: 'ABRIR_NOVO_AGENDAMENTO', appointmentName: 'retorno', scheduledDate: '2026-10-30', scheduledTime: '14:00' },
    });
    expect(screen.queryByText('Novo compromisso')).toBeNull();
    expect(createAppointment).not.toHaveBeenCalled();
    expect(createMedicine).not.toHaveBeenCalled();
  });

  it('recusada, a mesma acao nao volta; outra acao volta', async () => {
    mockSend.mockResolvedValue(resposta(ACAO));
    renderChat();
    await perguntar('marca retorno dia 30 as 14h');

    fireEvent.press(await screen.findByLabelText('Agora não'));
    expect(screen.queryByText('Novo compromisso')).toBeNull();

    salvarTurno.mockClear();
    await perguntar('marca retorno dia 30 as 14h');
    expect(screen.queryByText('Novo compromisso')).toBeNull();

    mockSend.mockResolvedValue(resposta(OUTRA));
    salvarTurno.mockClear();
    await perguntar('me lembra da vitamina d as 8h');
    expect(await screen.findByText('Novo lembrete de remédio')).toBeTruthy();
  });

  it('a resposta seguinte sem acao tira o cartao anterior', async () => {
    mockSend.mockResolvedValue(resposta(ACAO));
    renderChat();
    await perguntar('marca retorno dia 30 as 14h');
    expect(await screen.findByText('Novo compromisso')).toBeTruthy();

    mockSend.mockResolvedValue(resposta());
    salvarTurno.mockClear();
    await perguntar('obrigado');

    expect(screen.queryByText('Novo compromisso')).toBeNull();
  });

  it('o cartao nao vai para o historico da conversa', async () => {
    mockSend.mockResolvedValue(resposta(ACAO));
    renderChat();
    await perguntar('marca retorno dia 30 as 14h');

    const [, turno] = salvarTurno.mock.calls[0];
    expect(JSON.stringify(turno)).not.toMatch(/acao|ABRIR_NOVO/i);
  });

  // Revisao do E11, achado 3: o cartao abre um formulario preenchido. Deixado
  // na tela depois de trocar de conversa, ele levaria dado de uma conversa
  // que a pessoa nem esta vendo.
  it('nova conversa tira o cartao, e a recusa da conversa anterior nao vale mais', async () => {
    mockSend.mockResolvedValue(resposta(ACAO));
    renderChat();
    await perguntar('marca retorno dia 30 as 14h');
    fireEvent.press(await screen.findByLabelText('Agora não'));

    // a mesma acao, recusada, nao volta nesta conversa
    salvarTurno.mockClear();
    await perguntar('marca retorno dia 30 as 14h');
    expect(screen.queryByText('Novo compromisso')).toBeNull();

    fireEvent.press(screen.getByLabelText('Histórico de conversas'));
    fireEvent.press(await screen.findByLabelText('Nova conversa'));

    salvarTurno.mockClear();
    await perguntar('marca retorno dia 30 as 14h');
    expect(await screen.findByText('Novo compromisso')).toBeTruthy();
  });

  it('nova conversa tira o cartao que estava na tela', async () => {
    mockSend.mockResolvedValue(resposta(ACAO));
    renderChat();
    await perguntar('marca retorno dia 30 as 14h');
    expect(await screen.findByText('Novo compromisso')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Histórico de conversas'));
    fireEvent.press(await screen.findByLabelText('Nova conversa'));

    expect(screen.queryByText('Novo compromisso')).toBeNull();
  });

  // Revisao do E11 (menor): se a pergunta seguinte falha, o cartao da resposta
  // anterior nao pode ficar embaixo da mensagem de erro, como se viesse dela.
  it('envio que falha tira o cartao anterior', async () => {
    mockSend.mockResolvedValueOnce(resposta(ACAO));
    renderChat();
    await perguntar('marca retorno dia 30 as 14h');
    expect(await screen.findByText('Novo compromisso')).toBeTruthy();

    mockSend.mockRejectedValueOnce(new Error('Não consegui responder agora. Tente novamente em instantes.'));
    fireEvent.changeText(screen.getByPlaceholderText(/digite sua pergunta/i), 'e o endereco?');
    fireEvent.press(screen.getByLabelText('Enviar mensagem'));

    expect(await screen.findByText('Não consegui responder agora. Tente novamente em instantes.')).toBeTruthy();
    expect(screen.queryByText('Novo compromisso')).toBeNull();
  });
});
