# EPIC: Prevenção & Alertas — Score e Checklist com Vacinação (Bloco 3)

## 1. Identificação
- Bloco/arquivo de origem no Claude Design: tela **3e** ("Prevenção & Alertas — score e checklist com vacinação") em `specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html` (linhas 417–467).
- Rota/arquivo no código (existente): `src/app/(app)/prevention.tsx` (rota `/prevention`) → renderiza `src/screens/PreventionScreen.tsx`, alimentado por `src/hooks/usePreventionData.ts` → hoje 100% mock via `src/mocks/api/preventionApi.ts` (`getPreventionSnapshot` lendo `PREVENTION_SNAPSHOT` estático de `src/mocks/prevention.ts`).
- Ator(es): usuário final (paciente), consultando seus alertas preventivos, sua "pontuação preventiva" e um checklist de exames/vacinas/verificações recomendados para sua idade/sexo.
- **Prioridade: P1** (`GAP_ANALYSIS.md`, Bloco 3, linha "3e Prevenção & Alertas"), status `ATUALIZAR` + pendência de backend (pendência #2 do `GAP_ANALYSIS.md`: "sem model Amplify; o 'score preventivo' e checklist precisam de fonte real... decisão de design de dados a tomar no plan.md").
- No mapa de navegação alvo (5 abas + "Mais"), esta tela é acessada a partir do hub "Mais" (`DESIGN_TOKENS.md` §4, nota sobre bottom nav: "screen 3e's 'Prevenção' content is reached via 'Mais'"), não como aba própria — hoje `prevention` é uma das 6 `APP_TABS` diretas; a reorganização da navegação em si é tratada em outra EPIC (fundação/navegação), não nesta.

## 2. História da funcionalidade
Como usuário final, quero ver um resumo do meu estado preventivo de saúde — uma pontuação, alertas urgentes e um checklist de exames/vacinas/verificações recomendados para minha idade e sexo com seus status (em dia, atrasado, pendente) — para saber rapidamente o que preciso agendar antes que vire um problema.

**Esta é uma EPIC de decisão de fonte de dados (regra 8 da constituição).** O Canvas 3e mostra um "score preventivo" numérico (82/100, badge "Muito bom") e um checklist de 4 itens (Colonoscopia, Vacina da gripe, Exame de vista, Pressão arterial) com status individuais — nenhum desses dados tem hoje um model Amplify dedicado. A interpretação proposta para viabilizar dados reais (sem mock) está detalhada em `plan.md`; ela deve ser confirmada por um humano antes da Fase 3 (implementação), conforme a regra 8 explicitamente prevê ("documentada, não trava a execução", mas trava a implementação até revisão nesta EPIC específica dado o tamanho da decisão de schema/regras envolvida).

### Cenários (Given/When/Then)

- **Score alto/bom, sem alertas urgentes:**
  Given o perfil do usuário (`UserProfile.birthDate` + `sex`) está completo e todos os itens do checklist calculado estão com status "Em dia" (nenhum "Atrasado")
  When a tela `/prevention` termina de carregar
  Then o card de alerta urgente (vermelho) **não é exibido** (ver Mapa de navegação/estrutura — hoje o Canvas mostra sempre um alerta fixo; a implementação real deve tratá-lo como condicional, aparecendo somente quando existe pelo menos um item "Atrasado"), o card de pontuação mostra o score derivado (ex. 100, badge "Muito bom" ou equivalente por faixa — ver §5) e o checklist lista todos os itens com badge verde "Em dia".

- **Alertas urgentes presentes (replica o Canvas):**
  Given existe ao menos um item do checklist com status "Atrasado" (ex.: Colonoscopia vencida há mais de X meses do intervalo recomendado)
  When a tela carrega
  Then o card vermelho "Urgente" é exibido no topo, com a descrição do item mais atrasado (ex.: "Sua colonoscopia de rotina está atrasada há 3 meses.") calculada a partir da diferença entre a data esperada (última realização + intervalo recomendado) e hoje, e o CTA "Agendar agora" navega para o fluxo de novo agendamento (`/add-appointment`, tela 2d) pré-preenchendo o tipo/nome quando possível.

- **Checklist vazio (perfil incompleto):**
  Given o `UserProfile` do usuário autenticado não tem `birthDate` e/ou `sex` preenchidos (campos obrigatórios para a tabela de regras idade/sexo — ver §5)
  When a tela `/prevention` carrega
  Then a seção de checklist exibe o estado vazio padrão (`DESIGN_TOKENS.md` §4: ícone 56×56, mensagem, CTA) com copy explicando a causa real (ex.: "Complete seu perfil (data de nascimento e sexo) para vermos as recomendações preventivas para você.") e CTA "Completar perfil" → `/edit-profile` (4c) — **nunca** um checklist mockado ou genérico sem base real.

- **Sem alertas (nenhum item vencido, campanha de vacinação fora do período):**
  Given não há itens "Atrasado" no checklist e a campanha de vacinação sazonal (ver §5, dado ainda sem fonte real) não está ativa/configurada
  When a tela carrega
  Then nem o card "Urgente" nem o banner de campanha de vacinação são exibidos — a tela mostra só o card de pontuação e o checklist, sem criar alertas falsos para preencher o espaço do Canvas.

- **Carregando:**
  Given a tela `/prevention` é aberta
  When os dados dependentes (`UserProfile` + `MedicalDocument.list()`) ainda estão em busca
  Then a tela mostra o padrão de skeleton (`ScreenSkeleton`, já implementado), igual ao já presente hoje.

- **Erro de rede:**
  Given a busca de `UserProfile` ou `MedicalDocument.list()` falha
  When o hook captura o erro
  Then a tela exibe o callout de erro padrão (`EmptyState tone="error"` + retry) — já implementado hoje, mantém.

## 3. Estrutura da página
Ordem visual observada no markup (3e), de cima para baixo, dentro do "phone frame" 390×844:

1. Status bar mock ("9:41" + ícone de sinal) — decorativo, não implementar.
2. Título de página "Prevenção" (600 26px, `#141817`).
3. Card de alerta urgente (condicional — ver cenários): fundo `#FDECEA`, borda 1px `#F3C9C5`, radius 16px, padding 16px. Ícone-círculo 26px vermelho `#B3261E` com "!", título "Urgente" (600 17px), descrição (400 16px, `#7A231E`). Botão "Agendar agora" abaixo (altura 48px, radius 12px, fundo `#B3261E`, texto branco 600 16px, full width).
4. Card "Sua pontuação preventiva": fundo `#fff`, borda 1px `#EFF1F0`, radius 18px, padding 18px. Título (600 20px). Número grande do score (700 40px, `#0C6341`, ex. "82") ao lado de: barra de progresso (14px altura, radius 7px, trilha `#EFF1F0`, preenchimento `#10794E` proporcional ao %) + badge de status abaixo dela (ícone-círculo 18px verde com "✓" + texto 600 16px `#0C6341`, ex. "Muito bov").
5. Banner de campanha de vacinação (condicional): fundo `#E8F5EE`, borda 1px `#C7E8D6`, radius 16px, padding 14px, ícone-tile 24×24 verde `#10794E` com glifo de seringa/cruz, texto (400 16px, `#0C6341`) — ex. "Campanha de vacinação contra a gripe até 30/09 nas unidades de saúde."
6. Título de seção "Exames, vacinas e verificações" (600 20px, `#141817`).
7. Lista de cards do checklist, coluna com gap 10px, cada card (`#fff`, borda 1px `#EFF1F0`, radius 14px, padding 14px, flex row):
   - Coluna esquerda: nome do item (600 17px, `#141817`) + linha de meta (400 16px, `#55605C`) — varia por item: "Recomendada a cada 5 anos" (Colonoscopia), "Campanha anual · até 30/09" (Vacina da gripe), "Realizado em 03/2026" (Exame de vista), "Última verificação: hoje" (Pressão arterial).
   - Badge de status à direita (pill 999px, ícone-círculo 16px + texto 600 15px): 3 variantes no Canvas — **Atrasado** (vermelho `#B3261E`/`#FDECEA`, "!"), **Pendente** (âmbar `#8A5300`/`#FFF3DF`, "!"), **Em dia** (verde `#0C6341`/`#E8F5EE`, "✓").
8. Bottom navigation bar (5 abas: Início/Consultas/Exames/Remédios/**Mais** ativo — reflete que esta tela é alcançada via "Mais").
9. Home-indicator bar decorativa.

## 4. Mapa de navegação

| Elemento | Tipo | Ação | Destino | Condição |
|---|---|---|---|---|
| Card "Urgente" + botão "Agendar agora" | Card + CTA | Navega para novo agendamento, pré-preenchendo tipo/nome quando possível | `/(app)/add-appointment` (tela 2d) | Visível somente quando há item "Atrasado" (ver cenários) |
| Card "Sua pontuação preventiva" | Card informativo | Nenhuma (sem toque no Canvas) | — | Sempre visível quando o checklist tem ao menos 1 item calculável |
| Banner de campanha de vacinação | Banner informativo | Nenhuma ação de toque desenhada no Canvas | — | Visível somente quando há campanha ativa configurada (ver §5, pendência) |
| Card de item do checklist | Item de lista | Sem navegação desenhada no Canvas (nenhum `onPress` explícito); interpretação: manter tocável para expansão futura, mas sem destino nesta fase — atualmente `HealthCheckItem` já expõe `onPress`, mantém como no-op documentado até haver uma tela de detalhe do item | — (no-op) | Sempre visível por item |
| Bottom nav — "Mais" | Aba ativa | N/A (já na tela, conceitualmente) | — | Destacada — depende da EPIC de navegação/hub "Mais" para existir de fato como entrada |
| Bottom nav — outras abas | Navegação | `router.replace(tab.href)` | Início/Consultas/Exames/Remédios | Já implementado via `BottomTabBar`; ajustar apenas quando a EPIC de navegação global mover `prevention` para trás do hub "Mais" |

## 5. Mapa de dados

**Não existe hoje nenhum model Amplify dedicado a "prevenção", "score preventivo" ou "vacinação".** Os dados reais disponíveis que podem alimentar esta tela são:
- `UserProfile` (`amplify/data/schemas/user.ts`): `birthDate` (obrigatório), `sex` (`'Masculino' | 'Feminino'`, opcional), demais campos de estilo de vida.
- `MedicalDocument` (`amplify/data/schemas/medical-documents.ts`): `documentType` (`'exam' | 'prescription'`), `documentName`, `documentDate`, `expirationDate` — sem campo de resultado clínico nem de tipo específico de exame (ex. não há um campo estruturado "colonoscopia" vs. "exame de vista").
- `Appointment` (`amplify/data/schemas/appointments.ts`): `appointmentType` (`'CONSULTA' | 'EXAME' | 'CIRURGIA'`), `appointmentName`, `scheduledAt` — sem ligação estruturada a um "tipo de exame preventivo".
- Nenhum model existe para vacinação (nem aqui, nem na tela 4e "Carteira de vacinação", que é `CRIAR` — ver ambiguidade #3 abaixo).

| Campo exibido no Canvas (3e) | Origem do dado | Fonte técnica real proposta | Observação / pendência |
|---|---|---|---|
| Título/descrição do alerta "Urgente" | **Sem fonte real hoje** | Derivado — item do checklist calculado com status "Atrasado" há mais tempo (maior atraso em dias) | Ver ambiguidade #1 |
| Pontuação preventiva (número + barra + badge) | **Sem fonte real hoje** | Derivado — percentual de itens do checklist com status "Em dia" sobre o total de itens aplicáveis ao perfil | Ver ambiguidade #1 |
| Cada item do checklist (nome, meta, status) | **Sem fonte real hoje** | Derivado — tabela de regras estática (idade/sexo → lista de itens recomendados + intervalo) cruzada com `MedicalDocument`/`Appointment` existentes por correspondência de nome/tipo | Ver ambiguidade #1 |
| Banner de campanha de vacinação | **Sem fonte real hoje, nem model, nem configuração** | Nenhuma proposta imediata dentro do escopo de dados já existentes — teria que ser (a) conteúdo estático/hardcoded no app (não é "dado do usuário", é conteúdo institucional) ou (b) esperar o schema de vacinação da tela 4e | Ver ambiguidade #2 |

### Ambiguidade #1 — Score e checklist (regra 8 da constituição)
**Interpretação proposta** (não final — requer confirmação humana antes da Fase 3, ver `plan.md` para detalhamento técnico):
1. Uma **tabela de regras estática** no código (não um model Amplify novo) mapeia idade (derivada de `UserProfile.birthDate`) e sexo (`UserProfile.sex`) para uma lista de itens preventivos recomendados com intervalo esperado (ex.: Colonoscopia a partir de 45 anos, a cada 5 anos; Exame de vista anual; Pressão arterial a cada 6 meses; Vacina da gripe anual/sazonal).
2. Cada item é cruzado com `MedicalDocument`/`Appointment` já existentes do usuário, buscando correspondência textual aproximada entre `documentName`/`appointmentName` e o nome do item da regra (ex. `documentName` contém "colonoscopia").
3. Se há correspondência: status = "Em dia" se dentro do intervalo, "Atrasado" se fora dele. Se não há nenhuma correspondência: status = "Pendente" (nunca realizado / sem registro).
4. Score = `round(quantidade "Em dia" / total de itens aplicáveis * 100)`, com faixas de badge (ex. ≥80 "Muito bom", 60–79 "Bom", <60 "Atenção") a confirmar em `plan.md`.
5. Alerta urgente = item "Atrasado" com maior atraso em dias, se houver algum; senão, nenhum alerta é mostrado (divergindo do Canvas, que sempre mostra um — ver cenário "Sem alertas").

Esta é a interpretação mais coerente com os dados reais já existentes (não exige schema novo, reaproveita `UserProfile`+`MedicalDocument`+`Appointment`), mas tem uma fraqueza reconhecida: a correspondência textual entre nome de item da regra e `documentName`/`appointmentName` é frágil (usuário pode nomear o documento de forma diferente). Alternativas mais robustas (campo estruturado de "tipo de exame preventivo" no upload, ou um novo model `PreventiveCheck`) são descritas em `plan.md` como opção B, caso a revisão humana prefira investir em schema novo em vez de heurística textual.

### Ambiguidade #2 — Banner de campanha de vacinação (overlap com tela 4e)
O banner "Campanha de vacinação contra a gripe até 30/09" não tem fonte de dado real hoje, e a tela **4e "Carteira de vacinação"** (Bloco 4, status `CRIAR` em `GAP_ANALYSIS.md`, pendência #3: "sem model Amplify. Pode reaproveitar `MedicalDocument` (tipo vacina) ou exigir schema novo — decisão a documentar") é onde o histórico completo de vacinas do usuário deveria, coerentemente, viver. **Interpretação proposta:** este banner de 3e não deveria ter sua própria fonte de dado isolada — ele deveria ler do **mesmo model/fonte de dados de vacinação** que a EPIC de 4e vier a definir (ex.: se 4e criar um model `VaccinationRecord`, o banner de 3e consultaria esse mesmo model para "há uma campanha/vacina pendente relevante?"). Até a EPIC de 4e decidir esse schema, este banner **não deve ser implementado com conteúdo mockado fixo** — a interpretação recomendada nesta EPIC é **ocultar o banner** (tratá-lo como sempre condicional/ausente) até que a fonte de dado de vacinação exista, documentando isso como dependência bloqueante explícita entre as duas EPICs (3e depende de 4e para este elemento específico, mesmo sendo entregue antes na ordem de prioridade do roadmap).

### Ambiguidade #3 (relacionada) — Ordem de dependência 3e vs. 4e
`GAP_ANALYSIS.md` lista a ordem de implementação sugerida como "6. Bloco 3 — Prevenção (3e)" antes de "8. Bloco 4 — Vacinação (4e)". Esta EPIC não pode alterar essa ordem, mas registra que o elemento "banner de campanha de vacinação" de 3e é o único ponto de acoplamento — o restante da tela (alerta urgente, score, checklist de exames/pressão) não depende de 4e e pode ser implementado independentemente.

## 6. Requisitos não-funcionais específicos
- **Paleta de badges:** usar exatamente os tokens semânticos de `DESIGN_TOKENS.md` §1 — Atrasado (vermelho `#B3261E`/`#FDECEA`), Pendente (âmbar `#8A5300`/`#FFF3DF`), Em dia (verde `#0C6341`/`#E8F5EE`) — sempre ícone-círculo + texto dentro de pill, nunca cor sozinha.
- **Card de alerta urgente:** só renderiza quando há de fato um item atrasado — nunca hardcoded/sempre visível (diverge deliberadamente do Canvas estático para respeitar a regra 2 da constituição, "nenhum dado mockado permanece").
- **Cálculo de idade/intervalos:** feito client-side a partir de `UserProfile.birthDate` (ou, se a lógica crescer, em um serviço nomeado ex. `preventionRulesService.ts`, nunca inline espalhado pela tela).
- **4 estados padrão:** loading/vazio/erro/sucesso conforme `DESIGN_TOKENS.md` §4; o estado vazio deve ser específico para "perfil incompleto" (ver cenário) — não reaproveitar a mensagem genérica "Nenhum item preventivo pendente" que hoje mistura vazio real com ausência de dado de perfil.
- **LGPD:** dados de saúde sensíveis (data de nascimento, sexo, histórico de exames). Nenhuma mudança de fluxo de consentimento nesta tela especificamente (consentimento ocorre no onboarding), mas nenhum dado deve ser logado em texto plano.
- **Nenhuma quebra de dados existentes:** qualquer decisão de schema futura (ex.: novo model `PreventiveCheck` ou `VaccinationRecord`) é aditiva, nunca destrutiva a `UserProfile`/`MedicalDocument`/`Appointment` já persistidos (regra 5 da constituição).
- **Rastreabilidade da decisão:** por ser uma EPIC de decisão de dados (regra 8), a implementação da Fase 3 só deve iniciar após revisão humana explícita da interpretação proposta em `plan.md` — este spec.md e o plan.md não são autorização de código, são a proposta documentada.

## 7. Critérios de aceite
- [ ] Estrutura visual bate com o Canvas 3e: título "Prevenção", card de alerta urgente (condicional), card de pontuação preventiva (número + barra + badge), banner de campanha de vacinação (condicional), seção "Exames, vacinas e verificações" com cards de checklist com badge de status.
- [ ] Interpretação de fonte de dados para score/checklist (ambiguidade #1) confirmada por revisão humana antes de qualquer código de Fase 3.
- [ ] Score e status de cada item do checklist calculados 100% a partir de dado real (`UserProfile` + `MedicalDocument`/`Appointment`) — nenhum valor mockado ou fixo.
- [ ] Card "Urgente" aparece somente quando existe item "Atrasado" real; nunca fixo/sempre visível.
- [ ] Banner de campanha de vacinação implementado como condicional/oculto até a fonte de dado de vacinação (dependência de 4e) existir — documentado como dependência explícita entre EPICs, não implementado com conteúdo hardcoded fixo.
- [ ] Checklist vazio (perfil incompleto) mostra estado vazio específico com CTA "Completar perfil" → `/edit-profile`, distinto do estado "sem alertas"/"tudo em dia".
- [ ] Estados de carregamento (skeleton) e erro (callout + retry) preservados/conformes a `DESIGN_TOKENS.md` §4.
- [ ] `src/mocks/api/preventionApi.ts` e `src/mocks/prevention.ts` deixam de ser a fonte de dado real da tela (removidos ou isolados como fallback/dev-only documentado) — ver `plan.md` para o plano de migração.
- [ ] Nenhum dado mockado exibido silenciosamente como se fosse real (regra 2 da constituição).
