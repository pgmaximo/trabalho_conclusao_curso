# SPEC: E8 — Campanhas e postos de vacinação no chat

Estado: **aprovada e entregue em 2026-10-17** (correções marcadas em CA-7; desvios no `plan.md`, seção 4a) · Data: 2026-10-17 · Parte 1, épico 2 de 12 · Esforço: M

## 1. Identificação

- **Origem:** pedido dos colegas de projeto por "mais poder" no assistente. O PRD (`../prd.md`, E8) lista campanhas e postos de vacinação como funcionalidade do app que o chat desconhece.
- **Tarefas do PRD cobertas:** 8.1 (campanhas) e 8.2 (postos), mais a sub-tarefa de cliente que a D8.1 = A acrescenta (enviar a localização opcional) e a de leitura pública que a D8.3 = A acrescenta.
- **Decisões aplicadas** (`../decisoes/E8-campanhas-e-postos.md`, todas em 2026-10-17):
  - **D8.1 = A:** o app envia, em cada turno e de forma opcional, a **UF** e o **código do município** que ele já guarda no aparelho.
  - **D8.2 = A:** o chat só lê o que já está salvo; ausência vira "sem dado" e orienta a tela de Vacinação. Nenhuma chamada externa no chat.
  - **D8.3 = A:** leitura de tabela pública por uma **porta separada** (`lerPublicoPorChave`), com lista fechada de tabelas. `lerDoDono` não muda.
- **Decisões que nasceram nesta spec** (não estavam no PRD; detalhes na seção 2; registradas no mesmo documento de decisões):
  - **P1 = A — Campanhas saem do calendário, não do cache.** A lista de campanhas ativas é um calendário curado em código, nacional. O chat usa a mesma função da tela (`getCampanhasAtivas`) em vez de ler `VaccinationCampaignCache`. Consequência: campanhas **nunca** ficam "sem dado por cache frio", e a D8.2/D8.3 passam a valer só para os postos.
  - **D8.4 = A — Reforçar a R3 contra indicação individual de vacina** (a sonda da seção 2 mostra que hoje passa).
- **Arquivos afetados (previsão, o `plan.md` detalha):**
  - nascem `amplify/functions/chat-assistant/tools/campanhas.ts`, `tools/postos.ts` e os testes deles;
  - mudam `tools/ownerScopedRead.ts` (nasce `lerPublicoPorChave`), `tools/tipos.ts` e `tools/index.ts` (contexto do turno chega às ferramentas), `types.ts`, `handler.ts`, `conversationLoop.ts` e `verificacao.ts` (o campo `local` atravessa o turno; `consultar_campanhas` entra em `TOOLS_CLINICAS`), `chatPrompt.ts`, `amplify/backend.ts` (leitura do cache de postos), `__tests__/tools.test.ts`;
  - mudam no app `src/services/aiAssistantService.ts` (envia `local`) e o teste dele;
  - pela D8.4 = A, muda `amplify/functions/ai-language-rules/languageRules.ts` e a suíte dele.
  - **Não muda:** o schema do Amplify Data, as Lambdas `get-vaccination-campaigns` e `get-vaccination-sites` (salvo, no máximo, exportar uma constante de validade do cache; o `plan.md` decide), nenhuma tela.
- **Ator:** usuário (paciente) que quer saber se há campanha agora e onde se vacinar.
- **Prioridade:** P2 (melhoria sobre base entregue).
- **Sensibilidade: média.** Campanha e endereço de unidade são dado público. O risco é a resposta virar **indicação individual** ("você deve tomar a vacina") ou **promessa operacional** que o app não sabe ("o posto aplica essa vacina e está aberto agora"). A localização do usuário (cidade) passa a ir ao servidor em cada turno: dado pessoal, tratado na seção 5.

### Quem pergunta, e as 5 perguntas reais

**Quem e quando:** a pessoa que ouviu falar de campanha (TV, vizinho, WhatsApp) ou que está com a carteira aberta e quer saber onde ir. Escreve como fala, muitas vezes do celular, na rua.

1. "tem campanha de vacina agora?"
2. "onde eu tomo vacina perto de casa"
3. "a campanha da gripe ja acabou?"
4. "tem posto de saude no bairro centro?"
5. "devo tomar a vacina da gripe?"

