# E8 — Campanhas e postos de vacinação no chat: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dar ao assistente duas ferramentas somente leitura, `consultar_campanhas` (calendário da tela) e `consultar_postos` (cache de unidades do município enviado pelo app), mais o reforço da R3 contra indicação individual de vacina.

**Architecture:** o app manda `local { uf, codigoMunicipio }` opcional; o handler valida; o campo atravessa o turno como `ContextoDoTurno`, terceiro parâmetro de `ChatTool.run`. Campanhas não têm I/O; postos leem por uma porta pública nova (`lerPublicoPorChave`, GetItem, lista fechada). Contratos completos em `specs/10-finalizacao-codigo/01-melhorias-ia/E8-campanhas-e-postos/plan.md`, seção 3.

**Tech Stack:** TypeScript, zod, AWS SDK v3 (`@aws-sdk/lib-dynamodb`), Amplify Gen 2 (CDK), Jest (jest-expo, `TZ=America/Sao_Paulo`).

**Spec:** `specs/10-finalizacao-codigo/01-melhorias-ia/E8-campanhas-e-postos/spec.md` (aprovada em 2026-10-17). Ler também o `plan.md` da mesma pasta: textos fixos e contratos estão lá e **não se repetem aqui**.

## Global Constraints

- Textos, comentários, nomes de teste em pt-BR; cabeçalho "Resumo do arquivo" em arquivo novo; comentário explica o porquê.
- Toda ferramenta `readOnly: true`, `inputSchema` `.strict()`, nome `consultar_*`, descrição com "NÃO".
- `lerDoDono` não muda de byte. Nenhum `PutCommand`/`UpdateCommand`/`DeleteCommand` em `chat-assistant/` (há teste de varredura).
- `grantReadData`, nunca `grantReadWriteData`. Nenhum schema novo. Nenhuma dependência nova.
- Ausência de dado = `{ disponivel: false, explicacao }`, com os textos fixos do `plan.md`.
- `local` nunca vai a log, ao modelo, nem a gravação.
- O gate é `npm run validate`. Não enfraquecer `TZ=America/Sao_Paulo` nem os ignores de `.claude/` do `jest.config.js`.
- Testes mockam o AWS SDK **inteiro**, sem `requireActual` (ver comentário em `tools.test.ts`).
- **Commit:** só quando o usuário pedir. Os passos "conferir" substituem o commit por tarefa. Nunca incluir `metro.config.js`, `package.json`, `package-lock.json` (alterações alheias ao épico).

## Review Focus

1. **`local` com tipo inesperado vindo de app antigo/adulterado** (string, array, número, `{ uf: 'sp' }`): o turno segue sem `local`, nunca 400 nem exceção. → T1, casos `lerLocal('SP')`, `lerLocal([])`, `lerLocal({ uf: 'sp' })`.
2. **Item do cache com unidade sem `bairro`/`logradouro`/`nome`** (o CNES traz campos nulos): a ferramenta não lança, ordena os sem bairro no fim e mostra `null`. → T6, caso "unidade sem bairro vai para o fim".
3. **`expiresAt` como string ou ausente** (item gravado à mão ou por versão antiga): tratado como cache ausente, não como válido. → T6, caso "expiresAt não numérico".
4. **Bairro só de espaços ou com acento combinado**: `"  "` é recusado pelo schema (após `trim`, 1 a 60); `"São José"` casa `"SAO JOSE"`. → T6.
5. **Pergunta de campanha às 23h30 do último dia** (UTC já virou): a campanha ainda aparece. → T4.

---

### Task 0: Linha de base

- [ ] **Step 1:** `npm run validate` → anotar suítes, testes e avisos em `tasks.md` (Estado e Contagem). Esperado: exit 0.
- [ ] **Step 2:** `git status --short` → anotar as alterações alheias (as três já conhecidas).

### Task 1: Validação de `local` no pedido

