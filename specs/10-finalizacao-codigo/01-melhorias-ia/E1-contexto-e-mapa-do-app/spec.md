# SPEC: E1 — Data de hoje e mapa do app

Estado: **aprovada em 2026-10-18 (P1 = A); entregue com correções da revisão (seção 9); épico concluído em 2026-10-19** · Data: 2026-10-17 · Parte 1, épico 5 de 12 · Esforço: P

## 1. Identificação

- **Origem:** pedido dos colegas de projeto por "mais poder" no assistente. O PRD (`../prd.md`, E1) aponta que o prompt não traz a data de hoje e que o assistente não sabe levar a pessoa a uma tela.
- **Tarefas do PRD cobertas:** 1.1 (data e hora atuais no contexto) e 1.2 (mapa do app e orientação de navegação).
- **Decisões aplicadas** (`../decisoes/E1-contexto-e-mapa-do-app.md`, todas em 2026-10-17):
  - **D1.1 = A:** a data entra num **segundo bloco** de `system`, depois do prompt fixo. O prompt fixo não muda de byte por causa da data.
  - **D1.2 = A:** fuso fixo `America/Sao_Paulo`. A função que monta o bloco recebe o instante (e o fuso fica num só lugar), para a opção B poder vir depois sem refazer nada.
  - **D1.3 = A:** lista de telas escrita à mão, com teste que confere as rotas citadas.
- **P1 = A (nasceu nesta spec, decidida em 2026-10-18):** tempo decorrido dito pelo modelo, só em meses ou anos, aproximado e sempre junto da data exata (seção 3, H3).
- **Arquivos afetados (previsão, o `plan.md` detalha):**
  - nasce `amplify/functions/chat-assistant/contextoDeHoje.ts` (puro: instante → texto do bloco de data);
  - nasce `amplify/functions/chat-assistant/mapaDoApp.ts` (a lista de telas, como dado, e o texto que vai ao prompt);
  - mudam `chatPrompt.ts` (instrução de uso da data e o mapa), `conversationLoop.ts` (segundo bloco de `system`), `verificacao.ts` (`responder` lê o relógio **uma vez** por turno);
  - muda `tools/consultas.ts` (corte de futuras e passadas na hora de Brasília; ver seção 2, achado A1);
  - testes novos: `contextoDeHoje.test.ts`, `mapaDoApp.test.ts`, `consultasTool.test.ts`; ajustes em `conversationLoop.test.ts` e `chatPrompt.test.ts`.
  - **Não muda:** schema do Amplify Data, `amplify/backend.ts` (nenhuma tabela nova), o contrato do pedido ao chat (`chatSchema.ts`, `types.ts` do cliente), telas do app.
- **Ator:** usuário (paciente) que pergunta algo que depende de data ("o que tenho amanhã?") ou que não acha uma função no app ("onde cadastro um remédio?").
- **Prioridade:** P1 (esforço pequeno, e o E11 depende da data de hoje).
- **Sensibilidade: baixa a média.** Data e mapa não são dado clínico. O risco está em dois erros: um "hoje" errado que faz a pessoa perder uma consulta, e um caminho inventado que a deixa perdida no app.

### Quem pergunta, e as 5 perguntas reais

**Quem e quando:** a pessoa no dia a dia, abrindo o app para lembrar de um compromisso, ou alguém que acabou de instalar e não acha onde fazer as coisas. Muitos são idosos, com baixo letramento digital, e escrevem como falam.

As cinco perguntas, como ela escreveria, que viram os testes de ponta a ponta (na conferência do sandbox):

1. "tenho alguma consulta amanha?"
2. "o que eu tenho essa semana"
3. "faz quanto tempo q fiz o exame de sangue?"
4. "onde eu coloco os dados do meu relogio"
5. "como cadastro um remedio novo"

**O que a pessoa faz com a resposta:** vai à consulta (ou não), ou abre a tela indicada. Por isso o dia errado e a tela inventada são os erros a evitar.