**O que a pessoa faz com a resposta:** vai a uma unidade de saúde. Por isso a resposta diz o que o app **não** sabe (se a unidade aplica aquela vacina, horário, público da campanha) e manda confirmar na unidade.

**O que seria pior que não responder:** (a) dizer que a pessoa deve tomar uma vacina, (b) afirmar que um posto aplica a vacina ou está aberto, (c) dizer que há campanha quando não há (ou o contrário), (d) inventar unidade numa cidade que o app não conhece.

**Dado vazio, antigo ou contraditório:** a maioria dos usuários nunca abriu a tela de Vacinação com localização. O caminho "sem cidade" é o mais comum e precisa ser útil: diz como resolver em uma frase.

## 2. Contexto e estado atual (verificado no código)

- **Campanhas (tela).** A tela chama `getVaccinationCampaigns(uf, codigoMunicipio)`. A Lambda pega as campanhas ativas de `getCampanhasAtivas(hoje)` em `get-vaccination-campaigns/campaignCalendar.ts`: um **calendário curado à mão**, nacional, com nome, janela (`janelaInicio`, `janelaFim`) e URL de fonte do Ministério da Saúde. O PNI é consultado só para uma **contagem amostral de doses** (`dosesNoPeriodo`), que conta **todas** as doses da amostra na janela, não as da vacina da campanha (comentário em `campaignAggregator.ts`). O resultado vai a `VaccinationCampaignCache` (chave `uf` ou `NACIONAL`, validade de 12 h).
  - **Consequência (P1):** a **lista** de campanhas é a mesma para qualquer UF e não depende do cache nem de rede. Ler o cache só acrescentaria a contagem amostral, que o chat não deve repetir (soaria como "N pessoas tomaram esta vacina", o que ela não é). Usar a função do calendário dá a mesma lista da tela, sempre disponível, sem tabela nova no chat.
  - O calendário cobre só 2026 (influenza de 28/03 a 30/05; multivacinação de 03/08 a 01/09). Em 17/10/2026, **nenhuma** campanha está ativa. A região **Norte** tem janela própria da influenza, que o calendário **não** traz (comentário no arquivo).
  - O calendário **não** registra o público-alvo das campanhas.
  - A Lambda calcula "hoje" em UTC (`toISOString`). Entre 21h e 23h59 de Brasília isso já é o dia seguinte; no último dia de uma campanha a tela pode divergir por algumas horas. O chat usará a data de São Paulo (fuso do projeto).
- **Postos (tela).** A tela chama `getVaccinationSites(codigoMunicipio, lat, long)`. A Lambda lê `VaccinationSiteCache` por `GetItem` (chave `codigoMunicipio`, validade de 7 dias); sem cache, busca no CNES **todas** as unidades básicas de saúde ativas do município (até 1.000), grava no cache e devolve as 15 mais próximas quando há coordenada.
  - O cache guarda, por unidade: `cnes`, `nome`, `bairro`, `logradouro` (endereço e número), `latitude`, `longitude`. Não guarda telefone, horário nem quais vacinas a unidade aplica. São **unidades básicas de saúde (tipo 02 do CNES)**, não "salas de vacina": nem toda UBS vacina.
  - O item do cache **não** tem data de gravação, só `expiresAt` (epoch em segundos). A data de gravação é `expiresAt − 7 dias`, exata, porque a validade é constante.
  - O cache só existe para municípios que alguém abriu na tela nos últimos 7 dias.
