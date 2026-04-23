// =============================================================================
// Arquivo: AlertBanner.tsx
// Descrição: Componente de banner para alertas informativos com múltiplos tipos
// Componente: AlertBanner
// =============================================================================
//
// Este componente implementa um banner de alerta para exibir mensagens importantes
// ao usuário com diferentes tipos visuais (warning, info, success), ícone e
// cores temáticas. É usado para comunicar informações relevantes.
//
// Funcionalidades:
// - Exibição de ícone representativo do tipo de alerta
// - Título e mensagem descritiva
// - Cores temáticas baseadas no tipo de alerta
// - Layout horizontal otimizado
// - Design acessível e legível
//
// Tipos de Alerta:
// - warning: Amarelo (#FEF3C7/#FCD34D/#92400E) - Alertas de atenção
// - success: Azul claro (#DBEAFE/#60A5FA/#1E40AF) - Sucesso e confirmação
// - info: Azul (#E0E7FF/#818CF8/#3730A3) - Informações gerais
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import { View, Text, StyleSheet } from 'react-native';  // Componentes UI

// Importações de tema
import { FONTS, SIZES } from '@/constants/theme';  // Configurações

// Props do componente AlertBanner
type AlertBannerProps = {
  icon: string;                    // Ícone representativo do alerta
  title: string;                   // Título do alerta
  message: string;                 // Mensagem descritiva
  type?: 'warning' | 'info' | 'success'; // Tipo de alerta (padrão: info)
};

// Componente AlertBanner principal
export function AlertBanner({ 
  icon,                    // Ícone do alerta
  title,                   // Título
  message,                 // Mensagem
  type = 'info'            // Tipo de alerta (padrão: info)
}: AlertBannerProps) {
  // Define cores baseadas no tipo de alerta
  const backgroundColor =
    type === 'warning' ? '#FEF3C7' :    // Amarelo claro para warning
    type === 'success' ? '#DBEAFE' :    // Azul claro para success
    '#E0E7FF';                         // Azul para info (padrão)
    
  const borderColor =
    type === 'warning' ? '#FCD34D' :    // Amarelo para warning
    type === 'success' ? '#60A5FA' :    // Azul para success
    '#818CF8';                         // Azul mais escuro para info
    
  const textColor =
    type === 'warning' ? '#92400E' :    // Marrom escuro para warning
    type === 'success' ? '#1E40AF' :    // Azul escuro para success
    '#3730A3';                         // Azul muito escuro para info

  // Renderiza o banner de alerta
  return (
    <View style={[styles.container, { backgroundColor, borderColor }]}>
      {/* Ícone do alerta */}
      <Text style={styles.icon}>{icon}</Text>
      
      {/* Área de conteúdo com título e mensagem */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        <Text style={[styles.message, { color: textColor }]}>{message}</Text>
      </View>
    </View>
  );
}

// Estilos do componente AlertBanner
const styles = StyleSheet.create({
  // Container principal do banner
  container: {
    borderWidth: 1,                 // Largura da borda
    borderRadius: SIZES.radius,      // Borda arredondada
    padding: SIZES.base,           // Padding interno
    marginBottom: SIZES.base,       // Margem inferior para espaçamento
    flexDirection: 'row',           // Layout horizontal
    alignItems: 'flex-start',       // Alinha no topo
  },
  
  // Estilo do ícone
  icon: {
    fontSize: 18,                   // Tamanho do ícone
    marginRight: SIZES.small,       // Margem à direita
    marginTop: 2,                   // Pequeno ajuste de alinhamento
  },
  
  // Área de conteúdo com título e mensagem
  content: {
    flex: 1,                        // Ocupa espaço disponível
  },
  
  // Estilo do título do alerta
  title: {
    ...FONTS.body,                  // Usa fonte body do tema
    fontWeight: '600',              // Peso semi-negrito
    marginBottom: 4,                // Pequeno espaço abaixo
  },
  
  // Estilo da mensagem do alerta
  message: {
    ...FONTS.caption,               // Usa fonte caption do tema
    lineHeight: 18,                 // Altura da linha para legibilidade
  },
});
