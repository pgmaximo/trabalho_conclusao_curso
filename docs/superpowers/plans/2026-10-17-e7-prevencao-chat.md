# E7 — Prevenção no chat: plano de implementação

> **Para quem executa:** use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`. Os passos usam `- [ ]` para acompanhamento.

**Objetivo:** dar ao chat a ferramenta `consultar_prevencao`, que devolve as recomendações da USPSTF aplicáveis ao perfil, filtradas pelo mesmo código da tela de Prevenção.

**Arquitetura:** o cliente e o filtro da USPSTF saem de `get-prevention-recommendations` para `uspstf-shared/`. O chat lê o perfil por `lerDoDono`, obtém o dataset público por um cache em memória, filtra e monta uma saída enxuta (teto de itens, contagem do que ficou de fora). O modelo adapta o texto para português (D7.2).

**Stack:** TypeScript, Jest (`jest-expo`), zod, AWS Amplify Gen 2. Nenhuma dependência nova.

**Spec:** `specs/10-finalizacao-codigo/01-melhorias-ia/E7-recomendacoes-prevencao/spec.md` · **Plano de desenho:** `plan.md` na mesma pasta (contratos completos na seção 3).

## Restrições globais

- Textos, comentários e testes em pt-BR; cabeçalho "Resumo do arquivo" em cada arquivo novo.
- Ferramenta: `readOnly: true`, `inputSchema` `z.object({}).strict()`, perfil só por `lerDoDono`, nome `consultar_*`, descrição com "NÃO".
- Sem `Scan` novo, sem schema novo, sem mudança em `src/`, sem dependência nova.
- `jest.config.js` não é tocado (`TZ=America/Sao_Paulo` e ignores de `.claude/`).
- Mocks do AWS SDK **inteiros**, sem `requireActual` (ver `tools.test.ts`).
- Valores fixados pela spec: 12 itens, 400 caracteres, TTL 10 min, timeout 8 s.
- Comandos: `npx jest <arquivo>` para um teste; `npm run typecheck:backend`; `npm run validate` como gate.

## Foco da revisão (entradas que a spec implica e nenhuma tarefa exercita sozinha)

1. Dataset sem `specificRecommendations` ou com o campo não-array → falha tratada, não `TypeError` (T3, T6).
2. `birthDate` inválida → `NaN` não exclui ninguém e devolveria a lista inteira (T6).
3. Recomendação sem `ageRange`, `general` ou `rationale`; `text` vazio ou enorme (T5).
4. Nota desconhecida, "D" (contra) e "I" (insuficiente): aparecem, ordenadas por último, com `significadoDaNota` (T5).
5. Duas perguntas simultâneas num container frio → uma só requisição (T4).

---

### Tarefa 0: Preparação

- [ ] **Passo 1:** criar o worktree `feat/e7-prevencao-chat` (skill `superpowers:using-git-worktrees`) a partir da `main`. As mudanças não commitadas da `main` (`metro.config.js`, `package*.json`) **não** vão junto, e isso é desejado.
- [ ] **Passo 2:** `npm install` se o worktree não tiver `node_modules`; rodar `npm run validate`. Esperado: verde. Anotar no `tasks.md` a contagem de testes e suítes. Se estiver vermelho na linha de base, **parar e avisar** antes de qualquer mudança.

### Tarefa 1: Teste de caracterização do handler da tela

**Arquivos:** criar `amplify/functions/get-prevention-recommendations/__tests__/handler.test.ts`.

**Interfaces:** consome `handler` de `../handler`. Produz a prova de CA-2.

- [ ] **Passo 1:** escrever o teste. Mocks: `@aws-sdk/client-dynamodb` e `@aws-sdk/lib-dynamodb` (`ScanCommand` como classe com `input`, `send` controlável), `../translateClient` (`translateToPortuguese: async (t) => (t ? \`PT:${t}\` : null)`), e `global.fetch` devolvendo um dataset fixo de 3 recomendações (uma por faixa etária/sexo diferentes, uma com `general`). `process.env.USER_PROFILE_TABLE_NAME` e `USPSTF_API_KEY` definidos. Casos, com asserção sobre o objeto devolvido inteiro (`toEqual`):
  - `handler sem identidade lanca 'Usuario nao autenticado.'`
  - `perfil inexistente devolve { recommendations: [], lastUpdated: '', profileComplete: false }` e **não** chama `fetch`
  - `perfil feminino de 45 anos devolve só as recomendações que casam, com os campos *Pt traduzidos, topic, citationYear, ageMin/ageMax, sex e bmi`
  - `lastUpdated vem do dataset`
