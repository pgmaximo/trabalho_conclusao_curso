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
// Cores Principais (fonte: Canvas Claude Design, Tela 1a — specs/design/DESIGN_TOKENS.md):
// - Primary: Verde (#10794E) - Cor principal do app
// - Secondary: Azul (#1B63C4) - Cor secundária
// - Accent: Laranja (#FF6F00) - Cor de destaque
// - Neutral: Cinza (#363D3B / #55605C) - Cor neutra
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
  success: string;         // Sucesso (verde) — cor de texto/ícone
  successSoft: string;     // Sucesso suave — fundo de badge
  successIconBg: string;   // Sucesso — fundo do círculo de ícone
  successBadgeBorder: string; // Sucesso — borda de badge/pill
  warning: string;         // Alerta (âmbar) — cor de texto/ícone
  warningSoft: string;     // Alerta suave — fundo de badge
  warningIconBg: string;   // Alerta — fundo do círculo de ícone
  warningBadgeBorder: string; // Alerta — borda de badge/pill
  danger: string;          // Perigo (vermelho) — cor de texto/ícone
  dangerSoft: string;      // Perigo suave — fundo de badge
  dangerIconBg: string;    // Perigo — fundo do círculo de ícone
  dangerBadgeBorder: string; // Perigo — borda de badge/pill

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
  info: string;            // Informacao/azul — cor de texto/ícone
  infoSoft: string;        // Fundo informativo suave — fundo de badge
  infoIconBg: string;      // Informação — fundo do círculo de ícone
  infoBadgeBorder: string; // Informação — borda de badge/pill
  female: string;          // Destaque feminino quando necessario
  femaleSoft: string;      // Fundo feminino suave
  neutral: string;         // Neutro forte — cor de texto/ícone (badge "Pendente")
  neutralSoft: string;     // Fundo neutro suave — fundo de badge
  neutralBorder: string;   // Borda neutra
  neutralIconBg: string;   // Neutro — fundo do círculo de ícone
  neutralBadgeBorder: string; // Neutro — borda de badge/pill (alias de neutralBorder)
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
  sm: 12,    // Borda pequena (chip/badge pequeno)
  md: 18,    // Borda média
  lg: 24,    // Borda grande
  xl: 28,    // Borda extra grande (uso legado)
  field: 14, // Botão/campo (Canvas 1a — DESIGN_TOKENS.md §3)
  card: 20,  // Card padrão (Canvas 1a — DESIGN_TOKENS.md §3)
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
 * @param mode - Modo do tema ('light' ou 'dark')
 * @returns Objeto completo com todas as cores do tema
 */
function buildThemeColors(mode: PaletteMode): ThemeColors {
  return themeTokens[mode] as ThemeColors;
}

/**
 * Função para construir o sistema de tipografia baseado nas cores do tema
 * Escala nomeada de 7 estilos do Canvas 1a (specs/design/DESIGN_TOKENS.md §2):
 * Título 28/600, Subtítulo 22/600, Seção 20/600, Corpo 17/400 (piso mínimo),
 * Corpo forte 17/600, Apoio 16/400 (piso absoluto), Rótulo 14/600 + letter-spacing.
 * @param colors - Objeto de cores do tema
 * @returns Objeto com estilos de tipografia para diferentes usos
 */
function buildTypography(colors: ThemeColors) {
  return {
    // Título — títulos de tela ("Seus exames")
    titulo: {
      fontSize: 28,
      lineHeight: 35, // 28 * 1.25
      fontWeight: '600',
      color: colors.text,
    } satisfies TextStyle,

    // Subtítulo — títulos de card ("Entre na sua conta")
    subtitulo: {
      fontSize: 22,
      lineHeight: 29, // 22 * 1.3
      fontWeight: '600',
      color: colors.text,
    } satisfies TextStyle,

    // Seção — cabeçalhos de seção ("Próximas consultas")
    secao: {
      fontSize: 20,
      lineHeight: 26, // 20 * 1.3
      fontWeight: '600',
      color: colors.text,
    } satisfies TextStyle,

    // Corpo — texto corporal padrão. Piso mínimo: nunca abaixo de 17px.
    corpo: {
      fontSize: 17,
      lineHeight: 26, // 17 * 1.5
      fontWeight: '400',
      color: colors.textSecondary,
    } satisfies TextStyle,

    // Corpo forte — texto corporal com destaque ("Colesterol total: 186 mg/dL")
    corpoForte: {
      fontSize: 17,
      lineHeight: 26, // 17 * 1.5
      fontWeight: '600',
      color: colors.text,
    } satisfies TextStyle,

    // Apoio — texto secundário, datas, legendas. Piso absoluto: nunca abaixo de 16px.
    apoio: {
      fontSize: 16,
      lineHeight: 24, // 16 * 1.5
      fontWeight: '400',
      color: colors.textSecondary,
    } satisfies TextStyle,

    // Rótulo — SOMENTE labels de aba e tags
    rotulo: {
      fontSize: 14,
      lineHeight: 20, // 14 * 1.4
      fontWeight: '600',
      letterSpacing: 1.12, // 0.08em @ 14px
      color: colors.textSecondary,
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
  radius: 20,            // Raio de borda padrão (uso legado — telas não migradas nesta EPIC)
  cardRadius: RADII.card, // Raio para cards (20px, Canvas 1a)
  iconSize: 20,          // Tamanho padrão de ícones
};

// Exportação de estilos de fonte para uso direto com StyleSheet.create
// Fornece acesso rápido aos estilos de tipografia mais comuns.
// Inclui os 7 nomes canônicos do Canvas 1a + aliases legados (migração aditiva —
// mantidos para não quebrar telas que ainda não foram migradas para os nomes novos).
export const FONTS = StyleSheet.create({
  // Nomes canônicos (Canvas 1a — specs/design/DESIGN_TOKENS.md §2)
  titulo: LIGHT_THEME.typography.titulo,
  subtitulo: LIGHT_THEME.typography.subtitulo,
  secao: LIGHT_THEME.typography.secao,
  corpo: LIGHT_THEME.typography.corpo,
  corpoForte: LIGHT_THEME.typography.corpoForte,
  apoio: LIGHT_THEME.typography.apoio,
  rotulo: LIGHT_THEME.typography.rotulo,

  // Aliases legados (não remover — consumidos por telas fora do escopo desta EPIC)
  title: LIGHT_THEME.typography.titulo,     // Títulos grandes (28px/600)
  subtitle: LIGHT_THEME.typography.apoio,   // Subtítulos (16px/400)
  heading: LIGHT_THEME.typography.secao,    // Títulos de conteúdo (20px/600)
  body: LIGHT_THEME.typography.corpo,       // Texto corporal padrão (17px/400)
  bodyStrong: LIGHT_THEME.typography.corpoForte, // Texto corporal com destaque (17px/600)
  button: LIGHT_THEME.typography.corpoForte, // Texto de botões (17px/600)
  caption: LIGHT_THEME.typography.apoio,    // Legendas (16px/400 — piso absoluto)
});
