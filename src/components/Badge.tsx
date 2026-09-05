// =============================================================================
// Arquivo: Badge.tsx
// Descrição: Componente de badge/etiqueta com múltiplas variantes de cores
// Componente: Badge
// =============================================================================
//
// Este componente implementa um badge/etiqueta reutilizável com suporte para
// múltiplas variantes de cores. É usado extensivamente para status, categorias
// e informações contextuais em todo o aplicativo.
//
// Funcionalidades:
// - Texto label descritivo
// - Múltiplas variantes de cores temáticas
// - Design em formato de pílula (borda arredondada completa)
// - Ícone-circle colorido para as 5 famílias semânticas canônicas do Canvas 1a
//   (nunca cor sozinha — regra explícita de acessibilidade da Tela 1a)
// - Cores lidas via useThemeColors() — reativo a dark mode
//
// Variantes canônicas (Canvas 1a — specs/design/DESIGN_TOKENS.md §1/§4):
// - success: Normal/Em dia/Válida (verde) — ícone check
// - warning: Atenção/Estoque baixo (âmbar) — ícone alerta
// - danger: Alterado/Vencida (vermelho) — ícone triângulo
// - info: Agendado (azul) — ícone reticências
// - neutral: Pendente (cinza) — ícone relógio
//
// Variantes legadas mantidas como extensão local (fora do Canvas):
// - primary, secondary, accent
//
// =============================================================================

import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleProp, Text, View, ViewStyle } from 'react-native';

import { FONTS, RADII, SPACING, useThemeColors } from '@/constants/theme';

// Tipos de variantes suportadas — 5 canônicas do Canvas + 3 legadas (extensão local)
type BadgeVariant = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

// Props do componente Badge
type BadgeProps = {
  label: string;                    // Texto do badge
  variant?: BadgeVariant;          // Variante de cor (padrão: primary)
  style?: StyleProp<ViewStyle>;    // Estilo customizado adicional
};

// Ícones canônicos por variante semântica (glifo branco no círculo — Canvas 1a)
const SEMANTIC_ICON: Partial<Record<BadgeVariant, keyof typeof Ionicons.glyphMap>> = {
  success: 'checkmark',
  warning: 'alert',
  danger: 'warning',
  info: 'ellipsis-horizontal',
  neutral: 'time-outline',
};

// Componente Badge principal
export function Badge({
  label,                 // Texto do badge
  variant = 'primary',   // Variante padrão
  style,                 // Estilo customizado
}: BadgeProps) {
  const colors = useThemeColors();

  // Configuração de estilos por variante — construída a partir do tema reativo
  const badgeStyleByVariant: Record<BadgeVariant, { backgroundColor: string; color: string; iconBg?: string }> = {
    primary: { backgroundColor: colors.primarySoft, color: colors.primary },
    secondary: { backgroundColor: colors.secondarySoft, color: colors.secondary },
    accent: { backgroundColor: colors.accentSoft, color: colors.accent },
    success: { backgroundColor: colors.successSoft, color: colors.success, iconBg: colors.successIconBg },
    warning: { backgroundColor: colors.warningSoft, color: colors.warning, iconBg: colors.warningIconBg },
    danger: { backgroundColor: colors.dangerSoft, color: colors.danger, iconBg: colors.dangerIconBg },
    info: { backgroundColor: colors.infoSoft, color: colors.info, iconBg: colors.infoIconBg },
    neutral: { backgroundColor: colors.neutralSoft, color: colors.neutral, iconBg: colors.neutralIconBg },
  };

  const variantStyle = badgeStyleByVariant[variant];
  const iconName = SEMANTIC_ICON[variant];

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: RADII.pill,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.xs,
          gap: SPACING.xs,
          backgroundColor: variantStyle.backgroundColor,
        },
        style,
      ]}
    >
      {iconName && variantStyle.iconBg ? (
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: RADII.pill,
            backgroundColor: variantStyle.iconBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons color="#FFFFFF" name={iconName} size={10} />
        </View>
      ) : null}
      <Text style={[FONTS.caption, { fontWeight: '700', color: variantStyle.color }]}>{label}</Text>
    </View>
  );
}
