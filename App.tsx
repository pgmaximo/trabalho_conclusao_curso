/**
 * Resumo do arquivo:
 * Compatibilidade historica do projeto.
 * O app real usa Expo Router por `package.json -> main: expo-router/entry`,
 * portanto a navegacao e as regras de fluxo vivem em `src/app`.
 *
 * Este componente existe para evitar confusao ao abrir o arquivo antigo.
 * Nao coloque novas telas, estados de navegacao ou configuracoes Amplify aqui.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SuaSaude usa Expo Router</Text>
      <Text style={styles.description}>
        A entrada real do app esta em src/app/_layout.tsx e as telas ficam em src/app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
  },
});
