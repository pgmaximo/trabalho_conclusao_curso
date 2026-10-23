import '@/global.css';
import '@/services/amplify/configureAmplify';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from '@/services/notificationsClient';
import { DocumentProvider } from '@/contexts/DocumentContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { UserProvider } from '@/contexts/UserContext';
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
  useFonts,
} from '@expo-google-fonts/ibm-plex-sans';
import { LogBox, Platform } from 'react-native';
import { aplicarFonteDoApp } from '@/services/fonts/fonteDoApp';

// Desde o upgrade para o SDK 57, o cliente de HMR do Expo abre um WebSocket
// próprio para o host do Metro além do bundle principal; quando esse socket
// específico falha (comum no Expo Go via Wi-Fi) ele loga esse aviso mesmo com
// o bundle já carregado e o app funcionando normalmente — é só ruído de dev.
if (__DEV__) {
  LogBox.ignoreLogs(['Cannot connect to Expo CLI']);
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Segura a splash screen antes de qualquer render
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
  });

  // IBM Plex Sans em todo Text/TextInput (ver src/services/fonts/fonteDoApp.ts).
  // Síncrono, e não num efeito, para valer já no render que desenha as telas;
  // se as fontes falharem, o texto fica na fonte do sistema.
  if (fontsLoaded) {
    aplicarFonteDoApp();
  }

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
        await Notifications.setNotificationChannelAsync('medicine-reminders', {
          // O nome do canal aparece nos ajustes do Android. É o nome da aba.
          name: 'Remédios',
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
