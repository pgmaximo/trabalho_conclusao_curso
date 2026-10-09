import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { EditAppointmentScreen } from '@/screens/EditAppointmentScreen';
import { EditProfileScreen } from '@/screens/EditProfileScreen';
import { VaccinationScreen } from '@/screens/VaccinationScreen';
import { getAppointmentById } from '@/services/appointmentService';

// O app tinha cinco jeitos de desenhar o topo de uma tela, com titulos de 17,
// 20, 24, 26 e 28px, e seis telas com o cabecalho escrito a mao. Ficaram dois:
// o ScreenHeader (24px) das telas a que se chega pela barra, pelo Inicio ou
// pelo hub Mais, e o DetailHeader (20px) das que abrem por cima de outra
// (specs/00-fundacao/consistencia-e-textos/spec.md, D3).

jest.mock('aws-amplify/data', () => ({ generateClient: jest.fn(() => ({})) }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn() },
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});
jest.mock('@/services/appointmentService', () => ({
  deleteAppointment: jest.fn(),
  getAppointmentById: jest.fn(),
  updateAppointment: jest.fn(),
}));

const METRICS = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 24, left: 0, right: 0, top: 44 },
};

function naTela(tela: React.ReactElement) {
  return render(<SafeAreaProvider initialMetrics={METRICS}>{tela}</SafeAreaProvider>);
}

function fonte(tela: string): string {
  return readFileSync(join(__dirname, '..', 'src', 'screens', `${tela}.tsx`), 'utf8');
}

describe('cada tela usa um dos dois cabecalhos do app', () => {
  it.each([
    'ExamsScreen',
    'ChatBotScreen',
    'MedicinesScreen',
    'AgendaScreen',
    'PreventionScreen',
    'VaccinationScreen',
    'HealthDashboardScreen',
    'AssistantMemoryScreen',
  ])('%s, a que se chega pela barra ou pelo hub, usa o ScreenHeader', (tela) => {
    expect(fonte(tela)).toMatch(/<ScreenHeader\b/);
  });

  it.each([
    'AddAppointmentScreen',
    'EditAppointmentScreen',
    'AddMedicineScreen',
    'EditMedicineScreen',
    'AddVaccineScreen',
    'AddExamScreen',
    'DocumentDetailScreen',
    'AnalyteSeriesScreen',
    'EditProfileScreen',
    'ImportHealthDataScreen',
  ])('%s, que abre por cima de outra tela, usa o DetailHeader', (tela) => {
    expect(fonte(tela)).toMatch(/<DetailHeader\b/);
  });

  it.each([
    'AddAppointmentScreen',
    'EditAppointmentScreen',
    'AddMedicineScreen',
    'EditMedicineScreen',
    'AddVaccineScreen',
    'EditProfileScreen',
    'MedicinesScreen',
  ])('%s nao desenha mais o proprio cabecalho', (tela) => {
    const texto = fonte(tela);
    // A seta de voltar escrita a mao e os tamanhos de titulo fora do padrao.
    expect(texto).not.toMatch(/name="chevron-back"/);
    expect(texto).not.toMatch(/FONTS\.title\b/);
    expect(texto).not.toMatch(/text-\[(17|26|28)px\] font-(bold|semibold)/);
  });
});

describe('Carteira de vacinacao', () => {
  it('volta por onde as outras telas do hub voltam', () => {
    // Ela chamava `router.back()` direto: aberta por um link, sem historico, o
    // botao nao fazia nada. As outras telas do hub recebem `onBack` da rota.
    const onBack = jest.fn();
    naTela(
      <VaccinationScreen
        campaignSamplingNotice={null}
        campaigns={[]}
        errorMessage={null}
        groups={[]}
        hasLocation={false}
        hasMunicipio={false}
        isEmpty
        isLoading={false}
        isRequestingLocation={false}
        onAddVaccine={jest.fn()}
        onBack={onBack}
        onMarkDoseApplied={jest.fn()}
        onRequestLocation={jest.fn()}
        onRetry={jest.fn()}
        sites={[]}
        upcoming={[]}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('Editar compromisso', () => {
  it('tem titulo e voltar tambem enquanto carrega', () => {
    // Carregando, a tela era so o esqueleto: sem titulo e sem como sair.
    (getAppointmentById as jest.Mock).mockReturnValue(new Promise(() => {}));

    naTela(<EditAppointmentScreen id="apt-1" />);

    expect(screen.getByText('Editar compromisso')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeTruthy();
  });
});

describe('Editar perfil', () => {
  it('o voltar do cabecalho cancela a edicao', () => {
    const onCancel = jest.fn();
    naTela(
      <EditProfileScreen
        initialValues={{
          alcoholUse: 'unknown',
          allergies: '',
          biologicalSex: 'female',
          birthDate: '01/01/1960',
          chronicConditions: '',
          fullName: 'Maria Souza',
          heightCm: '160',
          medications: '',
          physicalActivity: 'unknown',
          pregnancyStatus: 'unknown',
          sexuallyActive: 'unknown',
          tobaccoUse: 'unknown',
          weightKg: '62',
        }}
        isSaving={false}
        onCancel={onCancel}
        onSubmit={jest.fn()}
        onUploadPhoto={jest.fn()}
      />,
    );

    expect(screen.getByText('Editar perfil')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
