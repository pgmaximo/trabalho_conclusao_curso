# Estudo — o que acontece quando a verificação reprova uma resposta

**Aberto em 2026-09-16.** Este é o estudo que a `regras-de-linguagem.md` pediu
ao registrar a decisão como pendente, e que a spec da EPIC de regras deixou em
aberto de propósito (regra 8 da constituição), porque a escolha depende de
medir coisas que só a EPIC da conversa mede.

## 1. Qual é a decisão, exatamente

A IA de conversa gera texto. Antes de esse texto chegar à tela, ele passa por
uma verificação determinística — a camada 4 das cinco — que o reprova quando
ele contém posologia, diagnóstico fechado, descarte de gravidade, o termo
vetado, uma citação de valor que nenhuma ferramenta devolveu, ou quando falta o
encaminhamento a um profissional de saúde numa pergunta clínica.

**A pergunta é o que acontece no instante seguinte.**

Ela parece pequena e não é. Ela decide três coisas ao mesmo tempo: o que a
pessoa vê, quanto o projeto paga por turno, e — a mais importante — **qual é o
pior resultado possível do sistema inteiro**. A verificação é a última porta.
Depois dela não há mais nada entre o modelo e a pessoa.

> **Correção de uma imprecisão no material existente.** A
> `regras-de-linguagem.md` escreve "quando a verificação da camada 2 barra uma
> resposta". A camada 2 é o encaminhamento como campo obrigatório do schema —
> ela não barra nada, ela impede. Quem barra é a **camada 4**, a verificação
> determinística. Vale corrigir lá quando este estudo for encerrado.

## 2. O que está em jogo

Quatro coisas, e elas competem entre si:

| | O que se perde ao errar para este lado |
|---|---|
| **Segurança** | uma frase com posologia ou diagnóstico chega a uma pessoa |
| **Honestidade** | a pessoa acha que leu algo que ninguém escreveu, ou que a IA "sabe" e não quis dizer |
| **Utilidade** | a IA vira uma máquina de dizer não, e a pessoa para de usá-la |
| **Custo e espera** | cada nova geração paga o modelo de novo e faz a pessoa esperar mais |

A assimetria entre elas já está decidida em outro lugar e não se reabre aqui: a
spec das regras de linguagem diz que **falso positivo é preferível a falso
negativo**. Uma resposta boa reprovada custa uma nova geração; uma resposta com
posologia aprovada custa muito mais.

O que **não** está decidido é o que fazer com o falso positivo depois que ele
acontece — e é disso que trata este estudo.

## 3. As opções

### A. Gerar de novo, com o motivo da reprovação como instrução

Manda-se ao modelo a mesma conversa mais um bilhete: *"a resposta anterior foi
recusada porque continha posologia; escreva de novo respeitando isso."*

**A favor:**

- É a única opção que pode produzir **uma resposta de verdade** — as outras
  produzem ausência de resposta ou dado cru.
- A taxa de sucesso tende a ser alta por uma razão específica, e ela merece
  atenção: **na maioria dos casos a segunda geração não precisa achar uma
  resposta diferente, precisa recusar direito.** Quando alguém pergunta
  "quantos miligramas eu tomo?", existe uma resposta certa e ela é "não indico
  quantidade de medicamento; seu registro mais recente é este; leve ao seu
  médico". O conjunto adversarial da EPIC de regras já afirma isso num teste:
  para cada tentativa de arrancar a violação, existe uma resposta boa que
  **passa**. Recusar direito é fácil; o modelo errou por excesso de vontade de
  ajudar, não por falta de saída.
- O bilhete é informação nova no contexto. Não é a mesma pergunta de novo.

**Contra:**

- Paga o modelo outra vez e faz a pessoa esperar mais.
- **Pode entrar em laço quando a pergunta em si exige a violação.** Se a pessoa
  insiste em pedir dose, cada geração vai flertar com dar a dose.
- Um bilhete mal escrito ensina o modelo a contornar em vez de obedecer. Dizer
  "não use a palavra X" pode fazer o modelo usar um sinônimo que diz a mesma
  coisa proibida. O bilhete precisa dizer a **regra**, não o sintoma.

**Quanto custa, de fato** — e aqui há um achado que muda a conta, na §5.

### B. Reescrever o trecho reprovado

Recortar a frase ofensora e entregar o resto.

**A favor:**

- Instantâneo e sem custo de modelo.
- Preserva a parte boa da resposta, que costuma ser a maior parte.

**Contra — e é aqui que a opção morre:**

