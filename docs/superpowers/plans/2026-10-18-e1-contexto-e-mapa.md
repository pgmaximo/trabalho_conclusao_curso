# E1 — Data de hoje e mapa do app: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o assistente sabe a data e a hora de hoje em Brasília e orienta a pessoa pelas telas reais do app, sem inventar caminho.

**Architecture:** a data vira um texto montado por função pura e vai num segundo bloco de `system` (D1.1, D1.2). O relógio é lido uma vez por turno em `responder`. O mapa é um array de dados em `mapaDoApp.ts`, renderizado no prompt fixo e conferido por um teste que lê `src/app`, `navigation.ts` e as telas (D1.3). `consultar_consultas` passa a cortar futuras e passadas na hora de Brasília (achado A1).

**Tech Stack:** TypeScript, zod 4, Jest (jest-expo, `TZ=America/Sao_Paulo`), AWS Lambda (Amplify Gen 2), Bedrock Converse.

**Spec:** `specs/10-finalizacao-codigo/01-melhorias-ia/E1-contexto-e-mapa-do-app/spec.md` · desenho e contratos: `plan.md` na mesma pasta (§3, que este plano não repete).

## Global Constraints

- Texto, comentários e testes em pt-BR; cabeçalho "Resumo do arquivo" em todo arquivo novo, explicando o porquê.
- Fuso fixo `America/Sao_Paulo`, explícito no `Intl`. Nenhum getter local de `Date` (`getHours`, `getDate`, `getDay`…) no código novo.
- Bloco de data: "Data e hora deste turno, informadas pelo aplicativo: hoje é <dia>, DD/MM/AAAA, e agora são HHhMM no horário de Brasília."
- Rota nunca entra no texto do prompt. Mapa no prompt ≤ 1.800 caracteres.
- Sem `contextoDeHoje`, `system` sai byte a byte como hoje.
- Nenhum teste existente tem asserção editada. Nenhuma dependência nova, nenhuma mudança de schema, de `backend.ts` nem de contrato do pedido.
- Regras de linguagem não são afrouxadas: falso positivo vira parada e relato, não ajuste de regex.
- Branch `sdd-10-finalizacao-codigo`, sem worktree; não tocar em `metro.config.js`, `package.json`, `package-lock.json`. Commit só quando o usuário pedir (os passos de commit ficam suspensos até lá).
- `npm run validate` é o único gate.

## Review Focus

1. **Consulta gravada só com data, marcada para hoje** ("2026-10-18" às 08h de 18/10): a pessoa espera vê-la como de hoje, não como passada. Fica na T1.
2. **Meia-noite em ponto em Brasília** (03:00Z): "domingo, 18/10/2026, 00h00", nunca "24h00" nem o dia anterior. Fica na T2.
3. **Hora com um dígito** (09h05, 00h07): sempre dois dígitos nos dois campos. Fica na T2.
4. **Pergunta sobre tela que não existe** ("plano de saúde"): só o prompt pode cobrir. A instrução "não invente" é conferida por trecho na T5, e o comportamento no sandbox.
5. **Tela nova criada na Parte 2 sem entrada no mapa**: o teste reprova com mensagem que diz o que fazer. Fica na T4.

---

### Task 0: Linha de base

- [ ] **Step 1:** Run `npm run validate`. Anotar em `tasks.md` (T0): suítes, testes, exit code, avisos de lint.
- [ ] **Step 2:** Run `git status --short`. Esperado: os alheios (`metro.config.js`, `package*.json`), o E9 ainda sem commit e os docs do E1.

### Task 1: Corte de consultas na hora de Brasília (achado A1)

**Files:**
- Modify: `amplify/functions/chat-assistant/formatoPtBr.ts` (+ `momentoEmSaoPaulo`)
- Modify: `amplify/functions/chat-assistant/tools/consultas.ts:40-45`
- Test: `amplify/functions/chat-assistant/__tests__/formatoPtBr.test.ts`, `__tests__/consultasTool.test.ts` (novo; mock de `@aws-sdk/lib-dynamodb` como em `medicamentosTool.test.ts`)

**Interfaces:**
- Produces: `momentoEmSaoPaulo(instante: Date): string` → "AAAA-MM-DDTHH:mm" em Brasília.

