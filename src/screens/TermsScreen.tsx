// =============================================================================
// Arquivo: TermsScreen.tsx
// Descrição: Termos de Uso e Política de Privacidade, para consulta a qualquer
// momento. Aberta pelo hub "Mais", pelo Perfil, pelo link do login/cadastro e
// pelo cartão de aceite do Perfil de Saúde — por isso a rota fica fora do grupo
// (app): ela precisa abrir também para quem ainda não entrou.
// =============================================================================

import React from 'react';
import { ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';

import { ScreenHeader } from '@/components/ScreenHeader';
import { TermsDocument } from '@/components/TermsDocument';

export function TermsScreen({ onBack }: { onBack: () => void }) {
  const { colorScheme } = useColorScheme();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-app-background dark:bg-app-dark-background">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerClassName="px-6 pb-12 pt-6" showsVerticalScrollIndicator={false}>
        <ScreenHeader
          onBack={onBack}
          subtitle="Como o SuaSaúde funciona, o que faz com os seus dados e quais são os seus direitos."
          title="Termos e privacidade"
        />
        <TermsDocument />
      </ScrollView>
    </SafeAreaView>
  );
}
