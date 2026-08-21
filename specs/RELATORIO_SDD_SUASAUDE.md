# Relatório de Progresso — SDD SuaSaúde (Fase 4)

> Gerado a partir do estado real do código e dos commits (`git log`), cruzado com as specs em `specs/`, não apenas com os checkboxes dos `tasks.md`. Este relatório existe para dar um retrato confiável de "o que está de fato implementado" vs. "o que ainda não foi tocado", já que o `GAP_ANALYSIS.md` por si só pode ficar defasado entre uma sessão e outra.

## 1. Resumo executivo

De 21 telas mapeadas no design (`DESIGN_INVENTORY.md`, 4 Blocos, `4d` não existe), **7 estão concluídas** (com pendências pontuais documentadas, nenhuma bloqueante), **9 têm implementação anterior ao SDD mas ainda não foram auditadas/atualizadas contra o Canvas** (Blocos 1 e 3a-3c), e **5 não foram tocadas nesta iniciativa** — todo o Bloco 2 (Perfil de Saúde, Home, Agenda). A camada de Fundação (tokens, componentes base, navegação de 5 abas) está implementada.

Toda a implementação seguiu o processo SDD: spec → plan → tasks → código, com cada EPIC concluído rastreável a um commit que referencia o caminho da spec (`git log --oneline --all | grep "conforme specs"`).

## 2. Status por Bloco

### Bloco 0 — Fundação
**Status: concluído.** Commits `1464276` (design tokens) e `80fd38e` (navegação 5 abas + "Mais"). Paleta/tipografia/espaçamento migrados para os tokens reais extraídos do Canvas (`#10794E`/`#1B63C4`, IBM Plex Sans); estrutura de navegação reorganizada nas 5 abas do design (Início/Consultas/Exames/Remédios/Mais). Pendências pontuais em `design-tokens/tasks.md` (5 itens) e `navegacao/tasks.md` (5 itens) — nenhuma bloqueante, ver `GAP_ANALYSIS.md` itens 7-9.

