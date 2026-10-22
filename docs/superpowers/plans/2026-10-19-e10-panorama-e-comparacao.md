# E10 — Panorama e comparação entre domínios: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dar ao chat `consultar_panorama` (contagens e datas de seis assuntos) e `consultar_comparacao` (um exame ao lado da média mensal de sono ou passos), e barrar na R3 frases que ligam dados de saúde por causa.

**Architecture:** cada ferramenta é leitura por `lerDoDono` em `Promise.all` mais um módulo puro `*Saida.ts`. As regras já existentes (série de analito, próxima consulta, dose aplicada, última importação) são exportadas, não copiadas. A frase fixa da comparação é costurada em `verificacao.ts`, no mesmo ponto do encaminhamento da R2. A guarda é um item novo de `PADROES_R3`.

**Tech Stack:** TypeScript, zod, Jest (jest-expo, `TZ=America/Sao_Paulo`), AWS SDK v3 simulado.

**Spec:** `specs/10-finalizacao-codigo/01-melhorias-ia/E10-panorama-e-comparacao/spec.md` · Desenho e contratos: `.../plan.md` (seção 3, que é a fonte dos tipos usados abaixo).

## Global Constraints

- Toda ferramenta tem `readOnly: true` e `inputSchema` `.strict()`, e lê só por `lerDoDono(env, identity, contexto?.leituras)`. O dono vem da identidade.
- Sem `backend.ts` novo, sem schema novo, sem dependência nova.
- Comentários, nomes, testes e textos em pt-BR, com cabeçalho "Resumo do arquivo" nos arquivos novos.
- Frase fixa exata: `Os dados aparecem lado a lado, e isso não mostra se um influenciou o outro.`
- Pares fechados: `dadoDoWearable` ∈ {`sono` → `sleepMinutes`, `passos` → `steps`}. `MAX_PARES = 3`, `MIN_DIAS_DO_MES = 14`.
- O panorama não traz valor de exame, nome de remédio, dose, estoque, observação, endereço, profissional, marcação de dose nem métrica de wearable.
- Nunca enfraquecer `TZ=America/Sao_Paulo` nem os ignores de `.claude/` no `jest.config.js`. Sem commit: o usuário pede quando quiser (memória `sdd-10-branch-unica`).
- O gate é `npm run validate`.

## Review Focus

1. Coleta no dia 1 ou no dia 31: o mês é o do calendário de `dataDaColeta`, em texto (`slice(0, 7)`), nunca por `Date` em UTC. Teste em T5.
2. Importação que cobre o mês por um dia só (`periodEnd` = dia 1): os dias cobertos são contados com as duas pontas incluídas, e menos de 14 não dá média. Teste em T5.
3. `metricsJson` com `monthly` ausente, ou a métrica sem a entrada do mês: wearable nulo com explicação, nunca exceção. Teste em T5.
4. Frase de causa sem assunto de saúde ("remarcada por causa da chuva") e recusa na mesma oração seguida de conector depois de "mas": a primeira passa, a segunda é barrada. Teste em T1.
5. Resposta que já termina com a frase fixa (o modelo a copiou): não duplica. E resposta com a comparação sem par nenhum: não costura. Teste em T7.

---

### Task 1: Guarda de causa na R3

**Files:**
- Modify: `amplify/functions/ai-language-rules/languageRules.ts` (novo item em `PADROES_R3`, perto da linha 880, e a exceção)
- Modify: `amplify/functions/ai-language-rules/rulesPrompt.ts` (R3)
- Test: `amplify/functions/ai-language-rules/__tests__/adversarial.test.ts`

**Interfaces:** Produces: nada exportado novo. `checkLanguageRules` passa a reprovar com `rule: 'R3'` e o motivo do plan.md, seção 5.

- [ ] **Step 1: Escrever o teste que falha.** Novo `describe('causa entre dados (E10, D10.2)')` com dois `it.each`, cada frase nas duas classes (`'clinica'`, `'operacional'`):
  - barradas, `violations` contém `rule: 'R3'` e `reason` casando `/origem no outro/`: as 8 frases da spec C3.1, mais "Não sei sua idade, mas seu sono explica o colesterol." e "Seu peso aumentou por causa do remédio.";
  - aprovadas, nenhuma violação de R3: as 7 frases da spec C3.2, mais "Graças a você, seus dados estão em dia na tela." (sem assunto de saúde) e a frase fixa exata.
