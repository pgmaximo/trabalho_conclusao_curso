/**
 * Resumo do arquivo:
 * Os formularios de compromisso e de remedio abertos pelo cartao da acao (E11)
 * com campos ja preenchidos. O que se prova: os campos chegam, o aviso neutro
 * aparece, nada e gravado sem o toque em Salvar, e sem parametro a tela e a de
 * sempre. Pela rota, parametro fora do limite ou do formato vira campo vazio --
 * o link `SuaSaude://` tambem chega aqui (H14).
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AddAppointmentRoute from '@/app/add-appointment';
import AddMedicineRoute from '@/app/add-medicine';
import { AddAppointmentScreen } from '@/screens/AddAppointmentScreen';
import { AddMedicineScreen } from '@/screens/AddMedicineScreen';
import { createAppointment } from '@/services/appointmentService';
import { createMedicine } from '@/services/medicineService';

// O SDK do Amplify e ESM e o jest-expo nao o carrega; mesmo recorte de
// `tipoDoCompromisso.test.tsx` e `formularioDeMedicamento.test.tsx`.
jest.mock('aws-amplify/auth', () => ({ fetchAuthSession: jest.fn(), getCurrentUser: jest.fn() }));
jest.mock('aws-amplify/data', () => ({ generateClient: jest.fn(() => ({})) }));

const mockParams = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => mockParams(),
}));
jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});
jest.mock('@/hooks/avisoDeSucesso', () => ({ avisarSucesso: jest.fn() }));
jest.mock('@/services/appointmentService', () => ({ createAppointment: jest.fn() }));
jest.mock('@/services/medicineService', () => ({
  ...jest.requireActual('@/services/medicineService'),
  createMedicine: jest.fn(),
  listMedicinesForUser: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/services/medicineReminderService', () => ({ syncMedicineReminders: jest.fn() }));

const AVISO = 'Alguns campos já vêm preenchidos. Confira antes de salvar.';

function comArea(elemento: React.ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{ frame: { height: 844, width: 390, x: 0, y: 0 }, insets: { bottom: 24, left: 0, right: 0, top: 44 } }}
    >
      {elemento}
    </SafeAreaProvider>,
  );
}

const marcado = (nome: string) =>
  screen.getByRole('button', { name: `Tipo: ${nome}` }).props.accessibilityState?.selected === true;

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.mockReturnValue({});
});

describe('Novo compromisso preenchido (E11)', () => {
  const INICIAL = { appointmentName: 'retorno', professionalName: 'dra ana', scheduledDate: '2026-10-30', scheduledTime: '14:00' };

  it('abre com os campos, Consulta marcada e o aviso; so grava no Salvar', async () => {
    (createAppointment as jest.Mock).mockResolvedValue({});
    comArea(<AddAppointmentScreen inicial={INICIAL} />);

    expect(screen.getByDisplayValue('retorno')).toBeTruthy();
    expect(screen.getByDisplayValue('dra ana')).toBeTruthy();
    expect(screen.getByText('30/10/2026')).toBeTruthy();
    expect(screen.getByDisplayValue('14:00')).toBeTruthy();
    expect(marcado('Consulta')).toBe(true);
    expect(screen.getByText(AVISO)).toBeTruthy();
    expect(createAppointment).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Salvar compromisso'));

    await waitFor(() => expect(createAppointment).toHaveBeenCalledTimes(1));
    expect(createAppointment).toHaveBeenCalledWith(
      expect.objectContaining({ appointmentName: 'retorno', professionalName: 'dra ana', scheduledAt: '2026-10-30T14:00' }),
    );
  });

  it('com tipo Exame, abre com Exame marcado', () => {
    comArea(<AddAppointmentScreen inicial={{ appointmentName: 'sangue', appointmentType: 'EXAME' }} />);
    expect(marcado('Exame')).toBe(true);
  });

  it('sem valores iniciais, e a tela de sempre, sem aviso', () => {
    comArea(<AddAppointmentScreen />);
    expect(screen.queryByText(AVISO)).toBeNull();
    expect(marcado('Consulta')).toBe(true);
  });
});

describe('Adicionar medicamento preenchido (E11)', () => {
  it('abre com nome e horarios, dosagem vazia, aviso, e nada gravado', () => {
    comArea(<AddMedicineScreen inicial={{ name: 'vitamina d', times: ['08:00', '20:00'] }} />);

    expect(screen.getByDisplayValue('vitamina d')).toBeTruthy();
    expect(screen.getByDisplayValue('08:00')).toBeTruthy();
    expect(screen.getByDisplayValue('20:00')).toBeTruthy();
    expect(screen.getByText(AVISO)).toBeTruthy();

    // A dose falta, entao Salvar fica desabilitado: o formulario continua
    // exigindo o que exigia.
    fireEvent.press(screen.getByText('Salvar'));
    expect(createMedicine).not.toHaveBeenCalled();
  });

  it('sem valores iniciais, e a tela de sempre, sem aviso', () => {
    comArea(<AddMedicineScreen />);
    expect(screen.queryByText(AVISO)).toBeNull();
  });
});

describe('as rotas conferem os parametros (H14)', () => {
  it('compromisso: parametro fora do limite e data invalida viram campos vazios', () => {
    mockParams.mockReturnValue({ appointmentName: 'a'.repeat(500), scheduledDate: '2026-13-40' });
    comArea(<AddAppointmentRoute />);
    expect(screen.queryByText(AVISO)).toBeNull();
    expect(screen.queryByDisplayValue('a'.repeat(500))).toBeNull();
  });

  it('compromisso: parametros validos chegam ao formulario', () => {
    mockParams.mockReturnValue({ tipo: 'ABRIR_NOVO_AGENDAMENTO', appointmentName: 'retorno', scheduledTime: '14:00' });
    comArea(<AddAppointmentRoute />);
    expect(screen.getByDisplayValue('retorno')).toBeTruthy();
    expect(screen.getByText(AVISO)).toBeTruthy();
  });

  it('remedio: horarios como texto de rota chegam, campo desconhecido nao', () => {
    mockParams.mockReturnValue({ name: 'vitamina d', times: '08:00,20:00', dosage: '2000 UI' });
    comArea(<AddMedicineRoute />);
    expect(screen.getByDisplayValue('vitamina d')).toBeTruthy();
    expect(screen.getByDisplayValue('20:00')).toBeTruthy();
    expect(screen.queryByDisplayValue('2000 UI')).toBeNull();
  });
});