- [ ] **Step 1: Testes que falham**

```ts
// formatoPtBr.test.ts
it('momentoEmSaoPaulo devolve a hora local de Brasilia, no formato da Agenda', () => {
  expect(momentoEmSaoPaulo(new Date('2026-10-18T01:30:00Z'))).toBe('2026-10-17T22:30');
  expect(momentoEmSaoPaulo(new Date('2026-10-18T03:00:00Z'))).toBe('2026-10-18T00:00');
  expect(momentoEmSaoPaulo(new Date('2026-10-18T12:05:00Z'))).toBe('2026-10-18T09:05');
});

// consultasTool.test.ts (relógio com jest.useFakeTimers({ now, doNotFake: [...] }))
it('as 08h de Brasilia, a consulta das 10h de hoje e futura e proxima', ...);
//   now = 2026-10-18T11:00:00Z; linha scheduledAt '2026-10-18T10:00'
//   expect(saida.futuras).toHaveLength(1); expect(saida.proxima?.quando).toBe('2026-10-18T10:00'); expect(saida.passadas).toHaveLength(0)
it('as 10h01 de Brasilia, a mesma consulta e passada', ...);          // now = 2026-10-18T13:01:00Z
it('as 22h30 de Brasilia (01h30 UTC do dia seguinte), a das 23h e futura', ...); // now = 2026-10-18T01:30:00Z; '2026-10-17T23:00'
it('consulta so com data, marcada para hoje, conta como futura', ...); // now = 2026-10-18T11:00:00Z; '2026-10-18'
it('consulta so com data, de ontem, e passada', ...);                   // '2026-10-17'
it('a forma da saida nao muda', ...); // chaves: disponivel, futuras, passadas, proxima (+ explicacao quando vazio)
```

- [ ] **Step 2:** Run `npx jest amplify/functions/chat-assistant/__tests__/formatoPtBr.test.ts amplify/functions/chat-assistant/__tests__/consultasTool.test.ts`. Esperado: FAIL (`momentoEmSaoPaulo` não existe; o caso das 08h sai em `passadas`).
- [ ] **Step 3:** Implementar `momentoEmSaoPaulo` com `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year, month, day, hour, minute: '2-digit', hourCycle: 'h23' }).formatToParts`, criado uma vez no módulo, e montar a string pelas partes. Em `consultas.ts`: `const agora = momentoEmSaoPaulo(new Date())`; corte por `quando.length <= 10 ? agora.slice(0, 10) : agora`, numa função pequena `ehFutura(quando, agora)`. Trocar o comentário do corte pelo porquê novo (gravação em hora local ingênua, `agendaDateRange.ts`).
- [ ] **Step 4:** Run o mesmo comando. Esperado: PASS.

### Task 2: O texto do bloco de data

**Files:**
- Create: `amplify/functions/chat-assistant/contextoDeHoje.ts`
- Test: `amplify/functions/chat-assistant/__tests__/contextoDeHoje.test.ts`

**Interfaces:**
- Produces: `montarContextoDeHoje(instante: Date): string`, `FUSO_DO_APP = 'America/Sao_Paulo'`.

- [ ] **Step 1: Testes que falham**

```ts
const PREFIXO = 'Data e hora deste turno, informadas pelo aplicativo: hoje é ';
it('vira o dia pelo fuso de Brasilia, e nao pelo UTC', () => {
  expect(montarContextoDeHoje(new Date('2026-10-18T01:30:00Z'))).toBe(
    `${PREFIXO}sábado, 17/10/2026, e agora são 22h30 no horário de Brasília.`);
  expect(montarContextoDeHoje(new Date('2026-10-18T03:00:00Z'))).toBe(
    `${PREFIXO}domingo, 18/10/2026, e agora são 00h00 no horário de Brasília.`);
});
it('hora e minuto sempre com dois digitos', () => { /* 2026-10-19T12:05:00Z -> 'segunda-feira, 19/10/2026, e agora são 09h05' */ });
it.each([
  ['2026-10-18T15:00:00Z', 'domingo'], ['2026-10-19T15:00:00Z', 'segunda-feira'],
  ['2026-10-20T15:00:00Z', 'terça-feira'], ['2026-10-21T15:00:00Z', 'quarta-feira'],
  ['2026-10-22T15:00:00Z', 'quinta-feira'], ['2026-10-23T15:00:00Z', 'sexta-feira'],
  ['2026-10-24T15:00:00Z', 'sábado'],
])('%s cai num(a) %s', (iso, dia) => expect(montarContextoDeHoje(new Date(iso))).toContain(`hoje é ${dia},`));
it('nao usa getters locais de Date: o fuso vem so do Intl', () => {
  const fonte = readFileSync(join(__dirname, '..', 'contextoDeHoje.ts'), 'utf8');
  expect(fonte).not.toMatch(/\.get(Hours|Minutes|Date|Day|Month|FullYear)\(/);
  expect(fonte).toContain("'America/Sao_Paulo'");
  expect(fonte).not.toMatch(/^import /m);
});
```

