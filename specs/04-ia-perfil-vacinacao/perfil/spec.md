# EPIC: Perfil — Dados de Saúde e Preferências (Bloco 4)

## 1. Identificação
- Bloco/arquivo de origem no Claude Design: tela **4b** ("Perfil — dados de saúde e preferências") em `specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html` (linhas 76–126).
- Rota/arquivo no código (existente): `src/app/(app)/profile.tsx` (rota `/profile`, aba "Mais" da tab bar) → renderiza `src/screens/ProfileScreen.tsx`.
- Ator(es): usuário final (paciente autenticado).

## 2. História da funcionalidade
Como usuário final, quero ver um resumo do meu perfil (avatar, nome, e-mail e dados de saúde calculados a partir do meu cadastro), controlar a aparência do app, entender/gerenciar a conexão com o app de Saúde do celular, exportar meus dados e sair da conta, para que eu tenha controle e transparência sobre minhas informações de saúde no SuaSaúde.

### Cenários (Given/When/Then)

- **Carregando:**
  Given a tela `/profile` é aberta
  When `UserContext` ainda não hidratou o perfil (nem do cache local nem do DynamoDB)
  Then a tela deve exibir o padrão de 4 estados de `DESIGN_TOKENS.md` §4 (skeleton bars + spinner + "Carregando seus dados...") em vez de renderizar campos com `—` (comportamento atual, ver `plan.md`).

- **Perfil carregado com dados reais:**
  Given o usuário concluiu o wizard de Perfil de Saúde (2a) e `UserContext.user` está populado (via `AsyncStorage` cache-first + `client.models.UserProfile.list({})`)
  When a tela `/profile` renderiza
  Then avatar (iniciais ou foto), nome (`user.name`), e-mail (`user.email`) e o card "Dados de saúde" com Peso/Altura/IMC/Idade/Sexo biológico/Tabagismo são exibidos com os valores reais — IMC e Idade **computados no cliente** (não lidos de nenhum campo persistido), conforme detalhado no Mapa de dados.

- **Perfil incompleto (campos de saúde ausentes):**
  Given `user.weightKg`, `user.heightCm`, `user.birthDate`, `user.gender` ou `user.isSmoker` estão `undefined` (onboarding parcial ou pulado)
  When o card "Dados de saúde" renderiza
  Then cada campo ausente mostra `—` isoladamente (nunca trava o card inteiro nem quebra o cálculo de IMC/Idade dos campos presentes) — comportamento já implementado, manter.

- **Tema alternando entre claro/automático/escuro:**
  Given o usuário está na seção "Aparência" com os 3 botões (Claro/Automático/Escuro)
  When o usuário toca em uma opção diferente da atual
  Then `ThemeContext.setTheme(mode)` é chamado, o app re-renderiza imediatamente no novo tema (via NativeWind `colorScheme`), a opção selecionada fica com fundo/borda/texto no estado ativo (padrão de chip selecionado de `DESIGN_TOKENS.md` §4) e a escolha persiste em `AsyncStorage` entre sessões — já implementado, manter.

- **Dispositivos conectados (health-app connect) — pendência técnica:**
  Given o usuário toca no toggle "App de Saúde do celular"
  When não existe nenhuma integração real com HealthKit/Google Fit no código (confirmado: nenhum pacote `expo-health`/`react-native-health`/Health Connect instalado ou importado em todo o repositório)
  Then o toggle **não deve simular uma conexão bem-sucedida**; deve exibir um estado "Em breve"/"Indisponível" claro e não persistir nenhum estado de conexão falso — ver decisão em `plan.md` (regra 2 da constituição).

- **Exportar meus dados — pendência técnica (LGPD):**
  Given o usuário toca na linha "Exportar meus dados"
  When não existe nenhum mecanismo real de exportação de dados no código (a implementação atual apenas dispara `Alert.alert('Exportar dados', 'Em desenvolvimento.')`)
  Then a tela deve comunicar claramente que a funcionalidade está pendente (sem fingir sucesso), e a pendência deve ficar registrada como item de portabilidade de dados exigido pela LGPD (regra 4 da constituição) — não pode ficar ausente silenciosamente de um app de saúde.

- **Tentativa de logout:**
  Given o usuário toca em "Sair da conta"
  When o toque é confirmado (ver nota sobre confirmação no Mapa de navegação)
  Then `clearUser()` limpa `UserContext` + cache `AsyncStorage`, `logoutUser()` encerra a sessão Cognito (`userSessionService`), e o app navega para `/` (tela de login) via `router.replace('/')` — já implementado; falta apenas o padrão de confirmação (ver §6).

