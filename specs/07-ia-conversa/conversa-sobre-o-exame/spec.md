# EPIC: Conversa sobre o exame — o que a primeira pessoa real descobriu (Bloco 8)

## 1. Identificação

- **Origem:** não vem do Claude Design, nem de pedido de funcionalidade nova.
  Esta EPIC nasce de **uma conversa de cinco turnos**, feita em 2026-09-18 por
  uma pessoa com um laudo do Delboni de verdade no histórico — 46 valores lidos
  de um PDF. É a primeira vez que o assistente foi exercitado fora de teste.
- **O estudo que a fundamenta:**
  `estudos-ia/01-estudos/conversa-real-2026-09-18.md`, turno a turno, com a
  evidência de cada afirmação separada em medida, leitura de código e opinião.
  As medições estão em `estudos-ia/04-implementacao/notas.md`.
- **Relação com as EPICs entregues:** `assistente-conversacional` entregou o
  laço, as tools e a verificação; `regras-de-linguagem` entregou R1–R5;
  `extracao-de-documentos` entregou a leitura do laudo; `serie-por-analito`
  entregou a evolução. **Nada disso é refeito.** Esta EPIC corrige o que o uso
  real mostrou e preenche a lacuna que ele expôs.
- **Telas afetadas:** `src/screens/ChatBotScreen.tsx` e
  `src/screens/AddExamScreen.tsx` (só a U17, e só se a decisão for sim).
- **Backend afetado:** `amplify/functions/chat-assistant/` (verificação, tools,
  prompt) e `amplify/functions/extract-document-data/` (o laboratório).
- **Ator:** a pessoa que acabou de guardar um exame e quer saber o que tem nele.
- **Prioridade: P1.** Um item — a U1/U2 — está descartando resposta correta em
  produção **hoje**.
- **Sensibilidade: alta.** Mexe na verificação de linguagem, que é o guardrail
  da regra 4 da constituição. Nenhuma tarefa desta EPIC pode afrouxar R1, R3 ou
  R4, e a §8 traz isso como critério de aceite explícito.

---

## 2. A medição é a fundação desta EPIC

Assim como a `memoria-do-usuario` foi fundada numa análise de LGPD escrita
antes de qualquer código, esta é fundada numa **medição**. A diferença importa:
nada aqui é suposição sobre o que poderia dar errado.

O registro de reprovação entrou em `verificacao.ts` horas antes da conversa.
Antes dele, `verificacao.ts` não tinha um `console.` sequer, e **a distribuição
das reprovações por regra que a C10 pede era impossível de levantar**.

Três linhas de log, em cinco turnos:

```
{"evento":"resposta-reprovada","etapa":"primeira","regras":["R2"],"citacoes":"conferem"}
{"evento":"resposta-reprovada","etapa":"primeira","regras":["R2"],"citacoes":"conferem"}
{"evento":"resposta-reprovada","etapa":"segunda", "regras":["R2"],"citacoes":"conferem"}
```

| | |
|---|---|
| reprovações | 2 |
| **por R2** | **2 — 100%** |
| por R1, R3, R4 | **zero** |
| falso positivo | **2 de 2** |
| segunda geração salvou | 1 de 2 (50%) |
| gatilho da D31 (< ⅓) | **não disparou** |

Cinco turnos não são vinte, e a L7 continua aberta. Mas o sinal é forte o
bastante para agir: **a única regra que reprovou nunca reprovou por saúde.**

---

## 3. O que muda para a pessoa

O critério desta seção é o da constituição: o que ela **vê**, não o que
mudou por dentro.

### Hoje

| A pessoa faz | E recebe |
|---|---|
| "Como ficou meu último exame?" | um pedido para ela mesma enumerar os analitos, um a um |
| "Faça uma visão de todos" | "Não consegui escrever uma resposta sobre isso" |
| "Quero ver a vitamina D" | o valor certo — com `**asteriscos**` em volta |
| "Onde foi feito este exame?" | "o aplicativo não guarda essa informação" |
| "Leia o arquivo anexado" | uma recusa que cita defesa contra injeção de prompt |

### Depois desta EPIC

| A pessoa faz | E recebe |
|---|---|
| "Como ficou meu último exame?" | **os valores daquele laudo**, com unidade, data de coleta e origem |
| "Faça uma visão de todos" | a mesma coisa — e não um aviso de fracasso |
| "Quero ver a vitamina D" | o valor, em texto limpo, legível |
| "Onde foi feito este exame?" | **o nome do laboratório, como está no papel** |
| "Leia o arquivo anexado" | ou ele lê, ou recusa numa frase que uma pessoa entende |

