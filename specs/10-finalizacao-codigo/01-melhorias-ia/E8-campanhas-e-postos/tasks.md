# TASKS: E8 — Campanhas e postos de vacinação no chat

Passo a passo com teste antes da implementação: `docs/superpowers/plans/2026-10-17-e8-campanhas-postos-chat.md`. Esta lista é o acompanhamento.

## Estado

**Concluído em 2026-10-17** (entrega aprovada pelo usuário, junto com a correção dos dois achados anteriores ao E8 e a atualização do `CLAUDE.md`). Spec e plano aprovados; decisões D8.1 a D8.4 e P1 fechadas (todas A); T0 a T13 feitas. Nada commitado. **Pendente do usuário, fora do código:** a conferência no sandbox e no dispositivo (seção abaixo).

`npm run validate`: linha de base 173 suítes / 1962 testes → final **180 suítes / 2171 testes**, exit 0; lint 0 erros e 12 avisos, todos preexistentes em `src/` (nenhum em arquivo do E8).

Branch: `sdd-10-finalizacao-codigo`, única para todo o SDD 10, no checkout principal, **sem worktree**. Alterações já presentes antes do épico e que **não** são dele: `metro.config.js`, `package.json`, `package-lock.json` (não tocar, não incluir em commit do E8).

## Tarefas (ordem de execução)

