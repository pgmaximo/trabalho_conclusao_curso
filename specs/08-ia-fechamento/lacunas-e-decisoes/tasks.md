# TASKS: Fechamento do sistema de IA (Bloco 9)

Acompanhamento. O porquê de cada item está na `spec.md`; o como, no `plan.md`.

**Toda tarefa desta lista segue o ciclo:** escrever o teste, rodar e **ver
falhar de verdade**, implementar, rodar e ver passar. "Nenhum teste encontrado"
não é falha confirmada. Teste que passa de primeira é confirmado por mutação.

## Estado

**Aberta e executada em 2026-09-19**, no branch `sistema_ia`, em duas sessões:
os blocos 1 a 4 primeiro, e os blocos 5 e 6 depois das cinco decisões aceitas
pelo usuário. **Ficaram de fora apenas os itens do usuário** — a publicação do
sandbox e as três medições.

`npm run validate` verde com **1280 testes em 113 suítes**, contra 1221/109 na
abertura — 59 testes novos, 4 suítes novas.

Fundada em duas medições contra o serviço real — a conversa de cinco turnos de
2026-09-18 e o reprocessamento do laudo de 2026-09-19. Ver `spec.md` §2.

**O que ainda NÃO está publicado:** o campo `rawReferenceText` mudou o schema
do `LabResult`. Até o sandbox ser republicado (Node 20, `npx ampx sandbox`), a
extração continua gravando sem ele — o caminho existe e está testado, e o dado
só aparece depois da publicação e do reprocessamento.

---

## Bloco 1 — Limite único (F3)

- [x] **F3** — Teste que reproduz o defeito: linha cujo laudo traz só
      `rawReferenceLow` entra com `referenceLow` preenchido, `referenceHigh`
      nulo, e **sem** ir para revisão. Falha confirmada antes do conserto.
- [x] **F3** — Teste sobre o texto do prompt: a regra do limite único está
      escrita.
- [x] **F3** — A regra entra em `extractionPrompt.ts`.
- [x] **F3** — Teste de que a tela escreve "acima de 40 mg/dL" para essa linha.
      Reusa `formatarFaixa`, que já existe e já é testado.

## Bloco 2 — A frase falsa na tela (F2)

- [x] **F2** — Teste: linha sem número e sem texto de faixa **não** afirma que o
      laboratório deixou de informar.
- [x] **F2** — Trocar a frase em `AnalyteCollectionRow.tsx` por uma sobre o que
      se sabe: *"O laudo não trouxe faixa para este resultado."*

## Bloco 3 — `rawReferenceText` (F1, decisão E3)

- [x] **F1** — Teste do esquema: `rawReferenceText` aceita texto e aceita vazio;
      `.strict()` continua recusando campo desconhecido.
- [x] **F1** — Campo em `extractionSchema.ts`, no nível da **linha**.
- [x] **F1** — Teste de que o JSON Schema gerado para o `output_config` continua
      limpo das três palavras que o Bedrock recusa.
- [x] **F1** — Regra no prompt: tabela se **transcreve**, não se reduz.
- [x] **F1** — Teste do normalizador: o texto passa adiante **intacto** e
      **nunca é convertido**, inclusive quando o valor foi convertido de
      unidade.
- [x] **F1** — Campo em `medical-documents.ts` (`LabResult`), opcional. Sem
      alteração destrutiva: linha já gravada continua válida.
- [x] **F1** — Gravação em `resultWriteBuilder.ts`.
- [x] **F1** — Teste de idempotência: reprocessar documento antigo **preenche** o
      campo e **não duplica** linha.
- [x] **F1** — Leitura nos tipos de `extractionService.ts` e `analyteSeries.ts`.
- [x] **F1** — Exibição com os **três estados** — número, texto, nada — em
      `ExtractedResultRow.tsx` e `AnalyteCollectionRow.tsx`. Um caso de teste
      para cada.
- [x] **F1** — Quando a unidade exibida diferir da do papel, o texto da faixa
      aparece junto do valor como o papel o escreveu, e não junto do convertido.
- [x] **F1** — O campo chega às tools de conversa por `linhasDeResultado.ts`, e
      as duas tools passam a devolvê-lo em `faixaDoLaboratorio`, com teste nas
      duas formas: `comoOLaudoEscreveu` nulo quando há números, e preenchido
      quando o laudo escreveu em tabela.

## Bloco 4 — Ninguém escolhe a faixa (F4, decisão D3)

- [x] **F4** — Teste sobre o prompt: a proibição de escolher linha de tabela por
      idade, sexo ou grupo está escrita.
- [x] **F4** — Teste de **saída**: a lista de `warnings` de uma extração de
      exemplo não contém escolha declarada de faixa.
