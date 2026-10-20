# E11 — Ações propostas pela IA e confirmadas pelo usuário — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o assistente propõe "novo compromisso" ou "novo lembrete de remédio" com campos tirados só da fala da pessoa; o app mostra um cartão que abre o formulário existente já preenchido, e nada é gravado sem o toque em Salvar.

**Architecture:** campo opcional `acao` no envelope (como a memória), validado e resolvido por módulos puros na Lambda (`acoes/expressaoDeData.ts`, `acoes/acaoValida.ts`), com a forma conferida por um módulo compartilhado sem importação (`acoes-propostas-shared/camposDaAcao.ts`) na Lambda, no serviço do app e nas rotas. Uma regra R5 nova barra "agendei"/"cadastrei".

**Tech Stack:** TypeScript, zod, Jest (`jest-expo`, `TZ=America/Sao_Paulo`), React Native Testing Library, Expo Router.

**Spec:** `specs/10-finalizacao-codigo/01-melhorias-ia/E11-acoes-propostas/spec.md` · **Desenho:** `.../E11-acoes-propostas/plan.md` (contratos na seção 3, textos fixos em 3.6).

## Global Constraints

- Branch `sdd-10-finalizacao-codigo`, checkout principal, sem worktree. **Commit só quando o usuário pedir.** Nunca incluir `metro.config.js`, `package.json`, `package-lock.json` (alheios). Os passos "Commit" abaixo viram "marcar a tarefa em `tasks.md`".
- Textos, comentários e testes em pt-BR; cabeçalho "Resumo do arquivo" em arquivo novo; comentário diz o porquê.
- Não mudam: `tools/index.ts`, `ownerScopedRead.ts`, `backend.ts`, schema do Amplify Data, `appointmentService.ts`, `medicineService.ts`, `memoria/*`, `MemoryProposalCard.tsx`.
- Valores pinados: `MAX_NOME = 80`, `MAX_PROFISSIONAL = 80`, `MAX_ENDERECO = 120`, `MAX_HORARIOS = 4`, `MIN_CARACTERES_CAMPO = 2`; tipos `ABRIR_NOVO_AGENDAMENTO`, `ABRIR_NOVO_LEMBRETE`; janela de 40 caracteres entre verbo e objeto na R5.
- Textos fixos: os de `plan.md` 3.5 (motivo da R5) e 3.6 (cartão e formulário), copiados literalmente.
- `acoes-propostas-shared/camposDaAcao.ts` não importa nada; `expressaoDeData.ts`, `acaoValida.ts` e `nomeSemPosologia.ts` não importam `@aws-sdk` nem `ownerScopedRead`.
- Gate: `npm run validate`. Teste isolado: `npx jest <arquivo>`.

## Review Focus

1. **O modelo reescreve com as próprias palavras** ("Retorno com a Dra. Ana Souza" para a fala "retorno com a dra ana") → o campo inteiro some; a pessoa vê o cartão sem nome. Esperado e aceitável, mas o cartão sem nenhum campo não pode aparecer. Teste na Task 4: só nome reescrito → `undefined`.
2. **"sexta de manhã"** dado inteiro em `quando` → a gramática tem âncora e devolve `null`, em vez de casar "sexta" e ignorar o resto silenciosamente? Decisão: o modelo é instruído a mandar só "sexta"; se mandar a frase inteira, `null`. Teste na Task 3.
3. **Hora "12h" e "12 da noite"** → 12:00 e 00:00; "0h" → 00:00; "24h" → `null`. Teste na Task 3.
4. **Duas falas da pessoa com datas diferentes** ("dia 20" e depois "não, dia 22") → o modelo escolhe; o código só confere que "dia 22" está numa fala. Teste na Task 4 com as duas no histórico: aceita a que o modelo mandou.
5. **Mudança de dia entre a primeira e a segunda geração** perto da meia-noite → `hoje` é lido uma vez em `responder`, junto com `contextoDeHoje`. Teste na Task 5: `entrada.hoje` igual nas duas gerações (a segunda recebe a mesma `entrada`).

---

### Task 1: Corte do nome sem posologia extraído

**Files:**
- Create: `amplify/functions/chat-assistant/tools/nomeSemPosologia.ts`
- Modify: `amplify/functions/chat-assistant/tools/receitasSaida.ts` (mover `semPosologia`, as duas regex e a junção por `+` de `nomeDoRemedio`)
- Test: `amplify/functions/chat-assistant/__tests__/nomeSemPosologia.test.ts`