**Files:**
- Create: `amplify/functions/chat-assistant/localDoPedido.ts`
- Modify: `amplify/functions/chat-assistant/types.ts` (tipos `LocalDoUsuario`, `ContextoDoTurno`; `ChatTurnRequest.local?: LocalDoUsuario | null`)
- Modify: `amplify/functions/chat-assistant/handler.ts` (`lerCorpo` devolve `local: lerLocal(objeto.local)`)
- Test: `amplify/functions/chat-assistant/__tests__/localDoPedido.test.ts`, `__tests__/handler.test.ts`

**Interfaces:**
- Produces: `lerLocal(bruto: unknown): LocalDoUsuario | null`; `UFS` (27 siglas); tipos em `types.ts`.

- [ ] **Step 1: testes de `lerLocal`**

```ts
it.each([
  [{ uf: 'SP', codigoMunicipio: '355030' }, { uf: 'SP', codigoMunicipio: '355030' }],
  [{ uf: 'PA', codigoMunicipio: '1501402' }, { uf: 'PA', codigoMunicipio: '1501402' }],
  [{ uf: 'SP' }, { uf: 'SP', codigoMunicipio: null }],
  [{ codigoMunicipio: '355030' }, { uf: null, codigoMunicipio: '355030' }],
  [{ uf: 'XX', codigoMunicipio: '355030' }, { uf: null, codigoMunicipio: '355030' }],
  [{ uf: 'sp', codigoMunicipio: '35503A' }, null],
  [{ uf: 'SPP', codigoMunicipio: '12345' }, null],
  [{ uf: 'SP', codigoMunicipio: '12345678' }, { uf: 'SP', codigoMunicipio: null }],
  [{ uf: 35, codigoMunicipio: 355030 }, null],
])('lerLocal(%j) = %j', (bruto, esperado) => expect(lerLocal(bruto)).toEqual(esperado));

it.each([undefined, null, 'SP', [], 42])('valor que nao e objeto vira null: %j', (b) =>
  expect(lerLocal(b)).toBeNull());

it('campo extra nao atravessa -- o local e lido por nome', () => {
  expect(lerLocal({ uf: 'SP', codigoMunicipio: '355030', owner: 'vitima', latitude: -23 }))
    .toEqual({ uf: 'SP', codigoMunicipio: '355030' });
});

it('UFS tem as 27 siglas', () => expect(new Set(UFS).size).toBe(27));
```

- [ ] **Step 2: testes do handler** (em `handler.test.ts`, novo `describe('handler -- local do pedido (E8)')`):
  - corpo com `local: { uf: 'SP', codigoMunicipio: '355030' }` → `mockResponder.mock.calls[0][0].local` igual a esse objeto;
  - corpo com `local: { uf: 'zz', codigoMunicipio: 'abc' }` → `.local` é `null` e o status é 200;
  - corpo sem `local` → `.local` é `null`;
  - corpo com `local` e `owner` no topo → o contexto continua com a identidade do token (o teste de "IGNORA o owner" já existente segue verde).
- [ ] **Step 3:** `npx jest amplify/functions/chat-assistant/__tests__/localDoPedido.test.ts amplify/functions/chat-assistant/__tests__/handler.test.ts` → FAIL (módulo ausente / `local` indefinido).
- [ ] **Step 4:** implementar `lerLocal` (regex `^\d{6,7}$`; UF por `UFS.includes`) e a linha em `lerCorpo`. Comentário em `lerCorpo`: lido por nome, inválido vira ausente, por quê (plan, decisão 2).
- [ ] **Step 5:** mesmos testes → PASS; `npm run typecheck:backend` limpo.
- [ ] **Step 6: conferir** em `tasks.md` a T1 marcada, com a contagem de testes novos.

### Task 2: Contexto do turno até as ferramentas

