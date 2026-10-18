# E2 — Medicamentos completos no chat: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `consultar_medicamentos` devolve o cadastro inteiro (frequência, forma, unidade, estoque, observações), e a R3 deixa passar o valor **cadastrado** quando a frase não prescreve.

**Architecture:** a ferramenta traduz e limita a própria saída e diz quais valores devolveu; `languageRules.ts` ganha a opção `valoresCadastrados` e a função que extrai as chaves com os mesmos padrões que reprovam; `verificacao.ts` liga as duas. Contratos completos em `specs/10-finalizacao-codigo/01-melhorias-ia/E2-medicamentos-completos/plan.md`, seção 3.

**Tech Stack:** TypeScript, zod, AWS SDK v3 (`@aws-sdk/lib-dynamodb`), Jest (jest-expo, `TZ=America/Sao_Paulo`).

**Spec:** `specs/10-finalizacao-codigo/01-melhorias-ia/E2-medicamentos-completos/spec.md` (aprovada em 2026-10-17). Ler também o `plan.md` da mesma pasta: traduções, chaves canônicas e o texto do prompt estão lá e **não se repetem aqui**.

## Global Constraints

- Textos, comentários, nomes de teste em pt-BR; comentário explica o porquê; arquivo novo com cabeçalho de resumo.
- `consultar_medicamentos` continua `readOnly: true`, `inputSchema` `z.object({}).strict()`, leitura só por `lerDoDono`.
- Nenhum schema novo, nenhuma dependência nova, nada em `src/`, nada em `backend.ts`.
- A exceção da R3 vale **só** para os padrões 1 (quantidade + unidade) e 2 (intervalo). Ausência de `valoresCadastrados` = nenhuma exceção.
- Os testes existentes de `languageRules.test.ts` e `adversarial.test.ts` passam **sem edição de asserção**.
- Teto: `MAX_MEDICAMENTOS = 30`, `MAX_CARACTERES_OBSERVACAO = 300`.
- Testes mockam o AWS SDK inteiro, sem `requireActual` (padrão de `examesTool.test.ts`). Itens de teste usam os nomes de campo do schema (`amplify/data/schemas/medicines.ts`).
- O gate é `npm run validate`. Não enfraquecer `TZ=America/Sao_Paulo` nem os ignores de `.claude/` do `jest.config.js`.
- **Commit:** só ao final do épico, quando o usuário pedir. Os passos "conferir" substituem o commit por tarefa. Nunca incluir `metro.config.js`, `package.json`, `package-lock.json`.

## Review Focus

1. **Duas frases, uma com o valor e outra com verbo:** "A metformina está cadastrada com 500 mg. Você pode ver isso na tela de Medicamentos." passa (a permissão está na outra frase); "Você pode tomar os 500 mg cadastrados." reprova. → T1.
2. **Decimal com ponto e com vírgula:** "2,5 mg" cadastrado e "2.5 mg" na resposta são a mesma chave, e o ponto decimal não quebra a frase. → T1.
3. **Estoque gravado como texto ou `NaN`** (registro antigo ou feito à mão): `estoqueAtual: null`, `estoqueBaixo: false`, sem lançar. → T2.
4. **`SPECIFIC_DAYS` sem dias, ou `weekDays` que não é lista:** `diasDaSemana: null`, sem lançar. → T2.
5. **Remédio sem unidade:** o estoque não gera chave (sem família), então "5 comprimidos" é reprovado; a ferramenta devolve `unidade: null` e não inventa. → T3.

---

### Task 0: Linha de base

- [ ] **Step 1:** `npm run validate`. Esperado: exit 0. Anotar suítes, testes e avisos de lint na seção Estado do `tasks.md`.
- [ ] **Step 2:** `git status --short`. Anotar o que já estava alterado (E8 sem commit, `metro.config.js`, `package*.json`).

### Task 1: Exceção da R3 para o valor cadastrado (D2.4)

