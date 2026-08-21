# Gap Analysis — Design (Claude Design Canvas) × Código atual

Fontes: `DESIGN_INVENTORY.md` (20 telas confirmadas nos 4 Blocos, `4d` não existe) e `CODE_INVENTORY.md` (17 componentes de tela roteados, nenhum órfão).

Legenda de Status: `CRIAR` (só no design) · `ATUALIZAR` (existe nos dois, mas diverge) · `MANTER` (já fiel) · `DESCONTINUAR` (só no código, sem correspondente no design).

## 0. Fundação (não é uma "tela" roteada)

| Item | Existe no código? | Existe no design? | Status | Prioridade |
|---|---|---|---|---|
| Design tokens (cores/tipografia/espaçamento/raio) — Tela 1a | Sim, mas divergente (`src/constants/themeTokens.json`: verde `#00C853`/azul `#2196F3` vs. alvo `#10794E`/`#1B63C4`; fonte única `Basic-Regular` vs. alvo IBM Plex Sans com pesos 400–700) | Sim (1a — referência fixa) | `ATUALIZAR` | **P0 — bloqueia todo o resto** |
| Componentes base (Button, Input, Badge, Card, BottomSheet, Chip) | Sim, ~40 componentes hand-built em NativeWind | Sim (padrões documentados em 1a, reusados em todas as telas) | `ATUALIZAR` | P0 |
| Dark mode (Claro/Automático/Escuro) | Parcial — `ThemeContext`/`setColorScheme` existe, tokens dark existem em `themeTokens.json`, mas não auditado tela-a-tela | Sim (1c mostra tema escuro completo; 4b tem o toggle de 3 vias) | `ATUALIZAR` | P1 |
| Estrutura de navegação inferior (5 abas + "Mais") | Não — hoje são 6 `APP_TABS` (dashboard/exams/appointments/ai/prevention/profile) sem hub "Mais"; `medicines` nem está nas abas | Sim (Início/Consultas/Exames/Remédios/Mais — Prevenção, IA, Perfil e Vacinação vivem atrás de "Mais") | `ATUALIZAR` | **P0 — muda toda a IA de navegação** |

## 1. Bloco 1 — Sistema de design + Autenticação

| Tela | Existe no código? | Existe no design? | Status | Prioridade |
|---|---|---|---|---|
| 1b Login (claro) | Sim — `LoginScreen.tsx` (`/`) | Sim | `ATUALIZAR` | P0 |
| 1c Login (escuro) | Parcial (mesmo componente, dark mode não confirmado fiel) | Sim | `ATUALIZAR` | P1 |
| 1d Cadastro (checklist de senha ao vivo) | Sim — `RegisterScreen.tsx` (`/register`) | Sim | `ATUALIZAR` | P0 |
| 1e Confirmação de conta (código + cooldown) | Sim — `ConfirmScreen.tsx` (`/confirm`) | Sim | `ATUALIZAR` | P0 |
| 1f Recuperar senha (2 passos) | Sim — `ForgotPasswordScreen.tsx` (`/forgot-password`) | Sim | `ATUALIZAR` | P0 |

## 2. Bloco 2 — Perfil de Saúde, Home e Agenda

| Tela | Existe no código? | Existe no design? | Status | Prioridade |
|---|---|---|---|---|
| 2a Perfil de Saúde — wizard 4 etapas | Sim — `OnboardingScreen.tsx` (`/profile-setup`) | Sim | `ATUALIZAR` | P1 |
| 2b Home — resumo/indicadores/acesso rápido | Sim — `HomeScreen.tsx` (`/dashboard`), parcialmente mockado (resumo/métricas/alertas) | Sim | `ATUALIZAR` (+ remover mock do resumo) | P1 |
| 2c Agenda — calendário/lista do dia | Sim — `AgendaScreen.tsx` (`/appointments`) | Sim | `ATUALIZAR` | P1 |
| 2d Novo agendamento | Sim — `AddAppointmentScreen.tsx` (`/add-appointment`) | Sim | `ATUALIZAR` | P1 |
| 2e Editar agendamento (com exclusão) | Sim — `EditAppointmentScreen.tsx` (`/edit-appointment`) | Sim | `ATUALIZAR` | P1 |

## 3. Bloco 3 — Exames & Receitas, Medicamentos, Prevenção