**Files:**
- Modify: `tools/tipos.ts` (`run(input, identity, contexto: ContextoDoTurno)`), `tools/index.ts` (`runTool(name, input, identity, contexto = { local: null })`, repassa a `tool.run`), `conversationLoop.ts` (`TurnInput.local?`; `runTool(chamada.name, chamada.input, input.identity, { local: input.local ?? null })`), `verificacao.ts` (`responder`: `local: request.local ?? null` no `TurnInput`)
- Test: `__tests__/conversationLoop.test.ts`, `__tests__/tools.test.ts`, `__tests__/handler.test.ts`

**Interfaces:**
- Consumes: tipos da T1.
- Produces: `ContextoDoTurno` chegando a `ChatTool.run` como 3º argumento; `runTool` com 4º parâmetro opcional.

- [ ] **Step 1: testes**
  - `conversationLoop.test.ts`: o teste existente na linha ~199 passa a afirmar `toHaveBeenCalledWith('consultar_analito', {}, ENTRADA.identity, { local: null })` (mudança de contrato, plan seção 6). Novo: com `ENTRADA` + `local: { uf: 'SP', codigoMunicipio: '355030' }`, `mockRunTool` recebe `{ local: { uf: 'SP', codigoMunicipio: '355030' } }`. Novo: `JSON.stringify` dos `messages` enviados ao `ConverseCommand` não contém `'355030'` nem `"uf"`.
  - `tools.test.ts`: nada novo aqui. Os testes existentes provam que `runTool(nome, {}, IDENTIDADE)` sem 4º argumento continua funcionando para todas; a prova de que o despachante **entrega** o contexto precisa de uma ferramenta que o use, e fica na T7 (`consultar_campanhas` com UF do Norte).
  - `handler.test.ts`: com `mockResponder` rejeitando e `console.error`/`console.info`/`console.warn`/`console.log` espionados, um turno com `local { uf: 'SP', codigoMunicipio: '355030' }` não registra `355030` nem `"SP"` em nenhuma chamada.
- [ ] **Step 2:** rodar os três arquivos → FAIL nos novos.
- [ ] **Step 3:** implementar as quatro mudanças. Comentário em `tipos.ts` explicando por que o contexto é parâmetro próprio (plan, decisão 1).
- [ ] **Step 4:** `npx jest amplify/functions/chat-assistant` → PASS (todas as suítes do chat); `npm run typecheck:backend` limpo.
- [ ] **Step 5: conferir** T2 em `tasks.md`.

### Task 3: Porta pública

**Files:**
- Modify: `tools/ownerScopedRead.ts` (acréscimo no fim; comentário de cabeçalho ganha um parágrafo sobre a exceção D8.3)
- Test: `__tests__/leituraPublica.test.ts`

**Interfaces:**
- Produces: `TABELAS_PUBLICAS`, `TabelaPublica`, `lerPublicoPorChave(tabela, valorDaChave): Promise<LinhaDoBanco | null>`.

- [ ] **Step 1: testes** (mock de `@aws-sdk/lib-dynamodb` com `GetCommand` e `ScanCommand` como classes que guardam `input`, mesmo padrão de `tools.test.ts`; `SITE_CACHE_TABLE_NAME = 't-site'`):
  - `lerPublicoPorChave('CACHE_DE_POSTOS', '355030')` envia **um** comando, instância de `GetCommand`, com `input` exatamente `{ TableName: 't-site', Key: { codigoMunicipio: '355030' } }`;
  - devolve `Item` quando há, `null` quando `Item` ausente;
  - nenhum comando enviado tem `FilterExpression` nem `ExpressionAttributeValues`; nenhum é `ScanCommand`;
  - `lerPublicoPorChave('UserProfile' as never, 'x')` rejeita e não envia comando;
  - sem `SITE_CACHE_TABLE_NAME` rejeita e não envia comando;
  - `Object.keys(TABELAS_PUBLICAS)` é `['CACHE_DE_POSTOS']` (a lista fechada é afirmada, não só usada).
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** implementar com `GetCommand`; `Object.hasOwn(TABELAS_PUBLICAS, tabela)` como checagem de execução.
- [ ] **Step 4:** rodar → PASS; `git diff` de `ownerScopedRead.ts` não toca as linhas de `lerDoDono`.
- [ ] **Step 5: conferir** T3.

