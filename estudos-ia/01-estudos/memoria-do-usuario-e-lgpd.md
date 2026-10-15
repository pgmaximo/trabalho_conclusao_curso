# Memória do usuário e a LGPD

Este documento é a **pré-condição** da EPIC
`specs/07-ia-conversa/memoria-do-usuario/`. A D33 fechou a retenção de conversa
e, no mesmo parágrafo, disse o que ela **não** autoriza: nenhum fato sobre a
pessoa derivado, resumido ou anotado pelo modelo para ser lido em conversas
seguintes. Memória de fatos exigiria EPIC própria, com análise de LGPD antes de
qualquer linha de código. Esta é a análise.

Ela não é formalidade de TCC. Ela decide o desenho: metade das restrições que a
`spec.md` impõe ao código saem daqui, e a `spec.md` cita esta análise em vez de
repetir o argumento.

Referência legal: Lei nº 13.709/2018 (LGPD). Os artigos citados estão no texto,
para que o leitor possa conferir cada afirmação em vez de acreditar nela.

---

## 1. O que se pretende guardar, em uma frase

**Frases curtas que a pessoa confirmou que quer que o assistente lembre de uma
conversa para a outra.**

Não é o histórico — o histórico já existe e é a conversa literal (D33). Não é o
dado de saúde — esse já existe, é estruturado, e o assistente o lê a cada turno
pelas tools. É a terceira coisa: o que a pessoa disse sobre si que não tem
lugar em nenhum formulário do aplicativo e que muda a **forma** das respostas
seguintes.

Exemplos do que se pretende guardar: "prefiro respostas curtas", "trabalho de
madrugada e durmo de dia", "me atendo pelo posto do bairro", "não consigo pagar
exame particular".

## 2. A pergunta que decide tudo: isso é dado pessoal sensível?

**Às vezes sim, e como o "às vezes" não é verificável em tempo de execução, a
resposta operacional é: trate tudo como sensível.**

O art. 5º, II define dado pessoal sensível como, entre outros, "dado referente
à saúde". Uma frase como "prefiro respostas curtas" não é. Uma frase como "faço
hemodiálise às terças" é, sem discussão. As duas chegam pela mesma porta — uma
conversa em linguagem natural — e nenhuma classificação automática separa as
duas com confiança suficiente para que a classificação errada seja aceitável.

Duas consequências, e as duas são de código:

- **O regime mais estrito se aplica ao conjunto todo.** Não há memória "comum"
  e memória "sensível" com tratamentos diferentes. Há uma memória, tratada como
  sensível.
- **Ser derivado pelo modelo não muda o titular.** Um fato que o modelo
  escreveu a partir do que a pessoa disse continua sendo dado pessoal dela.
  "Foi a IA que escreveu" não é uma hipótese de tratamento.

## 3. Base legal: art. 11, I, e só ele

**O art. 11 é exaustivo.** Para dado sensível, não existe "legítimo interesse":
o art. 7º, IX não se repete no art. 11. Percorrendo as hipóteses:

- **Art. 11, II, "f" — tutela da saúde.** Seria a hipótese natural, e ela **não
  se aplica**: o texto restringe expressamente a "procedimento realizado por
  profissionais de saúde, serviços de saúde ou autoridade sanitária". Este
  aplicativo é nenhum dos três, e esta é a razão pela qual ele não pode se
  apoiar na hipótese que pareceria feita para ele.
- **Art. 11, II, "e" — proteção da vida.** Não é o caso: memória de preferência
  de conversa não protege vida de ninguém.
- **Art. 11, II, "a" a "d", "g".** Obrigação legal, política pública, órgão de
  pesquisa, exercício de direitos, prevenção à fraude — nenhuma descreve o que
  se pretende fazer.
- **Art. 11, I — consentimento específico e destacado, para finalidades
  específicas.** É a única que sobra, e ela sobra inteira.

**O que "específico e destacado" exige do código, literalmente:**

1. **Específico** significa por finalidade, não por aplicativo. O aceite dos
   termos de uso do SuaSaúde não cobre isto. E significa, aqui, **por fato**:
   um interruptor único de "ativar memória" transformaria o consentimento em
   genérico, que é exatamente o que o inciso recusa.
2. **Destacado** significa que o pedido não pode estar embutido em outro texto
   nem pré-marcado. Na prática: a confirmação é um elemento próprio, a ação
   afirmativa é da pessoa, e o estado padrão é **não guardar**.

**Decisão que sai daqui:** nada é gravado sem uma confirmação explícita daquele
fato, com o texto do fato visível no momento da confirmação. O modelo *propõe*;
quem *grava* é a pessoa. Essa fronteira é a base legal virando arquitetura, e é
também o que preserva a D9 — a IA de comunicação continua sem gravar.

## 4. Os princípios do art. 6º, um a um

Cada princípio abaixo vira uma restrição de código. A coluna que importa é a
segunda.

