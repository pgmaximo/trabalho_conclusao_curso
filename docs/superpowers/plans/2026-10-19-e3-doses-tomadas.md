# E3 — Adesão: doses tomadas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** uma ferramenta somente leitura, `consultar_doses_tomadas`, que diz quais horários dos remédios em uso foram marcados como tomados (hoje e nos últimos 1 a 30 dias), com a mesma regra de horários da tela, e uma R3 que barra orientação sobre dose esquecida e juízo de adesão.

**Architecture:** a regra de horários esperados vai para um módulo compartilhado (`amplify/functions/medicine-schedule-shared/`), que o app reexporta. A leitura do log passa por uma porta nova de `ownerScopedRead.ts`, que consulta o índice e monta o filtro de dono por dentro. Um módulo puro monta a saída, e a ferramenta é uma casca fina. O prompt troca a frase "não vejo as doses". A R3 ganha três padrões que só reprovam.

**Tech Stack:** TypeScript, Jest (`jest-expo`, `TZ=America/Sao_Paulo`), zod, AWS SDK v3 mockado, AWS CDK (`backend.ts`).

**Spec:** `specs/10-finalizacao-codigo/01-melhorias-ia/E3-doses-tomadas/spec.md` · **Desenho e contratos:** `.../E3-doses-tomadas/plan.md` §3 (tipos, assinaturas, regras e textos fixos; esta lista não os repete).

## Global Constraints

- Branch `sdd-10-finalizacao-codigo`, checkout principal, sem worktree. **Commit só quando o usuário pedir.** Nunca incluir `metro.config.js`, `package.json` ou `package-lock.json` (alheios).
- Textos, comentários e testes em pt-BR. Arquivo novo tem cabeçalho "Resumo do arquivo". Comentário diz o porquê e o risco evitado.
- Toda ferramenta `readOnly: true`, `inputSchema` `.strict()`, dono só da identidade. `backend.ts`: nunca `grantReadWriteData` para o chat.
- Valores fixados: janela padrão **7**, máximo **30** dias; teto de **15** remédios e **14** horários sem marcação por remédio; tolerância de **60** minutos; índice `medicineDoseLogsByMedicineIdAndScheduledDate`; variável `MEDICINE_DOSE_LOG_TABLE_NAME`.
- R3: nenhuma exceção nova para número. Os padrões do E3 só reprovam. Não enfraquecer `TZ` nem os ignores de `.claude/` no `jest.config.js`.
- Mock do SDK nos testes: sem `requireActual`, classes de comando com `input` (padrão de `leituraPublica.test.ts`). Quem exercita a Query acrescenta `QueryCommand` ao mock.
- Gate: `npm run validate`. Teste isolado: `npx jest <caminho>`.

## Review Focus

1. **Virada do dia em Brasília:** às 23:30 de 21/10 em Brasília já é 22/10 em UTC. "Hoje" tem de ser 21/10. Teste na Task 3: `agoraEmSaoPaulo(new Date('2026-10-22T02:30:00Z'))` → `{ data: '2026-10-21', minutos: 1410 }`.
2. **`EVERY_X_HOURS` que não divide 24** (10 em 10 horas desde 06:00): os horários mudam de um dia para o outro. Uma marcação às 02:00 do segundo dia é `marcado`, não "fora do horário". Teste na Task 3.
3. **Marcado antes da hora:** marcação das 20:00 de hoje, e agora são 15h → `marcado`, não `pendente`. Teste na Task 3.
4. **Horário ilegível no cadastro** (`times: ['8:00']`, dado legado): nunca vira `sem marcação` (como `isDoseLate` devolve falso), fica `pendente`, e nada lança. Teste na Task 3.
5. **Filtro que casa mais de um** ("losartana" com "Losartana 50mg" e "Losartana 25mg"): os dois voltam. Teste na Task 3.

---

### Task 0: Linha de base

- [ ] **Step 1:** `npm run validate` → anotar o exit code, as suítes e os testes em `tasks.md` (T0). Anotar também o tempo de `npx jest amplify/functions/ai-language-rules` (linha "Time:").
- [ ] **Step 2:** `git status --short` → só os três alheios e os docs do E3.

### Task 1: Horários esperados num módulo compartilhado

