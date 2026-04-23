// =============================================================================
// Arquivo: ScreenSkeleton.tsx
// Descrição: Componente de skeleton loading para telas durante carregamento
// Componente: ScreenSkeleton
// =============================================================================
//
// Este componente implementa um skeleton loading para mostrar uma estrutura
// visual do conteúdo enquanto os dados estão sendo carregados. Ele cria
// linhas e cartões placeholder que imitam o layout real da tela.
//
// Funcionalidades:
// - Linhas de título e subtítulo no topo
// - Múltiplos cartões skeleton configuráveis
// - Layout responsivo que imita o conteúdo real
// - Design consistente com o tema do aplicativo
// - Performance otimizada para loading states
//
// Estrutura:
// - Linha de título (52% de largura)
// - Linha de subtítulo (68% de largura)
// - N cartões configuráveis com título, corpo e footer
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import { StyleSheet, View } from 'react-native';  // Componentes UI

// Importações de componentes e tema
import { Card } from '@/components/Card';  // Componente de cartão
import { COLORS, RADII, SPACING } from '@/constants/theme';  // Configurações

// Props do componente ScreenSkeleton
type ScreenSkeletonProps = {
  blocks?: number;   // Número de blocos/cartões skeleton (padrão: 3)
};

// Componente ScreenSkeleton principal
export function ScreenSkeleton({ blocks = 3 }: ScreenSkeletonProps) {
  // Renderiza o skeleton da tela
  return (
    <View style={styles.container}>
      {/* Linha de título principal */}
      <View style={[styles.line, styles.titleLine]} />
      
      {/* Linha de subtítulo */}
      <View style={[styles.line, styles.subtitleLine]} />
      
      {/* Múltiplos cartões skeleton baseados na prop blocks */}
      {Array.from({ length: blocks }).map((_, index) => (
        <Card key={index} style={styles.card}>
          {/* Linha de título do cartão */}
          <View style={[styles.line, styles.cardTitle]} />
          
          {/* Linha do corpo do cartão */}
          <View style={[styles.line, styles.cardBody]} />
          
          {/* Linha do footer do cartão */}
          <View style={[styles.line, styles.cardFooter]} />
        </Card>
      ))}
    </View>
  );
}

// Estilos do componente ScreenSkeleton
const styles = StyleSheet.create({
  // Container principal com espaçamento
  container: {
    gap: SPACING.md,                // Espaço entre elementos
  },
  
  // Estilo do cartão skeleton
  card: {
    backgroundColor: COLORS.surface, // Fundo do cartão
  },
  
  // Estilo base das linhas skeleton
  line: {
    backgroundColor: COLORS.border,  // Cor cinza para simular texto
    borderRadius: RADII.pill,      // Borda arredondada para linhas
    overflow: 'hidden',             // Esconde conteúdo que sai da borda
  },
  
  // Linha de título principal
  titleLine: {
    width: '52%',                   // 52% da largura do container
    height: 24,                     // Altura do título
  },
  
  // Linha de subtítulo
  subtitleLine: {
    width: '68%',                   // 68% da largura do container
    height: 16,                     // Altura do subtítulo
  },
  
  // Linha de título dentro dos cartões
  cardTitle: {
    width: '45%',                   // 45% da largura do cartão
    height: 16,                     // Altura do título do cartão
    marginBottom: SPACING.md,      // Espaço abaixo
  },
  
  // Linha do corpo do cartão
  cardBody: {
    width: '100%',                  // 100% da largura do cartão
    height: 14,                     // Altura do corpo
    marginBottom: SPACING.sm,       // Espaço abaixo
  },
  
  // Linha do footer do cartão
  cardFooter: {
    width: '70%',                   // 70% da largura do cartão
    height: 14,                     // Altura do footer
  },
});