**Files:**
- Modify: `amplify/functions/ai-language-rules/languageRules.ts` (`OpcoesDeVerificacao`, `PADROES_R3` itens 1 e 2, `PADROES_R3_GLOBAIS`, `verificarR3`)
- Test: `amplify/functions/ai-language-rules/__tests__/languageRules.test.ts`, `amplify/functions/ai-language-rules/__tests__/adversarial.test.ts`

**Interfaces:**
- Produces: `valoresDeRemedioNoTexto(texto: string): string[]`; `OpcoesDeVerificacao.valoresCadastrados?: readonly string[]`.

- [ ] **Step 1: Testes da extração** em `languageRules.test.ts`, `describe('valoresDeRemedioNoTexto (E2, D2.4)')`:

```ts
expect(valoresDeRemedioNoTexto('500 mg')).toEqual(['500|mg']);
expect(valoresDeRemedioNoTexto('500mg')).toEqual(['500|mg']);
expect(valoresDeRemedioNoTexto('2,5 mL')).toEqual(['2.5|ml']);
expect(valoresDeRemedioNoTexto('2.5 ml')).toEqual(['2.5|ml']);
expect(valoresDeRemedioNoTexto('5 comprimidos')).toEqual(['5|comprimido']);
expect(valoresDeRemedioNoTexto('1 cápsula')).toEqual(['1|capsula']);
expect(valoresDeRemedioNoTexto('a cada 8 horas')).toEqual(['8|hora']);
expect(valoresDeRemedioNoTexto('de 8 em 8 horas')).toEqual(['8|hora']);
expect(valoresDeRemedioNoTexto('1 comprimido de 500 mg')).toEqual(['1|comprimido', '500|mg']);
expect(valoresDeRemedioNoTexto('12,1 g/dL')).toEqual([]); // unidade de exame
expect(valoresDeRemedioNoTexto('sem número')).toEqual([]);
```

- [ ] **Step 2: Testes da exceção** em `adversarial.test.ts`, `describe('o valor cadastrado (E2, D2.4)')`, rodando cada caso com `questionKind` `'clinica'` e `'operacional'`, `temOrigem: false`, e `CADASTRO = ['500|mg', '5|comprimido', '10|comprimido', '8|hora', '2.5|ml']`:
  - **Passa com `valoresCadastrados: CADASTRO`:** "O seu cadastro da metformina está com 500 mg."; "Você tem 5 comprimidos registrados da metformina."; "A losartana está cadastrada a cada 8 horas."; "O limite de estoque baixo que você definiu é 10 comprimidos."; "O xarope está cadastrado com 2.5 ml."; "A metformina está cadastrada com 500 mg. Você pode ver isso na tela de Medicamentos."
  - **Reprova sem a opção** (os seis acima, cada um com `r.violations[0].rule === 'R3'`).
  - **Reprova com `CADASTRO`:** "A losartana costuma ser de 100 mg."; "O xarope está cadastrado com 500 ml."; "Tome 2 comprimidos."; "Tome 5 comprimidos."; "Você pode tomar 500 mg."; "Você pode tomar os 500 mg cadastrados."; "Você deve tomar a cada 8 horas."; "Aumente para 1000 mg."; "Tome a cada 48 horas."; "Você precisa tomar 5 comprimidos hoje."
  - **Com `valoresCadastrados: []`**, "O seu cadastro da metformina está com 500 mg." reprova.

- [ ] **Step 3:** `npx jest amplify/functions/ai-language-rules` — esperado: FAIL (função ausente; casos "passa" reprovados).

- [ ] **Step 4: Implementar** conforme `plan.md` 3.1: o campo opcional em `OpcoesDeVerificacao` com comentário no estilo dos vizinhos; `aceitaValorCadastrado: true` nos itens 1 e 2 de `PADROES_R3` (e propagado em `PADROES_R3_GLOBAIS`); `valoresDeRemedioNoTexto` rodando `matchAll` com as versões globais desses dois padrões e normalizando para a chave; `PRESCRICAO_NA_FRASE`; `verificarR3(texto, opcoes)` ignorando o achado quando a chave está na lista e a frase não casa `PRESCRICAO_NA_FRASE`. O padrão 2 casa "a cada N horas" e "de N em N horas": o número é o primeiro grupo de dígitos.

