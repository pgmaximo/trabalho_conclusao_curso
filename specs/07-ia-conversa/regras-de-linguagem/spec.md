# EPIC: Regras de linguagem da IA — de texto escrito a verificação executável (Bloco 7)

## 1. Identificação

- **Origem:** não é tela. É a tarefa **0.3** do roadmap, e ela bloqueia as duas
  frentes de IA — o guardrail da extração e a conversa inteira.
- **Por que é EPIC própria:** a regra 6 da constituição fala de telas, e esta
  não é uma. Ela é EPIC própria por outro motivo: **é pré-requisito de duas
  outras**, tem teste próprio, e é a única parte do projeto cuja entrega é
  *impedir* que algo aconteça. Misturá-la com a EPIC da conversa faria a
  verificação nascer junto com o que ela precisa verificar, e ninguém escreve
  um teste rigoroso contra o próprio código no mesmo dia.
- **Estudos que a fundamentam:** `estudos-ia/01-estudos/regras-de-linguagem.md`
  (R1 a R5 e as cinco camadas), a regra 4 da constituição, e a D11.
- **Backend novo:** `amplify/functions/ai-language-rules/` — módulo puro,
  compartilhado pelas duas frentes.
- **Ator:** nenhum, diretamente. O beneficiário é o usuário; o consumidor é
  todo código deste projeto que produz texto para uma pessoa ler.
- **Prioridade: P1.** É pré-requisito da Fase 2 inteira e do guardrail da
  Fase 1.
- **Sensibilidade:** esta EPIC é a que decide **o que o aplicativo tem
  permissão de dizer sobre a saúde de alguém.** Se ela for frouxa, nenhuma
  outra camada recupera.

## 2. História da funcionalidade

Como responsável pelo projeto, quero que as regras de linguagem da IA sejam
verificadas por código antes de qualquer resposta chegar à tela, para que elas
sejam cumpridas e não apenas declaradas.

O ponto de partida é um achado do próprio estudo: **prompt sozinho não garante
nada.** Um modelo produz texto longo e variado, e a chance de escorregar em uma
palavra proibida ao longo de muitos tokens não é desprezível. O guardrail do
Bedrock cobre categorias genéricas de segurança; ele **não** cobre a R1, que é
uma regra deste projeto, nem os padrões de posologia da R3.

### Cenários (Given/When/Then)

- **Termo vetado na resposta:**
  Given o modelo devolveu um texto contendo a palavra que o projeto proíbe, em
  qualquer flexão ou derivação
  When a resposta passa pela verificação
  Then ela é reprovada com o motivo e a posição do trecho
  And a resposta **não** chega à tela como está.

