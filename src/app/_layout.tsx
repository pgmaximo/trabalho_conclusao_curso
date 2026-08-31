import '@/global.css';
import '@/services/amplify/configureAmplify';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { DocumentProvider } from '@/contexts/DocumentContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { UserProvider } from '@/contexts/UserContext';
import { useFonts } from 'expo-font';
import { Platform, Text, TextInput } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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

  useEffect(() => {
    void (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('appointments-reminders', {
          name: 'Agenda',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
          enableVibrate: true,
        });
      }
    })();
  }, []);

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
