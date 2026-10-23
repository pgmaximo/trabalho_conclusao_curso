import React from 'react';
import { Platform, Text, TextInput } from 'react-native';
// Caminho interno do runtime do NativeWind: o mapa `interopComponents` não é
// exportado pela API pública, e é por ele que todo `<Text>` passa (ver
// react-native-css-interop/dist/runtime/wrap-jsx.js).
import { cssInterop, interopComponents } from 'react-native-css-interop/dist/runtime/api';
import 'react-native-css-interop/dist/runtime/components';

// ----------------------------------------------------------------------
// Fonte do app (IBM Plex Sans) em todo Text/TextInput.
//
// DEFEITO CORRIGIDO (2026-10-22, véspera da feira): a versão anterior trocava
// `Text.render`, que deixou de existir quando o `Text` do React Native virou
// uma função comum (RN 0.86). O patch não fazia nada: o IBM Plex nunca era
// aplicado, e no Galaxy Tab A9+ a fonte do sistema da Samsung cortava a última
// letra dos rótulos ("Altur", "IM", "Sex", "Tabagism").
//
// Agora a face entra pelo próprio NativeWind: o JSX troca `Text` pelo
// componente registrado em `interopComponents`, e aqui o registro do `Text` (e
// do `TextInput`) passa a apontar para um envoltório que acrescenta a face
// certa ao estilo já resolvido do `className`.
// ----------------------------------------------------------------------

const FONT_WEIGHT_TO_FAMILY: Record<string, string> = {
  '400': 'IBMPlexSans_400Regular',
  normal: 'IBMPlexSans_400Regular',
  '500': 'IBMPlexSans_500Medium',
  '600': 'IBMPlexSans_600SemiBold',
  '700': 'IBMPlexSans_700Bold',
  bold: 'IBMPlexSans_700Bold',
};

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

/**
 * A face do IBM Plex para o peso pedido no estilo. No Android o peso volta a
 * `normal`: cada face já é um arquivo com o peso certo, e um `fontWeight`
 * junto faria o sistema engrossar a face de novo.
 */
export function estiloDaFonteDoApp(
  style: unknown,
  platform: string = Platform.OS,
): { fontFamily: string; fontWeight?: 'normal' } {
  const fontFamily = FONT_WEIGHT_TO_FAMILY[resolveFontWeight(style)] ?? 'IBMPlexSans_400Regular';
  return platform === 'android' ? { fontFamily, fontWeight: 'normal' } : { fontFamily };
}

function comFonteDoApp<P extends { style?: unknown }>(Base: React.ComponentType<P>) {
  function ComFonteDoApp(props: P) {
    // `cssInterop: false`: o plugin Babel do NativeWind troca este
    // `createElement` por um que consulta `interopComponents`, e sem a marca o
    // `Base` (o `Text`) cairia de novo neste envoltório, num laço sem fim.
    return React.createElement(Base, {
      ...props,
      style: [props.style, estiloDaFonteDoApp(props.style)],
      cssInterop: false,
    } as P);
  }
  ComFonteDoApp.displayName = `ComFonteDoApp(${Base.displayName ?? Base.name ?? 'Componente'})`;
  return ComFonteDoApp;
}

/**
 * Chamar uma vez, quando as fontes já tiverem carregado (antes disso o texto
 * fica na fonte do sistema, nunca invisível). Os mapeamentos de `className`
 * são os mesmos que o NativeWind registra para esses componentes.
 */
let aplicada = false;

export function aplicarFonteDoApp(): void {
  // Uma vez só: registrar de novo criaria componentes novos, e o React
  // remontaria a árvore inteira de telas a cada render do layout raiz.
  if (aplicada) return;
  aplicada = true;
  interopComponents.set(
    Text,
    cssInterop(comFonteDoApp(Text as React.ComponentType<any>), { className: 'style' }),
  );
  interopComponents.set(
    TextInput,
    cssInterop(comFonteDoApp(TextInput as React.ComponentType<any>), {
      className: { target: 'style', nativeStyleToProp: { textAlign: true } },
    }),
  );
}
