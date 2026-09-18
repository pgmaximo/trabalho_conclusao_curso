# TASKS: Assistente conversacional (Bloco 7)

Passo a passo com código e teste: `docs/superpowers/plans/2026-09-16-assistente-conversacional.md`. Esta lista é o acompanhamento.

## Estado

Marcado em 2026-09-17, contra o codigo no branch `sistema_ia`. As caixas
fechadas tem commit, de `095ccc4` (C1) a `f65bcdb` (C7), mais `ebc1e0a`, que
tirou a concorrencia reservada porque a conta nao a comporta.

**Atualizado em 2026-09-17:** a tarefa 0.5 foi respondida e virou a **D33**, e
a D5 foi aceita. Com isso a C8 e a C9 sairam do bloqueio e estao entregues.

**O que continua aberto e de quem:** a C10 e medicao contra chamada real, e a
conferencia dos criterios de aceite um a um nao foi feita.

## Bloqueios (não são código)

- [x] **Tarefa 0.5 do roadmap — retenção e exclusão de conversa.** Precisa estar respondida **antes da primeira conversa ser gravada**, e é do usuário e do orientador. Três perguntas: por quanto tempo a conversa fica guardada; o usuário pode apagá-la e apagar significa sumir; o que a tela diz sobre isso e onde. **Bloqueia apenas C8 e C9.**
- [x] Aceitar a D5 (histórico em DynamoDB), hoje registrada como *proposta, aguarda aceite*, com a política de retenção decidida acima.
- [x] **EPIC de regras de linguagem concluída.** É pré-requisito duro: C5 consome `checkLanguageRules` e `LANGUAGE_RULES_PROMPT`.

## Fundação da função

- [x] C1 — Endereço direto da função, fora do AppSync (D12), com teto de tempo compatível com o laço mais longo previsto.
- [x] C1 — **Autenticação por verificação do token do Cognito dentro da função.** Requisição sem token válido é recusada — teste.
- [x] C1 — **O dono vem do token, nunca do corpo da requisição** — teste que prova que um identificador enviado no corpo é ignorado.
- [x] C1 — Origem cruzada restrita e limite de chamadas por dono. Sem isso, o endereço direto é uma conta de Bedrock aberta.

## As tools

- [x] C2 — Seis tools de leitura: perfil, exames, analitos (série), consultas, medicamentos, vacinas, wearable.
- [x] C2 — **Nenhuma tool escreve** — teste sobre a lista registrada, não revisão de código.
- [x] C2 — Toda tool filtra pelo dono extraído do token — teste por tool.
- [x] C2 — Ausência de dado é resposta explícita, nunca erro: nenhuma importação de wearable significa "não há dado de wearable".
- [x] C3 — Tool de analitos devolve a série por analito com unidade, data e **documento de origem** de cada valor (tarefa 2.5 do roadmap).
- [x] C3 — A tool de analitos respeita as mesmas exclusões da EPIC de série: linha pendente e valor censurado não entram na comparação.

## O laço e o prompt

- [x] C4 — Laço de tools com **teto de iterações explícito**; atingir o teto é indisponibilidade honesta, nunca resposta parcial apresentada como completa.
- [x] C4 — `maxTokens` explícito na chamada.
- [x] C4 — Janela de histórico com número fixado no código, não a conversa inteira.
- [x] C4 — Prompt de sistema montado a partir de `LANGUAGE_RULES_PROMPT`, nunca com as regras copiadas à mão.
- [x] C4 — Guardrail do Bedrock na entrada; bloqueio produz explicação honesta e a conversa continua utilizável.

## As cinco camadas de linguagem

