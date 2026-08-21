# PLAN: Prevenção & Alertas — Score e Checklist com Vacinação (3e)

> **Status desta EPIC:** proposta de interpretação de dados (regra 8 da constituição), **não é decisão final**. Antes de iniciar a Fase 3 (implementação de código), a seção 2 abaixo precisa de confirmação humana explícita — em particular a escolha entre Opção A e Opção B da regra do checklist, e a decisão sobre o banner de vacinação (bloqueado por 4e).

## 1. Objetivo
Substituir `src/mocks/api/preventionApi.ts` (mock 100% estático) por uma fonte de dado real para a tela `/prevention` (3e), sem introduzir nenhum model Amplify novo nesta primeira fase — reaproveitando `UserProfile`, `MedicalDocument` e `Appointment` já existentes, conforme a regra 3 da constituição ("stack existente é respeitada antes de expandida").

## 2. Decisão de fonte de dados (a confirmar)

### 2.1 Tabela de regras preventivas (idade/sexo → itens recomendados)
Proposta: arquivo estático `src/config/preventionRules.ts` (ou `src/services/preventionRulesService.ts` se envolver lógica, não só dados) com uma lista de regras no formato:

```
{
  id: 'colonoscopia',
  title: 'Colonoscopia',
  minAge: 45,
  sex: 'ambos',              // 'Masculino' | 'Feminino' | 'ambos'
  intervalMonths: 60,
  matchKeywords: ['colonoscopia'],
  metaLabelWhenOk: (date) => `Realizado em ${date}`,
  metaLabelWhenOverdue: () => 'Recomendada a cada 5 anos',
}
```
4 regras iniciais cobrem exatamente os itens do Canvas 3e (Colonoscopia, Vacina da gripe, Exame de vista, Pressão arterial) — suficiente para não regredir a fidelidade visual, mas a tabela pode crescer sem mudança de schema.

### 2.2 Cruzamento com dados reais — Opção A (recomendada) vs. Opção B
- **Opção A — heurística textual (menor esforço, reaproveita 100% do schema atual):** para cada regra, buscar em `MedicalDocument.list()` (e, para itens não-exame, em `Appointment.list()`) um registro cujo `documentName`/`appointmentName` contenha (case-insensitive, normalizado) alguma das `matchKeywords` da regra. Se encontrado e dentro do intervalo → "Em dia"; se encontrado e fora do intervalo → "Atrasado"; se nunca encontrado → "Pendente" (nunca realizado, sem registro).
  - Risco reconhecido: nomes de documentos livres digitados pelo usuário podem não bater com as keywords (ex. "Colono 2024.pdf" não contém "colonoscopia"). Mitigação de curto prazo: manter a lista de keywords generosa (sinônimos comuns) e tratar falha de correspondência como "Pendente" (nunca falso "Em dia"), o que é o comportamento seguro.
  - **Pressão arterial** é um caso especial: não é um documento nem um agendamento no schema atual — não há fonte real alguma para "Última verificação: hoje". Proposta: **remover este item do checklist real nesta fase** (documentar como pendência, não simular) até existir uma fonte (ex.: entrada manual do usuário, futuro registro de sinais vitais) — ou, alternativa, tratá-lo permanentemente como "Pendente" sem nunca poder ficar "Em dia", o que é enganoso. Recomenda-se a primeira opção (omitir o item até haver fonte real), a confirmar.
- **Opção B — novo model `PreventiveCheckOverride` ou campo estruturado em `MedicalDocument`:** adicionar um campo opcional `examCategory` (enum) ao schema `MedicalDocument`, preenchido pelo usuário no fluxo de upload (tela 3b), permitindo correspondência exata em vez de heurística textual. Mais robusto, mas (a) é uma mudança de schema fora do escopo original desta tela, (b) exige alterar a tela 3b (fora do escopo desta EPIC), (c) não resolve o caso "Pressão arterial" (que não é um documento). Registrado aqui como alternativa caso a revisão humana julgue a Opção A frágil demais para produção/TCC.

**Recomendação desta EPIC: Opção A**, por ser aditiva, não tocar em outras telas/EPICs já entregues (3a/3b), e ser suficiente para o escopo do TCC (protótipo funcional, não produto em escala). A decisão final fica registrada aqui após revisão humana.

### 2.3 Cálculo do score
`score = round((itens "Em dia" / itens aplicáveis ao perfil) * 100)`. "Itens aplicáveis" exclui regras cujo `minAge`/`sex` não batem com o perfil do usuário (ex. usuário de 30 anos não é penalizado por não ter feito colonoscopia, cuja regra só vale a partir de 45). Faixas de badge propostas (ajustar em revisão):
- score ≥ 80 → "Muito bom" (ícone ✓ verde)
- 50 ≤ score < 80 → "Bom" (mesmo ícone ✓ verde, mantendo simplicidade visual do Canvas que só mostra uma variante)
- score < 50 → "Atenção" (ícone ! âmbar, reaproveitando o token semântico de warning)