- [ ] **Passo 2:** `npx jest amplify/functions/get-prevention-recommendations`. Esperado: **PASSA** (é caracterização do código atual; um teste que falha aqui está descrevendo errado o comportamento e deve ser corrigido até casar). Commit: `test(e7): caracteriza a saida da Lambda de prevencao antes do refactor`.

### Tarefa 2: Extrair `uspstf-shared/`

**Arquivos:** `git mv` de `uspstfClient.ts`, `uspstfFilter.ts` e `__tests__/uspstfFilter.test.ts` para `amplify/functions/uspstf-shared/` (e `uspstf-shared/__tests__/`); modificar `get-prevention-recommendations/handler.ts` (imports) e os imports relativos do teste movido.

**Interfaces:** produz os mesmos símbolos exportados de antes, agora em `../uspstf-shared/uspstfClient` e `../uspstf-shared/uspstfFilter`. Cabeçalho "Resumo do arquivo" no topo de cada um dizendo que a tela e o chat dividem o filtro e por quê.

- [ ] **Passo 1:** `git mv` dos três arquivos; ajustar os imports. Não editar nenhuma asserção.
- [ ] **Passo 2:** `npx jest amplify/functions` e `npm run typecheck:backend`. Esperado: T1 e os testes do filtro **verdes**.
- [ ] **Passo 3:** teste novo em `uspstf-shared/__tests__/compartilhamento.test.ts`: lê `handler.ts` e afirma `toMatch(/from '\.\.\/uspstf-shared\/uspstfFilter'/)`, e afirma que `get-prevention-recommendations/uspstfFilter.ts` e `uspstfClient.ts` **não existem** (`fs.existsSync`). Roda verde. Commit: `refactor(e7): extrai uspstf-shared sem mudar o comportamento da tela`.

### Tarefa 3: Cliente com timeout e falhas tipificadas

**Arquivos:** modificar `uspstf-shared/uspstfClient.ts`; criar `uspstf-shared/__tests__/uspstfClient.test.ts`.

**Interfaces:** `fetchUspstfDataset(apiKey: string, opcoes?: { timeoutMs?: number }): Promise<UspstfDataset>`.

- [ ] **Passo 1:** testes com `global.fetch` simulado: status 500 lança; JSON inválido (`json()` rejeita) lança; corpo sem `specificRecommendations` array (`{}` e `{ specificRecommendations: 'x' }`) lança; sem `opcoes`, `fetch` é chamado **sem** `signal`; com `timeoutMs: 50`, `fetch` recebe um `signal` e uma implementação que nunca resolve rejeita em até ~200 ms (usar `AbortSignal` real); a URL contém `key=` com a chave codificada. A mensagem do erro de status não contém a chave.
- [ ] **Passo 2:** rodar; esperado FALHAR (validação do corpo e `signal` não existem).
- [ ] **Passo 3:** implementar: `signal: AbortSignal.timeout(timeoutMs)` só quando `timeoutMs` vier; validar que `specificRecommendations` é array depois do `json()`. Mensagens sem a chave.
- [ ] **Passo 4:** rodar `npx jest amplify/functions` (T1 continua verde: a Lambda não passa `opcoes`). Commit.

### Tarefa 4: Cache do dataset

**Arquivos:** criar `chat-assistant/tools/prevencaoDataset.ts` e `chat-assistant/__tests__/prevencaoDataset.test.ts`.

**Interfaces:** conforme `plan.md` seção 3: `TTL_DATASET_MS = 600_000`, `obterDataset(apiKey, agora = Date.now, buscar = (k) => fetchUspstfDataset(k, { timeoutMs: 8000 }))`, `limparCacheDoDataset()`.

