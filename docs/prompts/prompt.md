# PROMPT DE INICIALIZAÇÃO — PROJETO SUASAÚDE TCC
## Otimizado para Claude Code + OpusPlan com /using-superpowers

---

## 🎯 CONTEXTO E MISSÃO

Você é o agente principal de desenvolvimento do **SuaSaúde**, um aplicativo móvel de TCC que centraliza a gestão de saúde pessoal — exames, medicamentos, agendamentos e análise assistida por IA. O projeto usa React Native com Expo, backend AWS Amplify e atende usuários com baixo letramento digital.

Antes de executar qualquer coisa:
1. Ative `/using-superpowers`
2. Execute `/graphify-windows` para mapear o grafo do projeto atual
3. Leia `@material TCC/Artigo/Pre Projeto TCC 1.docx` para entender o contexto acadêmico
4. Leia os arquivos existentes de login e upload de exames antes de qualquer alteração

---

## 🏗️ ARQUITETURA TÉCNICA (NÃO NEGOCIÁVEL)

```
Frontend:   React Native + Expo SDK (mais recente estável)
Roteamento: Expo Router (file-based routing)
Estilos:    NativeWind (Tailwind para RN) + design tokens centralizados
UI Kit:     shadcn/ui (adaptado RN via RNUI ou equivalente)
Backend:    AWS Amplify (Auth + API + Storage)
Auth:       AWS Cognito (email/senha + Google OAuth)
DB:         DynamoDB via AppSync (GraphQL)
Storage:    S3 (exames/arquivos)
```

Habilidades a usar:
- `/frontend-design` → toda UI/UX
- `/expo` → `/building-native-ui`, `/expo-api-routes`, `/expo-tailwind-setup`, `/use-dom`
- `/amazon-location-service` → integração AWS (usar documentação oficial AWS CLI)

---

## 📋 METODOLOGIA OBRIGATÓRIA: SPEC-DRIVEN DEVELOPMENT

**Para CADA feature ou tela, o agente DEVE seguir este ciclo:**

```
FASE 0 → /clean       SEMPRE executar /clean ao iniciar um novo plano ou mudar de atividade
FASE 1 → SPEC         Crie um arquivo .spec.md detalhado antes de qualquer código
FASE 2 → PLANO        Divida em tasks atômicas e ordenadas (máx. 3-5 por plano)
FASE 3 → IMPLEMENT    Code cirúrgico, focado, sem efeitos colaterais
FASE 4 → VALIDATE     Cheque o grafo, confirme integração, atualize docs
```

> 🧹 **REGRA DE LIMPEZA DE CONTEXTO:** O comando `/clean` é **obrigatório** antes de iniciar qualquer novo plano ou ao trocar de atividade/fase. Isso garante que decisões, arquivos e estados de planos anteriores não contaminem o contexto do plano atual. Nunca pule este passo — contexto sujo é a causa mais comum de regressões e inconsistências entre planos.

### Estrutura obrigatória de cada SPEC:

```markdown
# SPEC: [Nome da Feature]
## Objetivo
## Contexto (arquivos existentes relevantes)
## Requisitos funcionais
## Requisitos não-funcionais
## Componentes afetados
## Contratos de dados (tipos TypeScript / schemas GraphQL)
## Fluxo de estados
## Critérios de aceitação
## Dependências e riscos
```

### Estrutura obrigatória de cada PLANO:

```markdown
# PLANO: [Nome da Feature]
## Pré-condições (o que precisa existir antes)
## Tasks (numeradas, atômicas, máx. 5 por plano)
  - Task 1.1: [verbo + substantivo] — arquivo alvo
  - Task 1.2: ...
## Rollback (como desfazer se der errado)
## Validação final
```

> ⚠️ NUNCA inicie código sem uma SPEC aprovada. NUNCA faça uma task que afete mais de 1 arquivo sem que o plano esteja explícito.

---