- **Recortar pode inverter o sentido em vez de removê-lo.** "Seu resultado é
  32,5, o que não é preocupante" vira "Seu resultado é 32,5" — recorte
  inofensivo. Mas "Você não tem sinais de anemia" recortado pelo padrão de
  diagnóstico vira "Você" ou vira nada, e uma resposta que some no meio é pior
  que uma recusa. Pior ainda: há recortes que produzem uma frase **gramatical,
  plausível e com outro significado**. Não existe teste que cubra esse espaço.
- **O texto resultante não foi escrito por ninguém.** Nem pelo modelo, que
  escreveu outra coisa, nem por uma pessoa. E ele fala sobre a saúde de alguém.
  Esse é o argumento que já está escrito na spec da conversa, e ele é decisivo
  sozinho.
- Exige do verificador uma precisão que ele não tem e não deveria ter. Hoje ele
  devolve um `excerpt` com vinte caracteres de contexto de cada lado — bom para
  uma pessoa ler num log, inútil para excisão cirúrgica. Tornar o verificador
  capaz de recortar significa dar a ele posições exatas, o que aumenta a
  complexidade e a superfície de erro **da camada que existe para ser
  confiável**.

### C. Mostrar indisponibilidade honesta

A tela diz que a resposta não pôde ser exibida, e sugere reformular.

**A favor:**

- Custo zero, instantâneo, e **impossível de errar para o lado perigoso**.
- É honesto: não finge que não houve resposta, nem mostra a que houve.

**Contra:**

- É a opção que mais machuca a utilidade. Duas recusas seguidas e a pessoa
  conclui que a IA não serve.
- **"Tente reformular" é uma copy ruim quando a pergunta está fora do escopo
  por natureza.** Convida a pessoa a repetir uma pergunta que vai ser recusada
  de novo. A copy precisa dizer o que o aplicativo **faz**, não pedir à pessoa
  que adivinhe o que ele não faz.

### D. Mostrar mesmo assim, com um aviso

Exibir a resposta reprovada precedida de "esta resposta pode conter
imprecisões".

**Nomeada aqui porque é a opção tentadora**, a que aparece sozinha na cabeça de
quem está com pressa, e porque recusá-la explicitamente vale mais que ignorá-la.

**Contra:** é a negação da camada inteira. Se a resposta reprovada pode ser
exibida com um aviso, então a verificação não é uma porta, é um enfeite — e
todo o argumento das cinco camadas cai junto. Um aviso genérico não neutraliza
uma posologia específica; ele apenas transfere a responsabilidade para a pessoa
que menos condições tem de avaliar.

**Recusada sem contrapartida.**

### E. Cair para uma resposta determinística, montada com o dado das ferramentas

Quando a resposta gerada não pode ser exibida, o aplicativo mostra **o que as
ferramentas devolveram**, num texto de modelo fixo, sem prosa gerada:

> Não consegui escrever uma resposta sobre isso. O que está registrado:
> **Vitamina D (25-OH)** — 12/03/2026: 32,5 ng/mL · 20/09/2026: 41 ng/mL.
> Referência informada por cada laboratório na tela do documento.
> Leve seus exames ao seu médico para avaliar o que eles significam.

**A favor:**

- **Não é um remendo da resposta do modelo.** É outra coisa, construída a
  partir de dado estruturado, e é por isso que ela não sofre do problema da
  opção B.
- **Passa as regras por construção.** Não tem posologia porque não tem espaço
  para ela; cita número com origem porque a origem é campo; encaminha porque o
  encaminhamento é parte do modelo fixo. Não depende de verificação.
- Custo de modelo: zero. Espera: nenhuma.
- **Entrega a maior parte do valor.** Quando a pergunta é "como está minha
  vitamina D comparada ao exame anterior?", os números com data e origem
  **são** a resposta. O que se perde é a redação, não o conteúdo.

**Contra:**

- **Só existe quando houve ferramenta com dado.** Para "quantos miligramas eu
  tomo?" não há o que mostrar, e a opção C volta a ser a única.
- Exige um texto de modelo por formato de ferramenta — trabalho de
  implementação real, ainda que pequeno.
- **Risco de copy:** se for mal escrita, a pessoa lê o texto de modelo como se
  fosse a IA falando. Precisa dizer, na primeira linha, que a resposta não veio
  da conversa.

### F. Complementar, não alternativa: estreitar o que o modelo pode dizer

A D11 já resolveu isso na extração — o vocabulário oferecido ao modelo não
contém a opção perigosa. No chat, o produto **é** a prosa, então não dá para
fechar o vocabulário do mesmo jeito. Mas dá para estreitar: exigir que a
resposta venha em campos (`texto`, `citacoes`) em vez de texto solto já é isso,
e é o que o schema da EPIC faz.

