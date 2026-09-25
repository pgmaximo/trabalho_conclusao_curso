import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Text, View } from 'react-native';

import { useThemeColors } from '@/constants/theme';

/**
 * Indicador de "o assistente esta respondendo".
 *
 * Os tres pontos eram estaticos, e nao davam para saber se o pedido estava
 * andando ou se o app tinha travado (achado do teste de 2026-09-25). Agora eles
 * sobem e acendem em onda.
 *
 * Por que o `Animated` do React Native, e nao o Reanimated: o
 * `react-native-worklets` instalado (0.8.3, vindo junto do Reanimated) nao e o
 * que o SDK 54 espera (0.5.1), e o primeiro uso do Reanimated no app arriscaria
 * quebrar o Expo Go. Um laco sem gesto, so de `transform` e `opacity`, roda na
 * thread de interface com o `useNativeDriver` -- nao para quando o JavaScript
 * esta ocupado recebendo a resposta.
 *
 * Com "reduzir movimento" ligado no aparelho, a onda fica so no brilho: sem
 * deslocamento, mas ainda com sinal de vida.
 *
 * O texto diz o que o app SABE: que esta preparando a resposta. Se a espera
 * passa do comum, avisa que continua -- nada de etapas inventadas ("lendo seus
 * exames...") que o aplicativo nao tem como confirmar.
 */

/** Depois de quanto tempo a espera deixa de ser comum. */
const ESPERA_LONGA_MS = 8000;

const SUBIDA_MS = 360;
const DESCIDA_MS = 360;
const DEFASAGEM_MS = 160;
const CICLO_MS = 1200;
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
const NATIVO = Platform.OS !== 'web';

function Ponto({ indice, cor, reduzirMovimento }: { indice: number; cor: string; reduzirMovimento: boolean }) {
  const fase = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const laco = Animated.loop(
      Animated.sequence([
        Animated.delay(indice * DEFASAGEM_MS),
        Animated.timing(fase, { toValue: 1, duration: SUBIDA_MS, easing: EASE_IN_OUT, useNativeDriver: NATIVO }),
        Animated.timing(fase, { toValue: 0, duration: DESCIDA_MS, easing: EASE_IN_OUT, useNativeDriver: NATIVO }),
        Animated.delay(CICLO_MS - SUBIDA_MS - DESCIDA_MS - indice * DEFASAGEM_MS),
      ]),
    );
    laco.start();
    return () => laco.stop();
  }, [fase, indice]);

  const opacity = fase.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  const translateY = fase.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });

  return (
    <Animated.View
      style={{
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: cor,
        opacity,
        transform: reduzirMovimento ? [] : [{ translateY }],
      }}
    />
  );
}

export function TypingIndicator() {
  const colors = useThemeColors();
  const [reduzirMovimento, setReduzirMovimento] = useState(false);
  const [esperaLonga, setEsperaLonga] = useState(false);

  useEffect(() => {
    let ativo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((valor) => {
        if (ativo) setReduzirMovimento(valor);
      })
      .catch(() => {});
    const timer = setTimeout(() => setEsperaLonga(true), ESPERA_LONGA_MS);
    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, []);

  return (
    <View
      accessible
      accessibilityLabel="O assistente está preparando a resposta"
      accessibilityLiveRegion="polite"
      className="mb-3 items-start"
    >
      <View className="flex-row items-center gap-3 rounded-app border border-app-border bg-app-surface px-4 py-3 dark:border-app-dark-border dark:bg-app-dark-surface">
        <View className="h-4 flex-row items-center gap-[5px]">
          {[0, 1, 2].map((indice) => (
            <Ponto
              key={indice}
              cor={colors.textSecondary}
              indice={indice}
              reduzirMovimento={reduzirMovimento}
            />
          ))}
        </View>
        <Text className="text-[14px] text-app-textSecondary dark:text-app-dark-textSecondary">
          Pensando na resposta
        </Text>
      </View>
      {esperaLonga ? (
        <Text className="ml-1 mt-1 text-[13px] text-app-textSecondary dark:text-app-dark-textSecondary">
          Ainda trabalhando. Perguntas sobre vários exames levam um pouco mais.
        </Text>
      ) : null}
    </View>
  );
}