## 📁 FASE 0 — RENOMEAÇÃO DE ARQUIVOS (EXECUTE PRIMEIRO)

Renomeie os arquivos abaixo com busca e substituição global de todas as referências (imports, rotas, comentários, docs):

| De | Para | Motivo |
|----|------|--------|
| `src/screens/HomeScreen.tsx` | `src/screens/LoginScreen.tsx` | É a tela de login, não home |
| `src/screens/DashboardScreen.tsx` | `src/screens/HomeScreen.tsx` | É a home real do app |
| `src/screens/ProfileSetupScreen.tsx` | `src/screens/OnboardingScreen.tsx` | É um formulário de onboarding |

**Debata comigo** qualquer outra renomeação que identificar antes de executar.

Após renomear, execute `/graphify-windows` novamente para atualizar o grafo.

---

## 🎨 FASE 1 — DESIGN SYSTEM (EXECUTE ANTES DE QUALQUER TELA)

### Crie o arquivo `@DESIGN.md` com:

**Paleta de cores** (inspirada em CashApp + Chime):
```
Primária:   Verde (#00C853 light / #00E676 dark)
Fundo:      Quase-preto (#0A0A0A dark / #F5F5F5 light)
Superfície: #141414 dark / #FFFFFF light
Texto:      #F0F0F0 dark / #0A0A0A light
Secundária: #1A1A1A dark / #EEEEEE light

Semânticas:
  Sucesso/Sim/Masculino: Verde (#00C853)
  Ação/Info/Neutro:      Azul  (#2196F3)
  Erro/Não/Feminino:     Vermelho (#F44336)
  Alerta:                Âmbar (#FFC107)
```

**Modo de tema:**
- Toggle na tela de Perfil: `Claro | Automático (padrão) | Escuro`
- Armazenado em AsyncStorage + Context global
- Padrão: detecta preferência do sistema (`useColorScheme`)

**Tokens obrigatórios em `src/theme/tokens.ts`:**
```typescript
// Todos os espaçamentos, raios, tipografia e cores
// NENHUMA tela deve usar valores hardcoded
export const tokens = {
  colors: { ... },
  spacing: { ... },
  radius: { ... },
  typography: { ... }
}
```

**Componentes compartilhados obrigatórios em `src/components/ui/`:**
- `Button.tsx` — variantes: primary, secondary, ghost, danger
- `Input.tsx` — com label, error state, ícone opcional
- `Card.tsx` — com sombra adaptativa ao tema
- `Badge.tsx` — status coloridos
- `Avatar.tsx` — iniciais ou foto
- `ScreenWrapper.tsx` — wrapper padrão com SafeArea + padding
- `SectionHeader.tsx` — título de seção reutilizável
- `LoadingOverlay.tsx` — loading global

---

## 🔐 FASE 2 — AUTENTICAÇÃO E SESSÃO

### SPEC 2.1 — Proteção de rotas
**Problema:** URL direta `…/HomeScreen` bypassa o login.
**Solução:** Implementar middleware de auth no Expo Router via `_layout.tsx` raiz com `useProtectedRoute()`.

```typescript
// Lógica esperada:
// 1. Checar token Cognito válido
// 2. Se não autenticado → redirecionar para LoginScreen
// 3. Nenhuma rota do app principal acessível sem sessão ativa
```

### SPEC 2.2 — Onboarding único
**Problema:** `OnboardingScreen` pode ser preenchido múltiplas vezes, gerando duplicatas no DynamoDB.
**Solução:** Ao fazer login, verificar flag `onboardingCompleted` no perfil do usuário (DynamoDB).

```typescript
// Fluxo de login:
// 1. Cognito autentica → token válido
// 2. Query DynamoDB: GET /users/{userId}
// 3. if (!user.onboardingCompleted) → navegar OnboardingScreen
// 4. OnboardingScreen ao salvar → setar onboardingCompleted: true
// 5. Nunca mais redirecionar para onboarding
```

