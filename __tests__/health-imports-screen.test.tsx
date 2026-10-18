import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HealthImportsScreen } from '@/screens/HealthImportsScreen';
import type { HealthImport } from '@/types/healthInsights';
import { formatImportLabel } from '@/utils/healthImportDisplay';

// A tela importa canDeleteHealthImport do serviço, que monta o cliente do
// Amplify no carregamento — os mesmos stubs de health-import-service.test.ts.
jest.mock('aws-amplify/data', () => ({ generateClient: jest.fn(() => ({})) }));
jest.mock('aws-amplify/auth', () => ({ fetchAuthSession: jest.fn() }));
jest.mock('aws-amplify/storage', () => ({ uploadData: jest.fn(), remove: jest.fn() }));
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

function healthImport(overrides: Partial<HealthImport> = {}): HealthImport {
  return {
    id: 'import-1',
    status: 'READY',
    sourceHint: 'SAMSUNG_HEALTH',
    fileNames: ['export.zip'],
    periodStart: '2026-01-01',
    periodEnd: '2026-03-31',
    dayCount: 90,
    warnings: [],
    errorMessage: null,
    startedAt: '2026-04-01T13:00:00.000Z',
    analyzedAt: '2026-04-01T13:02:00.000Z',
    modelId: null,
    summary: null,
    insights: null,
    createdAt: '2026-04-01T13:00:00.000Z',
    updatedAt: '2026-04-01T13:02:00.000Z',
    ...overrides,
  };
}

function renderScreen(props: Partial<React.ComponentProps<typeof HealthImportsScreen>> = {}) {
  const handlers = {
    onBack: jest.fn(),
    onImportPress: jest.fn(),
    onOpenImport: jest.fn(),
    onDeleteImport: jest.fn().mockResolvedValue(undefined),
    onRetry: jest.fn(),
  };

  render(
    <SafeAreaProvider initialMetrics={{ frame: { height: 844, width: 390, x: 0, y: 0 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <HealthImportsScreen errorMessage={null} imports={[]} isLoading={false} {...handlers} {...props} />
    </SafeAreaProvider>,
  );

  return { ...handlers, ...props };
}

describe('formatImportLabel', () => {
  it('names the import by its upload date and time, in the device timezone', () => {
    // A suíte roda em America/Sao_Paulo (jest.config.js): 13:00Z = 10:00 local.
    expect(formatImportLabel('2026-04-01T13:00:00.000Z')).toBe('Importação de 01/04/2026 às 10:00');
  });
});

describe('HealthImportsScreen', () => {
  it('lists every import, each with its status and what it covers', () => {
    renderScreen({
      imports: [
        healthImport({ id: 'b', status: 'FAILED', errorMessage: 'Nenhum arquivo reconhecido.', createdAt: '2026-04-05T13:00:00.000Z' }),
        healthImport({ id: 'a', fileNames: ['a.csv', 'b.csv', 'c.json'] }),
      ],
    });

    expect(screen.getByText('Importação de 05/04/2026 às 10:00')).toBeTruthy();
    expect(screen.getByText('Falhou')).toBeTruthy();
    expect(screen.getByText('Nenhum arquivo reconhecido.')).toBeTruthy();

    expect(screen.getByText('Importação de 01/04/2026 às 10:00')).toBeTruthy();
    expect(screen.getByText('Pronta')).toBeTruthy();
    expect(screen.getByText('01/01/2026 a 31/03/2026 · 90 dias')).toBeTruthy();
    expect(screen.getByText('Samsung Health · a.csv e mais 2 arquivos')).toBeTruthy();
  });

  it('opens the chosen import', () => {
    const { onOpenImport } = renderScreen({ imports: [healthImport({ id: 'chosen' })] });

    fireEvent.press(screen.getByRole('button', { name: 'Importação de 01/04/2026 às 10:00, Pronta' }));

    expect(onOpenImport).toHaveBeenCalledWith('chosen');
  });

  it('asks for confirmation before deleting, and deletes only the chosen import', async () => {
    const { onDeleteImport } = renderScreen({
      imports: [
        healthImport({ id: 'keep', createdAt: '2026-04-05T13:00:00.000Z' }),
        healthImport({ id: 'remove' }),
      ],
    });

    fireEvent.press(screen.getByRole('button', { name: 'Excluir a importação de 01/04/2026 às 10:00' }));
    expect(onDeleteImport).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: 'Confirmar exclusão' }));

    await waitFor(() => expect(onDeleteImport).toHaveBeenCalledTimes(1));
    expect(onDeleteImport).toHaveBeenCalledWith('remove');
  });

  it('cancelling the confirmation deletes nothing', () => {
    const { onDeleteImport } = renderScreen({ imports: [healthImport()] });

    fireEvent.press(screen.getByRole('button', { name: 'Excluir a importação de 01/04/2026 às 10:00' }));
    fireEvent.press(screen.getByRole('button', { name: 'Cancelar exclusão' }));

    expect(onDeleteImport).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Confirmar exclusão' })).toBeNull();
  });

  it('shows the error on the import whose deletion failed', async () => {
    renderScreen({
      imports: [healthImport()],
      onDeleteImport: jest.fn().mockRejectedValue(new Error('network')),
    });

    fireEvent.press(screen.getByRole('button', { name: 'Excluir a importação de 01/04/2026 às 10:00' }));
    fireEvent.press(screen.getByRole('button', { name: 'Confirmar exclusão' }));

    expect(await screen.findByText('Não foi possível excluir a importação. Tente novamente.')).toBeTruthy();
  });

  it('does not offer to delete an analysis that is still running', () => {
    const now = new Date().toISOString();
    renderScreen({ imports: [healthImport({ status: 'PROCESSING', startedAt: now, createdAt: now })] });

    expect(screen.getByText('Em análise')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Excluir/ })).toBeNull();
  });

  it('offers to delete an analysis that stopped responding, and says so', () => {
    renderScreen({
      imports: [healthImport({ status: 'PROCESSING', startedAt: '2026-04-01T13:00:00.000Z' })],
    });

    expect(screen.getByText('Sem resposta')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Excluir a importação de 01/04/2026 às 10:00' })).toBeTruthy();
  });

  it('starts a new import from the list', () => {
    const { onImportPress } = renderScreen({ imports: [healthImport()] });

    fireEvent.press(screen.getByText('Importar novos dados'));

    expect(onImportPress).toHaveBeenCalled();
  });

  it('shows the empty state when there are no imports', () => {
    const { onImportPress } = renderScreen({ imports: [] });

    expect(screen.getByText('Nenhum dado importado ainda')).toBeTruthy();
    fireEvent.press(screen.getByText('Importar dados'));
    expect(onImportPress).toHaveBeenCalled();
  });

  it('shows a retryable error when the list cannot be loaded', () => {
    const { onRetry } = renderScreen({ errorMessage: 'Sem conexão.' });

    expect(screen.getByText('Não foi possível carregar suas importações')).toBeTruthy();
    fireEvent.press(screen.getByText('Tentar novamente'));
    expect(onRetry).toHaveBeenCalled();
  });
});
