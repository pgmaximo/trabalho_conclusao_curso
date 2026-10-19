# E5 — Agenda e vacinas: campos faltantes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `consultar_consultas` e `consultar_vacinas` devolvem os campos que o app já grava (observações; lote, fabricante, observações, intervalo, campanha, série) e um reforço previsto calculado só com o intervalo registrado, com teto de itens.

**Architecture:** um corte de observação compartilhado (`tools/observacao.ts`); consultas mudam no próprio arquivo; vacinas ganham um módulo puro de saída (`tools/vacinasSaida.ts`) e a ferramenta vira casca fina. O prompt ganha um item; as regras de linguagem só ganham testes.

**Tech Stack:** TypeScript, Jest (`jest-expo`, `TZ=America/Sao_Paulo`), zod, AWS SDK v3 mockado.

**Spec:** `specs/10-finalizacao-codigo/01-melhorias-ia/E5-agenda-e-vacinas/spec.md` · **Desenho:** `.../E5-agenda-e-vacinas/plan.md` (contratos na seção 3).

## Global Constraints

- Branch `sdd-10-finalizacao-codigo`, checkout principal, sem worktree. **Commit só quando o usuário pedir.** Nunca incluir `metro.config.js`, `package.json`, `package-lock.json` (alheios).
- Textos, comentários e testes em pt-BR; cabeçalho "Resumo do arquivo" em arquivo novo; comentário diz o porquê.
- Nenhuma mudança em `languageRules.ts`, schema, `backend.ts`, `tools/index.ts`, `ownerScopedRead.ts`.
- Valores pinados: observação até **300** caracteres; consultas **20** futuras + **20** passadas; vacinas **30** aplicadas + **30** pendentes.
- Gate: `npm run validate`. Teste de chat isolado: `npx jest amplify/functions/chat-assistant/__tests__/<arquivo>`.

## Review Focus

1. Duas doses aplicadas da mesma vacina com a mesma `appliedDate`, só uma com intervalo → o resultado não pode depender da ordem do banco. Regra: empate de data se desfaz pelo maior `doseNumber`. Teste na Task 3 inverte a ordem das linhas e espera a mesma saída.
2. `appliedDate` com hora (`"2024-03-10T00:00:00.000Z"`, dado legado) → não é `AAAA-MM-DD`; não gera reforço e não quebra. Teste na Task 3.
3. Observação só com espaços → `texto()` já devolve `null`; teste na Task 1 confirma `observacoes: null`.
4. Consulta sem `scheduledAt` (`quando: null`) → hoje cai em `passadas` (string vazia); o teto não pode descartá-la antes das datadas mais recentes por engano. Teste na Task 2: com 21 passadas, uma delas sem data, a sem data é a cortada (ordem crescente, `''` primeiro, `slice(-20)`).
5. Dose com `isCampaign: "true"` (texto, não booleano) → `fazParteDeCampanha: false`. Teste na Task 3.

---

### Task 1: Corte de observação compartilhado

**Files:**
- Create: `amplify/functions/chat-assistant/tools/observacao.ts`
- Modify: `amplify/functions/chat-assistant/tools/medicamentosSaida.ts:21,109-116`
- Test: `amplify/functions/chat-assistant/__tests__/observacao.test.ts`

**Interfaces:**
- Produces: `MAX_CARACTERES_OBSERVACAO = 300`; `observacaoComTeto(valor: unknown): { observacoes: string | null; observacoesCortadas: boolean }`.

- [ ] **Step 1: Teste que falha** (`observacao.test.ts`): `observacaoComTeto('jejum de 12 horas')` → `{ observacoes: 'jejum de 12 horas', observacoesCortadas: false }`; `observacaoComTeto(undefined)` e `observacaoComTeto('   ')` → `{ observacoes: null, observacoesCortadas: false }`; `'a'.repeat(301)` → 300 caracteres e `true`; exatamente 300 → `false`; `MAX_CARACTERES_OBSERVACAO === 300`.
- [ ] **Step 2:** `npx jest .../__tests__/observacao.test.ts` → FAIL (módulo inexistente).
- [ ] **Step 3:** criar `observacao.ts` movendo o corpo de `medicamentosSaida.ts:109-116` (usa `texto` de `ownerScopedRead`). Em `medicamentosSaida.ts`: apagar a função e a constante locais, `import { observacaoComTeto } from './observacao'` e `export { MAX_CARACTERES_OBSERVACAO } from './observacao'`.
- [ ] **Step 4:** `npx jest .../__tests__/observacao.test.ts .../__tests__/medicamentosTool.test.ts` → PASS, sem mudar o teste do E2 (CA-3).

