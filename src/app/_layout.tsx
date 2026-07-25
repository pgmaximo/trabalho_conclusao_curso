import '@/global.css';
import '@/services/amplify/configureAmplify';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { DocumentProvider } from '@/contexts/DocumentContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { UserProvider } from '@/contexts/UserContext';
import { useFonts } from 'expo-font';
import { Text, TextInput } from 'react-native';

// ----------------------------------------------------------------------
// INJEÇÃO GLOBAL DEFINITIVA (O "Monkey Patch" do Render)
// Em vez de usar defaultProps (que é sobrescrito pelo Tailwind), 
// nós interceptamos a renderização do Text e forçamos a fonte 
// a se fundir com os estilos do Tailwind sem que um anule o outro.
// ----------------------------------------------------------------------
const oldTextRender = (Text as any).render;
if (oldTextRender) {
  (Text as any).render = function (props: any, ref: any) {
    // Array de estilos: A fonte base vem primeiro, os estilos da sua tela (props.style) vêm depois
    return oldTextRender({ ...props, style: [{ fontFamily: 'Basic-Regular' }, props.style] }, ref);
  };
}

const oldTextInputRender = (TextInput as any).render;
if (oldTextInputRender) {
  (TextInput as any).render = function (props: any, ref: any) {
    return oldTextInputRender({ ...props, style: [{ fontFamily: 'Basic-Regular' }, props.style] }, ref);
  };
}
// ----------------------------------------------------------------------

// Segura a splash screen antes de qualquer render
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Basic-Regular': require('../../assets/fonts/Basic-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

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
