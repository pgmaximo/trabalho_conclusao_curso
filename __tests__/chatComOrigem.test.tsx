/**
 * O que esta EPIC acrescenta a tela de chat: a origem de cada numero citado, e
 * o aviso permanente coberto por teste.
 *
 * O aviso nao e cortesia de texto: a R2 do modulo de regras de linguagem
 * DISPENSA o encaminhamento em pergunta operacional porque esse aviso esta
 * sempre na tela. Se ele sair, a regra muda -- e por isso ele tem teste
 * proprio, e nao so uma linha de copy.
 */
jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

jest.mock('@/services/aiAssistantService', () => ({
  sendMessageWithSources: jest.fn(),
}));

// `aws-amplify/storage` e ESM e o jest-expo nao o carrega. Nenhum teste deste
// arquivo anexa nada -- quem cobre o anexo e `anexoNoChat.test.tsx`.
jest.mock('@/services/chatAttachmentService', () => ({ uploadAnexoDoChat: jest.fn() }));

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


import { readFileSync } from 'node:fs';

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { checkLanguageRules } from '../amplify/functions/ai-language-rules/languageRules';
import { ChatBotScreen } from '@/screens/ChatBotScreen';

const { sendMessageWithSources: mockSend } = jest.requireMock('@/services/aiAssistantService');

const CITACAO = {
  resultId: 'l-1',
  documentId: 'doc-marco',
  analyteLabel: 'Vitamina D (25-OH)',
  value: '32,5',
  unit: 'ng/mL',
  collectedAt: '2026-03-12',
};

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

async function enviaEResponde(resposta: {
  text: string;
  citations?: unknown[];
  ruleCheckStatus?: string;
}) {
  mockSend.mockResolvedValue({
    citations: [],
    ruleCheckStatus: 'APROVADA',
    ...resposta,
  });
  renderTela();
  fireEvent.changeText(screen.getByPlaceholderText(/digite sua pergunta/i), 'e minha vitamina D?');
  fireEvent.press(screen.getByLabelText('Enviar mensagem'));
  await waitFor(() => expect(screen.getByText(resposta.text)).toBeTruthy());
}

beforeEach(() => {
  mockSend.mockReset();
  (router.push as jest.Mock).mockReset();
});

describe('o aviso permanente', () => {
  it('esta visivel na tela vazia', () => {
    renderTela();
    expect(screen.getByText(/não substitui avaliação médica/i)).toBeTruthy();
  });

  it('continua visivel DEPOIS de uma resposta', async () => {
    // A R2 dispensa o encaminhamento em pergunta operacional contando com este
    // aviso. Um aviso que some quando a conversa comeca nao cumpre esse papel.
    await enviaEResponde({ text: 'Sua próxima consulta é 24 de outubro.' });
    expect(screen.getByText(/não substitui avaliação médica/i)).toBeTruthy();
  });

  it('nao tem como ser dispensado', () => {
    renderTela();
    expect(screen.queryByLabelText('Fechar aviso')).toBeNull();
  });
});

describe('a bolha com origem', () => {
  it('mostra de qual exame e de que data veio o numero', async () => {
    await enviaEResponde({
      text: 'Seu registro de março mostra 32,5 ng/mL.',
      citations: [CITACAO],
    });
    expect(screen.getByText(/Vitamina D \(25-OH\)/)).toBeTruthy();
    expect(screen.getByText(/12\/03\/2026/)).toBeTruthy();
  });

  it('o numero citado leva ao documento de origem', async () => {
    await enviaEResponde({
      text: 'Seu registro de março mostra 32,5 ng/mL.',
      citations: [CITACAO],
    });
    fireEvent.press(screen.getByLabelText(/ver o documento/i));
    expect(router.push).toHaveBeenCalledWith('/document-detail?id=doc-marco');
  });

  it('resposta sem citacao nao ganha rodape de origem', async () => {
    // Uma secao de origens vazia em toda bolha viraria ruido, e ensinaria a
    // pessoa a ignorar o lugar onde a origem aparece quando existe.
    await enviaEResponde({ text: 'Bom dia! Em que posso ajudar?' });
    expect(screen.queryByLabelText(/ver o documento/i)).toBeNull();
  });

  it('a mesma origem citada duas vezes aparece uma vez so', async () => {
    await enviaEResponde({
      text: 'Março: 32,5 ng/mL, e março de novo.',
      citations: [CITACAO, CITACAO],
    });
    expect(screen.getAllByLabelText(/ver o documento/i)).toHaveLength(1);
  });
});

describe('a copy da tela', () => {
  // A copy e lida da FONTE, e nao da arvore renderizada: `JSON.stringify` sobre
  // o resultado de `toJSON()` desta tela encontra uma estrutura circular (o
  // Provider da area segura se referencia), e varrer a fonte tambem alcanca a
  // copy que so aparece em estados que este teste nao monta.
  function copyDaTela(caminho: string): string {
    return readFileSync(caminho, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
  }

  it('nao usa o termo vetado', () => {
    for (const caminho of ['src/screens/ChatBotScreen.tsx', 'src/components/MessageSources.tsx']) {
      const check = checkLanguageRules(copyDaTela(caminho), { questionKind: 'operacional' });
      const r1 = check.ok ? [] : check.violations.filter((v) => v.rule === 'R1');
      expect(r1).toEqual([]);
    }
  });

  it('nenhuma sugestao rapida pede o que o assistente nao faz', () => {
    // As sugestoes da tela mockada pediam explicacao generica ("o que significa
    // colesterol alto?") e acao ("lembrar de tomar remedio"). Nenhuma das duas
    // sobrevive as tools somente-leitura: a primeira seria respondida com R5
    // -- nao ha esse dado --, e a segunda promete uma escrita que nao existe.
    renderTela();
    for (const sugestao of screen.getAllByRole('button')) {
      const rotulo = JSON.stringify(sugestao.props.accessibilityLabel ?? '');
      expect(rotulo.toLowerCase()).not.toContain('colesterol');
    }
    expect(screen.queryByText(/o que significa colesterol alto/i)).toBeNull();
    expect(screen.queryByText(/lembrar de tomar remédio/i)).toBeNull();
  });

  it('a falha da chamada mostra a mensagem da propria camada de servico', async () => {
    // A camada de servico ja escreve mensagens honestas e diferentes entre si
    // ("sessao expirou", "indisponivel nesta versao"). Troca-las por uma frase
    // fixa aqui apagaria justamente a diferenca.
    mockSend.mockRejectedValue(new Error('Sua sessão expirou. Entre de novo para continuar.'));
    renderTela();
    fireEvent.press(screen.getByText(/último exame/i));
    await waitFor(() => expect(screen.getByText(/sua sessão expirou/i)).toBeTruthy());
  });

  it('o indicador de digitacao some depois da falha', async () => {
    mockSend.mockRejectedValue(new Error('qualquer coisa'));
    renderTela();
    fireEvent.press(screen.getByText(/último exame/i));
    await waitFor(() => expect(screen.queryByLabelText(/digitando/i)).toBeNull());
  });
});