### Task 2: Consultas com observações e teto

**Files:**
- Modify: `amplify/functions/chat-assistant/tools/consultas.ts`
- Test: `amplify/functions/chat-assistant/__tests__/consultasTool.test.ts`

**Interfaces:**
- Consumes: `observacaoComTeto` (Task 1).
- Produces: `MAX_CONSULTAS_POR_LISTA = 20`; saída `{ disponivel, futuras, passadas, proxima, omitidas, explicacao? }`, itens com `observacoes`, `observacoesCortadas`.

- [ ] **Step 1: Testes que falham**, novo `describe('consultar_consultas: observações e teto (E5)')`, relógio `2026-10-18T11:00:00Z`, linhas com o helper `consulta()` estendido para aceitar `observations`:
  - com observação `'jejum de 12 horas, levar exames antigos'` → item com esse texto e `observacoesCortadas: false`; sem → `null`/`false` (CA-1);
  - 800 caracteres → 300 e `true` (CA-2);
  - 25 futuras (`2026-10-19T08:00`…) e 30 passadas → `futuras.length 20` começando pela mais próxima, `passadas.length 20` terminando pela mais recente, `omitidas 15`, `proxima` = a mais próxima (CA-4);
  - Review Focus 4: 21 passadas, uma sem `scheduledAt` → a sem data é a cortada;
  - `renderDegraded` de uma saída com observação não contém o texto da observação (CA-6).
  - Atualizar `'a forma da saida nao muda'`: chaves `['disponivel','futuras','omitidas','passadas','proxima']` e, vazia, mais `'explicacao'`; vazia tem `omitidas: 0` (CA-5).
- [ ] **Step 2:** `npx jest .../consultasTool.test.ts` → FAIL nos novos; os 6 do E1 continuam verdes.
- [ ] **Step 3:** em `consultas.ts`: `...observacaoComTeto(c.observations)` no item; `futuras.slice(0, MAX_CONSULTAS_POR_LISTA)`, `passadas.slice(-MAX_CONSULTAS_POR_LISTA)`; `omitidas` = diferença somada; `proxima` continua `futuras[0]` (antes do corte, é o mesmo). Comentário no teto: por que existe (custo por observação) e por que a contagem vai junto.
- [ ] **Step 4:** `npx jest .../consultasTool.test.ts` → PASS.

### Task 3: Saída das vacinas e reforço previsto

**Files:**
- Create: `amplify/functions/chat-assistant/tools/vacinasSaida.ts`
- Test: `amplify/functions/chat-assistant/__tests__/vacinasSaida.test.ts`

**Interfaces:**
- Consumes: `observacaoComTeto` (Task 1); `texto`, `LinhaDoBanco` (`ownerScopedRead.ts`); `numero` (`linhasDeResultado.ts`).
- Produces: os tipos e as funções de `plan.md` §3 — `MAX_DOSES_POR_LISTA = 30`, `DoseParaOModelo`, `ReforcoPrevisto`, `SaidaDasVacinas`, `somarAnos`, `reforcosPrevistos`, `montarSaida`.

