# EPIC: Prevenção & Alertas — Recomendações USPSTF (Bloco 3)

> **Status:** implementada com dado real, em divergência deliberada e documentada do layout do Canvas 3e (ver §3.1). A proposta original desta EPIC (score numérico + checklist de 4 itens com heurística textual, preservada em `plan.md` §2 "histórico") foi **superada**: durante a Fase 0, foi identificado que uma integração real e já funcional para este mesmo problema (recomendações preventivas por idade/sexo/IMC) existia em `feat/exame_sugest` (branch divergente, não mesclada), usando a **Prevention TaskForce API da AHRQ/USPSTF** via uma função Lambda. Decisão confirmada por revisão humana: portar essa integração real em vez de implementar a heurística proposta originalmente — regra 8 da constituição (ambiguidade documentada, decisão registrada).

## 1. Identificação
- Bloco/arquivo de origem no Claude Design: tela **3e** ("Prevenção & Alertas — score e checklist com vacinação") em `specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html` (linhas 417–467). **Tratado como referência superada nesta tela específica** — ver §3.1.
- Rota/arquivo no código: `src/app/(app)/prevention.tsx` (rota `/prevention`) → `src/screens/PreventionScreen.tsx`, alimentado por `src/hooks/usePreventionData.ts` → `src/services/preventionService.ts` → query Amplify `getPreventionRecommendations` → função Lambda `amplify/functions/get-prevention-recommendations/` → API pública USPSTF/AHRQ.
- Ator(es): usuário final (paciente), consultando recomendações preventivas oficiais (graus A–I da USPSTF) calculadas para seu perfil (idade/sexo/IMC), com lembrete local opcional por recomendação.
- Prioridade: P1 (`GAP_ANALYSIS.md`, Bloco 3, linha "3e Prevenção & Alertas").

## 2. História da funcionalidade
Como usuário final, quero ver as recomendações preventivas oficiais (USPSTF) aplicáveis ao meu perfil de saúde, organizadas por grau de evidência, e poder ativar um lembrete local para cada uma — para saber o que vale a pena agendar/conversar com meu médico, com uma fonte confiável e não uma heurística inventada pelo app.

### Cenários (Given/When/Then)

- **Perfil incompleto:**
  Given o `UserProfile` do usuário autenticado não existe ainda (usuário não completou o cadastro de perfil de saúde)
  When a tela `/prevention` carrega
  Then a Lambda retorna `profileComplete: false` e a tela mostra o estado vazio específico "Complete seu perfil de saúde" com CTA "Completar perfil" → `/edit-profile` (4c) — nunca uma lista vazia genérica.

- **Carregando:**
  Given a tela `/prevention` é aberta
  When a query `getPreventionRecommendations` (Scan no DynamoDB + chamada à API USPSTF) ainda está em andamento
  Then a tela mostra `ScreenSkeleton` (já implementado, reaproveitado).

- **Lista de recomendações por grau (sucesso com dados reais):**
  Given o perfil está completo e a API USPSTF retorna recomendações aplicáveis (filtradas por idade/sexo/IMC)
  When a tela termina de carregar
  Then o cabeçalho mostra a contagem de recomendações, os chips de filtro por grau (A/B/C/D/I, só os graus presentes) ficam disponíveis, e cada recomendação é exibida em um `RecommendationCard` com badge de grau, explicação do grau em português, texto oficial da USPSTF (inglês, verbatim — ver §6), botão de lembrete e citação da fonte.

- **Filtro por grau:**
  Given a lista tem recomendações de mais de um grau
  When o usuário toca em um chip de grau (ex. "B")
  Then só as recomendações daquele grau são exibidas, e o botão "Ativar todos" do cabeçalho da seção passa a contar só os itens filtrados sem lembrete ativo.

- **Toggle de lembrete por item:**
  Given uma recomendação está com o lembrete desligado
  When o usuário toca no sino do card
  Then o app pede permissão de notificação local (se ainda não concedida) e, se concedida, agenda uma notificação recorrente via `expo-notifications` no intervalo configurado para aquele grau (ajustável em Perfil → "Lembretes de prevenção"); se a permissão for negada, nada é agendado e o estado do sino não muda.

- **Nenhuma recomendação aplicável:**
  Given o perfil está completo mas nenhuma recomendação da API se aplica (nenhuma regra bate idade/sexo/IMC)
  When a tela carrega
  Then a seção mostra o estado vazio "Nenhuma recomendação pendente" (não é um erro).

