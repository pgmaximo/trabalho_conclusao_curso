# EPIC: Medicamentos — Novo lembrete de medicamento

## 1. Identificação
- Bloco/arquivo de origem no Claude Design: Tela 3f ("Novo lembrete de medicamento") em `specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html` (linhas 469-551, entre 3e "Prevenção" e 3g "Editar medicamento — com exclusão confirmada").
- Rota/arquivo no código: **proposto: `src/app/add-medicine.tsx`** (rota `/add-medicine`) → `src/screens/AddMedicineScreen.tsx` (`AddMedicineScreen`). Não existe hoje nenhuma tela equivalente — confirmado via `Glob src/screens/*.tsx` (17 telas listadas, nenhuma de criação/edição de medicamento) e via `GAP_ANALYSIS.md` linha 45 (`3f Novo lembrete de medicamento | Não | Sim | CRIAR | P1`). `MedicinesScreen.tsx` (`/medicines`) tem um botão "+" no header (`ScreenHeader action`) já desenhado mas com `onPress={() => {}}` vazio — é o gancho de entrada natural para esta tela (ver §4).
- Ator(es): usuário final autenticado que já tem (ou está cadastrando pela primeira vez) um controle de medicamentos em `/medicines` e quer criar um novo lembrete de dose/estoque.

## 2. História da funcionalidade
Como usuário autenticado na tela de Medicamentos, quero cadastrar um novo lembrete informando nome, dosagem, forma, um ou mais horários de dose, a frequência (todos os dias, dias específicos da semana ou a cada X horas), o período de vigência (com ou sem data de término), o estoque atual com sua unidade, um limite opcional de estoque baixo, observações livres e se o lembrete deve nascer ativo ou inativo — para que o app passe a rastrear minhas doses e meu estoque de forma confiável, com validação clara de campos obrigatórios antes de salvar.

