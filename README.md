# 🩺 SuaSaúde — Gerenciamento de Saúde

> Trabalho de Conclusão de Curso — Centro Universitário do Instituto Mauá de Tecnologia (IMT)  
> Curso: Ciência da Computação  
> Área: Ciências Exatas e da Terra / Computação e Informática

---

## 📋 Sobre o Projeto

O **SuaSaúde** é um aplicativo móvel voltado ao gerenciamento integrado da saúde do usuário. O sistema consolida informações clínicas como exames e receitas médicas em uma plataforma acessível e intuitiva, incorporando Inteligência Artificial para análise preliminar de exames e integração com dispositivos vestíveis (wearables).

O projeto se alinha ao **ODS 3 da ONU** — *"Assegurar uma vida saudável e promover o bem-estar para todos, em todas as idades"* —, promovendo o autocuidado, a prevenção de doenças e o empoderamento do usuário sobre seus próprios dados de saúde.

---

## 👥 Equipe

| Nome | Papel |
|---|---|
| André Martinez de Souza | Desenvolvedor |
| Arturo Ochoa Garcia | Desenvolvedor |
| Brunno Souza | Desenvolvedor |
| Matheus Passari | Desenvolvedor |
| Pedro Gabriel Oliveira Máximo | Desenvolvedor |

**Orientador:** Prof. Dr. Robson Calvetti

---

## ✨ Funcionalidades Previstas