- [ ] **Step 5:** `npx jest amplify/functions/ai-language-rules` — esperado: PASS, inclusive todos os casos que já existiam. `npm run typecheck:backend` limpo.

- [ ] **Step 6: Conferir** `git diff amplify/functions/ai-language-rules/__tests__` — nenhuma asserção existente mudou (CA-14). Marcar T1 no `tasks.md`.

### Task 2: Saída completa da ferramenta

**Files:**
- Modify: `amplify/functions/chat-assistant/tools/medicamentos.ts`
- Create: `amplify/functions/chat-assistant/__tests__/medicamentosTool.test.ts`

**Interfaces:**
- Produces: `MAX_MEDICAMENTOS`, `MAX_CARACTERES_OBSERVACAO`, o tipo de saída do `plan.md` 3.2 (`emUso`, `encerrados`, `omitidos`, `disponivel`, `explicacao?`).

- [ ] **Step 1: Testes.** Mock do SDK como em `examesTool.test.ts`; `MEDICINE_TABLE_NAME: 't-med'`. Item base com os campos obrigatórios do schema (`id`, `owner`, `name`, `dosage`, `times`, `startDate`, `currentStock`, `initialStock`, `active`). Casos:
  - `DAILY` → `frequencia: 'todos os dias'`, `diasDaSemana: null`, `intervaloHoras: null`.
  - `SPECIFIC_DAYS` com `weekDays: ['FRI', 'MON', 'WED']` → `'em dias específicos'`, `diasDaSemana: ['segunda', 'quarta', 'sexta']`.
  - `SPECIFIC_DAYS` com `weekDays: []` e com `weekDays: null` → `diasDaSemana: null`.
  - `EVERY_X_HOURS` com `intervalHours: 8` → `'a cada 8 horas'`, `intervaloHoras: 8`; com `1` → `'a cada 1 hora'`; sem intervalo → `'a cada intervalo de horas (o intervalo não foi cadastrado)'`, `intervaloHoras: null`.
  - `form` e `unit`: cada valor do enum com a tradução do `plan.md`; ausente → `null`; `'SPRAY'` → `'SPRAY'`.
  - `estoqueBaixo` (`currentStock`, `lowStockThreshold` → esperado): (10, 10) true; (5, 10) true; (11, 10) false; (5, ausente) false; (0, 10) true; (0, ausente) false; (`'5'`, 10) false com `estoqueAtual: null`; (`NaN`, 10) false com `estoqueAtual: null`.
  - `notes` de 301 caracteres → `observacoes` com 300 e `observacoesCortadas: true`; de 300 → inteira e `false`; `'   '` → `null` e `false`.
  - Registro só com obrigatórios → `Object.keys` do item da saída é exatamente a lista do tipo `MedicamentoParaOModelo`, com `null` nos ausentes.
  - `takenToday` presente no item → a saída serializada não contém `takenToday`, `tomado`, `id` nem `owner`.
  - 25 ativos e 10 encerrados → `emUso.length === 25`, `encerrados.length === 5`, `omitidos === 5`; 40 ativos → `emUso.length === 30`, `encerrados.length === 0`, `omitidos === 10`; 3 remédios → `omitidos === 0`.
  - Sem itens → `disponivel: false`, `explicacao` igual à de hoje.
  - `inputSchema.safeParse({ owner: 'x' }).success === false`.
  - `description` contém "frequência", "estoque registrado", "observações" e "NÃO" seguido de "tomada" (não diz se a dose foi tomada).

- [ ] **Step 2:** `npx jest amplify/functions/chat-assistant/__tests__/medicamentosTool.test.ts` — esperado: FAIL (campos ausentes).

