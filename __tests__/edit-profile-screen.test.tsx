import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { EditProfileScreen, type EditProfileFormState } from '@/screens/EditProfileScreen';

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

const EMPTY_VALUES: EditProfileFormState = {
  fullName: '',
  birthDate: '',
  biologicalSex: '',
  heightCm: '',
  weightKg: '',
  tobaccoUse: 'unknown',
  sexuallyActive: 'unknown',
  physicalActivity: 'unknown',
  alcoholUse: 'unknown',
  pregnancyStatus: 'unknown',
};

function renderEditProfileScreen(props?: Partial<React.ComponentProps<typeof EditProfileScreen>>) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { bottom: 24, left: 0, right: 0, top: 44 },
      }}
    >
      <EditProfileScreen
        initialValues={EMPTY_VALUES}
        isSaving={false}
        onCancel={jest.fn()}
        onSubmit={jest.fn()}
        {...props}
      />
    </SafeAreaProvider>,
  );
}

describe('EditProfileScreen', () => {
  it('shows the biological sex chips as Masculino/Feminino/Outro', () => {
    renderEditProfileScreen();

    expect(screen.getByText('Sexo biológico')).toBeTruthy();
    expect(screen.getByText('Masculino')).toBeTruthy();
    expect(screen.getByText('Feminino')).toBeTruthy();
    expect(screen.getByText('Outro')).toBeTruthy();
  });

  it('blocks saving and shows an inline error when a required field is empty', () => {
    const onSubmit = jest.fn();
    renderEditProfileScreen({ onSubmit });

    fireEvent.press(screen.getByLabelText('Salvar alterações'));

    expect(screen.getByText('Informe seu nome completo.')).toBeTruthy();
    expect(screen.getByText('Use o formato DD/MM/AAAA.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the pregnancy question only for Feminino and resets it when switching away', () => {
    renderEditProfileScreen();

    expect(screen.queryByText('Você está grávida?')).toBeNull();

    fireEvent.press(screen.getByText('Feminino'));
    expect(screen.getByText('Você está grávida?')).toBeTruthy();

    fireEvent.press(screen.getByText('Masculino'));
    expect(screen.queryByText('Você está grávida?')).toBeNull();
  });

  it('shows an "Em breve" alert instead of a real upload when changing the photo', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    renderEditProfileScreen();
    fireEvent.press(screen.getByLabelText('Alterar foto'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Alterar foto',
      'Em breve você poderá trocar sua foto por aqui.',
    );
  });
});