- [ ] **Step 2:** Run `npx jest amplify/functions/chat-assistant/__tests__/contextoDeHoje.test.ts`. Esperado: FAIL (módulo inexistente).
- [ ] **Step 3:** Implementar com um `Intl.DateTimeFormat('en-US', { timeZone: FUSO_DO_APP, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })` criado no módulo, `formatToParts`, e a lista fixa `{ Sun: 'domingo', Mon: 'segunda-feira', … }` (plan.md §4, por que não `pt-BR`).
- [ ] **Step 4:** Run o mesmo comando. Esperado: PASS.

### Task 3: A data no segundo bloco de `system`, lida uma vez por turno

**Files:**
- Modify: `amplify/functions/chat-assistant/conversationLoop.ts:55-87` (tipo) e `:211` (`chamar`)
- Modify: `amplify/functions/chat-assistant/verificacao.ts:537-549` (`responder`)
- Test: `__tests__/conversationLoop.test.ts`, `__tests__/verificacao.test.ts`

**Interfaces:**
- Consumes: `montarContextoDeHoje` (T2).
- Produces: `TurnInput.contextoDeHoje?: string`.

- [ ] **Step 1: Testes que falham**

```ts
// conversationLoop.test.ts (usa o mockSend e ultimaChamada() que o arquivo ja tem)
it('com contextoDeHoje, system leva dois blocos: o prompt e depois a data', async () => {
  // entrada com contextoDeHoje: 'Data e hora deste turno, ... 22h30 ...'
  expect(ultimaChamada().system).toHaveLength(2);
  expect(ultimaChamada().system[0].text).toContain(LANGUAGE_RULES_PROMPT);
  expect(ultimaChamada().system[1]).toEqual({ text: contexto });
});
it('sem contextoDeHoje, system continua com um bloco so', ...); // toEqual([{ text: SYSTEM_PROMPT }])
it('a data nao vai em messages nem no guardContent', ...);       // JSON.stringify(messages) nao contem '22h30'
it('a segunda geracao leva o mesmo bloco de data', ...);          // regenerateAnswer(entrada, transcript, 'x'): system[1] igual

// verificacao.test.ts
it('responder le o relogio uma vez e entrega a data na entrada do turno', async () => {
  // jest.useFakeTimers({ now: new Date('2026-10-18T01:30:00Z'), doNotFake: [...] })
  // await responder(pedido, contexto)
  const entrada = mockRunConversationTurn.mock.calls[0][0];
  expect(entrada.contextoDeHoje).toBe(montarContextoDeHoje(new Date('2026-10-18T01:30:00Z')));
});
it('a segunda geracao recebe a mesma entrada, com a mesma data', ...);
// primeira geração reprovada pela regra -> mockRegenerateAnswer.mock.calls[0][0] === entrada da primeira
```

- [ ] **Step 2:** Run `npx jest amplify/functions/chat-assistant/__tests__/conversationLoop.test.ts amplify/functions/chat-assistant/__tests__/verificacao.test.ts`. Esperado: FAIL nos novos, verdes os antigos.
- [ ] **Step 3:** `TurnInput` ganha `contextoDeHoje?: string`, com comentário do porquê (D1.1: depois do prompt fixo para não invalidar cache futuro; fora do guardrail; autoridade de sistema). `chamar` monta `system` com o segundo bloco só quando ele existe. `responder` faz `contextoDeHoje: montarContextoDeHoje(new Date())` ao montar `entrada`.
- [ ] **Step 4:** Run o mesmo comando. Esperado: PASS, sem diff nas asserções antigas.

