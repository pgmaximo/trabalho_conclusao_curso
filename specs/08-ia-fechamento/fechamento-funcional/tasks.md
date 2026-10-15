# TASKS: Fechamento funcional do sistema de IA (Bloco 10)

Spec: `spec.md`. Plano: `plan.md`. TDD com falha confirmada; o que passa de
primeira é confirmado por mutação.

## Estado

Executada em 2026-09-22. `npm run validate` verde ao fim de cada bloco (números
abaixo). **Nada publicado**: o sandbox continua com o código do commit
`9b5ab54`, e a foto só passa a ser lida no aplicativo depois de um
`ampx sandbox` — que é pedido, não feito.

| Ao fim de | Suítes | Testes |
|---|---|---|
| Bloco 1 | 115 | 1301 |
| Blocos 2, 3 e 5 | 116 | 1313 |
| Bloco 4 | 118 | 1328 |
| Blocos 6 e 7 | 118 | 1347 |
| Blocos 8, 8b e 9 (final) | 122 | 1410 |

---

## Bloco 1 — O número do gráfico (G10)

- [x] Teste: `linhasLidasDeGrafico` acha a linha nomeada nas duas frases reais da medição — **falhou contra o stub** (4 de 8)
- [x] Teste: não acha quando o aviso fala de gráfico sem dizer que leu valor — passou contra o stub; **confirmado por mutação** (tirar a exigência do verbo derruba)
- [x] Teste: não acha analito não nomeado; acha pelos dois rótulos; ignora acento e caixa; casa o nome inteiro — negativos **confirmados por mutação** (sem fronteira de palavra, sem normalizar acento, toda linha nomeada)
- [x] Implementar `valorDeGrafico.ts` (`linhasLidasDeGrafico` e `rebaixarLidasDeGrafico`)
- [x] Handler rebaixa a linha (sem valor, pendente), acrescenta aviso e registra `valor-de-grafico`
- [x] Regra de prompt contra ler gráfico, com teste do prompt — **falhou antes**
- [x] Segunda forma do defeito, achada na remedição: "não está impresso; lido do contexto" — teste com a frase real, **falhou antes**

## Bloco 2 — A rota pelos bytes, e a foto ao modelo (G1)

- [x] Teste: `detectarFormato` para PDF, JPEG, PNG, WebP, GIF, e nulo para o resto — **falhou contra o stub** (6 de 9); os três que passaram, **confirmados por mutação** (RIFF sem WEBP, sem recusa, aceita tudo)
- [x] Teste: PNG com nome `.jpg` é PNG — a função nem recebe o tipo declarado
- [x] Implementar `formatoDoArquivo.ts`, com os tetos do Converse
- [x] Teste: `requestExtraction` com imagem monta bloco `image` com o formato certo — **falhou antes**
- [x] `bedrockClient.ts`: fonte `imagem`; `buildUserAskDeFoto`
- [x] Handler: rota por bytes, tetos, sem Textract
- [x] Remover `textractClient.ts`, `documentText.ts` (e o teste dele), `chaveDoTextoDoOcr`, `writeTextArtifact`, `@aws-sdk/client-textract` e as seis ações de IAM
- [x] Remedir a página 11 com o código novo (critério 23) — ver "O que a remedição mostrou"

## Bloco 3 — O motivo da falha (G4)

- [x] Teste: toda copy é português, sem jargão, diz o que fazer, distinta das outras — **falhou contra o stub** (3 de 4); a de distinção, **confirmada por mutação**
- [x] Teste: `requestExtraction` devolve motivo, e não `error.message` — **falhou antes**
- [x] Implementar `motivoDeFalha.ts`; handler grava só copy
- [x] Teste de tela: `FAILED` mostra o motivo gravado; texto técnico antigo continua escondido — **falhou antes**

## Bloco 4 — A foto encolhe no aparelho (G2)

- [x] Instalar `expo-image-manipulator` (`npx expo install`, ~14.0.8)
- [x] Teste: `ladoDeRedimensionamento` preserva proporção e não amplia — **falhou contra o stub**; o de "não amplia", **confirmado por mutação**
- [x] Teste: `nomeDeEnvio` troca a extensão; `ehImagem` reconhece heic/webp
- [x] Implementar `imagemParaEnvio.ts`
- [x] Ligar no upload de exame (antes da validação de tamanho) e no anexo do chat; ampliar a lista de extensões — testes de integração **falharam antes**

## Bloco 5 — O anexo de foto no chat (G3)

- [x] Teste: `buildUserMessage` com imagem monta bloco `image` — **falhou antes**
- [x] Teste: `lerAnexo` devolve imagem, pelos bytes, sem OCR — **falhou antes** (a suíte nem carregava: o Textract ainda era importado)
- [x] Implementar

## Bloco 6 — Censura por extenso (G5)