### Task 4: `consultar_campanhas`

**Files:**
- Create: `tools/campanhas.ts`
- Modify: `formatoPtBr.ts` (acrescenta `dataEmSaoPaulo(instante: Date): string`, sem importar nada)
- Test: `__tests__/campanhasTool.test.ts`, `__tests__/formatoPtBr.test.ts` (criar se não existir)

**Interfaces:**
- Consumes: `getCampanhasAtivas` de `../../get-vaccination-campaigns/campaignCalendar`; `ContextoDoTurno`; `formatarData` de `../formatoPtBr`.
- Produces: `dataEmSaoPaulo` (usada também na T6), `campanhasTool`, `UFS_DA_REGIAO_NORTE`, `SaidaCampanhas` (plan, seção 3).

- [ ] **Step 1: testes** (`jest.useFakeTimers().setSystemTime(...)`; `ctx = (uf) => ({ local: { uf, codigoMunicipio: null } })`):
  - `setSystemTime(new Date('2026-04-15T15:00:00Z'))` → `disponivel: true`, `campanhas` = `[{ nome: 'Campanha Nacional de Vacinação contra a Influenza', inicio: '2026-03-28', fim: '2026-05-30' }]`, `fonte` e `observacao` iguais aos textos do plan;
  - `2026-10-17T15:00:00Z` → `{ disponivel: false, explicacao: <nenhuma ativa>, fonte }`;
  - `2026-05-31T02:30:00Z` (23h30 de 30/05 em Brasília) → influenza presente; `dataEmSaoPaulo(new Date('2026-05-31T02:30:00Z'))` = `'2026-05-30'` e `dataEmSaoPaulo(new Date('2026-05-31T03:00:00Z'))` = `'2026-05-31'` (em `formatoPtBr.test.ts`);
  - **mesma função da tela:** `jest.mock('../../get-vaccination-campaigns/campaignCalendar', ...)` com `getCampanhasAtivas` espião devolvendo `[]`; ao rodar em `2026-04-15T15:00:00Z`, o espião foi chamado com `'2026-04-15'` (arquivo de teste separado ou `jest.isolateModules`);
  - `ctx('PA')` às `2026-04-15` e às `2026-10-17` → `avisoRegiao` presente nos dois; `ctx('SP')` e `{ local: null }` → sem a chave `avisoRegiao`;
  - forma: `JSON.stringify(saida)` não contém `dosesNoPeriodo`, `amostra`, `http`, `influenza-2026`, `'PA'`;
  - `campanhasTool.inputSchema.safeParse({ uf: 'SP' }).success` é `false`;
  - `renderDegraded(saidaAtiva)` = `{ titulo: 'Campanhas de vacinação ativas', linhas: ['Campanha Nacional de Vacinação contra a Influenza · de 28/03/2026 a 30/05/2026'], citacoes: [] }`; `renderDegraded({ disponivel: false, ... })` = `null`.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** implementar (`dataEmSaoPaulo` primeiro, depois a ferramenta). Descrição da ferramenta: "Diz quais campanhas nacionais de vacinação do calendário que o aplicativo acompanha estão ativas hoje, com nome e período — as mesmas da tela de Vacinação. NÃO diz quem deve se vacinar, NÃO conta doses aplicadas, NÃO lê a carteira do usuário (isso é consultar_vacinas) e NÃO diz onde se vacinar (isso é consultar_postos)." Aviso Norte: sempre que `local.uf` ∈ `UFS_DA_REGIAO_NORTE`.
- [ ] **Step 4:** rodar → PASS; `npm run typecheck:backend`.
- [ ] **Step 5: conferir** T4.

### Task 5: Constante da validade do cache de postos