- [ ] **Step 1: Testes que falham** (puros, sem mock), helper `dose(campos)` com `name: 'Dupla adulto (dT)'`:
  - `somarAnos('2024-03-10', 10)` → `'2034-03-10'`; `somarAnos('2028-02-29', 1)` → `'2029-03-01'` (CA-13); `somarAnos('2026-02-30', 1)`, `somarAnos('2024-03-10T00:00:00.000Z', 1)` e `somarAnos('', 1)` → `null`. O módulo não usa getters locais de `Date` (leitura do fonte: sem `getFullYear(`/`getMonth(`/`getDate(`/`setFullYear(`).
  - **CA-9:** doses 1, 2, 3 de dT aplicadas em 2004-01-10, 2004-03-10, 2024-03-10, a 3ª com `recommendedIntervalYears: 10` → `[{ vacina: 'Dupla adulto (dT)', ultimaDoseEm: '2024-03-10', intervaloAnos: 10, previstoPara: '2034-03-10' }]`. Intervalo só na 1ª → `[]`.
  - **CA-10:** mesma dT + uma dose sem `appliedDate` → `[]`.
  - **CA-11:** intervalo ausente, `0`, `-5`, `2.5`, `'10'` → `[]`; última `appliedDate` `'2026-02-30'` → `[]`.
  - **CA-12:** legado `'Febre amarela'` com intervalo + legado `'Hepatite B'` pendente → reforço de febre amarela continua; `catalogId: 'dt'` aplicada com intervalo + legado `'Dupla adulto (dT)'` pendente → reforço de `dt` continua (grupos diferentes).
  - **Review Focus 1:** duas doses na mesma data, `doseNumber` 2 (sem intervalo) e 3 (com intervalo 10) → reforço sai; com as linhas invertidas, a mesma saída.
  - **Review Focus 2:** dose aplicada com `appliedDate: '2024-03-10T00:00:00.000Z'` e intervalo → `[]`, sem exceção.
  - `montarSaida`: **CA-7** dose completa (`lot`, `manufacturer`, `notes`, `recommendedIntervalYears`, `isCampaign: true`, `seriesTotal: 3`) → campos `lote`, `fabricante`, `observacoes`, `observacoesCortadas`, `intervaloDeReforcoAnos`, `fazParteDeCampanha: true`, `totalDeDosesDaSerie: 3`; **CA-8** legado só `name` + `appliedDate` → novos `null`, `fazParteDeCampanha: false`, `observacoesCortadas: false`; **Review Focus 5** `isCampaign: 'true'` → `false`.
  - **CA-14:** 35 aplicadas (datas distintas) + 33 pendentes → 30 aplicadas da mais recente à mais antiga, 30 pendentes da `previstaPara` mais próxima (sem data por último), `omitidas: 8`; uma dT cuja última dose aplicada fica fora do teto ainda gera reforço.
  - **CA-15:** chaves de `montarSaida([])` = `['aplicadas','disponivel','explicacao','omitidas','recomendadasNaoAplicadas','reforcosPrevistos']`, `disponivel: false`, explicação `'O usuário não registrou nenhuma dose de vacina no aplicativo.'` (texto de hoje).
- [ ] **Step 2:** `npx jest .../vacinasSaida.test.ts` → FAIL (módulo inexistente).
- [ ] **Step 3:** implementar `vacinasSaida.ts` com as regras de `plan.md` §3. Desempate da "última dose": maior `appliedDate` (texto), depois maior `doseNumber`. Comentários: por que por vacina e da última dose (três datas erradas da dT), por que só o intervalo registrado (D5.1), por que UTC (igual a `addYearsToDate`), por que o reforço vem antes do teto.
- [ ] **Step 4:** `npx jest .../vacinasSaida.test.ts` → PASS.

### Task 4: Ferramenta de vacinas usa a saída nova

**Files:**
- Modify: `amplify/functions/chat-assistant/tools/vacinas.ts`
- Test: `amplify/functions/chat-assistant/__tests__/vacinasTool.test.ts` (novo, mock do DynamoDB como `consultasTool.test.ts`, `VACCINE_DOSE_TABLE_NAME: 't-vacinas'`)

**Interfaces:**
- Consumes: `montarSaida`, `DoseParaOModelo` (Task 3).

