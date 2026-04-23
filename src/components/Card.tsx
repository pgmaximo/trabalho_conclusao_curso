// =============================================================================
// Arquivo: Card.tsx
// Descrição: Componente de cartão container com múltiplas variantes visuais
// Componente: Card
// =============================================================================
//
// Este componente implementa um container de cartão reutilizável com suporte
// para diferentes variantes visuais, tamanhos de padding e estilos customizados.
// É usado extensivamente para agrupar conteúdo em todo o aplicativo.
//
// Funcionalidades:
// - Múltiplas variantes visuais (surface, soft, outlined, accent)
// - Opções de padding (compact, regular, spacious)
// - Sombras e bordas automáticas
// - Totalmente customizável
// - Herda todas as props do View
//
// Variantes Visuais:
// - surface: Fundo branco com borda sutil
// - soft: Fundo suave com cor primária
// - outlined: Borda destacada
// - accent: Fundo com cor de destaque
//
// =============================================================================

// Importações necessárias
import React, { ReactNode } from 'react';  // React e tipo para children
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';  // Componentes UI

// Importações de tema
import { COLORS, RADII, SHADOWS, SPACING } from '@/constants/theme';

// Definição de tipos para as variantes do cartão
type CardVariant = 'surface' | 'soft' | 'outlined' | 'accent';  // Variantes visuais
type CardPadding = 'compact' | 'regular' | 'spacious';          // Opções de padding

// Props do componente Card
type CardProps = ViewProps & {  // Herda todas as props do View
  children: ReactNode;         // Conteúdo do cartão
  variant?: CardVariant;       // Variante visual (padrão: surface)
  padding?: CardPadding;       // Tamanho do padding (padrão: regular)
  style?: StyleProp<ViewStyle>; // Estilo customizado adicional
};

// Mapeamento de padding para cada variante
const PADDING_BY_VARIANT: Record<CardPadding, number> = {
  compact: SPACING.sm,   // Padding compacto
  regular: SPACING.md,   // Padding regular (padrão)
  spacious: SPACING.lg,  // Padding espaçoso
};

// Componente Card principal
export function Card({
  children,              // Conteúdo do cartão
  variant = 'surface',   // Variante visual padrão
  padding = 'regular',   // Padding padrão
  style,                 // Estilo customizado
  ...rest                // Outras props do View
}: CardProps) {
  // Renderiza o cartão com estilos combinados
  return (
    <View
      style={[
        styles.card,                    // Estilo base do cartão
        CARD_VARIANTS[variant],         // Estilo da variante específica
        { padding: PADDING_BY_VARIANT[padding] },  // Padding baseado na opção
        style,                          // Estilo customizado adicional
      ]}
      // Passa todas as outras props para o View
      {...rest}
    >
      {/* Renderiza o conteúdo passado como children */}
      {children}
    </View>
  );
}

// Definição de estilos para cada variante de cartão
const CARD_VARIANTS: Record<CardVariant, ViewStyle> = {
  // Variante surface: fundo branco com borda sutil
  surface: {
    backgroundColor: COLORS.surface,  // Fundo branco/cinza claro
    borderColor: COLORS.border,      // Borda cinza sutil
  },
  
  // Variante soft: fundo suave com cor primária
  soft: {
    backgroundColor: COLORS.primarySoft,  // Fundo verde suave
    borderColor: COLORS.primarySoft,      // Borda da mesma cor
  },
  
  // Variante outlined: borda destacada
  outlined: {
    backgroundColor: COLORS.surface,      // Fundo branco
    borderColor: COLORS.borderStrong,     // Borda mais escura e destacada
  },
  
  // Variante accent: fundo com cor de destaque
  accent: {
    backgroundColor: COLORS.accentSoft,    // Fundo laranja suave
    borderColor: COLORS.accentSoft,        // Borda da mesma cor
  },
};

// Estilos base do componente Card
const styles = StyleSheet.create({
  // Estilo base do cartão
  card: {
    borderRadius: RADII.xl,       // Borda arredondada grande
    borderWidth: 1,                // Largura da borda
    shadowColor: COLORS.shadow,   // Cor da sombra
    ...SHADOWS.card,              // Aplica sombra de cartão predefinida
  },
});
