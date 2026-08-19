// =============================================================================
// Arquivo: ExamItem.tsx
// Descrição: Componente de item para exibir documentos médicos (exames, receitas, laudos)
// Componente: ExamItem
// =============================================================================
//
// Este componente implementa um item para exibir documentos médicos com ícone,
// título, chip de tipo e data. É usado na tela de exames para mostrar
// diferentes tipos de documentos médicos.
//
// Funcionalidades:
// - Ícone vetorial (Ionicons) representativo do tipo de documento
// - Título com elipse e linha de meta (chip de tipo + data)
// - Indicador de navegação (chevron) à direita
// - Feedback visual ao pressionar
// - Layout horizontal robusto para telas estreitas
//
// Tipos de Documentos:
// - exam: Exames laboratoriais e imagens
// - prescription: Receitas médicas
// - report: Laudos e resultados
//
// =============================================================================

// Importações necessárias
import React, { useMemo } from 'react';        // Biblioteca principal React
import { View, Text, Pressable, StyleSheet } from 'react-native';  // Componentes UI
import Ionicons from '@expo/vector-icons/Ionicons';  // Ícones vetoriais do projeto

// Importações de tema
import { FONTS, SIZES, useThemeColors, type ThemeColors } from '@/constants/theme';  // Configurações

// Exportação do tipo para uso em outros componentes
export type ExamItemType = 'exam' | 'prescription' | 'report';

// Props do componente ExamItem
type ExamItemProps = {
  icon: string;                    // Nome do Ionicon (ex: "flask-outline") ou emoji legado
  title: string;                   // Título/nome do documento
  subtitle: string;                // Subtítulo (data do documento)
  statusLabel: string;             // Texto do tipo (ex: "Exame", "Receita")
  statusColor: string;              // Cor de destaque do tipo
  onPress?: () => void;            // Callback ao pressionar o item
};

// Detecta nomes de Ionicon (ASCII com hífen) vs emoji legado — mesmo padrão de EmptyState
function isIoniconName(icon: string): boolean {
  return /^[a-z0-9-]+$/.test(icon);
}

// Componente ExamItem principal
export function ExamItem({
  icon,                    // Ícone do documento
  title,                   // Título
  subtitle,                // Subtítulo (data)
  statusLabel,             // Label do tipo
  statusColor,             // Cor do tipo
  onPress,                 // Callback de pressão
}: ExamItemProps) {
  // Cores do tema atual (claro/escuro) e estilos derivados
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Renderiza o item de documento
  return (
    <Pressable
      // Aplica estilos com feedback de pressed
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress}                // Callback de pressão
    >
      {/* Container do ícone com fundo tonal do tipo */}
      <View style={[styles.iconContainer, { backgroundColor: `${statusColor}1A` }]}>
        {isIoniconName(icon) ? (
          <Ionicons name={icon as never} size={22} color={statusColor} />
        ) : (
          <Text style={styles.iconEmoji}>{icon}</Text>
        )}
      </View>

      {/* Área principal com título e linha de meta */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.typeChip, { backgroundColor: `${statusColor}1A` }]}>
            <Text style={[styles.typeChipText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <Text style={styles.date} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>

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

  // Linha de meta (chip de tipo + data)
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.small,
    marginTop: 4,
  },

  // Chip do tipo de documento
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,              // Pílula
    flexShrink: 0,                  // Não encolhe
  },

  // Texto do chip de tipo
  typeChipText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },

  // Data do documento
  date: {
    ...FONTS.caption,               // Usa fonte caption do tema
    color: colors.textSecondary,    // Cor secundária do texto
    flexShrink: 1,                  // Trunca antes do chip
  },

  // Indicador de navegação
  chevron: {
    flexShrink: 0,                  // Mantém o tamanho
  },
});
