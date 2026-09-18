/**
 * O anexo pontual (D15). A diferenca que este arquivo protege e de produto,
 * nao de codigo: "me explica este papel aqui" e "quero que este exame faca
 * parte do meu historico" sao dois pedidos diferentes, e so o segundo grava.
 *
 * As duas portas continuam existindo, e o botao que leva a `/add-exam` nao
 * some.
 */
jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/services/aiAssistantService', () => ({ sendMessageWithSources: jest.fn() }));

const mockPick = jest.fn();
jest.mock('expo-document-picker', () => ({ getDocumentAsync: () => mockPick() }));

const mockUploadAnexo = jest.fn();
jest.mock('@/services/chatAttachmentService', () => ({
  uploadAnexoDoChat: (...a: unknown[]) => mockUploadAnexo(...a),
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


import { readFileSync, readdirSync } from 'node:fs';

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ChatBotScreen } from '@/screens/ChatBotScreen';

const DIR_FUNCAO = 'amplify/functions/chat-assistant';

function renderTela() {
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

/** Todos os arquivos de codigo da funcao do chat, sem os testes. */
function fontesDaFuncao(dir = DIR_FUNCAO): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) return e.name === '__tests__' ? [] : fontesDaFuncao(`${dir}/${e.name}`);
    return e.name.endsWith('.ts') ? [`${dir}/${e.name}`] : [];
  });
}

beforeEach(() => {
  mockPick.mockReset();
  mockUploadAnexo.mockReset();
  (router.push as jest.Mock).mockReset();
});

describe('a funcao, com anexo', () => {
  it('REUSA o OCR da Fase 1, sem uma segunda implementacao', () => {
    // Uma segunda implementacao de OCR divergiria da primeira em silencio, e
    // a divergencia apareceria como "o mesmo papel lido de dois jeitos".
    const fonte = readFileSync(`${DIR_FUNCAO}/anexoPontual.ts`, 'utf8');
    expect(fonte).toMatch(/extract-document-data\/textractClient/);
  });

  it('NADA da funcao do chat grava em tabela nenhuma', () => {
    // A verificacao vale para a funcao INTEIRA, e nao so para as tools: o
    // anexo passa pelo handler, e o handler tambem nao pode gravar.
    for (const arquivo of fontesDaFuncao()) {
      const fonte = readFileSync(arquivo, 'utf8');
      expect(fonte).not.toMatch(
        /PutCommand|UpdateCommand|DeleteCommand|BatchWriteCommand|TransactWriteCommand/,
      );
    }
  });

  it('a funcao do chat nao menciona LabResult nem MedicalDocument como escrita', () => {
    // O anexo nao vira linha de exame nem documento do historico (D15).
    for (const arquivo of fontesDaFuncao()) {
      const fonte = readFileSync(arquivo, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      expect(fonte).not.toMatch(/createLabResult|createMedicalDocument|PrescriptionItem/);
    }
  });
});

describe('a tela, com anexo', () => {
  async function anexa() {
    mockPick.mockResolvedValue({
      canceled: false,
      assets: [{ name: 'hemograma.pdf', uri: 'file:///hemograma.pdf', size: 1000 }],
    });
    mockUploadAnexo.mockResolvedValue({
      key: 'chat-attachments/u/1234-ab.pdf',
      fileName: 'hemograma.pdf',
    });
    renderTela();
    fireEvent.press(screen.getByLabelText('Anexar exame'));
    await waitFor(() => expect(mockUploadAnexo).toHaveBeenCalled());
  }

  it('diz, em uma linha, que o anexo NAO foi registrado', async () => {
    await anexa();
    expect(screen.getByText(/não foi adicionado ao seu histórico/i)).toBeTruthy();
  });

  it('oferece a porta que registra de verdade', async () => {
    await anexa();
    fireEvent.press(screen.getByText(/registrar este documento/i));
    expect(router.push).toHaveBeenCalledWith('/add-exam');
  });

  it('mostra o nome do arquivo anexado, para a pessoa saber do que se trata', async () => {
    await anexa();
    expect(screen.getByText(/hemograma\.pdf/)).toBeTruthy();
  });

  it('da para remover o anexo antes de enviar', async () => {
    await anexa();
    fireEvent.press(screen.getByLabelText(/remover anexo/i));
    expect(screen.queryByText(/hemograma\.pdf/)).toBeNull();
  });

  it('anexo cancelado no seletor nao mostra nada nem sobe arquivo', async () => {
    mockPick.mockResolvedValue({ canceled: true });
    renderTela();
    fireEvent.press(screen.getByLabelText('Anexar exame'));
    await waitFor(() => expect(mockPick).toHaveBeenCalled());
    expect(mockUploadAnexo).not.toHaveBeenCalled();
    expect(screen.queryByText(/não foi adicionado ao seu histórico/i)).toBeNull();
  });
});
