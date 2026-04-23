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

// Modos de tema suportados
type PaletteMode = 'light' | 'dark';

// Paleta de cores base (usada para construir temas)
type ThemePalette = {
  primary: string;         // Cor primária
  primarySurface: string;  // Superfície primária
  secondary: string;      // Cor secundária
  accent: string;         // Cor de destaque
  neutral: string;        // Cor neutra
  background: string;     // Cor de fundo
  text: string;           // Cor do texto
};

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
};

// Definição completa do tema
type ThemeDefinition = {
  colors: ThemeColors;                    // Sistema de cores
  typography: Record<string, TextStyle>;   // Sistema de tipografia
};

// Paleta de cores para modo light
const LIGHT_PALETTE: ThemePalette = {
  primary: '#1D9E75',        // Verde principal - cor principal do app
  primarySurface: '#E1F5EE', // Verde muito claro para superfícies
  secondary: '#185FA5',      // Azul secundário para elementos secundários
  accent: '#D85A30',         // Laranja para destaques e CTAs
  neutral: '#F1EFE8',        // Cinza muito claro para neutros
  background: '#F1EFE8',     // Fundo principal (claro)
  text: '#2C2C2A',          // Texto principal (escuro)
};

// Paleta de cores para modo dark
const DARK_PALETTE: ThemePalette = {
  primary: '#1D9E75',        // Verde principal - mantido para consistência
  primarySurface: '#085041', // Verde escuro para superfícies
  secondary: '#378ADD',      // Azul mais claro para modo dark
  accent: '#F0997B',         // Laranja mais claro para modo dark
  neutral: '#1A1F1C',        // Cinza escuro para neutros
  background: '#1A1F1C',     // Fundo principal (escuro)
  text: '#E8E8E4',          // Texto principal (claro)
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
    shadowOffset: { width: 0, height: 4 },  // Offset vertical
    shadowOpacity: 0.08,                    // Opacidade suave
    shadowRadius: 10,                       // Raio da sombra
    elevation: 2,                           // Elevação Android
  },
  // Sombra para cards principais
  card: {
    shadowOffset: { width: 0, height: 12 }, // Offset vertical maior
    shadowOpacity: 0.12,                    // Opacidade média
    shadowRadius: 22,                       // Raio maior
    elevation: 5,                           // Elevação Android maior
  },
};

/**
 * Função para construir o sistema completo de cores baseado na paleta e modo
 * @param palette - Paleta de cores base (LIGHT_PALETTE ou DARK_PALETTE)
 * @param mode - Modo do tema ('light' ou 'dark')
 * @returns Objeto completo com todas as cores do tema
 */
function buildThemeColors(palette: ThemePalette, mode: PaletteMode): ThemeColors {
  // Constrói cores para modo dark
  if (mode === 'dark') {
    return {
      // Cores de fundo e superfícies
      background: palette.background,      // Fundo escuro da paleta
      surface: '#202622',                 // Superfície escura
      surfaceMuted: '#26312C',            // Superfície ainda mais escura
      
      // Cores primárias
      primary: palette.primary,           // Verde principal
      primaryDark: '#0A3D32',             // Verde mais escuro
      primarySoft: palette.primarySurface, // Verde suave da paleta
      
      // Cores secundárias
      secondary: palette.secondary,       // Azul da paleta
      secondarySoft: '#1E3654',           // Azul suave escuro
      
      // Cores de destaque
      accent: palette.accent,             // Laranja da paleta
      accentSoft: '#5C3021',              // Laranja suave escuro
      
      // Cores de status
      success: palette.primary,           // Sucesso usa verde
      successSoft: '#0C4537',             // Verde suave escuro
      warning: palette.accent,            // Alerta usa laranja
      warningSoft: '#5B3A2F',             // Laranja suave escuro
      danger: '#F0997B',                  // Perigo rosa claro
      dangerSoft: '#5C2F25',              // Perigo suave escuro
      
      // Cores de texto
      text: palette.text,                 // Texto claro da paleta
      textSecondary: '#B9C0BB',          // Texto secundário
      textMuted: '#919992',              // Texto mutado
      
      // Cores de interface
      placeholder: '#798179',            // Placeholder escuro
      border: '#324039',                 // Borda escura
      borderStrong: '#496158',           // Borda mais forte
      inputBackground: '#212B27',        // Fundo de inputs escuro
      overlay: '#00000099',              // Sobreposição preta
      shadow: '#000000',                 // Sombra preta
    };
  }

  // Constrói cores para modo light (padrão)
  return {
    // Cores de fundo e superfícies
    background: palette.background,      // Fundo claro da paleta
    surface: '#FFFFFF',                 // Superfície branca
    surfaceMuted: '#F8F7F3',            // Superfície suave
    
    // Cores primárias
    primary: palette.primary,           // Verde principal
    primaryDark: '#147657',             // Verde mais escuro
    primarySoft: palette.primarySurface, // Verde suave da paleta
    
    // Cores secundárias
    secondary: palette.secondary,       // Azul da paleta
    secondarySoft: '#EAF3FB',           // Azul suave claro
    
    // Cores de destaque
    accent: palette.accent,             // Laranja da paleta
    accentSoft: '#FDEDE6',              // Laranja suave claro
    
    // Cores de status
    success: palette.primary,           // Sucesso usa verde
    successSoft: '#E7F7F1',             // Verde suave claro
    warning: palette.accent,            // Alerta usa laranja
    warningSoft: '#FDEDE6',             // Laranja suave claro
    danger: '#B5412A',                  // Perigo vermelho
    dangerSoft: '#FCE8E1',              // Perigo suave claro
    
    // Cores de texto
    text: palette.text,                 // Texto escuro da paleta
    textSecondary: '#5A625D',           // Texto secundário
    textMuted: '#7D857F',
    placeholder: '#8B938D',
    border: '#D6D8D1',
    borderStrong: '#BDC5BF',
    inputBackground: '#FCFBF8',
    overlay: '#10141266',
    shadow: '#10211A',
  };
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
  // Seleciona a paleta baseada no modo
  const palette = mode === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
  
  // Constrói o sistema completo de cores
  const colors = buildThemeColors(palette, mode);

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