| Tela | Existe no código? | Existe no design? | Status | Prioridade |
|---|---|---|---|---|
| 3a Exames e receitas — lista/filtros/bottom sheet | Sim — `ExamsScreen.tsx` (`/exams`) | Sim | `ATUALIZAR` | **P0 — núcleo do MVP** |
| 3b Adicionar documento — preview e tipo | Sim — `AddExamScreen.tsx` (`/add-exam`) | Sim | `ATUALIZAR` | **P0 — núcleo do MVP** |
| 3c Detalhe do documento (ver/editar/excluir) | Sim — `DocumentDetailScreen.tsx` (`/document-detail`) | Sim | `ATUALIZAR` (+ corrigir fallback de deep link vazio) | **P0 — núcleo do MVP** |
| 3d Medicamentos — doses e estoque | Sim — `MedicinesScreen.tsx` (`/medicines`), 100% mock, sem model Amplify | Sim | `ATUALIZAR` (+ pendência de backend) | P1 |
| 3e Prevenção & Alertas — score e checklist | Sim — `PreventionScreen.tsx` (`/prevention`), 100% mock, sem model Amplify | Sim | `ATUALIZAR` (+ pendência de backend) | P1 |
| 3f Novo lembrete de medicamento | **Não** (sem tela dedicada; `MedicinesScreen` não tem fluxo de criação equivalente) | Sim | `CRIAR` | P1 |
| 3g Editar medicamento (com exclusão) | **Não** | Sim | `CRIAR` | P1 |

## 4. Bloco 4 — Assistente de IA, Perfil, Carteira de vacinação

| Tela | Existe no código? | Existe no design? | Status | Prioridade |
|---|---|---|---|---|
| 4a Assistente de IA — chat interativo | Sim — `ChatBotScreen.tsx` (`/ai`); disclaimer, header, sugestões, "digitando" e drawer de histórico implementados conforme Canvas; `aiAssistantService` (ex-`chatService`) 100% mock (respostas fixas) | Sim | `ATUALIZAR` (fidelidade de UI concluída; pendências: item 4.a integração real de IA, 4.b persistência de histórico) | P2 |
| 4b Perfil — dados de saúde e preferências | Sim — `ProfileScreen.tsx` (`/profile`) | Sim | `ATUALIZAR` | P1 |
| 4c Editar perfil — scroll único | Sim — `EditProfileScreen.tsx` (`/edit-profile`) | Sim | `ATUALIZAR` | P1 |
| 4d | — | **Não existe no design** (gap na numeração, confirmado) | — | — |
| 4e Carteira de vacinação | Sim — `VaccinationScreen.tsx` (`/vaccination`), model `VaccineDose` real (schema próprio, `allow.owner()`), sem mock | Sim | `CONCLUÍDO` (ver pendência 3.a) | P2 |

## Telas só no código (candidatas a `DESCONTINUAR`)

Nenhuma. Os 17 componentes de tela roteados hoje mapeiam 1:1 para telas do design (LoginScreen→1b/1c, RegisterScreen→1d, ConfirmScreen→1e, ForgotPasswordScreen→1f, OnboardingScreen→2a, HomeScreen→2b, AgendaScreen→2c, AddAppointmentScreen→2d, EditAppointmentScreen→2e, ExamsScreen→3a, AddExamScreen→3b, DocumentDetailScreen→3c, MedicinesScreen→3d, PreventionScreen→3e, ChatBotScreen→4a, ProfileScreen→4b, EditProfileScreen→4c). Nada a descontinuar nesta fase.

## Resumo de contagem

- **CRIAR**: 3 telas (3f, 3g, 4e)
- **ATUALIZAR**: 17 telas + 4 itens de fundação (tokens, componentes base, dark mode, navegação)
- **MANTER**: 0 (nenhuma tela está fiel ao novo design ainda — o design é uma reformulação completa)
- **DESCONTINUAR**: 0

## Pendências técnicas conhecidas (regra 2 e 4 da constituição — não mockar em silêncio)