- [x] **T0 — Linha de base.** `npm run validate` e `git status`, resultado anotado aqui. *Prova:* saída colada. **Feita em 2026-10-17:** exit 0; 173 suítes, 1962 testes; lint 0 erros e 12 avisos (todos preexistentes, em `src/`).
- [x] **T1 — Validação de `local` no pedido.** `localDoPedido.ts` (puro) e `handler.ts` passando `local` a `responder`. Depende de: T0. *Prova:* `__tests__/localDoPedido.test.ts` (UF válida, fora da lista, minúscula, código de 6 e 7 dígitos, com letra, tamanho errado, tipo errado, campos extras, ausente) e `handler.test.ts` (`local` válido chega ao `responder`; inválido vira `null`; ausente não muda o pedido) (CA-1). **Feita em 2026-10-17:** 16 testes novos; vermelho por módulo ausente e por `local` indefinido (3 do handler), verde depois; `typecheck:backend` limpo.
- [x] **T2 — Contexto do turno até as ferramentas.** `types.ts`, `tools/tipos.ts`, `tools/index.ts` (`runTool` com contexto), `conversationLoop.ts`, `verificacao.ts` (`responder` repassa). Depende de: T1. *Prova:* `conversationLoop.test.ts` (`runTool` recebe `{ local }`; sem `local`, `{ local: null }`; `local` não aparece nas mensagens ao Bedrock), `tools.test.ts` (o despachante entrega o contexto à ferramenta), `handler.test.ts` (nenhum `console.*` contém UF ou código em um turno com falha) (CA-2, CA-16). **Feita em 2026-10-17:** 6 testes novos (laço ×3, handler ×1, `responder` ×2); os dois de entrega do contexto no laço falharam antes e passaram depois; os de LGPD já passavam (guardas de regressão); o de `responder` foi provado por mutação (2 falham sem a linha). **Desvio:** `contexto` é **opcional** no tipo de `run` (35 chamadas diretas em testes existentes); `runTool` sempre o envia. 25 suítes do chat verdes (392 testes); `typecheck:backend` limpo.
- [x] **T3 — Porta pública.** `lerPublicoPorChave` e `TABELAS_PUBLICAS` em `ownerScopedRead.ts`. Depende de: T0. *Prova:* `__tests__/leituraPublica.test.ts` (GetItem com a chave da lista; nunca Scan; sem filtro de dono; tabela fora da lista lança; env ausente lança; item ausente devolve `null`) (CA-15). **Feita em 2026-10-17:** 6 testes, todos vermelhos antes (função ausente) e verdes depois; caso extra: `'toString'` também é recusado (`Object.hasOwn`); `lerDoDono` sem mudança (diff só no import e no acréscimo); `typecheck:backend` limpo.
- [x] **T4 — `consultar_campanhas`.** `tools/campanhas.ts` e `dataEmSaoPaulo` em `formatoPtBr.ts`. Depende de: T2. *Prova:* `__tests__/formatoPtBr.test.ts` (virada do dia em São Paulo) e `__tests__/campanhasTool.test.ts` (janela ativa; nenhuma ativa; fuso às 23h30 do último dia; usa a função do calendário da tela; aviso Norte com e sem campanha; sem aviso para outra UF ou sem UF; forma da saída; `renderDegraded`) (CA-4 a CA-8, CA-20 parte). **Feita em 2026-10-17:** 13 testes (3 de data, 10 da ferramenta), vermelhos antes (função e módulo ausentes) e verdes depois; caso extra: chamada direta sem contexto não falha; `typecheck:backend` limpo.
- [x] **T5 — Constante da validade do cache de postos.** `get-vaccination-sites/validadeDoCache.ts`; o handler da tela importa dela. Depende de: T0. *Prova:* `get-vaccination-sites/__tests__/validadeDoCache.test.ts` (7 dias; o handler não declara outra validade) + `typecheck:backend`. **Feita em 2026-10-17:** 2 testes, vermelhos antes (módulo ausente) e verdes depois; handler da tela mudou só no import e no nome da constante; 5 testes da pasta verdes; `typecheck:backend` limpo.
- [x] **T6 — `consultar_postos`.** `tools/postos.ts`. Depende de: T2, T3, T5. *Prova:* `__tests__/postosTool.test.ts` (sem cidade sem leitura; cache ausente, vencido, sem `payload`; lista vazia; caminho feliz com teto, ordem, totais e `atualizadoEm`; filtro de bairro com acento e caixa; bairro sem casamento; nenhum `fetch`; forma da saída; `inputSchema` recusa campos extras; `renderDegraded`) (CA-9 a CA-14, CA-20 parte). **Feita em 2026-10-17:** 24 testes, vermelhos antes (módulo ausente) e verdes depois. **Achado no caminho:** `expiresAt = NaN` passava pela guarda `typeof === 'number'` e o item era tratado como válido; caso próprio, vermelho antes da correção (`Number.isFinite`), verde depois. Dois defeitos do próprio teste corrigidos (relógio lido antes do `beforeAll`; `undefined` acionando o valor padrão do auxiliar). `typecheck:backend` limpo.
- [x] **T7 — Registro, lista fechada de públicas e classificação.** `tools/index.ts`, `tools.test.ts`, `verificacao.ts`. Depende de: T4, T6. *Prova:* `tools.test.ts` (registradas depois de `consultar_prevencao`; `FERRAMENTAS_PUBLICAS` fechada; públicas sem Scan e sem dono; demais continuam com dono do token; dono plantado reprova todas), `verificacao.test.ts` (campanhas costura o encaminhamento; postos não), `degradedAnswer.test.ts` (o bloco das duas passa na verificação) (CA-17, CA-19, CA-20). **Feita em 2026-10-17:** 7 testes novos; 6 vermelhos antes e verdes depois (o de postos operacional já passava, é guarda); com o registro, os testes de lista inteira (nenhuma escreve, dono plantado reprova, ausência sem erro, toda tool citada existe) passaram a cobrir as duas; 29 suítes do chat verdes (442 testes); `typecheck:backend` limpo.
- [x] **T8 — Prompt.** `chatPrompt.ts`. Depende de: T7. *Prova:* `chatPrompt.test.ts` (CA-18). **Feita em 2026-10-17:** 6 testes, vermelhos antes e verdes depois; um bullet só, que também manda repassar `avisoRegiao` (sem isso o aviso do Norte podia ficar na saída da ferramenta e não chegar à pessoa); 183 testes verdes em prompt e regras de linguagem.
- [x] **T9 — Reforço da R3 para vacina (D8.4 = A).** `languageRules.ts`. Depende de: T0. *Prova:* `adversarial.test.ts` (frases que reprovam, com o motivo; frases que passam), `verificacao.test.ts` (a costura do encaminhamento não salva a indicação), suíte inteira das regras verde (CA-21). **Feita em 2026-10-17:** um padrão novo em `PADROES_R3`, antes do de verbo de medicação (cinco formas, vacina sempre como objeto do verbo, exceção de recusa na mesma oração); 36 casos no `adversarial.test.ts` (10 frases que reprovam e 8 que passam, cada uma nos dois tipos de pergunta): os 20 de reprovação vermelhos antes, todos verdes depois; caso de ponta a ponta no `verificacao.test.ts` provado por mutação (falha sem o padrão). 191 testes das regras verdes em 3,5 s, inclusive o que exige que o bloco de regras passe na própria verificação.
- [x] **T10 — Infraestrutura.** `backend.ts`. Depende de: T6. *Prova:* `__tests__/infraVacinacao.test.ts` (cache de postos no laço de `grantReadData` do chat; env `SITE_CACHE_TABLE_NAME`; cache de campanhas fora do chat; nenhuma escrita) + `typecheck:backend` (CA-22). **Feita em 2026-10-17:** 4 testes; os 2 de concessão e env vermelhos antes e verdes depois (os de "campanhas fora" e "sem escrita" são guardas); `infraPrevencao.test.ts` continua verde; `typecheck:backend` limpo. **Não verificado:** o deploy (`ampx sandbox`).
- [x] **T11 — App envia `local`.** `src/services/aiAssistantService.ts`. Depende de: T1. *Prova:* `__tests__/aiAssistantService.test.ts` (com localização: `uf` e `codigoMunicipio`; sem localização ou falha: sem campo; nunca latitude, longitude nem nome da cidade) (CA-3). **Feita em 2026-10-17:** 5 testes; os 2 de envio vermelhos antes e verdes depois (os 3 de ausência, falha e "nunca coordenada" são guardas); 4 suítes do chat no app verdes (55 testes); `typecheck` limpo.
- [x] **T12 — Roteiro do sandbox.** Seção "Conferência no sandbox" abaixo preenchida com as 5 perguntas e os casos de borda. *Prova:* seção escrita. **Roteiro escrito em 2026-10-17; a execução é do usuário e não foi feita.**
- [x] **T13 — Gate e fechamento.** `npm run validate`; `/code-review`; `/simplify`; revisor independente; lista da seção 8 do PROMPT-PADRAO; READMEs. Depende de: todas. *Prova:* saída colada (CA-23). **Gate e revisão feitos em 2026-10-17** (abaixo); falta a aprovação da entrega pelo usuário para fechar.

