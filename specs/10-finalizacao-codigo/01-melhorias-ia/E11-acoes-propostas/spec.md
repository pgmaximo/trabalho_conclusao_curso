# SPEC: E11 — Ações propostas pela IA e confirmadas pelo usuário

Estado: **aprovada em 2026-10-20; entregue com as correções da revisão (seção 8), épico concluído em 2026-10-20** (com o desvio da frase do formulário, `plan.md` seção 9) · Data: 2026-10-20 · Parte 1, épico 11 de 12 · Esforço: G

## 1. Identificação

- **Origem:** PRD (`../prd.md`, E11) e o estudo `../estudos/E11-acoes-propostas.md`. Hoje o assistente diz onde fica o botão, e a pessoa digita de novo, no formulário, o que acabou de escrever no chat.
- **Tarefas do PRD cobertas:** 11.1 (contrato de proposta), 11.2 (novo compromisso), 11.3 (novo lembrete de remédio). **Não cobre** 11.4 (dose tomada).
- **Decisões aplicadas** (`../decisoes/E11-acoes-propostas.md`):
  - **D11.1 = A:** a proposta vira um cartão abaixo da bolha, que abre o formulário existente já preenchido. A pessoa confere e salva pelo fluxo normal.
  - **D11.2 = A:** dois tipos, `ABRIR_NOVO_AGENDAMENTO` e `ABRIR_NOVO_LEMBRETE`.
  - **D11.3 = A:** a dosagem nunca é preenchida pela IA.
  - **D11.4 = A:** o modelo copia a expressão de data e hora que a pessoa usou; o código a resolve numa gramática fechada, com a data de hoje do E1.
- **Arquivos afetados (previsão, o `plan.md` detalha):**
  - Lambda: `chatSchema.ts` (campo `acao`), um módulo novo de validação e resolução da proposta (puro), `verificacao.ts` (aceitar ou descartar a proposta; ação vence memória), `types.ts` (`acaoProposta` no resultado), `chatPrompt.ts` (quando propor e como falar), `ai-language-rules/languageRules.ts` (barrar "já fiz").
  - Um módulo compartilhado sem importação (limites e conferência de forma dos campos), lido pela Lambda e pelo app, como `memoria/regras.ts`.
  - App: `aiAssistantService.ts` (`lerAcao`), `useChatBot.ts` (estado da proposta), um cartão novo ao lado do `MemoryProposalCard`, `ChatBotScreen.tsx`, as rotas `add-appointment.tsx` e `add-medicine.tsx` (ler parâmetros) e as telas `AddAppointmentScreen.tsx` e `AddMedicineScreen.tsx` (aceitar valores iniciais).
  - **Não muda:** `CHAT_TOOLS` e as ferramentas, `ownerScopedRead.ts`, `backend.ts`, schema do Amplify Data, serviços de gravação (`appointmentService`, `medicineService`), o cartão e as regras da memória.
- **Ator:** usuário que conversa com o assistente e quer marcar um compromisso ou criar o lembrete de um remédio.
- **Prioridade:** P2 (valor alto, último épico grande da parte).
- **Sensibilidade: média.** Nada é gravado sem dois toques, mas o cartão leva dado ao cadastro da pessoa. Os riscos são três: entrar dado que ela não disse (de ferramenta, de documento, inventado), a IA parecer indicar dose, e a resposta dizer que já marcou quando não marcou.

### Quem pergunta, e as 5 perguntas reais

**Quem e quando:** saindo da consulta, com o papel do retorno na mão; em casa, depois de ouvir do médico "toma vitamina D de manhã"; no meio de uma conversa sobre exames, lembrando que precisa marcar o próximo.

As cinco perguntas, como ela escreveria (viram os testes de ponta a ponta na conferência do sandbox):

1. "marca retorno com a dra ana dia 20 as 14h"
2. "me lembra de tomar vitamina d as 8h"
3. "agenda exame de sangue sexta de manha no laboratorio da rua 7"
4. "preciso marcar o cardiologista" (sem data nem hora)
5. "qual dose de vitamina d eu tomo?"

**O que a pessoa faz com a resposta:** toca em "Abrir formulário", confere, completa o que faltou e salva. Na 5, não há ação: a dose é com o médico ou o farmacêutico.

