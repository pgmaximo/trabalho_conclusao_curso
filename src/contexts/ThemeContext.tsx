import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, useColorScheme as useSystemColorScheme } from 'react-native';
import { useColorScheme } from 'nativewind';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  colorScheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
  colorScheme: 'light',
});

const THEME_KEY = '@suasaude/theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme: nativeWindScheme, setColorScheme } = useColorScheme();
  // Na web, depois que o tema resolvido e entregue ao NativeWind (abaixo), o
  // esquema dele passa a ecoar o que recebeu e nao acompanha mais o sistema.
  // O do react-native-web le o `prefers-color-scheme` do navegador direto.
  const browserScheme = useSystemColorScheme();
  const systemScheme = Platform.OS === 'web' ? browserScheme : nativeWindScheme;
  const [theme, setThemeState] = useState<ThemeMode>('system');

  const colorScheme: 'light' | 'dark' =
    theme === 'system' ? (systemScheme ?? 'light') : theme;

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeState(saved);
        }
      })
      .catch(() => {});
  }, []);

  // DECISION: no celular, passa theme (não colorScheme resolvido) ao NativeWind
  // para que 'system' continue seguindo o SO automaticamente quando não há
  // preferência manual.
  //
  // Na web, NÃO: com a estratégia `class`, "system" tira a classe `dark` da
  // página (a tela fica clara) enquanto o NativeWind responde "dark" pelo
  // sistema -- e as cores pintadas por código (useThemeColors) saíam escuras
  // sobre a tela clara. Foi a seta invisível do "Recuperar senha"
  // (2026-09-25). Lá, o tema vai já resolvido.
  const nativeWindTheme = Platform.OS === 'web' ? colorScheme : theme;
  useEffect(() => {
    setColorScheme(nativeWindTheme);
  }, [nativeWindTheme, setColorScheme]);

  function setTheme(t: ThemeMode) {
    setThemeState(t);
    AsyncStorage.setItem(THEME_KEY, t).catch(() => {});
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