**Files:**
- Create: `amplify/functions/get-vaccination-sites/validadeDoCache.ts`
- Modify: `amplify/functions/get-vaccination-sites/handler.ts` (remove `const CACHE_TTL_SECONDS = ...`, importa `VALIDADE_DO_CACHE_DE_POSTOS_S` e usa no `writeCache`)
- Test: `amplify/functions/get-vaccination-sites/__tests__/validadeDoCache.test.ts`

- [ ] **Step 1: testes:** `VALIDADE_DO_CACHE_DE_POSTOS_S` = `604800`; lendo `handler.ts` como texto: contém `import { VALIDADE_DO_CACHE_DE_POSTOS_S } from './validadeDoCache'` e **não** contém `7 * 24 * 60 * 60` (uma única fonte do número).
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar (comentário: por que a constante é compartilhada, plan decisão 8). **Step 4:** rodar → PASS; `typecheck:backend`. **Step 5: conferir** T5.

### Task 6: `consultar_postos`

**Files:**
- Create: `tools/postos.ts`
- Test: `__tests__/postosTool.test.ts`

**Interfaces:**
- Consumes: `lerPublicoPorChave('CACHE_DE_POSTOS', codigo)` (T3); `VALIDADE_DO_CACHE_DE_POSTOS_S` de `../../get-vaccination-sites/validadeDoCache` (T5); `ContextoDoTurno` (T2); `texto` de `ownerScopedRead`; `dataEmSaoPaulo` (T4).
- Produces: `postosTool`, `MAX_UNIDADES = 8`, `SaidaPostos`, `UnidadeParaOModelo`.

- [ ] **Step 1: testes** (mockar `@aws-sdk/lib-dynamodb` com `GetCommand`, como na T3, e não o módulo `ownerScopedRead`, para a leitura real pela porta pública ser exercida; `fetch` global espião; relógio fixo em `2026-10-17T15:00:00Z`; `agora = Math.floor(Date.now() / 1000)`; `item(payload, expiresAt = agora + 3 * 86400)`):
  - `{ local: null }` e `{ local: { uf: 'SP', codigoMunicipio: null } }` → `{ disponivel: false, explicacao: <sem cidade> }` e `mockSend` **não** chamado;
  - `Item` ausente → `<lista não carregada>`; `expiresAt = agora - 1` → idem; `expiresAt: '123'` → idem; item sem `payload` → idem;
  - `payload: []` → `<lista vazia>` (texto diferente do anterior);
  - 12 unidades em bairros variados → `unidades.length === 8`, `totalNaCidade: 12`, `omitidas: 4`, `totalNoFiltro: null`, ordem por bairro e depois nome (`localeCompare` pt-BR), unidade sem bairro por último, `atualizadoEm` = data de `expiresAt − 604800` em `AAAA-MM-DD` (para `expiresAt = agora + 3 dias` → `'2026-10-13'`);
  - `bairro: 'centro'` com bairros `'CENTRO'`, `'Centro Histórico'`, `'Jardim'` → só os dois primeiros, `totalNoFiltro: 2`, `omitidas: 0`; `bairro: 'sao jose'` casa `'SÃO JOSÉ'`; `bairro: 'Inexistente'` → `disponivel: true`, `unidades: []`, `totalNoFiltro: 0`, `explicacao: <nada no bairro>`, `totalNaCidade` presente;
  - schema: `{ bairro: '  ' }`, `{ bairro: 'x'.repeat(61) }`, `{ codigoMunicipio: '355030' }`, `{ uf: 'SP' }`, `{ owner: 'v' }` → `safeParse(...).success === false`;
  - forma: saída não contém `cnes`, `latitude`, `longitude`, `distanciaKm`, `355030`; contém `observacao` igual ao texto do plan;
  - a leitura usa a chave do **contexto**: `mockSend.mock.calls[0][0].input.Key` = `{ codigoMunicipio: '355030' }`;
  - `fetch` nunca é chamado em nenhum dos casos;
  - `renderDegraded` → `{ titulo: 'Unidades básicas de saúde da sua cidade', linhas: ['UBS Centro · Centro · Rua A, 10', ...], citacoes: [] }`, partes nulas omitidas; `null` sem unidades.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** implementar. `inputSchema`: `z.object({ bairro: z.string().trim().min(1).max(60).optional() }).strict()`. Descrição: "Lista unidades básicas de saúde da cidade do usuário (nome, bairro e endereço), do cadastro nacional que a tela de Vacinação usa; aceita um bairro para filtrar. NÃO diz se a unidade aplica certa vacina, NÃO informa horário nem se está aberta, NÃO calcula distância e NÃO busca outra cidade." Normalização de bairro numa função pura local (`semAcento(s)`).