### Task 4: O mapa do app como dado

**Files:**
- Create: `amplify/functions/chat-assistant/mapaDoApp.ts`
- Test: `amplify/functions/chat-assistant/__tests__/mapaDoApp.test.ts`

**Interfaces:**
- Produces: `TelaDoMapa`, `MAPA_DO_APP`, `MAPA_DO_APP_PROMPT` (plan.md §3).

- [ ] **Step 1: Testes que falham** (leem o disco a partir de `join(__dirname, '../../../..')`; importam `APP_TABS` e `MORE_MENU_ITEMS` de `src/constants/navigation`)

```ts
const FORA_DO_MAPA: Record<string, string> = {
  index: 'login', register: 'cadastro de conta', confirm: 'confirmação de conta',
  'forgot-password': 'recuperação de senha', 'profile-setup': 'primeiro acesso, antes do app',
  'dev-preview': 'só em desenvolvimento',
};
const BOTOES: Record<string, string> = { /* rótulo -> arquivo, tabela do plan.md §3 */ };

it('toda rota do mapa existe em src/app ou src/app/(app)', ...);                         // CA-11
it('toda tela de src/app esta no mapa ou em FORA_DO_MAPA', ...);                        // CA-12
// mensagem: `A tela "${rota}" nao esta no mapa do assistente: acrescente em mapaDoApp.ts ou em FORA_DO_MAPA, com o motivo.`
it('o 1o passo e uma aba da barra, com o rotulo de APP_TABS', ...);                     // CA-13
it('depois de "Mais", o 2o passo e um item de MORE_MENU_ITEMS, com o mesmo rotulo', ...); // CA-13
it('todo outro passo e gesto ("tocar...") ou botao cujo texto esta no arquivo da tela', ...); // CA-14
it('o texto do prompt nao tem rota, arquivo nem marcacao', () => {                      // CA-15
  expect(MAPA_DO_APP_PROMPT).not.toMatch(/(^|\s)\/[a-z]|\.tsx?\b|\*|#|\]\(|https?:/);
});
it('o texto do prompt tem uma linha por tela, com nome e caminho com " > "', ...);
it('o mapa no prompt cabe em 1.800 caracteres', () => expect(MAPA_DO_APP_PROMPT.length).toBeLessThanOrEqual(1800)); // CA-18
it('Medicamentos, Vacinacao e Prevencao sao apelidos de telas do mapa', ...);           // base do CA-16
```

- [ ] **Step 2:** Run `npx jest amplify/functions/chat-assistant/__tests__/mapaDoApp.test.ts`. Esperado: FAIL (módulo inexistente).
- [ ] **Step 3:** Escrever as 21 entradas (lista e caminhos na spec §2 e no plan.md §3; "oQueFaz" em uma linha simples, sem jargão). Apelidos: Remédios ← "Medicamentos"; Carteira de vacinação ← "Vacinação"; Prevenção & Alertas ← "Prevenção". `MAPA_DO_APP_PROMPT`: uma linha por tela, `Nome (também chamada de tela de X): Passo > Passo. O que faz.`
- [ ] **Step 4:** Run o mesmo comando. Esperado: PASS. Se o mapa passar de 1.800 caracteres, encurtar o "oQueFaz", nunca o teto.

### Task 5: O prompt usa a data e o mapa

**Files:**
- Modify: `amplify/functions/chat-assistant/chatPrompt.ts`
- Test: `amplify/functions/chat-assistant/__tests__/chatPrompt.test.ts`

**Interfaces:**
- Consumes: `MAPA_DO_APP_PROMPT`, `MAPA_DO_APP` (T4).

- [ ] **Step 1: Testes que falham**

