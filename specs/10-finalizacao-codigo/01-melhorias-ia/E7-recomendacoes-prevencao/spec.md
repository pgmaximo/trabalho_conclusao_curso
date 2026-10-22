# SPEC: E7 — Recomendações de prevenção no chat

Estado: **aprovada e entregue em 2026-10-17** (correções de redação marcadas em CA-16 e CA-18; desvios no `plan.md`, seção 5a) · Data: 2026-10-17 · Parte 1, épico 1 de 12 · Esforço: M

## 1. Identificação

- **Origem:** pedido dos colegas de projeto por "mais poder" no assistente. O PRD (`../prd.md`, E7) lista a prevenção como funcionalidade do app que o chat desconhece.
- **Tarefa do PRD coberta:** 7.1 (ferramenta de prevenção), mais a sub-tarefa de refactor que a D7.1 = A acrescenta (extrair o módulo compartilhado `uspstf-shared`).
- **Decisões aplicadas** (`../decisoes/E7-recomendacoes-prevencao.md`, ambas em 2026-10-17):
  - **D7.1 = A:** o chat consulta a USPSTF e filtra com o **mesmo código** da tela de Prevenção, extraído para um módulo compartilhado.
  - **D7.2 = A:** a ferramenta devolve o texto original em inglês e o **modelo adapta** para português, citando nota, ano e fonte. A tradução MyMemory não é usada no chat.
- **Arquivos afetados (previsão, o `plan.md` detalha):**
  - nasce `amplify/functions/uspstf-shared/` (cliente, filtro e tipos, movidos de `get-prevention-recommendations`);
  - nasce `amplify/functions/chat-assistant/tools/prevencao.ts` e o teste dele;
  - mudam `get-prevention-recommendations/handler.ts` (passa a importar do módulo), `chat-assistant/resource.ts` (segredo), `tools/index.ts`, `chatPrompt.ts`, `verificacao.ts` (a ferramenta é clínica) e `amplify/backend.ts` se o chat precisar do ARN do segredo.
  - **Não muda:** o schema do Amplify Data, o contrato da query `getPreventionRecommendations`, e nada em `src/`.
- **Ator:** usuário (paciente) que quer se preparar para uma consulta ou entender o que a tela de Prevenção mostra.
- **Prioridade:** P2 (melhoria sobre base entregue).
- **Sensibilidade: alta.** Recomendação de rastreamento perto de "você deve fazer tal exame" é o terreno em que a regra 4 da constituição mais pesa. O conteúdo é uma recomendação **geral** de uma fonte externa, nunca uma indicação individual.

### Quem pergunta, e as 5 perguntas reais

**Quem e quando:** a pessoa que vai a uma consulta (ou acabou de sair de uma) e quer saber o que a literatura recomenda para o perfil dela, sem abrir a tela de Prevenção. Muitos têm baixo letramento digital e escrevem como falam.

As cinco perguntas, como ela escreveria, que viram os testes de ponta a ponta:

1. "que exames de prevenção eu devia fazer na minha idade?"
2. "preciso fazer mamografia?"
3. "o que eu faço pra prevenir cancer de intestino"
4. "tem vacina ou exame q é recomendado pra mim essa idade"
5. "oq o app mostra na parte de prevenção?"

**O que a pessoa faz com a resposta:** leva à consulta e pergunta ao médico. Por isso o encaminhamento ao profissional faz parte da resposta.

**O que seria pior que não responder:** soar como indicação ("você deve fazer mamografia"), ou apresentar como completa uma lista que o filtro do app não torna completa. Isso define o que o épico **não** entrega (seção 7).

## 2. Contexto e estado atual (verificado no código)