**Files:**
- Create: `amplify/functions/medicine-schedule-shared/doseSchedule.ts`
- Create: `amplify/functions/medicine-schedule-shared/__tests__/moduloCompartilhado.test.ts`
- Modify: `src/utils/medicineSchedule.ts`

**Interfaces:**
- Produces: `RemedioComAgenda`, `LATE_DOSE_TOLERANCE_MINUTES`, `minutesFromTime`, `isMedicineScheduledOnDate`, `getMedicineDoseTimesForDate` (plan.md §3).

- [ ] **Step 1: Teste que falha** (`moduloCompartilhado.test.ts`, no padrão de `drug-interactions-shared/__tests__/moduloCompartilhado.test.ts`):
  - `doseSchedule.ts` não casa `/from\s+['"](@\/|react|react-native)/`;
  - `require('../../../../src/utils/medicineSchedule')` expõe `isMedicineScheduledOnDate`, `getMedicineDoseTimesForDate`, `minutesFromTime` e `LATE_DOSE_TOLERANCE_MINUTES` **idênticos** (`toBe`) aos do módulo;
  - o fonte não usa `getDay(` e usa `getUTCDay(`; um remédio `SPECIFIC_DAYS` `['MON']` está agendado em `'2026-09-07'` (segunda) e não em `'2026-09-06'` (domingo); `['SUN']`, o contrário;
  - `getMedicineDoseTimesForDate` aceita `weekDays: null` e `endDate: undefined` sem lançar.
- [ ] **Step 2:** `npx jest amplify/functions/medicine-schedule-shared` → FAIL (módulo inexistente).
- [ ] **Step 3:** mover o corpo de `src/utils/medicineSchedule.ts` (`minutesFromTime`, `daysBetween`, as duas funções, a constante) para `doseSchedule.ts`, exportando `minutesFromTime`; `weekDays ?? []`; dia da semana por `getUTCDay()` sobre `${date}T00:00:00Z`. Em `src/utils/medicineSchedule.ts`: `export { ... } from '../../amplify/functions/medicine-schedule-shared/doseSchedule'`, e `isDoseLate` passa a usar o `minutesFromTime` e a constante importados. Comentário de uma linha apontando a fonte única (como `drugInteractionService.ts`).
- [ ] **Step 4:** `npx jest amplify/functions/medicine-schedule-shared __tests__/medicine-schedule.test.ts` → PASS, sem mudar o teste do app (CA-1, CA-2). `npm run typecheck` → limpo.

### Task 2: Porta de leitura por índice

**Files:**
- Modify: `amplify/functions/chat-assistant/tools/ownerScopedRead.ts` (import de `QueryCommand`; bloco novo depois de `lerDoDono`; cabeçalho ganha um parágrafo: a segunda porta pessoal e por que ela não é um modo de `lerDoDono`)
- Create: `amplify/functions/chat-assistant/__tests__/leituraPorIndice.test.ts`

**Interfaces:**
- Produces: `INDICES_DO_DONO`, `lerDoDonoPorIndice(indice, valorDaChave, intervalo, identity): Promise<LinhaDoBanco[]>` (plan.md §3).

- [ ] **Step 1: Testes que falham** (mock com `QueryCommand` e `ScanCommand` herdando de `Comando`; `process.env.MEDICINE_DOSE_LOG_TABLE_NAME = 't-dose'`; identidade `s-1::u-1`):
  - uma chamada `lerDoDonoPorIndice('DOSES_POR_REMEDIO', 'med-1', { de: '2026-10-15', ate: '2026-10-21' }, IDENTIDADE)` envia **um** `QueryCommand` com `TableName: 't-dose'`, `IndexName: 'medicineDoseLogsByMedicineIdAndScheduledDate'`, `KeyConditionExpression: '#chave = :chave AND #ordem BETWEEN :de AND :ate'`, `FilterExpression: '#owner = :owner'`, `ExpressionAttributeNames: { '#owner': 'owner', '#chave': 'medicineId', '#ordem': 'scheduledDate' }`, `ExpressionAttributeValues: { ':owner': 's-1::u-1', ':chave': 'med-1', ':de': '2026-10-15', ':ate': '2026-10-21' }`; nenhum `ScanCommand`;
  - devolve os `Items` das páginas juntos; com `LastEvaluatedKey` sempre presente, para em 10 envios;
  - `'toString'` e `'UserProfile'` (com `as never`) → rejeita com `/lista/`, sem envio;
  - sem a variável de ambiente → rejeita `'Nome de tabela nao configurado.'`;
  - `INDICES_DO_DONO` tem exatamente a chave `DOSES_POR_REMEDIO`.
