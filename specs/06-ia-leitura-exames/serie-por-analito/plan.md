# PLAN: Série por analito (Bloco 6)

Plano técnico completo (estrutura de arquivos, tarefas com teste antes da
implementação, código): `docs/superpowers/plans/2026-09-16-serie-por-analito.md`.
Este arquivo registra as decisões desta EPIC especificamente exigidas pela
constituição (regras 3, 5, 8).

## 1. Diagnóstico — estado atual vs. proposto

A EPIC de extração grava `LabResult`: uma linha por analito, por momento de
coleta, com código LOINC, unidade canônica, faixa do laboratório, documento de
origem e estado de revisão. **Tudo de que a comparação precisa já existe no
banco quando esta EPIC começa.**

O que não existe é a tela. Hoje, um usuário com o exame de março e o de setembro
tem duas telas de detalhe e nenhum lugar que ponha os dois números juntos.

Esta EPIC é, portanto, **inteiramente de leitura**. Ela não cria model, não
altera schema, não grava, não chama modelo e não gasta token. É a EPIC mais
barata das duas e a que entrega o objetivo declarado do projeto.

O trabalho real não está em desenhar o gráfico — o componente existe. Está em
**decidir o que pode ser comparado**, e essa decisão é inteiramente feita de
regras que as decisões D21, D22, D24 e D29 já escreveram. Por isso a lógica de
montagem da série é um módulo puro, testado sem React e sem AWS, e a tela é
uma casca fina em volta dele.

## 2. Novas dependências (regra 3 da constituição)

**Nenhuma.** E isso foi verificado, não presumido:

| O que a EPIC precisa | O que já existe |
|---|---|
| Gráfico de linha | `src/components/charts/LineChart.tsx`, sobre `react-native-svg` 15.12.1, já em `dependencies` |
| Matemática de escala, ticks, quebra em buraco | `src/components/charts/chartScale.ts` |
| Consulta por analito com data ordenada | índice `analyteCode`/`collectedAt` em `LabResult`, criado na EPIC anterior |
| Cache e revalidação da lista | `useAsyncResource` + o padrão de `useExamsData` |
| Tokens, botões, cartões, estados vazios | componentes do Bloco 1 |

**Recusada — biblioteca de gráficos.** Existem opções maduras no ecossistema
React Native, e num projeto novo a escolha seria defensável. Aqui não: o
repositório já tem um componente de linha que faz exatamente o necessário, com
uma propriedade que uma biblioteca genérica **não** garantiria — quebrar o traço
num buraco em vez de interpolar. Trocar isso por uma dependência seria perder a
única garantia que importa nesta tela em troca de conveniência de API.

## 3. Decisões de arquitetura (regra 5 — nunca efeito colateral)

- **Zero mudança de schema.** Esta EPIC lê o que a anterior gravou. O índice de
  que ela depende foi criado lá, de propósito, porque a consulta era conhecida.
- **`chartScale.ts` não é tocado.** Ele é usado pela feature de wearable, que
  está mergeada e testada. A limitação do eixo X por índice é contornada
  rotulando todos os pontos, não alterando o módulo — ver a ambiguidade
  registrada na §4.
- **A montagem da série é módulo puro**, `analyteSeries.ts`, sem React, sem
  Amplify, sem AWS. Todas as regras de exclusão — pendente, sem valor,
  censurado, unidade divergente — vivem ali e são testadas como função, não
  como tela. É o mesmo método que a EPIC anterior usou para conversão e
  normalização, e pela mesma razão: essas regras são o produto, e testá-las
  através de uma renderização seria testá-las de longe.
- **A série é chaveada por `(analyteCode, collectionMoment)`, não por
  `analyteCode`.** Consequência direta da D22. Tratar as duas como a mesma série
  faria a curva glicêmica virar uma serra sem significado.
- **A exclusão é dado, não silêncio.** `buildAnalyteSeries` devolve `points` e
  `excluded`, e `excluded` carrega o motivo. Uma tela que mostra dois pontos
  quando existem três, sem dizer nada, é uma tela que mente por omissão — e o
  custo disso é maior aqui do que em qualquer outro lugar do aplicativo, porque
  a pessoa vai levar esse gráfico a uma consulta.
- **A linha de referência é tudo ou nada.** Desenhada apenas quando todos os
  pontos concordam. Desenhar a faixa do laboratório mais recente por cima de
  pontos de outro laboratório seria afirmar um critério que não vale para eles.
- **A tela não converte unidade.** Linha com unidade fora da canônica é
  excluída com motivo. Conversão acontece num lugar só, a Lambda, sob teste
  (D29) — uma segunda implementação aqui divergiria da primeira, e divergiria
  em silêncio.
- **Nenhuma cor comunica julgamento.** Um traço, cor primária. Verde para
  "dentro" e vermelho para "fora" é interpretação clínica pintada, e a regra 4
  não distingue interpretação escrita de interpretação colorida.

## 4. Ambiguidades documentadas (regra 8)

- **Sem Canvas de origem.** Mesma situação da EPIC de extração: o Claude Design
  não desenha comparação entre coletas. A tela segue os tokens e os padrões de
  lista e cartão já estabelecidos.
- **O eixo X é por índice, não proporcional à data.** `xPositionForIndex`
  espaça os pontos igualmente, o que é correto para dado diário e impreciso para
  exame esparso. **Mitigação escolhida: rotular todos os pontos com a data.**
  Com dois a seis pontos, todos rotulados, não há leitura ambígua. A alternativa
  — estender `chartScale` com posição proporcional — foi recusada por tocar um
  módulo de que a feature de wearable depende, em troca de um ganho que só
  apareceria numa série longa que este domínio não produz.
- **Quantas coletas bastam para valer a pena.** O mapa de navegação da EPIC
  anterior condiciona o atalho a "ao menos 2 coletas confirmadas". A tela em si
  aceita uma, e mostra o ponto único com a explicação — porque a pessoa pode
  chegar pelo seletor, não só pelo atalho, e uma tela que se recusa a mostrar o
  dado que ela tem é pior que uma que o mostra com uma ressalva.
- **A faixa de referência muda com a idade e o sexo, e isto não é tratado.** Um
  mesmo laboratório usa faixas diferentes para faixas etárias diferentes, e a
  extração guarda a faixa que estava impressa naquele laudo — que é a correta
  para aquela pessoa naquela data. A tela mostra a faixa de cada ponto e não
  tenta reconciliá-las. Registrado porque é uma limitação real e porque a
  tentação de "usar a faixa mais recente para tudo" é exatamente o erro que a
  regra da linha de referência tudo-ou-nada evita.
- **Ordenação quando duas coletas têm a mesma data.** Acontece com um PDF
  consolidado. O desempate é pelo `collectionMoment` e, faltando ele, pela
  ordem estável do id — nunca por valor, que produziria uma série artificialmente
  crescente.

## 5. Limites e custo

**Custo de execução: zero.** Nenhuma chamada a modelo, nenhum OCR, nenhuma
escrita. O custo é o de uma consulta ao DynamoDB por índice, por abertura de
tela, com o mesmo cache que a lista de exames já usa.

**Volume esperado:** dezenas a poucas centenas de linhas de `LabResult` por
usuário, e de dois a seis pontos por série. A consulta por índice devolve tudo
de um analito numa página; a paginação existe no código como defesa, não como
caminho esperado.