**I — Finalidade.** A finalidade precisa ser específica, informada e explícita.
A daqui é: *personalizar a forma das respostas do assistente*. Não é treinar
modelo, não é estatística, não é melhorar o produto. → **O campo de tipo do
fato é uma lista fechada.** Uma memória de texto livre sem tipo aceitaria
qualquer finalidade futura sem ninguém perceber a mudança.

**II — Adequação.** O tratamento tem que ser compatível com a finalidade
informada. → **Um fato que não muda nenhuma resposta futura não é adequado, é
acúmulo.** O assistente só propõe guardar o que ele usaria.

**III — Necessidade — o mais duro dos dez.** Limitação ao mínimo necessário.
Memória é, por natureza, acúmulo. → Três restrições concretas:
- **Teto de fatos.** Um número no código, e atingi-lo significa pedir à pessoa
  que apague um antes de guardar outro — nunca descartar em silêncio.
- **Nenhum fato duplica o que as tools já leem.** Guardar "minha vitamina D deu
  22" seria criar uma segunda fonte de verdade sobre saúde, desatualizada no
  dia seguinte e sem documento de origem. O dado estruturado já está lá.
- **Nenhum fato duplica o que o perfil de saúde já tem.** Condição, alergia e
  medicamento têm formulário próprio. O que pertence ao registro vai para o
  registro.

**IV — Livre acesso.** Consulta facilitada e gratuita sobre a integralidade dos
dados. → **Uma tela que lista tudo o que está guardado.** Não um trecho, não um
resumo: a lista inteira, com o texto literal de cada fato.

**V — Qualidade dos dados — o argumento mais forte a favor da confirmação.**
Exatidão, clareza e atualização. Um fato escrito por um modelo de linguagem a
partir de uma conversa **pode estar simplesmente errado**, e um fato errado
guardado contamina toda resposta seguinte, com aparência de coisa que a pessoa
disse. → **Confirmação antes de gravar** e **edição depois**. A confirmação não
é cortesia de interface; é o mecanismo de exatidão.

**VI — Transparência.** Informações claras sobre o tratamento. → **Cada fato
guarda quando foi guardado e de qual conversa veio**, e a tela mostra isso. Um
fato sem origem é uma afirmação sobre a pessoa que ninguém consegue auditar.

**VII — Segurança.** → Autorização por dono no AppSync, a mesma que já protege
exame e consulta; leitura pela função sempre filtrada pelo dono extraído do
token, nunca por identificador vindo do corpo da requisição.

**VIII — Prevenção.** Adoção de medidas para prevenir dano. → **A verificação
de linguagem se aplica ao texto do fato proposto, antes de ele aparecer na
tela.** Um fato que quebra as regras R1–R5 não é oferecido para confirmação.

**IX — Não discriminação — o princípio que fecha a porta mais perigosa.**
Impossibilidade de tratamento para fins discriminatórios ilícitos ou abusivos.
Um fato como "não costuma seguir a orientação médica" ou "parece ansioso com
exames" seria um julgamento sobre a pessoa, guardado, relido a cada conversa e
capaz de mudar o tom de tudo o que ela recebe depois. → **Fato de julgamento é
proibido por categoria**, e não por revisão caso a caso.

**X — Responsabilização e prestação de contas.** Demonstração da adoção de
medidas eficazes. → **O caminho de escrita é único e testável.** A função
continua somente leitura, e o teste que varre os arquivos dela procurando
comando de escrita continua valendo. Quem escreve é o aplicativo, a partir de
um toque da pessoa.

## 5. Os direitos do art. 18, e onde cada um vira tela

| Inciso | Direito | Onde ele existe |
|---|---|---|
| I | Confirmação de que existe tratamento | A tela de memória, que existe mesmo vazia |
| II | Acesso aos dados | A lista inteira, texto literal |
| III | Correção de dado incompleto ou desatualizado | Editar o texto de um fato |
| IV | Eliminação de dado desnecessário ou excessivo | Apagar um fato |
| VI | Eliminação dos dados tratados com consentimento | Apagar todos |
| VIII | Informação sobre a possibilidade de não consentir | A recusa é um botão ao lado do "lembrar", com o mesmo peso |
| IX | Revogação do consentimento | Desligar a memória |

**Art. 8º, §5 — a revogação e a eliminação são coisas diferentes, e o código
precisa saber disso.** Revogar o consentimento interrompe o tratamento dali
para frente; a eliminação do que já foi guardado é o inciso VI, e depende de
requerimento. Traduzido para uma tela: desligar a memória **pergunta** se a
pessoa também quer apagar o que já está guardado, e não decide por ela. Apagar
sem perguntar destruiria dado que ela talvez quisesse manter; manter sem
perguntar deixaria dado sensível guardado depois de a pessoa ter dito que não
quer mais aquilo. A pergunta é a única saída honesta.