**O que seria pior que não responder:** dizer "amanhã" para uma consulta que é hoje, dizer que uma consulta já passou quando faltam duas horas para ela, ou mandar a pessoa para uma tela ou um botão que não existe.

**Dado vazio, antigo ou contraditório:** sem consulta, a resposta diz que não há consulta registrada e onde marcar (Mais > Agenda). Se a pessoa disser outra data ("hoje é dia 20"), vale a do sistema, e o assistente diz com gentileza qual é a data que ele tem.

## 2. Contexto e estado atual (verificado no código em 2026-10-17)

- `conversationLoop.ts:211` monta `system: [{ text: input.systemPrompt ?? SYSTEM_PROMPT }]`. Um bloco só, sem `cachePoint`. O `systemPrompt` vem de `montarSystemPrompt(fatos)` (`memoria/leitura.ts`), chamado em `responder` (`verificacao.ts:539`), uma vez por turno. A segunda geração (D31) reusa o mesmo `TurnInput`, então o que entra em `system` é idêntico nas duas.
- **O modelo não sabe a data de hoje.** Só as ferramentas olham o relógio: `consultar_consultas` (`new Date().toISOString()`), `consultar_campanhas` e `consultar_interacoes` (`dataEmSaoPaulo(new Date())`, de `formatoPtBr.ts`).
- **Achado A1 (defeito existente):** `Appointment.scheduledAt` é gravado como **hora local ingênua**, "AAAA-MM-DDTHH:mm" sem fuso (contrato em `src/services/agendaDateRange.ts`). `consultar_consultas` compara esse texto com `new Date().toISOString()`, que é **UTC**. Como Brasília está 3 h atrás do UTC, uma consulta marcada para daqui a menos de 3 horas sai como **passada**. Exemplo: às 8h de Brasília (11h UTC), uma consulta às 10h de hoje ("…T10:00") é menor que "…T11:00:00.000Z" e vai para `passadas`. Isso afeta exatamente a pergunta "tenho consulta hoje?". O E1 corrige, porque é o épico da data de hoje (ver H2).
- O prompt já cita telas pelo nome: "tela de Prevenção", "tela de Vacinação", "tela de Medicamentos". No app, os rótulos são "Prevenção & Alertas" e "Carteira de vacinação" (menu Mais) e "Remédios" (barra de baixo), em `src/constants/navigation.ts`. Não há lista de telas nem caminho de navegação no prompt.
- Rótulos e caminhos reais, conferidos no código:
  - **Barra de baixo** (`APP_TABS`): Início, Exames, Assistente, Remédios, Mais.
  - **Menu Mais** (`MORE_MENU_ITEMS`): Agenda, Prevenção & Alertas, Carteira de vacinação, Dados do smartwatch, Memória do assistente, Perfil.
  - **Botões que abrem telas de cadastro:** "Adicionar documento" (Exames → `add-exam`), "Evolução" (Exames → `analyte-series`), "Adicionar medicamento" (Remédios → `add-medicine`), "Novo compromisso" (Agenda → `add-appointment`), "Adicionar vacina" (Carteira de vacinação → `add-vaccine`), "Importar" (Dados do smartwatch → `import-health-data`), "Editar perfil" (Perfil → `edit-profile`). Para editar, a pessoa toca no item: remédio em Próximas doses ou Estoques (`edit-medicine`), compromisso na Agenda (`edit-appointment`), documento em Exames (`document-detail`).
  - **Rotas fora do mapa** (antes do login ou só de desenvolvimento): `index`, `register`, `confirm`, `forgot-password`, `profile-setup`, `dev-preview`.
- O repositório já tem um teste do mesmo tipo para a barra de baixo: `__tests__/abaAtivaPorRota.test.ts` reprova uma tela nova em `src/app/(app)/` sem entrada em `ROUTE_TAB_MAP`.

## 3. Histórias e cenários

**Histórias (PRD 1.1 e 1.2):** como usuário, quero perguntar "o que tenho amanhã?" e receber a resposta certa, sem calcular datas. Como usuário, quero perguntar "onde importo os dados do meu relógio?" e ser levado ao lugar certo.