**Não é uma opção de resposta à reprovação** — é uma forma de reduzir quantas
reprovações acontecem. Entra aqui para ficar registrado que as duas coisas são
complementares, e que investir só na reação seria tratar sintoma.

## 4. A opção certa muda conforme a regra violada

Tratar todas as reprovações igual é simples de explicar e desperdiça
informação. Vale olhar a diferença:

| Regra violada | O que aconteceu | Probabilidade de a segunda geração resolver |
|---|---|---|
| **R1** termo vetado | escorregão de vocabulário | **alta** — trocar uma palavra não muda o conteúdo |
| **R2** falta encaminhamento | esquecimento de uma frase | **alta** — é acrescentar, não reformular |
| **R3** posologia, diagnóstico | o modelo tentou ajudar demais | **média a alta** — precisa recusar direito, e existe recusa certa |
| **R4** citação inventada | o modelo produziu um número que nenhuma ferramenta devolveu | **a mais preocupante** — não é questão de redação, é invenção de dado |

A R4 merece nota separada. As outras três são problemas de **como dizer**; a R4
é um problema de **o que é verdade**. Um modelo que inventou um valor de exame
uma vez pode inventar de novo com outra redação, e a segunda geração não ataca
a causa. É a violação em que cair para a resposta determinística faz mais
sentido, porque o modo degradado mostra exatamente os números que existem.

## 5. Um achado que muda a conta do custo

A primeira versão do plano técnico da conversa fazia a segunda geração chamando
`runConversationTurn` de novo, com a mensagem alterada. **Isso refaz o laço de
ferramentas inteiro** — as mesmas consultas, os mesmos dados, pagos e esperados
de novo.

Não precisa. A segunda geração pode reaproveitar as mensagens já acumuladas,
**incluindo os resultados das ferramentas**, e pedir apenas uma redação nova.

A diferença, em proporção de um turno típico com uma consulta:

| | Entrada | Idas ao modelo | Espera |
|---|---|---|---|
| Turno normal | 100% | 2 | 100% |
| Segunda geração refazendo as ferramentas | ~100% | 2 | ~100% |
| **Segunda geração reaproveitando** | **~55%** | **1** | **~40%** |

Ou seja: **a nova geração custa pouco mais da metade de um turno, não o dobro
de um turno.** E tem uma vantagem além do custo — ela vê exatamente as mesmas
evidências que a primeira, então a diferença entre as duas respostas é só a
redação, que é justamente o que se quer corrigir.

Isto é um defeito do plano técnico atual e precisa ser corrigido lá,
independentemente de qual opção for escolhida.

## 6. Quantas vezes tentar de novo

Uma.

- A segunda tentativa carrega a informação nova (o motivo). A terceira carrega
  a mesma informação de novo — se a segunda falhou, o problema não é falta de
  aviso, é que a pergunta ou o contexto empurram para a violação.
- Cada tentativa a mais multiplica a espera de uma pessoa que já está olhando
  para um indicador de digitação.
- Duas tentativas é o que se consegue medir e explicar num TCC com honestidade:
  "x% das respostas precisaram de uma segunda geração, y% caíram no modo
  degradado".

Um ajuste barato que vale medir junto: **baixar um pouco a temperatura na
segunda geração.** Menos variação costuma significar mais aderência à
instrução. Não é certeza — entra como algo a medir, não como afirmação.

## 7. Recomendação

**Gerar de novo uma vez. Falhando, cair para a resposta determinística quando
houver dado de ferramenta. Não havendo, indisponibilidade honesta.**

Em ordem: **A → E → C.** A opção B é recusada, e a D é recusada com mais
firmeza ainda.

### Por quê

**Primeiro, porque a segunda geração quase sempre está pedindo ao modelo que
recuse direito, e não que descubra outra resposta.** Essa é a observação que
mais pesa. O conjunto adversarial já prova que existe uma resposta boa para
cada pergunta difícil; o modelo falhou em achá-la sozinho, e o bilhete diz onde
ela está. É barato e tende a funcionar.

**Segundo, porque o modo degradado não é escopo extra: é a tese do projeto
escrita no caminho da falha.** O projeto inteiro se define por uma frase — a IA
**organiza informação, não interpreta**. Quando o modelo não consegue falar com
segurança, mostrar os números com data, unidade e documento de origem é
exatamente o que o projeto se propôs a fazer desde o começo. A prosa era o
acréscimo; o dado rastreável era o produto. Um sistema cujo pior caso é
"mostrar o dado sem opinar" é um sistema cujo pior caso está alinhado com o que
ele promete.