- [ ] **Step 2:** `npx jest .../leituraPorIndice.test.ts` → FAIL (função inexistente).
- [ ] **Step 3:** implementar conforme plan.md §3, reaproveitando `MAX_PAGINAS`.
- [ ] **Step 4:** `npx jest amplify/functions/chat-assistant/__tests__/leituraPorIndice.test.ts amplify/functions/chat-assistant/__tests__/leituraPublica.test.ts amplify/functions/chat-assistant/__tests__/tools.test.ts` → PASS.

### Task 3: Saída das doses, pura

**Files:**
- Create: `amplify/functions/chat-assistant/tools/dosesTomadasSaida.ts`
- Create: `amplify/functions/chat-assistant/__tests__/dosesTomadasSaida.test.ts`

**Interfaces:**
- Consumes: Task 1 (horários); `texto`, `LinhaDoBanco` (`ownerScopedRead.ts`); `partesEmSaoPaulo` (`formatoPtBr.ts`); `normalizeDrugName` (`drug-interactions-shared/normalizeDrugName.ts`).
- Produces: as constantes, os tipos e as funções de plan.md §3 (`agoraEmSaoPaulo`, `periodoDe`, `escolherRemedios`, `montarSaida`).

- [ ] **Step 1: Testes que falham.** Helpers: `remedio(campos)` com `id: 'med-1'`, `name: 'Losartana'`, `times: ['08:00', '20:00']`, `frequencyType: 'DAILY'`, `startDate: '2026-10-01'`, `active: true`; `marca(data, horario)` → `{ medicineId, scheduledDate, scheduledTime, owner }`; `AGORA = { data: '2026-10-21', minutos: 15 * 60 }`; `montar(remedios, marcacoes, agora = AGORA, dias = 7, filtro?)`, que chama `periodoDe`, `escolherRemedios` e `montarSaida`.
  - **CA-3:** marcação 21/10 08:00 → `hoje` = `[{08:00, 'marcado'}, {20:00, 'pendente'}]`.
  - **CA-4:** sem marcação: com `minutos` 9·60+1, `08:00` é `'sem marcação'`; com 9·60, `'pendente'`.
  - **CA-5:** `takenToday: '{"date":"2026-10-21","times":["08:00"]}'` → `08:00 marcado`; com `date` 20/10, malformado (`'{'`) ou ausente → não marca; o `takenToday` de hoje não marca o 20/10.
  - **CA-6:** marcações em todos os horários de 15 a 21/10, menos 17/10 20:00 e 19/10 08:00, e sem 21/10 20:00 → `semMarcacao` = `[{ data: '2026-10-19', diaDaSemana: 'segunda', horario: '08:00' }, { data: '2026-10-17', diaDaSemana: 'sábado', horario: '20:00' }]`; `contagem` = `{ horariosEsperados: 14, marcados: 11, semMarcacao: 2, pendentes: 1 }`.
  - **CA-7:** `SPECIFIC_DAYS` `['MON','THU']` às 09:00, 7 dias até 21/10 → esperados só 15/10 (quinta) e 19/10 (segunda); `EVERY_X_HOURS` 8, `times: ['06:00']` → hoje `06:00`, `14:00`, `22:00`; `endDate: '2026-10-18'` → nada depois de 18/10 e `termino: '2026-10-18'`; `endDate` fora do período → `termino: null`; `active: false` → fora da saída.
  - **CA-8:** filtro `'LOSÁRTANA'` casa `'Losartana 50mg'`; `'atenolol'` → `{ naoEncontrado: true, medicamentos: [], nomesEmUso: ['Losartana'] }`, com explicação "Nenhum remédio em uso tem esse nome."; Review Focus 5: dois remédios Losartana voltam os dois.
  - **CA-9:** remédio sem marcação nenhuma → explicação "Não há nenhum horário marcado como tomado no aplicativo neste período."; sem remédio em uso → `disponivel: false` e "O usuário não tem remédio em uso cadastrado no aplicativo.".
  - **CA-10:** marcação 15/10 07:00 → `marcacoesForaDoHorarioAtual: 1`, não conta em `marcados`, e a explicação contém "Os dias anteriores são contados com os horários cadastrados hoje.".
  - **CA-11:** 20 remédios → 15 em ordem de nome e `omitidos: 5`; um remédio às 08:00 com `startDate: '2026-09-01'`, 30 dias e nenhuma marcação → 30 horários sem marcação (22/09 a 21/10; o de hoje já passou da tolerância às 15h), 14 em `semMarcacao`, do 21/10 ao 08/10, e `semMarcacaoOmitidos: 16`.
  - **CA-12:** varredura recursiva das chaves da saída não acha `id`, `medicineId`, `owner`, `takenAt`, `stockAdjusted`, `dosage`, `doseRegistrada`, `currentStock`, nem chave casando `/adesao|emDia|percent|atrasad/i`.
  - **CA-13:** `periodoDe(AGORA, 1)` → `{ de: '2026-10-21', ate: '2026-10-21', dias: 1 }`; `periodoDe(AGORA, 7).de` → `'2026-10-15'`; `periodoDe({ data: '2026-03-02', … }, 3).de` → `'2026-02-28'`; remédio com `startDate: '2026-10-19'` não tem horário antes de 19/10; remédio com `startDate` futura não é escolhido.
  - **Review Focus 1, 2, 3 e 4:** os quatro testes descritos no topo do plano.
