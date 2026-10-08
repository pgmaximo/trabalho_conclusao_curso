# 🩺 SuaSaúde — Gerenciamento de Saúde

> Trabalho de Conclusão de Curso — Centro Universitário do Instituto Mauá de Tecnologia (IMT)  
> Curso: Ciência da Computação  
> Área: Ciências Exatas e da Terra / Computação e Informática

---

## 📋 Sobre o Projeto

O **SuaSaúde** é um aplicativo de **saúde móvel (mHealth)** voltado ao gerenciamento integrado da saúde do usuário. Diante da crescente prevalência de doenças crônicas e do envelhecimento populacional, a proposta busca centralizar, em uma única plataforma acessível e intuitiva, informações que normalmente ficam dispersas entre documentos, exames, receitas, agendas e dispositivos — reduzindo essa fragmentação e apoiando o autocuidado.

O sistema consolida informações clínicas como exames, receitas médicas, medicamentos e consultas, incorpora **Inteligência Artificial como recurso de apoio** à análise preliminar de exames (sempre de caráter informativo, **sem emitir diagnósticos definitivos nem substituir profissionais de saúde**), recomenda proativamente exames com base em bases de dados públicas e integra dados provenientes de dispositivos vestíveis (wearables).

O projeto se alinha ao **ODS 3 da ONU** — *"Assegurar uma vida saudável e promover o bem-estar para todos, em todas as idades"* —, promovendo o autocuidado, a prevenção de doenças e o empoderamento do usuário sobre seus próprios dados de saúde, inclusive como apoio a sistemas de saúde de baixa infraestrutura ao reduzir a demanda por atendimentos de baixa complexidade.

---

## 👥 Equipe

| Nome | Papel |
|---|---|
| André Martinez de Souza | Desenvolvedor |
| Arturo Ochoa Garcia | Desenvolvedor |
| Brunno Bernacchi de Souza | Desenvolvedor |
| Matheus Passari Nascimento | Desenvolvedor |
| Pedro Gabriel Oliveira Máximo | Desenvolvedor |

**Orientador:** Prof. MSc. Dr. Robson Calvetti

---

## ✨ Funcionalidades Previstas