- [ ] **Step 2: Rodar e ver falhar.** `npx jest amplify/functions/ai-language-rules/__tests__/adversarial.test.ts -t "causa entre dados"`. Esperado: as barradas FAIL (`ok: true`).
- [ ] **Step 3: Implementar.** Um item em `PADROES_R3` com `padrao` = conector (plan.md, seção 5) com assunto de saúde até 80 caracteres antes ou depois, na mesma frase (`emQualquerOrdem` já existe, ou `janela`). `excecao` = `RECUSA_DE_JULGAR` ampliada com `não (mostra|diz|indica|dá para saber|consigo dizer|sabe explicar) se` e `não sabe explicar`. Na R3 do `LANGUAGE_RULES_PROMPT`, acrescentar à lista do proibido "apresentar um dado de saúde como origem de outro, ou dizer que um tratamento está dando resultado", sem escrever nenhum conector.
- [ ] **Step 4: Rodar e ver passar.** `npx jest amplify/functions/ai-language-rules`. Esperado: PASS em tudo (inclusive `rulesPrompt.test.ts`, em que o prompt passa na própria verificação).

### Task 2: Extrações sem mudança de comportamento

**Files:**
- Modify: `amplify/functions/chat-assistant/tools/analitos.ts`, `tools/consultas.ts`, `tools/vacinasSaida.ts`, `tools/wearable.ts`
- Test: `__tests__/analitosTool.test.ts`, `consultasTool.test.ts`, `vacinasSaida.test.ts`, um `describe` novo em um `wearable` existente (ou `tools.test.ts` se não houver suíte própria)

**Interfaces:** Produces (plan.md, seção 3): `serieDoAnalito(linhas: LinhaDeResultado[], pedido: { analyteCode?: string; termo?: string }): SaidaDoAnalito` e o tipo `SaidaDoAnalito` exportado (união do retorno atual do `run`); `separarConsultas(linhas: LinhaDoBanco[], agora: string): { futuras: ConsultaParaOModelo[]; passadas: ConsultaParaOModelo[] }`, ordenadas por `quando`, sem teto, com `ConsultaParaOModelo` exportado; `dosesAplicadasPorRecencia(linhas: LinhaDoBanco[]): LinhaDoBanco[]`; `ultimaImportacaoPronta(linhas: LinhaDoBanco[]): LinhaDoBanco | null` (a mais recente por `createdAt`, ou `null` se ela não estiver `READY`).

- [ ] **Step 1: Escrever o teste que falha**, um por função:
  - `serieDoAnalito` sem I/O dá o mesmo objeto que `analitosTool.run` sobre as mesmas linhas;
  - `separarConsultas` com 25 futuras devolve as 25 (o teto continua na ferramenta);
  - `dosesAplicadasPorRecencia` ignora dose sem `appliedDate` e desempata pelo número da dose;
  - `ultimaImportacaoPronta` devolve `null` quando a mais recente é `FAILED`, mesmo havendo uma `READY` mais antiga.
- [ ] **Step 2: Rodar e ver falhar** (`not a function`). `npx jest amplify/functions/chat-assistant/__tests__/analitosTool.test.ts amplify/functions/chat-assistant/__tests__/consultasTool.test.ts amplify/functions/chat-assistant/__tests__/vacinasSaida.test.ts`
- [ ] **Step 3: Implementar.** Mover o corpo, sem mudar a lógica. Os `run` e o `montarSaida` passam a chamar as funções.
- [ ] **Step 4: Rodar a suíte inteira do chat e ver passar.** `npx jest amplify/functions/chat-assistant`. Esperado: PASS, com os testes antigos sem nenhuma alteração.

### Task 3: `panoramaSaida.ts`

**Files:** Create `tools/panoramaSaida.ts` · Test `__tests__/panoramaSaida.test.ts`

**Interfaces:** Consumes: T2 (`separarConsultas`, `dosesAplicadasPorRecencia`, `ultimaImportacaoPronta`), `estaEmUso` (`medicamentosSaida.ts`), `momentoEmSaoPaulo`. Produces: `montarPanorama(linhas: LinhasDoPanorama, agora: Date): SaidaDoPanorama`, `renderizarPanorama(saida: unknown): DegradedBlock | null`, `ONDE_VER_DETALHES` (plan.md, seção 3).