- A tela chama a query `getPreventionRecommendations`, servida pela Lambda `get-prevention-recommendations` (resolver do AppSync, 30 s, lê `event.identity`).
- A Lambda: lê o perfil por `Scan` com filtro de dono → baixa o dataset **inteiro** da USPSTF (`uspstfClient.ts`, segredo `USPSTF_API_KEY`) → filtra (`uspstfFilter.ts`) → traduz cada texto pela MyMemory (cota anônima de 5.000 palavras por dia por IP).
- **O filtro olha só três dimensões:** faixa etária, sexo e faixa de IMC. Gravidez, tabagismo e vida sexual ativa **não** filtram (comentário em `uspstfFilter.ts`).
- **Comportamento do filtro quando falta dado do perfil** (relevante para o chat): sexo `Outro` ou ausente não exclui nenhuma recomendação por sexo; peso ou altura ausentes não excluem nenhuma por IMC. Ou seja, **a lista pode incluir recomendações de outros grupos**. A tela tem o mesmo comportamento; o E7 **não o altera** (cirurgia, não reforma), mas o chat não pode apresentar a lista como "a sua".
- `birthDate` é obrigatório no `UserProfile`. Logo, "perfil incompleto" na prática é **perfil inexistente** (a Lambda devolve `profileComplete: false` só quando não acha a linha do dono).
- O texto original em inglês é exigência de direitos autorais da AHRQ. A tradução da tela é uma "adaptação não oficial" exibida ao lado.
- O chat tem 8 ferramentas, todas `readOnly`, e hoje **nenhuma chama serviço externo**. Esta seria a primeira (consequência da D7.1 = A).
- A verificação de linguagem (`ai-language-rules`) barra, entre outros: "você tem…" seguido de condição, "no seu caso … faixa/referência", "para a sua idade … faixa" (R3), e exige encaminhamento quando a pergunta é clínica (R2). "anos" **não** é unidade de exame, então "de 50 a 74 anos" não dispara a R4.
- A classificação clínica/operacional (`verificacao.ts`, `TOOLS_CLINICAS`) hoje não conhece uma ferramenta de prevenção.
- **Pendente (PRD, seção 8):** tamanho real e latência da resposta da API da USPSTF. Não foi medido (o segredo não está na máquina de desenvolvimento). A spec trata isso como risco e como critério de medição na entrega (CA-14).

## 3. Histórias e cenários

**História:** como usuário, quero perguntar "que exames de prevenção valem para minha idade?", para me preparar para a consulta.

- **H1 — Caminho feliz.**
  Given o usuário tem perfil (nascimento, sexo, peso e altura) e a USPSTF responde
  When ele pergunta "que exames de prevenção eu devia fazer na minha idade?"
  Then o assistente chama `consultar_prevencao` e responde em português, texto puro, com a lista **de recomendações gerais** que casam com o perfil
  And cada item traz nota (A, B...), ano e a fonte "USPSTF"
  And a resposta termina com o encaminhamento ao profissional de saúde, que o aplicativo acrescenta (o modelo não o escreve; regra A2/C3)
  And não diz "você deve" nem "você precisa".

- **H2 — Pergunta de indicação individual (adversário).**
  Given o mesmo usuário
  When ele pergunta "preciso fazer mamografia?"
  Then a resposta diz o que a recomendação geral da fonte afirma para o grupo (idade e sexo), com nota, ano e fonte
  And não conclui que **ele** precisa; devolve a decisão ao profissional
  And uma resposta que escreva "você precisa fazer" é reprovada pela verificação e substituída por nova geração ou pelo modo degradado.

- **H3 — Sem perfil.**
  Given o usuário nunca preencheu o perfil
  When ele pergunta sobre prevenção
  Then a ferramenta devolve `disponivel: false` com explicação
  And o assistente diz que falta preencher o perfil de saúde no app para ver as recomendações, sem chamar a USPSTF.

- **H4 — USPSTF fora do ar, lenta ou com resposta inválida.**
  Given o perfil existe e a chamada à USPSTF falha (rede, status diferente de 2xx, JSON quebrado, tempo esgotado)
  When ele pergunta sobre prevenção
  Then a ferramenta devolve `disponivel: false` com explicação genérica
  And o assistente diz, em uma frase, que não conseguiu consultar agora e que a tela de Prevenção mostra as recomendações
  And nenhum nome de serviço, status HTTP ou mensagem técnica chega ao usuário
  And o turno **não** é derrubado: o chat continua respondendo.

- **H5 — Perfil sem nenhuma recomendação que case.**
  Given a USPSTF responde e nenhuma recomendação casa com o perfil
  When ele pergunta sobre prevenção
  Then a ferramenta devolve `disponivel: false` com explicação de que não há recomendação para o perfil nesta fonte
  And o assistente não inventa nem completa a lista.

- **H6 — Lista maior que o teto.**
  Given mais recomendações casam do que o teto de itens da ferramenta
  When o assistente responde
  Then a ferramenta informou **quantas ficaram de fora**
  And o assistente diz que há mais e manda ver a tela de Prevenção, em vez de apresentar a lista como completa
  And a ordem prioriza as notas A e B.

