# Relatório de Progresso — SDD SuaSaúde (Fase 4)

> Gerado a partir do estado real do código e dos commits (`git log`), cruzado com as specs em `specs/`, não apenas com os checkboxes dos `tasks.md`. Este relatório existe para dar um retrato confiável de "o que está de fato implementado" vs. "o que ainda não foi tocado", já que o `GAP_ANALYSIS.md` por si só pode ficar defasado entre uma sessão e outra.

## 1. Resumo executivo

De 21 telas mapeadas no design (`DESIGN_INVENTORY.md`, 4 Blocos, `4d` não existe), **12 estão concluídas** (com pendências pontuais documentadas, nenhuma bloqueante) e **9 têm implementação anterior ao SDD mas ainda não foram auditadas/atualizadas contra o Canvas** (Bloco 1 completo e 3a-3c). Com a conclusão desta sessão, **o Bloco 2 (Perfil de Saúde, Home e Agenda) foi implementado por completo (2a–2e)** — era o único Bloco do roadmap original sem nenhuma implementação SDD; agora todos os 4 Blocos do escopo têm ao menos uma tela concluída.

Toda a implementação seguiu o processo SDD: spec → plan → tasks → código, com cada EPIC concluído rastreável a um commit que referencia o caminho da spec (`git log --oneline --all | grep "conforme specs"`).

## 2. Status por Bloco

### Bloco 0 — Fundação
**Status: concluído.** Commits `1464276` (design tokens) e `80fd38e` (navegação 5 abas + "Mais"). Paleta/tipografia/espaçamento migrados para os tokens reais extraídos do Canvas (`#10794E`/`#1B63C4`, IBM Plex Sans); estrutura de navegação reorganizada nas 5 abas do design (Início/Consultas/Exames/Remédios/Mais). Pendências pontuais em `design-tokens/tasks.md` (5 itens) e `navegacao/tasks.md` (5 itens) — nenhuma bloqueante, ver `GAP_ANALYSIS.md` itens 7-9.