**Art. 18, V — portabilidade.** Fica registrado como pendência conhecida, e não
como ausência silenciosa: `src/services/export/dataExportService.ts` já
documenta que a exportação não existe ainda. A memória entra na mesma pendência
quando ela for implementada, e esta análise é o registro de que ela deve.

**Art. 20 — decisão automatizada.** Não se aplica em sentido estrito: a memória
não define perfil que afete interesse jurídico. Mas o §1 — direito a informação
sobre os critérios — é o mesmo argumento do princípio VI, e a resposta de
desenho é a mesma: a pessoa vê o que está guardado e de onde veio.

**Art. 9º — informação prévia.** A finalidade, a forma e a duração precisam
estar disponíveis. A duração, aqui, é a mesma da D33: enquanto a pessoa quiser.

## 6. O que esta análise PROÍBE

Escrito como proibição, para virar teste:

1. **Gravar qualquer fato sem confirmação explícita daquele fato.** Nem no
   primeiro uso, nem com um aviso genérico, nem com caixa pré-marcada.
2. **Guardar valor de exame, ou qualquer número de saúde, como fato.** Número
   vem de tool, com documento de origem (R4). Um número na memória seria número
   sem origem, guardado, e relido como verdade.
3. **Guardar diagnóstico, prognóstico, cálculo de risco ou qualquer julgamento
   sobre a pessoa** (art. 6º, IX e regra 4 da constituição).
4. **Guardar condição, alergia ou medicamento como fato de memória.** Isso é
   registro de saúde e tem formulário próprio; o assistente aponta o caminho e
   não grava uma cópia paralela.
5. **Usar um fato guardado como fonte de um número numa resposta.** A memória
   muda a forma da resposta, nunca o conteúdo factual sobre medida.
6. **A função do chat escrever qualquer coisa.** O contrato somente leitura
   vale integralmente, e o teste que o verifica não muda.
7. **Inferir fato de dado estruturado.** O modelo não olha os exames e conclui
   "esta pessoa tem colesterol alto" para guardar. Fato nasce do que a pessoa
   escreveu na conversa.

## 7. O que esta análise AUTORIZA

1. O modelo **propor** um fato, em texto curto, a partir do que a pessoa
   escreveu nesta conversa.
2. A pessoa **confirmar**, e a confirmação gravar.
3. A função **ler** os fatos confirmados, filtrados pelo dono do token, e
   recebê-los no prompt como contexto de forma — declaradamente como "o que a
   pessoa pediu para você lembrar", nunca como registro de saúde.
4. A pessoa **ver, editar, apagar um, apagar todos e desligar**.

## 8. Risco residual, escrito porque ele não desaparece

**A pessoa pode confirmar um fato sensível que ela não precisaria ter
guardado.** O consentimento é válido, a tela foi honesta, e ainda assim o dado
sensível passou a existir num lugar a mais. O que reduz: a lista fechada de
tipos, o teto de fatos, a verificação de linguagem sobre a proposta e a
facilidade de apagar. O que não some: a possibilidade. Fica registrado.

**O modelo pode propor um fato sutilmente errado, e a pessoa confirmar sem
notar.** "Você prefere respostas curtas" quando ela disse "responde rápido" é
uma paráfrase razoável; outras não serão. O que reduz: propor no texto mais
literal possível, mostrar o texto exato antes de gravar, e permitir editar
depois. O que não some: a paráfrase é do modelo.

**A memória pode mudar a resposta de um jeito que a pessoa não relaciona à
memória.** É o risco de opacidade do art. 20, §1. O que reduz: a tela de
memória e a linha de origem em cada fato. O que não some: nenhuma resposta
individual diz quais fatos a influenciaram.

## 9. As nove consequências diretas para o desenho

Esta é a lista que a `spec.md` e o `plan.md` implementam. Cada item aqui tem
artigo ou princípio atrás dele, acima.

1. Modelo próprio no schema, com autorização por dono (art. 6º, VII).
2. Campo de tipo com **lista fechada** (art. 6º, I).
3. Gravação só pelo aplicativo, a partir de confirmação (art. 11, I; art. 6º X).
4. Estado padrão: memória **desligada** até a primeira confirmação (art. 11, I).
5. Proposta passa pela verificação de linguagem antes de ser oferecida
   (art. 6º, VIII).
6. Teto de fatos, com pedido explícito à pessoa quando ele é atingido
   (art. 6º, III).
7. Origem e data em cada fato, visíveis (art. 6º, VI).
8. Tela com ver, editar, apagar um, apagar todos e desligar (art. 18).
9. Desligar **pergunta** se também apaga (art. 8º, §5 combinado com art. 18,
   VI).

---

**Conclusão.** A memória de fatos é viável sob a LGPD neste aplicativo, com base
no art. 11, I, desde que o consentimento seja por fato e a lista de tipos seja
fechada. O que a análise recusa não é a memória: é a memória silenciosa, a
memória de julgamento e a memória de número. As três recusas viram teste na
EPIC.