### Cenários (Given/When/Then)
- **Abertura da tela vazia:** Dado que o usuário toca no botão "+" do header de `/medicines` (ou em outro ponto de entrada equivalente), quando a tela `/add-medicine` abre, então nenhum campo vem pré-preenchido, a lista de horários mostra 1 campo vazio (`hint-placeholder-count="1"` no Canvas), frequência nenhuma opção está selecionada, "Sem data de término" está desmarcado, unidade de estoque nenhuma selecionada, e o toggle "Lembretes ativos" mostra "Ativos"/"Inativos" sem seleção padrão visível no Canvas (ver ambiguidade em §8) — botão "Salvar" desabilitado.
- **Frequência = Todos os dias:** Dado que o usuário toca no chip "Todos os dias", quando a seleção é aplicada (borda/bg/texto verde, replicando o padrão de chip selecionado), então nem a grade de dias da semana nem o campo "A cada X horas" ficam visíveis — apenas nome, dosagem, forma, horários e datas são necessários para habilitar o salvamento (além de estoque/unidade).
- **Frequência = Dias específicos:** Dado que o usuário toca no chip "Dias específicos", quando a seleção é aplicada, então uma grade de 7 chips (dom/seg/ter/qua/qui/sex/sáb, `weekDaysList`, `sc-for` de 7 itens com `w.onToggle`) aparece logo abaixo, permitindo múltipla seleção (não exclusiva); o campo "A cada X horas" continua oculto; o salvamento exige pelo menos 1 dia da semana marcado.
- **Frequência = A cada X horas:** Dado que o usuário toca no chip "A cada X horas", quando a seleção é aplicada, então um campo numérico único aparece ("A cada [__] horas", placeholder "8"), a grade de dias da semana não aparece, e o salvamento exige um valor numérico positivo nesse campo.
- **Troca de frequência descarta estado do modo anterior:** Dado que o usuário selecionou "Dias específicos" e marcou 3 dias, quando ele troca para "Todos os dias" ou "A cada X horas", então os dias marcados deixam de ser exibidos/exigidos (o payload de frequência muda de forma — comportamento de descarte a confirmar em `plan.md`, análogo ao caso já documentado em `adicionar-documento/spec.md` para troca de tipo Receita→Exame).
- **Adicionar/remover horário de dose:** Dado que o usuário toca em "+ Adicionar horário" (`addTime`), quando a ação roda, então um novo campo `hh:mm` vazio é adicionado à lista (`nmTimesList`, `sc-for`); tocar no "×" (`t.onRemove`) de um horário existente o remove da lista — a lista nunca pode ficar com 0 horários ao salvar (mínimo 1).
- **Horário duplicado:** Dado que o usuário preenche dois ou mais campos de horário com o mesmo valor `hh:mm` (ex.: "08:00" duas vezes), quando ele toca em "Salvar", então a validação bloqueia o envio com uma mensagem clara (ex.: "Horários de dose duplicados: 08:00") — o Canvas não modela esse erro visualmente (sem campo de erro inline por item de horário), então a mensagem de erro segue o padrão de alerta pós-toque documentado em §8 até decisão de UI mais refinada.
- **Sem data de término marcado:** Dado que o usuário toca no checkbox "Sem data de término" (`toggleNoEndDate`), quando a marcação é aplicada, então o campo "Data de término" fica visualmente desabilitado (`disabled="{{ nmNoEndDate }}"`, bg alterado via `nmEndBg`) e deixa de ser obrigatório para salvar; desmarcar o checkbox reabilita o campo e volta a exigi-lo (ou permite ficar vazio — ambiguidade tratada em §8, interpretação adotada: campo passa a ser opcional mesmo desmarcado, já que o Canvas não modela "obrigatório" nele explicitamente além do estar habilitado).
- **Campos obrigatórios faltando:** Dado que o usuário toca em "Salvar" sem ter preenchido nome do medicamento, dosagem, forma, ao menos 1 horário válido, uma frequência selecionada (com seus sub-requisitos conforme os cenários acima), data de início, estoque atual e unidade, quando a validação roda, então o botão "Salvar" permanece no estado visualmente desabilitado (`nmSaveBg`/`nmSaveFg` dinâmicos, mesmo padrão de `#DFE3E1`/`#7A8480` de `DESIGN_TOKENS.md`) — nunca dependendo apenas de um alerta reativo pós-toque, seguindo o padrão já adotado em `adicionar-documento/spec.md`.
- **Estoque baixo opcional:** Dado que o usuário deixa "Avisar quando restar menos de" vazio, quando ele salva o lembrete, então o lembrete é criado sem limite de estoque baixo configurado (campo explicitamente opcional no Canvas — label diz "(opcional)") — nenhuma validação bloqueia o salvamento por causa dele.
- **Observações opcionais:** Dado que o usuário deixa "Observações" vazio, quando ele salva, então o lembrete é criado sem observações — campo explicitamente opcional no Canvas.
- **Ativo vs. Inativo:** Dado que o usuário alterna entre os chips "Ativos"/"Inativos" (`setActiveOn`/`setActiveOff`), quando ele salva, então o lembrete é criado com o campo de status correspondente — um lembrete "Inativo" ainda é salvo e listado, apenas não gera notificações/contagem de pendências (ver pendência de notificações em `plan.md`).
- **Sucesso volta para 3d:** Dado que todos os campos obrigatórios estão válidos (incluindo os sub-requisitos condicionais de frequência) e o usuário toca em "Salvar", quando o backend confirma a criação do registro, então o usuário retorna à tela de Medicamentos (`/medicines`, tela 3d) e o novo lembrete aparece na lista de doses/estoque sem necessidade de refresh manual (mesmo padrão de invalidação de cache local usado em `examService.ts`/`invalidateExamsCache`).
- **Falha ao salvar (erro de rede/backend):** Dado que todos os campos obrigatórios estão preenchidos e o usuário toca em "Salvar", quando a chamada ao backend falha, então o botão sai do estado de carregamento, uma mensagem de erro específica é exibida, e o usuário permanece na tela `/add-medicine` com os campos já preenchidos preservados para nova tentativa.
- **Voltar sem salvar:** Dado que o usuário toca no botão de voltar (`‹`) no header, quando a ação roda, então o usuário retorna a `/medicines` sem persistir nenhum dado — o Canvas não modela um diálogo de confirmação de descarte para esta tela (diferente do padrão de exclusão em 3g), então nenhuma confirmação é exigida neste EPIC.