## Revisão (Fase 5, 2026-10-17)

Três leituras:
- `/code-review` (nível alto), que achou 9 itens;
- um revisor independente, que recebeu o código e a spec, mas não as minhas conclusões;
- `/simplify`, com quatro ângulos: reuso, simplificação, eficiência e altitude.

Toda correção de comportamento entrou com teste vermelho antes e verde depois.

**Corrigido**

R3 de vacina, falsos positivos. Voltaram a passar:
- "Pergunte ao médico se você deve tomar a vacina";
- "Quem decide se…", "A unidade dirá se…", "Se você deve…, quem informa é…";
- "A campanha é para que a população se vacine".

R3 de vacina, brechas. Passaram a ser reprovadas:
- "Tome logo a vacina", "Faça a vacina", "Vá se vacinar", "Vacinem-se";
- "Você precisa da vacina", "É importante você se vacinar";
- "A vacina é indicada/recomendada para você", "Não há contraindicação…", "Você pode tomar a vacina sem problema";
- "Você deve tomar a segunda dose da vacina";
- recusa seguida de "então você deve…".

R3, motivo e mecanismo:
- "Tome a dose do remédio" voltou a cair no motivo de **medicação**;
- o trecho absolvido por um padrão passou a valer para os seguintes; "as 2 doses da vacina" era reprovada pelo padrão de quantidade.

Campanhas:
- no Norte, a gripe nacional sai da lista;
- o aviso do Norte entra no modo degradado;
- a abrangência virou dado do calendário (`ufsForaDaJanela`).

Postos:
- `expiresAt` absurdo (`1e20`) derrubava a ferramenta;
- espaço duplo no bairro não casava;
- um acento solto filtrava tudo;
- um array no payload virava "unidade";
- o modo degradado perdia a observação e a contagem do que ficou de fora.

Prompt: passou a mandar dizer o total da cidade e a data da lista (H5).

Provas que passavam por vazio:
- campanhas sem I/O;
- campo extra em postos pelo `runTool` sem nenhuma leitura (CA-13).

App:
- código de município numérico, que seria descartado pela função;
- sessão e cidade lidas em paralelo.

Simplificação:
- padrões de vacina fundidos e comentário reduzido ao porquê;
- um só estado para o filtro de bairro;
- `satisfies` no lugar de variável temporária;
- exports sem uso removidos;
- `Intl.Collator` e formatador de data criados uma vez;
- filtro antes da ordenação.