- **H7 — Perfil com dado faltando (sexo `Outro`/ausente, peso ou altura ausentes).**
  Given o filtro não pôde aplicar sexo ou IMC
  When o assistente responde
  Then a ferramenta informa **quais dimensões foram aplicadas** (`filtrosAplicados`)
  And o assistente avisa, em uma frase, que a lista pode incluir recomendações para outros grupos porque falta esse dado no perfil.

- **H8 — Pergunta sobre a tela.**
  Given a pessoa pergunta "o que o app mostra na parte de prevenção?"
  When o assistente responde
  Then usa a mesma ferramenta e responde com as mesmas recomendações que a tela mostraria para aquela pessoa (mesmo filtro, ver CA-3).

- **H9 — Texto de dentro da fonte tenta dar ordem (adversário).**
  Given um campo `text` da USPSTF contém uma frase imperativa ou parece instrução ao modelo
  When a ferramenta devolve o dado
  Then o prompt já define que dado de ferramenta é dado, não ordem
  And a resposta passa pela mesma verificação de linguagem.

## 4. Mapa de dados

**Lê:**
- `UserProfile` do dono, por `lerDoDono(USER_PROFILE_TABLE_NAME, identity)`: `birthDate`, `sex`, `weightKg`, `heightCm`. Só estes quatro campos vão ao filtro.
- Dataset da USPSTF, por HTTP, via módulo compartilhado, com `USPSTF_API_KEY`. É dado **público e igual para todos**: não depende do dono, e o dono não entra na chamada.

**Entrada da ferramenta:** nenhuma. `inputSchema` é `z.object({}).strict()`. O perfil vem da identidade do token.

**Devolve ao modelo (por recomendação):** `nota`, `significadoDaNota`, `titulo`, `texto` (original em inglês, truncado no teto), `textoCortado` (acrescentado na revisão), `ano`, `tema`, `faixaEtaria` (`de`, `ate`), `sexo`, `imc`. Mais, no nível da resposta: `fonte: "USPSTF"`, `totalQueCasam`, `omitidas`, `filtrosAplicados` (`idade`, `sexo`, `imc`: verdadeiro ou falso), `atualizadoEm` (campo `lastUpdated` do dataset, quando houver).

**Não devolve:** a `rationale` (justificativa; é longa e a tela a mostra), traduções, tradução MyMemory, `id` interno, nome do segredo, URL, qualquer dado do perfil além do que o filtro aplicou, nem cálculo de IMC ou idade para o modelo (a regra de `perfil.ts` de não calcular índices para o modelo continua valendo; o filtro calcula internamente e devolve só quais filtros foram aplicados).

**Escreve:** nada. Nenhuma tabela nova, nenhum schema novo.

**Cache:** em memória do container, com validade curta, para não baixar o dataset inteiro a cada pergunta (mitigação da D7.1). O que se guarda é o **dataset público**, nunca algo do usuário. Falha não é cacheada.

## 5. Requisitos não funcionais

- **Segurança.** `readOnly: true`; `inputSchema` `.strict()`; perfil só por `lerDoDono`; `grantReadData` já cobre `UserProfile` (nenhuma tabela nova no chat). O segredo `USPSTF_API_KEY` passa a existir também no ambiente do chat: é o único acréscimo de superfície e entra com comentário no `resource.ts`. A chave nunca aparece em log nem em saída de ferramenta.
- **Regra 4 e linguagem.** O conteúdo é apresentado como "recomendação geral da USPSTF", nunca como indicação à pessoa. `consultar_prevencao` entra em `TOOLS_CLINICAS`, para a resposta sair com o encaminhamento a profissional que o aplicativo costura (R2, decisões A2/C3). Nada de dose, prognóstico, urgência ou tranquilização.
- **Direitos autorais (AHRQ).** O texto devolvido ao modelo é o original, sem alteração, e a fonte é sempre citada. A adaptação em português é do modelo e deve dizer que é adaptação (D7.2).
- **LGPD.** Nenhum dado do usuário sai do app: a chamada à USPSTF não leva idade, sexo nem IMC (o dataset é baixado inteiro e filtrado localmente). Isso é propriedade a **provar por teste** (CA-9).
- **Performance e custo de tokens.**
  - Uma chamada HTTP por turno de prevenção no pior caso, nenhuma no caso com cache quente.
  - Tempo máximo da chamada externa (timeout) bem abaixo dos 120 s da função, para o laço de até 6 iterações não ser consumido por uma fonte lenta.
  - Teto de itens e de caracteres de `texto` por item; a saída informa o que ficou de fora. Valores iniciais propostos: 12 itens e 400 caracteres por texto; o `plan.md` fixa os números e o motivo.
  - Leituras independentes (perfil e dataset) em paralelo (`Promise.all`).
  - Sem `Scan` novo: a leitura do perfil reaproveita `lerDoDono`.
