// =============================================================================
// Arquivo: theme.ts
// Descrição: Sistema de temas completo com cores, tipografia e espaçamento
// =============================================================================
//
// Este arquivo implementa um sistema completo de temas para o aplicativo,
// incluindo cores light/dark, tipografia, espaçamento, bordas e sombras.
// Suporta múltiplos modos e fornece uma base consistente para todo o design.
//
// Estrutura Principal:
// - Paletas de cores (light/dark)
// - Sistema de cores completo (ThemeColors)
// - Tipografia com múltiplos estilos
// - Espaçamento, bordas e sombras
// - Funções de construção de temas
//
// Cores Principais:
// - Primary: Verde (#1D9E75) - Cor principal do app
// - Secondary: Azul (#185FA5) - Cor secundária
// - Accent: Laranja (#D85A30) - Cor de destaque
// - Neutral: Cinza (#F1EFE8) - Cor neutra
//
// =============================================================================

import { StyleSheet, TextStyle } from 'react-native';

import themeTokens from './themeTokens.json';
import { useThemeContext } from '@/contexts/ThemeContext';

// Modos de tema suportados
type PaletteMode = 'light' | 'dark';

// Sistema completo de cores do tema
export type ThemeColors = {
  // Cores de fundo e superfícies
  background: string;      // Fundo principal
  surface: string;         // Superfície de cards
  surfaceMuted: string;    // Superfície suave
  
  // Cores primárias
  primary: string;         // Primária principal
  primaryDark: string;     // Primária escura
  primarySoft: string;     // Primária suave
  
  // Cores secundárias
  secondary: string;       // Secundária principal
  secondarySoft: string;   // Secundária suave
  
  // Cores de destaque
  accent: string;          // Destaque principal
  accentSoft: string;      // Destaque suave
  
  // Cores de status
  success: string;         // Sucesso (verde)
  successSoft: string;     // Sucesso suave
  warning: string;         // Alerta (laranja)
  warningSoft: string;     // Alerta suave
  danger: string;          // Perigo (vermelho)
  dangerSoft: string;      // Perigo suave
  
  // Cores de texto
  text: string;            // Texto principal
  textSecondary: string;   // Texto secundário
  textMuted: string;       // Texto mutado
  
  // Cores de interface
  placeholder: string;     // Placeholder de inputs
  border: string;          // Borda padrão
  borderStrong: string;   // Borda forte
  inputBackground: string; // Fundo de inputs
  overlay: string;         // Sobreposição
  shadow: string;          // Cor da sombra
  onPrimary: string;       // Texto/icone sobre a cor primaria
  surfaceTranslucent: string; // Superficie translucida
  iconMuted: string;       // Icones secundarios
  borderLight: string;     // Borda sutil
  info: string;            // Informacao/azul
  infoSoft: string;        // Fundo informativo suave
  female: string;          // Destaque feminino quando necessario
  femaleSoft: string;      // Fundo feminino suave
  neutral: string;         // Neutro forte
  neutralSoft: string;     // Fundo neutro suave
  neutralBorder: string;   // Borda neutra
  noticeSoft: string;      // Fundo de avisos informativos
  noticeBorder: string;    // Borda de avisos informativos
  footer: string;          // Fundo de rodape flutuante
  progressTrack: string;   // Trilho de progresso
  homeIndicator: string;   // Indicador visual inferior
};

// Definição completa do tema
type ThemeDefinition = {
  colors: ThemeColors;                    // Sistema de cores
  typography: Record<string, TextStyle>;   // Sistema de tipografia
};

// Sistema de espaçamento consistente (em pixels)
export const SPACING = {
  xxs: 4,    // Espaçamento extra pequeno
  xs: 8,     // Espaçamento pequeno
  sm: 12,    // Espaçamento pequeno-médio
  md: 16,    // Espaçamento médio (base)
  lg: 24,    // Espaçamento grande
  xl: 32,    // Espaçamento extra grande
  xxl: 40,   // Espaçamento extra extra grande
};

// Sistema de bordas arredondadas (em pixels)
export const RADII = {
  sm: 12,    // Borda pequena
  md: 18,    // Borda média
  lg: 24,    // Borda grande
  xl: 28,    // Borda extra grande
  pill: 999, // Borda completa (pílula)
};

// Sistema de sombras para diferentes elementos
export const SHADOWS = {
  // Sombra sutil para elementos leves
  subtle: {
    boxShadow: '0px 4px 10px rgba(16, 33, 26, 0.08)', // Sombra web moderna
    elevation: 2,                                             // Elevação Android
  },
  // Sombra para cards principais
  card: {
    boxShadow: '0px 12px 22px rgba(16, 33, 26, 0.12)', // Sombra web moderna
    elevation: 5,                                             // Elevação Android maior
  },
};

/**
 * Função para construir o sistema completo de cores baseado na paleta e modo
 * @param palette - Paleta de cores base (LIGHT_PALETTE ou DARK_PALETTE)
 * @param mode - Modo do tema ('light' ou 'dark')
 * @returns Objeto completo com todas as cores do tema
 */
function buildThemeColors(mode: PaletteMode): ThemeColors {
  return themeTokens[mode] as ThemeColors;
}