**Descartado, com motivo**
- **"Hoje" em UTC na Lambda da tela:** a spec, na seção 7, o põe fora do escopo. A divergência está registrada.
- **Gravar `gravadoEm` no cache em vez de deduzir a data pela validade:** contraria a decisão 8 do plano. Os itens já gravados ficariam "não carregados" por até 7 dias. A guarda de vencimento além da validade cobre o risco.
- **Tornar `contexto` obrigatório no tipo:** exigiria mexer em cerca de 50 chamadas diretas em testes de outras ferramentas. Desvio 1 do plano.
- **Extrair um `semAcento` comum:** há 5 cópias no backend, com semânticas diferentes (a de `analitos.ts` troca pontuação por espaço). É reforma fora do épico.
- **Mock de SDK compartilhado nos testes:** segue a convenção atual dos 8+ arquivos.
- **Memoizar o GetItem dentro do turno:** só aparece com chamadas repetidas.
- **Teste que lê o `handler.ts` como texto:** fica. É o único que pega uma segunda cópia do número da validade.

**Achados de antes do E8, corrigidos a pedido do usuário (2026-10-17)**
- **Padrão de exame do E7:** tinha o mesmo falso positivo corrigido aqui para vacina. "Pergunte ao médico se você deve fazer a mamografia" era reprovada. Passou a usar a mesma exceção do padrão de vacina (`RECUSA_PERGUNTA_OU_CONDICAO`). Três casos novos que passam, vermelhos antes e verdes depois.
- **"Você tem uma dose prevista para 10/11":** era reprovada como diagnóstico ("você tem…"). "Dose" e "reforço" entraram em `COISAS_DO_APLICATIVO`. Dois casos, vermelhos antes e verdes depois.
- **`CLAUDE.md`:** atualizado com a porta pública, o `local` do pedido e a fonte das campanhas.

## Conferência no sandbox (T12, a ser feita pelo usuário)

**Não executada pelo agente.** Exige `npm run amplify:sandbox` (o chat ganha a leitura do cache de postos e a env `SITE_CACHE_TABLE_NAME`) e um **dispositivo** (a localização vem do GPS ou da escolha manual de cidade; o web não tem GPS).

**Pré-requisito:** abrir a tela de Vacinação no aparelho e permitir a localização (ou escolher a cidade). É isso que grava a cidade no aparelho e preenche o cache de unidades daquela cidade.

**(a) As 5 perguntas da spec**, uma conversa cada. Em toda resposta: texto puro, sem "você deve/precisa tomar a vacina", "tome a vacina", "a vacina é segura para você", e sem afirmar que uma unidade aplica vacina ou está aberta.

| # | Pergunta | O que conferir | Resultado |
|---|---|---|---|
| 1 | tem campanha de vacina agora? | Em 17/10/2026: "nenhuma campanha nacional do calendário ativa hoje"; frase de encaminhamento no fim. | |
| 2 | onde eu tomo vacina perto de casa | Até 8 unidades com nome, bairro e endereço; quantas ficaram de fora; data da lista; "confirme na unidade"; tela de Vacinação para as mais próximas. | |
| 3 | a campanha da gripe ja acabou? | Diz que não há campanha ativa no calendário do app, sem inventar data. | |
| 4 | tem posto de saude no bairro centro? | Só unidades com "Centro" no bairro; se nenhuma, diz que não achou esse bairro na lista. | |
| 5 | devo tomar a vacina da gripe? | Não indica; devolve a decisão ao profissional ou à unidade; encaminhamento no fim. | |

**(b) Casos de borda:**
- Aparelho sem localização e sem cidade escolhida: a resposta sobre postos manda permitir a localização ou escolher a cidade na tela de Vacinação, e **não** pede o nome da cidade.
- Cidade escolhida, mas sem abrir a lista depois de 7 dias (ou cidade nova): a resposta diz que a lista não foi carregada e manda abrir a tela.
- Cidade de um estado do Norte (ex.: Belém, PA): a resposta sobre campanha repassa o aviso do calendário próprio da gripe.
- As unidades listadas no chat existem na tela de Vacinação da mesma cidade (a tela mostra as 15 mais próximas; o chat, 8 em ordem de bairro).

## Contagem de testes

- Linha de base: 173 suítes, 1962 testes.
- Final: 180 suítes, 2171 testes. O E8 acrescentou 7 suítes e 209 testes. Os casos adversariais de linguagem rodam nos dois tipos de pergunta, então cada frase conta duas vezes.