## 3. Estrutura da página
- **Header**: botão de voltar (`‹`, 48×48px, borda `#DFE3E1`, bg branco) + título "Novo lembrete" (600 20px) — sem subtítulo, sem badge.
- **Campo "Nome do medicamento"** (label 600 16px `#363D3B` + input altura 52px, radius 14, borda 1.5px `#DFE3E1`, placeholder "Ex.: Losartana").
- **Campo "Dosagem"** (mesmo padrão visual, placeholder "Ex.: 50mg").
- **Seletor "Forma"** (label + linha horizontal com scroll de 4 chips: Comprimido / Gotas / Injeção / Outro; altura 44px, radius 12px; padrão selecionado/não-selecionado de `DESIGN_TOKENS.md` §"Inputs" — seleção única).
- **Lista "Horário(s) da dose"** (label + `sc-for` de linhas: input `hh:mm` (flex 1, altura 52px) + botão remover "×" (48×48px, radius 12px, bg `#F7F8F7`, borda `#DFE3E1`) por item; botão tracejado "+ Adicionar horário" abaixo (altura 48px, borda tracejada 1.5px verde `#10794E`, texto `#0C6341`)).
- **Seletor "Frequência"** (label + coluna de opções, altura 48px cada, radius 12px, padrão chip selecionado/não-selecionado):
  - "Todos os dias".
  - "Dias específicos" — quando selecionado, revela grade de 7 chips de dias da semana (`sc-if freqIsDays`, altura 44px, radius 10px, múltipla seleção via toque individual).
  - "A cada X horas" — quando selecionado, revela linha "A cada [input 64px centralizado] horas" (`sc-if freqIsHours`).
- **Par de campos "Data de início" / "Data de término"** (lado a lado, flex 1 cada, mesmo padrão de input, placeholder "dd/mm/aaaa"; "Data de término" fica com bg dinâmico e `disabled` quando "Sem data de término" está marcado).
- **Checkbox "Sem data de término"** (quadrado 24×24px, radius 7px, borda/bg dinâmicos, marca "✓" branca; texto 400 17px ao lado).
- **Par "Estoque atual" + seletor de unidade** (input numérico flex 1 + 3 chips "comp." / "ml" / "caps." flex 1.4 total, altura 52px, radius 12px, seleção única, mesmo padrão de chip).
- **Campo "Avisar quando restar menos de (opcional)"** (mesmo padrão de input, placeholder "Ex.: 5").
- **Textarea "Observações (opcional)"** (radius 14, borda `#DFE3E1`, 3 rows, `resize:none`, placeholder "Ex.: tomar após as refeições").
- **Linha "Lembretes ativos"** (texto 600 17px à esquerda + 2 chips "Ativos"/"Inativos" à direita, altura 44px, radius 12px, seleção única).
- **Botão primário "Salvar"** (altura 56px, radius 14, bg/texto dinâmicos: verde+branco quando válido, cinza/`#7A8480` quando inválido — `nmSaveBg`/`nmSaveFg`).
- **Barra home-indicator** (130×5px, `#C3C9C6`) — decorativa.

Nota: diferente de `adicionar-documento/spec.md` (3b), o Canvas de 3f não modela nenhum card de preview de arquivo (não há upload de arquivo nesta tela) nem nenhum texto de apoio abaixo do botão desabilitado explicando o motivo — comportamento a decidir em `plan.md` (reaproveitar o padrão já usado em `AddExamScreen.tsx`/1d por consistência de produto, mesmo que ausente no Canvas desta tela específica, é a proposta).

## 4. Mapa de navegação
| Origem | Destino | Trigger |
|---|---|---|
| `/medicines` (3d, botão "+" no header, hoje `onPress={() => {}}` vazio em `MedicinesScreen.tsx`) | `/add-medicine` | Toque no botão "+" — este EPIC deve implementar esse `onPress` (`router.push('/add-medicine')`), que hoje é um gap funcional real, não coberto por nenhum EPIC anterior |
| `/add-medicine` | `/medicines` (volta) | Toque no botão de voltar (`‹`) — `router.back()`, sem confirmação de descarte |
| `/add-medicine` | `/medicines` (volta) | `createMedicineReminder()` bem-sucedido — `router.back()` (ou `router.replace('/medicines')`, decisão de implementação em `plan.md`), lista de medicamentos atualizada com o novo lembrete |
| `/add-medicine` | (permanece na tela) | Falha de validação local (campos obrigatórios faltando, horário duplicado, dias/horas de frequência incompletos) ou erro do backend — mensagem de erro exibida, nenhuma navegação ocorre |

