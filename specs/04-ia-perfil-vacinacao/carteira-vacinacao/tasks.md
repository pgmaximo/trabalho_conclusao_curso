# TASKS: Carteira de Vacinação (Bloco 4)

## Schema (decisão desta EPIC — fazer primeiro)

- [x] Criado `amplify/data/schemas/vaccination.ts` com o model `VaccineDose` conforme `plan.md` §2–§3: `name` (obrigatório), `doseNumber` (opcional), `appliedDate` (date, nullable), `location` (opcional), `dueDate` (opcional), `recommendedIntervalYears` (opcional), `isCampaign` (boolean, default `false`), `notes` (opcional), `.authorization((allow) => [allow.owner()])`.
- [x] `vaccinationSchema` registrado em `amplify/data/resource.ts` (import + spread em `a.schema({...})`), sem alterar `userSchema`/`medicalDocumentsSchema`/`appointmentsSchema` existentes — confirmado por `git diff` (mudança puramente aditiva).
- [x] `ampx sandbox --once` executado com sucesso (Node 20.20.1) — stack `amplify-tcc-pedro-sandbox-12a5bc5141` atualizado em 118s, tabela `VaccineDose` provisionada (`UPDATE_COMPLETE`), `amplify_outputs.json` regenerado. Confirmado que `UserProfile`/`MedicalDocument`/`Appointment` também atualizaram sem erro (mudança aditiva).

## Conteúdo institucional (banner de campanha)

- [x] Criado `src/config/vaccinationCampaigns.ts` com a config estática de campanhas (`{ id, title, message, activeFrom, activeUntil }`), incluindo a campanha de exemplo do Canvas (gripe, até 30/09, ano corrente).
- [x] Lógica de seleção da campanha ativa (`activeFrom <= hoje <= activeUntil`) implementada em `getActiveVaccinationCampaign()` — sem campanha ativa, o banner não renderiza.
- [x] Nova pendência técnica adicionada a `GAP_ANALYSIS.md` (item 3.a) documentando que a integração com fonte pública de dados de campanha não foi implementada nesta EPIC.

## Tipos e hook de dados

- [x] `src/types/models.ts`: adicionados `VaccineDoseStatus` e `VaccineDoseItem` (tipo de apresentação, cobrindo pendente/atrasada/aplicada) e `VaccinationSnapshot`.
- [x] Criado `src/hooks/useVaccinationData.ts`: busca `client.models.VaccineDose.list()` (owner-scoped) via `src/services/vaccinationService.ts`; deriva "Próximas recomendadas" (`appliedDate == null`, status `pendente`/`atrasada` a partir de `dueDate` vs. hoje) e "Histórico de doses" (`appliedDate != null`, ordenado desc); resolve a campanha ativa via `vaccinationCampaigns.ts`. Lógica de derivação extraída para `deriveVaccinationLists()` (testável sem mockar I/O) e coberta por `__tests__/vaccination-data.test.ts` (5 testes).
- [x] Contrato `isLoading`/`errorMessage`/`retry` via `useAsyncResource`, consistente com `usePreventionData.ts`/`useAppointmentsData.ts`.
- [ ] Geração automática de próxima recomendação (`plan.md` §3, opcional) — **adiada nesta EPIC**, não implementada. Cadastro manual via bottom sheet cobre o caso mínimo.

## Tela e rota

- [x] Criado `src/screens/VaccinationScreen.tsx`: cabeçalho com botão voltar + título + botão "+" (adicionar), banner de campanha condicional, seção "Próximas recomendadas" (badges Pendente/Atrasada via `Badge` variant `warning`/`danger`), seção "Histórico de doses" (badge `success` "Aplicada" + "Aplicada em {data} · {local}").
- [x] Criado `src/app/(app)/vaccination.tsx` — rota fina que conecta `useVaccinationData` + `AddVaccineSheet` + `createVaccineDose`, com `Alert` de erro amigável e `retry()` após salvar.
- [x] 4 estados padrão implementados: carregando (`ScreenSkeleton`), vazio (`EmptyState` + CTA "Adicionar vacina", banner de campanha ainda visível), erro (`EmptyState tone="error"` + "Tentar novamente"), sucesso (listas populadas).
- [x] Diferenciação visual Pendente (`Badge variant="warning"`, tokens `#8A5300`/`#FFF3DF`/`#F0D6A4`) vs. Atrasada (`variant="danger"`, `#B3261E`/`#FDECEA`/`#F3C9C5`) — nunca a mesma cor; badge sempre ícone-círculo + texto dentro de pill (componente `Badge` já reforça essa regra para todo o app).
- [x] Badge "Aplicada" (`variant="success"`, `#10794E`/`#E8F5EE`/`#C7E8D6`) no histórico, com "Aplicada em {data} · {local}" abaixo do nome.