**Terceiro, porque é a combinação que menos machuca a utilidade sem abrir mão
de nada na segurança.** A opção C sozinha protege perfeitamente e ensina a
pessoa a desistir. A opção A sozinha às vezes entra em laço. Juntas, e com E no
meio, o pior caso deixa de ser "a IA não respondeu" e passa a ser "a IA não
escreveu, mas mostrou".

**Quarto, porque produz número.** Três caminhos distintos, registrados por
turno no `ruleCheckStatus`, viram três contagens que respondem uma pergunta
que o TCC deveria responder: **com que frequência uma camada determinística
precisa barrar um modelo, e o que acontece depois.** Isso é material de
trabalho acadêmico, não é telemetria de produto.

### O que a recomendação exige que seja feito

1. **Corrigir a segunda geração para reaproveitar os resultados das
   ferramentas** (§5). É correção de defeito, vale para qualquer opção.
2. **Escrever o bilhete em termos da regra, nunca do sintoma.** "Não indique
   quantidade, dose ou mudança de medicação" e não "não escreva 500 mg".
3. **Construir o modo degradado por formato de ferramenta**, começando pelo de
   analitos, que é o de maior valor e o mais estruturado.
4. **Copy que não mente e não convida à repetição inútil.** A primeira linha do
   modo degradado diz que aquilo não é a resposta da conversa. A copy de
   indisponibilidade diz o que o aplicativo faz, em vez de pedir à pessoa que
   adivinhe.
5. **Nunca expor o motivo técnico da reprovação à pessoa.** Dizer "sua pergunta
   foi bloqueada por conter posologia" é acusatório — quem escreveu a posologia
   foi o modelo — e ensina a contornar.
6. **Registrar `ruleCheckStatus` desde o primeiro dia**, mesmo antes de a
   persistência de conversa existir, nem que seja em log.

## 8. O que mediria uma revisão desta decisão

Esta recomendação é uma aposta informada, não um resultado. Quatro números a
apurar na tarefa de medição da EPIC da conversa:

| Número | O que ele muda |
|---|---|
| % de respostas reprovadas na primeira geração | se for muito baixo, a complexidade toda rende pouco e a opção C sozinha bastaria; se for alto, o problema está no prompt, não na reação |
| % das reprovadas que a segunda geração salva | se for baixo, a opção A perde o sentido e vale ir direto para E |
| distribuição por regra (R1 a R4) | se a R4 dominar, o problema é invenção de dado e o modo degradado vira o caminho principal |
| quantas reprovações são **falso positivo** | mede o quanto a IA está sendo inutilizada por rigor excessivo — o custo escondido da assimetria escolhida |

**Gatilho explícito para reabrir:** se a segunda geração salvar menos de um
terço das respostas reprovadas, a opção A está pagando mais do que entrega, e a
ordem passa a ser E → C, sem nova geração.

## 9. O que fica registrado

Quando esta decisão for aceita, ela entra em `00-visao/decisoes.md` com o
número seguinte, e a `regras-de-linguagem.md` troca a seção "Registro de
decisão pendente" por um ponteiro para cá — junto com a correção de "camada 2"
para "camada 4" apontada na §1.

A spec da EPIC do assistente conversacional (§7) já descreve **A → C**. Ela
precisa ganhar o **E** no meio, e o `plan.md` precisa ganhar a correção da §5.

---

## 10. Encerramento

**Encerrado em 2026-09-16. Decisão aceita: A → E → C**, registrada como **D31**
em `00-visao/decisoes.md`.

Este documento deixa de ser um estudo aberto e vira o registro da avaliação,
pelo mesmo critério do `provedor-llm.md`: a comparação entre as opções é
material do TCC, e a razão de recusar cada uma vale mais que a escolha em si.

O que foi propagado com a aceitação:

| Documento | O que mudou |
|---|---|
| `00-visao/decisoes.md` | D31, com as duas recusas e o gatilho de reabertura |
| `01-estudos/regras-de-linguagem.md` | pendência trocada por ponteiro; "camada 2" corrigido para "camada 4" |
| `specs/07-ia-conversa/regras-de-linguagem/` | a ambiguidade registrada pela regra 8 passa a apontar para a decisão |
| `specs/07-ia-conversa/assistente-conversacional/` | §7 ganha o modo degradado; critérios de aceite novos |
| plano técnico do assistente | tarefa C5 reescrita; C5b nova; defeito do retry corrigido |

O gatilho de reabertura da §8 continua valendo: ele é parte da decisão, não uma
ressalva sobre ela.