### SPEC 2.3 — Dados reais do usuário
**Problema:** App usa dados mockados ("Alo André", nome hardcoded).
**Solução:** Criar `UserContext` que carrega dados reais do Cognito + DynamoDB na inicialização da sessão.

```typescript
interface UserSession {
  id: string
  name: string          // Do Cognito / DynamoDB
  email: string
  photoUrl?: string
  onboardingCompleted: boolean
}
```

---

## 📱 FASE 3 — TELAS (criar uma SPEC + PLANO por tela)

Para cada tela abaixo, o agente deve:
1. Criar `docs/specs/[NomeTela].spec.md`
2. Criar `docs/plans/[NomeTela].plan.md`
3. Implementar apenas após confirmação

### Tela 1 — `LoginScreen`
- Login com email/senha ou Google OAuth (Cognito)
- Links: "Esqueceu a senha" → ForgotPasswordScreen | "Cadastrar" → RegisterScreen
- Não acessível se já logado (redireciona para HomeScreen)

### Tela 2 — `RegisterScreen`
- Email + senha + confirmação de senha
- Validação: senha mínimo 8 chars, 1 maiúscula, 1 número
- Opção criar conta com Google
- Ao criar → ir para ConfirmScreen

### Tela 3 — `ConfirmScreen`
- Input para código de 6 dígitos enviado por email
- Reenviar código com cooldown de 60s
- Ao confirmar → ir para LoginScreen (ou direto para Onboarding se primeira vez)

### Tela 4 — `ForgotPasswordScreen`
- Step 1: inserir email → enviar código
- Step 2: inserir código + nova senha
- Usar Cognito `forgotPassword` + `confirmForgotPassword`

### Tela 5 — `OnboardingScreen` (antigo ProfileSetupScreen)
- Campos: nome, data nascimento, sexo, peso, altura
- Condicional: se sexo = feminino → pergunta sobre gravidez
- Hábitos de saúde (checkboxes): fumante, sedentário, pratica exercício, etc.
- Doenças crônicas preexistentes (multi-select)
- Animação de progresso entre steps (manter a que existe)
- Ao salvar: setar `onboardingCompleted: true` no DynamoDB
- **Não criar duplicata se registro já existir** (upsert, não insert)

#### 🐛 BUG CONFIRMADO — Botões de navegação sumindo

**Sintoma:** Os botões "Próximo", "Voltar" e "Concluir" desaparecem durante o uso do app. O comportamento era correto em algum momento anterior (botões existiam e tinham animação).

**Prioridade:** Alta — bloqueia o fluxo completo de onboarding.

**Causas prováveis a investigar (em ordem de probabilidade):**

```
1. OVERFLOW/CLIPPING — o container pai tem height fixo ou overflow: hidden,
   e os botões ficam fora da área visível quando o teclado sobe (KeyboardAvoidingView
   mal configurado empurra o layout para fora da tela)

2. CONDITIONAL RENDER — alguma condição de estado (ex: isLoading, currentStep,
   ou validação de campo) está avaliando para false/null e desmontando os botões
   sem querer

3. ZINDEX / POSICIONAMENTO — botões com position: absolute estão sendo cobertos
   por outro elemento (ex: o ScrollView do formulário ou o personagem do topo)

4. ANIMAÇÃO TRAVADA — a animação de entrada dos botões (Animated.Value) está
   presa em opacity: 0 ou translateY fora da tela, sem completar para o estado visível

5. SCROLL SEM BOUNCE — botões estão dentro do ScrollView mas fora da viewport,
   e o usuário precisa rolar para baixo para vê-los (problema de UX, não de código)
```

**O que o agente DEVE fazer antes de corrigir:**
1. Ler o arquivo atual do `OnboardingScreen` (ou `ProfileSetupScreen`) na íntegra
2. Mapear onde os botões são renderizados — dentro ou fora do `ScrollView`?
3. Checar se há `KeyboardAvoidingView` e como está configurado (`behavior` prop)
4. Checar o valor do `Animated.Value` associado à animação dos botões no estado inicial
5. Testar com teclado aberto E fechado — o bug ocorre nos dois casos?