Se `itens aplicáveis == 0` (perfil incompleto ou nenhuma regra aplicável), a seção de score não é exibida com número — cai no cenário "checklist vazio" do `spec.md`.

### 2.4 Alerta urgente
Derivado, não persistido: `itens com status 'Atrasado', ordenados por dias de atraso desc`. Se houver ao menos um, o card "Urgente" mostra o primeiro (mais atrasado), com descrição gerada por template: `"Sua {título, minúsculo} de rotina está atrasada há {N} {meses|dias}."`. CTA "Agendar agora" navega para `/(app)/add-appointment` passando `appointmentName`/`appointmentType` sugeridos via params (mesmo padrão de navegação com dados pré-preenchidos já usado em outras EPICs deste Bloco, a confirmar contra `AddAppointmentScreen` atual).

### 2.5 Banner de campanha de vacinação (dependência bloqueante de 4e)
**Decisão proposta: não implementar com conteúdo real nesta EPIC.** Duas sub-opções:
- (a) Ocultar completamente o banner até a EPIC de 4e ("Carteira de vacinação") definir seu schema (`VaccinationRecord` ou reaproveitamento de `MedicalDocument`), e então esta EPIC (3e) ganha uma tarefa de follow-up para consultar essa mesma fonte.
- (b) Implementar o banner como conteúdo institucional estático/hardcoded (não é "dado do usuário", é aviso de saúde pública) — tecnicamente não viola a regra 2 da constituição (que fala de dado exibido *como se fosse do usuário*), mas mistura uma campanha fixa não configurável, que ficaria desatualizada (a data "30/09" é fixa) sem manutenção.

**Recomendação: (a)**, por consistência de longo prazo e para não introduzir uma segunda fonte de "dado de vacinação" que precisaria ser reconciliada com 4e depois. Ambas as opções ficam registradas para decisão humana.

## 3. Migração técnica proposta
1. Criar `src/config/preventionRules.ts` com a tabela de regras (dados estáticos, sem I/O).
2. Criar `src/services/preventionService.ts` com a função pura `computePreventionSnapshot(profile: UserProfile, documents: MedicalDocument[], appointments: Appointment[]): PreventionSnapshot` — implementa 2.2–2.4, testável isoladamente sem depender de Amplify.
3. Reescrever `src/hooks/usePreventionData.ts` para buscar `UserProfile` (via `UserContext`/`client.models.UserProfile`, já usado em outras telas), `client.models.MedicalDocument.list()` (já usado em `useExamsData.ts`, reaproveitar padrão) e `client.models.Appointment.list()` (já usado em `useAppointmentsData.ts`), e então chamar `computePreventionSnapshot`.
4. Ajustar `src/screens/PreventionScreen.tsx` para tornar o card "Urgente" e o banner de vacinação condicionais (hoje sempre renderizados), e para diferenciar o estado vazio de "perfil incompleto" do estado "nenhum item pendente" (hoje usa a mesma `EmptyState` genérica).
5. Remover `src/mocks/api/preventionApi.ts` e `src/mocks/prevention.ts` do caminho real (podem ficar como fixtures de teste unitário do novo `preventionService.ts`, não mais como fonte de tela).
6. Item "Pressão arterial" do checklist: omitir da tabela de regras nesta fase (sem fonte real), documentar como pendência técnica em `GAP_ANALYSIS.md` na revisão pós-implementação desta EPIC.

## 4. Riscos e trade-offs documentados
- **Divergência visual do Canvas:** o Canvas 3e sempre mostra o alerta "Urgente" e o banner de vacinação preenchidos; a implementação real os torna condicionais. Isso é uma divergência deliberada e documentada (regra 8), necessária para respeitar a regra 2 ("nenhum dado mockado permanece") — o Canvas é uma referência de um estado específico (usuário com pendências), não uma garantia de que esse estado sempre existe.
- **Heurística textual frágil (Opção A, §2.2):** aceito como trade-off de escopo/tempo de TCC; documentado para eventual evolução (Opção B) se o produto crescer além do protótipo.
- **Item "Pressão arterial" sem fonte real:** removido do checklist real até existir uma fonte (ex. registro manual de sinais vitais, fora do escopo atual do app). Divergência de conteúdo do Canvas documentada aqui, não implementada com dado falso.
- **Dependência entre EPICs (3e → 4e):** o roadmap de `GAP_ANALYSIS.md` implementa 3e antes de 4e; esta EPIC entrega 3e funcionalmente completa exceto o banner de vacinação, que fica como tarefa pendente/follow-up após 4e definir seu schema — não bloqueia o restante da tela.

## 5. Fora de escopo desta EPIC
- Reestruturação da navegação de 5 abas + hub "Mais" (tratada em EPIC de fundação/navegação separada — hoje `/prevention` continua acessível como está até essa EPIC mudar a estrutura).
- Qualquer mudança ao schema `MedicalDocument`/`Appointment` (Opção B só é executada se a revisão humana explicitamente preferir essa rota em vez da Opção A).
- Definição do schema de vacinação (pertence à EPIC de 4e "Carteira de vacinação").
