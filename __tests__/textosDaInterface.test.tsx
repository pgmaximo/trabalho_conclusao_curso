import React from 'react';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GRADE_NAME_PT } from '@/constants/uspstfGrades';
import { ImportHealthDataScreen } from '@/screens/ImportHealthDataScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';
import { DEFAULT_REMINDER_INTERVALS_BY_GRADE } from '@/services/reminderService';
import { profileSetupSchema } from '@/validation/forms_profile_setup';

// Os textos que a pessoa le: sem palavra sem acento, sem jargao solto, e com o
// Cadastro igual ao Login naquilo que os dois tem em comum
// (specs/00-fundacao/consistencia-e-textos/spec.md, D6, D7 e D8).

jest.mock('aws-amplify/auth', () => ({ signUp: jest.fn() }));
jest.mock('aws-amplify/data', () => ({ generateClient: jest.fn(() => ({})) }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn() },
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('@/contexts/ThemeContext', () => ({
  useThemeContext: () => ({ colorScheme: 'light', theme: 'system', setTheme: jest.fn() }),
}));
jest.mock('@/hooks/healthImportCache', () => ({ invalidateHealthImportCache: jest.fn() }));
jest.mock('@/services/healthImportService', () => ({
  createHealthImport: jest.fn(),
  MAX_FILE_COUNT: 20,
  MAX_STANDALONE_FILE_SIZE_BYTES: 50 * 1024 * 1024,
  MAX_ZIP_SIZE_BYTES: 200 * 1024 * 1024,
  validatePickedFiles: jest.fn(() => []),
}));

const METRICS = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 24, left: 0, right: 0, top: 44 },
};

function naTela(tela: React.ReactElement) {
  return render(<SafeAreaProvider initialMetrics={METRICS}>{tela}</SafeAreaProvider>);
}

describe('acentos', () => {
  const raiz = join(__dirname, '..', 'src');

  function arquivos(pasta: string): { nome: string; texto: string }[] {
    return readdirSync(join(raiz, pasta), { withFileTypes: true }).flatMap((entrada) => {
      const caminho = join(pasta, entrada.name);
      if (entrada.isDirectory()) return arquivos(caminho);
      if (!/\.tsx?$/.test(entrada.name)) return [];
      return [{ nome: caminho, texto: readFileSync(join(raiz, caminho), 'utf8') }];
    });
  }

  function semComentarios(texto: string): string {
    return texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  }

  it('nenhum texto de tela esta escrito sem acento', () => {
    // As palavras que ja escaparam sem acento, dentro de uma frase entre aspas
    // (uma frase tem espaco; uma chave como 'card-invalido' nao). O que vai so
    // para o console nao conta.
    const palavras =
      'Nao|nao|Voce|voce|possivel|obrigatori[oa]|invalid[oa]|numeric[oa]|usuario|sessao|codigo|minimo|maximo|disponivel';
    const frase = new RegExp(`['"\`][^'"\`\\n]*\\b(?:${palavras})\\b[^'"\`\\n]*['"\`]`);

    const infratores = arquivos('.').flatMap(({ nome, texto }) =>
      semComentarios(texto)
        .split('\n')
        .filter((linha) => !/console\./.test(linha))
        .map((linha) => frase.exec(linha)?.[0])
        .filter((trecho): trecho is string => Boolean(trecho) && /\s/.test(trecho as string))
        .map((trecho) => `${nome}: ${trecho}`),
    );

    expect(infratores).toEqual([]);
  });

  it('o cadastro do perfil pede nome e nascimento com as mesmas frases de "Editar perfil"', () => {
    const resultado = profileSetupSchema.safeParse({
      alcoholUse: 'unknown',
      allergies: '',
      biologicalSex: '',
      birthDate: '',
      chronicConditions: '',
      fullName: '',
      heightCm: 'alto',
      medications: '',
      physicalActivity: 'unknown',
      pregnancyStatus: 'unknown',
      sexuallyActive: 'unknown',
      tobaccoUse: 'unknown',
      weightKg: '',
    });

    const mensagens = resultado.success ? [] : resultado.error.issues.map((issue) => issue.message);

    expect(mensagens).toContain('Informe seu nome completo.');
    expect(mensagens).toContain('Informe sua data de nascimento.');
    expect(mensagens).toContain('Altura deve ser um número');
  });
});

describe('Cadastro igual ao Login', () => {
  function renderCadastro() {
    return render(
      <RegisterScreen
        onGoogleAuthSuccess={jest.fn()}
        onNavigateToLogin={jest.fn()}
        onRegisterSuccess={jest.fn()}
      />,
    );
  }

  it('os dois campos de senha tem o olho, cada um com o seu nome', () => {
    renderCadastro();
    const senha = () => screen.getByPlaceholderText('Crie uma senha');
    const confirmacao = () => screen.getByPlaceholderText('Repita a senha');
    expect(senha().props.secureTextEntry).toBe(true);
    expect(confirmacao().props.secureTextEntry).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: 'Mostrar senha' }));

    // Um olho mostra so o seu campo.
    expect(senha().props.secureTextEntry).toBe(false);
    expect(confirmacao().props.secureTextEntry).toBe(true);
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Mostrar confirmação da senha' }));

    expect(confirmacao().props.secureTextEntry).toBe(false);
  });
});

describe('jargao', () => {
  it('cada grau dos lembretes de prevencao vem com o que ele quer dizer', () => {
    naTela(
      <ProfileScreen
        onEditProfile={jest.fn()}
        onLogout={jest.fn()}
        onSetReminderInterval={jest.fn()}
        onSetTheme={jest.fn()}
        reminderIntervals={DEFAULT_REMINDER_INTERVALS_BY_GRADE}
        theme="system"
        user={{ email: 'maria@exemplo.com', id: 'u-1', name: 'Maria Souza' }}
      />,
    );

    for (const grau of ['A', 'B', 'C', 'D', 'I'] as const) {
      expect(screen.getByText(`Grau ${grau}`)).toBeTruthy();
      expect(screen.getByText(GRADE_NAME_PT[grau])).toBeTruthy();
    }
  });

  it('o consentimento da importacao diz o que acontece com os arquivos sem falar em "conta AWS"', () => {
    naTela(<ImportHealthDataScreen />);

    expect(screen.getByText(/analisados por inteligência artificial/)).toBeTruthy();
    // O nome de quem processa o dado continua dito.
    expect(screen.getByText(/Amazon Bedrock/)).toBeTruthy();
    expect(screen.queryByText(/conta AWS/)).toBeNull();
    expect(screen.queryByText(/a Bedrock/)).toBeNull();
  });
});