```ts
it('o prompt nao muda com o relogio e nao traz data', ...);       // CA-7: sem /\d{2}\/\d{2}\/\d{4}/, sem 'Data e hora deste turno'
it('manda usar a data do bloco como hoje, mesmo que a conversa diga outra', ...); // CA-8: trechos 'como hoje', 'mesmo que a conversa diga outra'
it('tempo decorrido so em meses ou anos, aproximado, com a data exata, nunca em dias', ...); // CA-8 (P1 = A)
it('traz o mapa e manda orientar so por ele, sem inventar, sem link, sem cadastrar pela pessoa', ...); // CA-17
it('toda "tela de X" do prompt e nome ou apelido do mapa', () => { // CA-16
  const citadas = [...SYSTEM_PROMPT.matchAll(/tela de ([A-ZÀ-Ú][a-zà-ú]+)/g)].map((m) => m[1]);
  const conhecidos = MAPA_DO_APP.flatMap((t) => [t.nome, ...(t.apelidos ?? [])]);
  for (const nome of citadas) expect(conhecidos.some((c) => c.startsWith(nome))).toBe(true);
});
```

- [ ] **Step 2:** Run `npx jest amplify/functions/chat-assistant/__tests__/chatPrompt.test.ts`. Esperado: FAIL nos novos.
- [ ] **Step 3:** Em `SYSTEM_PROMPT`, um item novo em "Como você trabalha" (logo depois de "Responda sempre em português"):
  > A data e a hora de hoje vêm no bloco que segue estas instruções, calculadas pelo aplicativo no horário de Brasília. Use essa data como hoje, mesmo que a conversa diga outra. Para separar o que já passou do que vem, use o que a ferramenta já separou. Ao dizer há quanto tempo algo aconteceu, diga a data exata e o tempo só em meses ou anos, aproximado ("há cerca de 7 meses"); nunca conte dias.

  E um parágrafo antes de "O formato da sua resposta":
  > Onde fica cada coisa no aplicativo. Para orientar, use só este mapa. Se a pessoa procurar algo que não está nele, diga que não sabe onde fica, sem inventar tela nem botão. Diga o caminho em texto, como "Mais > Agenda > Novo compromisso", sem link. Você não cadastra nada: diga onde a pessoa faz.
  > `${MAPA_DO_APP_PROMPT}`
- [ ] **Step 4:** Run o mesmo comando e `conversationLoop.test.ts`. Esperado: PASS.

### Task 6: Respostas com data e caminho passam pelas regras

**Files:**
- Test: `amplify/functions/ai-language-rules/__tests__/adversarial.test.ts` (bloco novo, sem editar os existentes)

- [ ] **Step 1: Testes** (CA-10, CA-19), nos dois tipos de pergunta quando couber, com `ENCAMINHA` do arquivo na clínica:

```ts
it.each([
  'Amanhã, domingo, 18/10, às 9h, você tem consulta com a Dra. Ana.',
  'Sua próxima consulta é hoje, às 10h, no Posto Central.',
  'Toque em Mais, depois em Agenda e em Novo compromisso.',
  'Para importar os dados do relógio, vá em Mais > Dados do smartwatch > Importar.',
])('operacional aprova: %s', (frase) => expect(checkLanguageRules(frase, { questionKind: 'operacional', temOrigem: false })).toEqual({ ok: true }));
it('clinica aprova tempo decorrido com a data exata', () => {
  const frase = 'Você fez esse exame em 12/03/2026, há cerca de 7 meses.' + ENCAMINHA;
  expect(checkLanguageRules(frase, { questionKind: 'clinica', temOrigem: true })).toEqual({ ok: true });
});
```

- [ ] **Step 2:** Run `npx jest amplify/functions/ai-language-rules`. Esperado: PASS de primeira (é teste de não regressão). **Se algum reprovar: parar, registrar a frase e a regra em `tasks.md` e avisar o usuário.** Não mexer em `languageRules.ts`.

### Task 7: Gate e fechamento da documentação

- [ ] **Step 1:** Run `npm run validate`. Esperado: exit 0. Colar suítes, testes e avisos em `tasks.md`.
- [ ] **Step 2:** Atualizar `tasks.md` (Estado), `plan.md` (desvios, se houver), `spec.md` (Estado) e `01-melhorias-ia/README.md`.
- [ ] **Step 3:** Propor ao usuário a linha do `CLAUDE.md` sobre o segundo bloco de `system` e o mapa (não editar sem aprovação).