- [ ] **Step 2:** `npx jest .../dosesTomadasSaida.test.ts` → FAIL (módulo inexistente).
- [ ] **Step 3:** implementar conforme plan.md §3. Comentários: por que horários e não doses (D3.3), por que `takenToday` só hoje (D3.1), por que a tolerância é a da tela, por que a marcação fora do horário é contada e não descartada, por que os tetos e as contagens.
- [ ] **Step 4:** `npx jest .../dosesTomadasSaida.test.ts` → PASS.

### Task 4: Ferramenta, registro e infraestrutura

**Files:**
- Create: `amplify/functions/chat-assistant/tools/dosesTomadas.ts`
- Modify: `amplify/functions/chat-assistant/tools/index.ts` (import e posição depois de `medicamentosTool`, com comentário de vizinhança como o do E9)
- Modify: `amplify/backend.ts` (`const medicineDoseLogTable = backend.data.resources.tables['MedicineDoseLog']`; entra no laço do chat com comentário; `addEnvironment('MEDICINE_DOSE_LOG_TABLE_NAME', …)`; `chatAssistantLambda.addToRolePolicy` só com `dynamodb:Query` em `${medicineDoseLogTable.tableArn}/index/*`, com o comentário do porquê)
- Create: `amplify/functions/chat-assistant/__tests__/dosesTomadasTool.test.ts`
- Create: `amplify/functions/chat-assistant/__tests__/infraDoses.test.ts`
- Modify: `amplify/functions/chat-assistant/__tests__/tools.test.ts`

**Interfaces:**
- Consumes: `lerDoDono`, `lerDoDonoPorIndice` (Task 2); `agoraEmSaoPaulo`, `periodoDe`, `escolherRemedios`, `montarSaida`, `DIAS_PADRAO`, `SaidaDasDoses` (Task 3).
- Produces: `dosesTomadasTool: ChatTool` (`name: 'consultar_doses_tomadas'`, descrição e degradado de plan.md §3).

