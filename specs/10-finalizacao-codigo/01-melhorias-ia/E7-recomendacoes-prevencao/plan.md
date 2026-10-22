# PLAN: E7 — Recomendações de prevenção no chat

Estado: **aprovado e entregue em 2026-10-17** (desvios na seção 5a) · Spec: [`spec.md`](./spec.md) (aprovada em 2026-10-17) · Plano passo a passo: `docs/superpowers/plans/2026-10-17-e7-prevencao-chat.md`

## 1. Resumo do desenho

O chat ganha a ferramenta `consultar_prevencao`. Ela lê o perfil do dono (`lerDoDono`), obtém o dataset **público** da USPSTF (cache em memória por container) e filtra com o **mesmo** código da tela, agora em um módulo compartilhado. Devolve ao modelo um resumo enxuto, com teto e contagem do que ficou de fora. O modelo adapta o texto para português (D7.2). Nada é gravado, nenhum schema muda.

```
 pergunta ─► modelo ─► consultar_prevencao ─► lerDoDono(UserProfile)      (dono = token)
                              │
                              ├─► prevencaoDataset (cache TTL, promessa em voo) ─► uspstf-shared/fetchUspstfDataset ─► USPSTF (público)
                              │
                              └─► uspstf-shared/filterRecommendations  ◄── o MESMO que get-prevention-recommendations/handler.ts usa
                                     │
                                     └─► prevencaoSaida (puro): ordena por nota, aplica tetos, monta saída
```

## 2. Arquivos

| Arquivo | Ação | Responsabilidade (um motivo só para mudar) |
|---|---|---|
| `amplify/functions/uspstf-shared/uspstfClient.ts` | **move** de `get-prevention-recommendations/` | Tipos do dataset e `fetchUspstfDataset(apiKey, opcoes?)`. Ganha `opcoes.timeoutMs` opcional. |
| `amplify/functions/uspstf-shared/uspstfFilter.ts` | **move** | Idade, faixa de IMC, sexo e `filterRecommendations`. Sem mudança de lógica. |
| `amplify/functions/uspstf-shared/__tests__/uspstfFilter.test.ts` | **move** | Os testes que existem hoje, sem editar asserção. |
| `amplify/functions/uspstf-shared/__tests__/uspstfClient.test.ts` | nasce | Falhas do cliente: status não-2xx, JSON inválido, timeout. |
| `amplify/functions/get-prevention-recommendations/handler.ts` | muda 2 linhas de import | Passa a importar do módulo compartilhado. |
| `amplify/functions/get-prevention-recommendations/__tests__/handler.test.ts` | nasce **antes** do refactor | Teste de caracterização: fixa a saída da Lambda (CA-2). |
| `amplify/functions/chat-assistant/tools/prevencaoDataset.ts` | nasce | Cache do dataset público: TTL, promessa em voo, falha não cacheada. |
| `amplify/functions/chat-assistant/tools/prevencaoSaida.ts` | nasce, **puro** | Ordenar por nota, truncar, aplicar tetos, montar a saída. Sem I/O. |
| `amplify/functions/chat-assistant/tools/prevencao.ts` | nasce | `ChatTool`: orquestra perfil + dataset + filtro + saída, e `renderDegraded`. |
| `amplify/functions/chat-assistant/tools/index.ts` | muda | Registra em `CHAT_TOOLS`, depois de `vacinasTool`. |
| `amplify/functions/chat-assistant/verificacao.ts` | muda 1 linha | `consultar_prevencao` em `TOOLS_CLINICAS`. |
| `amplify/functions/chat-assistant/chatPrompt.ts` | muda | Quando usar a ferramenta e como apresentar. |
| `amplify/functions/chat-assistant/resource.ts` | muda | `environment: { USPSTF_API_KEY: secret('USPSTF_API_KEY') }`. |
| `amplify/backend.ts` | **não muda** | `UserProfile` já está no laço de `grantReadData`; o segredo entra pelo `resource.ts`. Conferido no T10. |
| `amplify/functions/ai-language-rules/languageRules.ts` e testes | muda (D7.3 = A) | Dois padrões novos na R3 (indicação individual de exame; "em dia/atrasado"). Ver seção 5. |

`src/` e `amplify/data/` **não são tocados** (regra 5 e RT7).

## 3. Contratos