## 5. Mapa de dados
| Campo/estado | Fonte | Observação |
|---|---|---|
| `name` (nome do medicamento) | Input local (`nmName`) | Obrigatório |
| `dosage` | Input local (`nmDose`) | Obrigatório |
| `form` (`comprimido \| gotas \| injecao \| outro`) | Chip único (`formComp`/`formGotas`/`formInj`/`formOutro`) | Obrigatório, seleção única |
| `doseTimes: string[]` (`hh:mm`) | Lista dinâmica local (`nmTimesList`, add/remove) | Obrigatório, mínimo 1 item, sem duplicatas |
| `frequencyType` (`daily \| specific_days \| every_x_hours`) | Chip único (`freqDaily`/`freqDays`/`freqHours`) | Obrigatório |
| `frequencyDays: string[]` (dias da semana, ex.: `['MON','WED','FRI']`) | Grade de 7 chips (`weekDaysList`), visível apenas se `frequencyType === 'specific_days'` | Obrigatório (mín. 1) apenas nesse modo |
| `frequencyEveryHours: number` | Input numérico (`nmEveryHours`), visível apenas se `frequencyType === 'every_x_hours'` | Obrigatório (> 0) apenas nesse modo |
| `startDate` (`YYYY-MM-DD` internamente, exibido `dd/mm/aaaa`) | Input local (`nmStartDate`) | Obrigatório |
| `endDate` | Input local (`nmEndDate`), desabilitado quando `hasNoEndDate` | Opcional quando `hasNoEndDate = true`; a decidir em `plan.md` se obrigatório quando `hasNoEndDate = false` |
| `hasNoEndDate: boolean` | Checkbox local (`toggleNoEndDate`) | Default `false` |
| `currentStock: number` | Input local (`nmStock`) | Obrigatório |
| `stockUnit` (`comprimido \| ml \| capsula`) | Chip único (`unitComp`/`unitMl`/`unitCaps`) | Obrigatório, seleção única |
| `lowStockThreshold?: number` | Input local (`nmLowStock`) | Opcional |
| `notes?: string` | Textarea local (`nmNotes`) | Opcional |
| `isActive: boolean` | Chip único (`activeOn`/`activeOff`) | Default a decidir em `plan.md` (Canvas não indica seleção padrão) |
| Registro persistido | **Proposto**: `client.models.Medicine.create(...)` (Amplify Data) — depende do schema `amplify/data/schemas/medicines.ts`, ver `plan.md` §pendência de schema | Owner-based (`allow.owner()`), seguindo o padrão de `Appointment`/`MedicalDocument` |
| Cache local de medicamentos | **Proposto**: invalidação equivalente a `invalidateExamsCache()` (ex.: `invalidateMedicinesCache()`) após criar, já que `useMedicinesData.ts` hoje consome `medicinesApi.ts` (100% mock) | Garante que `/medicines` mostre o novo lembrete sem refetch manual |

## 6. Requisitos não-funcionais específicos
- **Fidelidade ao Canvas (regra 1 da constituição)**: chips de forma, frequência, unidade e ativo/inativo devem seguir exatamente o padrão de cor selecionado/não-selecionado documentado em `DESIGN_TOKENS.md` §"Inputs" (borda `#10794E` + bg `#E8F5EE` + texto `#0C6341` quando selecionado).
- **Nenhum dado mockado (regra 2 da constituição)**: este EPIC depende da criação do model Amplify `Medicine` (pendência já registrada em `GAP_ANALYSIS.md` linha 71) — enquanto esse model não existir, a persistência real não pode ser implementada; ver pendência de schema em `plan.md`.
- **Botão "Salvar" sempre reflete validade** (mesmo padrão de `adicionar-documento/spec.md`): nunca habilitado incondicionalmente; estado dinâmico via `nmSaveBg`/`nmSaveFg`.
- **Nunca cor sozinha**: todo chip selecionado combina borda + bg + texto, nunca cor isolada — vale para forma, frequência, dias da semana, unidade e ativo/inativo.
- **Validação de horário duplicado é uma regra de negócio nova**, não modelada visualmente no Canvas (sem estado de erro inline por linha de horário) — a mensagem de erro deve seguir o padrão de alerta reativo já usado em `AddExamScreen.tsx` até uma iteração de design futura introduzir feedback inline.
- **Acessibilidade de toque**: todos os chips, inputs, checkbox e botão respeitam o piso de 44-56dp definido em `DESIGN_TOKENS.md` §3 (a grade de dias da semana usa 44px, dentro do mínimo aceitável mas no limite inferior — não reduzir mais).
- **LGPD/dado sensível**: dados de medicamento (nome, dosagem, condição implícita) são dados de saúde — devem seguir o mesmo padrão de autorização `allow.owner()` já usado em `Appointment`/`MedicalDocument`, sem exposição cross-user.
- **Lembretes/notificações reais são NON-GOAL explícito deste EPIC** (ver `plan.md`): o codebase não tem `expo-notifications` instalado (confirmado — nenhuma ocorrência em `package.json` ou `src/`); a tela e o backend salvam a configuração de horários/frequência, mas o disparo real de notificações push/locais é uma pendência técnica separada, documentada e não silenciosamente assumida como funcional.