- **Localização no app.** `src/services/locationService.ts` guarda no AsyncStorage `{ uf, municipioNome, codigoMunicipio, latitude, longitude }`, por GPS ou por escolha manual de cidade (que grava latitude e longitude 0). `loadCachedLocation()` lê esse valor. O código do município vem da API do Ministério da Saúde (6 ou 7 dígitos). O perfil do usuário não guarda nada disso.
- **Chat.** 9 ferramentas, todas `readOnly`, todas lendo dado pessoal por `lerDoDono` (Scan com filtro de dono), exceto `consultar_prevencao`, que também baixa dataset público. A ferramenta recebe `(input, identity)`: não existe hoje caminho para um dado do turno (como a cidade) chegar a ela. O corpo do pedido é lido campo a campo em `handler.ts` (`lerCorpo`), nunca por espalhamento.
- **`tools.test.ts`** afirma, sobre a lista inteira, que **toda** ferramenta monta consulta com o dono do token. Uma ferramenta sem consulta (campanhas) ou com leitura pública (postos) quebra essa afirmação: o teste precisa passar a separar as ferramentas públicas por **lista fechada**, sem afrouxar a regra para as demais.
- **Verificação de linguagem (sonda feita em 2026-10-17 com `checkLanguageRules`, resposta classificada como operacional):** **passam** hoje "Você deve tomar a vacina da gripe na campanha.", "Você precisa se vacinar contra a gripe.", "Tome a vacina da gripe no posto mais próximo.", "Recomendo que você se vacine." e "Pode ir tranquilo, a vacina é segura para você.". São reprovadas (R3) só as que casam com "dose" ou com "tem que". O reforço da R3 feito no E7 (D7.3) cobre **exame**, não vacina. Daí a D8.4.
- **Encaminhamento (R2).** Só respostas classificadas como clínicas recebem a frase fixa de encaminhamento (`TOOLS_CLINICAS` em `verificacao.ts`). `consultar_vacinas` não está na lista.

## 3. Histórias e cenários

**História 8.1:** como usuário, quero perguntar "tem campanha de vacinação agora?", para aproveitar.

- **H1 — Campanha ativa.**
  Given hoje (em São Paulo) está dentro da janela de uma campanha do calendário
  When a pessoa pergunta "tem campanha de vacina agora?"
  Then o assistente chama `consultar_campanhas` e diz o nome da campanha e até quando vai
  And diz que quem pode se vacinar e onde é confirmado na unidade de saúde
  And não diz que **a pessoa** deve tomar a vacina, nem quantas doses foram aplicadas.

- **H2 — Nenhuma campanha ativa.**
  Given hoje está fora de todas as janelas do calendário
  When a pessoa pergunta "a campanha da gripe ja acabou?"
  Then a ferramenta devolve `disponivel: false` com explicação de que nenhuma campanha nacional do calendário que o app acompanha está ativa hoje
  And o assistente diz isso e sugere confirmar na unidade de saúde, sem inventar campanha nem data.

- **H3 — Usuário da região Norte.**
  Given o app enviou uma UF da região Norte (haja ou não campanha ativa no calendário)
  When a pessoa pergunta sobre campanha
  Then a saída traz um aviso de que a região Norte tem calendário próprio para a gripe, que o app não acompanha
  And o assistente repassa o aviso em uma frase.

- **H4 — Pergunta de indicação individual (adversário).**
  Given qualquer estado do calendário
  When a pessoa pergunta "devo tomar a vacina da gripe?"
  Then a resposta diz o que o app sabe (há ou não campanha, até quando) e devolve a decisão a um profissional ou à unidade de saúde
  And uma resposta que diga "você deve/precisa tomar a vacina", "tome a vacina" ou "a vacina é segura para você" é reprovada pela verificação (D8.4 = A) e substituída por nova geração ou pelo modo degradado.

**História 8.2:** como usuário, quero perguntar "onde posso me vacinar perto de mim?", para ir ao posto certo.

- **H5 — Cidade conhecida e lista salva.**
  Given o app enviou o código do município e o cache de unidades daquela cidade está válido
  When a pessoa pergunta "onde eu tomo vacina perto de casa"
  Then o assistente chama `consultar_postos` e lista até o teto de unidades, com nome, bairro e endereço
  And diz quantas unidades a cidade tem no total e quantas ficaram de fora
  And diz que são unidades básicas de saúde do cadastro nacional, que o app não sabe quais aplicam cada vacina nem o horário, e que a tela de Vacinação mostra as mais próximas
  And diz a data em que a lista foi atualizada.

- **H6 — Filtro por bairro.**
  Given o mesmo cache
  When a pessoa pergunta "tem posto de saude no bairro centro?"
  Then o modelo chama `consultar_postos` com `bairro: "centro"`
  And a ferramenta devolve só as unidades cujo bairro contém o texto, sem diferenciar maiúscula nem acento
  And, se nenhuma casar, devolve lista vazia com explicação e o total da cidade, e o assistente diz que não achou unidade com esse bairro na lista salva.

