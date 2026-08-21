// =============================================================================
// Arquivo: ExamItem.tsx
// Descrição: Componente de item para exibir documentos médicos (exames, receitas)
// Componente: ExamItem
// =============================================================================
//
// Este componente implementa um item para exibir documentos médicos com ícone,
// título, linha de meta (tipo · data) e um badge de status opcional. É usado na
// tela de exames para mostrar diferentes tipos de documentos médicos.
//
// Funcionalidades:
// - Ícone vetorial (Ionicons) representativo do tipo de documento
// - Título com elipse e linha de meta em texto simples ("Exame · 12/08/2026")
// - Badge de status (pill ícone-círculo + texto) — Canvas 3a, só renderizado
//   quando há dado real de validade (receitas); ausente para exames (nenhuma
//   fonte real de resultado clínico hoje, ver plan.md §2 do EPIC 3a)
// - Indicador de navegação (chevron) à direita
// - Feedback visual ao pressionar
// - Layout horizontal robusto para telas estreitas
//
// =============================================================================

// Importações necessárias
import React, { useMemo } from 'react';        // Biblioteca principal React
import { View, Text, Pressable, StyleSheet } from 'react-native';  // Componentes UI
import Ionicons from '@expo/vector-icons/Ionicons';  // Ícones vetoriais do projeto

// Importações de tema
import { FONTS, SIZES, useThemeColors, type ThemeColors } from '@/constants/theme';  // Configurações
import type { DocumentValidityStatus } from '@/types/models';

// Props do componente ExamItem
type ExamItemProps = {
  icon: string;                    // Nome do Ionicon (ex: "flask-outline") ou emoji legado
  title: string;                   // Título/nome do documento
  subtitle: string;                // Linha de meta já composta ("Exame · 12/08/2026")
  documentType: 'exam' | 'prescription'; // Tipo real do documento — usado só para resolver a
                                          // cor de destaque do ícone (accent, não é status);
                                          // a cor de verdade é resolvida via useThemeColors()
                                          // abaixo, nunca hardcoded, para respeitar dark mode.
  validityStatus?: DocumentValidityStatus | null; // Badge de status — só receitas têm dado real
  onPress?: () => void;            // Callback ao pressionar o item
};

// Detecta nomes de Ionicon (ASCII com hífen) vs emoji legado — mesmo padrão de EmptyState
function isIoniconName(icon: string): boolean {
  return /^[a-z0-9-]+$/.test(icon);
}

// Cor de destaque do ícone por tipo de documento, resolvida a partir dos tokens de tema
// (nunca hex fixo) — âmbar/warning para exame, azul/secondary para receita.
function getIconAccentColor(colors: ThemeColors, documentType: 'exam' | 'prescription'): string {
  return documentType === 'exam' ? colors.warning : colors.secondary;
}

// Configuração visual do badge de validade — 2 dos 5 tokens semânticos canônicos de
// DESIGN_TOKENS.md §1 (Válida=azul/info, Vencida=cinza-neutro), conforme Canvas 3a §3.
function getValidityBadgeConfig(colors: ThemeColors, status: DocumentValidityStatus) {
  if (status === 'valida') {
    return {
      label: 'Válida',
      icon: 'checkmark-circle' as const,
      textColor: colors.info,
      bg: colors.infoSoft,
      border: colors.infoBadgeBorder,
    };
  }
  return {
    label: 'Vencida',
    icon: 'time-outline' as const,
    textColor: colors.neutral,
    bg: colors.neutralSoft,
    border: colors.neutralBadgeBorder,
  };
}

// Componente ExamItem principal
export function ExamItem({
  icon,                    // Ícone do documento
  title,                   // Título
  subtitle,                // Linha de meta (tipo · data)
  documentType,             // Tipo real do documento — resolve a cor de destaque do ícone
  validityStatus,           // Status de validade (badge), quando existir
  onPress,                 // Callback de pressão
}: ExamItemProps) {
  // Cores do tema atual (claro/escuro) e estilos derivados
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const badge = validityStatus ? getValidityBadgeConfig(colors, validityStatus) : null;
  const iconColor = getIconAccentColor(colors, documentType);

  // Renderiza o item de documento
  return (
    <Pressable
      // Aplica estilos com feedback de pressed
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress}                // Callback de pressão
    >
      {/* Container do ícone com fundo tonal do tipo */}
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}1A` }]}>
        {isIoniconName(icon) ? (
          <Ionicons name={icon as never} size={22} color={iconColor} />
        ) : (
          <Text style={styles.iconEmoji}>{icon}</Text>
        )}
      </View>

      {/* Área principal com título e linha de meta */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      {/* Badge de status de validade (só quando há dado real) */}
      {badge ? (
        <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
          <Ionicons name={badge.icon} size={14} color={badge.textColor} />
          <Text style={[styles.badgeText, { color: badge.textColor }]}>{badge.label}</Text>
        </View>
      ) : null}

      {/* Indicador de navegação */}
      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.iconMuted}
        style={styles.chevron}
      />
    </Pressable>
  );
}

// Estilos do componente ExamItem (derivados do tema atual)
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  // Container principal do item
  container: {
    flexDirection: 'row',           // Layout horizontal
    alignItems: 'center',          // Centraliza verticalmente
    backgroundColor: colors.surface, // Fundo do card conforme tema
    borderRadius: SIZES.radius,      // Borda arredondada
    borderCurve: 'continuous',       // Cantos suaves (iOS)
    borderWidth: 1,                  // Contorno explícito define a caixa no mobile
    borderColor: colors.border,      // Cor da borda conforme tema
    padding: SIZES.base,           // Padding interno
    marginBottom: SIZES.small,      // Margem inferior para espaçamento
    gap: SIZES.small,               // Espaço entre ícone, conteúdo e chevron
    boxShadow: `0px 2px 6px ${colors.shadow}0F`,
  },

  // Estilo quando item é pressionado
  pressed: {
    opacity: 0.85,                  // Reduz opacidade para feedback visual
  },

  // Container do ícone
  iconContainer: {
    width: 48,                      // Largura do container
    height: 48,                     // Altura do container
    borderRadius: 14,               // Borda arredondada
    borderCurve: 'continuous',      // Cantos suaves (iOS)
    alignItems: 'center',          // Centraliza horizontalmente
    justifyContent: 'center',       // Centraliza verticalmente
  },

  // Ícone emoji (fallback legado)
  iconEmoji: {
    fontSize: 22,                   // Tamanho do emoji
  },

  // Área de conteúdo principal — encolhe para não estourar a largura
  content: {
    flex: 1,                        // Ocupa espaço disponível
    flexShrink: 1,                  // Permite truncar em telas estreitas
    minWidth: 0,                    // Garante elipse no título
  },

  // Título do documento
  title: {
    ...FONTS.body,                  // Usa fonte body do tema
    fontWeight: '600',              // Peso semi-negrito
    color: colors.text,             // Cor principal do texto
  },

  // Linha de meta ("Exame · 12/08/2026")
  meta: {
    ...FONTS.caption,               // Usa fonte caption do tema
    color: colors.textSecondary,    // Cor secundária do texto
    marginTop: 4,
  },

  // Badge de status de validade (pill ícone-círculo + texto)
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
  },

  // Texto do badge de status — piso tipográfico "Apoio" (16px/400, DESIGN_TOKENS.md §2),
  // mesma convenção usada por Badge.tsx via FONTS.caption.
  badgeText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },

  // Indicador de navegação
  chevron: {
    flexShrink: 0,                  // Mantém o tamanho
  },
});
