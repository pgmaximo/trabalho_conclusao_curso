// =============================================================================
// Arquivo: ScreenHeader.tsx
// Descrição: Componente de cabeçalho padrão para telas do aplicativo
// Componente: ScreenHeader
// =============================================================================
//
// Este componente implementa o cabeçalho padrão usado em todas as telas do
// aplicativo. Ele suporta título, subtítulo, badge informativo e área de
// ação (geralmente para botões ou ícones).
//
// Funcionalidades:
// - Título principal da tela
// - Subtítulo opcional para contexto adicional
// - Badge com múltiplas variantes para status ou categorias
// - Área de ação para botões ou controles
// - Layout responsivo com espaçamento adequado
//
// Estrutura:
// - Container horizontal com título/badge à esquerda e ação à direita
// - Título grande e destacado
// - Subtítulo menor abaixo do título
// - Badge abaixo do subtítulo quando presente
//
// =============================================================================

// Importações necessárias
import React, { ReactNode } from 'react';  // React e tipo para children
import { StyleSheet, Text, View } from 'react-native';  // Componentes UI básicos

// Importações de componentes e tema
import { Badge } from '@/components/Badge';  // Componente de badge
import { COLORS, FONTS, SPACING } from '@/constants/theme';  // Configurações de tema

// Props do componente ScreenHeader
type ScreenHeaderProps = {
  title: string;    // Título principal da tela
  subtitle?: string;  // Subtítulo opcional para contexto
  badgeLabel?: string;  // Texto do badge opcional
  badgeVariant?: 'primary' | 'secondary' | 'accent' | 'success' | 'danger' | 'neutral';  // Variante do badge
  action?: ReactNode;  // Componente de ação (botão, ícone, etc.)
};

// Componente ScreenHeader principal
export function ScreenHeader({
  title,              // Título da tela
  subtitle,           // Subtítulo opcional
  badgeLabel,         // Label do badge opcional
  badgeVariant = 'primary',  // Variante do badge (padrão: primary)
  action,             // Componente de ação opcional
}: ScreenHeaderProps) {
  // Renderiza o cabeçalho com layout horizontal
  return (
    <View style={styles.container}>
      {/* Área esquerda com título, subtítulo e badge */}
      <View style={styles.copy}>
        {/* Título principal da tela */}
        <Text style={styles.title}>{title}</Text>
        
        {/* Subtítulo opcional - renderizado apenas se fornecido */}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        
        {/* Badge opcional - renderizado apenas se label fornecido */}
        {badgeLabel ? <Badge label={badgeLabel} variant={badgeVariant} style={styles.badge} /> : null}
      </View>
      
      {/* Área direita com ação opcional (botões, etc.) */}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

// Estilos do componente ScreenHeader
const styles = StyleSheet.create({
  // Container principal do cabeçalho
  container: {
    flexDirection: 'row',           // Layout horizontal
    justifyContent: 'space-between', // Espaça conteúdo entre as extremidades
    alignItems: 'flex-start',       // Alinha no topo
    gap: SPACING.sm,                // Espaço entre as áreas
    marginBottom: SPACING.lg,       // Margem inferior para separar do conteúdo
  },
  
  // Área esquerda com título, subtítulo e badge
  copy: {
    flex: 1,                        // Ocupa espaço disponível
  },
  
  // Estilo do título principal
  title: {
    ...FONTS.heading,               // Usa fonte heading do tema
    fontSize: 24,                   // Tamanho grande para destaque
    color: COLORS.text,            // Cor principal do texto
  },
  
  // Estilo do subtítulo
  subtitle: {
    ...FONTS.body,                  // Usa fonte body do tema
    marginTop: SPACING.xs,          // Pequeno espaço acima do título
  },
  
  // Estilo do badge quando presente
  badge: {
    marginTop: SPACING.sm,          // Espaço acima do subtítulo
  },
  
  // Área direita com ações (botões, etc.)
  action: {
    paddingTop: SPACING.xs,         // Alinha visualmente com o título
  },
});