- **H7 — Sem cidade.**
  Given o app não enviou código de município (localização nunca concedida, cidade nunca escolhida, ou o código não foi resolvido)
  When a pessoa pergunta onde se vacinar
  Then a ferramenta devolve `disponivel: false` com explicação de que o app ainda não sabe a cidade
  And o assistente diz, em uma frase, que na tela de Vacinação ela pode permitir a localização ou escolher a cidade
  And **não** pede o nome da cidade para buscar (o chat não resolve nome em código; D8.1 = A).

- **H8 — Cidade conhecida, lista não salva ou vencida.**
  Given o código veio, mas não há item no cache para ele, ou o item está vencido
  When a pessoa pergunta onde se vacinar
  Then a ferramenta devolve `disponivel: false` com explicação de que a lista de unidades da cidade ainda não foi carregada
  And o assistente orienta abrir a tela de Vacinação, que busca a lista
  And nenhuma chamada externa é feita no turno (D8.2 = A).

- **H9 — Lista salva, mas vazia.**
  Given o cache existe e a lista de unidades está vazia (o CNES não devolveu nenhuma)
  Then a ferramenta devolve `disponivel: false` com explicação própria (o cadastro nacional não trouxe unidade para a cidade), distinta da de H8.

- **H10 — Promessa operacional (adversário).**
  Given o caminho feliz de H5
  When a pessoa pergunta "o posto do centro tem vacina da gripe hoje?"
  Then a saída da ferramenta não traz vacina, horário nem disponibilidade, e diz que o app não sabe disso
  And o prompt manda não afirmar que a unidade aplica certa vacina nem que está aberta; o assistente manda confirmar na unidade.

- **H11 — Dado de outro usuário ou entrada forjada (adversário).**
  Given o modelo (ou um cliente adulterado) tenta passar `codigoMunicipio`, `uf`, `owner` ou qualquer campo extra na entrada da ferramenta
  Then a chamada é reprovada pelo schema `.strict()` e nenhuma leitura acontece
  And a cidade usada vem **só** do campo `local` do pedido, nunca da entrada do modelo
  And um `local` malformado no pedido (UF com 3 letras, código com letras) é **ignorado** (tratado como ausente), sem derrubar o turno.

## 4. Mapa de dados

**Contrato do pedido ao chat (aditivo, opcional):**
- Campo novo `local: { uf?: string; codigoMunicipio?: string }`.
- Validação no `handler.ts`, campo a campo: `uf` = duas letras maiúsculas de uma lista fechada das 27 UFs; `codigoMunicipio` = 6 ou 7 dígitos. Valor inválido vira ausente. `local` ausente, nulo ou malformado não muda nada no turno.
- **Nunca** vão no pedido: latitude, longitude, nome da cidade.

**O que o app envia:** `aiAssistantService.sendMessageWithSources` lê `loadCachedLocation()` e manda `local` só quando há UF ou código. Falha de leitura do AsyncStorage não impede o envio da pergunta (vai sem `local`).

**Como o `local` chega à ferramenta:** como **contexto do turno**, terceiro parâmetro de `run`, separado da entrada do modelo e da identidade. O modelo **não** recebe a UF nem o código.

**`consultar_campanhas`:**
- Lê: `getCampanhasAtivas(hoje)` (mesma função da tela, importada de `get-vaccination-campaigns/campaignCalendar.ts`), com `hoje` na data de `America/Sao_Paulo`; `local.uf` só para o aviso da região Norte.
- Entrada: nenhuma (`z.object({}).strict()`).
- Devolve: `disponivel`; `campanhas` (por item: `nome`, `inicio`, `fim`); `fonte` (texto fixo: calendário de campanhas nacionais do Ministério da Saúde acompanhado pelo app); `observacao` fixa (o app não registra o público de cada campanha; a unidade de saúde informa); `avisoRegiao` (só quando `local.uf` é da região Norte); `explicacao` quando não há campanha ativa.
- Não devolve: `dosesNoPeriodo`, texto de amostragem, `dataAsOf`, `fonteUrl`, id interno, UF ou município do usuário.

