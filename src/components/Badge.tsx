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
// - Totalmente customizável via props
// - Cores de fundo e texto otimizadas para legibilidade
//
// Variantes Disponíveis:
// - primary: Verde claro com texto verde
// - secondary: Azul claro com texto azul
// - accent: Laranja claro com texto laranja
// - success: Verde claro com texto verde
// - danger: Vermelho claro com texto vermelho
// - neutral: Cinza claro com texto cinza
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';  // Componentes UI

// Importações de tema
import { COLORS, FONTS, RADII, SPACING } from '@/constants/theme';  // Configurações

// Tipos de variantes suportadas
type BadgeVariant = 'primary' | 'secondary' | 'accent' | 'success' | 'danger' | 'neutral';

// Props do componente Badge
type BadgeProps = {
  label: string;                    // Texto do badge
  variant?: BadgeVariant;          // Variante de cor (padrão: primary)
  style?: StyleProp<ViewStyle>;    // Estilo customizado adicional
};

// Configuração de estilos para cada variante
const BADGE_STYLES: Record<BadgeVariant, { backgroundColor: string; color: string }> = {
  primary: { 
    backgroundColor: COLORS.primarySoft,  // Fundo verde suave
    color: COLORS.primary                 // Texto verde
  },
  secondary: { 
    backgroundColor: COLORS.secondarySoft, // Fundo azul suave
    color: COLORS.secondary               // Texto azul
  },
  accent: { 
    backgroundColor: COLORS.accentSoft,    // Fundo laranja suave
    color: COLORS.accent                  // Texto laranja
  },
  success: { 
    backgroundColor: COLORS.successSoft,   // Fundo verde suave
    color: COLORS.success                 // Texto verde
  },
  danger: { 
    backgroundColor: COLORS.dangerSoft,    // Fundo vermelho suave
    color: COLORS.danger                  // Texto vermelho
  },
  neutral: { 
    backgroundColor: COLORS.surfaceMuted, // Fundo cinza suave
    color: COLORS.textSecondary           // Texto cinza
  },
};

// Componente Badge principal
export function Badge({ 
  label,                 // Texto do badge
  variant = 'primary',   // Variante padrão
  style                 // Estilo customizado
}: BadgeProps) {
  // Obtém configuração de cores baseada na variante
  const variantStyle = BADGE_STYLES[variant];

  // Renderiza o badge
  return (
    <View style={[
      styles.badge,                                    // Estilo base do badge
      { backgroundColor: variantStyle.backgroundColor }, // Cor de fundo da variante
      style                                          // Estilo customizado adicional
    ]}>
      <Text style={[
        styles.label,                    // Estilo base do texto
        { color: variantStyle.color }   // Cor do texto da variante
      ]}>
        {label}
      </Text>
    </View>
  );
}

// Estilos do componente Badge
const styles = StyleSheet.create({
  // Container principal do badge
  badge: {
    alignSelf: 'flex-start',         // Alinha ao início (não estica)
    borderRadius: RADII.pill,       // Borda arredondada completa (pílula)
    paddingHorizontal: SPACING.md,   // Padding horizontal
    paddingVertical: SPACING.xs,    // Padding vertical
  },
  
  // Estilo do texto do badge
  label: {
    ...FONTS.caption,               // Usa fonte caption do tema
    fontWeight: '700',              // Peso negrito para destaque
  },
});