**Interfaces:**
- Produces: `nomeSemPosologia(texto: string): string` — cada parte separada por `+` limpa como hoje, juntas por `' + '`; devolve `''` quando nada sobra (sem o `NOME_ILEGIVEL`, que continua em `receitasSaida.ts`).

- [ ] **Step 1: Teste que falha.** `nomeSemPosologia('vitamina d 2000 ui')` → `'vitamina d'`; `'Amoxicilina 875 + Clavulanato 125mg'` → `'Amoxicilina + Clavulanato'`; `'losartana'` → `'losartana'`; `'500mg'` → `''`; o arquivo não importa `ownerScopedRead` nem `@aws-sdk` (leitura da fonte com `readFileSync`).
- [ ] **Step 2:** `npx jest amplify/functions/chat-assistant/__tests__/nomeSemPosologia.test.ts` → FAIL (módulo inexistente).
- [ ] **Step 3:** criar o módulo com o código movido; `nomeDoRemedio` passa a ser `const nome = nomeSemPosologia(texto); return nome ? nome.slice(0, MAX_NOME_DO_REMEDIO) : NOME_ILEGIVEL;`.
- [ ] **Step 4:** `npx jest amplify/functions/chat-assistant/__tests__/nomeSemPosologia.test.ts amplify/functions/chat-assistant/__tests__/receitas` → PASS, testes do E4 sem mudança.
- [ ] **Step 5:** marcar T1.

### Task 2: Módulo compartilhado da ação

**Files:**
- Create: `amplify/functions/acoes-propostas-shared/camposDaAcao.ts`
- Test: `amplify/functions/acoes-propostas-shared/__tests__/camposDaAcao.test.ts`

**Interfaces:**
- Produces: tudo de `plan.md` 3.1, mais `MIN_CARACTERES_CAMPO = 2`.

- [ ] **Step 1: Testes que falham.**
  - `lerAcaoProposta({ tipo: 'ABRIR_NOVO_AGENDAMENTO', campos: { appointmentName: 'retorno', scheduledDate: '2026-10-30', scheduledTime: '14:00' } })` → igual à entrada.
  - tipo `'APAGAR_TUDO'`, `null`, `'x'` → `undefined`.
  - `scheduledDate: '2026-13-40'`, `'2026-02-30'`, `'30/10/2026'` → campo some; com só esse campo → `undefined` (H14).
  - `appointmentName: 'a'.repeat(81)` some; `'a'.repeat(80)` fica; `professionalName` 81 some; `address` 121 some; `' x '` (1 caractere útil) some.
  - `appointmentType: 'EXAME'` fica; `'PLANTAO'` some.
  - lembrete: `{ name: 'vitamina d', times: ['08:00', '08:00', '25:00', '20:00'] }` → `times: ['08:00', '20:00']`; `times: '08:00,20:00'` (texto de rota) → `['08:00', '20:00']`; 5 horários válidos → os 4 primeiros.
  - campos de outro tipo são ignorados (`times` num agendamento não aparece).
  - `paramsDaAcao` de um lembrete com dois horários → `{ tipo: 'ABRIR_NOVO_LEMBRETE', name: 'vitamina d', times: '08:00,20:00' }`; `lerAcaoProposta({ tipo, campos: paramsDaAcao(acao) })` devolve a mesma ação (ida e volta), para os dois tipos.
  - `rotaDaAcao('ABRIR_NOVO_AGENDAMENTO') === '/add-appointment'`, lembrete → `'/add-medicine'`.
  - `dataPorExtenso('2026-10-30') === 'sexta-feira, 30/10/2026'`; `'2026-10-20'` → `'terça-feira, 20/10/2026'`.
  - a fonte não tem `import` (`readFileSync`, `expect(FONTE).not.toMatch(/^import /m)`).
- [ ] **Step 2:** `npx jest amplify/functions/acoes-propostas-shared` → FAIL.
- [ ] **Step 3:** implementar. `lerAcaoProposta` aceita `{ tipo, campos }` ou parâmetros soltos com `tipo` dentro de `campos` (as rotas passam `{ tipo, campos: params }`); trim em todo texto; descarta por campo; `undefined` sem campo.
- [ ] **Step 4:** mesmo comando → PASS.
- [ ] **Step 5:** marcar T2.