- **Disponibilidade.** Falha da fonte vira ausência de dado (RT3); o chat nunca cai por causa da USPSTF.
- **Compatibilidade.** A tela de Prevenção continua com saída idêntica depois do refactor (CA-2).

## 6. Critérios de aceite

Cada um é provado por teste ou por conferência objetiva, indicada entre parênteses.

**Refactor do módulo compartilhado**
- **CA-1.** O cliente (`fetchUspstfDataset`), o filtro (`filterRecommendations`, `computeAge`, `computeBmiBucket`, `mapSex`, `resolveGeneral`, `resolveGradeText`) e os tipos moram em `amplify/functions/uspstf-shared/`, e `get-prevention-recommendations` importa deles. Nenhuma cópia fica na pasta antiga. (teste: busca por duplicata + typecheck)
- **CA-2.** Os testes de filtro que existem hoje passam **sem edição de asserção** depois da mudança de pasta, e a saída da Lambda para um perfil e dataset fixos é igual à de antes. (teste de regressão do handler)
- **CA-3.** A tela e o chat usam **o mesmo código** de filtro: um teste carrega a função de filtro pela importação que o handler usa e pela que a ferramenta usa, e prova que são a mesma referência; outro prova que, para o mesmo perfil e dataset, os ids que a ferramenta devolve são os mesmos que o handler devolve (respeitando o teto do chat). (teste)

**A ferramenta**
- **CA-4.** `consultar_prevencao` é `readOnly: true`, `inputSchema` `.strict()` sem campos, nome em `consultar_*`, descrição curta e contrastante (diz o que NÃO faz: não indica exame individual, não diz se a pessoa precisa fazer, não agenda), registrada em `CHAT_TOOLS`. (`tools.test.ts` sobre a lista inteira)
- **CA-5.** Entrada com campo extra (por exemplo `owner`, `idade`, `sexo`) é rejeitada; o perfil usado é sempre o do token. (teste, mesmo padrão das outras ferramentas)
- **CA-6.** Sem perfil: `disponivel: false` + `explicacao`, **sem** chamar a USPSTF. (teste com `fetch` espionado)
- **CA-7.** Falha da USPSTF (rejeição de rede, status não-2xx, JSON inválido, timeout): `disponivel: false` + `explicacao` genérica; a ferramenta **não lança**; nenhum status, URL ou texto de erro técnico aparece na saída. (testes por tipo de falha)
- **CA-8.** Nenhuma recomendação casa: `disponivel: false` com explicação própria, distinta da de falha. (teste)
- **CA-9.** A requisição à USPSTF **não contém** `birthDate`, idade, sexo, peso, altura nem o dono. Só a chave de API. (teste inspecionando a URL e as opções do `fetch`)
- **CA-10.** Teto: com mais itens que o teto, a saída traz no máximo o teto, ordenados por nota (A e B primeiro, depois D, C e I — a D antes da C desde a revisão, para o teto não cortar primeiro o "recomenda contra" —, estável dentro da mesma nota), e `omitidas` com a contagem exata; `texto` respeita o teto de caracteres. (teste)
- **CA-11.** `filtrosAplicados` reflete a realidade: sexo `Outro`/ausente → `sexo: false`; peso ou altura ausentes → `imc: false`. (teste)
- **CA-12.** A saída não contém `rationale`, traduções, `id`, nem campo do perfil. (teste de forma da saída)
- **CA-13.** O cache em memória: duas chamadas dentro da validade fazem **uma** requisição; depois da validade, nova requisição; falha não fica em cache. (teste com relógio simulado)
- **CA-14.** Medição registrada: tamanho e latência reais da resposta da USPSTF, anotados no `plan.md`/`tasks.md` na entrega, ou declarados como **não medidos** com o motivo. Se o tamanho passar de um limite decidido no `plan.md`, o épico para e volta ao usuário (a porta para a Opção C da D7.1). (conferência; **depende do segredo e de rede**, ver seção 8)