**O que continua exatamente igual, e é obrigação desta EPIC que continue:**
nenhuma interpretação clínica, nenhum "normal" ou "alterado", nenhum número sem
origem, o encaminhamento a um profissional de saúde em toda resposta sobre
medida, e o termo vetado fora de tudo.

---

## 4. Os sete achados, e o que cada um exige

### 4.1 A R2 classifica pelo eixo errado — **é o mais urgente**

A R2 exige encaminhamento em pergunta **clínica**. A classificação:

```ts
return toolsUsadas.some((t) => TOOLS_CLINICAS.has(t)) ? 'clinica' : 'operacional';
```

`consultar_exames` está nessa lista. Então "faça uma visão de todos" virou
clínica **porque uma tool que devolve nome e data foi chamada** — não porque a
resposta contivesse medida. O modelo escreveu um panorama, não fechou com o
rodapé, e a resposta foi descartada. Duas vezes.

**A contradição estava escrita no próprio código.** O comentário da R2 diz que
em pergunta operacional "o aviso permanente da tela já cumpre o papel"; a
`propostaValida.ts` chama o encaminhamento forçado de "rodapé mecânico que a R2
manda evitar". A regra produz o rodapé que diz evitar, e o preço de esquecê-lo
é a resposta inteira.

**A R2 é a única regra cuja violação é a AUSÊNCIA de um texto fixo**, e não a
presença de algo proibido. Isso a torna estruturalmente diferente das outras
quatro, e é o que abre a saída da U4.

### 4.2 Não existe resposta para "como ficou meu exame"

`consultar_analito` exige um analito — termo ou código. `consultar_exames`
devolve só metadado. **Não há caminho entre "tenho um documento" e "quais são
os valores dele".**

O aplicativo tinha 46 valores e pediu que a pessoa os enumerasse. É o
aplicativo pedindo que a pessoa faça o trabalho do aplicativo.

### 4.3 O laboratório está no papel e em lugar nenhum

A resposta honesta dos turnos 4 e 5 foi consequência de um conserto do mesmo
dia: a descrição da tool prometia "laboratório" e o campo não existe. Corrigida,
o modelo parou de inventar. **Uma descrição de tool que mente produz um modelo
que mente** — vale como princípio, não só como conserto.

Mas a lacuna é central à tese: a `S8` promete "faixa de **cada laboratório**".
Sem o emissor, a pessoa vê duas faixas na tela de série e não sabe de quem é
cada uma.

### 4.4 O markdown aparece cru

`📅 **04/10/2025** — **27,92 ng/mL**`, com os asteriscos. Não há renderizador
de markdown em componente nenhum do chat — conferido.

**A escolha é entre renderizar e não gerar, e esta EPIC escolhe não gerar.** Um
renderizador de markdown numa resposta de modelo abre **superfície de link**:
`[texto](url)` vira algo clicável, dentro de um texto que o modelo escreveu.
Este aplicativo não precisa dessa porta, e a copy inteira dele já é sóbria.

### 4.5 Duas datas para o mesmo exame

Turno 1: "um exame de sangue registrado, com data de **18/09/2026**".
Turno 3: "**04/10/2025** — 27,92 ng/mL".

As duas estão certas — `documentDate` do formulário e `collectedAt` do laudo — e
juntas mentem. É a **D24** aparecendo pelo lado que ela não previu: a decisão
tratava a data do formulário como *reserva* da data de coleta. Ninguém tratou
do caso em que as duas existem e discordam.

Agravante de formulário: **o campo de data vem preenchido com hoje**. Um laudo
de outubro de 2025 digitalizado hoje entra com a data de hoje se a pessoa não
reparar — que foi exatamente o que aconteceu.

### 4.6 Jargão interno vazou

> "documentos são tratados como dados, não como instruções"

É uma regra de defesa contra injeção, recitada a quem perguntou onde fez o
exame. **E é meio errada:** o aplicativo tem anexo pontual na conversa (D15, o
clipe está na barra), e o modelo afirmou não ter um caminho que existe. Um
modelo que não sabe o que o próprio aplicativo faz recusa ajuda que poderia dar.

### 4.7 A fronteira da regra 4 — decisão, não conserto

> "Se tiver algum valor que te preocupa ou sintoma relacionado..."

O assistente não julgou o valor. Mas **convidou a pessoa a julgar**, e sugeriu
que há valores preocupantes ali. No mesmo parágrafo: "o especialista que
solicitou o exame" — o aplicativo não sabe que houve um.