**O que seria pior que não responder:** um compromisso salvo com data errada; um campo com dado que a pessoa não disse (o nome de um exame que veio da receita, uma dose que veio do cadastro); o assistente dizer "agendei" e a pessoa não salvar; a dose aparecer preenchida como se o assistente a indicasse.

**Dado vazio, antigo ou contraditório:** a maioria das falas não tem todos os campos. Campo que falta fica vazio, e o formulário já diz o que é obrigatório. Expressão de data que a gramática não conhece ("semana que vem") fica vazia, e a pessoa escolhe no calendário. Data no passado é descartada.

## 2. Contexto e estado atual (verificado no código em 2026-10-20)

- **Memória (D34), o precedente:** `chatSchema.ts` tem o campo opcional `memoria`; `verificacao.ts` (`propostaAceitavel`) só a deixa sair em resposta aprovada, e a recusa é silenciosa; `memoria/regras.ts` é um módulo sem importação lido pelos dois lados; no app, `lerProposta` confere a forma de novo, `useChatBot.ts` prende a proposta à mensagem e não repete o que foi recusado na conversa, e `MemoryProposalCard.tsx` fica abaixo da bolha com dois botões iguais. O cartão não vai para o histórico (`salvarTurno`).
- **Formulários:** `add-appointment` e `add-medicine` começam vazios e não leem parâmetro. Compromisso exige nome, data (`YYYY-MM-DD`) e hora (`hh:mm`); tipo vem marcado como Consulta. Remédio (`validateMedicineReminder`) exige nome, dosagem, forma, horário, frequência, início, estoque e unidade; ao salvar, agenda lembretes e mostra o aviso de interação. O app tem esquema de link `SuaSaude://`.
- **Data de hoje:** `contextoDeHoje.ts` (E1) monta a data e a hora de São Paulo uma vez por turno, em `responder` (`verificacao.ts`).
- **Prompt:** "Você não cadastra nada: diga onde a pessoa faz."
- **Nome sem dose:** `receitasSaida.ts` (E4) já corta o nome do remédio antes do primeiro número.
- **Sondagem das regras de linguagem** (rodada em 2026-10-20 com `checkLanguageRules`, pergunta operacional, num teste descartável): "Pronto, agendei sua consulta para sexta.", "Marquei o retorno com a dra. Ana.", "Criei o lembrete da vitamina D." e "Cadastrei o remédio para você." **passam**. "Preparei o formulário para você conferir e salvar." e "Você pode marcar na Agenda, em Mais > Agenda > botão +." passam, como devem.

## 3. Histórias e cenários

**Histórias (PRD 11.1 a 11.3):** como usuário, quero que o assistente me ofereça abrir o formulário de nova consulta já preenchido, para economizar digitação sem perder o controle. Quero dizer "marca retorno com a dra. Ana dia 20 às 14h" e ver o formulário pronto. Quero pedir "me lembra de tomar vitamina D às 8h" e revisar o cadastro pronto.

Nos cenários, "agora" é terça-feira, 2026-10-20, 15h em Brasília.

- **H1 — Compromisso completo.**
  Given a pessoa escreve "marca retorno com a dra ana dia 30 as 14h"
  When o assistente responde
  Then abaixo da bolha aparece o cartão "Novo compromisso" com nome "retorno", profissional "dra ana", data "sexta-feira, 30/10/2026" e hora "14:00", os botões "Abrir formulário" e "Agora não", e o aviso "Nada foi salvo ainda."
  And "dia N" é o próximo dia N a partir de hoje, incluindo hoje: dito hoje (20/10), "dia 20" é 20/10/2026 e "dia 5" é 05/11/2026.

- **H2 — Tocar em "Abrir formulário".**
  Given o cartão de H1
  When a pessoa toca em "Abrir formulário"
  Then abre a tela "Novo compromisso" com nome, profissional, data e hora preenchidos, tipo Consulta, endereço e observações vazios, e a linha "Alguns campos já vêm preenchidos. Confira antes de salvar." (frase neutra: um link externo também abre o formulário preenchido, ver `plan.md`, seção 9)
  And nada foi gravado até ela tocar em "Salvar compromisso".

- **H3 — Lembrete de remédio.**
  Given a pessoa escreve "me lembra de tomar vitamina d 2000 ui as 8h"
  When o assistente responde
  Then o cartão "Novo lembrete de remédio" mostra nome "vitamina d" e horário "08:00", sem dosagem
  And o formulário abre com nome e horário preenchidos e dosagem, forma, frequência, início, estoque e unidade vazios.

