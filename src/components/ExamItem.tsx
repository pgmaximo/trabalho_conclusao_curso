// =============================================================================
// Arquivo: ExamItem.tsx
// Descrição: Componente de item para exibir documentos médicos (exames, receitas, laudos)
// Componente: ExamItem
// =============================================================================
//
// Este componente implementa um item para exibir documentos médicos com ícone,
// título, subtítulo e badge de status. É usado na tela de exames para mostrar
// diferentes tipos de documentos médicos.
//
// Funcionalidades:
// - Exibição de ícone representativo do tipo de documento
// - Título e subtítulo com informações do documento
// - Badge colorido com status do documento
// - Feedback visual ao pressionar
// - Layout horizontal otimizado para listas
//
// Tipos de Documentos:
// - exam: Exames laboratoriais e imagens
// - prescription: Receitas médicas
// - report: Laudos e resultados
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import { View, Text, Pressable, StyleSheet } from 'react-native';  // Componentes UI

// Importações de tema
import { COLORS, FONTS, SIZES } from '@/constants/theme';  // Configurações

// Exportação do tipo para uso em outros componentes
export type ExamItemType = 'exam' | 'prescription' | 'report';

// Props do componente ExamItem
type ExamItemProps = {
  icon: string;                    // Ícone representativo do documento
  title: string;                   // Título/nome do documento
  subtitle: string;                // Subtítulo com informações adicionais
  statusLabel: string;             // Texto do status (ex: "Concluído", "Pendente")
  statusColor: string;              // Cor do badge de status
  onPress?: () => void;            // Callback ao pressionar o item
};

// Componente ExamItem principal
export function ExamItem({
  icon,                    // Ícone do documento
  title,                   // Título
  subtitle,                // Subtítulo
  statusLabel,             // Label do status
  statusColor,             // Cor do status
  onPress,                 // Callback de pressão
}: ExamItemProps) {
  // Renderiza o item de documento
  return (
    <Pressable
      // Aplica estilos com feedback de pressed
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress}                // Callback de pressão
    >
      {/* Container do ícone */}
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      
      {/* Área principal com título e subtítulo */}
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* Badge de status */}
      <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
        <Text style={styles.statusText}>{statusLabel}</Text>
      </View>
    </Pressable>
  );
}

// Estilos do componente ExamItem
const styles = StyleSheet.create({
  // Container principal do item
  container: {
    flexDirection: 'row',           // Layout horizontal
    alignItems: 'center',          // Centraliza verticalmente
    backgroundColor: COLORS.surface, // Fundo branco/cinza claro
    borderRadius: SIZES.radius,      // Borda arredondada
    padding: SIZES.base,           // Padding interno
    marginBottom: SIZES.small,      // Margem inferior para espaçamento
    shadowColor: COLORS.shadow,     // Cor da sombra
    shadowOffset: { width: 0, height: 2 }, // Offset da sombra
    shadowOpacity: 0.06,            // Opacidade suave da sombra
    shadowRadius: 6,               // Raio da sombra
    elevation: 2,                   // Elevação para Android
  },
  
  // Estilo quando item é pressionado
  pressed: {
    opacity: 0.85,                  // Reduz opacidade para feedback visual
  },
  
  // Container do ícone
  iconContainer: {
    width: 44,                      // Largura do container
    height: 44,                     // Altura do container
    borderRadius: SIZES.radius,      // Borda arredondada
    backgroundColor: COLORS.inputBackground, // Fundo claro para ícone
    alignItems: 'center',          // Centraliza horizontalmente
    justifyContent: 'center',       // Centraliza verticalmente
    marginRight: SIZES.base,        // Margem à direita
  },
  
  // Estilo do ícone
  icon: {
    fontSize: 24,                   // Tamanho grande do ícone
  },
  
  // Área de conteúdo principal
  content: {
    flex: 1,                        // Ocupa espaço disponível
  },
  
  // Título do documento
  title: {
    ...FONTS.body,                  // Usa fonte body do tema
    fontWeight: '600',              // Peso semi-negrito
    color: COLORS.text,             // Cor principal do texto
  },
  
  // Subtítulo com informações adicionais
  subtitle: {
    ...FONTS.caption,               // Usa fonte caption do tema
    color: COLORS.textSecondary,    // Cor secundária do texto
    marginTop: 2,                   // Pequeno espaço acima
  },
  
  // Badge de status
  statusBadge: {
    paddingHorizontal: SIZES.base,  // Padding horizontal
    paddingVertical: SIZES.small,   // Padding vertical
    borderRadius: SIZES.radius,      // Borda arredondada
    marginLeft: SIZES.base,        // Margem à esquerda
  },
  
  // Texto do badge de status
  statusText: {
    ...FONTS.caption,               // Usa fonte caption do tema
    color: '#fff',                  // Texto branco para contraste
    fontWeight: '600',              // Peso semi-negrito
    fontSize: 11,                   // Tamanho bem pequeno
  },
});