- [ ] **Passo 1:** testes com `buscar` espião e `agora` controlado: duas chamadas dentro do TTL → `buscar` 1 vez; chamada em `TTL + 1` → 2 vezes; `buscar` que rejeita → a chamada seguinte tenta de novo (rejeição não fica); duas chamadas **simultâneas** (sem `await` entre elas) → `buscar` 1 vez; `limparCacheDoDataset` zera.
- [ ] **Passo 2:** rodar; esperado FALHAR (módulo não existe).
- [ ] **Passo 3:** implementar guardando `{ promessa, expiraEm }` em variável de módulo; remover da variável quando a promessa rejeitar. Comentário no topo: o que se guarda é dado **público**, nunca algo do usuário, e por que a promessa é cacheada.
- [ ] **Passo 4:** rodar; passar. Commit.

### Tarefa 5: Montagem da saída (pura)

**Arquivos:** criar `chat-assistant/tools/prevencaoSaida.ts` e `chat-assistant/__tests__/prevencaoSaida.test.ts`.

**Interfaces:** `montarSaida` e tipos do `plan.md` seção 3. Consome `resolveGeneral` e `resolveGradeText` de `uspstf-shared`.

- [ ] **Passo 1:** testes sobre um dataset fabricado:
  - 15 recomendações casam → `recomendacoes.length === 12`, `omitidas === 3`, `totalQueCasam === 15`
  - notas `['I','B','A','D','C','X']` saem na ordem `A,B,C,D,I,X`; duas "B" mantêm a ordem de entrada
  - `text` de 1000 caracteres sai com 400 e termina em `…`; `text` de 400 sai igual, sem `…`
  - o objeto serializado **não contém** as chaves `rationale`, `id`, `titlePt`, `textPt` (checar `JSON.stringify`)
  - `significadoDaNota` vem de `resolveGradeText`; vazio vira texto neutro, nunca omitido
  - sem `ageRange` → `faixaEtaria: null`; sem `general` → `ano: null`, `tema: null`
  - `filtrosAplicados` é repassado como veio; `atualizadoEm` é `lastUpdated` ou `null`
- [ ] **Passo 2:** FALHAR; **Passo 3:** implementar (ordenação estável com índice original como desempate); **Passo 4:** passar. Commit.

### Tarefa 6: A ferramenta

**Arquivos:** criar `chat-assistant/tools/prevencao.ts` e `chat-assistant/__tests__/prevencaoTool.test.ts`.

**Interfaces:** `prevencaoTool: ChatTool`. Consome `lerDoDono`/`texto` (`ownerScopedRead`), `obterDataset`, `filterRecommendations`/`computeAge`/`computeBmiBucket`/`mapSex` (`uspstf-shared`), `montarSaida`.

- [ ] **Passo 1:** testes (mesmo molde de mocks do `tools.test.ts`; `mockSend` do Scan, `buscar` do cache controlado via `jest.mock('../tools/prevencaoDataset')`):
  - sem perfil → `{ disponivel: false, explicacao }` e `obterDataset` **não** chamado
  - `birthDate: 'lixo'` → `disponivel: false`, `obterDataset` não chamado
  - `obterDataset` rejeita → `disponivel: false`, sem lançar; a explicação não contém "USPSTF" nem "HTTP" nem "status"
  - `USPSTF_API_KEY` ausente → mesmo resultado de falha da fonte
  - nenhuma recomendação casa → `disponivel: false` com explicação **diferente** da de falha
  - perfil feminino, 45 anos, 70 kg, 165 cm → `disponivel: true`, `filtrosAplicados` `{ idade: true, sexo: true, imc: true }`
  - sexo `Outro` → `sexo: false`; sem `weightKg` → `imc: false`
  - a chave de API é o **único** dado passado a `obterDataset`; nenhum campo do perfil nem o dono aparece em seus argumentos (CA-9, também confirmando que `fetch` nunca recebe esses valores quando o cache é real)
  - `inputSchema.safeParse({ owner: 'x' })` e `({ idade: 50 })` falham
  - para o mesmo perfil e dataset, os `titulo`s devolvidos correspondem, na ordem de nota, aos que `filterRecommendations` devolve (CA-3, equivalência com o handler)
  - saída serializada não contém `birthDate`, `weightKg`, `heightCm`, nem número de IMC ou idade