/**
 * Função para construir o sistema de tipografia baseado nas cores do tema
 * @param colors - Objeto de cores do tema
 * @returns Objeto com estilos de tipografia para diferentes usos
 */
function buildTypography(colors: ThemeColors) {
  return {
    // Display - Títulos maiores e impactantes
    display: {
      fontSize: 34,                   // Tamanho extra grande
      lineHeight: 40,                 // Altura da linha proporcional
      fontWeight: '700',              // Peso negrito extra
      color: colors.text,             // Cor principal do texto
    } satisfies TextStyle,
    
    // Title - Títulos de seções
    title: {
      fontSize: 30,                   // Tamanho grande
      lineHeight: 36,                 // Altura da linha
      fontWeight: '700',              // Peso negrito extra
      color: colors.text,             // Cor principal do texto
    } satisfies TextStyle,
    
    // Heading - Títulos de conteúdo
    heading: {
      fontSize: 20,                   // Tamanho médio-grande
      lineHeight: 26,                 // Altura da linha
      fontWeight: '700',              // Peso negrito extra
      color: colors.text,             // Cor principal do texto
    } satisfies TextStyle,
    
    // Subheading - Subtítulos
    subheading: {
      fontSize: 16,                   // Tamanho médio
      lineHeight: 22,                 // Altura da linha
      fontWeight: '600',              // Peso semi-negrito
      color: colors.text,             // Cor principal do texto
    } satisfies TextStyle,
    
    // Body - Texto corporal padrão
    body: {
      fontSize: 15,                   // Tamanho de texto padrão
      lineHeight: 22,                 // Altura da linha
      color: colors.textSecondary,    // Cor secundária para menos destaque
    } satisfies TextStyle,
    
    // BodyStrong - Texto corporal com destaque
    bodyStrong: {
      fontSize: 15,                   // Tamanho de texto padrão
      lineHeight: 22,                 // Altura da linha
      fontWeight: '600',              // Peso semi-negrito
      color: colors.text,             // Cor principal para destaque
    } satisfies TextStyle,
    
    // Button - Texto de botões
    button: {
      fontSize: 16,                   // Tamanho médio para botões
      lineHeight: 20,                 // Altura da linha compacta
      fontWeight: '600',              // Peso semi-negrito
      color: colors.text,             // Cor principal
    } satisfies TextStyle,
    
    // Caption - Legendas e textos pequenos
    caption: {
      fontSize: 13,                   // Tamanho pequeno
      lineHeight: 18,                 // Altura da linha
      color: colors.textMuted,        // Cor mutada para menos destaque
    } satisfies TextStyle,
    
    // Overline - Texto sobreposto (badges, labels)
    overline: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '700',
      letterSpacing: 0.3,
      color: colors.textMuted,
      textTransform: 'uppercase',
    } satisfies TextStyle,
  };
}

/**
 * Função principal para construir um tema completo baseado no modo
 * @param mode - Modo do tema ('light' ou 'dark')
 * @returns Objeto completo do tema com cores e tipografia
 */
function buildTheme(mode: PaletteMode): ThemeDefinition {
  // Constrói o sistema completo de cores
  const colors = buildThemeColors(mode);

  // Retorna o tema completo com cores e tipografia
  return {
    colors,                           // Sistema de cores
    typography: buildTypography(colors), // Sistema de tipografia baseado nas cores
  };
}

// Temas pré-construídos para uso imediato
export const LIGHT_THEME = buildTheme('light');  // Tema claro (padrão)
export const DARK_THEME = buildTheme('dark');    // Tema escuro

/**
 * Função utilitária para obter o tema baseado no modo
 * @param mode - Modo do tema (padrão: 'light')
 * @returns Objeto do tema correspondente
 */
export function getTheme(mode: PaletteMode = 'light') {
  return mode === 'dark' ? DARK_THEME : LIGHT_THEME;
}

export function useThemeColors() {
  const { colorScheme } = useThemeContext();
  return getTheme(colorScheme).colors;
}

// Exportação das cores do tema light para uso direto
export const COLORS = LIGHT_THEME.colors;

// Sistema de tamanhos padrão para componentes
export const SIZES = {
  base: SPACING.md,      // Tamanho base (16px)
  small: SPACING.sm,     // Tamanho pequeno (12px)
  medium: 18,            // Tamanho médio (18px)
  large: SPACING.lg,     // Tamanho grande (24px)
  radius: 20,            // Raio de borda padrão
  cardRadius: RADII.xl,  // Raio para cards
  iconSize: 20,          // Tamanho padrão de ícones
};

// Exportação de estilos de fonte para uso direto com StyleSheet.create
// Fornece acesso rápido aos estilos de tipografia mais comuns
export const FONTS = StyleSheet.create({
  title: LIGHT_THEME.typography.title,     // Títulos grandes (30px)
  subtitle: LIGHT_THEME.typography.body,   // Subtítulos (15px)
  heading: LIGHT_THEME.typography.heading, // Títulos de conteúdo (20px)
  body: LIGHT_THEME.typography.body,       // Texto corporal padrão (15px)
  button: LIGHT_THEME.typography.button,   // Texto de botões (16px)
  caption: LIGHT_THEME.typography.caption, // Legendas (13px)
});