- [x] **F4** — Registrar em `decisoes.md` que a escolha por perfil (D4) fica
      como caminho futuro, com o critério visível e sem esconder a tabela.

## Bloco 5 — O encaminhamento costurado (decisões A2 e C3)

**Não começar antes do sim.** Os blocos 1 a 4 valem sozinhos e não dependem
desta decisão.

- [x] **A/C** — Teste: resposta com medida e **sem** encaminhamento, aprovada
      nas outras quatro regras, sai **com** o encaminhamento e **não** é
      descartada.
- [x] **A/C** — Teste de regressão: resposta que viola qualquer outra regra
      continua no caminho A → E → C. Este é o teste que impede a costura de
      virar afrouxamento.
- [x] **A/C** — Módulo puro `encaminhamento.ts`, com o texto fixo e a costura.
- [x] **A/C** — Teste de que o texto fixo **passa nas cinco regras** — mesmo
      molde do teste que exige que o bloco de regras passe na própria
      verificação.
- [x] **A/C** — Teste de que o texto fixo não afirma nada sobre quem pediu o
      exame e não convida a pessoa a julgar valor.
- [x] **C3** — O prompt passa a pedir que o modelo **não** escreva o
      encaminhamento; quem escreve é o aplicativo. Teste sobre o prompt.
- [x] **A/C** — Log `encaminhamento-costurado`, sem nada do conteúdo, no formato
      do `resposta-reprovada`.
- [x] **A/C** — Teste da ordem: `textoLimpo` antes da verificação, costura
      depois dela.
- [x] **A/C** — A D31 ganha a ressalva escrita, e vira decisão numerada.

## Bloco 6 — As datas (decisões B5 e B2)

**Não começar antes do sim.**

- [x] **B5** — O rótulo do campo passa a dizer o que o campo é, por tipo de
      documento: "Guardado em" para exame, "Data da receita" para receita.
      Teste de copy.
- [x] **B5** — O valor continua preenchido com hoje. **Mudou o nome, não o
      comportamento** — teste que fixa isso, para ninguém "consertar" depois.
- [x] **B2** — Teste: documento com linha cuja `collectedAt` diverge da
      `documentDate` mostra aviso; sem divergência, nenhum aviso.
- [x] **B2** — O aviso em `DocumentDetailScreen.tsx`, com as duas datas escritas
      por extenso.
- [x] **B2** — Nenhuma escrita automática no campo do formulário (D24).

## Decisões que são do usuário

Estudo completo de cada uma na `spec.md` §5, com opções, prós, contras e a
recomendação.

- [x] **Decisão A (U4)** — costurar o encaminhamento quando a R2 for a única
      violação. *Recomendado: A2.*
- [x] **Decisão B (U17)** — a data preenchida com hoje. *Recomendado: B5 + B2.*
- [x] **Decisão C (F6)** — a fronteira da regra 4. *Recomendado: C3.*
- [x] **Decisão D (F4)** — quem escolhe a faixa. *Recomendado: D3.*
- [x] **Decisão E (F1)** — a forma de guardar a faixa. *Recomendado: E3.*
- [x] **D e E registradas** na **D37** de `estudos-ia/00-visao/decisoes.md`, com
      as recusadas e o porquê de cada uma.
- [x] **A e C** registradas na **D38**, que altera a D31 com a ressalva escrita.
- [x] **B** registrada na **D39**.

## Encerramento

- [x] `npm run validate` passa — 1280 testes, 113 suítes, com os seis blocos.
- [x] Os 19 critérios de aceite da `spec.md` §9 conferidos **um a um**, com o
      resultado escrito.
- [x] `react-doctor` nos arquivos React tocados — **12 achados, nenhum
      procedente para esta EPIC.** Veredito escrito abaixo.
- [ ] **[USUÁRIO]** Republicar o sandbox (Node 20) e **reprocessar o laudo do
      Delboni**: menos de 3 linhas sem faixa nem texto, contra as 14 de hoje.
- [ ] **[USUÁRIO]** **L7** — nova rodada de pelo menos vinte perguntas, com a
      distribuição por regra. Roteiro em
      `estudos-ia/04-implementacao/roteiro-de-conferencia.md`.
- [ ] **[USUÁRIO]** **Custo do falso positivo da R1**, contado na mesma rodada:
      quantas reprovações de R1 aconteceram, e quantas eram uso inocente.
- [ ] **[USUÁRIO]** **U12** — o laboratório conferido contra laudos de emissores
      diferentes, junto da T14.
- [ ] Medições em `estudos-ia/04-implementacao/notas.md`, na seção deste bloco.

---

## O que foi encontrado ERRADO no plano, executando-o

### O plano afirmou que `formatarFaixa` tinha teste. Não tinha.

O Bloco 1 dizia, sobre a metade de tela do limite único: *"`formatarFaixa` já
escreve 'acima de 40' e 'até 90'. Há teste."* A função **não tinha um único
caso de teste** — `decimal-display.test.ts` cobria só `formatarDecimal`.

