# EPIC: Medicamentos — Doses e Estoque (Bloco 3)

## 1. Identificação
- Bloco/arquivo de origem no Claude Design: tela **3d** ("Medicamentos — doses e estoque") em `specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html` (linhas 369–415). Telas relacionadas do mesmo fluxo, consultadas apenas para completude de campos (têm EPICs próprias, fora de escopo de implementação aqui): **3f** "Novo lembrete de medicamento" (linhas 469–549) e **3g** "Editar medicamento — com exclusão confirmada" (linhas 551+).
- Rota/arquivo no código (existente): `src/app/(app)/medicines.tsx` (rota `/medicines`, aba "Remédios" da tab bar) → renderiza `src/screens/MedicinesScreen.tsx`, alimentado por `src/hooks/useMedicinesData.ts`, hoje 100% sobre `src/mocks/api/medicinesApi.ts` / `src/mocks/medicines.ts` (`CODE_INVENTORY.md` linha 113).
- Ator(es): usuário final (paciente), gerenciando suas próprias doses e estoque de medicamentos.
- **Prioridade: P1** (`GAP_ANALYSIS.md`, Bloco 3, linha 43), status `ATUALIZAR` **+ pendência de backend** (pendência técnica conhecida #1, `GAP_ANALYSIS.md` linha 71: "não existe model Amplify/DynamoDB para medicamentos").
- **Esta é a EPIC de decisão de schema** (constituição, regra 5: "Mudança de schema é decisão explícita e documentada, nunca efeito colateral"; regra 6: cada tela `CRIAR`/`ATUALIZAR` ganha `spec.md`+`plan.md`+`tasks.md` própria). A criação do model `Medicine` aqui destrava não só esta tela (3d) como as telas 3f (criar) e 3g (editar/excluir), que dependem do mesmo schema — ver `plan.md` §2 para a proposta concreta.

## 2. História da funcionalidade
Como usuário final, quero ver minhas próximas doses de medicamentos do dia, marcar cada uma como tomada, e acompanhar o estoque de cada medicamento (com aviso quando estiver acabando), para não esquecer de tomar minha medicação nem ficar sem remédio em casa.

### Cenários (Given/When/Then)

- **Estado vazio (nenhum medicamento cadastrado):**
  Given o usuário autenticado não possui nenhum registro `Medicine` salvo
  When a tela `/medicines` termina de carregar (`useMedicinesData` retorna lista de doses e lista de estoques vazias, `isLoading: false`, `errorMessage: null`)
  Then a tela exibe o estado vazio do padrão de 4 estados (`DESIGN_TOKENS.md` §4: ícone 56×56 em tile `#E8F5EE`/`#C7E8D6`, mensagem, CTA primário "Adicionar medicamento" que navega para 3f) em vez das seções "Próximas doses"/"Estoques" — hoje `MedicinesScreen` já usa dois `EmptyState` independentes (um por seção, "Nenhuma dose pendente" e "Nenhum estoque cadastrado"), o que é adequado quando há *outros* medicamentos ativos mas nada pendente hoje; quando a lista real de medicamentos cadastrados é **zero** (não apenas "nada pendente hoje"), a tela deve mostrar um único estado vazio de página inteira (mensagem "Você ainda não tem medicamentos cadastrados. Adicione o primeiro para começar a acompanhar suas doses e estoque." + CTA "+ Adicionar medicamento"), distinto do caso "tenho medicamentos mas nenhuma dose prevista para hoje".

- **Carregando:**
  Given a tela `/medicines` é aberta
  When `useMedicinesData` está buscando `client.models.Medicine.list()` e `status === 'loading'`
  Then a tela mostra o padrão de skeleton (`ScreenSkeleton`, já implementado) equivalente ao "Carregando seus dados..." documentado em `DESIGN_TOKENS.md` §4.

- **Erro:**
  Given a chamada a `client.models.Medicine.list()` falha (rede indisponível, erro do Amplify)
  When `useAsyncResource`/hook equivalente captura o erro e define `status === 'error'`
  Then a tela exibe o callout de erro padrão (`DESIGN_TOKENS.md` §4: card vermelho, ícone "!", mensagem, botão outline "Tentar novamente") — já implementado via `EmptyState tone="error"` + `onRetry`, manter o mesmo padrão.

- **Dose marcada como tomada:**
  Given existe um `Medicine` ativo com um horário de dose previsto para hoje, exibido em "Próximas doses" com badge "Pendente"
  When o usuário toca no badge (área clicável, `onClick="{{ d.toggle }}"` no Canvas — todo o badge é o alvo de toque, não um botão separado)
  Then o badge alterna para o estado "Tomado" (ícone `✓`, cor verde `#0C6341`/fundo `#E8F5EE`) e persiste essa marcação em uma fonte real (ver `plan.md` §3 para a decisão de onde essa marcação diária é armazenada, já que `Medicine` descreve a prescrição recorrente, não uma dose individual do dia); tocar novamente reverte para "Pendente".

- **Estoque baixo destacado:**
  Given um `Medicine` tem `currentStock <= lowStockThreshold` (quando `lowStockThreshold` está definido)
  When a seção "Estoques" renderiza o card desse medicamento
  Then o card usa a variante de alerta do Canvas: borda `1px solid #F0D6A4` (em vez de `#EFF1F0`), texto da quantidade em `600 16px #8A5300` (em vez de `400 16px #55605C`), barra de progresso em `#8A5300` (em vez de `#10794E`), e uma linha extra abaixo da barra com ícone-círculo "!" `#8A5300` + texto "Estoque baixo — hora de comprar mais" (`600 16px #8A5300`) — reproduzindo exatamente o card "Metformina 850mg" do Canvas (linhas 395–399).

## 3. Estrutura da página
Ordem visual observada no markup (3d), de cima para baixo, dentro do "phone frame" 390×844:

1. Status bar mock (hora "9:41" + ícone de sinal) — decorativo, não implementar.
2. Cabeçalho: título "Medicamentos" (600 26px, `#141817`) + botão "+" à direita (48×48, radius 14, fundo `#10794E`, ícone de cruz branca) → navega para 3f "Novo lembrete".
3. Banner informativo de lembretes ativos: fundo `#E9F1FD`, borda `#CBDFFA`, radius 16px, padding 14px, ícone de sino em tile azul `#1B63C4` 24×24 + texto "Você tem {N} lembretes ativos para hoje." (400 16px `#141817`) — `{N}` é a contagem real de lembretes/doses ativas do dia, não texto fixo.
4. Seção "Próximas doses" (600 20px título): lista vertical (`gap:10px`) de cards (`#fff`, borda `#EFF1F0`, radius 14, padding 14) cada um com: nome + dosagem (`600 17px` — `"{d.name} · {d.dose}"`), horário abaixo (`400 16px #55605C`), e à direita um badge clicável (pill 999px) com ícone-círculo (mark: `✓`/`○`/etc.) + texto ("Tomado"/"Pendente") em cores dinâmicas por status.
5. Seção "Estoques" (600 20px título): lista vertical (`gap:10px`) de cards, cada um com: nome (`600 17px`) + quantidade "`{atual} de {total} {unidade}`" à direita (peso/cor normal ou âmbar se baixo), barra de progresso (altura 10px, radius 5px, trilho `#EFF1F0`, preenchimento verde `#10794E` ou âmbar `#8A5300` conforme `width: {percentual}%`), e condicionalmente a linha de alerta "Estoque baixo — hora de comprar mais" (ver cenário acima).
6. Bottom navigation bar (5 abas: Início/Consultas/Exames/**Remédios** ativo/Mais).
7. Home-indicator bar decorativa.

Fora do escopo visual desta tela (3d), mas cross-referenciados para o schema: 3f (formulário completo de criação — nome, dosagem, forma, horários múltiplos, frequência, datas, estoque, limiar de aviso, observações, toggle ativo/inativo) e 3g (mesmo formulário em modo edição + exclusão com diálogo de confirmação, reaproveitando o padrão de `DESIGN_TOKENS.md` §4 "Confirmação/delete").

## 4. Mapa de navegação

| Elemento | Tipo | Ação | Destino | Condição |
|---|---|---|---|---|
| Botão "+" (cabeçalho) | Botão | Navega | `/medicines/new` (tela 3f, EPIC própria, fora deste escopo de implementação) | Sempre visível |
| Card de dose (área de nome/horário) | Item de lista | `setSelectedMedicine(medicine)` + navega | `/medicines/[id]/edit` (tela 3g, EPIC própria) | Sempre visível quando há doses |
| Badge "Tomado"/"Pendente" (dentro do card de dose) | Toggle clicável | Alterna status da dose de hoje | Permanece na tela, atualiza visualmente | Sempre visível quando há doses |
| Card de estoque | Item de lista | `setSelectedMedicine(medicine)` + navega | `/medicines/[id]/edit` (tela 3g) | Sempre visível quando há estoques |
| Bottom nav — "Remédios" | Aba ativa | N/A (já na tela) | — | Destacada (fundo `#E8F5EE`, texto/ícone `#0C6341`) |
| Bottom nav — outras abas | Navegação | `router.replace(tab.href)` | Início/Consultas/Exames/Mais | Sempre visível (já implementado via `BottomTabBar`) |
| CTA do estado vazio ("+ Adicionar medicamento") | Botão | Navega | `/medicines/new` (3f) | Visível só quando não há nenhum `Medicine` cadastrado |
| Botão "Tentar novamente" (estado de erro) | Botão outline | Reexecuta busca | Permanece na tela | Visível só em `status === 'error'` |

Nota: as rotas exatas `/medicines/new` e `/medicines/[id]/edit` são uma proposta de nomenclatura consistente com o padrão já usado em `/(app)/exams` → `/add-exam`; a EPIC de 3f/3g define o nome de arquivo/rota final — este EPIC (3d) só precisa que os pontos de navegação existam e apontem para algum destino real assim que 3f/3g forem implementadas (podem ficar como placeholder documentado até lá, ver `plan.md` §5).

## 5. Mapa de dados

**Situação atual:** fonte 100% mockada — `src/mocks/api/medicinesApi.ts` (`getMedicinesSnapshot`, `toggleMedicineStatus`, `countPendingMedicines`) lendo de `src/mocks/medicines.ts` (`MEDICINES_SNAPSHOT` estático), consumido por `src/hooks/useMedicinesData.ts`. Não existe nenhum model Amplify — este é o gap central desta EPIC (regra 2 e 5 da constituição).

**Decisão proposta (detalhada em `plan.md` §2):** criar `amplify/data/schemas/medicines.ts` com um model `Medicine`, registrado em `amplify/data/resource.ts` no mesmo padrão de `medicalDocumentsSchema`/`appointmentsSchema`.

| Campo exibido no Canvas (3d, com campos de 3f/3g para completude) | Origem do dado (proposta) | Campo do model `Medicine` | Tipo | Observação |
|---|---|---|---|---|
| Nome do medicamento | Real (novo schema) | `name` | string, obrigatório | — |
| Dosagem (ex. "50mg") | Real (novo schema) | `dosage` | string, obrigatório | — |
| Forma (Comprimido/Gotas/Injeção/Outro) | Real (novo schema) | `form` | enum `['pill','drops','injection','other']`, obrigatório | Só usado no formulário 3f/3g; não exibido em 3d |
| Horário(s) da dose | Real (novo schema) | `times` | lista de string (`hh:mm`), obrigatório, mín. 1 | 3d mostra 1 card por combinação medicamento×horário — ver nota de modelagem abaixo |
| Frequência (todos os dias / dias específicos / a cada X horas) | Real (novo schema) | `frequencyType` (`enum['daily','specific_days','every_x_hours']`) + `weekDays` (lista opcional de string, só quando `specific_days`) + `intervalHours` (int opcional, só quando `every_x_hours`) | — | Só usado no formulário 3f/3g; 3d não exibe frequência diretamente, mas usa-a para calcular quais horários de hoje aparecem em "Próximas doses" |
| Data de início | Real (novo schema) | `startDate` | date, obrigatório | — |
| Data de término (ou "sem data de término") | Real (novo schema) | `endDate` | date, opcional (nulo = sem término) | — |
| Estoque atual | Real (novo schema) | `currentStock` | int, obrigatório | Base da barra de progresso em 3d |
| Unidade (comp./ml/caps.) | Real (novo schema) | `unit` | string ou enum `['comp','ml','caps']`, obrigatório | Compõe "`{atual} de {total} {unidade}`" |
| Estoque total/inicial (para calcular `%` da barra) | **Ambíguo — precisa de decisão** | `initialStock` | int, obrigatório | O Canvas mostra "18 de 30 comprimidos" — "30" não é claramente "estoque inicial da última reposição" vs. "estoque máximo configurado pelo usuário". Interpretação proposta (regra 8): `initialStock` = quantidade informada pelo usuário ao cadastrar/repor o estoque (ex.: "comprei uma caixa de 30"), usada como denominador do percentual até a próxima reposição manual. Documentado como decisão, não bloqueia execução. |
| Limiar de aviso de estoque baixo (opcional) | Real (novo schema) | `lowStockThreshold` | int, opcional | Se ausente, nunca mostra o alerta de estoque baixo (comportamento honesto, não assume um padrão arbitrário sem o usuário definir) |
| Observações (opcional) | Real (novo schema) | `notes` | string, opcional | Só usado no formulário 3f/3g; não exibido em 3d |
| Lembretes ativos (toggle Ativos/Inativos) | Real (novo schema) | `active` | boolean, obrigatório, default `true` | 3d só deve considerar medicamentos com `active: true` para "Próximas doses"/banner de lembretes; medicamentos inativos ainda aparecem em "Estoques"? — **ambiguidade não resolvida pelo Canvas**, proposta: sim, estoque continua visível mesmo inativo (o usuário pode ter parado de tomar mas ainda tem sobra em casa), mas some de "Próximas doses" |
| Marcação "Tomado"/"Pendente" de uma dose específica de hoje | **Gap de modelagem — ver nota abaixo** | não é um campo de `Medicine` | — | `Medicine` descreve a prescrição recorrente; o estado "tomei a dose das 08h00 de hoje" é um evento por dia, não um atributo fixo do medicamento. Ver `plan.md` §3 para a decisão de como modelar isso sem quebrar o schema de prescrição. |
| Banner "Você tem N lembretes ativos para hoje" | Real (derivado) | Calculado em memória: conta doses de hoje com status "Pendente" entre os `Medicine` com `active: true` cujo horário de hoje ainda não passou/foi marcado | — | Nenhum campo novo necessário além do já listado |

Nenhum campo desta tela pode continuar mockado após esta EPIC (regra 2). A pendência técnica #1 de `GAP_ANALYSIS.md` é resolvida por este EPIC ao propor e (na fase de implementação) criar o schema; `src/mocks/api/medicinesApi.ts` e `src/mocks/medicines.ts` devem ser removidos/descontinuados quando o hook migrar para dados reais (ver `tasks.md`).

## 6. Requisitos não-funcionais específicos
- **Paleta de estoque baixo:** usar exatamente os tokens semânticos de aviso (`#8A5300` texto/ícone, `#FFF3DF` fundo de badge — aqui aplicado à barra/borda do card, não a um badge de pill, conforme o Canvas específico de 3d) de `DESIGN_TOKENS.md` §1.
- **Badge de dose (Tomado/Pendente):** sempre ícone-círculo + texto colorido dentro de pill (nunca cor sozinha), conforme regra do Canvas 1a e padrão documentado em `DESIGN_TOKENS.md` §4 "Status badges/pills".
- **Toques mínimos:** botão "+" do cabeçalho 48×48 (touch target ≥48dp), badge de dose com `min-height:36px` mas card inteiro tem `padding:14px` garantindo alvo efetivo maior, conforme `DESIGN_TOKENS.md` §3.
- **4 estados padrão:** loading/vazio/erro/sucesso conforme `DESIGN_TOKENS.md` §4; este EPIC deve garantir que o estado vazio distinga "nenhum medicamento cadastrado" (página inteira) de "nenhuma dose pendente hoje, mas há medicamentos" (vazio só na seção, mantendo a seção "Estoques" populada) — ver cenário de vazio acima.
- **LGPD:** dados de medicação são dados de saúde sensíveis (LGPD) — o novo model `Medicine` deve usar `allow.owner()` (mesmo padrão de `MedicalDocument`/`Appointment`), garantindo que cada usuário só acesse seus próprios registros; nenhuma mudança de fluxo de consentimento é necessária além do onboarding já existente.
- **Nenhuma quebra de dados existentes:** como não existe hoje nenhum dado real de medicamentos persistido, a criação do schema é puramente aditiva — não há risco de migração/corrupção de dados existentes (regra 5), mas o `resource.ts` deve ser editado com cuidado para não afetar os models já registrados (`userSchema`, `medicalDocumentsSchema`, `appointmentsSchema`).

## 7. Critérios de aceite
- [ ] Estrutura visual bate com o Canvas 3d: título "Medicamentos" + botão "+", banner de lembretes ativos com contagem real, seção "Próximas doses" com badges clicáveis, seção "Estoques" com barras de progresso e alerta de estoque baixo condicional.
- [ ] Model `Medicine` criado em `amplify/data/schemas/medicines.ts` e registrado em `amplify/data/resource.ts`, com `allow.owner()`, conforme a proposta de campos do §5 e a decisão detalhada em `plan.md`.
- [ ] `src/hooks/useMedicinesData.ts` migrado para ler de `client.models.Medicine.list()` (dados reais), sem nenhuma dependência de `src/mocks/api/medicinesApi.ts`/`src/mocks/medicines.ts`.
- [ ] Estado vazio de página inteira quando não há nenhum `Medicine` cadastrado, distinto do estado "há medicamentos mas nenhuma dose hoje".
- [ ] Estado de carregamento (skeleton) e erro (callout + retry) conformes a `DESIGN_TOKENS.md` §4.
- [ ] Marcar dose como "Tomada"/"Pendente" funciona com persistência real (não apenas estado local perdido ao recarregar a tela) — mecanismo definido em `plan.md` §3.
- [ ] Estoque baixo destacado exatamente como o Canvas (borda âmbar, texto âmbar na quantidade, barra âmbar, linha de alerta com ícone "!" + texto) quando `currentStock <= lowStockThreshold`.
- [ ] Percentual da barra de progresso calculado com dado real (`currentStock`/`initialStock`), nunca um valor fixo.
- [ ] Banner "Você tem N lembretes ativos para hoje" usa contagem real derivada dos dados, não texto fixo.
- [ ] Botão "+" e cards navegam para os destinos corretos (3f/3g), mesmo que como placeholder documentado até essas EPICs próprias serem implementadas.
- [ ] Nenhum dado mockado remanescente nesta tela (regra 2 da constituição).