### Task 3: Gramática de data e hora

**Files:**
- Create: `amplify/functions/chat-assistant/acoes/expressaoDeData.ts`
- Test: `amplify/functions/chat-assistant/__tests__/expressaoDeData.test.ts`

**Interfaces:**
- Consumes: `dataIsoValida` (Task 2); `semAcento` (`../formatoPtBr`).
- Produces: `resolverData(expressao: string, hoje: string): string | null`; `resolverHora(expressao: string): string | null`.

- [ ] **Step 1: Testes que falham**, `hoje = '2026-10-20'` (terça), tabela com `it.each`:
  - data: `hoje`→`2026-10-20`; `amanhã`, `amanha`→`2026-10-21`; `depois de amanhã`→`2026-10-22`; `sexta`, `sexta-feira`, `Sexta`→`2026-10-23`; `terça`, `terca`→`2026-10-27` (igual a hoje vai para a semana seguinte); `domingo`→`2026-10-25`; `dia 20`→`2026-10-20`; `dia 5`→`2026-11-05`; `dia 31` com `hoje='2026-11-10'`→`2026-12-31`; `30/10`→`2026-10-30`; `15/10`→`2027-10-15`; `15/10/2026`→`null` (passado); `31/02/2027`→`null`; `05/01` com `hoje='2026-12-31'`→`2027-01-05`; `semana que vem`, `ontem`, `sexta de manhã`, `''`→`null`.
  - hora: `14h`→`14:00`; `14h30`→`14:30`; `14:30`→`14:30`; `às 8`, `as 8`→`08:00`; `8 da manhã`→`08:00`; `2 da tarde`→`14:00`; `8 da noite`→`20:00`; `12h`→`12:00`; `12 da noite`→`00:00`; `0h`→`00:00`; `24h`, `14h75`, `de manhã`, `''`→`null`.
- [ ] **Step 2:** `npx jest amplify/functions/chat-assistant/__tests__/expressaoDeData.test.ts` → FAIL.
- [ ] **Step 3:** implementar com aritmética em `Date.UTC` (nunca o fuso do processo); normalizar com `semAcento` (que troca hífen e `/` por espaço: as regex trabalham sobre o texto normalizado, ex. `^(\d{1,2}) (\d{1,2})( (\d{4}))?$` para `dd/mm[/aaaa]`); dia da semana por mapa `domingo..sabado` → 0..6, aceitando o sufixo ` feira`.
- [ ] **Step 4:** mesmo comando → PASS.
- [ ] **Step 5:** marcar T3.

### Task 4: Validação da proposta

