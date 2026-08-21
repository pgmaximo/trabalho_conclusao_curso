# TASKS: Carteira de Vacinação (Bloco 4)

## Schema (decisão desta EPIC — fazer primeiro)

- [ ] Criar `amplify/data/schemas/vaccination.ts` com o model `VaccineDose` conforme `plan.md` §2–§3: `name` (obrigatório), `doseNumber` (opcional), `appliedDate` (date, **opcional/nullable**), `location` (opcional), `dueDate` (opcional), `recommendedIntervalYears` (opcional), `isCampaign` (boolean, default `false`), `notes` (opcional), `.authorization((allow) => [allow.owner()])`.
- [ ] Registrar `vaccinationSchema` em `amplify/data/resource.ts` (`import` + spread em `a.schema({...})`), sem alterar `userSchema`/`medicalDocumentsSchema`/`appointmentsSchema`/`medicinesSchema` existentes.
- [ ] Rodar `ampx sandbox` (Node 20 — `nvm use 20.20.1` antes) para validar que o schema compila e a tabela `VaccineDose` é provisionada sem erros.
- [ ] Confirmar via `git diff amplify/data/resource.ts` que a mudança é só adição (nenhum model existente afetado).

## Conteúdo institucional (banner de campanha)

- [ ] Criar `src/config/vaccinationCampaigns.ts` com a config estática de campanhas (`{ id, title, message, activeFrom, activeUntil }`), conforme `plan.md` §4 — incluir ao menos a campanha de exemplo do Canvas (gripe, até 30/09) com datas plausíveis/parametrizáveis.
- [ ] Implementar a lógica de seleção da campanha ativa (`activeFrom <= hoje <= activeUntil`) — sem campanha ativa, o banner não renderiza (nunca mostrar um banner fixo sem uma campanha real configurada).
- [ ] Adicionar a `GAP_ANALYSIS.md` uma nova pendência técnica documentando que a integração com fonte pública de dados de campanha (PNI/Ministério da Saúde ou similar) não foi implementada nesta EPIC — conforme decisão de `plan.md` §4.

## Tipos e hook de dados

- [ ] `src/types/models.ts`: adicionar tipo de apresentação para dose de vacina (derivado do `VaccineDose` real, ou tipo gerado do Amplify diretamente), cobrindo os dois estados (pendente/atrasada vs. aplicada).
- [ ] Criar `src/hooks/useVaccinationData.ts`: buscar `client.models.VaccineDose.list()` (owner-scoped via `allow.owner()`); derivar "Próximas recomendadas" (itens com `appliedDate == null`, calculando `status: 'pendente' | 'atrasada'` a partir de `dueDate` vs. hoje, conforme `plan.md` §3); derivar "Histórico de doses" (itens com `appliedDate != null`, ordenados por `appliedDate` desc); resolver a campanha ativa via `vaccinationCampaigns.ts`.
- [ ] Manter o contrato de `status`/`errorMessage`/`retry`/`isLoading` (via `useAsyncResource` ou padrão equivalente já usado em `useExamsData.ts`/`useMedicinesData.ts`), para consistência com os demais hooks do app.
- [ ] (Opcional, decisão de implementação) Implementar a geração automática de próxima recomendação (`plan.md` §3) ao marcar uma dose com `recommendedIntervalYears` como aplicada — se adiada, documentar a decisão tomada aqui.

## Tela e rota

- [ ] Criar `src/screens/VaccinationScreen.tsx` seguindo a estrutura do Canvas 4e (`spec.md` §3): cabeçalho com botão voltar + título, banner de campanha condicional, seção "Próximas recomendadas" (badges Pendente/Atrasada com cores corretas), seção "Histórico de doses" (badge "Aplicada" + data + local).
- [ ] Criar `src/app/(app)/vaccination.tsx` — rota fina que só importa e renderiza `VaccinationScreen`, igual ao padrão das demais rotas do grupo `(app)`.
- [ ] Implementar os 4 estados padrão (`DESIGN_TOKENS.md` §4): carregando (skeleton), vazio (mensagem + CTA "+ Adicionar vacina", banner de campanha ainda visível se houver campanha ativa), erro (callout vermelho + "Tentar novamente"), sucesso (listas populadas).
- [ ] Implementar a diferenciação visual Pendente (`#8A5300`/`#FFF3DF`/`#F0D6A4`) vs. Atrasada (`#B3261E`/`#FDECEA`/`#F3C9C5`) — nunca a mesma cor para os dois estados; badge sempre ícone-círculo + texto dentro de pill (nunca cor isolada).
- [ ] Implementar o badge "Aplicada" (`#10794E`/`#E8F5EE`/`#C7E8D6`, ícone "✓") no histórico, com "Aplicada em {data} · {local}" abaixo do nome.

## Fluxo de cadastro manual (bottom sheet)

- [ ] Criar o bottom sheet "Adicionar vacina" (`plan.md` §6): campos nome, "já foi aplicada?" (sim/não), data (aplicação ou recomendada), local (só quando aplicada) — reaproveitar o padrão de bottom sheet já usado em 3a ("Adicionar documento").
- [ ] Ligar o CTA do estado vazio e um botão/FAB de adição (a definir em revisão visual, já que o Canvas não desenha esse elemento) a esse bottom sheet, persistindo via `client.models.VaccineDose.create()`.

## Navegação (reconciliação com fundação)

- [ ] Atualizar `src/constants/navigation.ts`: adicionar `vaccination` a `MORE_MENU_ITEMS` (label "Carteira de vacinação", ícone sugerido `medical`/seringa — a validar em revisão visual) e `/vaccination` a `MORE_ROUTE_PREFIXES`, conforme a tarefa de follow-up já antecipada em `specs/00-fundacao/navegacao/plan.md` §7.
- [ ] Confirmar que `src/screens/MoreScreen.tsx` (se já implementado pela EPIC de fundação) renderiza o novo item corretamente, navegando via `router.push('/vaccination')`.

## Follow-up cross-EPIC (não implementado nesta EPIC, apenas registrado)

- [ ] Registrar uma tarefa rastreável (issue/tasks da EPIC de Prevenção) para `src/screens/PreventionScreen.tsx` voltar a exibir seu banner de vacinação condicional, consultando `client.models.VaccineDose.list()` e/ou `src/config/vaccinationCampaigns.ts` (mesma fonte criada aqui), conforme a dependência documentada em `specs/03-exames-receitas/prevencao/plan.md` §2.5 e reconciliada em `plan.md` §5 desta EPIC.

## Validação final

- [ ] Comparar visualmente a tela renderizada contra o Canvas 4e: cabeçalho, banner de campanha, "Próximas recomendadas" com badges corretos, "Histórico de doses" com badges "Aplicada".
- [ ] Testar os cenários do `spec.md`: vazio (nenhuma vacina), carregamento, erro, dose pendente vs. atrasada (diferenciação visual), histórico com múltiplas doses.
- [ ] Confirmar que `amplify/data/resource.ts` só teve adição (nenhum model existente alterado/quebrado) — `git diff` antes de commit.
- [ ] Atualizar `CODE_INVENTORY.md` e `GAP_ANALYSIS.md` (pendência técnica #3) para refletir que o schema de vacinação foi criado e a tela implementada, incluindo a nova pendência de integração com fonte pública de dados de campanha.
- [ ] Confirmar que nenhum dado exibido nesta tela é mockado, exceto o banner institucional (explicitamente documentado como conteúdo estático/admin-configurado, não dado de usuário).