- [ ] **Passo 2:** FALHAR. **Passo 3:** implementar `run`: `lerDoDono` e `obterDataset` em `Promise.all` **apenas depois** de validar que há perfil (perfil primeiro, para não gastar a chamada externa sem necessidade; a leitura do perfil é barata e o dataset só é buscado se houver perfil válido); `try/catch` em volta do dataset, `console.error` sem a chave. Descrição: o que faz e "NÃO indica exame individual, NÃO diz se a pessoa precisa fazer, NÃO diz se está em dia e NÃO agenda". **Passo 4:** passar. Commit.

> Nota de desenho: a spec pede paralelismo de leituras independentes. Aqui elas **não são** independentes (o dataset só vale a pena com perfil válido), e a decisão fica registrada no comentário do arquivo: o caso mais frequente de perfil ausente não custa chamada externa.

### Tarefa 7: Registro, classificação clínica e modo degradado

**Arquivos:** modificar `tools/index.ts` (registrar depois de `vacinasTool`), `verificacao.ts` (`TOOLS_CLINICAS`), `tools/prevencao.ts` (`renderDegraded`), `__tests__/tools.test.ts` (acrescentar `USPSTF_API_KEY` ao ambiente de teste), `__tests__/verificacao.test.ts`.

- [ ] **Passo 1:** testes: `tools.test.ts` existente continua verde com a ferramenta nova na lista (nenhuma escreve; descrição tem "NÃO"; toda consulta usa o dono do token); novo caso em `verificacao.test.ts`: resposta que usou `consultar_prevencao` é clínica e sai APROVADA com `TEXTO_DE_ENCAMINHAMENTO` costurado (correção de 2026-10-17: o encaminhamento é do aplicativo, A2/C3, e a R2 sozinha costura em vez de reprovar); `renderDegraded` com saída de 2 recomendações devolve bloco com `linhas` no formato `Nota B · <título> · 2024`, `citacoes: []`; sem recomendações ou saída `disponivel: false` devolve `null`; nenhuma linha contém número que a R3 reprovaria (aplicar `checkLanguageRules` às linhas).
- [ ] **Passo 2:** FALHAR. **Passo 3:** implementar. **Passo 4:** `npx jest amplify/functions/chat-assistant`. Commit.

### Tarefa 8: Prompt

**Arquivos:** modificar `chatPrompt.ts`, `__tests__/chatPrompt.test.ts`.

- [ ] **Passo 1:** testes sobre `SYSTEM_PROMPT`: contém `consultar_prevencao`; contrasta com `consultar_perfil` e `consultar_vacinas` (menciona as duas); diz "recomendação geral"; manda citar nota, ano e fonte; manda avisar quando `filtrosAplicados` tiver `false`; manda dizer que a versão em português é uma adaptação não oficial do texto original em inglês; manda não dizer "você deve", "você precisa" nem "você está em dia". **Não** manda o modelo encaminhar: o encaminhamento é do aplicativo (A2/C3), e o prompt já diz "não escreva esse encaminhamento" (correção de 2026-10-17, na T7).
- [ ] **Passo 2:** FALHAR. **Passo 3:** acrescentar **um** bullet curto em "Como você trabalha" (prompt maior custa em todo turno). **Passo 4:** passar; rodar o teste `toda tool citada dentro de uma descricao existe`. Commit.

### Tarefa 9: Reforço da R3 (D7.3 = A, decidida em 2026-10-17)

Arquivos: `ai-language-rules/languageRules.ts`, `__tests__/languageRules.test.ts`, `__tests__/adversarial.test.ts`, `chat-assistant/__tests__/verificacao.test.ts`.

