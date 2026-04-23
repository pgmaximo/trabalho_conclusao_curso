// =============================================================================
// Arquivo: AppShell.tsx
// Descrição: Container principal do aplicativo com navegação por tabs
// Componente: AppShell
// =============================================================================
//
// Este componente define a estrutura principal do aplicativo após o login.
// Ele contém a área de conteúdo dinâmica (Slot) e a barra de navegação
// inferior (BottomTabBar), gerenciando toda a navegação interna do app.
//
// Funcionalidades:
// - Renderização do conteúdo dinâmico das rotas
// - Detecção automática da tab ativa baseada na rota atual
// - Gerenciamento da navegação entre as tabs principais
// - Layout responsivo com área de conteúdo e navegação inferior
//
// Estrutura:
// - Container principal com fundo do tema
// - Área de conteúdo (flex: 1) para as telas
// - BottomTabBar fixa na parte inferior
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import { StyleSheet, View } from 'react-native';  // Componentes UI básicos
import { router, Slot, usePathname } from 'expo-router';  // Sistema de rotas

// Importações de configurações e componentes
import { APP_TABS, getActiveTabId } from '@/constants/navigation';  // Config tabs
import { BottomTabBar } from '@/components/BottomTabBar';  // Barra de navegação
import { COLORS } from '@/constants/theme';  // Cores do tema

// Componente principal do shell do aplicativo
export function AppShell() {
  // Hook para obter a rota/pathname atual
  const pathname = usePathname();
  
  // Determina qual tab está ativa baseada na rota atual
  const activeTab = getActiveTabId(pathname);

  // Retorna a estrutura principal do aplicativo
  return (
    <View style={styles.container}>
      {/* Área de conteúdo dinâmico - renderiza a rota atual */}
      <View style={styles.content}>
        <Slot />
      </View>
      
      {/* Barra de navegação inferior com as tabs principais */}
      <BottomTabBar
        // Mapeia as configurações das tabs para o formato esperado
        items={APP_TABS.map(({ icon, label, id }) => ({ icon, label, id }))}
        
        // Tab atualmente ativa
        activeTab={activeTab}
        
        // Callback executado quando usuário pressiona uma tab
        onTabPress={(tabId) => {
          // Encontra a configuração da tab pressionada
          const nextTab = APP_TABS.find((item) => item.id === tabId);
          if (nextTab) {
            // Navega para a rota da tab selecionada
            router.replace(nextTab.href);
          }
        }}
      />
    </View>
  );
}

// Estilos do componente
const styles = StyleSheet.create({
  // Container principal que ocupa toda a tela
  container: {
    flex: 1,                    // Ocupa todo o espaço disponível
    backgroundColor: COLORS.background,  // Cor de fundo do tema
  },
  
  // Área de conteúdo onde as telas são renderizadas
  content: {
    flex: 1,                    // Ocupa o espaço acima da barra de navegação
  },
});