### Bloco 1 — Autenticação (1b–1f)
**Status: implementado, spec aplicada.** Commits `66577c7` (login), `326d934` (cadastro), `ce77aab` (confirmação), `52a0cad` (recuperar senha). Pendências residuais menores por tela (2-8 itens cada em `tasks.md`), principalmente o padrão recorrente de confirmação de exclusão via `Alert` nativo em vez do painel inline (`GAP_ANALYSIS.md` #18) e auditoria de dark mode tela-a-tela (#19) — nenhuma tela precisa ser refeita, são ajustes finos.

### Bloco 2 — Perfil de Saúde, Home e Agenda (2a–2e)
**Status: NÃO INICIADO.** As 5 specs (`spec.md`/`plan.md`/`tasks.md`) foram escritas na Fase 0/1 de descoberta, mas **nenhuma task foi marcada como concluída e nenhum commit no histórico referencia essas specs** (confirmado via `git log --all | grep "specs/02-"`, retorna vazio). As telas em produção hoje (`OnboardingScreen`, `HomeScreen`, `AgendaScreen`, `AddAppointmentScreen`, `EditAppointmentScreen`) são as versões pré-SDD, anteriores a toda a reformulação de design tokens/componentes do Bloco 0. Este é o único Bloco do roadmap original que ficou de fora até agora — é o próximo passo natural.

Pendências já identificadas nas specs, prontas para retomada:
- **2a**: wizard de 4 etapas — o schema de `UserProfile` já foi estendido (sexo "Outro", campos clínicos) durante o trabalho do Bloco 4/4c, então parte da dívida de dado já está paga; falta a UI do wizard em si (cm em vez de metros decimais, etc.).
- **2b (Home)**: resumo/métricas/alertas ainda mockados em `dashboardApi.ts` (só a lista de exames recentes é real). "Próximos compromissos" pode virar dado real de imediato via `useAppointmentsData` (já existe, não usado na Home).
- **2c (Agenda)**: sincronização com Google Agenda é um botão com handler vazio, precisa virar um serviço nomeado "em breve" em vez de toggle falso.
- **2d/2e**: conflito de obrigatoriedade (`professionalName`/`address` obrigatórios no schema, mas opcionais no Canvas) precisa de decisão explícita antes de implementar.

### Bloco 3 — Exames & Receitas, Medicamentos, Prevenção
**Status: misto.**
- **3a/3b/3c (núcleo do MVP — lista, adicionar documento, detalhe do documento):** implementados (`3031844`, `7bc03a2`, `5e70e93`), com gaps de fidelidade documentados (badge "Normal/Alterado" sem fonte real, validação de MIME só por extensão, cabeçalhos inconsistentes entre as 3 telas) — ver `GAP_ANALYSIS.md` #17, #29, #34.
- **3d/3f/3g (Medicamentos, Novo lembrete, Editar medicamento): `CONCLUÍDO`.** Model `Medicine` real no DynamoDB, CRUD completo. Lembretes locais de verdade (push no horário agendado) ainda não disparam — `expo-notifications` já está instalado (veio junto do port da Prevenção) mas a fiação em 3d/3f/3g não foi feita.
- **3e (Prevenção): `CONCLUÍDO`, com uma decisão maior no meio do caminho.** Durante esta sessão, descobriu-se que já existia uma implementação real e testada da Prevenção numa branch divergente (`feat/exame_sugest`, anterior a todo o redesign SDD) — integração de verdade com a API USPSTF/AHRQ via função Lambda, não a heurística textual originalmente planejada. Com sua confirmação, o backend foi portado como estava e a UI foi reconstruída do zero no design system atual, como uma lista filtrável de recomendações por grau (A–I) em vez do layout de score/checklist do Canvas — divergência deliberada e documentada. Pendência remanescente: o banner de campanha de vacinação de 3e ainda não consulta a fonte real que a Vacinação (4e) já disponibiliza.

### Bloco 4 — Assistente de IA, Perfil, Carteira de Vacinação
**Status: praticamente concluído.**
- **4a (Assistente de IA):** UI 100% fiel ao Canvas — disclaimer obrigatório (que estava **ausente** antes, uma violação ativa da regra 4 da constituição, corrigida com prioridade máxima), drawer de histórico, indicador de "digitando" com pontos animados, as 3 sugestões corretas. O serviço de IA foi isolado atrás de `aiAssistantService.ts` (renomeado de `chatService.ts`) deixando explícito que é mock. Duas decisões maiores ficaram — corretamente — fora de escopo e aguardando confirmação sua/do orientador: integração real de LLM (provedor, custo, privacidade LGPD) e persistência de histórico (local vs. DynamoDB).
- **4b (Perfil): `CONCLUÍDO`.** Card "Dispositivos conectados" e "Exportar meus dados" isolados atrás de serviços nomeados (`healthAppConnectService`, `dataExportService`) que comunicam honestamente "indisponível"/"em breve", sem simular sucesso.
- **4c (Editar Perfil): `CONCLUÍDO`.** Upload real de foto de perfil via Amplify Storage (reaproveitando o padrão já usado em exames), sexo "Outro" persistido de verdade, e — achado importante — corrigido um risco real de perda silenciosa de dado: o formulário de 4c enviava os campos clínicos (`chronicConditions`/`medications`/`allergies`) como string vazia mesmo sem coletá-los, o que teria apagado silenciosamente o que o usuário preencheu no wizard (2a) assim que o schema fosse estendido. Resolvido no mesmo commit que estendeu o schema.
- **4e (Carteira de Vacinação): `CONCLUÍDO`.** Model `VaccineDose` dedicado (decisão explícita de não reaproveitar `MedicalDocument`).

## 3. Decisões técnicas relevantes tomadas nesta iniciativa

1. **Prevenção (3e) — portar backend real em vez de construir um novo.** Ao investigar a decisão de cruzamento de dados, veio à tona uma branch (`feat/exame_sugest`) com uma implementação já funcional usando a API oficial USPSTF/AHRQ (Prevention TaskForce API), incluindo função Lambda, filtro por idade/sexo/IMC e lembretes locais configuráveis por grau de evidência. Decisão: portar o backend como estava e reconstruir só a UI no design system atual, em vez de duplicar esforço com uma heurística textual mais simples e menos confiável.
2. **Schema `UserProfile` estendido de forma coordenada entre 2a e 4c.** Sexo biológico ganhou a opção "Outro" e três campos clínicos (`chronicConditions`, `medications`, `allergies`) que já eram coletados no wizard mas descartados silenciosamente. Como as duas telas passam pela mesma função de payload (`buildAmplifyUserProfileInput`), a correção foi feita num único lugar, evitando duas implementações divergentes do mesmo dado.
3. **Upload de avatar via Amplify Storage**, reaproveitando exatamente o padrão já usado para documentos médicos (`examService.ts`) em vez de introduzir uma abordagem nova — path `avatars/{owner}/profile.jpg`, referência (`photoKey`) resolvida sob demanda para uma URL assinada, nunca persistida (evita expiração de link quebrado).
4. **Duas pendências deliberadamente não resolvidas** por envolverem decisões de produto/custo/privacidade LGPD maiores que uma tela de UI: integração real de LLM no Assistente de IA, e persistência de histórico de conversas. Ambas documentadas como pendências formais em vez de implementadas por iniciativa própria.

## 4. Pendências técnicas conhecidas (não bloqueantes, priorizadas)

Ver `specs/design/GAP_ANALYSIS.md`, seção "Pendências técnicas conhecidas", para a lista completa e numerada (39 itens). Destaques por urgência:

**Requer decisão sua/do orientador antes de implementar:**
- Integração real de IA no Assistente (provedor, custo, política de privacidade de dados de saúde enviados a terceiros) — `GAP_ANALYSIS.md` #4.a.
- Persistência de histórico de conversas de IA (local vs. novo model DynamoDB) — #4.b.
- Conflito de obrigatoriedade de campos em Agendamentos (2d/2e) — #12.

**Prontas para implementar, sem decisão pendente:**
- Conectar lembretes de medicamento (3d/3f/3g) ao `expo-notifications` já instalado — #22.
- Banner de campanha de vacinação em Prevenção (3e), consultando a fonte que 4e já disponibiliza — #2/#3.b.
- Widgets da Home (2b): "Próximos compromissos" pode virar dado real de imediato via hook já existente — #15.

**Cosmético / limpeza, baixa prioridade:**
- Padrão de confirmação de exclusão via `Alert` nativo em vez do painel inline (#18), auditoria de dark mode tela-a-tela (#19), código morto (`src/mocks/api/*Api.ts`, #8/#39), pisos tipográficos furados no Bloco 3 (#35).

## 5. Próximo passo recomendado

**Bloco 2 — Perfil de Saúde, Home e Agenda** é a lacuna real mais significativa do projeto: é o único Bloco do roadmap original sem nenhuma implementação SDD, apesar de ter as 5 specs completas e prontas (`spec.md`/`plan.md`/`tasks.md` de `2a` a `2e`). Parte do trabalho de schema que ele dependia (sexo "Outro", campos clínicos) já foi resolvida como efeito colateral do Bloco 4, o que reduz o escopo de 2a especificamente.