A função estava certa, e por isso o erro é instrutivo: **o plano confundiu
"funciona" com "está protegido"**. É a mesma forma dos três achados que
fundaram a auditoria das regras — certo no papel, verificado pela metade — e
apareceu num plano escrito *depois* daquela auditoria. Quatro casos entraram,
inclusive o do limite único, que é o que o F3 precisa.

### Duas das quatorze linhas não precisavam de campo nenhum

O plano tratava o F3 como conserto barato "que ajuda"; medindo de perto, HDL e
`*eGFR` **já cabiam no esquema de hoje** — um limite preenchido, o outro vazio.
O normalizador aceitava, a tela sabia escrever. O que faltava era **uma
instrução no prompt**, e o modelo, mandado não inventar, fazia a coisa certa
com a instrução que tinha. Duas linhas recuperadas por duas frases de texto.

### O teste de saída do F4 virou um módulo, e a razão é a lição da U1

A tarefa pedia "teste de saída: a lista de `warnings` não contém escolha
declarada de faixa". Contra uma extração de exemplo escrita por mim, isso
testaria a minha fixture, e não o sistema.

O que entrou no lugar foi `escolhaDeFaixa.ts`: um módulo puro que **conta**
quantos avisos declaram escolha, com o handler registrando o número no log.
**Conta, e não reprova** — descartar uma extração boa por causa de uma palavra
repetiria exatamente o erro que a R2 cometia contra a conversa, e que o Bloco 8
consertou. A instrução está no prompt; o número dirá se ela basta, e quem o
lerá é a próxima passagem contra o laudo real.

Duas mutações confirmaram os dois lados: sem a segunda ordem da frase, a
escolha por idade passa batido; com o detector sempre verdadeiro, os avisos
comuns da leitura viram ruído.

### O plano desenhou o log da costura para medir a coisa errada

O Bloco 5 previa uma linha `encaminhamento-costurado`, e a recusa da opção A3
se apoiava nela: *"sem esse número, ninguém sabe mais se o modelo obedece à
R2"*.

Executando, o raciocínio virou do avesso. Com a **C3**, o prompt pede que o
modelo **não** escreva o encaminhamento — então a costura virou o caminho
normal, e contá-la passou a medir quantas respostas são clínicas, não o
comportamento do modelo. **O sinal é o inverso:** quantas vezes ele escreveu
mesmo assim.

Entraram os dois eventos, `encaminhamento-costurado` e
`encaminhamento-do-modelo`, e é o segundo que a L7 vai ler. A A3 continua
recusada pelo mesmo motivo — só que agora pelo número certo.

### A C3 não cabia no prompt do chat: ela mudou a R2 do bloco de regras

O plano dizia "o prompt passa a pedir que o modelo não escreva o
encaminhamento", e apontava para `chatPrompt.ts`. Mas a instrução que
**produzia** o defeito estava no bloco das cinco regras: a R2 mandava encaminhar
*"de forma específica: qual especialidade, o que levar à consulta"*.

Acrescentar "não escreva" no prompt do chat sem mexer nisso deixaria o modelo
lendo duas instruções contrárias no mesmo texto. A R2 do `rulesPrompt.ts` foi
reescrita — **a regra não mudou**, mudou quem escreve a frase. Como esse bloco
é citado no TCC inteiro, a mudança está registrada na D38 com todas as letras.

### "Avisar quando divergir muito" pedia um número que ninguém mediu

O plano do Bloco 6 recomendava avisar quando a data de coleta divergisse
**"muito"** da digitada. "Muito" precisa virar um limiar em dias, e um limiar
sem medição é o tipo de número que este repositório já carrega uma vez, marcado
como provisório.

A regra implementada não precisa de número: avisa quando a data guardada cai
**fora da faixa** de coleta do laudo. Um PDF consolidado reúne coletas de vários
dias, e uma data digitada entre elas é plausível — o caso que a faixa resolve, e
que um limiar em dias resolveria pior.

### O rótulo errado estava em DUAS telas, e o plano só apontava uma

O plano mandava renomear o campo em `AddExamScreen.tsx:194`. O modo de edição de
`DocumentDetailScreen.tsx` tinha o mesmo campo com o mesmo rótulo. O teste é uma
varredura de fonte sobre as duas telas, e não uma renderização de uma delas:
foi um teste por tela que deixou as duas divergirem em silêncio no passado.

### O react-doctor acusou 12 achados, e nenhum é desta EPIC

O hook de commit apontou regressões. Conferidos um a um, com o arquivo aberto:

| Achado | Veredito |
|---|---|
| 8 erros de "texto cru fora de `<Text>`" em `ExtractedResultsSection.tsx` | **falso positivo, confiança alta.** Todo o texto apontado está dentro de `<Legenda>`, um componente local do próprio arquivo que renderiza `<Text>`. A regra não segue componente próprio. As linhas são renderizadas por testes que passam — se crashassem, a suíte da tela de detalhe não rodaria |
| 2 avisos de travessão em copy | **estilo, e deliberado.** As duas linhas são copy anterior a esta EPIC, e o travessão é a voz escrita do projeto inteiro. Nenhuma das frases novas usa travessão |
| 2 avisos de `prefer-useReducer` | **pré-existente e fora de escopo.** As duas telas já tinham seis `useState` antes desta EPIC; agrupá-las em reducer é refatoração de comportamento em tela entregue, e a regra 5 da constituição pede o contrário |

Nada foi suprimido e nenhuma configuração foi mexida — o veredito fica escrito
aqui, que é onde a próxima pessoa vai procurar quando o hook acusar de novo.

### O que ficou sem teste, e está dito em vez de escondido

O teste da ORDEM — limpar, verificar, costurar — passou de primeira e **não foi
confirmado por mutação isolada**: as duas propriedades que ele combina já são
confirmadas por mutação em outro lugar (a limpeza, na suíte da U13; a costura,
no guarda de duplicata do módulo). Ele vale como guarda da combinação, e está
contado como tal, não como prova nova.

O `handler.ts` não tem suíte neste repositório — ele é o ponto de encontro com
a AWS, e a EPIC de extração o deixou assim de propósito, empurrando a lógica
para módulos puros. A linha de log do F4 segue essa regra: o **módulo** está
testado nos dois sentidos, a **chamada** dele no handler não. Quem a verifica é
o reprocessamento do laudo, que é item do usuário no encerramento.


---

## Conferência dos critérios de aceite, um a um (2026-09-19)

Feita no encerramento do código, e não meses depois. **14 com teste, 1 com
teste e mutação em cada sentido, 4 dependem de chamada real ao modelo e são do
usuário.**

| # | Critério | Situação |
|---|---|---|
| 1 | Dois números continuam preenchidos, e a banda do gráfico continua | **com teste** — `analyteNormalizer.test.ts` e a suíte da série, inalteradas |
| 2 | Limite único entra com um dos dois, e a tela escreve "acima de 40" | **com teste**, e a função de exibição ganhou os quatro casos que não tinha |
| 3 | Tabela entra em `rawReferenceText`, sem número inventado | **com teste** no esquema, no normalizador e nas duas telas |
| 4 | Sem faixa no papel, a tela diz que **o laudo** não trouxe | **com teste** — e a frase falsa sobre o laboratório saiu |
| 5 | Reprocessar devolve menos de 3 linhas sem faixa nem texto | **aberto — é do usuário**, e depende de publicar o sandbox |
| 6 | Nenhum aviso da extração escolhe faixa por sexo, idade ou grupo | **com teste** no módulo, **duas mutações**; a obediência do modelo é da L7 |
| 7 | O prompt proíbe reduzir tabela a par de números | **com teste** sobre o texto do prompt |
| 8 | Resposta com medida sem encaminhamento é costurada, não descartada | **com teste** — `verificacao.test.ts`, "o encaminhamento costurado" |
| 9 | Outra regra junto continua no caminho A → E → C | **com teste**, em dois casos: posologia e valor sem origem |
| 10 | A costura aparece no log, distinguível | **com teste** — e o evento espelho `encaminhamento-do-modelo` entrou junto |
| 11 | O texto fixo passa nas cinco regras e não inventa quem pediu | **com teste**, contra o próprio verificador |
| 12 | O campo do formulário tem nome que descreve o que ele é | **com teste** de varredura, nas duas telas |
| 13 | Divergência entre as datas produz aviso visível | **com teste** no módulo puro (7 casos, 1 mutação) e na tela |
| 14 | `npm run validate` passa | **1280 testes, 113 suítes** |
| 15 | As cinco decisões registradas | **D37** (faixa), **D38** (encaminhamento, altera a D31), **D39** (datas) |
| 16 | L7: vinte perguntas | **aberto — é do usuário** |
| 17 | U12: laboratório contra outros laudos | **aberto — é do usuário** |
| 18 | Custo do falso positivo da R1 | **aberto — é do usuário** |
| 19 | Esta conferência | é esta tabela |

**A leitura honesta desta tabela:** os testes provam que o **caminho** existe e
que as regras se comportam contra texto escrito por mim. **Nenhum deles prova
que o modelo obedece** — nem que ele transcreve a tabela em vez de escolher uma
linha, nem que ele para de escrever o encaminhamento por conta própria. Os
critérios 5, 6, 16, 17 e 18 são exatamente essa fronteira, e estão marcados
como tal em vez de contados como prontos.