- [ ] **Step 1: Escrever o teste que falha.**
  - `vazio`: todas as listas `[]` → `disponivel: false`, e cada seção com `disponivel: false` e `explicacao` não vazia.
  - `completo`: 3 documentos (2 `exam`, 1 `prescription`, `documentDate` 2026-01-10, 2026-05-02, 2026-03-01) e resultados com `collectedAt` 2026-04-28 e 2025-12-01 → `{ total: 3, exames: 2, receitas: 1, coletaMaisRecente: '2026-04-28', registroMaisRecente: '2026-05-02' }`. Remédios `active: true`, `active` ausente e `active: false` → `{ emUso: 2, encerrados: 1 }`. Uma consulta 3 horas à frente de `agora` (2026-10-19T12:00:00-03:00) é a `proxima`, e não passada. Vacinas: `maisRecente` é a de `appliedDate` maior e `registrosAplicados` não conta dose sem data. Wearable `READY` com `periodEnd` 2026-09-30 e `analyzedAt` 2026-10-01T10:00:00Z → `{ dadosAte: '2026-09-30', importadoEm: '2026-10-01' }`.
  - `sem valor clínico`: `JSON.stringify(saida)` do perfil completo não contém `value`, `dose`, `stock`, `observ`, o nome do remédio da fixture nem `metrics`.
  - `wearable não concluiu`: a mais recente `PROCESSING` → `wearable.disponivel === false`.
  - `degradado`: `renderizarPanorama` traz uma linha por seção disponível, e `citacoes: []`.
- [ ] **Step 2: Rodar e ver falhar.** `npx jest amplify/functions/chat-assistant/__tests__/panoramaSaida.test.ts`
- [ ] **Step 3: Implementar** `montarPanorama`, uma função pequena por seção. `ONDE_VER_DETALHES` = `'Para detalhes, chame só se a pessoa pedir: consultar_exames e consultar_resultados (documentos), consultar_medicamentos, consultar_consultas, consultar_vacinas, consultar_wearable.'`. Datas sem hora: `slice(0, 10)`.
- [ ] **Step 4: Rodar e ver passar.**

### Task 4: `consultar_panorama`

**Files:** Create `tools/panorama.ts` · Modify `tools/index.ts` (primeira da lista, com comentário do porquê) · Test `__tests__/panoramaTool.test.ts`, `__tests__/tools.test.ts`

**Interfaces:** Consumes: T3. Produces: `panoramaTool: ChatTool` com `name: 'consultar_panorama'`, `inputSchema: z.object({}).strict()` e `renderDegraded: renderizarPanorama`.

- [ ] **Step 1: Escrever o teste que falha** (SDK simulado como em `examesTool.test.ts`):
  - lê as seis tabelas (`t-doc`, `t-lab`, `t-med`, `t-appt`, `t-vac`, `t-health`), todas com o dono do token;
  - as seis chamadas a `send` saem antes de qualquer uma resolver (um `send` que só resolve depois de contar 6 chamadas);
  - com um `LeiturasDoTurno` compartilhado, `panoramaTool.run` seguido de `examesTool.run` não relê `t-doc` nem `t-lab`;
  - a descrição diz o que NÃO faz;
  - em `tools.test.ts`, as asserções da lista inteira passam com a ferramenta nova, sem mudar as variáveis (as seis já estão lá).
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.** Descrição: `'Resumo geral do que o usuário registrou no aplicativo: quantos documentos, remédios em uso, a próxima consulta, a última vacina e até quando vão os dados de wearable, só com contagens e datas. NÃO traz valores de exame, nomes de remédio nem doses (use a ferramenta de cada assunto), NÃO avalia a saúde e NÃO grava.'`
- [ ] **Step 4: Rodar e ver passar.** `npx jest amplify/functions/chat-assistant/__tests__/panoramaTool.test.ts amplify/functions/chat-assistant/__tests__/tools.test.ts`

### Task 5: `comparacaoSaida.ts`

**Files:** Create `tools/comparacaoSaida.ts` · Test `__tests__/comparacaoSaida.test.ts`

**Interfaces:** Consumes: `SaidaDoAnalito` (T2). Produces: `montarComparacao`, `renderizarComparacao(saida: unknown): DegradedBlock | null` (a última linha é `TEXTO_DA_COMPARACAO`, de T7; se T7 ainda não existir, criar `comparacaoFixa.ts` só com a constante aqui), `AVISO_DO_ALINHAMENTO`, `formatarMediaDoWearable(dado, media): string`.