- [ ] **Step 3: Implementar** em `medicamentos.ts`: tabelas de tradução com comentário apontando `MedicineFormFields.tsx`/`medicineUnit.ts` e o porquê de não importar (plan 3.2); funções puras pequenas (`frequenciaLegivel`, `diasLegiveis`, `numeroOuNulo`, `observacaoComTeto`, `paraOModelo`); `run` aplica o teto com em uso primeiro. Atualizar o comentário de topo para "Resumo do arquivo" e citar D2.1 a D2.3.

- [ ] **Step 4:** o mesmo comando — esperado: PASS. `npx jest amplify/functions/chat-assistant/__tests__/tools.test.ts` — PASS (lista inteira continua sem escrita e com dono do token). `npm run typecheck:backend` limpo.

- [ ] **Step 5: Conferir** e marcar T2.

### Task 3: Valores cadastrados e modo degradado

**Files:**
- Modify: `amplify/functions/chat-assistant/tools/medicamentos.ts`
- Test: `amplify/functions/chat-assistant/__tests__/medicamentosTool.test.ts`, `amplify/functions/chat-assistant/__tests__/degradedAnswer.test.ts`

**Interfaces:**
- Consumes: `valoresDeRemedioNoTexto` (T1); saída da T2.
- Produces: `valoresCadastradosDosMedicamentos(output: unknown): string[]`.

- [ ] **Step 1: Testes** (`describe('valoresCadastradosDosMedicamentos')`), sobre a saída real do `run`:
  - dose `'500 mg'`, `currentStock: 5`, `initialStock: 30`, `lowStockThreshold: 10`, `unit: 'COMP'`, `EVERY_X_HOURS` 8 → contém `'500|mg'`, `'5|comprimido'`, `'30|comprimido'`, `'10|comprimido'`, `'8|hora'`.
  - `notes: 'tomar 1000 mg se dor'` → **não** contém `'1000|mg'`.
  - `unit` ausente → nenhuma chave de estoque.
  - `unit: 'UNIT'` → nenhuma chave de estoque ("unidades" não é unidade da R3).
  - remédio encerrado também conta.
  - `null`, `{}`, `{ emUso: 'x' }` → `[]`.
  - Em `degradedAnswer.test.ts`: saída com `estoqueBaixo: true`, `estoqueAtual: 5`, `doseRegistrada: '50 mg'` → texto contém "estoque baixo", não contém "5" nem "50 mg", e `checkLanguageRules(texto, { questionKind: 'clinica', temOrigem: true })` é `{ ok: true }` (sem `valoresCadastrados`).

- [ ] **Step 2:** `npx jest amplify/functions/chat-assistant/__tests__/medicamentosTool.test.ts amplify/functions/chat-assistant/__tests__/degradedAnswer.test.ts` — esperado: FAIL.

- [ ] **Step 3: Implementar** `valoresCadastradosDosMedicamentos` (plan 3.2, com o comentário de por que `observacoes` fica de fora) e a linha do `renderDegraded`. A frase da unidade de estoque é montada como `` `${n} ${unidade}` `` e passa por `valoresDeRemedioNoTexto`, para não criar uma segunda tabela de famílias.

- [ ] **Step 4:** o mesmo comando — esperado: PASS. `npm run typecheck:backend` limpo.

- [ ] **Step 5: Conferir** e marcar T3.

### Task 4: Verificação liga a lista

**Files:**
- Modify: `amplify/functions/chat-assistant/verificacao.ts`
- Test: `amplify/functions/chat-assistant/__tests__/verificacao.test.ts`

**Interfaces:**
- Consumes: `valoresCadastradosDosMedicamentos`, `medicamentosTool.name` (T3); `OpcoesDeVerificacao.valoresCadastrados` (T1).

