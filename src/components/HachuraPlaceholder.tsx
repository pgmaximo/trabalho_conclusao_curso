// =============================================================================
// Arquivo: HachuraPlaceholder.tsx
// Descrição: Container com fundo hachurado (listras diagonais), reproduzindo o
// `repeating-linear-gradient(135deg,#EFF1F0 0 10px,#F7F8F7 10px 20px)` usado no
// Canvas para os placeholders decorativos de pré-visualização de arquivo (3b/3c) —
// ver specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html linhas
// 298/332. Usa react-native-svg (GAP_ANALYSIS.md #30) por não haver como expressar
// um padrão de listras repetidas via `expo-linear-gradient` (só 2 cores, sem repeat).
// =============================================================================

import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

type HachuraPlaceholderProps = {
  /** Altura fixa (px). Omitir deixa a altura ser definida pelo conteúdo/padding via `style`. */
  height?: number;
  borderRadius: number;
  bgColor: string;
  stripeColor: string;
  borderColor: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Tamanho do ladrilho do padrão — replica a proporção 10px/10px do Canvas
// (duas faixas de 10px cada, giradas 45° para o efeito diagonal).
const TILE_SIZE = 20;

export function HachuraPlaceholder({
  height,
  borderRadius,
  bgColor,
  stripeColor,
  borderColor,
  children,
  style,
}: HachuraPlaceholderProps) {
  return (
    <View
      style={[
        {
          ...(height !== undefined ? { height } : null),
          borderRadius,
          borderWidth: 1.5,
          borderColor,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Svg height="100%" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} width="100%">
        <Defs>
          <Pattern
            height={TILE_SIZE}
            id="hachuraStripe"
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
            width={TILE_SIZE}
          >
            <Rect fill={bgColor} height={TILE_SIZE} width={TILE_SIZE} x={0} y={0} />
            <Rect fill={stripeColor} height={TILE_SIZE} width={TILE_SIZE / 2} x={0} y={0} />
          </Pattern>
        </Defs>
        <Rect fill="url(#hachuraStripe)" height="100%" width="100%" x={0} y={0} />
      </Svg>
      {children}
    </View>
  );
}