- [ ] **Step 4:** rodar → PASS; `typecheck:backend`.
- [ ] **Step 5: conferir** T6.

### Task 7: Registro, lista fechada de públicas e classificação

**Files:**
- Modify: `tools/index.ts` (importa e registra `campanhasTool`, `postosTool` logo depois de `prevencaoTool`, com comentário do porquê da posição), `verificacao.ts` (`'consultar_campanhas'` em `TOOLS_CLINICAS`, com comentário: a pergunta de campanha é "devo me vacinar?"; postos fora, de propósito)
- Test: `__tests__/tools.test.ts`, `__tests__/verificacao.test.ts`, `__tests__/degradedAnswer.test.ts`

- [ ] **Step 1: testes**
  - `tools.test.ts`: mock do SDK ganha `GetCommand`; `TABELAS` ganha `SITE_CACHE_TABLE_NAME: 't-site'`; `const FERRAMENTAS_PUBLICAS = new Set(['consultar_campanhas', 'consultar_postos'])` com comentário (lista fechada; quem acrescenta ferramenta sem dono precisa acrescentá-la aqui de propósito);
  - "toda consulta é montada com o dono do TOKEN" e "a consulta filtra pelo dono" passam a iterar `CHAT_TOOLS.filter(t => !FERRAMENTAS_PUBLICAS.has(t.name))`;
  - novo: "toda ferramenta pública está registrada" (`FERRAMENTAS_PUBLICAS` ⊂ nomes registrados);
  - novo: "ferramenta pública nunca usa Scan nem dono": para cada pública, `runTool(nome, {}, IDENTIDADE, { local: { uf: 'SP', codigoMunicipio: '355030' } })`; todo comando enviado é `GetCommand` com `TableName: 't-site'`; `JSON.stringify(mockSend.mock.calls)` não contém `s-1::u-1`;
  - novo: ordem `[..., 'consultar_prevencao', 'consultar_campanhas', 'consultar_postos', ...]`;
  - novo: `runTool('consultar_campanhas', {}, IDENTIDADE, { local: { uf: 'PA', codigoMunicipio: null } })` traz `avisoRegiao` (o despachante entrega o contexto);
  - "dono plantado reprova" já itera a lista inteira e passa a cobri-las sem mudança.
  - `verificacao.test.ts` (no `describe('classificacao clinica (U2)')`): texto `'A Campanha Nacional de Vacinação contra a Influenza vai até 30/05/2026.'` com `['consultar_campanhas']` → `r.texto === \`${TEXTO} ${TEXTO_DE_ENCAMINHAMENTO}\``; texto `'A UBS Centro fica na Rua A, 10.'` com `['consultar_postos']` → `APROVADA` e `r.texto` igual ao texto (sem costura).
  - `degradedAnswer.test.ts`: `buildDegradedAnswer` com saídas das duas ferramentas gera texto que passa em `checkLanguageRules(texto, { questionKind: 'clinica', temOrigem: true })` e contém as linhas.
- [ ] **Step 2:** rodar os três → FAIL nos novos. **Step 3:** implementar. **Step 4:** `npx jest amplify/functions/chat-assistant` → PASS. **Step 5: conferir** T7.

### Task 8: Prompt