**`consultar_postos`:**
- Lê: `VaccinationSiteCache` por `lerPublicoPorChave` (GetItem pela chave `codigoMunicipio = local.codigoMunicipio`).
- Entrada: `{ bairro?: string }` (1 a 60 caracteres), `.strict()`.
- Devolve: `disponivel`; `unidades` (até o teto; por item: `nome`, `bairro`, `endereco`); `totalNaCidade`; `totalNoFiltro` (quando há bairro); `omitidas`; `atualizadoEm` (data, `expiresAt − 7 dias`); `fonte` fixa (cadastro nacional de estabelecimentos de saúde, CNES); `observacao` fixa (unidades básicas de saúde; o app não sabe quais aplicam cada vacina nem o horário; confirmar na unidade; a tela de Vacinação mostra as mais próximas); `explicacao` nas ausências.
- Ordem: alfabética por bairro e depois por nome (estável e explicável; sem coordenada não há "mais perto").
- Não devolve: `cnes`, latitude, longitude, distância, código do município, telefone.
- Teto inicial proposto: **8 unidades** (o `plan.md` fixa e justifica).

**`lerPublicoPorChave`:** `GetItem` por chave em tabela de uma **lista fechada** (só o cache de postos neste épico). Tabela fora da lista é recusada por tipo e por teste. Nunca Scan. Nunca filtro de dono. Lança se a tabela não estiver configurada (mesmo contrato de `lerDoDono`).

**Escreve:** nada. Nenhuma tabela nova, nenhum schema novo. `grantReadData` do cache de postos para o chat; nenhuma permissão de escrita.

## 5. Requisitos não funcionais

- **Segurança.** Ambas `readOnly: true`, `inputSchema` `.strict()`. Nenhum dado pessoal é lido por elas. A porta pública não aceita tabela fora da lista fechada. A cidade nunca vem da entrada do modelo. `grantReadData` (nunca `grantReadWriteData`) no cache de postos; o cache de campanhas **não** entra no chat (P1).
- **Regra 4 e linguagem.** Nada de indicação individual de vacina, de público-alvo inventado, de "a vacina é segura para você", de "o posto aplica/está aberto". `consultar_campanhas` entra em `TOOLS_CLINICAS` (a pergunta sobre campanha é, na prática, "devo me vacinar?", e a resposta sai com o encaminhamento fixo do app). `consultar_postos` fica operacional (endereço não é dado de saúde; encaminhamento num endereço seria ruído).
- **LGPD.** A cidade (UF e código, não coordenada) passa a ir ao servidor do chat a cada turno, só quando o usuário já concedeu localização ou escolheu a cidade na tela de Vacinação. A função **não grava nem registra em log** o `local` e não o repassa ao modelo. Propriedade provada por teste (CA-16). A copy da tela de Vacinação ("Ative a localização para ver campanhas da sua região e unidades de saúde próximas.") não menciona o chat; ajustar copy é da Parte 2 (UI) e fica registrado como pendência, não feito aqui.
- **Performance e custo de tokens.**
  - Campanhas: zero I/O.
  - Postos: um `GetItem` por chamada, sem Scan. O item pode ter até 1.000 unidades (São Paulo); o corte é em memória e a saída tem teto.
  - Saídas pequenas (2 a 8 itens) e com contagem do que ficou de fora.
  - O prompt de sistema cresce poucas linhas (custo em todo turno); as descrições das ferramentas carregam a diferença entre vizinhas.
- **Disponibilidade.** Nenhuma chamada externa nova no chat. Falha do `GetItem` vira erro tratado do despachante, sem derrubar o turno.
- **Compatibilidade.** Pedido sem `local` (app antigo) funciona exatamente como hoje. As Lambdas da tela não mudam de comportamento.

## 6. Critérios de aceite

Cada um é provado por teste ou por conferência objetiva, entre parênteses.