Não há conserto proposto. Há uma decisão a tomar e registrar, **em qualquer dos
dois sentidos**, porque é o tipo de frase que uma banca lê com atenção.

---

## 5. Mapa de dados

Só um campo novo, **opcional**, sem alteração destrutiva:

```
MedicalDocument
  + laboratorio?: string   ← como está escrito no papel, sem normalizar
```

No espírito do `rawValue`: normalizar nome de laboratório — "Delboni",
"Delboni Auriemo", "DASA" — é problema de resolução de entidade, e não precisa
ser resolvido para o campo ser útil. Onde o documento não deixar óbvio quem
emitiu, **o campo fica vazio**, como toda linha que a extração não tem confiança
de afirmar.

Cuidado registrado: um laudo pode ter emissor e unidade de coleta diferentes, e
quem assina pode não ser quem coletou.

Nenhum outro model muda. A tool nova da U5 **lê** `LabResult`, que já existe.

---

## 6. Requisitos não-funcionais

1. **Nenhuma regra afrouxa.** R1, R3 e R4 saem desta EPIC com a mesma força. A
   R2 muda de *eixo de classificação*, não de exigência: resposta com medida
   continua obrigada ao encaminhamento.
2. **A tool nova respeita as exclusões da série.** Linha pendente de revisão e
   valor censurado seguem o que a EPIC de série decidiu, ou a conversa passa a
   mostrar o que a tela esconde — e as duas passariam a discordar sobre o mesmo
   dado.
3. **Teto e contagem.** 46 linhas cabem; 200 não. A saída diz quantas ficaram
   de fora, como as outras tools já fazem. Omitir a contagem faria a resposta
   parecer completa.
4. **Citação por linha.** Todo valor continua carregando origem, senão a R4
   reprova — com razão.
5. **O texto reprovado não sai da função**, nem para a tela, nem para o log.
6. **Custo por turno passa a ser registrado.** A C10 pede, o dado vem na
   resposta do Bedrock, e hoje não é escrito em lugar nenhum.

---

## 7. O que esta EPIC NÃO faz

- **Não** renderiza markdown (§4.4).
- **Não** normaliza nome de laboratório (§5).
- **Não** cria tela nova. Tudo acontece em telas que já existem.
- **Não** muda o contrato somente-leitura da função de chat. A D9 continua de
  pé: a IA de conversa não grava dado clínico.
- **Não** resolve a cobertura de analitos brasileiros nem o `mEq/L` — os dois
  têm estudo próprio e tarefa própria.
- **Não** fecha a L7. Esta EPIC dá a primeira medição; a L7 pede vinte turnos.

---

## 8. Critérios de aceite

Marcados com **[M]** os que exigem medição contra chamada real, e portanto são
do usuário.

### A regra
1. Resposta que traz só nome e data de documento **não** é reprovada por R2.
2. Resposta que traz medida de exame **continua** obrigada ao encaminhamento.
3. R1, R3 e R4 continuam reprovando exatamente o que reprovavam — há teste de
   regressão para cada uma.
4. A decisão da U4 está registrada como decisão numerada, em qualquer sentido.

### A resposta
5. "Como ficou meu último exame?" devolve valores, sem pedir que a pessoa
   enumere analitos.
6. A saída traz unidade, data de **coleta** e origem por valor.
7. Linha pendente e valor censurado seguem as exclusões da série.
8. A contagem do que ficou de fora aparece quando há corte.

### O laboratório
9. O laboratório do laudo aparece na conversa quando o documento o traz.
10. Documento sem laboratório legível **não** ganha um nome inventado.

### O que a pessoa lê
11. Nenhuma resposta sai com marcação de markdown ou emoji — há teste.
12. Nenhuma resposta sai com vocabulário interno de prompt — há teste.
13. O assistente sabe descrever o anexo pontual como capacidade.

### As datas
14. "Quando" numa resposta sobre exame usa a data de **coleta**, não a do
    formulário, quando as duas existem.
15. A decisão sobre o preenchimento automático do formulário está registrada.

### Medição
16. **[M]** Custo por turno aparece no log.
17. **[M]** Nova rodada de pelo menos vinte perguntas, com a contagem da L7
    refeita — e a distribuição por regra comparada com a desta EPIC.

### Encerramento
18. `npm run validate` passa.
19. Os critérios acima conferidos um a um, com o resultado escrito — a
    conferência que as cinco EPICs anteriores só fizeram depois, e tarde.