- **Erro de rede/API:**
  Given a Lambda falha (erro de rede, API USPSTF fora do ar, chave inválida) ou a query GraphQL retorna `errors`
  When o hook captura o erro
  Then a tela exibe `EmptyState tone="error"` + retry (padrão já implementado).

## 3. Estrutura da página

1. `ScreenHeader`: título "Prevenção & Alertas" + badge com a contagem de recomendações.
2. Card informativo (`variant="soft"`): explica que o texto oficial vem da USPSTF em inglês (exigência de direitos autorais da AHRQ) e que a explicação de grau em português é conteúdo autoral do app; mostra a data de atualização do dataset quando disponível.
3. `FilterChips` horizontal com os graus presentes nas recomendações (A/B/C/D/I) + "Todos".
4. `Section` "Recomendações preventivas", com ação "Ativar todos (N)" no cabeçalho quando há itens filtrados sem lembrete.
5. Lista de `RecommendationCard`, um por recomendação: badge de grau (`success`/`accent`/`danger`/`neutral` conforme grau), título, explicação do grau em PT, `gradeText` oficial (itálico), texto oficial (HTML simples da API, renderizado via `HtmlText`), sino de lembrete, citação de fonte.
6. Estados vazio/erro/loading conforme cenários acima.

### 3.1 Divergência deliberada do Canvas 3e
O Canvas 3e desenha um layout de **score numérico + checklist fixo de 4 itens** (Colonoscopia, Vacina da gripe, Exame de vista, Pressão arterial) com um card "Urgente" sempre visível. Esse layout foi **descartado para esta tela**, por decisão humana explícita, pelos seguintes motivos:
- A USPSTF não expõe conceito de "score" — forçar um score a partir da lista de recomendações exigiria inventar uma fórmula arbitrária (ex. % de recomendações grau A/B "seguidas"), o que não tem fonte real e violaria a regra 2 da constituição (nenhum dado mockado/inventado).
- "Pressão arterial" como item fixo não existe como conceito USPSTF (não é uma "recomendação", é um sinal vital) — não há como mapeá-lo neste modelo de dados sem inventar uma fonte.
- Uma implementação real e testada já existia (branch `feat/exame_sugest`) usando o padrão de lista filtrável por grau — mais fiel ao formato real da fonte de dado (USPSTF) do que forçar os dados numa forma visual pensada antes de a integração real existir.

Este é um caso de regra 8 da constituição (ambiguidade documentada, decisão registrada, não bloqueante): o Canvas continua sendo a referência de fidelidade visual para o design system (cores, tipografia, componentes), mas não para a composição específica desta tela.

## 4. Mapa de navegação

| Elemento | Tipo | Ação | Destino | Condição |
|---|---|---|---|---|
| CTA "Completar perfil" (estado vazio) | Botão | Navega para edição de perfil | `/(app)/edit-profile` (4c) | Visível quando `profileComplete === false` |
| Chips de filtro por grau | Filtro | Filtra a lista localmente | — (sem navegação) | Sempre visível quando há >1 grau presente |
| Botão "Ativar todos (N)" | Ação em lote | Agenda lembrete para todos os itens filtrados sem lembrete ativo | — (sem navegação) | Visível quando há itens filtrados com lembrete desligado |
| Sino de lembrete (por card) | Toggle | Agenda/cancela notificação local recorrente | — (sem navegação) | Sempre visível por item; desabilitado durante a operação pendente |
| CTA "Tentar novamente" (estado erro) | Botão | Reexecuta a query | — | Visível em erro |
| Item de "Lembretes de prevenção" em Perfil (por grau) | Linha de lista | Abre `BottomSheet` com opções de intervalo (7/14/30/60/90/180/365 dias) | — (modal) | Tela `/profile` |

## 5. Mapa de dados

