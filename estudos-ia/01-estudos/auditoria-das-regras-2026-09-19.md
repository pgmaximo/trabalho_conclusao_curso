# Auditoria das cinco regras de linguagem (2026-09-19)

Revisão das R1 a R5, uma a uma, comparando **o que o estudo diz** com **o que
está implementado** e **em quantos sentidos cada uma é verificada**.

Ela existe porque três achados seguidos tinham a mesma forma, e três vezes
deixou de ser coincidência:

| Quando | Regra | O achado |
|---|---|---|
| 2026-09-18 | **R4** | verificada só no sentido da citação inventada; a omissão não era vista |
| 2026-09-19 | **R2** | classificava pelo eixo errado, e descartava resposta correta |
| 2026-09-19 | **R3** | a definição proíbe seis coisas; o código cobria cinco |

**O padrão: regra certa no papel, verificada pela metade.** Uma regra assim é
pior que uma regra ausente, porque a spec afirma que ela está coberta — e
ninguém vai olhar de novo.

Esta auditoria procurou o mesmo padrão nas outras duas.

---

## O método

Para cada regra, três perguntas:

1. **O que a definição em `regras-de-linguagem.md` proíbe ou exige?** Item por
   item, e não pela ideia geral.
2. **Quais desses itens o código verifica?**
3. **Em quantos sentidos?** Uma regra pode falhar por não pegar o que deveria
   (buraco) ou por pegar o que não deveria (falso positivo). As duas custam: o
   buraco custa uma resposta ruim entregue; o falso positivo custa uma resposta
   boa descartada — e foi ele que apareceu em produção.

---

## R1 — O termo vetado

**A definição:** a IA nunca usa uma palavra específica, nem flexões e
derivações.

**O implementado:** a raiz é montada a partir de partes — uma única ocorrência
construída no repositório inteiro — e o padrão casa a raiz seguida de sufixos,
com fronteira de palavra à esquerda. Três casos de teste.

**Veredito: verificada, e no sentido certo.** Ela é a única regra **absoluta**
do conjunto: não olha `questionKind`, não tem exceção, não tem precondição. Foi
assim que o usuário a determinou.

**O que vale registrar, e não é defeito:** ela é, por construção, a regra com
maior chance de reprovar uma resposta inocente — a palavra é comum em português
fora de contexto clínico. Isso não é um bug a consertar; é o custo de uma
decisão deliberada. **O que ainda não existe é a medição desse custo**, e ela é
da L7: quantas reprovações de R1 aconteceram, e quantas eram uso inocente.

Na única conversa real medida, **R1 não disparou nenhuma vez em cinco turnos**.

---

## R2 — Encaminhamento a um profissional de saúde

**A definição:** quando a pergunta envolver sintoma, resultado de exame,
medicação ou decisão de cuidado, encaminhar dentro do corpo da resposta. Em
pergunta operacional, **não repetir** — a tela já carrega o aviso permanente.

**O implementado antes de hoje:** exigia encaminhamento sempre que uma tool da
lista clínica tivesse sido chamada. `consultar_exames` estava nessa lista.

**O achado, medido em produção:** 2 de 2 reprovações, as duas falso positivo.
"Faça uma visão de todos" foi classificada como clínica porque uma ferramenta
que devolve nome e data foi chamada — e a resposta inteira foi descartada, duas
vezes.

**A contradição estava escrita no próprio código.** O comentário da R2 dizia que
em pergunta operacional o aviso da tela já basta; a `propostaValida.ts` chamava
o encaminhamento forçado de "rodapé mecânico que a R2 manda evitar". A regra
produzia o rodapé que dizia evitar.

**O conserto:** o eixo passou a ser **o que a resposta diz**, usando o mesmo
reconhecedor de medida da R4. Aperta num sentido — resposta com medida exige
encaminhamento venha de qual ferramenta vier — e afrouxa no outro.