**Solução esperada:**
- Botões fora do `ScrollView`, sempre visíveis na parte inferior da tela (`position: absolute bottom` ou em um container fixo após o scroll)
- `// ATTENTION:` garantir que `KeyboardAvoidingView` não empurre os botões para fora da tela — usar `keyboardVerticalOffset` correto por plataforma (iOS vs Android)
- Animação de entrada deve ter valor inicial que garanta visibilidade como fallback, ou ter um `useEffect` que force o estado final caso a animação não complete
- `// DECISION:` se os botões estiverem dentro do ScrollView, movê-los para fora é a correção arquitetural correta — não usar workarounds de scroll



### Tela 6 — `HomeScreen` (antigo DashboardScreen)
Seções em ordem vertical:
1. **Saudação** com nome real do usuário + data
2. **Resumo de saúde** (dados do app de saúde do celular via HealthKit/Google Fit — opcional, exibir se disponível): passos, sono, BPM
3. **Medicamentos pendentes** — contador + botão de quick access para AgendaScreen filtrada
4. **Próximos eventos** — máx. 3, cards compactos
5. **Últimos exames** — lista dos exames mais recentes (dados reais do S3 + DynamoDB), clicável para abrir
6. **Alertas de prevenção** — se houver alertas gerados pela análise de exames

### Tela 7 — `ExamsScreen`
- Lista completa de exames com: título, data de upload, tipo de exame
- Botão FAB para upload de novo exame (integração existente do Brunno — não reescrever, integrar)
- Ao clicar no exame → abrir/visualizar o arquivo (PDF viewer ou imagem)
- Ao fazer upload → atualizar lista automaticamente (invalidar cache)

### Tela 8 — `ChatBotScreen` (antigo AIAnalysisScreen)
- Chat conversacional com IA (API a definir — Claude API recomendado)
- IA tem acesso ao contexto completo do usuário (exames, perfil, medicamentos, agenda)
- Se usuário enviar um arquivo no chat → automaticamente fazer upload para ExamsScreen
- Sugestões de prompts rápidos: "O que significa este exame?", "Qual médico devo procurar?", "Meu próximo remédio"

### Tela 9 — `PreventionScreen`
- Lista de análises/alertas gerados a partir dos exames
- Card por item: status (normal/alerta/crítico), descrição, arquivo de origem
- Ao clicar → explicação detalhada do critério de análise
- Vazio state: "Nenhum exame analisado ainda. Faça o upload de um exame."

### Tela 10 — `ProfileScreen`
- Dados pessoais do usuário (conectados ao DynamoDB — dados reais)
- Edição inline ou modal
- Cálculo de IMC em tempo real (peso + altura do perfil)
- Toggle de tema: Claro / Automático / Escuro
- Botão: Logout (limpar sessão Cognito + contexto local)
- Botão: Exportar dados (placeholder — "Em desenvolvimento")

### Tela 11 — `AgendaScreen` (antigo AppointmentScreen)
- Calendário horizontal de navegação por dias
- Tipos de evento:
  - `medication`: recorrente (diário/periódico), horário fixo
  - `appointment`: único, pode ter retorno associado
- Ao clicar em evento → detalhes + opção de editar/excluir
- Sincronizar com calendário nativo (Expo Calendar API)
- Badge contador de eventos por dia no calendário

---

## ☁️ FASE 4 — AWS (documentar após implementar)

Após implementar cada integração AWS, **atualizar `@docs/aws-amplify.md`** com:
- Qual serviço foi usado e por quê
- Configuração aplicada (sem secrets)
- Fluxo de dados (diagrama textual)
- Como testar localmente

**Sandbox:** Usar sandbox do Brunno por padrão. Criar sandbox própria apenas se necessário (me consultar antes).