- 📁 **Gestão de documentos clínicos** — cadastro, armazenamento e visualização de exames e receitas médicas, centralizando o histórico de saúde
- 💊 **Acompanhamento de medicamentos e consultas** — registro de prescrições, horários, compromissos médicos e lembretes da rotina de cuidado
- 🤖 **Análise por IA** — interpretação preliminar de exames, identificando padrões e oferecendo orientações informativas, **sem emitir diagnósticos definitivos nem substituir a avaliação profissional**
- 🧪 **Recomendação de exames** — sugestão proativa de exames com base nas características clínicas do usuário e em bases de dados públicas e confiáveis
- 💉 **Gestão de vacinação** — controle de vacinas tomadas e pretendidas, com integração ao sistema de saúde pública brasileiro para alertar sobre campanhas de vacinação
- ⌚ **Integração com wearables** *(implementado)* — importação do export do Samsung Health (ou de um exportador do Apple Health), com parsing defensivo de CSV/JSON/ZIP e consolidação de frequência cardíaca, sono, passos e outras métricas
- 📊 **Dashboard interativo** *(implementado)* — visualização em gráficos das métricas de saúde importadas
- 🔗 **Análise contextualizada** *(implementado)* — correlações estatísticas entre métricas (ex.: sono e frequência cardíaca de repouso), narradas em linguagem natural por Amazon Bedrock (Claude), com pontos de atenção e sugestões — sempre um apoio informativo, nunca um diagnóstico
- 🔒 **Segurança e privacidade** — desenvolvimento em conformidade com a **LGPD** (Lei Geral de Proteção de Dados), incluindo termo de uso sobre a finalidade da coleta de dados sensíveis de saúde

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Uso |
|---|---|
| [React Native Expo](https://expo.dev/) | Framework principal — base de código única compatível com Android e iOS |
| [AWS S3](https://aws.amazon.com/s3/) | Armazenamento de documentos e imagens (exames, receitas) |
| [AWS DynamoDB](https://aws.amazon.com/dynamodb/) | Banco de dados para os metadados e registros de saúde |
| [AWS Amplify](https://aws.amazon.com/amplify/) | Integração do código JavaScript ao ambiente AWS (backend-as-code, Gen 2) |
| [AWS Cognito](https://aws.amazon.com/cognito/) | Gerenciamento e autenticação de usuários |
| [Amazon Bedrock](https://aws.amazon.com/bedrock/) | Análise dos dados de wearables (Claude, via Converse API + Guardrails) — apoio informativo, nunca diagnóstico |
| [AWS Lambda](https://aws.amazon.com/lambda/) | Parsing defensivo dos exports de wearables, integrações com APIs públicas de saúde (USPSTF, PNI/RNDS, CNES) |

O dado de saúde do usuário é processado **dentro da própria conta AWS do projeto** (Bedrock, na região `us-east-1`) — não é enviado a nenhum provedor de IA de terceiros.

---

## AWS Amplify Gen 2

O app usa um backend compartilhado de desenvolvimento no Amplify Gen 2. O arquivo `amplify_outputs.json` da raiz e a configuracao oficial do app nesse ambiente e deve ser versionado, porque contem configuracao publica de cliente, nao credenciais secretas.

A pasta `amplify/` continua fora de `src/` porque representa backend-as-code. O codigo de runtime que consome Cognito e Amplify Data fica em `src/services/`, com o bootstrap global em `src/services/amplify/configureAmplify.ts`.

Credenciais AWS, `.env`, `.env*.local`, `.aws/`, `.amplify/`, caches e artefatos gerados nao devem ser enviados ao Git. Para producao, use outro ambiente/output antes de release. Detalhes: [docs/aws-amplify.md](docs/aws-amplify.md).

---

## 💊 Interações Medicamentosas — Fonte dos Dados

A funcionalidade de alerta de interação medicamentosa (tela "Medicamentos") **não consulta nenhuma API externa em tempo real**. Essa decisão foi tomada após avaliar as alternativas disponíveis no momento da implementação.

Optou-se, em vez disso, por um dataset curado manualmente e embutido no app (`src/data/drugInteractions/`), sem chamadas de rede:

- **`aliases.ts`** — mapeia nomes comerciais brasileiros e variantes em inglês/português para o princípio ativo canônico (ex.: "Aradois", "Losartan" → `losartana`), permitindo casar o texto livre digitado pelo usuário com o princípio ativo correto.
- **`pairs.ts`** — cerca de 19 pares de interação clinicamente bem estabelecidos, cada um com uma explicação de risco e de mecanismo farmacológico em português.

**Base de conhecimento:** cada um dos 19 pares em `pairs.ts` pertence a uma de seis classes farmacológicas bem documentadas. A tabela abaixo cita, para cada classe, a referência específica consultada para validar o mecanismo e o risco descritos — portanto cobre a totalidade do dataset, não apenas uma amostra:

| Pares cobertos | Mecanismo | Referência |
|---|---|---|
| warfarina+ibuprofeno, warfarina+diclofenaco, warfarina+aas, warfarina+claritromicina, warfarina+fluoxetina | Revisão sistemática de todas as interações medicamentosas da warfarina (AINEs, AAS, macrolídeos, ISRS) | HOLBROOK, A. M.; PEREIRA, J. A.; LABIRIS, R.; MCDONALD, H.; DOUKETIS, J. D.; CROWTHER, M.; WELLS, P. S. Systematic overview of warfarin and its drug and food interactions. *Archives of Internal Medicine*, v. 165, n. 10, p. 1095–1106, 2005. PMID: 15911722. |
| warfarina+ibuprofeno, warfarina+diclofenaco | Risco de sangramento com AINEs em uso de anticoagulante oral | KENT, A. P. Navigating NSAID Use in Patients Receiving Oral Anticoagulation: Is There a Safe Course? *Thrombosis and Haemostasis*, v. 120, n. 7, p. 1001–1003, 2020. DOI: 10.1055/s-0040-1713098. |
| aas+ibuprofeno, aas+diclofenaco | Ibuprofeno bloqueia o sítio de ligação do AAS na COX-1, reduzindo seu efeito antiplaquetário/cardioprotetor | CATELLA-LAWSON, F.; REILLY, M. P.; KAPOOR, S. C.; CUCCHIARA, A. J.; DEMARCO, S.; TOURNIER, B.; VYAS, S. N.; FITZGERALD, G. A. Cyclooxygenase inhibitors and the antiplatelet effects of aspirin. *New England Journal of Medicine*, v. 345, n. 25, p. 1809–1817, 2001. |
| fluoxetina+sertralina, fluoxetina+tramadol, sertralina+tramadol | Síndrome serotoninérgica por excesso de serotonina no SNC | BOYER, E. W.; SHANNON, M. The Serotonin Syndrome. *New England Journal of Medicine*, v. 352, n. 11, p. 1112–1120, 2005. |
| enalapril+espironolactona, losartana+espironolactona, captopril+espironolactona | Hipercalemia por IECA/BRA associado a diurético poupador de potássio | JUURLINK, D. N.; MAMDANI, M. M.; LEE, D. S.; KOPP, A.; AUSTIN, P. C.; LAUPACIS, A.; REDELMEIER, D. A. Rates of hyperkalemia after publication of the Randomized Aldactone Evaluation Study. *New England Journal of Medicine*, v. 351, n. 6, p. 543–551, 2004. |
| sinvastatina+claritromicina, sinvastatina+eritromicina | Inibição do CYP3A4 pelo macrolídeo, elevando os níveis da estatina e o risco de rabdomiólise | FALLAH, A.; DEEP, M.; SMALLWOOD, D.; HUGHES, P. Life-threatening rhabdomyolysis following the interaction of two commonly prescribed medications. *Australasian Medical Journal*, 2013; e MHRA (Medicines and Healthcare products Regulatory Agency, Reino Unido). [Simvastatin: updated advice on drug interactions](https://www.gov.uk/drug-safety-update/simvastatin-updated-advice-on-drug-interactions). *Drug Safety Update*. |
| enalapril+ibuprofeno, losartana+ibuprofeno, captopril+ibuprofeno, diclofenaco+enalapril | AINE reduz a síntese de prostaglandinas renais, contrariando o efeito do IECA/BRA e piorando a função renal | LAPI, F.; AZOULAY, L.; YIN, H.; NESSIM, S. J.; SUISSA, S. Concurrent use of diuretics, angiotensin converting enzyme inhibitors, and angiotensin receptor blockers with non-steroidal anti-inflammatory drugs and risk of acute kidney injury: nested case-control study. *BMJ*, v. 346, p. e8525, 2013. |

Além dessas referências por mecanismo, a tabela de nomes comerciais brasileiros (`aliases.ts`) foi conferida contra:

- ANVISA. [Bulário Eletrônico](https://consultas.anvisa.gov.br/#/bulario/) — correspondência entre nomes comerciais brasileiros e princípios ativos.

⚠️ **Importante:** a lista é propositalmente pequena e **não exaustiva** — cobre apenas combinações amplamente conhecidas (ex.: anticoagulante + AINE, IECA/BRA + diurético poupador de potássio, estatina + macrolídeo, combinações serotoninérgicas). Ela não substitui avaliação médica ou farmacêutica e deve ser tratada como apoio informativo, no mesmo espírito das demais funcionalidades de IA do app (nunca diagnóstico). Para uso além do escopo acadêmico deste TCC, o dataset precisaria ser revisado e expandido por um farmacêutico/profissional qualificado e, idealmente, substituído por uma base de dados clínica validada (ex.: DrugBank, Micromedex).

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