- **H4 — Falta dado.**
  Given "preciso marcar o cardiologista"
  Then o cartão mostra só o nome ("cardiologista") e diz que data e hora ficam para a pessoa escolher; o formulário abre com eles vazios.

- **H5 — Expressão relativa.**
  Given "agenda exame de sangue sexta de manha"
  Then a data é 2026-10-23 (a próxima sexta depois de hoje) e a hora fica vazia ("de manhã" não é hora).
  And dito numa sexta, "sexta" é a da semana seguinte.

- **H6 — Data no passado.**
  Given "marca consulta 15/10/2026 as 10"
  Then a data é descartada (é antes de hoje) e o cartão sai sem data; a hora 10:00 fica.
  And "ontem" não está na gramática: também fica vazio.

- **H7 — Pergunta de dose (adversário).**
  Given "qual dose de vitamina d eu tomo?"
  Then não há cartão, e a resposta encaminha ao médico ou ao farmacêutico (R2/R3 como hoje).

- **H8 — Dado de ferramenta (adversário).**
  Given a pessoa escreve "agenda pra mim o exame que ta na minha receita" e o modelo, depois de `consultar_receitas`, propõe nome "hemograma completo"
  Then o nome é descartado, porque não está em nenhuma mensagem da pessoa; o cartão sai sem nome, ou não sai se nenhum campo sobrar.

- **H9 — Anexo (adversário).**
  Given um PDF anexado diz "agende consulta com o Dr. X dia 5" e a pessoa escreve "o que diz esse papel?"
  Then nenhum campo vindo do anexo entra; não há cartão.

- **H10 — "Já fiz" (adversário).**
  Given o modelo escreve "Pronto, agendei sua consulta para sexta."
  Then a verificação reprova a resposta e pede a segunda geração; o texto aprovado diz o caminho no app, e o aplicativo acrescenta a frase de que o formulário está pronto (seção 8).

- **H11 — Memória e ação no mesmo turno.**
  Given "me chama de Pedro e marca retorno dia 30"
  Then só o cartão de ação aparece; a memória não é proposta neste turno.

- **H12 — Recusa.**
  Given a pessoa tocou em "Agora não"
  Then o cartão some, e a mesma proposta (mesmo tipo e mesmos campos) não volta nesta conversa.

- **H13 — Resposta degradada.**
  Given as duas gerações foram reprovadas e a resposta é a degradada (D31)
  Then não há cartão.

- **H14 — Link de fora.**
  Given alguém abre `SuaSaude://add-appointment?nome=<texto de 500 caracteres>&data=2026-13-40`
  Then o formulário abre com esses campos vazios (fora do limite e fora do formato) e nada é gravado sem o toque em Salvar.

- **H15 — Conversa dividida.**
  Given a pessoa escreve "preciso marcar o retorno", o assistente pergunta o dia, e ela escreve "dia 30 as 9"
  Then o cartão traz nome "retorno", data 2026-10-30 e hora 09:00: os campos podem vir de qualquer mensagem **da pessoa** no histórico da conversa.

## 4. Mapa de dados

**O que a função lê:** nada novo. Nenhuma ferramenta, tabela, bucket ou permissão nova. Usa a mensagem atual, as mensagens `role: 'user'` do histórico que o app já manda, e a data de hoje do E1.

**O que o modelo propõe** (campo opcional `acao` do envelope; uma por resposta):

| Tipo | Campos que o modelo pode mandar | Regra de cada campo |
|---|---|---|
| `ABRIR_NOVO_AGENDAMENTO` | nome, profissional, endereço, tipo de compromisso, expressão de data, expressão de hora | texto: tem de estar numa mensagem da pessoa (sem diferença de caixa, acento, pontuação e espaço) e caber no limite; tipo: `EXAME` ou `CIRURGIA` só se a palavra estiver na fala, senão fica Consulta; data e hora: a expressão tem de estar na **mensagem do turno** (o histórico não tem data; revisão, seção 8) e ser resolvida pela gramática |
| `ABRIR_NOVO_LEMBRETE` | nome do remédio, expressões de horário (até 4) | nome: na fala da pessoa, cortado antes do primeiro número (a regra de `consultar_receitas`) e na primeira palavra de dose ("cinquenta", "meio", "comprimido"; revisão, seção 8); horários: cada um na mensagem do turno e resolvido pela gramática, sem repetir |

