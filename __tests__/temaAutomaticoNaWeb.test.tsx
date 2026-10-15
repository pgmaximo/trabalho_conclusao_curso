/**
 * Defeito achado no teste do app (2026-09-25): na tela "Recuperar senha", a
 * seta de voltar sumia. Acontecia com o tema "Automatico" e o sistema escuro,
 * no navegador.
 *
 * O NativeWind usa a estrategia `class` (tailwind.config.js). Na web, ao
 * receber "system", ele TIRA a classe `dark` da pagina -- as classes `dark:`
 * nao valem, e a tela fica clara -- mas o `useColorScheme` dele responde
 * "dark", pelo sistema. As cores pintadas por codigo (useThemeColors: a seta,
 * a borda) saiam escuras sobre a tela clara: quase branco no quase branco.
 *
 * Na web, entao, o tema entregue ao NativeWind e o JA RESOLVIDO. No celular,
 * "system" continua sendo entregue como "system", que devolve a decisao ao
 * aparelho.
 */
import React from 'react';
import { Platform, Text } from 'react-native';
import { render } from '@testing-library/react-native';

const mockSetColorScheme = jest.fn();
jest.mock('nativewind', () => ({
  // O NativeWind responde "dark" pelo sistema, mesmo com a pagina clara.
  useColorScheme: () => ({ colorScheme: 'dark', setColorScheme: mockSetColorScheme }),
}));
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => 'dark',
}));

import { ThemeProvider, useThemeContext } from '@/contexts/ThemeContext';

function Esquema() {
  const { colorScheme } = useThemeContext();
  return <Text>{colorScheme}</Text>;
}

beforeEach(() => mockSetColorScheme.mockClear());

it('na web, o tema automatico chega ao NativeWind ja resolvido', () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  const { getByText } = render(
    <ThemeProvider>
      <Esquema />
    </ThemeProvider>,
  );
  expect(getByText('dark')).toBeTruthy();
  // Pagina e cores pintadas por codigo no MESMO esquema.
  expect(mockSetColorScheme).toHaveBeenLastCalledWith('dark');
});

it('no celular, o tema automatico devolve a decisao ao aparelho', () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  render(
    <ThemeProvider>
      <Esquema />
    </ThemeProvider>,
  );
  expect(mockSetColorScheme).toHaveBeenLastCalledWith('system');
});
