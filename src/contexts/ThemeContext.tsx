import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const { colorScheme: systemScheme, setColorScheme } = useColorScheme();
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

  // DECISION: passa theme (não colorScheme resolvido) ao NativeWind para que
  // 'system' continue seguindo o SO automaticamente quando não há preferência manual
  useEffect(() => {
    setColorScheme(theme);
  }, [theme, setColorScheme]);

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