- **Erro ao carregar/atualizar perfil:**
  Given `fetchAndUpdateUser()` falha (erro de rede/Amplify)
  When o `catch` silencioso é acionado
  Then o estado anterior (cache ou `null`) é mantido sem crash — comportamento atual já é resiliente, mas não há feedback visual de erro para o usuário nem opção de "Tentar novamente" conforme o padrão de erro de `DESIGN_TOKENS.md` §4; registrar como gap menor.

## 3. Estrutura da página
Ordem visual observada no markup (4b), de cima para baixo, dentro do "phone frame" 390×844:

1. Status bar mock (hora "9:41" + ícone de sinal) — decorativo, não implementar.
2. Linha avatar + nome + e-mail: avatar circular 64×64 (bg `#E8F5EE`, borda 2px `#C7E8D6`, iniciais 600 22px `#0C6341`) + nome (`{{ wizName }}`, 600 22px) + e-mail (400 16px, `#55605C`) — texto de exemplo no design (`maria.souza@email.com`) é estático, na implementação real vem de `user.email`.
3. Botão "Editar perfil" (outline verde, altura 52px, radius 14, borda 1.5px `#10794E`, texto `#0C6341`).
4. Seção "Dados de saúde": título (600 20px) + card branco (borda 1px `#EFF1F0`, radius 16px) com 6 linhas divididas por borda inferior: Peso, Altura, IMC (`{{ imcValue }} · {{ imcLabel }}`), Idade, Sexo biológico, Tabagismo — label 400 16px `#55605C` à esquerda, valor 600 17px `#141817` à direita.
5. Seção "Aparência": título (600 20px) + 3 botões lado a lado (Claro/Automático/Escuro), altura 48px, radius 12px, cada um com borda/bg/cor de texto dinâmicas conforme seleção (`themeXBorder`/`themeXBg`/`themeXColor`).
6. Seção "Configurações": título (600 20px) + card "Dispositivos conectados" (título 600 17px + texto explicativo 400 16px: *"Conecte o app de Saúde do seu celular (Apple Health ou Google Fit) para o Assistente de IA usar esses dados nas respostas. Eles não são exibidos em nenhuma outra tela do app."* + linha-toggle "App de Saúde do celular" com badge de status colorido `{{ hcMark }}`/`{{ hcLabel }}`) + card separado com 2 linhas: "Exportar meus dados" (chevron `›`) e "Sair da conta" (texto vermelho `#B3261E`, chevron `›`).
7. Bottom nav (5 abas, "Mais" ativo — mesma barra padrão do app).
8. Home-indicator bar decorativa.

**Divergência atual conhecida:** a implementação (`ProfileScreen.tsx`) já tem avatar/nome/e-mail/editar-perfil/dados-de-saúde/aparência corretos, mas a seção "Configurações" atual só tem "Exportar dados" (texto diferente: "Exportar dados" vs. design "Exportar meus dados") + "Sair da conta", **sem** o card "Dispositivos conectados" — esse bloco inteiro está ausente e precisa ser criado (ver `tasks.md`).

## 4. Mapa de navegação