- [ ] **Step 1: Testes que falham.**
  - `dosesTomadasTool.test.ts` (mock com `ScanCommand` e `QueryCommand`; `mockSend` responde por `constructor.name`; `jest.useFakeTimers().setSystemTime(new Date('2026-10-21T18:00:00Z'))`, ou seja, 15h em Brasília):
    - **CA-14:** `runTool('consultar_doses_tomadas', x, IDENTIDADE)` com `x` em `{ owner: 'v' }`, `{ medicineId: 'm' }`, `{ dias: 0 }`, `{ dias: 31 }`, `{ dias: 2.5 }`, `{ medicamento: '' }` e `{ medicamento: 'a'.repeat(81) }` → `{ erro }` e nenhum envio; a ferramenta está em `CHAT_TOOLS` logo depois de `consultar_medicamentos`;
    - **CA-15:** dois remédios em uso e um com `active: false` → exatamente dois `QueryCommand`, com `:chave` `med-1` e `med-2`, `:de '2026-10-15'` e `:ate '2026-10-21'`; com `{ dias: 30 }`, `:de '2026-09-22'`; as duas consultas são disparadas antes de qualquer uma resolver (o `mockSend` da Query devolve uma promessa que só resolve depois que as duas chamadas foram feitas);
    - **CA-18:** a Query rejeita → `runTool` devolve `{ erro: 'Não foi possível consultar esse dado agora.' }`;
    - **CA-20:** `renderDegraded` de uma saída com hoje `[08:00 marcado, 20:00 pendente]` e `contagem.semMarcacao: 3` → linha `'Losartana · hoje: 08:00 marcado, 20:00 pendente · sem marcação no período: 3 horários'`; com 1 → `'1 horário'`; o texto não casa `/dose/i`; `buildDegradedAnswer([{ name: 'consultar_doses_tomadas', output }])` passa por `checkLanguageRules` com `questionKind` `'clinica'` e `'operacional'`; saída sem remédio → `null`.
  - `tools.test.ts`: `MEDICINE_DOSE_LOG_TABLE_NAME: 't-dose'` em `TABELAS`; `QueryCommand` no mock; teste novo "a leitura por índice também filtra pelo dono do token (E3)": `mockSend` devolve um remédio em uso no Scan e `[]` na Query; todo `QueryCommand` enviado tem `FilterExpression '#owner = :owner'` e `':owner': 's-1::u-1'`; e `consultar_doses_tomadas` está logo depois de `consultar_medicamentos`.
  - `infraDoses.test.ts` (padrão de `infraVacinacao.test.ts`): `medicineDoseLogTable` está no laço de `grantReadData` do chat; `addEnvironment('MEDICINE_DOSE_LOG_TABLE_NAME'`; existe `actions: ['dynamodb:Query']` com `` `${medicineDoseLogTable.tableArn}/index/*` ``; nenhum `grant(ReadWrite|Write)Data(chatAssistantLambda`.
- [ ] **Step 2:** `npx jest .../dosesTomadasTool.test.ts .../tools.test.ts .../infraDoses.test.ts` → FAIL (ferramenta inexistente; tabela fora do backend).
- [ ] **Step 3:** implementar a ferramenta, o registro e o `backend.ts` conforme plan.md §3.
- [ ] **Step 4:** `npx jest amplify/functions/chat-assistant` → PASS, a suíte do chat inteira (inclui "toda tool responde lista vazia sem erro" e "toda descrição diz o que NÃO faz"). `npm run typecheck:backend` → limpo.

### Task 5: Prompt

**Files:**
- Modify: `amplify/functions/chat-assistant/chatPrompt.ts`
- Modify: `amplify/functions/chat-assistant/__tests__/chatPrompt.test.ts`

**Interfaces:**
- Consumes: o nome `consultar_doses_tomadas` e os campos `hoje`, `semMarcacao`, `marcacoesForaDoHorarioAtual` (Task 3).

- [ ] **Step 1: Testes que falham** (`describe('o prompt do E3')`): `SYSTEM_PROMPT` não contém `'você ainda não vê as doses marcadas'`; contém `consultar_doses_tomadas` e `consultar_medicamentos` na mesma instrução; contém, por trecho: `'nunca em número de doses'`, `'não quer dizer que a pessoa não tomou'`, `'tela de Medicamentos'`, `'Pendente'`, `'marcacoesForaDoHorarioAtual'`, `'médico ou o farmacêutico'`, e a proibição de juízo (`'certo, em dia ou atrasada'`).
- [ ] **Step 2:** `npx jest .../chatPrompt.test.ts` → FAIL nos novos.
- [ ] **Step 3:** no item de medicamentos, trocar a última frase por "Se perguntarem se tomaram, use consultar_doses_tomadas." e acrescentar, logo depois do item de interações, um item com este texto:
  "- Para saber o que a pessoa marcou como tomado, use consultar_doses_tomadas; consultar_medicamentos só lista o cadastro. Fale em horários, nunca em número de doses ("ficou sem marcação o horário das 8h de segunda"). Sem marcação não quer dizer que a pessoa não tomou: ela pode ter tomado e não marcado; diga que dá para marcar na tela de Medicamentos. Pendente é horário que ainda não passou. Se marcacoesForaDoHorarioAtual for maior que zero, diga que os dias anteriores são contados com os horários cadastrados hoje. Se houver semMarcacaoOmitidos ou omitidos, diga quantos ficaram de fora. Nunca diga se a pessoa está tomando certo, em dia ou atrasada, e nunca diga o que fazer com um horário esquecido, nem tomar depois, compensar, dobrar, pular ou mudar o horário: quem orienta isso é o médico ou o farmacêutico. Para mudar um horário no aplicativo, diga que dá para editar o remédio na tela de Medicamentos."
