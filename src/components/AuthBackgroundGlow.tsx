// =============================================================================
// Arquivo: AuthBackgroundGlow.tsx
// Descricao: Luz de fundo compartilhada para telas de autenticacao.
// =============================================================================

import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { useThemeColors } from '@/constants/theme';

type GlowCorner = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

type AuthBackgroundGlowProps = {
  corner: GlowCorner;
};

const GRADIENT_POINTS: Record<
  GlowCorner,
  {
    start: { x: number; y: number };
    end: { x: number; y: number };
  }
> = {
  topLeft: {
    start: { x: 1, y: 1 },
    end: { x: 0, y: 0 },
  },
  topRight: {
    start: { x: 0, y: 1 },
    end: { x: 1, y: 0 },
  },
  bottomLeft: {
    start: { x: 1, y: 0 },
    end: { x: 0, y: 1 },
  },
  bottomRight: {
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
};

export function AuthBackgroundGlow({ corner }: AuthBackgroundGlowProps) {
  const colors = useThemeColors();
  const points = GRADIENT_POINTS[corner];

  return (
    <LinearGradient
      colors={[colors.background, colors.surfaceMuted, colors.accentSoft]}
      end={points.end}
      pointerEvents="none"
      start={points.start}
      style={StyleSheet.absoluteFill}
    />
  );
}