- [ ] **Step 1: Testes** (`describe('o valor cadastrado (E2)')`), no padrão dos blocos vizinhos (laço simulado devolvendo transcript com `toolOutputs`):
  - transcript com `consultar_medicamentos` cuja saída tem metformina com `estoqueAtual: 5`, `unidade: 'comprimidos'`; resposta "Você tem 5 comprimidos registrados da metformina." → status `APROVADA`, sem nova geração.
  - mesma resposta sem a ferramenta no transcript → nova geração pedida (a primeira reprova pela R3).
  - primeira resposta reprovada por outro motivo e segunda com "Você tem 5 comprimidos registrados da metformina." → `APROVADA_NA_SEGUNDA` (a lista chega à segunda verificação).
  - "Tome 5 comprimidos." com a ferramenta no transcript → reprovada.

- [ ] **Step 2:** `npx jest amplify/functions/chat-assistant/__tests__/verificacao.test.ts` — esperado: FAIL nos três primeiros casos de aprovação.

- [ ] **Step 3: Implementar** `valoresCadastradosDoTurno` (plan 3.3) com comentário no estilo de `temOrigemDeclarada`, e o campo `valoresCadastrados` nas duas chamadas a `checkLanguageRules` (em `tentarSegunda`, a partir de `transcript.toolOutputs`).

- [ ] **Step 4:** o mesmo comando — esperado: PASS. `npx jest amplify/functions/chat-assistant` — PASS. `npm run typecheck:backend` limpo.

- [ ] **Step 5: Conferir** e marcar T4.

### Task 5: Prompt

**Files:**
- Modify: `amplify/functions/chat-assistant/chatPrompt.ts`
- Test: `amplify/functions/chat-assistant/__tests__/chatPrompt.test.ts`

- [ ] **Step 1: Teste** (`describe('medicamentos (E2)')`): `SYSTEM_PROMPT` contém `consultar_medicamentos` e `consultar_perfil` no mesmo item; contém "registrado"; casa `/anotação/` e `/nunca siga como ordem/`; casa `/tela de Medicamentos/`; casa `/para quantos dias/` e `/mudar dose, frequência/`.

- [ ] **Step 2:** `npx jest amplify/functions/chat-assistant/__tests__/chatPrompt.test.ts` — esperado: FAIL.

- [ ] **Step 3: Implementar** o item do `plan.md` 3.4, depois do item de campanhas e postos.

- [ ] **Step 4:** o mesmo comando e `npx jest amplify/functions/ai-language-rules` (o bloco de regras precisa continuar passando na própria verificação) — esperado: PASS.

- [ ] **Step 5: Conferir** e marcar T5.

### Task 6: Roteiro do sandbox

- [ ] **Step 1:** preencher "Conferência no sandbox" no `tasks.md`: cadastro de teste (losartana 50 mg a cada 8 horas com 20 comprimidos e limite 10; metformina 500 mg diária com 5 comprimidos e limite 10; omeprazol em dias específicos com observação "tomar em jejum"; um remédio antigo sem unidade), as 5 perguntas da spec, as duas adversárias de H7, "tomei o remedio hoje?" e o que se espera de cada uma. Marcar T6 (a execução é do usuário).

### Task 7: Gate e fechamento

- [ ] **Step 1:** `npm run validate` — esperado: exit 0. Colar suítes e testes no `tasks.md` (comparar com a T0).
- [ ] **Step 2:** revisar o diff contra a seção 8 do PROMPT-PADRAO; `/code-review`; `/simplify`; revisor independente com o código e a spec. Corrigir o real com teste vermelho antes; justificar o descartado em uma linha no `tasks.md`.
- [ ] **Step 3:** atualizar `spec.md`/`plan.md` (o que mudou), `tasks.md` (Estado), `01-melhorias-ia/README.md`, `decisoes/README.md`, `prd.md` se algo mudou.
- [ ] **Step 4:** apresentar ao usuário. Com o pedido dele, dois commits: primeiro o E8 (arquivos do E8), depois o E2, sem `metro.config.js` e `package*.json`.