```ts
// uspstf-shared/uspstfClient.ts
export function fetchUspstfDataset(apiKey: string, opcoes?: { timeoutMs?: number }): Promise<UspstfDataset>;
// Lança em: rede, status não-2xx, JSON inválido, dataset sem `specificRecommendations` (array), timeout.
// Sem `opcoes`, o comportamento é o de hoje (a Lambda da tela não muda).

// tools/prevencaoDataset.ts
export const TTL_DATASET_MS: number;                       // 10 * 60 * 1000
export function obterDataset(apiKey: string, agora?: () => number,
  buscar?: (k: string) => Promise<UspstfDataset>): Promise<UspstfDataset>;
export function limparCacheDoDataset(): void;              // só para teste

// tools/prevencaoSaida.ts  (puro)
export const MAX_RECOMENDACOES = 12;
export const MAX_CARACTERES_TEXTO = 400;
export type RecomendacaoParaOModelo = {
  nota: string; significadoDaNota: string; titulo: string; texto: string;
  ano: string | null; tema: string | null;
  faixaEtaria: { de: number; ate: number } | null;
  sexo: string | null; imc: string | null;
};
export type SaidaPrevencao = {
  disponivel: true; fonte: 'USPSTF'; atualizadoEm: string | null;
  totalQueCasam: number; omitidas: number;
  filtrosAplicados: { idade: true; sexo: boolean; imc: boolean };
  recomendacoes: RecomendacaoParaOModelo[];
};
export function montarSaida(dataset: UspstfDataset, casam: UspstfSpecificRecommendation[],
  filtros: SaidaPrevencao['filtrosAplicados']): SaidaPrevencao;

// tools/prevencao.ts
export const prevencaoTool: ChatTool;   // name 'consultar_prevencao'
```

Saídas sem dado, todas `{ disponivel: false, explicacao }`: **sem perfil**, **falha da fonte**, **nenhuma recomendação casa**, **perfil com data de nascimento inválida**. As quatro explicações são distintas e sem termo técnico.

## 4. Decisões de desenho, com o porquê

1. **Cache fica no chat, não no módulo compartilhado.** A Lambda da tela não ganha cache: mudar o comportamento dela está fora do escopo e o `handler` precisa continuar idêntico (CA-2). O módulo compartilhado fica com o que as duas partes realmente dividem (cliente e filtro).
2. **Cacheia-se a promessa, não só o resultado** (mesmo padrão de `gradeTextCache` do handler da tela). Dois turnos simultâneos num container frio fazem uma só requisição. Rejeição é removida do cache.
3. **TTL de 10 minutos.** O dataset da USPSTF muda raramente e o cache vive só no container quente; 10 min limita a defasagem sem cache persistente. Número a recalibrar se a medição (CA-14) mostrar outra coisa.
4. **Timeout de 8 s na chamada externa.** O laço tem até 6 iterações dentro de 120 s; uma fonte lenta não pode consumir o orçamento. Falha por timeout vira ausência de dado, igual às demais.
5. **Ordenação por nota:** A, B, D, C, I (alterada na revisão, ver 5a); nota desconhecida por último; estável dentro da mesma nota. Nota D ("recomenda contra") e I ("evidência insuficiente") **não são escondidas**, porque esconder seria mostrar uma lista que parece completa. O `significadoDaNota` vem do `gradeText` do dataset e é o que impede o modelo de ler "D" como "faça".
6. **Teto de 12 itens e 400 caracteres por texto**, e sem `rationale`. Cada recomendação em inglês ocupa algumas centenas de tokens; 12 × ~100 tokens de texto cabem no contexto sem ameaçar o limite de 6 iterações, e a tela continua sendo o lugar do texto completo. Texto cortado termina em `…`.
7. **Data de nascimento inválida** (`computeAge` daria `NaN`, e as comparações com `NaN` não excluem ninguém): a ferramenta recusa com `disponivel: false` em vez de devolver tudo. `birthDate` é obrigatório no schema, então é caso raro, mas o resultado de ignorá-lo seria uma lista inteira apresentada como "a sua".
8. **Segredo ausente** (`USPSTF_API_KEY` vazio) é tratado como falha da fonte, com `console.error` sem o valor.
9. **O que vai ao modelo nunca inclui idade, IMC ou peso calculados.** Só quais filtros foram aplicados. É a regra de `perfil.ts` ("nada calculado"), preservada.
10. **Registro da nova ferramenta:** depois de `vacinasTool`, antes de `wearableTool` não importa; fica no fim da lista de domínios de cadastro, antes do wearable, e a descrição contrasta com `consultar_perfil` e `consultar_vacinas`.

## 5. Lacuna achada ao planejar: a verificação não barra "você deve fazer" (D7.3, decidida: A)

Sondagem feita em 2026-10-17 sobre `checkLanguageRules` (pergunta clínica, com encaminhamento no fim):

| Texto | Resultado hoje |
|---|---|
| "Você deve fazer mamografia a cada dois anos." | **aprovado** |
| "Você precisa fazer colonoscopia." | **aprovado** |
| "Você está em dia com a prevenção." | **aprovado** |
| "No seu caso a faixa aplicável é a de 50 a 74 anos." | reprovado (R3) |
| "A USPSTF recomenda mamografia (nota B, 2024) para mulheres de 40 a 74 anos." | aprovado (correto) |

O critério CA-18 da spec afirmava que as três primeiras eram reprovadas. **Não são.** Hoje a única barreira contra "você deve fazer X" é o prompt. Isso não nasceu com o E7, mas o E7 é o épico que mais expõe a frase.