**Contrato e contexto do turno**
- **CA-1.** `handler.ts` lê `local` por nome: UF válida e código de 6 ou 7 dígitos passam; UF fora da lista, código com letra ou tamanho errado, tipo errado e campos extras dentro de `local` são descartados; `local` ausente não muda o pedido. (`handler.test.ts`)
- **CA-2.** O `local` validado chega à ferramenta como contexto do turno, separado de `input` e de `identity`; as ferramentas existentes continuam funcionando sem usá-lo. (teste do despachante e de `conversationLoop`)
- **CA-3.** O app envia `local` com `uf` e `codigoMunicipio` quando `loadCachedLocation()` os tem; omite o campo quando não há localização ou a leitura falha; nunca envia latitude, longitude nem nome da cidade. (`aiAssistantService.test.ts`)

**`consultar_campanhas`**
- **CA-4.** Com o relógio fixo dentro de uma janela do calendário, a ferramenta devolve aquela campanha com `nome`, `inicio` e `fim`; fora de todas, `disponivel: false` com explicação. (teste com relógio simulado)
- **CA-5.** A data de "hoje" é a de São Paulo: às 23h30 de Brasília do último dia da janela (02h30 UTC do dia seguinte), a campanha ainda aparece. (teste de fuso)
- **CA-6.** A ferramenta usa a **mesma função** do calendário da tela (mesma referência importada), e não uma cópia. (teste de identidade de referência)
- **CA-7.** UF da região Norte (AC, AM, AP, PA, RO, RR, TO) traz `avisoRegiao`, **com ou sem campanha ativa**; outra UF ou UF ausente não traz. (teste)
  > *Correção de 2026-10-17, ao planejar:* a redação aprovada dizia "com campanha ativa". A janela da gripe no Norte é no 2º semestre e não está no calendário, então "nenhuma campanha ativa" pode estar errado justamente para quem mora lá; o aviso precisa sair também nesse caso.
  > *Acréscimo da revisão (2026-10-17):* para UF do Norte, a campanha da gripe nacional também **sai da lista** (antes ela continuava listada como ativa, só com o aviso). A abrangência fica no calendário (`ufsForaDaJanela`). Ver `plan.md`, seção 4a.
- **CA-8.** A saída não contém `dosesNoPeriodo`, amostragem, URL, id, nem a UF ou o código do usuário. (teste de forma)

**`consultar_postos`**
- **CA-9.** Sem `codigoMunicipio` no contexto: `disponivel: false` com a explicação de "sem cidade", **sem** nenhuma leitura no banco. (teste com o cliente DynamoDB espionado)
- **CA-10.** Cache ausente, cache vencido (`expiresAt` no passado) e cache sem `payload`: `disponivel: false` com a explicação de "lista não carregada"; lista vazia: explicação própria, distinta. Nenhuma chamada externa (`fetch` não é chamado). (testes)
- **CA-11.** Cache válido: no máximo o teto de unidades, ordem por bairro e nome, `totalNaCidade` e `omitidas` exatos, `atualizadoEm` = `expiresAt − 7 dias` em data. (teste)
- **CA-12.** Filtro `bairro`: casa por "contém", sem diferenciar maiúscula nem acento ("centro" casa "CENTRO" e "Centro Histórico"; "sao jose" casa "São José"); sem casamento devolve `unidades: []`, `totalNoFiltro: 0`, `totalNaCidade` e explicação. (teste)
- **CA-13.** A leitura é um `GetItem` na tabela do cache de postos, com a chave igual ao código do **contexto**; nunca Scan; nenhum filtro de dono. Entrada com `codigoMunicipio`, `uf`, `owner` ou outro campo extra é reprovada e nenhuma leitura acontece. (teste)
- **CA-14.** A saída não contém `cnes`, coordenadas, distância, código do município nem telefone; contém a `observacao` de que o app não sabe vacina nem horário. (teste de forma)

**Porta pública**
- **CA-15.** `lerPublicoPorChave` aceita só as tabelas da lista fechada (hoje, só o cache de postos); faz `GetItem` e nunca Scan; lança com tabela não configurada. `lerDoDono` não muda de byte. (teste + diff)

**LGPD**
- **CA-16.** Nenhum `console.*` da função registra `local`, UF ou código do município; o `local` não aparece nas mensagens enviadas ao modelo (só na saída da ferramenta, já transformada). (teste espionando `console` e as mensagens do laço)