- **H1 — Amanhã, perto da meia-noite.**
  Given são 22h30 de sábado, 17/10/2026, em Brasília (já 01h30 de domingo em UTC)
  And a pessoa tem uma consulta "2026-10-18T09:00"
  When ela pergunta "tenho alguma consulta amanha?"
  Then o bloco de data do turno diz sábado, 17/10/2026, 22h30
  And a consulta vem em `futuras`
  And a resposta diz que amanhã, domingo, 18/10, às 9h, há a consulta.

- **H2 — Consulta de hoje, daqui a pouco (achado A1).**
  Given são 8h de Brasília e a pessoa tem consulta hoje às 10h ("…T10:00")
  When ela pergunta "tenho consulta hoje?"
  Then `consultar_consultas` devolve a consulta em `futuras` e como `proxima`, nunca em `passadas`.

- **H3 — Tempo decorrido (P1 = A).**
  Given a pessoa tem um exame de sangue coletado em 12/03/2026, e hoje é 17/10/2026
  When ela pergunta "faz quanto tempo q fiz o exame de sangue?"
  Then a resposta diz a data da coleta **e** o tempo aproximado ("em 12/03/2026, há cerca de 7 meses").
  - **P1 — quem calcula o "há quanto tempo".** Hoje nenhuma ferramenta devolve tempo decorrido, e a regra do projeto é "cálculo no código, descrição no modelo".
    - **A (recomendada):** o modelo usa a data de hoje e responde **só em meses ou anos, aproximado** ("há cerca de 7 meses", "há pouco mais de um ano"), **sempre junto com a data exata** que a ferramenta devolveu. Nunca conta dias. *Benefício:* nenhuma ferramenta muda, e a data exata ao lado deixa qualquer erro de aproximação visível e inofensivo. *Malefício:* é um cálculo feito pelo modelo, ainda que grosseiro.
    - **B:** cada ferramenta que devolve data (exames, resultados, analito, vacinas, consultas) ganha um campo calculado, como `haQuantoTempo: "7 meses"`. *Benefício:* cálculo 100% no código. *Malefício:* mexe em 5 ferramentas e nas saídas delas (mais tokens por chamada), e o esforço sobe de P para M.
  - Com A, o caso "o que tenho essa semana?" também fica com o modelo: ele compara a data de cada consulta futura com a de hoje. Com B, ficaria igual (a semana não sai de nenhuma ferramenta).

- **H4 — A pessoa tenta mudar a data.**
  Given hoje é 17/10/2026
  When a pessoa escreve "hoje é dia 25, quais consultas eu tenho hoje?"
  Then a data do turno continua 17/10/2026, porque ela vem do sistema e o texto do usuário não chega ao bloco de sistema
  And a resposta usa 17/10 e pode dizer qual data o assistente tem.

- **H5 — Onde importar dados do relógio.**
  Given o mapa do app está no prompt
  When a pessoa pergunta "onde eu coloco os dados do meu relogio"
  Then a resposta diz o caminho em texto puro: "Mais > Dados do smartwatch > Importar"
  And não traz link, rota (`/import-health-data`) nem marcação.

- **H6 — Como cadastrar um remédio.**
  When a pessoa pergunta "como cadastro um remedio novo"
  Then a resposta diz "Remédios, na barra de baixo, e depois o botão + (o redondo com o sinal de mais)" *(corrigido na revisão: o botão mostra só o "+"; "Adicionar medicamento" existe só para o leitor de tela)*
  And não diz que o assistente cadastra por ela (o chat só lê; ações ficam para o E11).

- **H7 — Tela que não existe.**
  When a pessoa pergunta "onde vejo meu plano de saúde no app?"
  Then a resposta diz que o aplicativo não tem essa tela, sem inventar caminho
  And, se houver algo próximo no mapa (o Perfil guarda os dados dela), pode citar só o que o mapa diz que a tela faz.