- [ ] **Passo 1:** testes que **devem reprovar (R3)**: "Você deve fazer mamografia a cada dois anos.", "Você precisa fazer colonoscopia.", "Você tem que realizar o exame de rastreamento.", "Você está em dia com a prevenção.", "Você está atrasada nos exames preventivos.". Testes que **devem aprovar**: "A USPSTF recomenda mamografia (nota B, 2024) para mulheres de 40 a 74 anos. Converse com seu médico.", "Você precisa preencher o perfil de saúde no aplicativo.", "Se você tem dúvida, converse com seu médico.", "Eu não posso dizer se você está em dia." (recusa de julgar, `RECUSA_DE_JULGAR`).
- [ ] **Passo 2:** FALHAR (os primeiros cinco). **Passo 3:** novo item em `PADROES_R3` que exige verbo de obrigação + verbo de fazer exame + objeto de exame, e um segundo para "está em dia/atrasad[oa]" ligado a prevenção/exame; reutilizar `INI_R3`/`FIM_R3` e `excecao: RECUSA_DE_JULGAR`; `motivo` sem escrever o termo vetado. Testar **com acento** (`\b` sem flag `u`). **Passo 4:** rodar a suíte inteira de `ai-language-rules` e `chat-assistant`: nenhum teste anterior pode mudar. Commit.

### Tarefa 10: Infraestrutura

**Arquivos:** modificar `chat-assistant/resource.ts`; conferir `amplify/backend.ts`.

- [ ] **Passo 1:** teste em `tools.test.ts` (ou arquivo próprio) que lê `resource.ts` e afirma `USPSTF_API_KEY` com `secret(`; e que `backend.ts` não contém `grantReadWriteData` nem `grantWriteData` para `chatAssistantLambda`.
- [ ] **Passo 2:** FALHAR. **Passo 3:** `import { defineFunction, secret } from '@aws-amplify/backend'` e `environment: { USPSTF_API_KEY: secret('USPSTF_API_KEY') }`, com comentário: por que o chat precisa do segredo (D7.1), que é o mesmo segredo da tela, e que nenhuma outra ferramenta o lê. Conferir no `backend.ts` que `userProfileTable` está no laço de `grantReadData` (está). **Passo 4:** passar; `npm run typecheck:backend`. Commit.

### Tarefa 11: Roteiros de medição e conferência manual

- [ ] **Passo 1:** preencher a seção "Conferência no sandbox" do `tasks.md` com: (a) medir tamanho (bytes) e latência da resposta da USPSTF no sandbox e comparar com o limite de parada do `plan.md` (5 MB / 4 s); (b) rodar as 5 perguntas da spec e conferir texto puro, nota, ano, fonte, encaminhamento, e ausência de "você deve"; (c) conferir o aviso de `filtrosAplicados` com um perfil sem peso. Dizer que isso **não** foi executado pelo agente.

### Tarefa 12: Gate e fechamento

- [ ] **Passo 1:** `npm run validate`; colar o resultado.
- [ ] **Passo 2:** revisar o diff contra a lista da seção 8 do PROMPT-PADRAO; `/code-review`; `/simplify`; uma leitura de subagente com o código (não a conclusão).
- [ ] **Passo 3:** atualizar `tasks.md`, `plan.md` (desvios), `01-melhorias-ia/README.md` e `decisoes/README.md`. Parar e apresentar ao usuário.

---

## Autorrevisão

- **Cobertura da spec:** CA-1/2 → T1,T2; CA-3 → T2,T6; CA-4 → T7; CA-5..9, 11 → T6; CA-10,12 → T5; CA-13 → T4; CA-14 → T11; CA-15,16 → T7; CA-17 → T8; CA-18 → T7 (R2, bem formado) e T9 (condicional); CA-19 → T10; CA-20 → T12.
- **Consistência de nomes:** `obterDataset`, `limparCacheDoDataset`, `montarSaida`, `prevencaoTool`, `fetchUspstfDataset(apiKey, opcoes?)` usados igual em todas as tarefas.
- **Desvio da spec, declarado:** a spec dizia "leituras independentes em paralelo"; no T6 perfil e dataset são sequenciais de propósito (dataset só com perfil válido). Registrar na revisão do `plan.md` se aprovado.
