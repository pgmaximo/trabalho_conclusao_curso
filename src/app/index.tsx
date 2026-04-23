// =============================================================================
// Arquivo: index.tsx
// Descrição: Ponto de entrada principal do aplicativo - Rota raiz
// Função: IndexRoute
// =============================================================================
// 
// Este arquivo define a rota inicial do aplicativo. Atualmente, ele redireciona
// automaticamente para o dashboard, substituindo o fluxo de login original.
//
// Funcionalidades:
// - Redirecionamento automático para /dashboard
// - Código de login original mantido como comentário para referência
//
// =============================================================================

import React from 'react';
// import { router } from 'expo-router';  // Navegação entre telas (desativado)

// import { HomeScreen } from '@/screens/HomeScreen';  // Tela de login (desativada)

// // Fluxo de login original (mantido como comentário)
// export default function LoginRoute() {
//   return (
//     <HomeScreen
//       onNavigateToRegister={() => router.push('/register')}
//       onLogin={async () => {
//         router.replace('/dashboard');
//       }}
//     />
//   );
// }

// Componente de redirecionamento para o dashboard
import { Redirect } from 'expo-router';

// Função principal da rota raiz
export default function IndexRoute() {
  // Redireciona automaticamente para o dashboard ao iniciar o app
  return <Redirect href="/dashboard" />;
}