- **Posologia na resposta:**
  Given o texto contém dose, frequência ou instrução de medicação ("tome 500
  mg", "2 comprimidos ao dia", "suspenda o remédio")
  When a resposta passa pela verificação
  Then ela é reprovada por violar a R3.

- **Diagnóstico fechado:**
  Given o texto afirma que a pessoa tem, não tem, ou provavelmente tem uma
  condição ("você tem anemia", "isso é diabetes", "não é nada grave")
  When a resposta passa pela verificação
  Then ela é reprovada por violar a R3
  And "não é nada grave" é reprovado pelo mesmo critério que "é diabetes":
  descartar urgência é tão categórico quanto afirmá-la.

- **Pergunta clínica sem encaminhamento:**
  Given a pergunta do usuário envolve sintoma, resultado de exame, medicação ou
  decisão de cuidado, e a resposta não encaminha a um profissional de saúde
  When a resposta passa pela verificação
  Then ela é reprovada por violar a R2.

- **Pergunta operacional sem encaminhamento:**
  Given a pergunta é operacional ("quando foi minha consulta?", "que remédio eu
  tomo às 8h?") e a resposta não traz a frase de encaminhamento
  When a resposta passa pela verificação
  Then ela é **aprovada** — o aviso permanente da tela já cumpre o papel, e
  repetir a frase aqui vira ruído que ensina a pessoa a não lê-la.

- **Sugestão pequena:**
  Given o texto sugere hidratação, sono, movimento, anotar quando o sintoma
  aparece, ou levar o exame à consulta
  When a resposta passa pela verificação
  Then ela é **aprovada** — são hábitos de baixo risco que podem ser ditos a
  qualquer pessoa sem conhecer o quadro clínico dela, que é a fronteira prática
  da R3.

- **Texto limpo:**
  Given nada acima se aplica
  Then a verificação aprova, e o texto segue sem alteração — a verificação
  **nunca reescreve**.

## 3. Estrutura

Não há tela. A entrega são três artefatos.

### 3.1 O verificador

Função pura que recebe o texto gerado, o tipo da pergunta (clínica ou
operacional) e devolve aprovação ou uma lista de violações, cada uma com regra,
motivo em português e o trecho que a disparou.

### 3.2 O bloco de regras para o prompt de sistema

Uma constante, exportada, com as regras em texto — a **mesma** fonte que
alimenta o prompt e a documentação. Hoje elas estão escritas num estudo e
seriam copiadas à mão para dentro do prompt; copiar à mão é como duas cópias
divergem.

### 3.3 O conjunto de perguntas adversariais

Perguntas escritas para arrancar a violação, com asserção sobre a resposta.
Elas rodam junto com `npm run validate` **sobre textos de exemplo** — sem
chamar o modelo, porque um teste que gasta token e depende de rede não roda em
toda validação. A conferência contra o modelo real é uma tarefa manual,
registrada.

## 4. Mapa de navegação

Não se aplica. Esta EPIC não tem tela.

## 5. Mapa de dados

Não se aplica. Esta EPIC não lê nem grava dado nenhum. É lógica pura, e é
deliberado: uma regra que depende de estado é uma regra que pode ser
contornada mudando o estado.

## 6. Requisitos não-funcionais específicos

**A verificação reprova, nunca reescreve.** Consertar o texto do modelo por
cima significaria produzir uma frase que nenhum humano escreveu e nenhum modelo
escreveu, sobre a saúde de alguém. Quem decide o que fazer com a reprovação é
quem chamou — e essa decisão é registrada na EPIC da conversa, não aqui.

**Falso positivo é preferível a falso negativo, e a assimetria é declarada.**
Uma resposta boa reprovada custa uma nova geração. Uma resposta com posologia
aprovada custa muito mais. Onde a regra for ambígua, ela reprova.

**A R1 alcança flexões e derivações**, não só o termo isolado: o plural, e os
verbos e substantivos formados a partir dele. A verificação usa raiz, não
igualdade.

**A verificação não vive no prompt.** Ela é código, testada como código. O
prompt é a primeira camada e a mais fácil de contornar; esta é a quarta camada
das cinco do estudo, e é a que diferencia uma regra declarada de uma cumprida.

**Módulo puro, sem AWS e sem rede.** Ele é importado pela função da conversa e
pelos testes. Pela regra de compartilhamento estabelecida na D30, **ele não
pode importar nada** — é o que permite que o aplicativo também o use, se um dia
precisar verificar texto do lado do cliente.

**Nenhuma dependência nova** (regra 3). Expressões regulares e funções de
string do próprio JavaScript bastam.

**O texto das regras tem uma fonte só.** O bloco do prompt e a documentação
saem da mesma constante exportada.

**O que fazer quando a verificação reprova — decidido fora daqui, e de
propósito.** Esta ambiguidade estava registrada pela regra 8 e foi fechada pela
**D31** em 2026-09-16, depois do estudo comparativo em
`estudos-ia/01-estudos/resposta-reprovada.md`: gerar de novo uma vez com o
motivo como instrução, cair para uma resposta determinística montada com o dado
das ferramentas, e só então indisponibilidade honesta.

**A decisão vive na EPIC da conversa, não nesta**, e continua sendo o desenho
certo: quem reage à reprovação é quem tem o dado das ferramentas em mãos. O que
esta EPIC entrega segue igual — **regra, motivo e trecho** —, e é exatamente a
informação de que a D31 precisa para montar o bilhete da segunda geração.

**Uma consequência que cai sobre esta EPIC:** o bilhete é escrito em termos da
**regra**, nunca do sintoma. Por isso o campo `reason` de cada violação precisa
ser uma frase que faça sentido dita ao modelo — "dose e posologia são de quem
prescreve" e não "a palavra 'mg' apareceu". Os testes da L3 já cobram isso ao
exigir que `reason` tenha conteúdo; a D31 é a razão de ele existir.

## 7. Critérios de aceite

- [ ] O termo vetado é reprovado em todas as flexões e derivações testadas —
      coberto por teste.
- [ ] Posologia é reprovada: "tome 500 mg", "2 comprimidos ao dia", "suspenda o
      remédio", "aumente a dose" — coberto por teste.
- [ ] Diagnóstico fechado é reprovado, **inclusive o que descarta gravidade**
      ("não é nada grave") — coberto por teste.
- [ ] Pergunta clínica sem encaminhamento é reprovada; pergunta operacional sem
      encaminhamento é aprovada — coberto por teste.
- [ ] Sugestão pequena de baixo risco é aprovada — coberto por teste, para
      provar que a verificação não é um filtro que barra tudo.
- [ ] Cada violação identifica a regra, o motivo em português e o trecho.
- [ ] A verificação nunca altera o texto recebido — coberto por teste.
- [ ] O bloco de regras do prompt e a documentação saem da mesma constante.
- [ ] Existe um conjunto adversarial com, no mínimo, uma tentativa por regra,
      rodando em `npm run validate` sem chamar o modelo.
- [ ] Existe uma tarefa manual, registrada, de conferir o verificador contra
      respostas reais do modelo — porque teste sobre texto de exemplo não prova
      comportamento de modelo.
- [ ] O módulo não importa nada.
- [ ] Nenhuma dependência nova foi acrescentada.
- [ ] `npm run validate` passa.
