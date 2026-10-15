# EPIC: Série por analito — a comparação entre coletas (Bloco 6)

## 1. Identificação

- **Origem:** esta EPIC **não vem do Claude Design**, pela mesma razão que a de
  extração: o Canvas desenha as telas de exames (3a, 3b, 3c) e não desenha
  comparação entre coletas — o conceito não existia quando ele foi feito.
  Ambiguidade registrada pela regra 8 da constituição.
- **Por que ela existe separada:** a regra 6 diz que toda tela nova é unidade de
  entrega própria. A EPIC de extração declara isso em palavras (`spec.md` §3) e
  aponta para cá.
- **Estudos que a fundamentam:** `estudos-ia/` — roadmap tarefa 1.6, e as
  decisões D17, D21, D22, D24 e D29, que são exatamente as regras que decidem
  **o que pode e o que não pode ser comparado**.
- **Tela nova:** `src/app/(app)/analyte-series.tsx` →
  `src/screens/AnalyteSeriesScreen.tsx`.
- **Telas modificadas:** nenhuma obrigatoriamente. A ligação a partir de uma
  linha de analito já está prevista no mapa de navegação da EPIC de extração.
- **Ator:** usuário (paciente), que já tem dois ou mais exames do mesmo analito
  guardados e quer ver se o número mudou.
- **Prioridade: P1.** É o **marco de encerramento da Fase 1** do roadmap: "o
  usuário sobe o PDF do exame de março e o de setembro, e vê a vitamina D dos
  dois lado a lado, com a mesma unidade, a faixa de cada laboratório e o
  documento de origem de cada número."
- **Sensibilidade:** não grava nada. Só lê. Mas é a tela onde o dano de um
  número errado gravado pela EPIC anterior **aparece, enfim, para uma
  pessoa** — e é a tela mais fácil de transformar em leitura clínica sem
  perceber, porque um gráfico subindo ou descendo já sugere um julgamento.

## 2. História da funcionalidade

Como usuário, quero ver como um resultado meu mudou entre um exame e outro,
para perceber o que vale levar à consulta — sem precisar abrir dois PDFs lado a
lado e converter unidade de cabeça.

### Cenários (Given/When/Then)

- **Dois exames do mesmo analito, laboratórios diferentes:**
  Given existem duas linhas confirmadas com o mesmo `analyteCode`, uma de março
  em `ng/mL` e outra de setembro em `nmol/L` no papel
  When o usuário abre a série desse analito
  Then os dois pontos aparecem **na mesma unidade canônica**, em ordem de data
  de coleta, cada um identificando de qual documento veio
  And nenhum texto da tela diz se o valor melhorou, piorou, está normal ou está
  alterado.

- **Uma coleta só:**
  Given existe exatamente uma linha confirmada desse analito
  When o usuário abre a série
  Then a tela mostra o valor com sua faixa e seu documento, e explica que ainda
  não há com o que comparar — **sem gráfico**, porque um gráfico de um ponto
  não é uma série, é um ponto com eixos em volta.

- **Linha pendente de revisão não entra:**
  Given há três linhas do analito, e uma está `PENDENTE_DE_REVISAO`
  When o usuário abre a série
  Then a comparação usa duas, e a tela **diz** que uma está aguardando
  conferência, com atalho para o documento dela
  And a linha pendente **não** aparece no traço, nem como ponto solto.

- **Valor censurado aparece, mas fora do traço:**
  Given uma das coletas foi reportada como `<0,01` (D21)
  When o usuário abre a série
  Then esse resultado é **listado** e marcado como limite de detecção, com o
  sinal preservado, e **não** vira ponto do gráfico — ele é um limite, não uma
  medida, e ligá-lo aos outros por uma linha afirmaria uma medida que o
  laboratório não fez.

- **Curva glicêmica não se mistura:**
  Given o documento de março traz glicose em jejum, 60 e 120 minutos, e o de
  setembro traz as mesmas três
  When o usuário abre a série da glicose
  Then ele escolhe **qual momento** quer acompanhar, e o jejum de março é
  comparado com o jejum de setembro — nunca o jejum de um com o de 120 minutos
  do outro (D22)
  And quando só existe um momento, a escolha não aparece.

- **Faixas de referência diferentes entre laboratórios:**
  Given as duas coletas trazem faixas diferentes para o mesmo analito
  When o usuário abre a série
  Then **nenhuma faixa é desenhada como banda no gráfico**, e cada ponto mostra
  a faixa do seu próprio laboratório na lista abaixo
  And a tela explica, em uma linha, que os laboratórios usam faixas diferentes.

