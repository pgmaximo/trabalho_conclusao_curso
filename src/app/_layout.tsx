import '@/global.css';
import '@/services/amplify/configureAmplify';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
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
// Em vez de usar defaultProps (que é sobrescrito pelo Tailwind), nós
// interceptamos a renderização do Text/TextInput e forçamos a face correta
// do IBM Plex Sans (400/500/600/700) a se fundir com os estilos do Tailwind
// sem que um anule o outro — a face é escolhida a partir do `fontWeight`
// já presente no style do componente (padrão 400/Regular).
//
// Enquanto as fontes ainda não terminaram de carregar (`fontsReady === false`),
// nenhuma fontFamily customizada é forçada — o texto cai no fallback do
// sistema (`system-ui`), nunca fica em branco/invisível.
// ----------------------------------------------------------------------

const FONT_WEIGHT_TO_FAMILY: Record<string, string> = {
  '400': 'IBMPlexSans_400Regular',
  normal: 'IBMPlexSans_400Regular',
  '500': 'IBMPlexSans_500Medium',
  '600': 'IBMPlexSans_600SemiBold',
  '700': 'IBMPlexSans_700Bold',
  bold: 'IBMPlexSans_700Bold',
};

// Mutável de módulo — atualizado de forma síncrona no corpo de RootLayout,
// antes de qualquer Text/TextInput da árvore ser renderizado nesse mesmo ciclo.
let fontsReady = false;

function resolveFontWeight(style: unknown): string {
  const flat: unknown[] = Array.isArray(style) ? (style as unknown[]).flat(Infinity) : [style];
  let weight = '400';
  for (const item of flat) {
    if (item && typeof item === 'object' && 'fontWeight' in (item as Record<string, unknown>)) {
      const value = (item as Record<string, unknown>).fontWeight;
      if (value) {
        weight = String(value);
      }
    }
  }
  return weight;
}

function resolveFontFamily(style: unknown): string {
  if (!fontsReady) {
    return 'system-ui';
  }
  const weight = resolveFontWeight(style);
  return FONT_WEIGHT_TO_FAMILY[weight] ?? 'IBMPlexSans_400Regular';
}

const oldTextRender = (Text as any).render;
if (oldTextRender) {
  (Text as any).render = function (props: any, ref: any) {
    // Array de estilos: A fonte base vem primeiro, os estilos da sua tela (props.style) vêm depois
    return oldTextRender(
      { ...props, style: [{ fontFamily: resolveFontFamily(props.style) }, props.style] },
      ref,
    );
  };
}

const oldTextInputRender = (TextInput as any).render;
if (oldTextInputRender) {
  (TextInput as any).render = function (props: any, ref: any) {
    return oldTextInputRender(
      { ...props, style: [{ fontFamily: resolveFontFamily(props.style) }, props.style] },
      ref,
    );
  };
}
// ----------------------------------------------------------------------

// Segura a splash screen antes de qualquer render
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
  });

  // Atualização síncrona (fora de estado React) para que o monkey-patch acima
  // já enxergue o valor correto no mesmo ciclo de render em que o app volta a
  // desenhar a árvore de telas (ver comentário acima).
  fontsReady = Boolean(fontsLoaded);

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
