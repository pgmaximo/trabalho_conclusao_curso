import '@/global.css';
import '@/services/amplify/configureAmplify';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { DocumentProvider } from '@/contexts/DocumentContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { UserProvider } from '@/contexts/UserContext';

// Segura a splash screen antes de qualquer render
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  // ATTENTION: o layout raiz NAO decide rotas. Navegar (router.replace) aqui —
  // no componente que possui o <Stack> — remontava a arvore de navegacao e
  // gerava um loop infinito de roteamento. A verificacao de sessao/onboarding
  // agora vive em app/index.tsx, que e uma tela filha do Stack (navegar de la
  // e seguro). Aqui apenas configuramos providers + Stack e liberamos a splash.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <ThemeProvider>
      <UserProvider>
        <DocumentProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="register" />
            <Stack.Screen name="confirm" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="profile-setup" />
            <Stack.Screen name="edit-profile" />
            <Stack.Screen name="(app)" />
          </Stack>
        </DocumentProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