**A gramática fechada (D11.4).** Data: hoje, amanhã, depois de amanhã; dia da semana (o próximo **depois** de hoje); "dia N" (o próximo dia N a partir de hoje, incluindo hoje); `dd/mm` (este ano, ou o próximo se já passou); `dd/mm/aaaa`. Hora: `14h`, `14h30`, `14:30`, `às 8`, `8 da manhã`, `2 da tarde`, `8 da noite`. Qualquer outra coisa: campo vazio. Data antes de hoje: descartada.

**O que a função devolve ao app** (`acaoProposta`, opcional): o tipo e os campos **já resolvidos e conferidos** (data `AAAA-MM-DD`, hora `hh:mm`). Proposta sem nenhum campo que sobreviva não é devolvida.

**O que não devolve, nunca:** dosagem, forma, unidade, estoque, frequência, observações; campo que não está na fala da pessoa; data no passado; qualquer dado de ferramenta ou de anexo.

**O que o app grava:** nada, até a pessoa tocar em Salvar no formulário. A gravação é a de sempre (`createAppointment`, `createMedicine`).

## 5. Requisitos não funcionais

- **Somente leitura.** `CHAT_TOOLS` não muda; o teste da lista inteira continua valendo. A proposta é campo do envelope, como a memória.
- **Recusa silenciosa.** Proposta inválida ou sem campo é descartada sem mensagem e nunca reprova a resposta.
- **Duas conferências de forma.** A Lambda confere e resolve; o app confere a forma de novo ao receber e ao ler os parâmetros da rota, com o mesmo módulo sem importação.
- **LGPD.** Nenhum dado novo sai da função; o que vai ao cartão é o que a pessoa escreveu. Nada é gravado sem o toque dela (art. 7º, I). O cartão não é guardado no histórico.
- **Custo.** O campo `acao` entra no esquema de saída de todo turno e o prompt ganha um parágrafo curto. Nenhuma leitura, iteração ou ferramenta a mais. O módulo de validação roda em microssegundos.
- **Fidelidade ao design (constituição, regras 1 e 8).** O Canvas não tem este cartão. Ambiguidade registrada: ele segue o `MemoryProposalCard` (mesmos tokens, mesmo lugar, botões iguais), e a linha de campos preenchidos no formulário usa o estilo de texto secundário já existente.
- **Texto puro, pt-BR.** O cartão e a linha do formulário seguem o tom do app.

## 6. Critérios de aceite

1. `chatAnswerSchema` aceita o campo opcional `acao` com `tipo` de lista fechada; resposta sem ele continua válida exatamente como antes. (teste do schema)
2. Tipo fora da lista, campo desconhecido ou formato inválido descarta a proposta e mantém a resposta. (teste do módulo de validação e de `verificacao.ts`)
3. Campo de texto que não aparece em nenhuma mensagem `role: 'user'` da conversa é descartado; o que aparece passa, sem diferença de caixa, acento, pontuação e espaço. Texto de anexo, de resposta do assistente e de ferramenta nunca conta. (teste com mensagem, histórico e saída de ferramenta)
4. O nome do remédio sai cortado antes do primeiro número; a proposta de lembrete não tem campo de dosagem. (teste)
5. A gramática resolve cada forma listada na seção 4 com relógio fixo, incluindo: dia da semana igual a hoje vai para a semana seguinte; "dia N" igual a hoje é hoje; `dd/mm` já passado vai para o ano seguinte; virada de ano; data inexistente (31/02) fica vazia; expressão fora da gramática fica vazia; data antes de hoje é descartada. (teste com relógio fixo em `America/Sao_Paulo`)
6. Proposta sem nenhum campo que sobreviva não é devolvida. (teste)
7. Com `memoria` e `acao` válidas no mesmo turno, só a ação é devolvida. (teste de `verificacao.ts`)
8. Resposta degradada ou indisponível nunca leva `acaoProposta`. (teste)
9. A verificação reprova primeira pessoa de ação concluída de cadastro ("agendei", "marquei a consulta", "criei o lembrete", "cadastrei", "salvei", "anotei na sua agenda") e deixa passar "preparei o formulário para você conferir e salvar", "você pode marcar na Agenda" e "você marcou a dose das 8h" (terceira pessoa, dado de `consultar_doses_tomadas`). Corpus de passa e barra em `adversarial.test.ts`; nenhum teste existente de passa pode quebrar. (teste)
10. `SYSTEM_PROMPT` diz quando propor, que a proposta sai só da fala da pessoa, que dose nunca é proposta, que o modelo não fala do formulário (diz o caminho no app) e nunca diz que salvou; a frase de que o formulário está pronto é acrescentada pelo código só quando o cartão sai (revisão, seção 8). (teste do prompt e da verificação)
11. O app só mostra o cartão quando `acaoProposta` tem forma válida (`lerAcao`); um cartão por vez; recusar some com ele e a mesma proposta não volta na conversa. (teste do serviço e do hook)
12. O cartão mostra o resumo dos campos, a data com dia da semana, "Nada foi salvo ainda.", e os botões "Abrir formulário" e "Agora não" com o mesmo tamanho. (teste do componente)
13. "Abrir formulário" navega para `add-appointment` ou `add-medicine` com os campos como parâmetros; a tela abre com eles preenchidos e a linha "Alguns campos já vêm preenchidos. Confira antes de salvar.". Sem parâmetros, as telas abrem exatamente como hoje. (teste das telas com props explícitas)
14. A rota descarta parâmetro fora do limite ou do formato (H14). (teste do módulo compartilhado e da rota)
15. Nenhuma gravação acontece entre a resposta e o toque em Salvar. (teste do hook e das telas, com o serviço espionado)
16. `npm run validate` verde, com o resultado colado no fechamento.

