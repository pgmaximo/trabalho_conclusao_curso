import React from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { aplicarFonteDoApp, estiloDaFonteDoApp } from '@/services/fonts/fonteDoApp';

// Regressão da feira (2026-10-22): no Galaxy Tab A9+ a última letra de vários
// rótulos sumia ("Altur", "IM", "Sex"). O patch antigo dependia de
// `Text.render`, que não existe desde que o `Text` do React Native virou função
// (0.86): o IBM Plex nunca era aplicado e o texto caía na fonte do sistema da
// Samsung, que corta o último caractere.

describe('estiloDaFonteDoApp', () => {
  it('escolhe a face pelo peso do estilo', () => {
    expect(estiloDaFonteDoApp([{ fontSize: 15 }, { fontWeight: '600' }], 'ios')).toEqual({
      fontFamily: 'IBMPlexSans_600SemiBold',
    });
    expect(estiloDaFonteDoApp({ fontWeight: 'bold' }, 'ios').fontFamily).toBe(
      'IBMPlexSans_700Bold',
    );
    expect(estiloDaFonteDoApp(undefined, 'ios').fontFamily).toBe('IBMPlexSans_400Regular');
  });

  it('no Android zera o peso, para o sistema não engrossar uma face que já é a certa', () => {
    expect(estiloDaFonteDoApp({ fontWeight: '600' }, 'android')).toEqual({
      fontFamily: 'IBMPlexSans_600SemiBold',
      fontWeight: 'normal',
    });
  });
});

describe('aplicarFonteDoApp', () => {
  beforeAll(() => {
    aplicarFonteDoApp();
  });

  it('todo Text renderizado recebe a face do IBM Plex', () => {
    render(<Text style={{ fontWeight: '600' }}>Altura</Text>);
    const estilo = StyleSheet.flatten(screen.getByText('Altura').props.style);
    expect(estilo.fontFamily).toBe('IBMPlexSans_600SemiBold');
  });

  it('todo TextInput renderizado recebe a face do IBM Plex', () => {
    render(<TextInput testID="campo" />);
    const estilo = StyleSheet.flatten(screen.getByTestId('campo').props.style);
    expect(estilo.fontFamily).toBe('IBMPlexSans_400Regular');
  });
});