| Campo/Componente | Origem do dado | Fonte técnica | Tipo | Validação | Comportamento offline/erro |
|---|---|---|---|---|---|
| Perfil usado para filtragem (idade, sexo, IMC) | `UserProfile` do usuário autenticado | DynamoDB (Scan filtrado por `owner`, feito na Lambda — ver `plan.md` §3.2 para a justificativa de Scan em vez de Query) | `birthDate`, `sex`, `weightKg`, `heightCm` | Se `UserProfile` não existe → `profileComplete: false`, lista vazia | Erro de Scan propaga como erro da query GraphQL |
| Lista de recomendações (grade, gradeText, title, text, rationale, topic, citationYear, ageMin/Max, sex, bmi) | API pública USPSTF/AHRQ (Prevention TaskForce API) | Chamada HTTP server-side (`uspstfClient.ts`), filtrada em `uspstfFilter.ts` por idade/sexo/IMC do perfil | `PreventionRecommendation[]` (`src/types/models.ts`) | Filtragem só usa dimensões que a API expõe diretamente (idade, sexo, IMC) — `pregnancy`/`isSmoker`/`sexuallyActive` do perfil não são usados ainda (gap conhecido, documentado em `plan.md`) | Falha na chamada HTTP → erro propagado, tela mostra `EmptyState tone="error"` |
| Estado de lembrete (`isReminderOn`) por recomendação | Local (não persistido no backend) | `AsyncStorage` via `reminderService.ts` (`loadReminderMap`/`saveReminderMap`) | `Record<string, string>` (id → id da notificação agendada) | — | Perda de `AsyncStorage` = lembretes "esquecidos" pelo app (a notificação já agendada no OS continua existindo até ser cancelada por outro toggle) |
| Intervalo de repetição do lembrete por grau | Preferência local do usuário, editável em Perfil | `AsyncStorage` via `reminderService.ts` (`loadReminderIntervalsByGrade`/`saveReminderIntervalForGrade`) | `Record<UspstfGrade, number>` (dias) | Opções fixas: 7/14/30/60/90/180/365 dias | Padrão por grau (`DEFAULT_REMINDER_INTERVALS_BY_GRADE`) usado se nunca configurado |
| Notificação local agendada | Sistema operacional (via `expo-notifications`) | `Notifications.scheduleNotificationAsync` (trigger recorrente por intervalo de dias) | — | Requer permissão de notificação (`ensureNotificationPermission`); requer dispositivo físico (`Device.isDevice`) | Permissão negada → toggle não ativa, nenhuma notificação agendada |

## 6. Requisitos não-funcionais específicos
- **Direitos autorais AHRQ:** `title`/`text`/`rationale` retornados pela API são exibidos **verbatim em inglês**, sem tradução — exigência de direitos autorais da fonte. A explicação de grau em português (`GRADE_EXPLAINER_PT`) é conteúdo autoral do app, não tradução do texto específico da recomendação.
- **Responsabilidade médica (regra 4 da constituição):** as recomendações são apresentadas como informação preventiva geral (fonte pública USPSTF), nunca como diagnóstico ou prescrição — o card informativo do topo já deixa explícito que o conteúdo é de uma agência de saúde pública, não uma análise personalizada por IA.
- **4 estados padrão:** loading/vazio (perfil incompleto e lista vazia são estados vazios distintos)/erro/sucesso, conforme `DESIGN_TOKENS.md` §4.
- **Sem dependência nova pesada:** avaliada e descartada a lib `react-native-render-html` (não publicada desde 2022, sem suporte confirmado a React 19/New Architecture) — o HTML retornado pela API é simples o suficiente (parágrafos, links, negrito) para um parser próprio de ~30 linhas (`HtmlText.tsx`), respeitando a regra 3 da constituição.
- **LGPD:** perfil de saúde (idade, sexo, IMC) é enviado à API pública da USPSTF apenas como parâmetros de filtragem calculados server-side na Lambda — nenhum dado de identificação pessoal é enviado à API externa (a chamada é anônima, só parâmetros derivados).

## 7. Critérios de aceite
- [x] Estrutura visual usa os componentes/tokens do design system atual (`Card`, `Badge`, `FilterChips`, `ScreenHeader`, `Section`, `EmptyState`, `ScreenSkeleton`) — divergência do layout específico do Canvas 3e documentada em §3.1.
- [x] Todos os botões do mapa de navegação estão conectados (filtro, ativar todos, toggle de lembrete, CTA de perfil incompleto, retry).
- [x] Recomendações 100% reais (API USPSTF), nenhum score/checklist inventado.
- [x] Estados de vazio (perfil incompleto / lista vazia)/erro/loading implementados.
- [x] Nenhum texto sugere diagnóstico médico definitivo — conteúdo apresentado como recomendação preventiva de fonte pública.
- [x] `src/mocks/api/preventionApi.ts` e `src/mocks/prevention.ts` removidos (não são mais a fonte da tela).
- [ ] Banner de campanha de vacinação (herdado do Canvas 3e) — **fora de escopo desta implementação**, permanece como follow-up (`tasks.md` Fase 5), agora desbloqueado pela EPIC 4e (`VaccineDose`/`vaccinationCampaigns.ts`) mas não implementado nesta passada por decisão explícita do usuário.
