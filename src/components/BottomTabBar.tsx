// =============================================================================
// Arquivo: BottomTabBar.tsx
// Descrição: Barra de navegação inferior com tabs do aplicativo
// Componente: BottomTabBar
// =============================================================================
//
// Este componente implementa a barra de navegação inferior do aplicativo,
// exibindo as tabs principais com ícones e labels. Suporta estado ativo,
// feedback de pressão e navegação entre as seções principais do app.
//
// Funcionalidades:
// - Renderização de múltiplas tabs com ícones e labels
// - Destaque visual da tab ativa
// - Feedback visual ao pressionar tabs
// - Callback para navegação quando tab é selecionada
//
// Estrutura Visual:
// - Container horizontal com borda superior e sombra
// - Tabs distribuídas igualmente (flex: 1)
// - Ícone acima do label em cada tab
// - Cor diferente para tab ativa vs inativas
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import { View, Pressable, Text, StyleSheet } from 'react-native';  // Componentes UI
import { COLORS, FONTS, SIZES } from '@/constants/theme';  // Configurações de tema

// Definição de tipos para os itens da barra de navegação
type BottomTabBarItem = {
  icon: string;    // Emoji ou ícone da tab
  label: string;   // Texto descritivo da tab
  id: string;      // Identificador único da tab
};

// Props do componente BottomTabBar
type BottomTabBarProps = {
  items: BottomTabBarItem[];           // Array de tabs a serem exibidas
  activeTab: string;                  // ID da tab atualmente ativa
  onTabPress: (tabId: string) => void; // Callback quando tab é pressionada
};

// Componente da barra de navegação inferior
export function BottomTabBar({ items, activeTab, onTabPress }: BottomTabBarProps) {
  // Renderiza o container com todas as tabs
  return (
    <View style={styles.container}>
      {/* Mapeia cada item para criar uma tab */}
      {items.map((item) => {
        // Verifica se esta é a tab ativa
        const isActive = activeTab === item.id;
        
        return (
          <Pressable
            key={item.id}  // Chave única para cada tab
            // Aplica estilos de pressed quando tab é pressionada
            style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            // Executa callback quando tab é pressionada
            onPress={() => onTabPress(item.id)}
          >
            {/* Ícone da tab (emoji) */}
            <Text style={styles.icon}>{item.icon}</Text>
            
            {/* Label da tab com estilo condicional para estado ativo */}
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Estilos do componente BottomTabBar
const styles = StyleSheet.create({
  // Container principal da barra de navegação
  container: {
    flexDirection: 'row',           // Layout horizontal para as tabs
    backgroundColor: COLORS.surface, // Fundo da barra
    borderTopWidth: 1,              // Borda superior
    borderTopColor: COLORS.border,   // Cor da borda
    paddingBottom: SIZES.large,     // Padding inferior (considera safe area)
    paddingTop: SIZES.small,         // Padding superior
    shadowColor: COLORS.shadow,     // Cor da sombra
    shadowOffset: { width: 0, height: -2 }, // Sombra para cima
    shadowOpacity: 0.08,             // Opacidade da sombra
    shadowRadius: 8,                // Raio da sombra
    elevation: 3,                   // Elevação para Android
  },
  
  // Estilo individual de cada tab
  tab: {
    flex: 1,                        // Distribui espaço igualmente
    alignItems: 'center',           // Centraliza horizontalmente
    justifyContent: 'center',       // Centraliza verticalmente
    paddingVertical: SIZES.small,   // Padding vertical interno
  },
  
  // Estilo aplicado quando tab é pressionada
  tabPressed: {
    opacity: 0.7,                   // Reduz opacidade para feedback visual
  },
  
  // Estilo do ícone da tab
  icon: {
    fontSize: 20,                   // Tamanho do emoji/ícone
    marginBottom: 4,                // Espaço entre ícone e label
  },
  
  // Estilo do label (texto) da tab
  label: {
    ...FONTS.caption,               // Usa fonte caption do tema
    color: COLORS.textSecondary,    // Cor secundária para tabs inativas
    fontWeight: '500',              // Peso da fonte
  },
  
  // Estilo do label quando tab está ativa
  labelActive: {
    color: COLORS.primary,          // Cor primária para tab ativa
    fontWeight: '600',              // Peso mais forte para destaque
  },
});