**Files:**
- Create: `amplify/functions/chat-assistant/acoes/acaoValida.ts`
- Modify: `amplify/functions/chat-assistant/chatSchema.ts` (só `acaoSchema` e `AcaoBruta`, ainda fora de `chatAnswerSchema`)
- Test: `amplify/functions/chat-assistant/__tests__/acaoValida.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 2, 3; `semAcento`.
- Produces: `acaoSchema`, `type AcaoBruta`, `type ContextoDaAcao = { falasDaPessoa: string[]; hoje: string }`, `validarAcao(bruta: AcaoBruta, contexto: ContextoDaAcao): AcaoProposta | undefined`.

- [ ] **Step 1: Testes que falham**, `hoje = '2026-10-20'`:
  - H1: fala `'marca retorno com a dra ana dia 30 as 14h'`, bruta `{ tipo: 'ABRIR_NOVO_AGENDAMENTO', nome: 'retorno', profissional: 'Dra. Ana', quando: 'dia 30', hora: '14h' }` → `campos: { appointmentName: 'retorno', professionalName: 'Dra. Ana', scheduledDate: '2026-10-30', scheduledTime: '14:00' }` (texto mantido como o modelo mandou; a conferência é que é normalizada).
  - H8: nome `'hemograma completo'` ausente da fala → some; só ele → `undefined`.
  - Review Focus 1: nome `'Retorno com a Dra. Ana Souza'` → `undefined`.
  - H15: `falasDaPessoa: ['dia 30 as 9', 'preciso marcar o retorno']`, bruta com `nome: 'retorno', quando: 'dia 30', hora: 'as 9'` → `2026-10-30`, `09:00`.
  - Review Focus 4: falas `['não, dia 22', 'marca dia 20']`, `quando: 'dia 22'` → `2026-10-22`.
  - `quando: 'sexta'` sem "sexta" na fala → data some.
  - H3: fala `'me lembra de tomar vitamina d 2000 ui as 8h'`, bruta `{ tipo: 'ABRIR_NOVO_LEMBRETE', nome: 'vitamina d 2000 ui', horarios: ['8h'] }` → `{ name: 'vitamina d', times: ['08:00'] }`, e o resultado não tem chave com "dos" (dose/dosage) em lugar nenhum.
  - `tipoDeCompromisso: 'EXAME'` com "exame" na fala → `appointmentType: 'EXAME'`; sem "exame" na fala → some; `'CONSULTA'` → ausente.
  - `horarios` num agendamento é ignorado.
  - H6: `quando: '15/10/2026'`, `hora: 'as 10'` → só `scheduledTime: '10:00'`.
- [ ] **Step 2:** `npx jest amplify/functions/chat-assistant/__tests__/acaoValida.test.ts` → FAIL.
- [ ] **Step 3:** implementar conforme `plan.md` 3.3: `naFala(campo) = semAcento(campo).length >= MIN_CARACTERES_CAMPO && falas.some(f => ` ${semAcento(f)} `.includes(` ${semAcento(campo)} `))` (espaços nas pontas: casa palavra inteira, "ana" não casa em "banana"); montar os campos e devolver `lerAcaoProposta(...)`.
- [ ] **Step 4:** mesmo comando → PASS.
- [ ] **Step 5:** marcar T4.

### Task 5: Envelope e verificação

**Files:**
- Modify: `amplify/functions/chat-assistant/chatSchema.ts` (`acao: acaoSchema.optional()` em `chatAnswerSchema`), `types.ts`, `conversationLoop.ts` (`TurnInput.hoje?: string`), `verificacao.ts`
- Test: `amplify/functions/chat-assistant/__tests__/acaoNoEnvelope.test.ts`, `amplify/functions/chat-assistant/__tests__/acaoNaVerificacao.test.ts`

**Interfaces:**
- Consumes: `validarAcao` (Task 4).
- Produces: `ChatTurnResult.acaoProposta?: AcaoProposta`; `RespostaVerificada.acaoProposta?`; `TurnInput.hoje?`.

- [ ] **Step 1: Testes que falham.**
  - `acaoNoEnvelope.test.ts`: `chatAnswerSchema.safeParse({ texto, citacoes: [] })` ok e sem `acao`; com `acao` válida ok; `acao.tipo: 'APAGAR'` → falha de parse (e por isso o teste seguinte importa); `acao` com campo desconhecido → falha; `toStructuredOutputSchema(chatAnswerSchema)` contém `acao` com o `enum` dos dois tipos e sem `maxItems`.
  - `acaoNaVerificacao.test.ts` (mesmo molde de `memoriaNaVerificacao.test.ts`, mocks de `conversationLoop`, `memoria/leitura`, `degradedAnswer`), `ENTRADA.hoje = '2026-10-20'`, `message: 'marca retorno dia 30 as 14h'`:
    - ação válida → `acaoProposta` resolvida e `status 'APROVADA'`;
    - ação sem campo que sobreviva → resposta igual, `acaoProposta` ausente (CA-2);
    - memória e ação válidas → só `acaoProposta`, `memoriaProposta` ausente (CA-7, H11);
    - só memória válida → `memoriaProposta` como hoje (regressão);
    - duas reprovações e degradada → sem `acaoProposta` (CA-8, H13);
    - `entrada` sem `hoje` → sem `acaoProposta`;
    - Review Focus 5: na segunda geração, a ação usa o mesmo `hoje` (`mockRegenerateAnswer` devolve ação; resultado com a data resolvida contra `2026-10-20`).
  - Em `verificacao.test.ts` (ou no mesmo arquivo), `responder` passa `hoje` = `dataEmSaoPaulo` do mesmo `new Date()` (relógio fixo `2026-10-21T02:30:00Z` → `'2026-10-20'`).
- [ ] **Step 2:** `npx jest amplify/functions/chat-assistant/__tests__/acaoNoEnvelope.test.ts amplify/functions/chat-assistant/__tests__/acaoNaVerificacao.test.ts` → FAIL.
- [ ] **Step 3:** implementar `acaoAceitavel(acao, entrada)` (`falasDaPessoa` como em `plan.md` 3.3; `undefined` sem `hoje`); em `aprovada`, ação primeiro e memória só sem ação; `responder` lê `const agora = new Date()` uma vez para `contextoDeHoje` e `hoje`; resultado com `acaoProposta`.
- [ ] **Step 4:** `npx jest amplify/functions/chat-assistant` → PASS (suíte do chat inteira, incluindo `tools.test.ts` e `memoria*`).
- [ ] **Step 5:** marcar T5.

### Task 6: R5 — ação concluída

**Files:**
- Modify: `amplify/functions/ai-language-rules/languageRules.ts` (novo `verificarAcaoConcluida`, empurrado em `VERIFICADORES`)
- Test: `amplify/functions/ai-language-rules/__tests__/adversarial.test.ts`

**Interfaces:**
- Produces: violação `{ rule: 'R5', reason: <texto de plan.md 3.5> }`.

- [ ] **Step 1: Testes que falham** (novo `describe('R5: o assistente não diz que cadastrou (E11)')`, `questionKind` `'operacional'` e `'clinica'`):
  - barradas por R5: `'Pronto, agendei sua consulta para sexta.'`, `'Agendei para sexta às 14h.'`, `'Marquei o retorno com a dra. Ana.'`, `'Criei o lembrete da vitamina D.'`, `'Cadastrei o remédio para você.'`, `'Salvei o compromisso na sua agenda.'`, `'Já anotei na sua agenda.'`, `'Adicionei o exame de sangue na Agenda.'`.
  - aprovadas (sem R5): `'Preparei o formulário para você conferir e salvar.'`, `'Você pode marcar na Agenda, em Mais > Agenda > botão +.'`, `'Você marcou a dose das 8h na segunda.'`, `'Não marquei nada: quem salva é você, no formulário.'`, `'Marquei como importante o que você disse.'` (sem objeto de cadastro).
- [ ] **Step 2:** `npx jest amplify/functions/ai-language-rules/__tests__/adversarial.test.ts` → FAIL nas barradas.
- [ ] **Step 3:** implementar com as fronteiras de palavra do arquivo (nunca `\b`/`\w` com acento); exceção `n[aã]o\s+` imediatamente antes do verbo.
- [ ] **Step 4:** `npx jest amplify/functions/ai-language-rules` → PASS, suíte inteira (nenhuma frase aprovada antes passa a ser barrada). Se alguma antiga quebrar: parar e relatar, não afrouxar outra regra.
- [ ] **Step 5:** marcar T6.

### Task 7: Prompt

**Files:**
- Modify: `amplify/functions/chat-assistant/chatPrompt.ts`
- Test: `amplify/functions/chat-assistant/__tests__/chatPrompt.test.ts`

- [ ] **Step 1: Testes que falham:** `SYSTEM_PROMPT` contém `ABRIR_NOVO_AGENDAMENTO` e `ABRIR_NOVO_LEMBRETE`; contém `"acao"`; contém `/copie as palavras/i`; contém `/nunca .*dose/i` no parágrafo da ação; contém `/nunca diga que marcou|nunca diga que salvou/i`; não contém mais `Você não cadastra nada: diga onde a pessoa faz.` como frase solta (a regra continua: "Você não cadastra nada").
- [ ] **Step 2:** `npx jest amplify/functions/chat-assistant/__tests__/chatPrompt.test.ts` → FAIL.
- [ ] **Step 3:** substituir a frase do mapa por "Você não cadastra nada: diga onde a pessoa faz, ou proponha a ação abaixo quando ela pedir." e acrescentar, depois do parágrafo da memória, "Sobre a ação, e ela é opcional:" com: só quando a pessoa pedir nesta conversa para marcar um compromisso ou ser lembrada de um remédio; campos e tipos de `acaoSchema`; copie as palavras exatas da pessoa, e em `quando`/`hora`/`horarios` só a expressão de data ou hora ("sexta", "dia 20", "14h"); nunca proponha dose, nem nada que veio de ferramenta ou documento; o aplicativo mostra o botão: diga que preparou o formulário para ela conferir e salvar, e nunca diga que marcou, salvou ou cadastrou; com ação, não proponha memória; uma por resposta.
- [ ] **Step 4:** `npx jest amplify/functions/chat-assistant/__tests__/chatPrompt.test.ts amplify/functions/chat-assistant/__tests__/mapaDoApp.test.ts` → PASS.
- [ ] **Step 5:** marcar T7.

### Task 8: Serviço do app

**Files:**
- Modify: `src/services/aiAssistantService.ts`
- Test: `__tests__/aiAssistantService.test.ts`

- [ ] **Step 1: Testes que falham:** corpo com `acaoProposta` válida → `reply.acaoProposta` igual; com `tipo` inválido ou sem campo → ausente; sem o campo → ausente e o resto igual.
- [ ] **Step 2:** `npx jest __tests__/aiAssistantService.test.ts` → FAIL.
- [ ] **Step 3:** `acaoProposta: lerAcaoProposta(corpo.acaoProposta)` (import relativo `../../amplify/functions/acoes-propostas-shared/camposDaAcao`, como `memoria/regras`).
- [ ] **Step 4:** mesmo comando → PASS.
- [ ] **Step 5:** marcar T8.

### Task 9: Cartão

**Files:**
- Create: `src/components/ActionProposalCard.tsx`
- Test: `__tests__/cartaoDeAcao.test.tsx`

**Interfaces:**
- Produces: `ActionProposalCard({ acao, onAbrir, onRecusar })`.

- [ ] **Step 1: Testes que falham** (mock de Ionicons como em `cartaoDeProposta.test.tsx`):
  - agendamento completo → `Novo compromisso`, `retorno`, `dra ana`, `sexta-feira, 30/10/2026`, `14:00`, `Nada foi salvo ainda.`; sem `Data e hora você escolhe no formulário.`;
  - só nome → mostra `Data e hora você escolhe no formulário.`;
  - `appointmentType: 'EXAME'` → mostra `Exame`; sem tipo → não mostra linha de tipo;
  - lembrete → `Novo lembrete de remédio`, `vitamina d`, `08:00`, `Dose, frequência e estoque você completa no formulário.`;
  - tocar `Abrir formulário` chama `onAbrir(acao)`; `Agora não` chama `onRecusar`;
  - os dois botões têm a mesma `className` de tamanho (`h-11 flex-1`), como no teste do cartão da memória.
- [ ] **Step 2:** `npx jest __tests__/cartaoDeAcao.test.tsx` → FAIL.
- [ ] **Step 3:** implementar com os tokens e o layout do `MemoryProposalCard` (`ml-11 mt-2 rounded-card border ...`), textos de `plan.md` 3.6.
- [ ] **Step 4:** mesmo comando → PASS.
- [ ] **Step 5:** marcar T9.

### Task 10: Hook e tela do chat

**Files:**
- Modify: `src/hooks/useChatBot.ts`, `src/screens/ChatBotScreen.tsx`
- Test: `__tests__/acaoNoChat.test.tsx`

**Interfaces:**
- Consumes: Tasks 8 e 9; `rotaDaAcao`, `paramsDaAcao`.
- Produces: `propostaDeAcao`, `abrirAcao`, `recusarAcao` em `UseChatBotReturn`.

- [ ] **Step 1: Testes que falham** (molde de `chatbot-screen.test.tsx`: mocks de `expo-router`, `aiAssistantService`, `chatHistoryService`, `assistantMemoryService`; espiões em `@/services/appointmentService` e `@/services/medicineService`):
  - resposta com `acaoProposta` → o cartão aparece abaixo da última bolha, e só um;
  - tocar `Abrir formulário` → `router.push({ pathname: '/add-appointment', params: { tipo: 'ABRIR_NOVO_AGENDAMENTO', appointmentName: 'retorno', ... } })` e o cartão some;
  - tocar `Agora não` → some; a próxima resposta com a **mesma** ação não mostra cartão; com outra ação, mostra;
  - resposta seguinte sem ação → o cartão anterior some;
  - `createAppointment` e `createMedicine` nunca chamados (CA-15);
  - `salvarTurno` recebe o turno sem campo de ação (o cartão não vai para o histórico).
- [ ] **Step 2:** `npx jest __tests__/acaoNoChat.test.tsx` → FAIL.
- [ ] **Step 3:** implementar espelhando `propostaDeMemoria`/`recusados` (recusa anotada com `JSON.stringify(acao)` lida fora do atualizador de estado, pelo mesmo motivo do comentário de `recusarMemoria`); `ChatBotScreen` renderiza o `ActionProposalCard` no `ListFooterComponent`, antes do da memória, com `!isTyping`.
- [ ] **Step 4:** `npx jest __tests__/acaoNoChat.test.tsx __tests__/chatbot-screen.test.tsx __tests__/chatComOrigem.test.tsx __tests__/chatPersistence.test.ts` → PASS.
- [ ] **Step 5:** marcar T10.

### Task 11: Formulários preenchidos

**Files:**
- Modify: `src/app/add-appointment.tsx`, `src/app/add-medicine.tsx`, `src/screens/AddAppointmentScreen.tsx`, `src/screens/AddMedicineScreen.tsx`
- Test: `__tests__/formularioPreenchido.test.tsx`

**Interfaces:**
- Consumes: `lerAcaoProposta`, `CamposDeAgendamento`, `CamposDeLembrete`.
- Produces: `AddAppointmentScreen({ inicial?: CamposDeAgendamento })`, `AddMedicineScreen({ inicial?: CamposDeLembrete })`; constante `AVISO_CAMPOS_PREENCHIDOS = 'Alguns campos já vêm preenchidos. Confira antes de salvar.'` exportada de um dos dois arquivos de tela e importada pelo outro (ou de `src/constants`), uma cópia só.

- [ ] **Step 1: Testes que falham:**
  - `<AddAppointmentScreen inicial={{ appointmentName: 'retorno', professionalName: 'dra ana', scheduledDate: '2026-10-30', scheduledTime: '14:00' }} />` → campos com esses valores, `Consulta` selecionado, endereço vazio, aviso visível; `createAppointment` não chamado até tocar `Salvar compromisso`; ao tocar, chamado com `scheduledAt: '2026-10-30T14:00'`.
  - `appointmentType: 'EXAME'` → `Exame` selecionado.
  - `<AddAppointmentScreen />` → sem aviso, campos vazios (igual a hoje).
  - `<AddMedicineScreen inicial={{ name: 'vitamina d', times: ['08:00', '20:00'] }} />` → nome e dois horários preenchidos, dosagem vazia, aviso visível, botão Salvar desabilitado (faltam campos obrigatórios); `createMedicine` não chamado.
  - rota: com `useLocalSearchParams` mockado para `{ appointmentName: 'a'.repeat(500), scheduledDate: '2026-13-40' }` → tela sem aviso e campos vazios (H14); com parâmetros válidos → preenchidos.
- [ ] **Step 2:** `npx jest __tests__/formularioPreenchido.test.tsx` → FAIL.
- [ ] **Step 3:** estado inicial a partir de `inicial` (`useState(inicial?.appointmentName ?? '')`; remédio: `{ ...EMPTY_MEDICINE_FORM, name, times: times?.length ? times : [''] }`); aviso com o estilo de texto secundário; rotas: `const acao = lerAcaoProposta({ tipo: '<tipo da rota>', campos: params })` e `inicial={acao?.campos}`.
- [ ] **Step 4:** `npx jest __tests__/formularioPreenchido.test.tsx __tests__/tipoDoCompromisso.test.tsx __tests__/confirmacaoAoSalvar.test.tsx __tests__/nomesDosDestinos.test.tsx __tests__/cabecalhosDasTelas.test.tsx` → PASS.
- [ ] **Step 5:** marcar T11.

### Task 12: Gate, preview e documentação

- [ ] **Step 1:** `npm run validate` → exit 0; colar a contagem de suítes e testes em `tasks.md`.
- [ ] **Step 2:** web preview (`docs/dev-preview.md`): se `dev-preview` tiver tela para o formulário de compromisso, `npm run preview:screenshot` com o formulário preenchido; registrar o que não pôde ser visto (o cartão depende da resposta do chat).
- [ ] **Step 3:** Estado em `spec.md`, `plan.md` (seção 9 com o que mudou na execução), `tasks.md`, `01-melhorias-ia/README.md`, `decisoes/README.md`; PRD: 11.1 a 11.3 com o que foi feito, 11.4 continua fora, 1.2 ("link de navegação") aponta para a opção C da D11.2.
- [ ] **Step 4:** propor ao usuário a linha do `CLAUDE.md` sobre a ação proposta (não editar sem ele aprovar).