Você tem permissão para:
- Abrir o Chrome e solicitar meu login na AWS
- Usar AWS CLI instalada localmente
- Criar/atualizar outputs da Sandbox
- Ler a documentação oficial AWS para garantir implementação correta

---

## ✅ REGRAS DE COMPORTAMENTO DO AGENTE

1. **`/clean` ao trocar de plano ou atividade** — obrigatório, sem exceção. Ao concluir um plano ou iniciar uma nova fase/tela, execute `/clean` antes de qualquer outra ação
2. **Antes de qualquer código**, mostre a SPEC e aguarde confirmação
3. **Alterações são cirúrgicas** — nunca reescreva um arquivo inteiro sem necessidade
4. **Nunca hardcode** cores, strings de usuário ou configurações (use tokens e context)
5. **Integre o código** feito pelo o Brunno e trago pelo o merge de forma perfomatica e explicativa 
6. **Me consulte** antes de: criar sandbox AWS própria, renomear arquivos além da lista acima, alterar schema do DynamoDB
7. **Use o grafo** (`/graphify-windows`) para entender dependências antes de alterar qualquer arquivo
8. **Documente** decisões e pontos de atenção com dois padrões de comentário obrigatórios:
   - `// DECISION: [motivo]` — para cada escolha técnica não óbvia (ex: por que usou upsert, por que escolheu determinado hook)
   - `// ATTENTION: [motivo]` — para cada ponto que exige cuidado futuro (ex: limite de tamanho de arquivo, campo que depende de outro serviço, lógica condicional sensível)
9. **Modo escuro/claro** é obrigatório em TODOS os componentes — nenhum componente pode usar cores hardcoded
10. **Não adicionar testes** — foco é em funcionalidade e qualidade de código
11. **Debata comigo** qualquer decisão arquitetural que não esteja coberta neste prompt

---

## 🧑‍🎨 SPEC: SISTEMA DE PERSONAGENS E AVATARES

### Contexto
As telas de autenticação (Login, Register, Confirm, ForgotPassword) possuem ilustrações de personagens na parte superior. O efeito desejado é que o personagem pareça emergir de *trás* da área de formulário — como se o card de campos "cobrisse" a metade inferior do personagem. Atualmente há um bug crítico: personagens de cor branca perderam sua coloração durante a remoção do fundo (ficaram transparentes).

Além disso, existe um sistema de avatar de perfil baseado no sexo declarado no Onboarding.

---

### SPEC A — Personagens nas telas de autenticação

**Efeito visual esperado:**
```
┌─────────────────────────┐
│                         │
│     [personagem]        │  ← personagem visível acima do card
│         👤              │
│    ┌───────────────┐    │
│    │  [formulário] │    │  ← card "cobre" a metade inferior do personagem
│    │               │    │     criando a ilusão de profundidade
│    └───────────────┘    │
└─────────────────────────┘
```

**Requisitos técnicos:**
- Usar `zIndex` para posicionar o personagem atrás do card de formulário, mas à frente do fundo da tela
- O personagem deve ter `position: absolute` com `bottom` alinhado ao topo do card (valor negativo para sobrepor)
- O card de formulário deve ter `zIndex` maior que o personagem
- A sobreposição deve ser de aproximadamente 30-40% da altura do personagem

**Correção do bug de transparência:**
- `// ATTENTION:` Os personagens brancos têm canal alpha comprometido pela remoção de fundo anterior
- Solução: reprocessar as imagens usando `expo-image` com `tintColor` **apenas** se o asset for monocromático
- Para assets coloridos, usar a imagem original sem `tintColor`
- Verificar cada asset individualmente — não aplicar solução genérica a todos
- Se as imagens originais (sem remoção de fundo) estiverem disponíveis, usá-las e aplicar remoção de fundo apenas nas cores não-brancas via máscara
- `// DECISION:` Preferir PNGs com fundo transparente nativos (pré-exportados) ao invés de técnicas de recorte em runtime, para evitar o bug de canal alpha