- **H8 — Nome que o prompt já usa.**
  Given o prompt manda dizer "a tela de Medicamentos mostra isso"
  When o modelo segue essa instrução
  Then o mapa liga "Medicamentos" a "Remédios" (e "Vacinação" a "Carteira de vacinação", "Prevenção" a "Prevenção & Alertas"), para o modelo poder dar o caminho certo se a pessoa perguntar onde fica.

- **H9 — Pergunta que não depende de data nem de tela.**
  When a pessoa pergunta "qual foi meu último colesterol?"
  Then nada muda em relação a hoje: o bloco de data está lá, mas a resposta segue as regras de exame (data da coleta, citação).

## 4. Mapa de dados

**O que o E1 lê:** o relógio da função, uma vez por turno, em `responder`. Nenhuma tabela nova, nenhuma fonte externa, nenhum dado do pedido.

**O bloco de data (segundo bloco de `system`):**
- Entra: o instante do turno (`Date`).
- Sai: um texto curto, em pt-BR, com o dia da semana, a data (DD/MM/AAAA) e a hora (HHhMM) em Brasília, e a frase de que esta é a data de hoje para a conversa. Exemplo: "Hoje é sábado, 17/10/2026, e agora são 14h05 no horário de Brasília."
- **Não sai:** nada do usuário (nem nome, nem cidade, nem memória), nada vindo do pedido. Assim o bloco nunca carrega texto de fora.

**O mapa do app (dentro do prompt fixo):**
- Cada entrada tem: a rota (só para o teste, **não** vai ao prompt), o nome da tela como o app mostra, os apelidos que os textos do chat já usam, o caminho em texto ("Mais > Dados do smartwatch > Importar") e uma linha sobre o que a tela faz.
- **Não sai para o modelo:** rota, caminho de arquivo, nome de componente.
- Telas no mapa: Início, Exames (com Adicionar documento, o documento aberto e Evolução), Assistente (com Histórico de conversas), Remédios (com Adicionar medicamento e a edição), Mais, Agenda (com Novo compromisso e a edição), Prevenção & Alertas, Carteira de vacinação (com Adicionar vacina), Dados do smartwatch (com Importar), Memória do assistente, Perfil (com Editar perfil).

**`consultar_consultas` (achado A1):**
- Muda só o instante de corte: "agora" passa a ser a hora de Brasília no mesmo formato da gravação ("AAAA-MM-DDTHH:mm"), em vez do UTC.
- A forma da saída não muda (`disponivel`, `futuras`, `passadas`, `proxima`, `explicacao`).

## 5. Requisitos não funcionais

- **Segurança:** o bloco de data é texto montado pelo código a partir do relógio. Ele não passa pelo guardrail (D1.1) e não contém nada que o usuário escreveu, então não abre caminho para injeção. A mensagem do usuário continua só dentro de `guardContent`.
- **LGPD:** nenhum dado pessoal novo é lido nem enviado ao modelo.
- **Consistência no turno:** o relógio é lido **uma vez** por turno, em `responder`. A primeira e a segunda geração (D31) veem exatamente o mesmo bloco.
- **Custo de tokens:** o bloco de data tem cerca de 30 tokens. O mapa, algumas centenas (meta: até 450 tokens, medido no teste pelo tamanho do texto). Os dois entram em todo turno. O prompt fixo continua constante (a memória já o varia por pessoa, como hoje), e a data fica depois dele, o que mantém a porta aberta para prompt caching.
- **Desempenho:** nenhuma leitura nova. Formatar a data é um `Intl.DateTimeFormat` criado uma vez no módulo, como `dataEmSaoPaulo`.
- **Manutenção:** tela nova em `src/app` sem entrada no mapa (ou sem entrar na lista de excluídas) reprova o teste, como já faz `abaAtivaPorRota.test.ts`.
- **Regras de linguagem:** respostas com data e caminho de tela ("amanhã, domingo, 18/10, às 9h"; "há cerca de 7 meses"; "Mais > Agenda > Novo compromisso") passam por `checkLanguageRules` sem falso positivo.

## 6. Critérios de aceite

