# A primeira conversa real, analisada turno a turno (2026-09-18)

Cinco perguntas feitas por uma pessoa ao assistente, com um laudo de verdade no
histórico — 46 valores lidos de um PDF do Delboni. É a primeira vez que o
assistente foi exercitado fora de teste.

O que este documento é: o que funcionou, o que não funcionou, e **por quê**,
com a evidência de cada afirmação. Onde a evidência é medição, ela está citada;
onde é leitura de código, está dito; onde é opinião, está marcado como tal.

Ele alimenta a **L7** (contagem de reprovações) e a **C10** (custo e laço), que
pediam exatamente este tipo de exercício.

---

## O que foi medido, e não deduzido

O registro de reprovação entrou em `verificacao.ts` horas antes desta conversa,
e esta foi a primeira vez que ele serviu para alguma coisa. Três linhas no
CloudWatch, de cinco turnos:

```
19:16:08  {"evento":"resposta-reprovada","etapa":"primeira","regras":["R2"],"citacoes":"conferem"}
19:16:46  {"evento":"resposta-reprovada","etapa":"primeira","regras":["R2"],"citacoes":"conferem"}
19:16:50  {"evento":"resposta-reprovada","etapa":"segunda", "regras":["R2"],"citacoes":"conferem"}
```

Lido junto com o que apareceu na tela:

| Turno | Pergunta | O que aconteceu |
|---|---|---|
| 1 | "Como ficou o meu último exame de sangue feito?" | reprovada na 1ª por **R2**, aprovada na 2ª |
| 2 | "Faça uma visão de todos!" | reprovada **duas vezes** por R2 → degradado |
| 3 | "Quero ver a vitamina D" | aprovada de primeira |
| 4 | "Aonde foi feita este exame de sangue?" | aprovada de primeira |
| 5 | "Leia o arquivo... veja em qual laboratório" | aprovada de primeira |

**Números da L7, com a ressalva de que cinco turnos não são vinte:**

- reprovações: **2**, as duas por **R2**, as duas com citações conferindo;
- **R1, R3 e R4 não dispararam uma vez sequer** — nenhuma dose, nenhum
  diagnóstico, nenhum número sem origem;
- a segunda geração salvou **1 de 2** (50%). O gatilho de reabertura da D31
  dispara abaixo de um terço, então ele **não** disparou. Amostra pequena
  demais para decidir, mas é o primeiro ponto real da série;
- duração por turno: de 5,0 s a 16,5 s. Os turnos com duas gerações foram os
  mais longos, como esperado.

**A leitura que importa: 100% das reprovações foram da mesma regra, e nenhuma
delas era um falso alarme sobre saúde.**

---

## 1. A R2 está reprovando o que ninguém pediria para reprovar

É o achado principal, e ele custou uma resposta inteira à pessoa.

### O mecanismo

A R2 exige encaminhamento a um profissional de saúde **em pergunta clínica**. A
classificação está em `verificacao.ts`:

```ts
function classificar(toolsUsadas: string[]): QuestionKind {
  return toolsUsadas.some((t) => TOOLS_CLINICAS.has(t)) ? 'clinica' : 'operacional';
}
```

E `consultar_exames` está na lista de tools clínicas.

Consequência: **"faça uma visão de todos" foi classificada como pergunta
clínica porque uma tool que lista documentos foi chamada** — não porque a
resposta contivesse medida nenhuma. O modelo escreveu um panorama, não fechou
com encaminhamento, e a resposta foi jogada fora. Duas vezes. A pessoa recebeu
menos informação do que receberia sem a regra.

### A contradição que já estava escrita no próprio arquivo

O comentário da R2 diz, textualmente, que em pergunta operacional "o aviso
permanente da tela já cumpre o papel, e este verificador não o repete" — e a
`propostaValida.ts` chama o encaminhamento forçado de "rodapé mecânico" que a
R2 manda evitar.

Na prática a regra produz exatamente o rodapé mecânico que diz evitar, e o
preço de esquecê-lo não é um aviso a menos: é a resposta inteira.

### Como trabalhar em cima disso

A classificação está no eixo errado. Ela pergunta **qual ferramenta rodou**;
deveria perguntar **o que a resposta diz**.

Proposta, em ordem de esforço:

1. **Classificar pela resposta, não pela tool.** Se o texto traz medida de
   exame — e a R4 já sabe reconhecer isso, com a lista de unidades — é clínica.
   Se traz só nome e data de documento, é operacional. Isso reaproveita
   maquinaria que já existe e já é testada.
2. **Separar `consultar_exames` das tools clínicas.** Ela devolve metadado:
   nome, tipo e data. Nenhum valor passa por ela — é a razão declarada de ela
   existir separada da tool de analitos.