### Bloco 1 — Autenticação (1b–1f)
**Status: implementado, spec aplicada.** Commits `66577c7` (login), `326d934` (cadastro), `ce77aab` (confirmação), `52a0cad` (recuperar senha). Pendências residuais menores por tela (2-8 itens cada em `tasks.md`), principalmente auditoria de dark mode tela-a-tela (`GAP_ANALYSIS.md` #19) — nenhuma tela precisa ser refeita, são ajustes finos. O item #18 (padrão de confirmação de exclusão via `Alert` nativo) foi verificado nesta sessão como não aplicável a este Bloco: login/cadastro/confirmação não têm nenhuma ação de exclusão.

### Bloco 2 — Perfil de Saúde, Home e Agenda (2a–2e)
**Status: `CONCLUÍDO` nesta sessão — as 5 telas implementadas.** Commits `60a0b24` (2a, wizard de perfil de saúde), `e30fe7d` (2b, Home), `57fca85` (2c, Agenda), `0a76a8f` (2d, Novo agendamento), `39096d3` (2e, Editar agendamento). Este era o único Bloco do roadmap original sem nenhuma implementação SDD antes desta sessão (specs prontas desde a Fase 0/1, zero tasks concluídas).

- **2a (Wizard de Perfil de Saúde):** o schema de `UserProfile` já tinha sido estendido (sexo "Outro", campos clínicos) durante o trabalho anterior do Bloco 4/4c — nenhuma mudança de schema foi necessária aqui, só UI: chips de sexo biológico unificados (Masculino/Feminino/Outro), altura em centímetros inteiros, banners LGPD específicos por etapa com o texto exato do Canvas (corrigindo uma violação ativa da regra 4 — o texto genérico anterior não mencionava LGPD), e revisão da Etapa 4 agrupada em 3 seções com link "Editar" por seção.
- **2b (Home):** de-mockados "Próximos compromissos" e a cláusula de consultas de "Resumo de hoje" via `Appointment` real (`useAppointmentsData`); removida a seção "Indicadores principais" (métricas de frequência cardíaca/sono sem correspondência no Canvas nem fonte real); grid "Acesso rápido" corrigido para 2×2 sem o tile "Wearable" (que não existe no Canvas nem em nenhuma feature real do app); loading/erro tratados por widget em vez de bloco único. "Prevenção em atraso" ficou condicional (prop `preventionAlert`, sempre `null` por ora) — dependência cross-Bloco documentada, não implementada com dado falso.
- **2c (Agenda):** seletor de 7 dias reescrito para janela fixa (antes só mostrava dias com compromisso existente, quebrando o cenário "dia sem compromissos"); achado um bug pré-existente onde a lista de compromissos nunca filtrava pelo dia selecionado (sempre mostrava tudo) — corrigido; paleta de `AppointmentCard.tsx` alinhada aos tokens do design system (estava hardcoded, incluía um tipo `'retorno'` que nunca existiu no schema real); sincronização com Google Agenda passa a abrir um aviso "Em breve" isolado (`googleCalendarSync.ts`) em vez de um `onPress` vazio.
- **2d/2e (Novo/Editar agendamento):** ambas as telas reescritas do zero no design system atual (`FormField`/`DateInput`/`Button`/`InlineError`, substituindo `alert()`/`confirm()` nativos e cores hardcoded). Conflito de obrigatoriedade de schema (`professionalName`/`address` exigidos pelo Amplify mas opcionais no Canvas) resolvido com confirmação explícita do usuário: campos tornados opcionais no schema (mudança aditiva/compatível). 2e reaproveita `DeleteConfirmPanel` (criado na EPIC 3c) para a confirmação de exclusão inline.

Pendências remanescentes do Bloco 2, nenhuma bloqueante:
- Validação manual em dispositivo/simulador contra o Amplify sandbox não foi executada nesta sessão (sem acesso ao ambiente `ampx sandbox` neste passe) — schema de `appointments.ts` mudou e precisa ser sincronizado antes de testar 2d/2e end-to-end.
- "Resumo de hoje" (medicamentos) e "Prevenção em atraso" (2b) seguem bloqueados por outros Blocos (Medicamentos e Prevenção, respectivamente — ver pendências #1/#2).
- Central de notificações (sino da Home) e sincronização real com Google Agenda são pendências técnicas formais novas, isoladas atrás de stubs nomeados (nunca fake).

### Bloco 3 — Exames & Receitas, Medicamentos, Prevenção
**Status: misto.**
- **3a/3b/3c (núcleo do MVP — lista, adicionar documento, detalhe do documento):** implementados (`3031844`, `7bc03a2`, `5e70e93`). O badge "Normal/Alterado" sem fonte real (#17) e os cabeçalhos inconsistentes entre as 3 telas (#34) já foram corrigidos — o primeiro já estava certo desde a implementação original (badge omitido para exames, filtro "Alterados" desabilitado), o segundo via o novo componente `DetailHeader.tsx` (3b/3c). Gap remanescente: validação de MIME só por extensão de arquivo (#29), limitação conhecida e aceita por ora.
- **3d/3f/3g (Medicamentos, Novo lembrete, Editar medicamento): `CONCLUÍDO`.** Model `Medicine` real no DynamoDB, CRUD completo. Lembretes locais reais agora disparam de fato — `src/services/medicineReminderService.ts` agenda notificações via `expo-notifications` (trigger DAILY/WEEKLY/TIME_INTERVAL), conectado em 3f (ao criar) e 3g (ao editar/excluir).
- **3e (Prevenção): `CONCLUÍDO`, com uma decisão maior no meio do caminho.** Integração real com a API USPSTF/AHRQ via função Lambda, portada de uma branch divergente (`feat/exame_sugest`) que já continha essa implementação real e testada. UI reconstruída como lista filtrável de recomendações por grau (A–I) em vez do layout de score/checklist do Canvas — divergência deliberada e documentada. O banner de campanha de vacinação de 3e agora consulta a mesma fonte que a Vacinação (4e) já disponibiliza (`vaccinationCampaigns.ts`).

### Bloco 4 — Assistente de IA, Perfil, Carteira de Vacinação
**Status: praticamente concluído.**
- **4a (Assistente de IA):** UI 100% fiel ao Canvas — disclaimer obrigatório (que estava **ausente** antes, uma violação ativa da regra 4 da constituição, corrigida com prioridade máxima), drawer de histórico, indicador de "digitando" com pontos animados, as 3 sugestões corretas. O serviço de IA foi isolado atrás de `aiAssistantService.ts` deixando explícito que é mock. Duas decisões maiores ficaram — corretamente — fora de escopo e aguardando confirmação sua/do orientador: integração real de LLM e persistência de histórico.
- **4b (Perfil): `CONCLUÍDO`.** Card "Dispositivos conectados" e "Exportar meus dados" isolados atrás de serviços nomeados que comunicam honestamente "indisponível"/"em breve".
- **4c (Editar Perfil): `CONCLUÍDO`.** Upload real de foto de perfil via Amplify Storage, sexo "Outro" persistido de verdade, e um risco real de perda silenciosa de dado corrigido (campos clínicos enviados como string vazia mesmo sem coletá-los).
- **4e (Carteira de Vacinação): `CONCLUÍDO`.** Model `VaccineDose` dedicado.

## 3. Decisões técnicas relevantes tomadas nesta sessão

1. **Confirmação explícita do usuário: `professionalName`/`address` opcionais no schema de `Appointment` (2d/2e).** O conflito entre o Canvas (só exige nome/data/hora) e o schema Amplify (exigia os 4 campos) estava registrado como pendência #12 do `GAP_ANALYSIS.md`, aguardando decisão humana. Perguntado diretamente ao usuário nesta sessão (2026-08-21); resposta: tornar os campos opcionais. Mudança aditiva/compatível, sem migração destrutiva.
2. **`useAppointmentsData` ganhou `scheduledAt` (ISO bruto) em `AppointmentEntry` e um segundo campo de retorno, `appointmentsForSelectedDate`, separado de `appointments` (lista completa).** Necessário porque a Home (2b) precisa da lista completa de compromissos (para "próximos" e "resumo de hoje"), enquanto a Agenda (2c) precisa só dos compromissos do dia selecionado — um único campo não servia aos dois consumidores sem quebrar um deles.
3. **Paleta de tipo de compromisso (`AppointmentType`) unificada entre Home (2b) e Agenda (2c).** As duas specs, escritas em sessões/momentos diferentes, propunham mapeamentos de cor divergentes para o mesmo enum (`consulta`/`exame`/`cirurgia`). A decisão de 2c (mais detalhada, com justificativa explícita por tipo) foi adotada como fonte canônica e replicada em `HomeScreen.tsx` — mesmo padrão de reconciliação já usado para o schema de Medicamentos (pendência #21, Bloco 3).
4. **Tipo `AppointmentType` teve `'retorno'` removido** (`types/models.ts`) — nunca existiu no enum real do schema Amplify (`CONSULTA`/`EXAME`/`CIRURGIA`); era um valor morto, inalcançável a partir de dado real, mas presente na tipagem do front havia tempo.
5. **`AddAppointmentScreen.tsx`/`EditAppointmentScreen.tsx` (2d/2e) reescritas por completo**, não apenas remendadas — ambas eram versões legadas pré-SDD (`COLORS`/`FONTS` estáticos, `alert()`/`confirm()` bloqueantes, sem dark mode). Reescrever do zero no padrão já estabelecido por outras telas do Bloco 3 (`FormField`/`DateInput`/`Button`/`InlineError`) foi mais direto do que adaptar a estrutura antiga incrementalmente, e mantém as duas telas consistentes entre si.
6. **Bug pré-existente corrigido em `useAppointmentsData`**: a lista de compromissos da Agenda nunca filtrava pelo dia selecionado no seletor de 7 dias — sempre retornava todos os compromissos do usuário, independente da data escolhida. Isso significava que o cenário "dia sem compromissos" (com CTA "Agendar consulta") nunca era alcançável na prática. Corrigido como parte da EPIC 2c.

## 4. Pendências técnicas conhecidas (não bloqueantes, priorizadas)

Ver `specs/design/GAP_ANALYSIS.md`, seção "Pendências técnicas conhecidas", para a lista completa e numerada. Destaques por urgência:

**Requer decisão sua/do orientador antes de implementar:**
- Integração real de IA no Assistente (provedor, custo, política de privacidade de dados de saúde enviados a terceiros) — `GAP_ANALYSIS.md` #4.a.
- Persistência de histórico de conversas de IA (local vs. novo model DynamoDB) — #4.b.

**Prontas para implementar, sem decisão pendente:**
- Rodar `ampx sandbox` para sincronizar o schema de `Appointment` (`professionalName`/`address` agora opcionais) — necessário antes de validar 2d/2e end-to-end.
- Composição de "Resumo de hoje" (medicamentos) e "Prevenção em atraso" na Home (2b), quando Medicamentos e Prevenção expuserem os hooks/dados necessários — dependência cross-Bloco, não decidida nesta sessão.

**Cosmético / limpeza, baixa prioridade:**
- Confirmação de exclusão via `Alert` nativo (#18): verificado nesta sessão como não aplicável a nenhuma tela — Bloco 1 não tem ação de exclusão, e as únicas telas que de fato tinham esse padrão (3c, 2e) já usam `DeleteConfirmPanel`.
- Auditoria de dark mode tela-a-tela (#19), código morto (`src/mocks/api/*Api.ts`, `useDashboardData.ts`/`dashboardApi.ts` agora órfãos após a EPIC de Home, #8/#39), pisos tipográficos furados no Bloco 3 (#35).
- Central de notificações (#9.a) e sincronização real com Google Agenda (#9.b) — features inteiramente ausentes, isoladas atrás de stubs nomeados, sem dono de Bloco definido.

## 5. Próximo passo recomendado

Com o Bloco 2 concluído, os 4 Blocos do roadmap original têm ao menos as telas núcleo implementadas. As pendências de maior prioridade sem decisão bloqueante são: **rodar `ampx sandbox`** para sincronizar o schema de `Appointment` alterado nesta sessão (pré-requisito para qualquer QA real de 2d/2e), e **auditar o Bloco 1 (Autenticação, 1b–1f)** contra o Canvas — é o único Bloco totalmente implementado que nunca passou por uma auditoria de fidelidade tela-a-tela dedicada, mesmo já estando em produção. Alternativamente, o núcleo do MVP em Exames (3a–3c) tem gaps de fidelidade documentados e prontos para correção sem decisão pendente.

Em uma sessão subsequente (2026-08-21), a EPIC `docs/superpowers/plans/2026-08-21-pendencias-bloco3-vacinacao-headers.md` fechou seis pendências do `GAP_ANALYSIS.md`: #34 (cabeçalhos de 3b/3c padronizados via `DetailHeader.tsx`), #22 (lembretes reais de medicamento via `medicineReminderService.ts`, conectados em 3f/3g), #2/#3.b (banner de campanha de vacinação em Prevenção, 3e, consultando a mesma fonte de 4e), e #17/#18 — dois itens que, verificados nesta sessão, já estavam de fato resolvidos antes dela (badge "Normal/Alterado" e o escopo real do padrão de exclusão), mas nunca haviam sido marcados como tal no `GAP_ANALYSIS.md`. Nenhuma dessas seis pendências permanece em aberto; o restante da lista do `GAP_ANALYSIS.md` (incluindo #29, MIME por conteúdo real, deliberadamente fora de escopo) segue sem alteração.
