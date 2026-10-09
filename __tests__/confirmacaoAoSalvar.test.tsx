import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { avisarSucesso } from '@/hooks/avisoDeSucesso';
import { EditAppointmentScreen } from '@/screens/EditAppointmentScreen';
import { deleteAppointment, getAppointmentById, updateAppointment } from '@/services/appointmentService';

// Depois de salvar, a pessoa volta para a lista e le que salvou. Antes, a
// unica confirmacao era a tela ter mudado
// (specs/00-fundacao/consistencia-e-textos/spec.md, D5).

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn() },
}));
jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});
jest.mock('@/hooks/avisoDeSucesso', () => ({ avisarSucesso: jest.fn() }));
jest.mock('@/services/appointmentService', () => ({
  deleteAppointment: jest.fn(),
  getAppointmentById: jest.fn(),
  updateAppointment: jest.fn(),
}));

const COMPROMISSO = {
  id: 'apt-1',
  appointmentType: 'CONSULTA',
  appointmentName: 'Cardiologista',
  professionalName: 'Dr. Ricardo Alves',
  scheduledAt: '2026-10-20T09:30',
  address: 'Av. Paulista, 1000',
  observations: '',
};

async function abrirCompromisso() {
  (getAppointmentById as jest.Mock).mockResolvedValue(COMPROMISSO);
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { bottom: 24, left: 0, right: 0, top: 44 },
      }}
    >
      <EditAppointmentScreen id="apt-1" />
    </SafeAreaProvider>,
  );
  await screen.findByText('Salvar alterações');
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Editar compromisso', () => {
  it('avisa que salvou, e so entao volta', async () => {
    (updateAppointment as jest.Mock).mockResolvedValue(COMPROMISSO);
    await abrirCompromisso();

    fireEvent.press(screen.getByText('Salvar alterações'));

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(avisarSucesso).toHaveBeenCalledWith('Compromisso salvo.');
  });

  it('nao diz que salvou quando o salvamento falha', async () => {
    (updateAppointment as jest.Mock).mockRejectedValue(new Error('Não foi possível atualizar o compromisso.'));
    await abrirCompromisso();

    fireEvent.press(screen.getByText('Salvar alterações'));

    expect(await screen.findByText('Não foi possível atualizar o compromisso.')).toBeTruthy();
    expect(avisarSucesso).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('avisa que excluiu', async () => {
    (deleteAppointment as jest.Mock).mockResolvedValue(undefined);
    await abrirCompromisso();

    fireEvent.press(screen.getByText('Excluir compromisso'));
    fireEvent.press(screen.getByRole('button', { name: 'Confirmar exclusão' }));

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(avisarSucesso).toHaveBeenCalledWith('Compromisso excluído.');
  });
});

describe('todo fluxo que salva avisa', () => {
  // As demais telas seguem o mesmo padrao, e dependem de muitos servicos para
  // serem montadas aqui. O que este teste garante e que nenhuma ficou de fora.
  it.each([
    ['screens/AddAppointmentScreen.tsx', 'Compromisso salvo.'],
    ['screens/EditAppointmentScreen.tsx', 'Compromisso excluído.'],
    ['screens/AddExamScreen.tsx', 'Documento salvo.'],
    ['screens/DocumentDetailScreen.tsx', 'Documento excluído.'],
    ['screens/AddMedicineScreen.tsx', 'Medicamento salvo.'],
    ['screens/EditMedicineScreen.tsx', 'Medicamento salvo.'],
    ['screens/EditMedicineScreen.tsx', 'Medicamento excluído.'],
    ['screens/AddVaccineScreen.tsx', 'Vacina salva.'],
    ['app/(app)/vaccination.tsx', 'Dose marcada como aplicada.'],
    ['app/(app)/vaccination.tsx', 'Registro de vacina excluído.'],
    ['app/edit-profile.tsx', 'Perfil atualizado.'],
  ])('%s avisa "%s"', (arquivo, mensagem) => {
    const texto = readFileSync(join(__dirname, '..', 'src', arquivo), 'utf8');

    expect(texto).toContain(`avisarSucesso('${mensagem}')`);
  });
});