- [x] Teste: seis locuções viram `<` ou `>` — **falhou antes**
- [x] Teste: censura não estrita (`≤`, `>=`, "igual ou superior a") vai para revisão — **falhou antes**, e expôs um defeito calado (ver abaixo)
- [x] Implementar em `numberParser.ts`

## Bloco 7 — O vocabulário (G6)

- [x] V1 — erros de documentação (TFG marcada fora do extrato, "Microalbuminúria" renomeada, a caixa do diferencial fechada; o "78" do README já tinha sido corrigido antes)
- [x] V2 — eixo do tempo no gerador; **diff do CSV dos 79 vazio**
- [x] V3 — 75 alvos novos, cada tripla consultada no release antes de escrita
- [x] V4 — geração "Sem avisos": nenhum `SEM CANDIDATO`, `CODIGO REPETIDO` ou `SEM pt-BR`
- [x] V5 — cada linha nova conferida: grandeza da unidade, os pares que o nome esconde
- [x] Catálogo regenerado (154 analitos, 45 com massa molar, 18 com unidade canônica própria); teste de deriva verde
- [x] `unitConverter`: unidades e apelidos novos, e unidade conhecida em outra caixa — **falhou antes** (9 de 21)
- [x] Normalizador: unidade vazia é ausência de unidade — **falhou antes**
- [x] V6 — varredura da D27: nenhum código em arquivo novo
- [x] V7 — contagens em `README.md`, `como-foi-gerado.md` e `cobertura-analitos.md`; massas novas em `conversao-unidades.md`; decisões em `pendencias.md`

## Bloco 8 — A pipeline de avaliação (G7, G8)

- [x] Teste: `eventos.ts` — **falhou contra o stub**; o de "ignora o que não é evento", **confirmado por mutação**
- [x] Teste: `relatorio.ts` e o banco de perguntas — **falharam contra o stub**; o do termo vetado, **confirmado por mutação**
- [x] Teste: `planilhaT14.ts` — **falhou contra o stub**
- [x] Implementar as peças puras e as duas bordas (`rodar-avaliacao.ts`, `gerar-planilha-t14.ts`); `scripts/**/*.ts` entrou no typecheck
- [x] Rodar a avaliação contra o sandbox e rotular (Decisão J3) — quatro rodadas; o rótulo está no relatório da rodada 4
- [x] Gerar a planilha da T14 do laudo do Delboni — 48 linhas, fora do repositório (dado de saúde)

## Bloco 8b — O que a rodada automática achou, consertado no mesmo dia (D45)

Nenhum destes itens estava no plano: todos saíram da primeira rodada contra o
modelo real, e cada um seguiu o método — a frase ou o comportamento real virou
teste, o teste falhou, e só então o código mudou.

- [x] "Quais são os valores do meu exame?" degradava 4 de 4 — `MAX_CITACOES` no schema **e** no prompt, com o que fazer quando a pergunta pede mais; teto de saída 2000 → 4000 — testes **falharam antes** (7)
- [x] Falhas da geração deixam rastro (`geracao-falhou`), na primeira e na segunda — **falharam antes** (5)
- [x] O índice de citações lê a `consultar_resultados` — **falhou antes**
- [x] Citação com índice vazio deixa de "conferir" — **falhou antes**
- [x] Busca da tool de analitos nos dois sentidos, com ordem de preferência e pontuação normalizada — **falhou antes**; as duas guardas (glicada e vitamina D) **confirmadas por mutação**, e a da vitamina D só depois de reescrita (a volta para o histórico mascarava a mutação)
- [x] R3: situar o valor na faixa, e escolher a linha da tabela pela pessoa — a frase real da rodada **falhou antes**; os negativos **confirmados por mutação**
- [x] Unidade legível (`unidadeLegivel.ts`) nas ferramentas, no modo degradado e em quatro telas — **falhou antes** em cada ponto
- [x] Rodada 3: "5.500 mil/µL" — o valor do papel sai com a unidade do papel — **falhou antes**
- [x] Rodada 3: resposta vazia depois de ferramenta — a falha de forma ganha a única nova geração da D31 — **falharam antes** (2)
- [x] Rodada 4: "o laboratório indica como normal" — terceira linha da R3 — **falhou antes**; o negativo (tabela inteira) **confirmado por mutação**
- [x] Dado pessoal fora do repositório: a data de nascimento que uma resposta da rodada 1 citou foi mascarada no relatório e trocada no teste que usa a frase

## Bloco 9 — Encerramento acadêmico (G9)

- [x] 4.1 — `estudos-ia/06-encerramento/limitacoes.md`
- [x] 4.2 — `estudos-ia/06-encerramento/avaliacao-de-provedores.md`

## Encerramento