- [ ] **Step 4:** `npx jest .../chatPrompt.test.ts .../mapaDoApp.test.ts` → PASS.

### Task 6: Reforço da R3 para adesão (D3.4)

**Files:**
- Modify: `amplify/functions/ai-language-rules/languageRules.ts` (três entradas em `PADROES_R3`, depois da de vacina; `COISAS_DO_APLICATIVO`)
- Modify: `amplify/functions/ai-language-rules/__tests__/adversarial.test.ts`

**Interfaces:**
- Consumes: `janela`, `FORA_DO_REMEDIO`, `INI_R3`, `FIM_R3`, `DETERMINANTE`, `VERBO_DE_ESTADO`, `RECUSA_PERGUNTA_OU_CONDICAO`, `RECUSA_OU_PERGUNTA`, `DEVOLVE_A_DECISAO` (todos já existem no arquivo).

- [ ] **Step 1: Testes que falham** (`describe('adesão: dose esquecida, horário e juízo (E3, D3.4)')`, `describe.each(TIPOS)` como o do E9):
  - `it.each` das frases do CA-23 → `r.ok === false`, regras `['R3']`. Motivo `/esquecida|horário/` para "compensar", "Compense", "Não dobre", "Pule", "Mude o horário", "adiantar" e "Tome as duas doses agora."; `/direito/` para "direitinho", "certinho", "adesão", "em dia", "atrasado"; `/não tomou/` para "esqueceu" e "não tomou". "Ficaram 2 doses sem marcação." → R3 (qualquer motivo).
  - `it.each` das frases do CA-22 → `{ ok: true }` (com o sufixo de encaminhamento do `TIPOS` na pergunta clínica).
  - Mais dois que passam: "A dose de reforço da vacina está registrada para 10/03/2034." e "Você tem 2 medicamentos cadastrados." (vizinhos do E8 e do E2).
- [ ] **Step 2:** `npx jest amplify/functions/ai-language-rules/__tests__/adversarial.test.ts -t "E3"` → FAIL nas barradas (hoje passam) e em "Você tem 3 horários sem marcação" (hoje barrada).
- [ ] **Step 3:** implementar os três padrões e o inventário conforme a tabela de plan.md §3. Comentário de cada padrão no estilo dos do E7 a E9: a frase medida que passava, por que a exceção escolhida, por que vem antes do padrão de verbo.
- [ ] **Step 4:** `npx jest amplify/functions/ai-language-rules amplify/functions/chat-assistant` → PASS (CA-24). Comparar o "Time:" da suíte de regras com o da T0 e anotar em `tasks.md`. Se uma frase de outro épico cair, **parar** e relatar ao usuário, sem afrouxar o padrão.

### Task 7: Gate e documentação

- [ ] **Step 1:** `npm run validate` → exit 0. Colar suítes, testes e avisos em `tasks.md` (CA-25).
- [ ] **Step 2:** marcar T0 a T7 em `tasks.md` com o que cada uma provou (vermelho antes, verde depois). Atualizar o Estado de `spec.md`, `plan.md` e `tasks.md`, a linha do E3 em `01-melhorias-ia/README.md` ("Em implementação" → depois do review, "Concluído") e `decisoes/README.md`. Criar `plan.md` §9 com todo desvio de execução (ou "nenhum").
- [ ] **Step 3:** `git status --short` → só arquivos do E3 e os três alheios. Sem commit.