**A armadilha que o conserto quase criou:** `consultar_perfil` devolve condição
crônica e alergia, que são dado de saúde **sem unidade de medida**. Só o texto
não as alcançaria. O classificador tem duas entradas, não uma, e há caso de
teste sobre isso.

**Verificada agora nos dois sentidos**, com três casos e duas mutações
confirmadas.

**O que continua aberto, e é decisão do usuário:** a R2 é a única regra cuja
violação é a **ausência** de um texto fixo, e não a presença de algo proibido.
Isso abre uma saída que nenhuma outra regra tem — acrescentar o encaminhamento
em vez de descartar a resposta. Muda o contrato da D31, e por isso não foi
feito.

---

## R3 — Sugestões pequenas, nunca determinadas

**A definição proíbe seis coisas:** dose, posologia, orientar início ou
interrupção de medicação, diagnóstico nomeado, prognóstico, **interpretação
categórica de resultado**, e afirmar que algo não tem gravidade.

**O implementado antes de hoje, item por item:**

| Item | Estava? |
|---|---|
| dose e posologia | sim |
| intervalo de administração | sim |
| iniciar ou mudar medicação | sim |
| suspender medicação | sim |
| diagnóstico nomeado | sim, **com falso positivo** |
| descarte de gravidade | sim |
| **interpretação categórica de resultado** | **não** |

**Dois achados, e o segundo saiu de um erro meu.** Ao escrever um caso de teste
para a R2, usei `"Você tem um exame de sangue guardado"` como exemplo de
resposta operacional. Ela falhou — e não pela R2.

- **Falso positivo:** o padrão de diagnóstico era `você tem` **sem exigir objeto
  nenhum**. Qualquer inventário do aplicativo — exame, documento, consulta,
  receita — era lido como afirmação de condição médica. É a frase mais natural
  para responder "que exames eu tenho".
- **Buraco:** `"Seu exame está alterado"` passava por R1, R2, R3 e R4 inteiras.
  Nada no sistema impedia o assistente de julgar um valor — que é o núcleo da
  regra 4 da constituição.

**O conserto:** lista fechada de substantivos do aplicativo isenta o
inventário, e só ele; e dois padrões novos cobrem julgamento de valor
("está alterado", "é normal", "está alto") e comparação entre coletas
("melhorou", "piorou"), com exceção para a **recusa de julgar** — "não posso
dizer se está alterado" é a resposta certa, e reprová-la ensinaria o modelo a
não dizer nem isso.

**Um defeito meu no conserto, pego por um teste que o projeto já tinha.** A
primeira versão do padrão de julgamento reprovou **o próprio texto das regras**,
em "sugestões pequenas e **de** baixo risco": o `[eé]` do verbo de estado não
tinha fronteira à esquerda e casou o "e" final de "de". É a armadilha do acento
que este repositório documenta em quatro arquivos, e eu caí nela pelo lado
espelhado. Quem pegou foi o teste que exige que o bloco de regras passe na
própria verificação — sem ele, a primeira coisa que o modelo leria seria um
contraexemplo.

**Verificada agora nos dois sentidos**, com seis casos e mutações confirmadas
nos dois que importam.

---

## R4 — Nenhum número sem origem

**A definição:** todo valor de exame citado veio de uma linha registrada.

**O implementado:** duas metades, em dois arquivos, e é assim que tem que ser.

- a **omissão** — número no texto sem origem declarada — em `languageRules.ts`;
- a **citação inventada** — identificador que nenhuma ferramenta devolveu — em
  `chat-assistant/verificacao.ts`, que é o único lugar que sabe o que as
  ferramentas entregaram.

**Veredito: a única regra verificada nos dois sentidos desde ontem**, e é a que
tem mais casos de teste — seis, mais cinco do reconhecedor de medida que ela
empresta à R2.

**O histórico vale ficar escrito:** até 2026-09-18 ela era verificada só no
sentido da citação inventada, e `[].every(...)` é verdadeiro — uma resposta com
número e lista de citações vazia era **aprovada**, enquanto a spec afirmava que
o caso estava coberto por um teste que não existia.