## 7. Critérios de aceite
- [ ] Tela `/add-medicine` reproduz fielmente a estrutura de 3f: nome, dosagem, forma (4 chips), lista de horários com add/remove, frequência (3 opções com sub-campos condicionais), data de início/término com checkbox "sem data de término", estoque + unidade, limite de estoque baixo opcional, observações opcionais, toggle ativo/inativo, botão "Salvar".
- [ ] Selecionar "Todos os dias" oculta grade de dias da semana e campo de horas; selecionar "Dias específicos" exibe apenas a grade de dias (múltipla seleção); selecionar "A cada X horas" exibe apenas o campo numérico de horas — nunca dois desses blocos visíveis ao mesmo tempo.
- [ ] Adicionar horário cria uma nova linha vazia; remover horário retira a linha; salvar com lista de horários vazia é bloqueado; salvar com horários duplicados (mesmo `hh:mm`) é bloqueado com mensagem clara.
- [ ] Marcar "Sem data de término" desabilita visualmente e libera como não-obrigatório o campo "Data de término"; desmarcar reabilita o campo.
- [ ] Botão "Salvar" fica desabilitado (bg `#DFE3E1`, texto `#7A8480`) enquanto nome, dosagem, forma, ≥1 horário válido sem duplicata, frequência (com sub-requisitos), data de início, estoque atual e unidade não estiverem todos preenchidos; habilita (verde/branco) quando completos.
- [ ] Salvamento bem-sucedido persiste o lembrete via model Amplify `Medicine` (uma vez que o schema da EPIC irmã `03-exames-receitas/medicamentos` seja implementado/reconciliado), invalida o cache local de medicamentos e retorna o usuário a `/medicines` com o novo lembrete visível sem refresh manual.
- [ ] Falha de backend ao salvar exibe mensagem de erro específica, sem perder os campos preenchidos, sem navegar para longe da tela.
- [ ] Botão "+" do header em `MedicinesScreen.tsx` (hoje `onPress={() => {}}`) passa a navegar para `/add-medicine`.
- [ ] Tela funciona em light e dark mode com os pares de cor definidos em `DESIGN_TOKENS.md` (chips selecionados/não-selecionados, botão desabilitado/habilitado, checkbox incluídos).
- [ ] Nenhuma notificação/lembrete push real é prometida ou simulada como funcional nesta tela — copy e comportamento deixam claro (via `plan.md`/documentação de produto) que o disparo de notificações é uma pendência técnica separada.

## 8. Ambiguidades documentadas (regra 8 da constituição)
- **Estado padrão de "Lembretes ativos" ao abrir a tela**: o Canvas não define visualmente qual chip (Ativos/Inativos) vem selecionado por padrão numa tela de criação nova. Interpretação adotada: `isActive = true` (Ativos) por padrão, já que o usuário está criando um lembrete que presumivelmente deveria começar ativo — mais coerente com a expectativa do usuário do que nascer inativo silenciosamente.
- **"Data de término" ao desmarcar "Sem data de término"**: o Canvas não modela um estado de erro para esse campo voltando a ficar vazio após ter sido desabilitado. Interpretação adotada: campo permanece opcional mesmo com o checkbox desmarcado (o usuário pode deixar em aberto uma data de término "a definir depois") — revisitar se o artigo do TCC exigir obrigatoriedade mais estrita.
- **Troca de tipo de frequência descarta dados do modo anterior**: análogo ao caso já registrado em `adicionar-documento/spec.md` para tipo de documento — ao trocar de "Dias específicos" para outro modo, os dias marcados deixam de ser enviados no payload; se o usuário voltar para "Dias específicos" depois, a seleção é perdida (não hidratada de volta). Interpretação adotada por simplicidade de implementação; revisitar se UX real mostrar isso como frustrante.
- **Destino pós-salvamento**: o Canvas não desenha uma tela de confirmação/detalhe pós-criação (diferente de como 3b nomeia conceitualmente "3c" como destino) — assume-se retorno direto a `/medicines` (3d), não a uma tela de detalhe do lembrete recém-criado (que não existe no escopo mapeado do Bloco 3).