**Modo degradado, prompt e verificação**
- **CA-15.** `renderDegraded` mostra título, nota e ano das recomendações, sem texto longo e sem nenhum número que a R3 reprovaria; devolve `null` quando não há o que mostrar. (teste)
- **CA-16.** `consultar_prevencao` está em `TOOLS_CLINICAS`: uma resposta que usou a ferramenta é classificada como clínica e sai com a frase fixa de encaminhamento do aplicativo (`TEXTO_DE_ENCAMINHAMENTO`) costurada no fim. Sem isso, um texto de prevenção, que não tem unidade de exame, seria "operacional" e sairia sem encaminhar. (teste em `verificacao.test.ts`)
  > *Correção de 2026-10-17, na T7:* a redação aprovada dizia "é reprovada pela R2". Desde as decisões A2 e C3, o encaminhamento é **escrito pelo aplicativo** (`encaminhamento.ts`): a R2 sozinha não reprova, costura. O efeito para a pessoa é o mesmo (a resposta encaminha), e o teste prova o comportamento real.
- **CA-17.** O `SYSTEM_PROMPT` diz **quando** usar a ferramenta e em que ela difere de `consultar_perfil` e `consultar_vacinas`; manda apresentar como recomendação geral, com nota, ano e fonte; manda avisar quando `filtrosAplicados` tem falso; manda dizer que a versão em português é adaptação. (`chatPrompt.test.ts`)
- **CA-18.** Casos adversariais de linguagem na suíte, sobre respostas simuladas às perguntas "preciso fazer mamografia?", "devo fazer colonoscopia?" e "estou em dia com a prevenção?". **Já reprovada hoje (R3):** "no seu caso a faixa aplicável…". **Reprovadas por reforço da R3 (D7.3 = A, decidida em 2026-10-17):** "você deve/precisa fazer…" e "você está em dia". O texto de recomendação **bem formado** (geral, com nota, ano, fonte e encaminhamento) é sempre aprovado. Com D7.3 = B ou C, os casos de indicação individual ficam cobertos apenas pelo teste do prompt (CA-17) e a lacuna fica registrada no `plan.md`. (`verificacao.test.ts`, `adversarial.test.ts`)
  > *Correção de 2026-10-17, ao planejar:* a redação aprovada dizia que as três frases eram reprovadas hoje. Sondagem sobre `checkLanguageRules` mostrou que só a R3 de "no seu caso…" barra; ver `plan.md` seção 5.

**Infraestrutura**
- **CA-19.** `backend.ts`/`resource.ts`: o chat recebe `USPSTF_API_KEY` como segredo e nenhuma permissão de escrita nova; `grantReadData` continua sendo a única concessão a tabelas. (`tools.test.ts` varredura de escrita + conferência do diff)
- **CA-20.** `npm run validate` verde (typecheck, typecheck:backend, lint, test:ci). (comando, saída colada)

## 7. Fora de escopo

- Traduzir os textos no chat (MyMemory). A adaptação é do modelo (D7.2).
- Mudar o filtro para considerar gravidez, tabagismo ou vida sexual ativa (já registrado como pendência da v1 em `uspstfFilter.ts`).
- Mudar o comportamento do filtro quando faltam sexo ou IMC. O chat apenas **avisa** quando isso acontece.
- Cache persistente em DynamoDB ou rotina de atualização do dataset (Opção C da D7.1), salvo se CA-14 mandar voltar.
- Calcular "prevenção em atraso" ou dizer se a pessoa está em dia (não há conceito de data devida no modelo `PreventionRecommendation`; ver `docs/DADOS_MOCKADOS.md`).
- Ler vacinas recomendadas (E8 e `consultar_vacinas`) ou exames já feitos pela pessoa para cruzar com a recomendação (E10).
- Qualquer mudança em `src/` (telas, serviços, tipos).
- Proatividade: o assistente só fala de prevenção se perguntado.

## 8. O que depende de dispositivo, sandbox ou rede

- **Chamada real à USPSTF, medição de tamanho/latência e o segredo no ambiente do chat** exigem `ampx sandbox` (ou o ambiente de desenvolvimento) com `USPSTF_API_KEY` configurado. Os testes automatizados usam `fetch` simulado.
- **Conversa real de ponta a ponta** (modelo + guardrail + verificação) exige o sandbox e o Bedrock. Os casos adversariais da suíte testam a verificação sobre texto simulado, não o modelo ao vivo. O `tasks.md` terá uma tarefa de conferência manual com as 5 perguntas da seção 1, a ser feita pelo usuário.