1. **Medicamentos (3d/3f/3g)**: não existe model Amplify/DynamoDB para medicamentos. Precisa de schema novo (`amplify/data/schemas/medicines.ts` ou similar) antes de sair do mock — decisão explícita de schema, documentar em `plan.md` do Bloco 3.
2. **Prevenção (3e)**: mesma situação — sem model Amplify; o "score preventivo" e checklist precisam de fonte real (provavelmente derivado de exames/vacinas/consultas já persistidos, não uma tabela nova) — decisão de design de dados a tomar no `plan.md`.
3. **Carteira de vacinação (4e) — decisão de schema tomada e implementada:** model dedicado `VaccineDose` (`amplify/data/schemas/vaccination.ts`, `allow.owner()`), não reaproveita `MedicalDocument` — justificativa completa em `specs/04-ia-perfil-vacinacao/carteira-vacinacao/plan.md` §2 (o campo `s3FileName` obrigatório de `MedicalDocument` não modela "recomendada, ainda não aplicada, sem arquivo"). Duas pendências remanescentes, nenhuma bloqueante da tela em si:
   - **3.a Integração com fonte pública de calendário/campanhas de vacinação** (ex. API do PNI/Ministério da Saúde): não implementada. O banner de campanha institucional usa hoje uma config estática (`src/config/vaccinationCampaigns.ts`), mantida manualmente — ver `plan.md` §4.
   - **3.b Follow-up cross-EPIC (Prevenção, 3e):** `PreventionScreen.tsx` ainda não consulta `VaccineDose`/`vaccinationCampaigns.ts` para reexibir seu próprio banner de vacinação (hoje oculto, conforme `specs/03-exames-receitas/prevencao/plan.md` §2.5) — schema já existe e desbloqueia essa tarefa, mas a integração em si não foi feita nesta EPIC (fora de escopo, não tocar em `PreventionScreen.tsx`). Ver task registrada em `specs/03-exames-receitas/prevencao/tasks.md`.
4. **Assistente de IA (4a) — duas pendências distintas, ambas resolvidas nesta camada de UI, nenhuma decidida no backend:**
   - **4.a Integração real de IA**: `sendMessage` em `src/services/aiAssistantService.ts` (renomeado de `chatService.ts`) continua mock (respostas fixas de `MOCK_RESPONSES`), isolado atrás da interface nomeada `AiAssistantService`. Decisão de provedor (Anthropic Claude API é a candidata já esboçada em comentário), custo por token e — principalmente — política de privacidade para dados de saúde enviados a uma API de terceiros (LGPD) requer confirmação explícita do usuário/orientador do TCC antes de qualquer implementação. Ver `specs/04-ia-perfil-vacinacao/assistente-ia/plan.md` §3.1.
   - **4.b Persistência de histórico de conversas**: o drawer de histórico (UI completa) foi implementado em `HistoryDrawer.tsx`, mas `historyGroups` inicia e permanece sempre vazio (`useChatBot.ts`) — nenhuma conversa passada é de fato recuperável. Duas rotas possíveis (local via AsyncStorage/SecureStore vs. novo model Amplify `ChatConversation`/`ChatMessage` no DynamoDB), nenhuma escolhida; a segunda rota é mudança de schema (regra 5/6 da constituição) e cria uma nova superfície de dados de saúde sensíveis sob LGPD. Ver `plan.md` §3.2 para o detalhamento completo e a recomendação registrada (não decisão).
5. **Resumo do Dashboard (2b)**: métricas/alertas/próximos compromissos ainda mockados em `dashboardApi.ts` (a lista de exames recentes já é real). Avaliar se dá para compor a partir de `MedicalDocument`/`Appointment` reais em vez de manter mock.
6. **Menu "Mais"**: o design nunca desenha a tela do hub "Mais" em si — apenas destaca a aba como ativa em 3e/4a/4b. É necessário decidir a estrutura desse menu (lista de atalhos? sub-navegação?) antes de implementar a navegação de 5 abas. Documentar a interpretação escolhida no `spec.md` da Fundação/Navegação.
7. **Estados padrão (loading/vazio/erro/sucesso)**: o padrão de 4 estados da tela 1a é declarado como reutilizável em todas as listas/formulários/uploads, mas a maioria das telas do design só mostra o estado populado. Cada `spec.md` de tela deve assumir o padrão de 1a por padrão e sinalizar se algo específico diverge.
8. **Código morto identificado** (não bloqueia o SDD, mas deve ser limpo durante a passagem de cada Bloco): `src/navigation/` (vazio), `src/mocks/api/appointmentsApi.ts`, `src/mocks/api/examsApi.ts`, `src/hooks/useProfileData.ts` — todos superados por integrações reais já existentes.
9. **`medicines` fora da tab bar**: já é uma inconsistência hoje (tela existe mas não está em `APP_TABS`) — será resolvida naturalmente pela reestruturação de navegação do item de Fundação acima.