- [x] `decisoes.md` (D40–D45), `roadmap.md` (2.12, 3.2, 4.1, 4.2)
- [x] `notas.md` com as medições do dia
- [x] `npm run validate` verde — 122 suítes, 1410 testes; os 11 avisos de lint são os mesmos de antes do bloco
- [x] Conferência dos critérios de aceite, um a um

---

## O que foi encontrado ERRADO no plano, executando-o

### A regra de prompt contra o gráfico não bastou — e o plano contava com ela

O plano pôs a regra de prompt e a trava lado a lado, como duas camadas
equivalentes. A remedição mostrou que não são: **com a regra no prompt, o
modelo criou a linha do HDL de novo nas duas variantes.** Na imagem limpa, disse
que leu do gráfico, e a trava pegou. Na foto, inventou **40** — o "Superior a
40" da tabela de referência — e descreveu o que fez com outras palavras ("não
está claramente impresso; lido a partir do contexto"), que a trava do plano não
reconhecia. A trava ganhou a segunda forma, com a frase real como teste. **A
regra de prompt fica, mas quem protege o histórico é o código.**

### A ordem dos blocos 2, 3 e 5 não se sustentou

O plano separava a rota pelos bytes (2), o motivo da falha (3) e o anexo do chat
(5). Na execução eles eram uma peça só: o handler novo precisava de copy para as
falhas que a rota nova cria (formato, tamanho), e o anexo do chat importava o
mesmo cliente do Textract que o Bloco 2 removia — a suíte dele parou de carregar.
Os três foram feitos juntos, com um `validate` só.

### O plano não viu que o `≤` virava número exato

O Bloco 6 previa só acrescentar as locuções. O teste da censura não estrita
achou um defeito anterior ao Bloco 10: uma linha do `parseDecimal` descartava o
"≤" e o "=" de "<=", e **"≤ 5" entrava como 5 exato**. A primeira versão do
conserto acrescentou uma guarda — e a mutação que a tirava **sobreviveu**,
porque o que consertava era tirar a linha antiga, e a guarda era redundante. Saiu
a guarda; a mutação certa (devolver a linha antiga) derruba o teste.

### O estudo de cobertura tinha seis triplas erradas

O plano mandava "transcrever as triplas da seção 1" do estudo. Consultadas no
release antes de escritas, seis não batiam, e duas teriam falhado **em silêncio**
— casando outro termo, sem aviso: a 1,25-vitamina D (o estudo apontava
`Calcitriol`, que no 2.83 é só a D3) e a Lp(a) (o termo vizinho,
`Lipoprotein.alpha`, é a alfa-lipoproteína, fração do HDL). Lista completa em
`estudos-ia/05-vocabularios/pendencias.md`, seção 7.

### A ampliação do catálogo quebrou um teste — e o teste estava certo

`analitosTool.test.ts` usava o zinco como exemplo de analito **fora** do
catálogo. A ampliação o pôs dentro, e o teste falhou. A falha era real: "zinco"
passou a resolver para o código LOINC, que ninguém tem, e as linhas gravadas
antes com código local ficaram invisíveis à conversa. A tool agora só deixa o
catálogo vencer quando há linha dele. **O plano não previa a costura com os
dados antigos**, e o reprocessamento de documento antigo continua duplicando a
linha que mudou de código — registrado em `limitacoes.md`, §2.7.

### Dois testes meus estavam errados, e as mutações é que mostraram

- O caso "casa o nome inteiro" usava *Ferro* × *Ferritina* — e "ferro" nem é
  pedaço de "ferritina". A mutação que tira a fronteira de palavra sobreviveu.
  Trocado pelo par real do hemograma, *HCM* dentro de *CHCM*.
- O caso da planilha com "sim/não/ok" cortava um separador a mais, e a resposta
  caía na coluna errada. Defeito do teste; o código estava certo.

### Caractere invisível entrou no fonte três vezes

A classe de acentos (`̀-ͯ`) e o BOM (`﻿`) foram gravados como
**caractere literal** — pelo Python com escape de shell e pela própria
ferramenta de escrita. Funcionam, mas são invisíveis numa revisão de código. Uma
varredura por caractere de controle e marca combinante nos arquivos alterados
achou todos, e eles foram trocados pela forma escapada.

### O plano tratava a pipeline de avaliação como instrumento, e ela virou o bloco que mais achou defeito

O plano previa medir e relatar. A primeira rodada achou seis defeitos na
conversa, e cinco tinham a forma que o projeto mais teme: falhar sem rastro, ou
aprovar o que não devia. O mais grave era silencioso por construção — o índice
de citações não conhecia a tool que o Bloco 8 criou, e a conferência dava
"confere" quando não havia contra o que conferir. **Nenhum dos 1.300 testes
existentes podia achar isso**, porque cada um deles testava uma peça com o
dublê que a peça esperava. Foi preciso o modelo real juntar as peças.