- **Nada para mostrar:**
  Given o usuário ainda não tem nenhum exame com valor extraído
  When ele abre a tela
  Then ela explica o que é preciso para a comparação existir e leva para
  `/add-exam`, sem tom de erro e sem tela em branco.

## 3. Estrutura da página

Uma tela, quatro blocos, nesta ordem.

### 3.1 Seletor de analito

Lista dos analitos que **têm ao menos uma linha confirmada**, com o rótulo em
português (`projectLabel`) e o número de coletas. Ordenada por quantidade de
coletas e depois por nome, porque o que tem mais histórico é o que a pessoa
provavelmente veio ver.

Quando a tela é aberta a partir de uma linha na tela de detalhe, o analito já
vem escolhido e o seletor fica recolhido.

### 3.2 Seletor de momento da coleta

**Só aparece quando o analito tem mais de um `collectionMoment` distinto.** É a
consequência direta da D22: glicose em jejum e glicose de 120 minutos são a
mesma substância medida em condições que não se comparam.

Quando todas as coletas têm o momento vazio — que é o caso comum —, este bloco
não existe.

### 3.3 Gráfico

`LineChart`, que já existe em `src/components/charts/` e já quebra o traço em
`null` em vez de interpolar. Uma série só. Eixo Y na unidade canônica.

**Sem banda de referência quando os laboratórios discordam.** A linha de
referência só é desenhada quando **todos** os pontos da série trazem a mesma
faixa; havendo qualquer divergência, nenhuma linha é desenhada e a faixa vive
na lista, por ponto.

**Sem cor de julgamento.** Um único traço, na cor primária. Nada de verde para
"dentro" e vermelho para "fora" — isso é interpretação clínica pintada, e a
regra 4 da constituição a proíbe tanto em cor quanto em texto.

### 3.4 Lista das coletas

Uma linha por coleta, da mais recente para a mais antiga:

- data da coleta e, quando houver, o momento;
- valor com a unidade canônica, e o sinal quando for limite;
- a faixa **daquele** laboratório;
- o que estava escrito no papel (`rawValue` e `rawUnit`), quando diferente do
  valor exibido — é a rastreabilidade que a EPIC anterior gravou para isto;
- atalho para o documento de origem.

Abaixo da lista, sempre: **o encaminhamento a um profissional de saúde**, que é
requisito de interface pela regra 4, não cortesia de texto.

### 3.5 O que está de fora, e a tela diz

Quando houver linha pendente de revisão daquele analito, um aviso discreto com
a contagem e um atalho para o documento. A pessoa precisa saber que a
comparação que ela está vendo **não usou tudo** — omitir isso em silêncio seria
mostrar uma série incompleta como se fosse completa.

## 4. Mapa de navegação

| Elemento | Tipo | Ação | Destino | Condição |
|---|---|---|---|---|
| Linha de analito (detalhe do documento) | Ícone | Abre a série já escolhida | esta tela | linha não pendente |
| Item do seletor de analito | Item de lista | Troca a série exibida | permanece na tela | sempre |
| Item do seletor de momento | Botão | Troca o momento acompanhado | permanece na tela | há mais de um momento |
| Coleta na lista | Item de lista | Abre o documento de origem | `/document-detail` | sempre |
| Aviso de pendência | Botão | Abre o documento da linha pendente | `/document-detail` | há linha pendente |
| Estado vazio | Botão | Adicionar um exame | `/add-exam` | não há nenhuma linha |

## 5. Mapa de dados

**Esta EPIC não cria model, não altera schema e não grava nada.** Ela lê
`LabResult`, que a EPIC de extração criou, pelo índice `analyteCode` com
`collectedAt` como chave de ordenação — índice que existe no schema justamente
porque esta consulta era conhecida de antemão.

Uma estrutura derivada, só em memória:

| Campo | Papel |
|---|---|
| `analyteCode`, `projectLabel`, `analyteLabel` | identidade da série |
| `collectionMoment` | o que separa duas séries do mesmo analito (D22) |
| `unit` | a unidade canônica, uma só para a série inteira |
| `points[]` | as coletas que entram no traço |
| `excluded[]` | as que existem e **não** entram, com o motivo |
| `sharedReference` | a faixa comum, ou nulo quando os laboratórios discordam |

**`excluded` não é um detalhe de implementação: é requisito.** Toda linha que
existe e não aparece no gráfico precisa ser contada e explicada, senão a tela
mente por omissão. Três motivos possíveis: pendente de revisão, valor sem
leitura segura (`value` nulo, D29), e valor que é limite e não medida (D21).