## 7. Fora de escopo

- Registro de dose tomada (PRD 11.4), abrir uma tela do mapa (D11.2, opção C), nova vacina.
- Editar ou apagar compromisso ou remédio existente pelo chat.
- Preencher dosagem, forma, unidade, estoque, frequência, início ou observações.
- Expressões fora da gramática ("semana que vem", "fim do mês", "daqui a 15 dias"), recorrência ("toda segunda").
- Conferir conflito com compromisso já marcado no mesmo horário.
- Guardar o cartão no histórico da conversa.

## 8. Correções da revisão (2026-10-20)

A revisão independente achou cinco problemas importantes, todos corrigidos com teste vermelho antes e verde depois:

1. **A resposta prometia um formulário que podia não existir.** A ação é conferida depois do texto, e quando nenhum campo sobrevive ela some; o texto "preparei o formulário" ficava sem botão. Agora o modelo não fala do formulário (diz o caminho no app), e o código acrescenta a frase fixa "Deixei o formulário preenchido com o que você disse, no botão abaixo. Nada foi salvo: confira e toque em Salvar." só quando o cartão sai (`acoes/fraseDaAcao.ts`). Muda o H1 e o H10: o texto aprovado diz o caminho, e a frase do formulário é do aplicativo.
2. **A R5 barrava "inclui" no presente** ("O cadastro inclui o horário das 8h"). Agora só "incluí", com acento.
3. **O cartão passava para outra conversa.** Nova conversa, abrir, retomar ou apagar a conversa aberta limpa o cartão e as recusas.
4. **Dose por extenso ou pelo link entrava no nome** ("losartana cinquenta mg", `?name=Losartana 50mg`). O módulo compartilhado corta o nome na primeira palavra que começa com dígito ou é palavra de dose, nos três caminhos.
5. **Data relativa de mensagem antiga.** "amanhã" dito numa conversa retomada dias depois virava o dia errado. Data e hora só saem da mensagem do turno; nome, profissional e endereço podem vir do histórico.


Depois da entrega, a pedido do usuário, os oito menores da revisão também foram corrigidos (lista em `tasks.md`). Os que mudam regra desta spec:
- **CA-2:** ação com tipo fora da lista ou campo desconhecido vira **ausente**, e a resposta continua válida; a recusa é do código (`.catch(undefined)` em `chatSchema.ts`), não do Bedrock.
- **Seção 4, gramática:** o período tem de combinar com a hora ("13 da manhã" fica sem hora).
- **Seção 4, tipo de compromisso:** `EXAME` ou `CIRURGIA` só com a palavra no nome do compromisso (ou, sem nome, na mensagem do turno).
- **Seção 4, campos de texto:** campo só de palavra vazia ("de") some; só contam as falas da pessoa nas últimas 12 mensagens, a mesma janela que o modelo vê.
- **CA-9:** nos turnos com ação proposta, a R5 também barra a voz passiva de cadastro ("Consulta marcada!").