- [x] C5 — Schema de saída com vocabulário restrito e **citação obrigatória** quando a resposta traz número (D11, R4).
- [x] C5 — Verificação determinística sobre a resposta gerada, com o tipo da pergunta classificado **pela tool usada**.
- [x] C5 — Reprovou: **uma** nova geração com o motivo como instrução, **sem refazer as consultas** (D31) — teste que prova que o laço de tools não roda de novo.
- [x] C5 — O bilhete da segunda geração fala em termos da **regra**, nunca do sintoma.
- [x] C5 — **Nunca remendo e nunca exibir com aviso** — o texto reprovado não aparece, nem recortado — teste.
- [x] C5 — `ruleCheckStatus` registra qual dos **quatro** caminhos aconteceu, para calibrar depois.
- [x] C5b — Modo degradado: cada tool sabe renderizar a própria saída em texto de modelo fixo, ou declara que não sabe.
- [x] C5b — A resposta degradada passa as regras **por construção** — teste que a submete ao próprio verificador e exige aprovação.
- [x] C5b — A primeira linha diz que aquilo não é a resposta da conversa; a última encaminha a um profissional de saúde.
- [x] C5b — Sem dado de tool, cai para indisponibilidade honesta, com copy que diz **o que o aplicativo faz** em vez de pedir à pessoa que adivinhe.
- [x] C5 — Conjunto adversarial roda em `npm run validate`.

## O aplicativo

- [x] C6 — Substituir o mock em `aiAssistantService.ts` **sem mudar a forma do contrato** `AiAssistantService`. Se a forma precisar mudar, registrar como achado.
- [x] C6 — Falha na chamada mostra mensagem amigável e some com o indicador de digitação — comportamento já existente, agora coberto por teste.
- [x] C6 — O aviso permanente da tela ganha teste: a R2 depende dele para dispensar o encaminhamento em pergunta operacional.
- [x] C6 — Bolha com origem: número citado leva ao documento de origem.

## Anexo pontual no chat (tarefa 2.8, D15)

- [x] C7 — O documento passa pelo OCR da Fase 1 e o texto entra **naquela conversa**.
- [x] C7 — **Nada é gravado como dado clínico**: nenhum `LabResult`, nenhum `MedicalDocument` — teste.
- [x] C7 — A tela diz isso em uma linha e oferece `/add-exam` a quem quiser registrar de verdade.

## Persistência — depende da tarefa 0.5

- [x] C8 — Models `ChatConversation` e `ChatMessage`, autorização por dono, índice por `conversationId`.
- [x] C8 — `citations` permite reabrir o documento de origem de um número semanas depois.
- [x] C8 — Título da conversa vem das primeiras palavras do usuário, **nunca gerado pelo modelo**.
- [x] C9 — Gaveta de histórico com conversas reais, agrupadas por período.
- [x] C9 — Apagar uma conversa, e apagar significa sumir.
- [x] C9 — A tela comunica o que é guardado e por quanto tempo.

## Medição

- [ ] C10 — Medir, por turno: custo, número de iterações do laço, e quantas respostas foram reprovadas na primeira geração.
- [ ] C10 — Medir a **distribuição das reprovações por regra** (R1 a R4) e quantas são falso positivo — é o custo escondido da assimetria que o projeto escolheu.
- [ ] C10 — **Gatilho de reabertura da D31:** se a segunda geração salvar menos de um terço das reprovadas, a etapa A está pagando mais do que entrega e a ordem passa a ser degradado → indisponibilidade, sem nova geração.
- [ ] C10 — Calibrar a janela de histórico e o teto de iterações com o medido.
- [ ] C10 — Conferir o cruzamento entre exame e wearable (tarefa 3.1) contra uma pergunta real: "minha vitamina D melhorou e meu sono piorou no mesmo período?"
- [ ] C10 — Registrar tudo em `estudos-ia/04-implementacao/notas.md`.

## Encerramento

- [x] Nenhuma copy da tela e nenhuma resposta aceita usa o termo vetado.
- [x] Critérios de aceite da `spec.md` conferidos um a um, em 2026-09-18: **28
      com teste, 2 sem teste, 1 NÃO CUMPRIDO, 2 não verificáveis sem chamada
      real**. O não cumprido é o mais grave do projeto e está descrito na §8 da
      spec: a R4 no sentido da OMISSÃO não é verificada, e a spec afirmava que
      era. Os dois sem teste: a autorização por dono dos dois models de chat não
      tem o equivalente de `schemaDeMemoria.test.ts`, e a decisão de retenção é
      documento.
- [x] `npm run validate` passa.