**Files:** Modify `chatPrompt.ts` (um bullet em "Como você trabalha", depois do de prevenção). Test: `__tests__/chatPrompt.test.ts`.

- [ ] **Step 1: testes** (`SYSTEM_PROMPT` contém): `consultar_campanhas`, `consultar_postos`; menção contrastiva a `consultar_vacinas` e `consultar_prevencao` no mesmo bullet; proibição de afirmar que a unidade aplica vacina, está aberta ou tem a vacina (regex `/nunca diga que (uma|a) unidade/i`); "omitidas" e "tela de Vacinação"; instrução de passar o bairro citado em `bairro`; e **não** contém pedido para o usuário informar o nome da cidade (regex `/informe (a|sua) cidade/i` ausente). O bullet não manda o modelo encaminhar (o encaminhamento é do app; mesmo teste negativo do E7).
- [ ] **Step 2:** FAIL. **Step 3:** escrever o bullet (≤ 120 tokens). **Step 4:** PASS, e `rulesPrompt`/`chatPrompt` verdes. **Step 5: conferir** T8.

### Task 9: Reforço da R3 para vacina (D8.4 = A)

**Files:** Modify `amplify/functions/ai-language-rules/languageRules.ts` (padrão novo em `PADROES_R3`, **antes** do padrão de verbos de medicação; motivo: `'A resposta indica uma vacina para a pessoa. Se ela deve se vacinar é decisão de quem a examina ou da unidade de saúde.'`; `excecao: RECUSA_DE_JULGAR`). Test: `__tests__/adversarial.test.ts`, `chat-assistant/__tests__/verificacao.test.ts`.

- [ ] **Step 1: testes** em `adversarial.test.ts`, `describe('vacinação: indicação individual (E8, D8.4)')`, com o mesmo `ENCAMINHA` e `questionKind: 'operacional'` **e** `'clinica'`:
  - reprovam com `rule === 'R3'` e `reason` casando `/indica uma vacina/`: "Você deve tomar a vacina da gripe na campanha.", "Você precisa se vacinar contra a gripe.", "Tome a vacina da gripe no posto mais próximo.", "Recomendo que você se vacine.", "Vacine-se ainda nesta campanha.", "Você tem que tomar o reforço.", "Você deveria receber a dose de reforço.", "Vá ao posto e tome a dose da vacina.", "Não sei se há estoque, mas você deve tomar a vacina."; e com `reason` casando `/segura/` ou `/indica uma vacina/`: "A vacina é segura para você.";
  - passam (`{ ok: true }`): "A campanha vai até 30/05; a unidade de saúde confirma quem pode se vacinar.", "Você tomou a vacina da gripe em 2025.", "Sua próxima dose está prevista para 10/11.", "Não posso dizer se você deve tomar a vacina.", "Quem tem 60 anos ou mais pode se vacinar na campanha, segundo o Ministério da Saúde.", "Você precisa levar a carteira de vacinação à unidade.", "Você precisa permitir a localização na tela de Vacinação.";
  - todos os testes já existentes das regras seguem verdes (inclusive "Pelo registro, a segunda dose da vacina está atrasada no calendário do aplicativo.").
  - `verificacao.test.ts`: "Você deve tomar a vacina da gripe." com `['consultar_campanhas']` não é `APROVADA`, a regeneração é chamada e o log contém `R3` (a costura não salva a indicação).
- [ ] **Step 2:** FAIL. **Step 3:** implementar o padrão com os auxiliares existentes (`INI_R3`, `FIM_R3`, `janela`, `DETERMINANTE`); objeto = `vacinas?|doses?|refor[cç]os?`. **Step 4:** `npx jest amplify/functions/ai-language-rules amplify/functions/chat-assistant` → PASS; medir o tempo da suíte de regras (não pode voltar aos minutos do E7: anotar em `tasks.md`). **Step 5: conferir** T9.

### Task 10: Infraestrutura