## Pendências adicionais descobertas durante a Fase 1 (Fundação + Blocos 1–3)

10. **Perda silenciosa de dados no wizard de Perfil de Saúde (2a)**: `chronicConditions`, `medications` e `allergies` são coletados e validados no Step 2, mas não existem colunas correspondentes em `UserProfile` — os dados são descartados ao salvar, sem aviso ao usuário. Viola a regra 2 da constituição (nenhum dado exibido/capturado pode ser silenciosamente perdido). Requer decisão explícita de schema (regra 5) antes da implementação — ver `specs/02-perfil-home-agenda/wizard-perfil-saude/plan.md`.
11. **Opção "Outro" de sexo biológico sem suporte no schema**: o enum `sex` em `UserProfile` só aceita `Masculino`/`Feminino`; a opção "Outro"/"Prefiro não informar" do design é descartada silenciosamente. Mesma decisão de schema pendente do item 10.
12. **Conflito de obrigatoriedade em Agendamentos**: `professionalName` e `address` são `.required()` no schema Amplify (`amplify/data/schemas/appointments.ts`), mas o design (2d) só exige nome/data/hora. Requer decisão explícita: tornar os campos opcionais no schema ou manter obrigatórios e ajustar o design — ver `specs/02-perfil-home-agenda/novo-agendamento/plan.md`.
13. **Sincronização com Google Agenda (2c)** é hoje um botão com handler vazio (`onPress={() => {}}`), sem nenhuma integração real (o único código "Google" existente é login via Cognito, não Calendar API). Deve ser isolado atrás de um serviço nomeado (ex.: `googleCalendarSync.ts`) com estado "em breve" explícito, nunca um toggle falso.
14. **Sistema de notificações inexistente**: o sino de notificações da Home (2b) não tem nenhuma fonte de dados real por trás — não há sistema de notificações em nenhum lugar do código. Pendência nova, sem dono de Bloco ainda definido.
15. **Widgets da Home (2b) parcialmente desbloqueáveis já**: "Próximos compromissos" pode virar dado real imediatamente (via `useAppointmentsData`, hoje não usado na Home); "Prevenção em atraso" e o resumo de medicamentos pendentes continuam bloqueados pelas pendências #2 (Prevenção) e #1 (Medicamentos).
16. **Validação de upload de documentos (3b) incompleta**: tipo de arquivo só é filtrado no picker (client-side), nunca revalidado antes do upload ao S3; não existe limite de tamanho máximo em nenhum lugar do código. Proposto limite de 10MB como decisão a confirmar.
17. **Badge de status "Normal/Alterado" em exames (3a) sem dado real**: o schema `MedicalDocument` não tem campo de resultado clínico. "Válida/Vencida" de receitas é derivável de `expirationDate`, mas "Normal/Alterado" de exames não tem fonte — proposta: omitir o badge para exames e desabilitar o filtro "Alterados" com rótulo "Em breve" até existir um campo real.
18. **Padrão recorrente de confirmação de exclusão via `Alert`/`confirm()` nativo** em vez do painel inline vermelho documentado em `DESIGN_TOKENS.md` §4 — encontrado em login, cadastro, confirmação, detalhe-documento (3c) e editar-agendamento (2e). Tratar como um padrão único a corrigir em todas as telas, não caso a caso.
19. **Padrão recorrente de telas sem dark mode real**: vários componentes/telas usam `COLORS`/`FONTS` estáticos de `theme.ts` em vez do hook reativo `useThemeColors()` (`Badge.tsx`, `BottomSheet.tsx`, `FilterChips.tsx`, `EditAppointmentScreen.tsx` confirmados até agora) — mesma causa raiz da pendência de Fundação (dark mode), listar como parte do mesmo EPIC.
20. **Padrão recorrente de fallback ausente em rotas dependentes de contexto**: `document-detail` (3c) e `edit-appointment` (2e) renderizam `null`/tela em branco quando o contexto/param necessário está vazio (ex. deep link a frio) — mesmo padrão de bug em telas diferentes, corrigir de forma consistente.
21. **Schema `Medicine` proposto 3x de forma independente** (3d, 3f, 3g foram escritos em paralelo e cada um propôs seu próprio shape de schema por não conseguir ler os `plan.md` uns dos outros a tempo). **`specs/03-exames-receitas/medicamentos/plan.md` (tela 3d) é a versão canônica** — antes da Fase 3 tocar 3f ou 3g, reconciliar os `plan.md` desses dois com o schema de 3d (campos: name, dosage, form enum, times[], frequencyType enum DAILY/SPECIFIC_DAYS/EVERY_X_HOURS, weekDays/intervalHours condicionais, startDate, endDate nullable, currentStock, initialStock, unit enum, lowStockThreshold opcional, notes, active boolean, takenToday JSON opcional).
22. **Lembretes de medicamento não disparam de verdade**: `expo-notifications` não está instalado no projeto — a tela 3f só persiste horário/frequência, nenhum lembrete push/local real é agendado. Pendência nova, sem Bloco dono ainda definido (afeta 3f e potencialmente 2d/2c para lembretes de consulta também).
23. **Violação ativa da regra 4 (constituição) hoje em produção**: o banner obrigatório "Apoio informativo — não substitui avaliação médica" está **ausente** da implementação atual do `ChatBotScreen`, e ao menos uma resposta mockada em `chatService.ts` tem redação de afirmação clínica definitiva. Prioridade máxima na implementação do Bloco 4 — ver `specs/04-ia-perfil-vacinacao/assistente-ia/`.
24. **Histórico de conversa do Assistente de IA não é persistido**: hoje vive só em `useState`, perdido ao fechar o app. O drawer de histórico do design (`historyGroups`) não tem nenhuma contraparte no código. Decisão pendente: AsyncStorage local vs. novo model DynamoDB — não decidida unilateralmente, requer confirmação humana.
25. **Risco de corrupção de dados entre wizard (2a) e editar-perfil (4c)**: o payload atual de `EditProfileScreen` envia campos clínicos como string vazia; quando o schema for estendido com `chronicConditions`/`medications`/`allergies` (pendência #10), isso sobrescreveria silenciosamente os dados do wizard se as duas telas não forem implementadas de forma consistente na mesma passada da Fase 3.
26. **"Dispositivos conectados" (Apple Health/Google Fit) e "Exportar meus dados" (4b) não existem de verdade**: nenhum pacote de integração de saúde está instalado; exportação de dados hoje é só um `Alert.alert('Em desenvolvimento.')`. Ambos exigem stub nomeado e explícito (`healthAppConnectService.ts`, `dataExportService.ts`) em vez de toggle/botão que finge funcionar — "Exportar meus dados" é também um requisito de portabilidade de dados da LGPD (regra 4), não apenas uma preferência de UI.
27. **Upload de foto de perfil (4c) não existe**: `UserContext.tsx` já documenta `photoUrl` como "reservado para upload futuro, não implementado". Requer decisão de storage (reaproveitar padrão S3 de `examService.ts`) antes da Fase 3.
28. **Novo schema `VaccineDose` decidido para a Carteira de Vacinação (4e)**: modelo dedicado (não reaproveita `MedicalDocument`, que teria `s3FileName` obrigatório incompatível com "recomendada mas ainda não aplicada"). Desbloqueia também o banner de campanha de vacinação da Prevenção (3e), que hoje está proposto como oculto até esta decisão existir — a partir de agora os dois podem compartilhar a mesma fonte de configuração de campanha (`src/config/vaccinationCampaigns.ts`, proposto como conteúdo estático/admin-configurado).

## Pendências adicionais descobertas na revisão final do Bloco 3 (Exames & Receitas)

29. **`validateFileType` (`examService.ts`) valida só por extensão de arquivo, não pelo MIME real**: um arquivo renomeado com extensão `.pdf`/`.jpg` passa na validação mesmo com conteúdo diferente. Correção exigiria uma lib nativa de sniffing de MIME (fora do escopo atual) — limitação conhecida, aceita por ora.
30. **Card de preview de arquivo em 3b/3c usa borda tracejada (`border-dashed`) em vez do padrão hachurado (`repeating-linear-gradient`) do Canvas**: divergência visual menor, mesma classe de decisão de `DESIGN_TOKENS.md` §4 para placeholders decorativos.
31. **"Tipo de documento" não é editável em 3c (`DocumentDetailScreen.tsx`)**: decisão deliberada, fiel ao Canvas — o modo de edição só expõe Nome/Data/Data de validade; a linha "Tipo" do card de visualização é somente leitura.
32. **Exclusão bem-sucedida em 3c não mostra `SuccessSnackbar`**: ao contrário do salvar (que usa snackbar), excluir navega imediatamente de volta para `/exams`, e essa navegação já serve de feedback — decisão registrada em `specs/03-exames-receitas/detalhe-documento/tasks.md` §5.
33. **`isEmptySearchResult` em 3a (`ExamsScreen.tsx`) usa "há filtro/busca ativo" em vez de contagem bruta de documentos não filtrados**: edge case raro em que a conta está vazia (zero documentos) e o usuário digita uma busca — a tela mostra a copy de "busca sem resultado" em vez de "vazio real", porque a distinção é feita pelo estado do filtro/busca, não pelo total de documentos existentes.
34. **Três cabeçalhos diferentes entre 3a/3b/3c**: nenhuma das três telas reaproveita `BackHeader.tsx` (já usado em Register/Confirm/ForgotPassword) — cada uma monta seu próprio cabeçalho inline. Padronizar numa EPIC de consistência futura, fora do escopo desta revisão.
35. **Pisos tipográficos de `DESIGN_TOKENS.md` §2 furados em pontos pontuais do Bloco 3**: badge de status em `ExamItem` a 13px (piso é 15px); mensagem de erro de permissão de câmera em `ExamsScreen` (`styles.permissionError`) a 14px (piso é 16px); botão "Editar" do cabeçalho de 3c a 15px. Ajuste cosmético, agrupar numa EPIC futura de auditoria tipográfica.
36. **`DeleteConfirmPanel` usa `rounded-xl` (12px) / `h-[52px]` nos botões** em vez do padrão `rounded-field` (14px) / 56px usado no resto do app — divergência herdada da criação do componente (`specs/03-exames-receitas/detalhe-documento/tasks.md` §3), não corrigida nesta revisão para não re-abrir escopo visual do painel de exclusão.
37. **`expirationDate` de receita não é validada contra `documentDate`**: nada impede salvar uma receita com validade anterior à data de emissão (nem em 3b nem em 3c). Regra de negócio não especificada no Canvas — pendência a confirmar antes de implementar.
38. **`originalFileName` é capturado no upload mas nunca persistido no schema Amplify**: `mapDocumentToMedicalDocument` (`useExamsData.ts`) usa o nome do arquivo no S3 (com uuid/timestamp) como `originalFileName` ao reconstruir a partir do banco, em vez do nome original enviado pelo usuário — dado descartado silenciosamente, mesma classe da pendência #10. Hoje não é exibido em nenhuma tela (latente), mas o campo está tipado como se fosse o valor real.
39. **`src/mocks/exams.ts`/`src/mocks/api/examsApi.ts` continuam sendo mantidos/atualizados apesar de já confirmados como código morto (pendência #8)**: nenhuma tela do Bloco 3 os importa mais. Considerar remoção numa limpeza futura em vez de manutenção contínua de um caminho não utilizado.

## Ordem de execução proposta (ajustada da Fase 2 do prompt original à realidade encontrada)

1. Fundação: tokens + componentes base + estrutura de navegação (5 abas + Mais)
2. Bloco 1 — Autenticação (1b–1f)
3. Bloco 3 — Exames & Receitas (3a–3c, núcleo do MVP)
4. Bloco 2 — Perfil de Saúde, Home, Agenda (2a–2e)
5. Bloco 3 — Medicamentos (3d, 3f, 3g) — depende de decisão de schema (pendência #1)
6. Bloco 3 — Prevenção (3e) — depende de decisão de dados (pendência #2)
7. Bloco 4 — Perfil (4b, 4c)
8. Bloco 4 — Vacinação (4e) — `CONCLUÍDO`, decisão de schema #3 tomada e implementada
9. Bloco 4 — Assistente de IA (4a) — maior atenção a LGPD/responsabilidade (pendência #4)