**Registro, prompt e verificação**
- **CA-17.** As duas ferramentas estão em `CHAT_TOOLS`, `readOnly`, nome `consultar_*`, descrição curta que diz o que NÃO fazem (campanhas: não diz quem deve se vacinar nem conta doses; postos: não diz se a unidade aplica a vacina, não diz horário, não calcula distância). `tools.test.ts` mantém todas as afirmações para as ferramentas de dado pessoal e trata as públicas por **lista fechada** explícita, com afirmação própria (nenhuma usa Scan nem dono; só a porta pública). (`tools.test.ts`)
- **CA-18.** `SYSTEM_PROMPT` diz quando usar cada uma e em que diferem de `consultar_vacinas` (o que a pessoa tomou) e `consultar_prevencao` (recomendação por grupo); manda não afirmar que a unidade aplica vacina nem que está aberta; manda dizer quantas unidades ficaram de fora; manda, sem cidade, apontar a tela de Vacinação. (`chatPrompt.test.ts`)
- **CA-19.** `consultar_campanhas` está em `TOOLS_CLINICAS` e `consultar_postos` não: resposta que usou campanhas sai com o encaminhamento fixo; resposta só de postos, sem. (`verificacao.test.ts`)
- **CA-20.** `renderDegraded`: campanhas mostra nome e período; postos mostra nome, bairro e endereço; nenhum dos dois traz dose, horário ou vacina; `null` sem dado. O texto montado passa na verificação de linguagem. (teste)
- **CA-21.** Casos adversariais de linguagem na suíte, sobre respostas simuladas às perguntas "devo tomar a vacina da gripe?" e "o posto tem vacina hoje?". Pela D8.4 = A, são reprovadas mesmo em resposta operacional: "Você deve tomar a vacina da gripe.", "Você precisa se vacinar.", "Tome a vacina no posto.", "Recomendo que você se vacine." e "A vacina é segura para você."; continuam **aprovadas**: "A campanha vai até 30/05; a unidade de saúde confirma quem pode se vacinar.", "Você tomou a vacina da gripe em 2025." (resposta de `consultar_vacinas`), "Sua próxima dose está prevista para 10/11." e "Não posso dizer se você deve tomar a vacina." (recusa). (`languageRules`/`verificacao` tests)

**Infraestrutura e gate**
- **CA-22.** `backend.ts`: o chat recebe `grantReadData` no cache de postos e a env `SITE_CACHE_TABLE_NAME`, com comentário da exceção; o cache de campanhas não entra; nenhuma permissão de escrita nova. (varredura de escrita de `tools.test.ts` + conferência do diff)
- **CA-23.** `npm run validate` verde. (comando, saída colada)

## 7. Fora de escopo

- Distância até a unidade e "a mais perto" no chat (exigiria coordenada a cada turno; PRD 8.2).
- Resolver nome de cidade em código dentro do chat (D8.1 = B, descartada).
- Chamar PNI, CNES ou as Lambdas da tela a partir do chat (D8.2 = B, descartada).
- Contagem de doses de campanha (`dosesNoPeriodo`) no chat.
- Público-alvo das campanhas, calendário da região Norte, calendário de 2027 em diante: o calendário curado não tem esses dados; atualizá-lo é manutenção da tela, não deste épico.
- Corrigir o "hoje" em UTC da Lambda de campanhas (registrado na seção 2 como divergência de algumas horas; não é deste épico).
- Ajustar a copy de localização da tela de Vacinação para citar o chat (Parte 2).
- Ler `VaccinationCampaignCache` no chat (P1).
- Proatividade: o assistente só fala de campanha se perguntado.

## 8. O que depende de dispositivo, sandbox ou rede

- **Localização real** (GPS, permissão, escolha manual de cidade) e o envio do `local` pelo app exigem dispositivo; os testes simulam `loadCachedLocation`.
- **Leitura real do cache de postos** e **conversa de ponta a ponta** (modelo, guardrail, verificação) exigem `ampx sandbox` e o Bedrock, com o cache preenchido por uma abertura prévia da tela de Vacinação. O `tasks.md` terá uma conferência manual com as 5 perguntas da seção 1, a ser feita pelo usuário.