## Fluxo de cadastro manual (bottom sheet)

- [x] Criado `src/components/AddVaccineSheet.tsx` (`plan.md` §6): campos nome, "já foi aplicada?" (Sim/Não), data (DD/MM/AAAA, aplicação ou recomendada), local (só quando aplicada) — reaproveita `BottomSheet`/`FormField`/`Button` já existentes, mesmo padrão do sheet "Adicionar documento" (3a).
- [x] CTA do estado vazio e botão "+" no cabeçalho (decisão de implementação, já que o Canvas não desenha esse elemento — documentado aqui) ligados ao bottom sheet, persistindo via `vaccinationService.createVaccineDose()` → `client.models.VaccineDose.create()`.

## Navegação (reconciliação com fundação)

- [x] `src/constants/navigation.ts`: `vaccination` adicionado a `MORE_MENU_ITEMS` (label "Carteira de vacinação", ícone `medical`) e `/vaccination` a `MORE_ROUTE_PREFIXES`.
- [x] `MoreScreen.tsx` renderiza `MORE_MENU_ITEMS` dinamicamente (nenhuma alteração necessária) — novo item aparece automaticamente, navegando via `router.push('/vaccination')`.

## Follow-up cross-EPIC

- [x] Task rastreável registrada em `specs/03-exames-receitas/prevencao/tasks.md` (Fase 5.1, atualizada para "[DESBLOQUEADO]") para `PreventionScreen.tsx` voltar a exibir seu banner de vacinação condicional, consumindo `vaccinationCampaigns.ts`/`VaccineDose` — não implementado aqui (fora de escopo, `PreventionScreen.tsx` não foi tocado).

## Validação final

- [x] Typecheck (`tsc --noEmit`) e lint (`eslint`) limpos em todos os arquivos novos/alterados.
- [x] Testes automatizados: `__tests__/vaccination-data.test.ts` (5 testes, derivação pendente/atrasada/aplicada + ordenação) e `__tests__/vaccination-screen.test.tsx` (5 testes, estados vazio/loading/erro/badges/banner). Suíte completa do projeto: 11 suites, 46 testes, todos passando.
- [x] Confirmado via `git diff amplify/data/resource.ts` que a mudança é só adição.
- [x] `GAP_ANALYSIS.md` atualizado: linha 4e marcada `CONCLUÍDO`, pendência #3 reescrita com a decisão tomada + sub-itens 3.a/3.b remanescentes.
- [x] Confirmado que nenhum dado exibido nesta tela é mockado, exceto o banner institucional (explicitamente documentado como conteúdo estático/admin-configurado).
- [ ] Comparação visual manual (dispositivo/simulador) contra o Canvas 4e — não executada nesta sessão (sem acesso a simulador/dispositivo).
- [ ] `CODE_INVENTORY.md` — atualizar linha de vacinação (pendente, ver nota da sessão).

## Atualização (branch `feat_vacina`)

- Item da linha 13 acima ("integração com fonte pública não implementada nesta EPIC") **foi resolvido** em EPIC própria: `specs/04-ia-perfil-vacinacao/campanhas-vacinacao/spec.md`. `src/config/vaccinationCampaigns.ts` (linhas 11–12 acima) foi removido e substituído por `src/services/vaccinationCampaignSummary.ts` + `amplify/functions/get-vaccination-campaigns/`.
- `AddVaccineSheet.tsx` (linhas 32–33 acima) foi removido e substituído por `src/screens/AddVaccineScreen.tsx` (tela cheia) — o formulário cresceu (seleção de vacina do catálogo, número da dose, lote, fabricante) além do que cabia num bottom sheet curto.
- `VaccinationScreen.tsx`/`useVaccinationData.ts` (linhas 17–19, 24) foram reestruturados: a "Carteira" agora agrupa doses por vacina com progresso ("Hepatite B · 2 de 3 doses"), além de manter "Próximas recomendadas". Ver `campanhas-vacinacao/spec.md` §6.
- A geração automática de próxima recomendação (linha 20, adiada) **foi implementada** — `src/services/vaccineScheduleService.ts#derivePendingSeries`, acionada ao registrar uma dose aplicada de uma vacina com série.