3. **Não descartar a resposta por falta de rodapé: acrescentar o rodapé.** A R2
   é a única regra cuja violação é *ausência* de um texto fixo, e não presença
   de algo proibido. Reescrever uma resposta boa inteira para acrescentar uma
   frase que o aplicativo sabe escrever sozinho é caro e arriscado. As outras
   regras continuam derrubando, porque nelas o problema está no que foi dito.

A 3 é a mais forte e a que muda mais coisa: ela transformaria a reprovação mais
comum em zero reprovações, sem afrouxar nada. **Ela precisa de decisão sua**,
porque mexe no contrato da D31.

---

## 2. Ninguém consegue responder "como ficou meu exame"

A primeira pergunta que a pessoa fez, sem ser induzida, foi a que o aplicativo
não sabe responder. A resposta dela foi:

> "Para ver os valores específicos, me diz quais analitos você quer consultar —
> por exemplo: glicose, hemoglobina, colesterol, vitamina D, entre outros."

**O aplicativo tem 46 valores daquele laudo e pediu à pessoa que os enumerasse
um a um.** É o aplicativo pedindo que a pessoa faça o trabalho do aplicativo.

A causa está na forma das tools: `consultar_analito` exige um analito — termo
ou código —, e `consultar_exames` devolve só metadado. Não existe caminho entre
"tenho um documento" e "quais são os valores dele".

### Como trabalhar em cima disso

Uma tool nova, que responda **o conteúdo de um documento** ou **a coleta mais
recente de cada analito**. Três coisas precisam ser decididas antes de escrever
uma linha, e todas já têm precedente na tela de série:

- **o que fica de fora**: linha pendente de revisão e valor censurado seguem as
  mesmas exclusões da EPIC de série, ou a conversa passa a mostrar o que a tela
  esconde;
- **o teto**: 46 linhas cabem; um laudo de 200 não cabe. A saída precisa dizer
  quantas ficaram de fora, como as outras tools já fazem;
- **a citação por linha**: cada valor continua carregando a origem, senão a R4
  reprova com razão.

É EPIC própria. É também, na minha leitura, **a maior lacuna funcional do
assistente hoje**.

---

## 3. O laboratório está no papel e não está em lugar nenhum

Turnos 4 e 5. A pessoa perguntou onde o exame foi feito, duas vezes, de dois
jeitos diferentes.

**A resposta foi honesta, e isso é resultado de trabalho desta mesma data:** a
descrição da tool dizia que ela trazia "laboratório", e o campo não existe no
schema. Corrigida hoje, ela passou a dizer que o aplicativo não guarda essa
informação — e o modelo repetiu isso em vez de inventar um nome. **Uma
descrição de tool que mente produz um modelo que mente.**

Mas a lacuna é real e é central para a tese do projeto. A `S8` promete "faixa
de **cada laboratório**". Sem saber quem emitiu o laudo, a pessoa vê duas faixas
diferentes na tela de série e não tem como saber de quem é cada uma.

O nome do laboratório **está no PDF**. A extração lê 46 valores e não registra
quem os emitiu.

### Como trabalhar em cima disso

Campo novo e **opcional** em `MedicalDocument`, preenchido pela extração, no
espírito do `rawValue`: exatamente como está escrito no papel, sem normalizar.
Normalizar nome de laboratório — "Delboni", "Delboni Auriemo", "DASA" — é um
problema de entidade que não precisa ser resolvido para o campo ser útil.

Cuidado a registrar: um laudo pode ter emissor e coletador diferentes, e a
unidade de coleta pode não ser a que assinou. Se o valor não for óbvio no
documento, o campo fica vazio — como toda linha que a extração não tem
confiança de afirmar.

---

## 4. O markdown aparece cru

No turno 3 a pessoa viu:

```
📅 **04/10/2025** — **27,92 ng/mL**
```

Com os asteriscos. Não há renderizador de markdown em nenhum componente do
chat — conferido.

### Como trabalhar em cima disso

Duas saídas, e a segunda é melhor para este projeto:

1. Renderizar markdown na bolha. Traz dependência nova e, pior, **traz
   superfície de link**: um renderizador que transforma `[texto](url)` em algo
   clicável dentro de uma resposta de modelo é uma porta que este aplicativo não
   precisa abrir.
2. **Instruir o prompt a responder em texto puro**, sem asterisco e sem emoji, e
   travar isso por teste de saída. Mais barato, sem dependência, e coerente com
   um aplicativo cuja copy inteira é sóbria de propósito.

Recomendo a 2. A 1 só se ganhar tabela — e tabela de valores é a tela de série,
não a conversa.

---

## 5. Duas datas para o mesmo exame