## 6. Requisitos não-funcionais específicos

**Regra 4 da constituição — a série não interpreta.** Ela ordena, converte
nada (já vem convertido) e desenha. Não diz se subiu para melhor ou para pior,
não calcula tendência, não compara com a faixa, não nomeia condição. A pessoa
lê os números e a faixa; quem interpreta é o profissional de saúde, e é para
ele que o rodapé encaminha.

**Nenhuma linha pendente participa de comparação.** É o que a EPIC de extração
prometeu nos seus critérios de aceite, e é aqui que a promessa é cumprida ou
quebrada. Vale para o gráfico, para a lista de pontos e para qualquer contagem.

**Valor censurado não vira ponto do gráfico** (D21). Um `<0,01` desenhado como
`0,01` afirma uma medida que o laboratório declarou não ter feito, e ligá-lo aos
vizinhos por uma reta transforma uma não-medida em tendência.

**Unidade única por série, verificada.** Todas as linhas de um `analyteCode`
deveriam sair da normalização na mesma unidade. Se alguma não estiver, ela é
**excluída com motivo** em vez de plotada — a tela não converte, porque
conversão acontece num lugar só (D29), e uma segunda implementação aqui
divergiria da primeira.

**Interpolação é proibida, e já é.** `chartScale.buildLinePath` quebra o traço
em `null` em vez de ligar os pontos por cima do buraco, e o comentário do
arquivo diz por quê: interpolar seria inventar dado. Esta EPIC depende desse
comportamento e tem teste sobre ele.

**Ambiguidade registrada (regra 8) — o eixo X é por índice, não por data.** O
`LineChart` do repositório posiciona os pontos igualmente espaçados, o que é
correto para dado diário de wearable e **impreciso** para exame, que é esparso:
março e setembro ficam à mesma distância que setembro e outubro. Duas saídas
foram consideradas: estender `chartScale` com posição proporcional à data, ou
rotular todos os pontos. **Escolhida a segunda**, por três razões — uma série de
exame tem de dois a seis pontos, e com todos rotulados não há ambiguidade;
mexer em `chartScale` tocaria a feature de wearable, que está mergeada e testada
(regra 5); e o ganho da primeira só apareceria numa série longa, que este
domínio não produz. Se um dia produzir, a correção é conhecida e está escrita
aqui.

**Nenhuma dependência nova** (regra 3). `LineChart`, `chartScale`,
`react-native-svg`, os tokens e os componentes de lista já existem no
repositório.

**Sem tela em branco.** Todos os estados — sem nenhum exame, sem linha
confirmada, uma coleta só, tudo pendente — têm copy própria e uma ação.

**Node 20** para publicar. `npm run validate` antes de considerar concluído.

## 7. Critérios de aceite

- [ ] Duas coletas do mesmo analito, de laboratórios diferentes e com unidades
      diferentes no papel, aparecem na mesma unidade canônica e em ordem de
      data de coleta.
- [ ] Uma coleta só **não** desenha gráfico: mostra o valor e explica que ainda
      não há comparação.
- [ ] Linha `PENDENTE_DE_REVISAO` não entra no gráfico nem na lista de pontos,
      e a tela informa quantas ficaram de fora e por quê — coberto por teste.
- [ ] Valor com qualificador (`<0,01`) é listado e marcado como limite, e
      **não** vira ponto do gráfico — coberto por teste.
- [ ] Glicose em jejum e glicose de 120 minutos, no mesmo documento, produzem
      séries **separadas**, e o seletor de momento aparece — coberto por teste.
- [ ] Quando todas as coletas trazem a mesma faixa, a linha de referência é
      desenhada; quando divergem, **nenhuma** é desenhada e cada ponto mostra a
      sua — coberto por teste.
- [ ] Linha com `value` nulo é excluída com motivo, nunca plotada como zero.
- [ ] Buraco na série quebra o traço; nenhum ponto é interpolado — coberto por
      teste.
- [ ] Nenhuma copy da tela classifica o valor, diz se melhorou ou piorou,
      calcula tendência ou nomeia condição — coberto por teste.
- [ ] Nenhuma copy usa o termo vetado nem suas derivações — coberto por teste.
- [ ] A tela mostra o encaminhamento a um profissional de saúde.
- [ ] Cada ponto identifica o documento de origem e abre esse documento.
- [ ] O que estava escrito no papel é recuperável a partir da série.
- [ ] Estado sem nenhum exame leva para `/add-exam`, sem tom de erro.
- [ ] Nenhuma dependência nova foi acrescentada.
- [ ] `npm run validate` passa.
