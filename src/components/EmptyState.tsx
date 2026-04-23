// =============================================================================
// Arquivo: EmptyState.tsx
// Descrição: Componente de estado vazio para telas sem conteúdo
// Componente: EmptyState
// =============================================================================
//
// Este componente implementa uma tela de estado vazio para quando não há
// conteúdo para exibir. Inclui ícone, título, descrição e opcionalmente um
// botão de ação. É usado em listas vazias e telas sem dados.
//
// Funcionalidades:
// - Exibição de ícone representativo (padrão: 🩺)
// - Título e descrição informativos
// - Cores temáticas baseadas no tom (neutral/error)
// - Botão de ação opcional
// - Layout centralizado e responsivo
//
// Tons Disponíveis:
// - neutral: Cor primária para estados normais
// - error: Cor de perigo para estados de erro
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import { StyleSheet, Text, View } from 'react-native';  // Componentes UI

// Importações de tema e componentes
import { COLORS, FONTS, SPACING } from '@/constants/theme';  // Configurações
import { Button } from '@/components/Button';  // Componente de botão

// Tipos suportados pelo componente
type EmptyStateTone = 'neutral' | 'error';

// Props do componente EmptyState
type EmptyStateProps = {
  title: string;                    // Título do estado vazio
  description: string;              // Descrição detalhada
  icon?: string;                   // Ícone representativo (padrão: 🩺)
  tone?: EmptyStateTone;            // Tom visual (padrão: neutral)
  actionLabel?: string;             // Texto do botão de ação
  onActionPress?: () => void;       // Callback do botão de ação
};

// Componente EmptyState principal
export function EmptyState({
  title,                   // Título
  description,             // Descrição
  icon = '🩺',            // Ícone padrão de saúde
  tone = 'neutral',       // Tom visual padrão
  actionLabel,            // Label do botão
  onActionPress,          // Callback do botão
}: EmptyStateProps) {
  // Define cor de destaque baseada no tom
  const accentColor = tone === 'error' ? COLORS.danger : COLORS.primary;

  // Renderiza o estado vazio
  return (
    <View style={styles.container}>
      {/* Ícone representativo com cor temática */}
      <Text style={[styles.icon, { color: accentColor }]}>{icon}</Text>
      
      {/* Título principal */}
      <Text style={styles.title}>{title}</Text>
      
      {/* Descrição detalhada */}
      <Text style={styles.description}>{description}</Text>
      
      {/* Botão de ação opcional - renderizado apenas se fornecido */}
      {actionLabel && onActionPress ? (
        <Button
          title={actionLabel}          // Texto do botão
          onPress={onActionPress}      // Callback de ação
          // Variante baseada no tom (secondary para erro, primary para neutral)
          variant={tone === 'error' ? 'secondary' : 'primary'}
          style={styles.button}        // Estilo adicional
        />
      ) : null}
    </View>
  );
}

// Estilos do componente EmptyState
const styles = StyleSheet.create({
  // Container principal centralizado
  container: {
    alignItems: 'center',          // Centraliza horizontalmente
    justifyContent: 'center',       // Centraliza verticalmente
    paddingVertical: SPACING.xl,   // Padding vertical generoso
  },
  
  // Estilo do ícone
  icon: {
    fontSize: 28,                   // Tamanho grande do ícone
    marginBottom: SPACING.sm,      // Espaço abaixo do ícone
  },
  
  // Estilo do título
  title: {
    ...FONTS.heading,               // Usa fonte heading do tema
    textAlign: 'center',            // Centraliza texto
    marginBottom: SPACING.xs,       // Pequeno espaço abaixo
  },
  
  // Estilo da descrição
  description: {
    ...FONTS.body,                  // Usa fonte body do tema
    textAlign: 'center',            // Centraliza texto
    maxWidth: 280,                  // Largura máxima para legibilidade
  },
  
  // Estilo do botão de ação
  button: {
    marginTop: SPACING.md,         // Margem superior para espaçamento
  },
});