Turno 1: *"um exame de sangue registrado, com data de 18/09/2026"*.
Turno 3: *"04/10/2025 — 27,92 ng/mL"*.

São os dois campos certos, cada um no seu lugar, e o conjunto é confuso:

- **18/09/2026** é o `documentDate` — o que foi digitado no formulário, que
  vem preenchido com a data de hoje;
- **04/10/2025** é o `collectedAt` da linha, lido do laudo.

A pessoa ouviu que o último exame é de setembro de 2026 e, dois turnos depois,
que o valor é de outubro de 2025. As duas frases estão certas e juntas mentem.

Isto é a D24 aparecendo pelo lado que ela não previu: a decisão tratava da data
do formulário como **reserva** da data de coleta na linha. Ninguém tratou do
caso em que as duas existem e discordam.

### Como trabalhar em cima disso

- `consultar_exames` passar a devolver a **faixa de datas de coleta** das linhas
  daquele documento, e o prompt preferir essa data ao falar de "quando";
- e uma questão de formulário, que é sua: **a data vir preenchida com hoje
  convida ao erro**. Um laudo antigo digitalizado hoje entra com a data de hoje
  se a pessoa não reparar. Vale considerar deixar o campo vazio.

---

## 6. Jargão interno vazou para a pessoa

Turno 5, resposta ao pedido de ler o arquivo:

> "Além disso, mesmo que um documento fosse compartilhado aqui, documentos são
> tratados como dados, não como instruções."

Isso é uma regra de defesa contra injeção de prompt, recitada a uma pessoa que
perguntou onde fez o exame. Ela não tem contexto para entender, e não deveria
precisar ter.

**E a resposta é meio errada.** O aplicativo *tem* anexo pontual na conversa —
é a D15, e o clipe aparece na barra de digitação. O modelo afirmou não ter um
caminho que existe.

### Como trabalhar em cima disso

Duas correções de prompt, as duas baratas:

- as regras de defesa são **instrução ao modelo**, não conteúdo de resposta.
  Vale um teste de saída varrendo o vocabulário interno, do mesmo tipo que já
  varre o termo vetado;
- o prompt precisa **descrever o anexo pontual** como capacidade. Um modelo que
  não sabe o que o próprio aplicativo faz recusa ajuda que poderia dar.

---

## 7. Uma frase que merece decisão, não conserto

Turno 1, fecho da resposta:

> "Se tiver algum valor que te preocupa ou sintoma relacionado, vale levar o
> exame completo a uma consulta..."

A regra 4 proíbe o assistente de julgar o valor, e ele não julgou. Mas
**"algum valor que te preocupa" convida a pessoa a julgar**, e sugere que
existem valores preocupantes ali. É a fronteira da regra, não uma violação dela.

No mesmo parágrafo: *"o especialista que solicitou o exame"* — o aplicativo não
sabe que houve um, nem que foi especialista.

Não proponho conserto. Proponho **decidir se a fronteira fica onde está**, e
registrar a decisão em qualquer dos dois sentidos, porque este é o tipo de frase
que uma banca lê com atenção.

---

## O que funcionou, e vale registrar com o mesmo cuidado

Um relatório que só lista defeito distorce tanto quanto um que não lista nenhum.

- **Nenhuma interpretação clínica em cinco turnos.** Nada de "normal",
  "alterado", "melhorou". A regra 4 se sustentou sem precisar de verificador.
- **A R4 não disparou uma vez.** Todo número citado tinha origem conferível — e
  o verificador da omissão, mergeado horas antes, estava ativo.
- **A honestidade sobre o que o aplicativo não tem** funcionou nos dois turnos
  em que foi testada, e por um motivo rastreável: a descrição da tool foi
  corrigida para dizer a verdade.
- **O turno 3 é o produto funcionando**: valor, unidade, data de coleta,
  ausência de comparação declarada, encaminhamento presente.
- **O caminho degradado fez o que prometia.** A pessoa não ficou sem nada, e o
  texto reprovado não vazou.

---

## Ordem sugerida

| # | Item | Tamanho | Por que nesta posição |
|---|---|---|---|
| 1 | Classificação da R2 | pequeno | está destruindo resposta boa **hoje**, e é a única reprovação medida |
| 2 | Tool de visão do documento | EPIC | maior lacuna funcional; é a primeira pergunta que a pessoa faz |
| 3 | Laboratório na extração | médio | sustenta a promessa da S8 |
| 4 | Texto puro no prompt | pequeno | defeito visível, conserto barato |
| 5 | Datas coerentes | médio | confunde, e toca a D24 e o formulário |
| 6 | Prompt: jargão e anexo | pequeno | duas frases |
| 7 | A fronteira da regra 4 | decisão | sua, e vale registrar |
