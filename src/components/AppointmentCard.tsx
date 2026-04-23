// =============================================================================
// Arquivo: AppointmentCard.tsx
// Descrição: Componente de cartão para exibir consultas médicas agendadas
// Componente: AppointmentCard
// =============================================================================
//
// Este componente implementa um cartão para exibir informações de consultas
// médicas agendadas com cores diferenciadas por tipo, borda lateral colorida
// e suporte a interação por toque. É usado na tela de consultas.
//
// Funcionalidades:
// - Exibição de horário, título e local da consulta
// - Badge colorido indicando o tipo de consulta
// - Borda lateral colorida para identificação visual
// - Feedback visual ao pressionar
// - Cores específicas para cada tipo de consulta
//
// Tipos de Consulta:
// - consulta: Azul (#3498DB)
// - retorno: Vermelho (#E74C3C)
// - exame: Laranja (#F39C12)
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import { View, Text, StyleSheet, Pressable } from 'react-native';  // Componentes UI

// Importações de tema
import { COLORS, FONTS, SIZES } from '@/constants/theme';  // Configurações

// Props do componente AppointmentCard
interface AppointmentCardProps {
  time: string;                           // Horário da consulta
  title: string;                          // Título/descrição da consulta
  location: string;                       // Local da consulta
  type: 'consulta' | 'retorno' | 'exame'; // Tipo da consulta
  onPress?: () => void;                   // Callback ao pressionar o cartão
}

// Componente AppointmentCard principal
export function AppointmentCard({
  time,                    // Horário
  title,                   // Título
  location,                // Local
  type,                    // Tipo da consulta
  onPress,                 // Callback de pressão
}: AppointmentCardProps) {
  // Função para obter a cor baseada no tipo de consulta
  const getTypeColor = () => {
    switch (type) {
      case 'consulta':
        return '#3498DB';              // Azul para consultas
      case 'retorno':
        return '#E74C3C';              // Vermelho para retornos
      case 'exame':
        return '#F39C12';              // Laranja para exames
      default:
        return COLORS.primary;         // Cor padrão
    }
  };

  // Função para obter o label baseado no tipo de consulta
  const getTypeLabel = () => {
    switch (type) {
      case 'consulta':
        return 'Consulta';             // Label para consulta
      case 'retorno':
        return 'Retorno';              // Label para retorno
      case 'exame':
        return 'Exame';                // Label para exame
      default:
        return '';                     // Label vazio para tipo desconhecido
    }
  };

  // Renderiza o cartão da consulta
  return (
    <Pressable
      // Aplica estilos com feedback de pressed
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress}                // Callback de pressão
    >
      {/* Borda lateral colorida para identificação do tipo */}
      <View style={[styles.leftBorder, { backgroundColor: getTypeColor() }]} />
      
      {/* Conteúdo principal do cartão */}
      <View style={styles.content}>
        {/* Header com horário e badge de tipo */}
        <View style={styles.header}>
          <Text style={styles.time}>{time}</Text>
          <View style={[styles.typeBadge, { backgroundColor: getTypeColor() }]}>
            <Text style={styles.typeLabel}>{getTypeLabel()}</Text>
          </View>
        </View>
        
        {/* Título da consulta */}
        <Text style={styles.title}>{title}</Text>
        
        {/* Local da consulta */}
        <Text style={styles.location}>{location}</Text>
      </View>
    </Pressable>
  );
}

// Estilos do componente AppointmentCard
const styles = StyleSheet.create({
  // Container principal do cartão
  container: {
    flexDirection: 'row',           // Layout horizontal para borda + conteúdo
    backgroundColor: COLORS.surface, // Fundo branco/cinza claro
    borderRadius: SIZES.radius,      // Borda arredondada
    marginBottom: SIZES.base,       // Margem inferior para espaçamento
    overflow: 'hidden',             // Esconde conteúdo que sai da borda
  },
  
  // Estilo quando cartão é pressionado
  pressed: {
    opacity: 0.85,                  // Reduz opacidade para feedback visual
  },
  
  // Borda lateral colorida
  leftBorder: {
    width: 4,                       // Largura fina da borda
  },
  
  // Área de conteúdo principal
  content: {
    flex: 1,                        // Ocupa espaço disponível
    padding: SIZES.base,           // Padding interno
  },
  
  // Header com horário e badge de tipo
  header: {
    flexDirection: 'row',           // Layout horizontal
    justifyContent: 'space-between', // Espaça horário e badge
    alignItems: 'center',          // Centraliza verticalmente
    marginBottom: SIZES.small,      // Espaço abaixo do header
  },
  
  // Estilo do horário
  time: {
    ...FONTS.caption,               // Usa fonte caption do tema
    color: COLORS.textSecondary,    // Cor secundária do texto
    fontWeight: '500',              // Peso médio
    fontSize: 12,                   // Tamanho pequeno
  },
  
  // Badge do tipo de consulta
  typeBadge: {
    paddingVertical: 4,            // Padding vertical
    paddingHorizontal: SIZES.small,  // Padding horizontal
    borderRadius: 4,               // Borda arredondada pequena
  },
  
  // Texto do badge de tipo
  typeLabel: {
    ...FONTS.caption,               // Usa fonte caption do tema
    color: '#fff',                  // Texto branco para contraste
    fontWeight: '600',              // Peso semi-negrito
    fontSize: 11,                   // Tamanho bem pequeno
  },
  
  // Título da consulta
  title: {
    ...FONTS.body,                  // Usa fonte body do tema
    fontWeight: '600',              // Peso semi-negrito
    color: COLORS.text,             // Cor principal do texto
    marginBottom: 4,                // Pequeno espaço abaixo
  },
  
  // Local da consulta
  location: {
    ...FONTS.caption,               // Usa fonte caption do tema
    color: COLORS.textSecondary,    // Cor secundária do texto
    fontSize: 12,                   // Tamanho pequeno
  },
});