**D7.3 — o que fazer:**
- **A (recomendada):** acrescentar à R3 um padrão estreito para indicação individual de exame ("você deve/precisa/tem que/deveria fazer|realizar|marcar + exame/rastreamento") e para "você está em dia/atrasado(a)" com prevenção. É **reforço**, não enfraquecimento, e entra por TDD com casos que devem passar (a recomendação geral bem formada) e que devem reprovar. Risco: falso positivo em resposta legítima ("você precisa preencher o perfil"); mitigação: o padrão exige verbo de fazer exame + objeto de exame, e há teste dos dois lados.
- **B:** não mexer na R3; reforçar só o prompt e testar o prompt. Mais simples, mas a regra de linguagem continua sem barrar a frase mais perigosa do tema.
- **C:** tratar como épico próprio depois (E7 entrega com a lacuna registrada).

**Decisão D7.3: Opção A**, escolhida pelo produto em 2026-10-17. O T9 está desbloqueado. O CA-18 da spec foi corrigido para dizer o que é verdadeiro em cada opção; com a opção A, todos os casos de indicação individual passam a ser reprovados.

## 5a. Desvios do plano, registrados na implementação (2026-10-17)

1. **Encaminhamento é do aplicativo (T7).** O plano dizia que a resposta de prevenção sem encaminhamento seria reprovada pela R2 e que o prompt mandaria encaminhar. O código (decisões A2/C3, `encaminhamento.ts`) costura a frase fixa e proíbe o modelo de escrevê-la. Ficou assim: `consultar_prevencao` em `TOOLS_CLINICAS` → a resposta sai com `TEXTO_DE_ENCAMINHAMENTO`; o prompt não fala em encaminhar.
2. **Ordem das notas: A, B, D, C, I** (revisão). A D ("recomenda contra") era cortada primeiro pelo teto, e é informação de segurança. A e B continuam primeiro (CA-10).
3. **`textoCortado`** na saída e no prompt (revisão): o modelo adaptava um trecho como se fosse a recomendação inteira.
4. **R3 de prevenção redesenhada** (revisão): o exame precisa ser o objeto do verbo; três formas (obrigação + verbo de exame; "precisa de"; imperativo/subjuntivo); vacina fora do "em dia"; agenda antes do "em dia" não conta; pergunta absolve o "em dia".
5. **Exceção de recusa só na mesma oração, e verificação de todas as ocorrências** (revisão). Mexe no verificador compartilhado da R3, não só nos padrões novos. É reforço; todos os testes anteriores das regras continuam verdes.
6. **Perfil lido antes do dataset** (T6), e não em paralelo: o dataset só vale com perfil válido.
7. **Reuso de `numero`** de `linhasDeResultado.ts` (revisão): a cópia local aceitava `Infinity`.

## 6. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Dataset grande ou USPSTF lenta | Cache, timeout, falha vira ausência de dado; CA-14 mede e o épico volta ao usuário se passar do limite. **Limite de parada proposto:** resposta da USPSTF acima de 5 MB ou latência acima de 4 s no sandbox. |
| Refactor quebra a tela | T1 grava um teste de caracterização **antes** de mover qualquer arquivo; `git mv` preserva histórico. |
| Segredo adicionado ao chat | Um acréscimo de superfície, comentado no `resource.ts`; não é lido por nenhuma outra ferramenta e nunca vai a log. |
| Modelo apresenta lista como indicação | Prompt + R2 (clínica) + D7.3 + `filtrosAplicados` + `significadoDaNota`. |
| Modelo adapta mal um termo médico | Aceito pela D7.2; mitigado por nota/ano/fonte sempre citados e pelo texto original disponível na tela. |
| Duas formas de "perfil" no chat (`consultar_perfil` e esta) divergem | A ferramenta lê só 4 campos de `UserProfile` por `lerDoDono`, e nunca os devolve. |

## 7. Impacto em desempenho e custo

- Caso quente: nenhuma chamada externa; 1 `Scan` do perfil (como as outras ferramentas).
- Caso frio: +1 requisição HTTP (≤ 8 s) em paralelo com a leitura do perfil.
- Tokens: ≤ 12 itens × (título + 400 caracteres + metadados) por chamada, mais ~150 tokens de prompt de sistema em todo turno (única parte que o custo toca em conversas sem prevenção).

## 8. Constituição

- Regra 3: nenhuma biblioteca nova; `fetch` nativo e `AbortSignal.timeout`.
- Regra 4: o conteúdo é recomendação geral de fonte externa, sempre com encaminhamento; ver seção 5.
- Regra 5 e RT7: sem schema novo, contrato da query intacto, sem dado novo guardado.
- Regra 8: a ambiguidade (lista pode incluir outros grupos) está documentada e tratada por `filtrosAplicados`, sem travar a entrega.