- [ ] **Step 1: Testes que falham:** `vacinasTool.run({}, IDENTIDADE)` com uma dose completa devolve `aplicadas[0].lote === 'AB123'` e `reforcosPrevistos` presente; com `Items: []`, `disponivel: false`; `renderDegraded` com dose com `notes` e `lot` → as linhas são `['Influenza (gripe) · 1a dose · 2026-04-01']`, sem lote nem observação (degradado igual ao de hoje).
- [ ] **Step 2:** `npx jest .../vacinasTool.test.ts` → FAIL (falta `reforcosPrevistos`/`lote`).
- [ ] **Step 3:** `run` = `montarSaida(await lerDoDono(process.env.VACCINE_DOSE_TABLE_NAME, identity))`; tipo `DoseParaOModelo` importado; descrição da ferramenta acrescenta "lote, fabricante e o reforço previsto pelo registro" mantendo os três "NÃO".
- [ ] **Step 4:** `npx jest amplify/functions/chat-assistant` → PASS (inclui `tools.test.ts`, CA-19).

### Task 5: Prompt

**Files:**
- Modify: `amplify/functions/chat-assistant/chatPrompt.ts` (novo item em "Como você trabalha", logo depois do de `consultar_campanhas`)
- Test: `amplify/functions/chat-assistant/__tests__/chatPrompt.test.ts`

- [ ] **Step 1: Teste que falha**, `describe('agenda e vacinas (E5)')`: `SYSTEM_PROMPT` contém `'observacoes é o que a própria pessoa anotou'`, `'observacoesCortadas'`, `'reforcosPrevistos'`, `'sem calcular nem estimar'` e `'a unidade de saúde confirma'` (CA-16).
- [ ] **Step 2:** `npx jest .../chatPrompt.test.ts` → FAIL.
- [ ] **Step 3:** item, texto exato:
  `- Em consultar_consultas e consultar_vacinas, observacoes é o que a própria pessoa anotou: diga que é a anotação dela, sem completar nem interpretar; se observacoesCortadas for verdadeiro, diga que é um trecho e que o texto inteiro está na Agenda ou na Carteira de vacinação. O próximo reforço só sai de reforcosPrevistos ou de uma dose em recomendadasNaoAplicadas: diga a data como prevista pelo registro e que a unidade de saúde confirma; sem nenhum dos dois, diga que não há data de reforço registrada, sem calcular nem estimar. Se houver omitidas, diga quantos itens ficaram de fora.`
- [ ] **Step 4:** `npx jest .../chatPrompt.test.ts .../mapaDoApp.test.ts` → PASS ("Agenda" e "Carteira de vacinação" são nomes do mapa; o teste de "tela de X" não é afetado).

### Task 6: Regras de linguagem (só teste)

**Files:**
- Test: `amplify/functions/ai-language-rules/__tests__/adversarial.test.ts` (novo `describe('E5: observação, lote e reforço')` no fim, no estilo do bloco do E1)

- [ ] **Step 1:** operacional (`temOrigem: false`) **aprova** (CA-17): `'Você anotou para essa consulta: jejum de 12 horas e levar os exames antigos.'`, `'O lote da sua dose é AB123, do fabricante Butantan.'`, `'Pelo seu registro, o próximo reforço da dT está previsto para 10/03/2034. Confirme na unidade de saúde.'`, `'Não há data de reforço registrada no aplicativo. A unidade de saúde confirma.'`. **Reprova** com `rule: 'R3'` (CA-18): `'Sua anotação diz: tomar 2 comprimidos de buscopan antes do exame.'`, `'Você deve tomar o reforço da dT agora.'`.
- [ ] **Step 2:** `npx jest amplify/functions/ai-language-rules` → PASS. Se alguma frase não se comportar como acima: **parar e relatar**, sem mexer em `languageRules.ts`.

### Task 7: Gate e documentação

- [ ] `npm run validate` → exit 0; colar suítes/testes e lint em `tasks.md`.
- [ ] Atualizar Estado de `spec.md`, `plan.md`, `tasks.md`, README da parte e `decisoes/README.md` com o que foi feito.
- [ ] Propor ao usuário a linha do `CLAUDE.md`, se couber (o `observacao.ts` compartilhado é detalhe; provavelmente nenhuma mudança).