**Data de hoje (1.1)**

- **CA-1.** Uma função pura recebe um instante e devolve o texto do bloco com o dia da semana, a data DD/MM/AAAA e a hora HHhMM **em Brasília**. Teste com instantes fixos. (`contextoDeHoje.test.ts`)
- **CA-2.** Virada de dia: o instante 2026-10-18T01:30Z vira "sábado, 17/10/2026, 22h30". O instante 2026-10-18T03:00Z vira "domingo, 18/10/2026, 00h00". (`contextoDeHoje.test.ts`)
- **CA-3.** O teste do CA-2 passa com qualquer `TZ` do processo, porque o fuso é explícito na função e não vem do ambiente. (teste que roda a função com o fuso do processo diferente, ou que prova que ela não usa getters locais de `Date`)
- **CA-4.** Com o bloco de data, o pedido ao Bedrock leva `system` com **dois** blocos: o prompt (posição 0, idêntico ao de hoje) e a data (posição 1). Sem o bloco, `system` continua com um bloco só, byte a byte como hoje. (`conversationLoop.test.ts`)
- **CA-5.** A data **não** aparece em `messages` nem dentro de `guardContent`. (`conversationLoop.test.ts`)
- **CA-6.** O relógio é lido uma vez por turno: com uma segunda geração (D31), as duas chamadas ao Bedrock levam o **mesmo** bloco de data. (`verificacao.test.ts` ou `conversationLoop.test.ts`, com relógio falso)
- **CA-7.** `SYSTEM_PROMPT` não muda com o relógio: duas leituras em instantes diferentes são iguais, e ele não contém data. (`chatPrompt.test.ts`)
- **CA-8.** `SYSTEM_PROMPT` manda usar a data do bloco como hoje e preferir a data que a ferramenta trouxe a qualquer cálculo. Com P1 = A: tempo decorrido só em meses ou anos, aproximado e junto da data exata, nunca em dias. (`chatPrompt.test.ts`, por trecho)
- **CA-9.** `consultar_consultas` com relógio às 08h00 de Brasília põe uma consulta "…T10:00" do mesmo dia em `futuras` e como `proxima`. Às 10h01 ela vai para `passadas`. Perto da meia-noite (22h30 de Brasília, 01h30 UTC), uma consulta das 23h do mesmo dia está em `futuras`. (`consultasTool.test.ts`)
- **CA-10.** Respostas com data passam pelas regras de linguagem sem reprovação: "Amanhã, domingo, 18/10, às 9h, você tem consulta com a Dra. Ana." e "Você fez esse exame em 12/03/2026, há cerca de 7 meses." (teste em `verificacao.test.ts` ou no de regras)

**Mapa do app (1.2)**

- **CA-11.** Toda rota do mapa existe como arquivo em `src/app/` ou `src/app/(app)/`. (`mapaDoApp.test.ts`, lendo o disco)
- **CA-12.** Toda tela de `src/app/` e `src/app/(app)/` (fora `_layout`) está no mapa **ou** numa lista explícita de excluídas, com o motivo. Tela nova sem uma das duas reprova. (`mapaDoApp.test.ts`)
- **CA-13.** Os nomes da barra de baixo e do menu Mais citados no mapa são **iguais** aos de `APP_TABS` e `MORE_MENU_ITEMS` (`src/constants/navigation.ts`). Rótulo trocado no app reprova. (`mapaDoApp.test.ts`)
- **CA-14.** *(Corrigido na revisão.)* Botão que mostra só o ícone "+" aparece no caminho como "botão + (nome)", e o teste confere o `accessibilityLabel` e o ícone na tela; botão com texto ("Evolução", "Importar", "Editar perfil") precisa do texto **visível** (`<Text>`). Versão original: todo botão citado num caminho ("Adicionar medicamento", "Novo compromisso", "Importar"…) aparece como texto no código da tela de onde ele sai. (`mapaDoApp.test.ts`, lendo o arquivo da tela)
- **CA-15.** O texto do mapa no prompt não contém rota (nada que comece com `/`), nome de arquivo nem marcação (asterisco, `#`, link). (`mapaDoApp.test.ts`)
- **CA-16.** Toda "tela de X" citada em `SYSTEM_PROMPT` corresponde a um nome ou apelido do mapa (Medicamentos → Remédios, Vacinação → Carteira de vacinação, Prevenção → Prevenção & Alertas). (`chatPrompt.test.ts`)
- **CA-17.** `SYSTEM_PROMPT` contém o mapa e manda: orientar só por ele; se a tela não está no mapa, dizer que não sabe onde fica, sem inventar; dar o caminho em texto, sem link; nunca dizer que o assistente faz o cadastro. (`chatPrompt.test.ts`, por trecho)
- **CA-18.** O tamanho do mapa no prompt fica abaixo do teto combinado (meta: 1.800 caracteres, cerca de 450 tokens). (`mapaDoApp.test.ts`)
- **CA-19.** Uma resposta com caminho de tela ("Toque em Mais, depois em Agenda e em Novo compromisso.", e, depois da revisão, "…e no botão +") passa pelas regras de linguagem. (teste de regras)