Na conversa real medida, **R4 não disparou nenhuma vez** com o verificador da
omissão já ativo.

---

## R5 — O que a IA não sabe, ela diz

**A definição:** sem acesso ao dado, sem resposta inventada. "Não tenho esse
exame registrado" é uma resposta aceitável e desejável.

**O implementado antes de hoje:** **só resposta vazia.** Não havia um
`describe('R5')` no repositório inteiro — era a única das cinco sem um único
caso de teste próprio.

**O achado:** é o mesmo padrão, e o mais extremo dos três. A regra estava
inteira no prompt e cobria, na verificação, o pedaço mais fácil.

**O que dá e o que não dá para verificar:**

| | |
|---|---|
| **dá** | as ferramentas disseram que não há dado, e a resposta não reconhece a ausência — ou ela inventa, ou desconversa, e as duas são o que a R5 proíbe |
| **não dá** | "a resposta inventou" em geral. Isso exigiria entender a prosa, e esta camada existe por ser determinística |

O caso mais perigoso do que não dá — o **número** inventado — já está coberto
pela R4 nos dois sentidos. O que sobra descoberto é invenção não numérica, e
está registrado como limite conhecido em vez de contado como pronto.

**O conserto:** `semDados` entra como terceira opção da verificação, ao lado de
`questionKind` e `temOrigem`, e vem de quem chama — porque só ele viu o que as
ferramentas devolveram. Verdadeiro quando ferramentas **foram chamadas** e
**todas** disseram que não há dado.

**As duas metades importam.** Sem a primeira, um "olá" que não consulta nada
cairia como ausência de dado e seria reprovado por não dizer que falta algo, que
é o oposto do que a regra quer.

**Uma exceção deliberada ao contrato do arquivo:** as duas propriedades que
`languageRules.ts` declara como contrato são "reprova, nunca reescreve" e "na
dúvida, reprova". O `semDados` **não** segue a segunda, e está documentado no
próprio campo: ele é uma **precondição** da regra, não uma desculpa dela.
Ausente significa "não se aplica a este turno". Se significasse "reprova", toda
resposta normal cairia.

**Verificada agora nos dois sentidos**, com quatro casos e duas mutações
confirmadas, mais três casos no nível do turno.

---

## O quadro depois da auditoria

| Regra | Itens da definição | Verificados | Sentidos | Casos |
|---|---|---|---|---|
| R1 | 1 | 1 | um, e é absoluta por decisão | 3 |
| R2 | 2 (exigir / não repetir) | 2 | dois | 3 |
| R3 | 7 | 7 | dois | 6 |
| R4 | 2 (omissão / invenção) | 2 | dois | 6 + 5 |
| R5 | 2 (vazia / ausência de dado) | 2 | dois | 4 + 3 |

**Nenhuma das cinco continua verificada pela metade.** É a primeira vez que isso
é verdade, e a primeira vez que alguém conferiu item por item em vez de pela
ideia geral.

## O que esta auditoria NÃO prova

Ela prova que o **caminho** existe e que as regras se comportam contra texto
escrito por mim. **Não prova que o modelo obedece** — isso é medição, e é da
L7, que pede vinte perguntas reais.

A única medição real que existe hoje são cinco turnos, e ela produziu exatamente
um achado: 2 de 2 reprovações eram falso positivo da R2. Com a R2 corrigida e
a R3 e a R5 apertadas, **a próxima rodada da L7 vai medir um sistema diferente
do que foi medido** — e é por isso que ela precisa ser refeita, e não comparada
linha a linha com a primeira.

## O que fica aberto

- **L7:** vinte perguntas reais, com a distribuição por regra refeita. Do
  usuário.
- **O custo do falso positivo da R1**, que ninguém mediu.
- **A decisão da U4:** acrescentar o encaminhamento em vez de descartar a
  resposta, quando a R2 for a única violação. Do usuário.
- **Invenção não numérica**, que continua fora do alcance da camada
  determinística e está registrada como limite, não como pendência.
