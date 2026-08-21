# TASKS: Prevenção & Alertas — Score e Checklist com Vacinação (3e)

> Pré-requisito para qualquer tarefa de código abaixo: a Tarefa 0 (decisão de dados) precisa estar confirmada por um humano. Este documento não autoriza início de código antes disso.

## Fase 0 — Decisão de dados (bloqueante, front-loaded)
- [ ] **0.1** Revisar `plan.md` §2 com um humano e confirmar: Opção A (heurística textual) vs. Opção B (novo campo/model) para o cruzamento regra-preventiva ↔ documento/agendamento real.
- [ ] **0.2** Confirmar as faixas de badge do score (`plan.md` §2.3: ≥80 "Muito bom", 50–79 "Bom", <50 "Atenção") ou ajustar.
- [ ] **0.3** Confirmar a remoção do item "Pressão arterial" do checklist real nesta fase (sem fonte de dado) — ou definir uma fonte alternativa (ex. campo manual no perfil) caso a revisão prefira mantê-lo.
- [ ] **0.4** Confirmar a decisão do banner de campanha de vacinação: ocultar até 4e definir schema (opção recomendada) vs. conteúdo institucional hardcoded.
- [ ] **0.5** Confirmar a tabela inicial de regras preventivas (`plan.md` §2.1): quais itens, `minAge`, `sex`, `intervalMonths`, `matchKeywords` — validar que os 3-4 itens propostos (Colonoscopia, Vacina da gripe, Exame de vista, [Pressão arterial se mantido]) e seus parâmetros fazem sentido clinicamente básico para o escopo do TCC.

## Fase 1 — Fundação de dados (sem UI)
- [ ] **1.1** Criar `src/config/preventionRules.ts` com a tabela de regras confirmada na Fase 0.
- [ ] **1.2** Criar `src/services/preventionService.ts` com `computePreventionSnapshot(profile, documents, appointments)` — função pura, sem I/O, cobrindo: cálculo de idade a partir de `birthDate`, filtro de regras aplicáveis por idade/sexo, correspondência textual com `MedicalDocument`/`Appointment`, cálculo de status por item, cálculo de score, seleção do alerta urgente (item mais atrasado, se houver).
- [ ] **1.3** Escrever casos de teste (unitário, sem Amplify) para `computePreventionSnapshot` cobrindo os 4 cenários do `spec.md`: score alto/bom, alerta urgente presente, checklist vazio (perfil incompleto — `birthDate`/`sex` ausentes), sem alertas (nenhum item atrasado, nenhuma campanha ativa).

## Fase 2 — Integração com dados reais
- [ ] **2.1** Reescrever `src/hooks/usePreventionData.ts` para buscar `UserProfile` real (reaproveitar o mesmo caminho de acesso já usado em `ProfileScreen`/`useUserContext`, ou `client.models.UserProfile`, conforme já existente no projeto), `client.models.MedicalDocument.list()` (reaproveitar padrão de `useExamsData.ts`) e `client.models.Appointment.list()` (reaproveitar padrão de `useAppointmentsData.ts`), compondo o resultado via `computePreventionSnapshot`.
- [ ] **2.2** Garantir que o hook trata corretamente o caso "perfil incompleto" (retorna snapshot com checklist vazio + motivo, não erro) vs. erro real de rede (falha de `list()`).
- [ ] **2.3** Remover a dependência de `src/mocks/api/preventionApi.ts` do caminho de produção da tela; mover fixtures úteis para os testes de `preventionService.ts` (Fase 1.3) se aplicável; deixar claro em comentário/README se o arquivo mock é mantido só como referência histórica ou removido.

## Fase 3 — UI (`PreventionScreen.tsx`)
- [ ] **3.1** Tornar o card "Urgente" condicional (`alert !== null`), em vez de sempre renderizado.
- [ ] **3.2** Tornar o banner de campanha de vacinação condicional conforme decisão da Fase 0.4 (hoje inexistente na UI — este item é novo, precisa ser adicionado ao componente/estilo seguindo o Canvas 3e, mas mantido oculto/`null` enquanto não há fonte real).
- [ ] **3.3** Diferenciar o estado vazio "perfil incompleto" (copy + CTA "Completar perfil" → `/edit-profile`) do estado "nenhum item pendente"/checklist zerado por outro motivo — hoje ambos caem na mesma `EmptyState` genérica em `PreventionScreen.tsx`.
- [ ] **3.4** Conferir que `PreventiveScore`/`HealthCheckItem`/`UrgentAlert` (componentes já existentes) recebem e exibem corretamente os novos dados reais (score calculado, status por item, badges com os 3 tokens semânticos corretos: Atrasado/Pendente/Em dia).
- [ ] **3.5** Ligar o CTA "Agendar agora" do alerta urgente à navegação real para `/(app)/add-appointment`, com pré-preenchimento de `appointmentName`/`appointmentType` quando aplicável (hoje é `onPress={() => {}}` em `PreventionScreen.tsx`).

## Fase 4 — Ajustes de tipos e limpeza
- [ ] **4.1** Atualizar `src/types/models.ts` (`PreventiveAlert`, `PreventiveScoreSnapshot`, `PreventiveCheck`, `PreventionSnapshot`) se os campos derivados (ex. dias de atraso, motivo do status) exigirem novos campos — manter compatibilidade com os componentes de UI existentes sempre que possível.
- [ ] **4.2** Confirmar que nenhum `console.log` de debug com dado sensível (idade, histórico de exames) permanece no `preventionService.ts`/hook final.
- [ ] **4.3** Atualizar `GAP_ANALYSIS.md` (pendência #2) e `CODE_INVENTORY.md` (linha `preventionApi.ts`/`PreventionScreen.tsx`) ao concluir, registrando a decisão final tomada e o item "Pressão arterial" removido (se essa foi a decisão) como pendência técnica formal.

## Fase 5 — Follow-up (após EPIC de 4e "Carteira de vacinação")
- [ ] **5.1** [DESBLOQUEADO — 4e concluída] Schema `VaccineDose` (`amplify/data/schemas/vaccination.ts`) e config de campanhas (`src/config/vaccinationCampaigns.ts`, `getActiveVaccinationCampaign()`) já existem. Implementar o banner de campanha de vacinação de 3e consultando a mesma `getActiveVaccinationCampaign()` (não criar uma fonte paralela) e, opcionalmente, `client.models.VaccineDose.list()` filtrando por `appliedDate == null` para decidir se há vacinas pendentes do usuário — ver `specs/04-ia-perfil-vacinacao/carteira-vacinacao/plan.md` §5.
- [ ] **5.2** Revisitar a decisão da Fase 0.1 (Opção A vs. B) se, na prática, a heurística textual gerar falsos "Pendente" com frequência alta o suficiente para prejudicar a experiência — considerar migrar para Opção B nesse caso.