| Elemento | Tipo | Ação | Destino | Condição |
|---|---|---|---|---|
| Botão "Editar perfil" | Botão outline | Navega | `/edit-profile` (tela 4c) | Sempre visível |
| Botões "Claro"/"Automático"/"Escuro" | Chip selector (3-way) | `ThemeContext.setTheme('light'\|'system'\|'dark')` | Permanece na tela, re-renderiza no novo tema | Sempre visível |
| Toggle "App de Saúde do celular" | Toggle/linha | `toggleHealthConnect` (design) | **Pendência**: sem integração real; ação deve levar a um estado "Em breve", não a uma conexão simulada | Sempre visível |
| Linha "Exportar meus dados" | Linha com chevron | Ação externa (design não especifica destino) | **Pendência**: sem mecanismo real; hoje é `Alert.alert(...)` placeholder | Sempre visível |
| Linha "Sair da conta" | Linha vermelha com chevron | `clearUser()` + `logoutUser()` | `/` (login) via `router.replace('/')` | Sempre visível; recomendado adicionar confirmação (ver §6) |
| Bottom nav | Nav global | Troca de aba | `/dashboard`, `/appointments`, `/exams`, `/medicines`, hub "Mais" | "Mais" ativo nesta tela (pendência #6 do `GAP_ANALYSIS.md` sobre a estrutura do hub "Mais" ainda não resolvida — fora do escopo deste EPIC) |

## 5. Mapa de dados

| Campo/Componente | Origem do dado | Fonte técnica | Tipo | Validação | Comportamento offline/erro |
|---|---|---|---|---|---|
| Avatar (iniciais/foto) | `UserProfile.name` + `UserProfile.gender` (+ `photoUrl` reservado, não implementado) | `UserContext` (DynamoDB `UserProfile` via Amplify, cache-first `AsyncStorage`) | string | — | Mostra placeholder de iniciais se `name` ausente |
| Nome (`wizName`) | `user.name` (= `profile.fullName` ou fallback `session.username`) | `UserContext` | string | — | `—`/vazio se ausente |
| E-mail | `user.email` (= `session.email`, do Cognito) | `UserContext` (via `getUserSession()`) | string | — | Sempre presente pós-login (vem da sessão, não do wizard) |
| Peso (`wizWeight`) | `UserProfile.weightKg` (DynamoDB) | `UserContext` | number \| undefined | — | `—` se ausente (onboarding incompleto) |
| Altura (`wizHeight`) | `UserProfile.heightCm` (DynamoDB) | `UserContext` | number \| undefined | — | `—` se ausente |
| **IMC (`imcValue`/`imcLabel`)** | **Calculado no cliente**, nunca persistido | `peso_kg / (altura_cm/100)²`, arredondado a 1 casa decimal (fórmula já implementada em `calculateBMI`) | string derivado | Requer `weightKg` **e** `heightCm` presentes; senão `—` | Recalculado a cada render a partir do `UserProfile` atual — nunca lido de um campo `imc` no schema (não existe) |
| **Classificação do IMC (`imcLabel`)** | Derivado do valor de IMC | Thresholds padrão OMS, já implementados em `classifyBMI`: `< 18.5` → "Abaixo do peso"; `18.5–24.9` → "Peso normal"/"Normal"; `25–29.9` → "Sobrepeso"; `≥ 30` → "Obesidade" | string derivado | Confirmado consistente com os 4 rótulos do design (`imcLabel`) | — |
| **Idade (`ageValue`)** | **Calculada no cliente** a partir de `UserProfile.birthDate` | `Date.now() - birthDate`, convertido para anos completos (`calculateAge`, já implementado) | number derivado | Requer `birthDate` presente; senão `—` | Nunca lida de um campo `age` persistido (não existe no schema) |
| Sexo biológico (`wizSexDisplay`) | `UserProfile.gender` (mapeado de `sex: 'Masculino'\|'Feminino'` no wizard) | `UserContext` (`mapGender`) | `'male' \| 'female' \| undefined` | Exibido como "Masculino"/"Feminino"/`—` | Opções "Outro"/"Prefiro não informar" do wizard não têm suporte no schema hoje — pendência já registrada em `GAP_ANALYSIS.md` item 11, fora do escopo desta tela (herdada) |
| Tabagismo (`wizSmokeDisplay`) | `UserProfile.isSmoker` (DynamoDB) | `UserContext` | boolean \| undefined | Exibido como "Sim"/"Não"/`—` | — |
| Tema (Claro/Automático/Escuro) | Preferência local do usuário | `ThemeContext` (`AsyncStorage` key `@suasaude/theme`) | `'light' \| 'dark' \| 'system'` | — | Sem dependência de rede; sempre disponível offline |
| **Dispositivos conectados (health-app connect)** | **Nenhuma fonte real** | **Não existe integração** — nenhum pacote HealthKit/Google Fit/Health Connect no `package.json` nem código relacionado no repositório | — | — | **Pendência técnica (regra 2 da constituição)**: não pode ser um toggle que finge "conectar". Deve ser implementado como estado "Em breve"/indisponível explícito, isolado atrás de um serviço nomeado (ex.: `healthAppConnectService.ts`) que hoje retorna "não disponível", seguindo o mesmo padrão já adotado para `googleCalendarSync` (item 13 do `GAP_ANALYSIS.md`) |
| **Exportar meus dados** | **Nenhum mecanismo real** | Implementação atual: `Alert.alert('Exportar dados', 'Em desenvolvimento.')` — placeholder puro | — | — | **Pendência técnica LGPD (regra 4 da constituição)**: portabilidade de dados é direito do titular sob a LGPD (art. 18, VI); não pode ficar ausente silenciosamente de um app de saúde. Proposta em `plan.md`: isolar atrás de serviço nomeado (`dataExportService.ts`) com estado "Em breve" explícito na UI, e registrar como item de roadmap prioritário (não apenas "Em desenvolvimento" genérico) |
| Sessão/logout | N/A | `clearUser()` (`UserContext`) + `logoutUser()` (`src/services/auth`) | — | — | Sempre local + Cognito; sem estado de erro tratado hoje se `logoutUser()` falhar (gap menor) |

## 6. Requisitos não-funcionais específicos
- **Fidelidade textual:** o texto do botão/linha deve ser "Editar perfil", "Dados de saúde", "Aparência", "Configurações", "App de Saúde do celular", "Exportar meus dados", "Sair da conta" — exatamente como no Canvas (a implementação atual diverge em "Exportar dados", faltando "meus").
- **Nenhum dado mockado (regra 2):** IMC e Idade devem permanecer 100% computados no cliente, nunca lidos de um campo persistido futuro que duplique essa informação (evitar drift entre valor calculado e valor salvo).
- **LGPD (regra 4):** o texto explicativo do card "Dispositivos conectados" ("Conecte o app de Saúde do seu celular... Eles não são exibidos em nenhuma outra tela do app.") é uma declaração de escopo de uso de dados sensíveis e deve ser preservado literalmente quando a integração for implementada — é a única linha de consentimento/transparência que o design define para essa feature.
- **Confirmação de ação destrutiva:** "Sair da conta" não é tecnicamente uma exclusão de dados, mas encerra a sessão; o design não mostra diálogo de confirmação para esta ação específica (diferente do padrão de exclusão vermelho de `DESIGN_TOKENS.md` §4, que é para "Excluir"). Manter sem confirmação bloqueante é aceitável e fiel ao design — não adicionar `Alert`/confirm nativo aqui (evitar repetir o padrão já sinalizado como problema no item 18 do `GAP_ANALYSIS.md`, que trata de *exclusão*, não logout).
- **Dark mode:** todos os elementos desta tela devem usar `useThemeColors()`/classes `dark:` reativas (já o padrão em `ProfileScreen.tsx`), não cores estáticas de `theme.ts` — consistente com a pendência de Fundação (item 19 do `GAP_ANALYSIS.md`).
- **Toques mínimos:** linhas de configuração (altura 52–56px) e botões de tema (48px) atendem ao mínimo de 48dp de `DESIGN_TOKENS.md` §3.
- **Paleta:** vermelho de "Sair da conta" deve ser exatamente `#B3261E` (light) / `#F2867E` (dark), conforme `DESIGN_TOKENS.md` §1 — não usar tokens externos ao app (regra 7).

## 7. Critérios de aceite
- [ ] Estrutura visual bate com o Canvas (4b): avatar+nome+e-mail, botão "Editar perfil", card "Dados de saúde" (6 linhas), seção "Aparência" (3 botões), seção "Configurações" com card "Dispositivos conectados" + card "Exportar meus dados"/"Sair da conta".
- [ ] IMC calculado no cliente com fórmula `peso/(altura_m)²`, rótulo por faixa (Abaixo do peso/Peso normal/Sobrepeso/Obesidade) consistente com os thresholds da OMS.
- [ ] Idade calculada no cliente a partir de `birthDate`, nunca de campo persistido.
- [ ] Toggle "Aparência" conectado ao `ThemeContext` real (Claro/Automático/Escuro), com persistência em `AsyncStorage` — já implementado, preservar.
- [ ] "Editar perfil" navega para `/edit-profile` (4c) — já implementado, preservar.
- [ ] "Sair da conta" limpa `UserContext`/Cognito e redireciona para `/` — já implementado, preservar.
- [ ] Card "Dispositivos conectados" criado com o texto de escopo/LGPD do design, e toggle implementado como estado "Em breve"/indisponível real (não simula sucesso) — nova pendência isolada atrás de serviço nomeado.
- [ ] "Exportar meus dados" comunica claramente que é uma pendência (não apenas alert genérico "Em desenvolvimento"), isolada atrás de serviço nomeado, registrada como requisito LGPD pendente.
- [ ] Texto da linha corrigido de "Exportar dados" para "Exportar meus dados".
- [ ] Estados de carregamento (skeleton) e erro (retry) adicionados conforme padrão de 4 estados de `DESIGN_TOKENS.md` §4 (gap identificado, não presente na implementação atual).
- [ ] N/A diagnóstico de IA (não se aplica a esta tela — a menção à IA no card "Dispositivos conectados" é apenas texto explicativo de uso futuro, não uma resposta de IA na própria tela).