**Assets de personagens por tela:**
```
// ATTENTION: confirmar com Pedro quais assets existem atualmente em assets/images/
// antes de mapear — não assumir nomes de arquivo

LoginScreen      → personagem padrão (confirmar asset)
RegisterScreen   → personagem padrão (confirmar asset)
ConfirmScreen    → personagem padrão (confirmar asset)
ForgotPassword   → personagem padrão (confirmar asset)
```

**Componente a criar:** `src/components/ui/AuthCharacter.tsx`
```typescript
// Props esperadas:
interface AuthCharacterProps {
  // DECISION: recebe o source diretamente para manter o componente genérico
  //           e permitir variações por tela sem criar múltiplos componentes
  source: ImageSourcePropType
  overlapHeight?: number  // quanto do personagem fica atrás do card (default: 40%)
  style?: StyleProp<ImageStyle>
}
```

---

### SPEC B — Avatar de perfil baseado no sexo

**Lógica:**
- Ao exibir o avatar do usuário (ProfileScreen, header da HomeScreen, etc.), verificar `user.gender` do `UserContext`
- `gender === 'male'` → exibir `assets/images/boy_image.png`
- `gender === 'female'` → exibir `assets/images/fem_image.png`
- `gender === undefined` ou não preenchido → exibir avatar com iniciais do nome (componente `Avatar.tsx` existente)

**Paths dos assets:**
```
assets/images/boy_image.png   ← personagem masculino
assets/images/fem_image.png   ← personagem feminino
```
> `// ATTENTION:` Os arquivos estão em `C:\Users\pedro\Documents\Developing's\tcc\assets\images\` — confirmar que estão commitados no repositório e acessíveis pelo projeto antes de referenciar

**Campo no UserContext/DynamoDB:**
```typescript
interface UserSession {
  id: string
  name: string
  email: string
  gender: 'male' | 'female' | 'other' | undefined  // vem do OnboardingScreen
  photoUrl?: string           // futuramente: upload de foto customizada
  onboardingCompleted: boolean
}
```

**Componente a atualizar:** `src/components/ui/Avatar.tsx`
```typescript
// Deve suportar três modos:
// 1. Imagem customizada (photoUrl) — prioridade máxima
// 2. Imagem por gênero (boy_image / fem_image) — se gender definido
// 3. Iniciais do nome — fallback final
// DECISION: ordem de prioridade garante que foto de perfil futura não quebra o sistema atual
```

**Onde o avatar aparece:**
- `ProfileScreen` — destaque, tamanho grande
- `HomeScreen` — saudação no topo, tamanho pequeno/médio
- Qualquer header que exiba o usuário logado

---

## 🚀 ORDEM DE EXECUÇÃO SUGERIDA

```
1.  /using-superpowers + /graphify-windows (atualizar grafo)
2.  Renomear arquivos (Fase 0)
    → /clean
3.  /graphify-windows (atualizar grafo pós-rename)
    → /clean
4.  Criar DESIGN.md + tokens + componentes UI base (Fase 1)
    → /clean
5.  Sistema de personagens e avatares (SPEC Personagens)
    → confirmar assets existentes antes de implementar
    → /clean
6.  Autenticação e proteção de rotas (Fase 2)
    → /clean
7.  Telas em ordem: Login → Register → Confirm → Onboarding → Home
    → /clean entre cada tela
8.  Integrar exames reais na Home + ExamsScreen
    → /clean
9.  Demais telas conforme prioridade acordada
    → /clean entre cada tela
10. Documentar AWS (Fase 4)
```

**Confirme o entendimento deste prompt e me mostre:**
- O grafo atual do projeto
- Os arquivos de login e upload de exames que existem
- Sua proposta de SPEC para a Fase 0 (renomeação) e Fase 1 (Design System)

Só então inicie a execução.