- [ ] **Step 1: Escrever o teste que falha.** As fixtures de importação usam a forma real de `AnalysisSummary` (`metrics[].metric`, `monthly[].month`, `mean`).
  - C2.1: colesterol 210 em 2026-03-12; importação `READY` de 2026-02-01 a 2026-04-30 com `sleepMinutes` março `mean: 370` → par com `wearable: { mes: '2026-03', media: '6 h 10 min por dia', diasDoMesNaImportacao: 31, diasDoMes: 31 }` e `avisoDoAlinhamento === AVISO_DO_ALINHAMENTO`.
  - Formato: `formatarMediaDoWearable('sono', 360)` → `'6 h por dia'`; `('passos', 7430.4)` → `'7.430 passos por dia'`.
  - C2.3: 5 coletas comparáveis → 3 pares, as mais recentes primeiro, `omitidas: 2`.
  - C2.4: coleta 2025-06-10 e importação só de 2026 → `wearable: null`, e a `explicacaoDoWearable` cita o mês sem dado.
  - C2.5 e Review Focus 2: importação de 2026-03-19 a 2026-03-31 (13 dias) → `null` com explicação "13 dias"; de 2026-03-18 a 2026-03-31 (14) → tem média.
  - Review Focus 1: coleta em `'2026-03-01'` e em `'2026-03-31'` caem em `'2026-03'`.
  - C2.6: duas `READY` cobrindo março, a de `createdAt` maior vence; `FAILED` e `metricsJson: '{quebrado'` são ignoradas.
  - Review Focus 3: `monthly` ausente → `wearable: null` com explicação.
  - C2.7: série `disponivel: false` → repassa `{ disponivel: false, explicacao }`; só não comparáveis → `naoComparaveis` conta e não há par.
  - C2.8: nenhuma importação pronta → `disponivel: false`.
  - C2.12: coletas de dois momentos → cada par traz o seu `momento`.
  - R3: `checkLanguageRules(\`Sono em março: ${media}.\`, { questionKind: 'clinica', temOrigem: true })` não tem violação de R3, para as duas métricas.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.** Mês = `dataDaColeta.slice(0, 7)`. Os dias cobertos são a interseção (as duas pontas inclusas) de `[AAAA-MM-01, último dia]` com `[periodStart, periodEnd]`, contados em UTC a partir das strings. As coletas saem das `series[].coletas` achatadas, ordenadas por `dataDaColeta` decrescente. `AVISO_DO_ALINHAMENTO = 'A média do wearable é do mês inteiro em que o exame foi coletado, e não dos dias antes da coleta.'`
- [ ] **Step 4: Rodar e ver passar.**

### Task 6: `consultar_comparacao`, citação e classificação

**Files:** Create `tools/comparacao.ts` · Modify `tools/index.ts` (logo antes de `wearableTool`), `citacoes.ts`, `verificacao.ts` (`TOOLS_CLINICAS`) · Test `__tests__/comparacaoTool.test.ts`, `citacoes.test.ts`, `tools.test.ts`, `verificacao.test.ts`

**Interfaces:** Consumes: T2 (`serieDoAnalito`), T5. Produces: `comparacaoTool: ChatTool` com `name: 'consultar_comparacao'`, `inputSchema: z.object({ termo: z.string().min(1).max(60), dadoDoWearable: z.enum(['sono', 'passos']) }).strict()`.

- [ ] **Step 1: Escrever o teste que falha.**
  - `runTool('consultar_comparacao', { termo: 'x', dadoDoWearable: 'estresse' })` e com `owner` a mais → `{ erro }`, e nenhuma leitura;
  - lê `t-lab` e `t-health` com o dono do token, as duas antes de qualquer resolver;
  - `indexarLinhasCitaveis([{ name: 'consultar_comparacao', output }])` indexa `pares[].exame.id` com `analyteLabel` = `analito`;
  - em `verificacao.test.ts`, um turno com `consultar_comparacao` e texto sem medida termina com `TEXTO_DE_ENCAMINHAMENTO` (é clínica).
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.** Descrição: `'Mostra um resultado de exame do usuário ao lado da média de sono ou de passos do wearable no mês da coleta, em dois blocos separados, cada um com sua data. NÃO relaciona um com o outro, NÃO diz se um influenciou o outro, NÃO interpreta e NÃO grava.'`
- [ ] **Step 4: Rodar e ver passar.**

### Task 7: Frase fixa costurada

**Files:** Create (ou completar) `comparacaoFixa.ts` · Modify `verificacao.ts` (`entregar` recebe os `toolOutputs` do transcript) · Test `__tests__/comparacaoFixa.test.ts`, `verificacao.test.ts`

**Interfaces:** Produces: `TEXTO_DA_COMPARACAO`, `costurarComparacao(texto, toolOutputs): string`.