- 📁 **Gestão de documentos clínicos** — armazenamento e visualização de exames e receitas médicas
- 🤖 **Análise por IA** — interpretação preliminar de exames, identificando padrões sem emitir diagnósticos definitivos
- 🔔 **Lembretes e sugestões personalizadas** — baseados na anamnese do usuário e em protocolos oficiais de saúde
- ⌚ **Integração com wearables** — coleta de dados como frequência cardíaca, padrões de sono e níveis de atividade
- 📊 **Dashboard interativo** — visualização clara das métricas de saúde coletadas pelos wearables
- 🔗 **Análise contextualizada** — correlação dos dados fisiológicos com eventos e rotina do usuário
- 🔒 **Segurança e privacidade** — desenvolvimento em conformidade com a **LGPD** (Lei Geral de Proteção de Dados)

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Uso |
|---|---|
| [Expo](https://expo.dev/) | Framework principal — React Native full-stack |
| [React Native](https://reactnative.dev/) | Desenvolvimento mobile (Android e iOS) |
| [Amazon Web Services (AWS)](https://aws.amazon.com/) | Armazenamento, processamento e escalabilidade em nuvem |
| Inteligência Artificial | Análise de exames e geração de insights de saúde |

---

## 🏗️ Estrutura do Projeto

```
tcc/
├── App.tsx                    # Componente raiz da aplicação
├── index.ts                   # Entry point (registerRootComponent)
├── app.json                   # Configuração do Expo
├── tsconfig.json              # Config TypeScript + path aliases (@/)
├── package.json
│
├── assets/                    # Recursos estáticos globais
│   ├── fonts/                 # Fontes customizadas (.ttf, .otf)
│   └── images/                # Imagens gerais do app
│
└── src/                       # Todo código-fonte da aplicação
    ├── components/            # Componentes de UI reutilizáveis
    ├── screens/               # Telas completas da aplicação
    ├── navigation/            # Configuração de rotas e navegação
    ├── services/              # Comunicação com APIs e backends
    ├── hooks/                 # Custom React hooks
    ├── contexts/              # Provedores de estado global (Context API)
    ├── utils/                 # Funções utilitárias puras
    ├── constants/             # Valores constantes (cores, URLs, dimensões)
    ├── types/                 # Tipos e interfaces TypeScript globais
    └── styles/                # Tema global e estilos compartilhados
```

> **Path alias configurado:** Use `@/` para importar de `src/`. Exemplo: `import Button from '@/components/Button'`

---

### 📂 Detalhamento de cada pasta

#### `src/components/` — Componentes reutilizáveis

Componentes de UI genéricos que podem ser usados em **qualquer tela** do app. Cada componente deve ser independente, receber dados via `props` e não depender de lógica de negócio.

**Quando usar:** Sempre que um elemento visual se repete em mais de uma tela, ou quando deseja isolar a UI para facilitar manutenção e testes.

```tsx
// src/components/Button.tsx
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ title, onPress, variant = 'primary' }: ButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, variant === 'secondary' && styles.secondary]}
      onPress={onPress}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: '#4A90D9', padding: 14, borderRadius: 8, alignItems: 'center' },
  secondary: { backgroundColor: '#E0E0E0' },
  text: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
```

**Outros exemplos:** `Input.tsx`, `Card.tsx`, `Avatar.tsx`, `LoadingSpinner.tsx`, `Header.tsx`

---

#### `src/screens/` — Telas da aplicação

Cada arquivo representa uma **tela completa** do app. Screens consomem componentes de `components/`, dados de `services/` e lógica de `hooks/`. Elas são o "ponto de montagem" registrado na navegação.

**Quando usar:** Para cada tela visível ao usuário (login, home, perfil, detalhes, etc.).

```tsx
// src/screens/HomeScreen.tsx
import { View, Text, FlatList } from 'react-native';
import { Button } from '@/components/Button';
import { useExames } from '@/hooks/useExames';

export function HomeScreen() {
  const { exames, loading } = useExames();

  if (loading) return <Text>Carregando...</Text>;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Seus Exames</Text>
      <FlatList
        data={exames}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Text>{item.nome}</Text>}
      />
      <Button title="Adicionar Exame" onPress={() => {}} />
    </View>
  );
}
```

**Outros exemplos:** `LoginScreen.tsx`, `ProfileScreen.tsx`, `ExameDetailScreen.tsx`

---

#### `src/navigation/` — Rotas e navegação

Configuração centralizada do [React Navigation](https://reactnavigation.org/). Aqui ficam os stacks, tabs e drawers que definem como o usuário navega entre as telas.

**Quando usar:** Para definir e organizar todas as rotas do app.

```tsx
// src/navigation/AppNavigator.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '@/screens/HomeScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { ExameDetailScreen } from '@/screens/ExameDetailScreen';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="ExameDetail" component={ExameDetailScreen} />
    </Stack.Navigator>
  );
}
```

**Outros exemplos:** `TabNavigator.tsx`, `AuthNavigator.tsx`, `types.ts` (tipagem das rotas)

---

#### `src/services/` — Comunicação com APIs e backends

Camada de comunicação com serviços externos (AWS, APIs REST, Firebase, etc.). Cada arquivo encapsula as chamadas de uma entidade ou domínio. **Nenhuma lógica de UI** deve existir aqui.

**Quando usar:** Para toda requisição HTTP, integração com SDK de terceiros, ou comunicação com banco de dados.

```tsx
// src/services/exameService.ts
import { API_BASE_URL } from '@/constants/api';

export interface Exame {
  id: string;
  nome: string;
  data: string;
  resultado: string;
}

export async function fetchExames(userId: string): Promise<Exame[]> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/exames`);
  if (!response.ok) throw new Error('Erro ao buscar exames');
  return response.json();
}

export async function uploadExame(userId: string, formData: FormData): Promise<Exame> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/exames`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Erro ao enviar exame');
  return response.json();
}
```

**Outros exemplos:** `authService.ts`, `userService.ts`, `wearableService.ts`, `aiAnalysisService.ts`

---

#### `src/hooks/` — Custom React hooks

Hooks customizados que encapsulam lógica reutilizável com estado. Combinam chamadas a `services/`, gerenciamento de estado e efeitos colaterais. Permitem que as **screens fiquem limpas** e focadas apenas em renderização.

**Quando usar:** Quando uma lógica com `useState`/`useEffect` se repete ou quando a screen ficaria muito complexa.

```tsx
// src/hooks/useExames.ts
import { useState, useEffect } from 'react';
import { fetchExames, Exame } from '@/services/exameService';

export function useExames() {
  const [exames, setExames] = useState<Exame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExames('user-123')
      .then(setExames)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { exames, loading, error };
}
```

**Outros exemplos:** `useAuth.ts`, `useWearableData.ts`, `useForm.ts`, `useDebounce.ts`

---

#### `src/contexts/` — Estado global (Context API)

Provedores de estado que precisam ser acessados por **múltiplas telas** sem prop drilling. Ideal para autenticação, tema, preferências do usuário, etc.

**Quando usar:** Quando um dado precisa ser compartilhado entre componentes distantes na árvore.

```tsx
// src/contexts/AuthContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  nome: string;
  email: string;
}

interface AuthContextData {
  user: User | null;
  signed: boolean;
  signIn: (email: string, senha: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  async function signIn(email: string, senha: string) {
    // Chamar authService e setar o user
    setUser({ id: '1', nome: 'Pedro', email });
  }

  function signOut() {
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, signed: !!user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook de conveniência para usar o contexto
export const useAuth = () => useContext(AuthContext);
```

**Outros exemplos:** `ThemeContext.tsx`, `NotificationContext.tsx`

---

#### `src/utils/` — Funções utilitárias

Funções **puras** e auxiliares, sem dependência de React. Formatação, validação, cálculos, transformações de dados.

**Quando usar:** Para lógica que não tem estado e pode ser testada isoladamente.

```tsx
// src/utils/formatDate.ts
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// src/utils/validators.ts
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function isValidCPF(cpf: string): boolean {
  // Lógica de validação de CPF
  return cpf.replace(/\D/g, '').length === 11;
}
```

**Outros exemplos:** `formatCurrency.ts`, `calculateIMC.ts`, `maskPhone.ts`

---

#### `src/constants/` — Constantes da aplicação

Valores que **não mudam** em tempo de execução: paleta de cores, URLs de API, dimensões padrão, chaves de configuração.

**Quando usar:** Para evitar "magic numbers" e strings espalhadas pelo código.

```tsx
// src/constants/colors.ts
export const COLORS = {
  primary: '#4A90D9',
  secondary: '#50C878',
  danger: '#E74C3C',
  background: '#F5F5F5',
  textPrimary: '#333333',
  textSecondary: '#888888',
  white: '#FFFFFF',
};

// src/constants/api.ts
export const API_BASE_URL = 'https://api.suasaude.com.br/v1';
export const WEARABLE_API_URL = 'https://wearable.suasaude.com.br/v1';

// src/constants/dimensions.ts
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
```

---

#### `src/types/` — Tipos TypeScript globais

Interfaces e types usados em **múltiplos arquivos** do projeto. Evita duplicação de definições e centraliza os contratos de dados.

**Quando usar:** Quando um tipo é compartilhado entre services, hooks e screens.

```tsx
// src/types/user.ts
export interface User {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  dataNascimento: string;
  fotoPerfil?: string;
}

// src/types/exame.ts
export interface Exame {
  id: string;
  nome: string;
  data: string;
  tipo: 'sangue' | 'imagem' | 'outro';
  resultado: string;
  arquivoUrl: string;
}

// src/types/navigation.ts
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  ExameDetail: { exameId: string };
  Profile: undefined;
};
```

---

#### `src/styles/` — Tema e estilos globais

Estilos reutilizáveis e configuração de tema visual do app. Centraliza tokens de design (cores, tipografia, sombras) para manter a consistência visual.

**Quando usar:** Para estilos que se repetem em múltiplos componentes ou para definir o tema global.

```tsx
// src/styles/globalStyles.ts
import { StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
```

---

#### `assets/fonts/` — Fontes customizadas

Armazene aqui arquivos `.ttf` ou `.otf` de fontes que serão carregadas com `expo-font`.

```tsx
// Exemplo de uso no App.tsx
import { useFonts } from 'expo-font';

const [loaded] = useFonts({
  'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
  'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
});
```

---

#### `assets/images/` — Imagens do app

Imagens usadas nas telas (logos, ilustrações, ícones customizados, backgrounds).

```tsx
// Exemplo de uso
import { Image } from 'react-native';

<Image source={require('../../assets/images/logo.png')} style={{ width: 120, height: 120 }} />
```

---

## 🚀 Como Executar

### Pré-requisitos

- [Node.js](https://nodejs.org/) (versão LTS recomendada)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

```bash
npm install -g expo-cli
```

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/trabalho_conclusao_curso.git

# Acesse o diretório
cd trabalho_conclusao_curso

# Instale as dependências
npm install
```

### Executando

```bash
# Inicia o servidor de desenvolvimento do Expo
npx expo start
```

Após iniciar, utilize o aplicativo **Expo Go** no seu dispositivo móvel ou um emulador Android/iOS para visualizar o app.

---

## 📚 Referências Bibliográficas

- ANDERSON, K.; BURFORD, O.; EMMERTON, L. *Mobile Health Apps to Facilitate Self-Care: A Qualitative Study of User Experiences*. PLOS ONE, 2016.
- LEE, J.-A. et al. *Effective behavioral intervention strategies using mobile health applications for chronic disease management: a systematic review*. BMC Medical Informatics and Decision Making, 2018.
- SPREADBURY, J. H. et al. *A Comprehensive Literature Search of Digital Health Technology Use in Neurological Conditions*. JMIR, 2022.
- NEGASH, S. et al. *Physicians' attitudes and acceptance towards artificial intelligence in medical care: a qualitative study in Germany*. Frontiers in Digital Health, 2025.

---

## 📄 Licença

Este projeto é desenvolvido exclusivamente para fins acadêmicos no âmbito do Trabalho de Conclusão de Curso do Centro Universitário do Instituto Mauá de Tecnologia.

---

> **Status:** 🚧 Em andamento