**Gate**

- **CA-20.** `npm run validate` verde, com a saída colada em `tasks.md`.

## 7. Fora de escopo

- Fuso do aparelho (D1.2 = B). Fica para depois, sem refazer nada.
- Link clicável para a tela na bolha do chat (PRD 1.2; pode virar tarefa do E11).
- O assistente fazer o cadastro ou abrir a tela sozinho (E11).
- Prompt caching (`cachePoint`). O E1 só deixa a porta aberta.
- Renomear "tela de Medicamentos", "tela de Vacinação" e "tela de Prevenção" nos textos que já existem (prompt, ferramentas, modo degradado). O mapa liga os apelidos aos nomes do app (H8), sem mexer nesses textos.
- Passar o instante do turno para as ferramentas. Elas seguem com o próprio relógio. A diferença é de milissegundos dentro de um turno.
- Com P1 = A: o campo calculado de tempo decorrido nas ferramentas (P1 = B).

## 8. O que depende de dispositivo, sandbox ou rede

- As 5 perguntas reais da seção 1 contra o modelo de verdade (`ampx sandbox` e o app autenticado): se ele usa a data do bloco, se responde "amanhã" certo perto da meia-noite, se dá o caminho do mapa e não inventa tela. Os testes provam o que vai ao modelo, não o que ele responde.
- O tamanho do prompt em tokens reais (`inputTokens` no log do turno), comparado com a meta da seção 5.

## 9. O que mudou na revisão (2026-10-18)

- **Botões de ícone (H6, CA-14).** Quatro botões de cadastro (documento, remédio, compromisso, vacina) mostram só o "+". O mapa dizia o nome deles por escrito, e a pessoa procuraria um texto que não está na tela. Agora o caminho diz "botão + (nome)", e o prompt explica que é o botão redondo com o sinal de mais.
- **Histórico de conversas (§4).** Tinha ficado fora do mapa na execução; voltou, no "o que faz" do Assistente ("o relógio no alto abre as conversas antigas").
- **Consulta salva só com data (H2, Review Focus).** O plano a tratava como futura o dia todo; a Agenda do app a lê como 00h00 e a mostra no histórico. Para o chat não dar outra resposta sobre o mesmo registro, ela segue a Agenda: a de hoje já passou, a de amanhã é futura.
- **Menos de um mês (P1).** A regra "só meses ou anos" não deixava redação para o que aconteceu há 6 dias. Agora: se faz menos de um mês, só a data, sem contar dias.
- **Onde está o bloco de data.** O prompt dizia "o bloco que segue estas instruções", mas a memória da pessoa vem logo depois delas. Agora aponta o bloco pelo começo dele ("Data e hora deste turno").
- **Fuso num lugar só.** `FUSO_DO_APP` e `partesEmSaoPaulo` em `formatoPtBr.ts`, usados pelo corte das consultas, pelo dia das campanhas e pelo bloco de data.
