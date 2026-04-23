// =============================================================================
// Arquivo: MedicineCard.tsx
// Descrição: Componente de cartão para controle de medicamentos com status
// Componente: MedicineCard
// =============================================================================
//
// Este componente implementa um cartão para exibir informações de medicamentos
// com controle de status (pendente/tomado/perdido), botão de toggle e indicação
// visual colorida. É usado na tela de medicamentos para controle de doses.
//
// Funcionalidades:
// - Exibição de nome, dosagem e horário do medicamento
// - Botão circular para alternar status
// - Badge inferior com status colorido
// - Feedback visual ao pressionar
// - Cores e ícones específicos para cada status
//
// Status de Medicamentos:
// - pending: Vermelho (#E74C3C) - ● Pendente
// - taken: Verde (#27AE60) - ✓ Tomado
// - missed: Laranja (#F39C12) - ⚠ Perdido
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import { View, Text, StyleSheet, Pressable } from 'react-native';  // Componentes UI

// Importações de tema
import { COLORS, FONTS, SIZES } from '@/constants/theme';  // Configurações

// Props do componente MedicineCard
interface MedicineCardProps {
  name: string;                           // Nome do medicamento
  dosage: string;                         // Dosagem e frequência
  time: string;                           // Horário da dose
  status: 'pending' | 'taken' | 'missed'; // Status da dose
  onPress?: () => void;                   // Callback ao pressionar o cartão
  onToggle?: () => void;                  // Callback ao alternar status
}

// Componente MedicineCard principal
export function MedicineCard({
  name,                    // Nome do medicamento
  dosage,                  // Dosagem
  time,                    // Horário
  status,                  // Status
  onPress,                 // Callback de pressão do cartão
  onToggle,                // Callback de toggle do status
}: MedicineCardProps) {
  // Função para obter a cor baseada no status
  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return '#E74C3C';              // Vermelho para pendentes
      case 'taken':
        return '#27AE60';              // Verde para tomados
      case 'missed':
        return '#F39C12';              // Laranja para perdidos
      default:
        return COLORS.primary;         // Cor padrão
    }
  };

  // Função para obter o label baseado no status
  const getStatusLabel = () => {
    switch (status) {
      case 'pending':
        return 'Pendente';             // Label para pendente
      case 'taken':
        return 'Tomado';               // Label para tomado
      case 'missed':
        return 'Perdido';              // Label para perdido
      default:
        return '';                     // Label vazio para status desconhecido
    }
  };

  // Função para obter o ícone baseado no status
  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return '●';                    // Círculo para pendente
      case 'taken':
        return '✓';                    // Check para tomado
      case 'missed':
        return '⚠';                    // Alerta para perdido
      default:
        return '';                     // Vazio para status desconhecido
    }
  };

  // Renderiza o cartão do medicamento
  return (
    <Pressable
      // Aplica estilos com feedback de pressed
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress}                // Callback de pressão do cartão
    >
      {/* Área principal com informações e botão de status */}
      <View style={styles.content}>
        {/* Área esquerda com informações do medicamento */}
        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.dosage}>{dosage}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        
        {/* Botão circular para alternar status */}
        <Pressable
          style={[styles.statusButton, { borderColor: getStatusColor() }]}
          onPress={onToggle}             // Callback de toggle
        >
          <Text style={[styles.statusIcon, { color: getStatusColor() }]}>
            {getStatusIcon()}
          </Text>
        </Pressable>
      </View>
      
      {/* Badge inferior com status */}
      <View style={[styles.statusLabel, { backgroundColor: getStatusColor() }]}>
        <Text style={styles.statusLabelText}>{getStatusLabel()}</Text>
      </View>
    </Pressable>
  );
}

// Estilos do componente MedicineCard
const styles = StyleSheet.create({
  // Container principal do cartão
  container: {
    backgroundColor: '#FFF8F0',       // Fundo amarelado suave para medicamentos
    borderRadius: SIZES.radius,      // Borda arredondada
    overflow: 'hidden',             // Esconde conteúdo que sai da borda
    marginBottom: SIZES.base,       // Margem inferior para espaçamento
  },
  
  // Estilo quando cartão é pressionado
  pressed: {
    opacity: 0.85,                  // Reduz opacidade para feedback visual
  },
  
  // Área principal com informações e botão
  content: {
    flexDirection: 'row',           // Layout horizontal
    alignItems: 'center',          // Centraliza verticalmente
    padding: SIZES.base,           // Padding interno
    paddingBottom: SIZES.small,    // Padding inferior menor
  },
  
  // Área esquerda com informações do medicamento
  info: {
    flex: 1,                        // Ocupa espaço disponível
  },
  
  // Nome do medicamento
  name: {
    ...FONTS.body,                  // Usa fonte body do tema
    fontWeight: '600',              // Peso semi-negrito
    color: COLORS.text,             // Cor principal do texto
    marginBottom: 2,                // Pequeno espaço abaixo
  },
  
  // Dosagem do medicamento
  dosage: {
    ...FONTS.caption,               // Usa fonte caption do tema
    color: COLORS.textSecondary,    // Cor secundária do texto
    marginBottom: 2,                // Pequeno espaço abaixo
  },
  
  // Horário da dose
  time: {
    ...FONTS.caption,               // Usa fonte caption do tema
    color: COLORS.textSecondary,    // Cor secundária do texto
    fontSize: 11,                   // Tamanho bem pequeno
  },
  
  // Botão circular para alternar status
  statusButton: {
    width: 48,                      // Largura do botão
    height: 48,                     // Altura do botão (círculo)
    borderRadius: 24,               // Borda arredondada para círculo
    borderWidth: 2,                 // Largura da borda
    alignItems: 'center',          // Centraliza horizontalmente
    justifyContent: 'center',       // Centraliza verticalmente
  },
  
  // Ícone dentro do botão de status
  statusIcon: {
    fontSize: 20,                   // Tamanho do ícone
  },
  
  // Badge inferior com status
  statusLabel: {
    paddingVertical: SIZES.small,   // Padding vertical
    paddingHorizontal: SIZES.base,  // Padding horizontal
    alignItems: 'flex-end',         // Alinha texto à direita
    borderTopLeftRadius: 12,        // Borda arredondada superior esquerda
    borderTopRightRadius: 0,        // Sem borda superior direita
  },
  
  // Texto do badge de status
  statusLabelText: {
    ...FONTS.caption,               // Usa fonte caption do tema
    color: '#fff',                  // Texto branco para contraste
    fontWeight: '600',              // Peso semi-negrito
    fontSize: 11,                   // Tamanho bem pequeno
  },
});