### Dois consertos meus precisaram de segundo conserto, e a rodada seguinte é que mostrou

- A busca nos dois sentidos (achado 5) escolheu o colesterol total na rodada 2:
  "colesterol" (10 letras) vencia "LDL" (3). O teste que devia pegar isso tinha
  só a linha do LDL no histórico, e a volta para o histórico escondia a escolha
  errada. Reescrito com as duas linhas, ele falhou, e o conserto de verdade foi
  normalizar a pontuação ("Colesterol.LDL" é o sinônimo oficial).
- Na R3 nova, o `\s` dentro de template string virou `s`, e duas das quatro
  formas não casavam. O teste pegou; a causa era escape.

### A rede desta máquina recusa o endpoint padrão do Bedrock

Não é defeito do plano, mas é premissa que ele não tinha: `bedrock-runtime.us-east-1`
tem a conexão reiniciada nesta rede (fora e dentro do sandbox do shell), e o
endpoint FIPS da mesma região responde. Toda medição local usa
`AWS_USE_FIPS_ENDPOINT=true`; a função publicada não é afetada.

---

## Conferência dos critérios de aceite, um a um (2026-09-22)

| # | Critério | Estado | Onde se prova |
|---|---|---|---|
| 1 | Imagem JPEG/PNG/WebP/GIF lida pela visão, sem Textract | **cumprido no código; não publicado** | `bedrockClient.test.ts` (bloco `image`); medição §2 da spec. Só vale no app depois do `ampx sandbox` |
| 2 | Rota decidida pelos bytes | cumprido | `formatoDoArquivo.test.ts` — PNG com nome de JPEG |
| 3 | Formato não suportado falha com motivo, sem chamar o modelo | cumprido | `avaliarArquivo` antes de `requestExtraction` no handler |
| 4 | Acima do teto falha com motivo, sem chamar o modelo | cumprido | `formatoDoArquivo.test.ts` (tetos) |
| 5 | Foto reduzida a 2000 px, JPEG 0,85; HEIC convertido | cumprido | `imagemParaEnvio.test.ts`, `uploadDoExame.test.ts`, `chatAttachmentService.test.ts` — **manipulador mockado**: não foi exercitado num aparelho |
| 6 | Nenhuma ação do Textract no IAM, nenhum import do SDK | cumprido | `backend.ts`; o pacote saiu do `package.json` |
| 7 | Foto anexada no chat vira bloco de imagem | cumprido | `chatPrompt.test.ts`, `anexoPontual.test.ts` |
| 8 | `extractionError` só com copy da lista fechada | cumprido | `motivoDeFalha.ts`; todos os `markFailed` do handler |
| 9 | A tela mostra o motivo | cumprido | `document-detail-screen.test.tsx` |
| 10 | Nenhum `erro.message` chega ao campo | cumprido | `bedrockClient.test.ts` (falha) e o `catch` do handler |
| 11 | Seis locuções viram qualificador; "igual ou superior a" não | cumprido | `numberParser.test.ts` — e o `≤` que virava número exato também |
| 12 | Eixo do tempo; os 79 códigos não mudam | cumprido | `diff` vazio |
| 13 | Linhas novas; avisos resolvidos | cumprido | "Sem avisos" na geração de 154 linhas |
| 14 | Catálogo regenerado; teste de deriva passa | cumprido | `catalogoNaoDeriva.test.ts` |
| 15 | Varredura da D27 limpa | cumprido | registrada em `como-foi-gerado.md` |
| 16 | Comando que roda o banco de perguntas e grava relatório | cumprido | `scripts/avaliacao/rodar-avaliacao.ts` |
| 17 | Rodada feita, relatório no repositório, rotulado e marcado | cumprido | `estudos-ia/04-implementacao/avaliacoes/` — quatro rodadas; rótulo na 4 |
| 18 | Planilha da T14 e contagem de automáticas erradas | cumprido | `planilhaT14.test.ts`; planilha do Delboni gerada (fora do repositório) — **não preenchida**: isso é a T14, com papel |
| 19 | 4.1 e 4.2 escritas | cumprido | `estudos-ia/06-encerramento/` |
| 20 | Decisões e roadmap | cumprido | D40–D45; roadmap 2.12 |
| 21 | Prompt proíbe ler gráfico | cumprido | `extractionPrompt.test.ts` |
| 22 | Linha lida de gráfico vai para revisão sem valor | cumprido | `valorDeGrafico.test.ts` |
| 23 | Remedida a página 11: HDL não entra como automático | **cumprido** | terceira medição, com a trava ampliada e o catálogo de 154: na foto o modelo **não criou** a linha; na limpa ele afirmou ter lido "do resultado impresso" — o que é falso — mas citou o gráfico, e a trava rebaixou a linha sem valor |