**Files:** Modify `amplify/backend.ts` (`siteCacheTable` no laço `for (const tabela of [...]) tabela.grantReadData(chatAssistantLambda)`; `backend.chatAssistant.addEnvironment('SITE_CACHE_TABLE_NAME', siteCacheTable.tableName)`; comentário: única tabela sem dono lida pelo chat, por `lerPublicoPorChave`, D8.3). Test: `chat-assistant/__tests__/infraVacinacao.test.ts` (padrão de `infraPrevencao.test.ts`).

- [ ] **Step 1: testes:** o laço de `grantReadData` do chat contém `siteCacheTable` e **não** contém `campaignCacheTable`; `backend.ts` casa `/chatAssistant\.addEnvironment\(\s*'SITE_CACHE_TABLE_NAME'/`; não há `grant(ReadWrite|Write)Data(chatAssistantLambda` nem `grantFullAccess`.
- [ ] **Step 2:** FAIL. **Step 3:** implementar (a declaração de `siteCacheTable` já existe na linha ~62; não duplicar). **Step 4:** PASS; `npm run typecheck:backend`. **Step 5: conferir** T10.

### Task 11: App envia `local`

**Files:** Modify `src/services/aiAssistantService.ts` (`sendMessageWithSources` lê `loadCachedLocation()` antes do `fetch`; acrescenta `...(local ? { local } : {})`, com `local = { uf, codigoMunicipio }` só com os campos não nulos; `try/catch` → sem `local`). Test: `__tests__/aiAssistantService.test.ts` (`jest.mock('@/services/locationService', () => ({ loadCachedLocation: () => mockLoad() }))`).

- [ ] **Step 1: testes:** com `{ uf: 'SP', municipioNome: 'São Paulo', codigoMunicipio: '355030', latitude: -23.5, longitude: -46.6 }` → `JSON.parse(body).local` = `{ uf: 'SP', codigoMunicipio: '355030' }` e o corpo não contém `latitude`, `-23.5`, `São Paulo`; com `codigoMunicipio: null` → `local` = `{ uf: 'SP' }`; com `null` → corpo sem `local`; com `mockLoad` rejeitando → a pergunta é enviada, sem `local`; os testes existentes ("NAO manda identificador de usuario no corpo", memória) seguem verdes.
- [ ] **Step 2:** FAIL. **Step 3:** implementar; comentário: por que só UF e código (D8.1, LGPD). **Step 4:** `npx jest __tests__/aiAssistantService.test.ts` → PASS; `npm run typecheck`. **Step 5: conferir** T11.

### Task 12: Roteiro do sandbox

- [ ] **Step 1:** preencher em `tasks.md` a seção "Conferência no sandbox": pré-requisito (abrir a tela de Vacinação com localização para preencher o cache); tabela com as 5 perguntas da spec (seção 1) e o que conferir em cada (texto puro; sem "você deve tomar"; campanhas com encaminhamento; postos com total, omitidas, data e observação); casos de borda (sem localização; cidade sem lista salva; usuário com UF do Norte; bairro inexistente).

### Task 13: Gate e fechamento

- [ ] **Step 1:** `npm run validate` → exit 0; colar suítes/testes/avisos em `tasks.md`.
- [ ] **Step 2:** revisar o diff contra a seção 8 do `PROMPT-PADRAO.md`; `/code-review` e `/simplify` no diff do épico; subagente revisor recebe código + spec (não a conclusão). Corrigir o real por TDD; descartes com uma linha de motivo em `tasks.md`.
- [ ] **Step 3:** atualizar `spec.md`/`plan.md` (desvios na seção "Desvios"), `tasks.md` (Estado, contagem), `01-melhorias-ia/README.md`, `decisoes/README.md`, `prd.md` se algo mudou. Propor ao usuário, se couber, a linha do `CLAUDE.md` sobre as ferramentas públicas do chat.
- [ ] **Step 4:** parar e apresentar ao usuário (Fase 5). Sem commit sem pedido.