- [ ] **Step 1: Escrever o teste que falha.**
  - com um output de `consultar_comparacao` com `disponivel: true` e 1 par → termina com a frase, separada por um espaço;
  - o texto já contém a frase → igual ao de entrada;
  - `pares: []`, `disponivel: false` ou sem a ferramenta → igual ao de entrada;
  - `checkLanguageRules(TEXTO_DA_COMPARACAO, ...)` → `ok`, nas duas classes;
  - em `verificacao.test.ts`, a resposta aprovada termina com `` `${TEXTO_DA_COMPARACAO} ${TEXTO_DE_ENCAMINHAMENTO}` ``, e o mesmo vale para `APROVADA_NA_SEGUNDA`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.** Em `entregar`: primeiro `costurarComparacao` e depois a costura da R2, nos dois caminhos de aprovação. Comentário: por que a frase é do código (mesmo motivo do `encaminhamento.ts`).
- [ ] **Step 4: Rodar e ver passar.** `npx jest amplify/functions/chat-assistant`

### Task 8: Prompt e descrição do wearable

**Files:** Modify `chatPrompt.ts`, `tools/wearable.ts` (descrição) · Test `__tests__/chatPrompt.test.ts`

- [ ] **Step 1: Escrever o teste que falha.** `SYSTEM_PROMPT`:
  - contém `consultar_panorama` e "contagens e datas";
  - não contém mais "como a pessoa está de modo geral, use consultar_resultados";
  - contém `consultar_comparacao`, "mês inteiro" e a instrução de não escrever a frase de que a comparação não mostra causa;
  - contém a proibição de dizer se a pessoa está bem ou mal.
  
  A descrição de `consultar_wearable` contém "NÃO relaciona" e `consultar_comparacao`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar duas linhas no "Como você trabalha"**, e trocar a cláusula de "modo geral" da linha das três ferramentas de exame. O texto não escreve nenhum conector de causa (o modelo imita o que lê).
  - **Panorama:** "Para um resumo geral (como estou, o que tenho registrado), use consultar_panorama: ele traz só contagens e datas. Chame a ferramenta de um assunto só se a pessoa pedir detalhe. Nunca diga se a pessoa está bem ou mal."
  - **Comparação:** "Para ver um exame ao lado do sono ou dos passos, use consultar_comparacao. Mostre os dois blocos separados, cada um com sua data, e diga que a média é do mês inteiro da coleta. Nunca apresente um como origem do outro, nem diga que um tratamento está dando resultado. O aplicativo acrescenta a frase de que a comparação não mostra causa; não a escreva."
- [ ] **Step 4: Rodar e ver passar.**

### Task 9: As 5 perguntas reais de ponta a ponta

**Files:** Test `__tests__/e10PerguntasReais.test.ts`

Mesmo desenho de `verificacao.test.ts`: `runConversationTurn` e `regenerateAnswer` simulados, mas os `toolOutputs` do turno simulado vêm das **ferramentas de verdade** (`runTool`), rodadas sobre o SDK simulado com uma pessoa fictícia. A pessoa tem colesterol de março, sono de fevereiro a abril, 2 remédios, 1 consulta futura e 1 vacina.

- [ ] **Step 1: Escrever os testes.**
  - "me da um resumo da minha saude" → panorama; texto do modelo com contagens → `APROVADA`, sem encaminhamento.
  - "como eu to? faz tempo q nao faco exame?" → panorama; texto com a data da coleta mais recente → `APROVADA`.
  - "compara meu colesterol com meu sono" → comparação; texto com os dois blocos e a citação do id → `APROVADA`, termina com a frase fixa e o encaminhamento.
  - "mostra meus passos junto com a glicemia" → sem glicemia registrada → `disponivel: false`; texto honesto → `APROVADA`.
  - "meu sono causou meu colesterol alto?" → a primeira geração escreve "Seu sono curto pode ter causado o colesterol alto." → reprovada pela R3. A segunda geração honesta → `APROVADA_NA_SEGUNDA`. Se a segunda insiste → `DEGRADADA`, e o texto degradado não contém a frase de causa.
- [ ] **Step 2: Rodar.** `npx jest amplify/functions/chat-assistant/__tests__/e10PerguntasReais.test.ts`. Esperado: PASS. Se falhar, a causa está em T1 a T8. Não afrouxar o teste.

### Task 10: Fechamento

- [ ] **Step 1:** `npm run validate`. Esperado: typecheck, typecheck:backend, lint e test:ci verdes. Colar a saída real.
- [ ] **Step 2:** conferir a lista da seção 8 do PROMPT-PADRAO e atualizar `tasks.md` (estado, contagem de testes), o `README.md` da parte, `decisoes/README.md` e o `prd.md` (10.1 e 10.2 entregues; a janela de 28 dias espera o E6.2).
- [ ] **Step 3:** propor ao usuário a atualização do trecho "Chat assistant" do `CLAUDE.md` (duas ferramentas novas, guarda de causa). Sem commit até ele pedir.
