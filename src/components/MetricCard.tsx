// =============================================================================
// Arquivo: MetricCard.tsx
// Descrição: Componente de cartão para exibir métricas de saúde com progresso
// Componente: MetricCard
// =============================================================================
//
// Este componente implementa um cartão para exibir métricas de saúde com suporte
// para progresso visual, status colorido e múltiplas variantes de layout.
// É usado extensivamente no dashboard para mostrar dados de saúde.
//
// Funcionalidades:
// - Exibição de label, valor e status da métrica
// - Barra de progresso opcional com porcentagem
// - Status com cor customizável
// - Variantes de layout (vertical/horizontal)
// - Design consistente com sombra e bordas
//
// Variantes:
// - Vertical: Layout empilhado (padrão)
// - Horizontal: Layout lado a lado mais compacto
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import { View, Text, StyleSheet } from 'react-native';  // Componentes UI básicos

// Importações de tema
import { COLORS, FONTS, SIZES } from '@/constants/theme';  // Configurações

// Props do componente MetricCard
type MetricCardProps = {
  label: string;                    // Texto descritivo da métrica
  value: string;                   // Valor principal da métrica
  status: string;                  // Texto de status ou descrição
  statusColor?: string;             // Cor do status (padrão: primary)
  progressPercent?: number;         // Porcentagem para barra de progresso
  variant?: 'horizontal' | 'vertical'; // Variante de layout (padrão: vertical)
};

// Componente MetricCard principal
export function MetricCard({
  label,                    // Label da métrica
  value,                   // Valor principal
  status,                  // Status/descrição
  statusColor = COLORS.primary,  // Cor do status (padrão: cor primária)
  progressPercent,         // Porcentagem de progresso opcional
  variant = 'vertical',     // Variante de layout (padrão: vertical)
}: MetricCardProps) {
  // Renderiza o cartão de métrica com layout baseado na variante
  return (
    <View style={[styles.card, variant === 'horizontal' && styles.cardHorizontal]}>
      {/* Header com o label da métrica */}
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
      </View>
      
      {/* Valor principal da métrica */}
      <Text style={styles.value}>{value}</Text>
      
      {/* Barra de progresso opcional - renderizada apenas se progressPercent fornecido */}
      {progressPercent !== undefined && (
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,           // Estilo base da barra
              {
                // Largura baseada na porcentagem (limitada a 100%)
                width: `${Math.min(progressPercent, 100)}%`,
                backgroundColor: statusColor,  // Cor baseada no status
              },
            ]}
          />
        </View>
      )}
      
      {/* Texto de status com cor customizada */}
      <Text style={[styles.status, { color: statusColor }]}>{status}</Text>
    </View>
  );
}

// Estilos do componente MetricCard
const styles = StyleSheet.create({
  // Estilo base do cartão (variante vertical)
  card: {
    flex: 1,                        // Ocupa espaço disponível
    backgroundColor: COLORS.surface, // Fundo branco/cinza claro
    borderRadius: SIZES.radius,      // Borda arredondada
    padding: SIZES.base,           // Padding interno
    minHeight: 140,                 // Altura mínima para consistência
    justifyContent: 'space-between', // Distribui espaço verticalmente
    marginHorizontal: SIZES.small,  // Margem horizontal
    shadowColor: COLORS.shadow,     // Cor da sombra
    shadowOffset: { width: 0, height: 2 }, // Offset da sombra
    shadowOpacity: 0.08,            // Opacidade da sombra
    shadowRadius: 8,               // Raio da sombra
    elevation: 2,                   // Elevação para Android
  },
  
  // Estilo para variante horizontal
  cardHorizontal: {
    flexDirection: 'row',           // Layout horizontal
    alignItems: 'center',          // Centraliza verticalmente
    minHeight: 90,                 // Altura menor para layout compacto
  },
  
  // Header com o label
  header: {
    marginBottom: SIZES.small,      // Espaço abaixo do label
  },
  
  // Estilo do label (texto descritivo)
  label: {
    ...FONTS.caption,               // Usa fonte caption do tema
    color: COLORS.textSecondary,    // Cor secundária do texto
    textTransform: 'uppercase',     // Texto em maiúsculas
    letterSpacing: 0.5,            // Espaçamento entre letras
  },
  
  // Estilo do valor principal
  value: {
    ...FONTS.heading,               // Usa fonte heading do tema
    fontSize: 24,                   // Tamanho grande para destaque
    fontWeight: '700',              // Peso negrito extra
    color: COLORS.text,            // Cor principal do texto
    marginBottom: 4,                // Pequeno espaço abaixo
  },
  
  // Container da barra de progresso
  progressBar: {
    height: 6,                     // Altura fina da barra
    backgroundColor: '#E0E0E0',    // Cor de fundo da barra
    borderRadius: 3,               // Borda arredondada
    overflow: 'hidden',            // Esconde conteúdo que sai da barra
    marginBottom: 6,               // Espaço abaixo da barra
  },
  
  // Preenchimento da barra de progresso
  progressFill: {
    height: '100%',                // Ocupa altura total
    borderRadius: 3,               // Borda arredondada
  },
  
  // Estilo do texto de status
  status: {
    ...FONTS.caption,               // Usa fonte caption do tema
    fontWeight: '600',              // Peso semi-negrito
  },
});
