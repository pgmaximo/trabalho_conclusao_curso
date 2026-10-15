/**
 * Bloco 11 (E6, Decisao O1) -- a tela de adicionar documento aceita as outras
 * folhas de um laudo em papel. Antes, quem fotografava cinco folhas criava cinco
 * documentos, e a folha isolada foi a condicao do erro do grafico (G10).
 *
 * So foto ganha folha: PDF ja tem paginas. O teto e o da extracao (10).
 */
const mockCriar = jest.fn();
const mockPermissao = jest.fn();
const mockCamera = jest.fn();

jest.mock('aws-amplify/data', () => ({ generateClient: () => ({ models: {}, mutations: {} }) }));
jest.mock('aws-amplify/storage', () => ({ remove: jest.fn(), getUrl: jest.fn() }));
jest.mock('@/services/auth', () => ({ getUserId: jest.fn() }));
jest.mock('@/services/upload', () => ({ uploadFileToS3: jest.fn() }));
jest.mock('@/hooks/useExamsData', () => ({ invalidateExamsCache: jest.fn() }));
jest.mock('uuid', () => ({ v4: () => 'uuid-fixo' }));
jest.mock('react-native-get-random-values', () => ({}));
jest.mock('expo-router', () => ({ router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() } }));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: (...a: unknown[]) => mockPermissao(...a),
  launchCameraAsync: (...a: unknown[]) => mockCamera(...a),
}));
jest.mock('@/services/examService', () => ({
  ...jest.requireActual('@/services/examService'),
  createExamDocument: (...a: unknown[]) => mockCriar(...a),
}));
jest.mock('@expo/vector-icons/Ionicons', () => {
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AddExamScreen } from '@/screens/AddExamScreen';

function renderizar(fileName = 'folha1.jpg') {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <AddExamScreen fileName={fileName} filePath={`file:///${fileName}`} fileSize={500_000} />
    </SafeAreaProvider>,
  );
}

let proxima = 2;
beforeEach(() => {
  jest.clearAllMocks();
  proxima = 2;
  mockPermissao.mockResolvedValue({ granted: true });
  mockCamera.mockImplementation(async () => {
    const n = proxima++;
    return {
      canceled: false,
      assets: [{ uri: `file:///f${n}.jpg`, fileName: `f${n}.jpg`, fileSize: 400_000 }],
    };
  });
  mockCriar.mockResolvedValue({ id: 'doc-1' });
});

async function fotografar() {
  fireEvent.press(screen.getByText('Fotografar outra folha'));
  await waitFor(() => expect(mockCamera).toHaveBeenCalledTimes(proxima - 2));
}

describe('AddExamScreen -- as outras folhas (Bloco 11)', () => {
  it('foto oferece fotografar outra folha', () => {
    renderizar();
    expect(screen.getByText('Fotografar outra folha')).toBeTruthy();
  });

  it('PDF nao oferece -- ele ja tem paginas', () => {
    renderizar('laudo.pdf');
    expect(screen.queryByText('Fotografar outra folha')).toBeNull();
  });

  it('a folha fotografada aparece numerada, e pode ser removida', async () => {
    renderizar();
    await fotografar();
    expect(await screen.findByText('Folha 2')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Remover a folha 2'));
    expect(screen.queryByText('Folha 2')).toBeNull();
  });

  it('camera cancelada nao acrescenta folha', async () => {
    mockCamera.mockResolvedValueOnce({ canceled: true, assets: [] });
    renderizar();
    fireEvent.press(screen.getByText('Fotografar outra folha'));
    await waitFor(() => expect(mockCamera).toHaveBeenCalled());
    expect(screen.queryByText('Folha 2')).toBeNull();
  });

  it('no limite de 10 folhas o botao some', async () => {
    renderizar();
    for (let i = 0; i < 9; i++) await fotografar();
    expect(await screen.findByText('Folha 10')).toBeTruthy();
    expect(screen.queryByText('Fotografar outra folha')).toBeNull();
  });

  it('salvar leva as folhas, na ordem', async () => {
    renderizar();
    await fotografar();
    await fotografar();
    await screen.findByText('Folha 3');

    fireEvent.press(screen.getByText('Exame'));
    fireEvent.changeText(screen.getByPlaceholderText('Ex.: Hemograma completo'), 'Hemograma');
    fireEvent.press(screen.getByText('Salvar documento'));

    await waitFor(() => expect(mockCriar).toHaveBeenCalled());
    expect(mockCriar.mock.calls[0][0].folhasAdicionais).toEqual([
      { fileName: 'f2.jpg', filePath: 'file:///f2.jpg', fileSize: 400_000 },
      { fileName: 'f3.jpg', filePath: 'file:///f3.jpg', fileSize: 400_000 },
    ]);
  });
});
