# Roadmap — duas frentes de IA

Ordenado por dependência real, não por vontade. Cada tarefa tem prioridade
(P0 = bloqueia outras, P1 = caminho crítico, P2 = melhora o que já funciona).

**Revisão de 2026-09-15:** a ordem das frentes foi invertida depois da leitura
da feature de wearable do Arturo e de um esclarecimento do usuário. Motivo em
"Justificativa da ordem", e registro em `decisoes.md` D13.

**Revisão de 2026-09-16 — as duas frentes agora têm spec.** Toda tarefa deste
roadmap que produz software passou a ter EPIC rastreável, no formato
`spec.md` + `plan.md` + `tasks.md` que a regra 6 da constituição exige:

| Tarefas | EPIC | Plano técnico |
|---|---|---|
| 1.1 a 1.5, 1.7 | `specs/06-ia-leitura-exames/extracao-de-documentos/` | `docs/superpowers/plans/2026-09-16-extracao-documentos-bedrock.md` |
| 1.6 | `specs/06-ia-leitura-exames/serie-por-analito/` | `docs/superpowers/plans/2026-09-16-serie-por-analito.md` |
| 0.3 | `specs/07-ia-conversa/regras-de-linguagem/` | `docs/superpowers/plans/2026-09-16-regras-de-linguagem.md` |
| 2.1 a 2.8, 3.1 | `specs/07-ia-conversa/assistente-conversacional/` | `docs/superpowers/plans/2026-09-16-assistente-conversacional.md` |
| 2.9 (nova) | `specs/07-ia-conversa/memoria-do-usuario/` | `docs/superpowers/plans/2026-09-18-memoria-do-usuario.md` |
| 2.10 (nova) | `specs/07-ia-conversa/conversa-sobre-o-exame/` | a escrever, quando a execução começar |
| 2.11 (nova) | `specs/08-ia-fechamento/lacunas-e-decisoes/` | `specs/08-ia-fechamento/lacunas-e-decisoes/plan.md` |

A **2.9 não estava neste roadmap** e foi acrescentada em 2026-09-18: ela nasce
de um pedido direto do usuário — memória de curto e longo prazo — e da fronteira
que a D33 deixou escrita ao recusar fazer isso dentro da EPIC da conversa. Das
três camadas de memória que o pedido descrevia, duas já existiam e só não tinham
nome (a janela da conversa, na C4, e as tools sobre o dado registrado, na
C2/C3); a EPIC entrega a terceira. Virou a **D34**, precedida da análise de LGPD
em `01-estudos/memoria-do-usuario-e-lgpd.md`, que é pré-condição registrada.

A **2.10 também não estava aqui**, e foi acrescentada em 2026-09-19. Ela é de
uma espécie diferente de todas as anteriores: não nasce de design, nem de pedido
de funcionalidade, nem de estudo prévio. **Nasce de cinco perguntas feitas por
uma pessoa ao assistente**, com um laudo de verdade no histórico, em
2026-09-18 — a primeira vez que o sistema foi exercitado fora de teste.

O que ela corrige não dava para prever lendo o código, e não deu para achar com
teste: a regra R2 descartando resposta correta por classificar pelo eixo errado,
a ausência de qualquer caminho entre "tenho um documento" e "quais são os
valores dele", o laboratório que está no papel e em lugar nenhum, e o markdown
saindo cru na tela. Análise turno a turno em
`01-estudos/conversa-real-2026-09-18.md`; as medições, em
`04-implementacao/notas.md`.

**Ela é também a primeira medição real da L7 e da C10**, e só existe porque o
registro de reprovação entrou na verificação horas antes da conversa. Antes
disso a reprovação não deixava rastro, e a distribuição por regra que a C10 pede
não tinha de onde sair.

A **2.11 foi acrescentada em 2026-09-19**, no mesmo dia da 2.10 e pela mesma
razão de fundo: ela fecha o que dois exercícios contra o sistema rodando
deixaram aberto. Da conversa, as duas decisões que sobraram; do
**reprocessamento do laudo**, o achado que ninguém tinha visto — **14 das 48
linhas entraram sem faixa de referência**, porque o esquema espera dois números
e o laudo brasileiro apresenta faixa de seis formas diferentes. Não é defeito de
leitura: o modelo preferiu vazio a inventar, que é a regra. É lacuna de esquema,
e ela atinge o perfil lipídico inteiro e a vitamina D — o analito que originou o
projeto.

Ela carrega também **as cinco decisões do usuário** que as EPICs anteriores
registraram sem resolver, cada uma com estudo de opções na própria spec.

As tarefas 3.2, 4.1 e 4.2 continuam sem EPIC de propósito: elas produzem
**texto do TCC**, não software, e criar spec para elas seria confundir
documentação com funcionalidade.

---

## Fase 0 — Contratos e fundações

Bloqueia as duas frentes. Nenhuma linha de código de IA antes disto.

| # | Tarefa | P | Dono | Bloqueia |
|---|---|---|---|---|
| 0.1 | ~~Fechar o contrato do wearable com o colega~~ — **já resolvido**: a feature está mergeada em `dev` e o contrato foi lido do código | — | — | — |
| 0.2a | ~~Aceitar a licença LOINC/UCUM e conferir condições de redistribuição~~ — **encerrada em 2026-09-16**: as duas licenças lidas por inteiro, LOINC 2.83 e UCUM no repositório, estudo em `05-vocabularios/licencas.md` | — | — | — |
| 0.2b | Definir o recorte de cobertura dentro do ranqueamento do LOINC | **fechada em 2026-09-16**: 79 analitos com código oficial em `05-vocabularios/loinc/loinc-analitos-suasaude.csv` | Pedro | toda a Frente 1 |
| 0.2c | Tabela de massa molar para conversão massa ↔ molar, por analito | **proposta escrita**, aguarda revisão — `03-esquemas/conversao-unidades.md` | Pedro | 1.3 |
| 0.2d | Fechar o esquema da linha de analito (campos, confiança, revisão) | **fechado em 2026-09-16** — `03-esquemas/formato-analitos.md`, com `valueQualifier`, `collectionMoment` e `collectedAt` por linha (D21, D22, D24) | Pedro | 1.4 |
| 0.2e | Conversão de texto para número: vírgula decimal brasileira (D23) | **P0** — achado da revisão de 2026-09-16; era buraco em todo o material | Pedro | 1.2 |
| 0.3 | Escrever as regras de linguagem da IA e transformá-las em teste — **EPIC escrita em 2026-09-16**, `specs/07-ia-conversa/regras-de-linguagem/` | P1 | Pedro | a Frente 2, e o guardrail da Frente 1 |
| ~~0.4~~ | ~~Pedir a BASE_URL à Mauá~~ — **cancelada pela D14**: o servidor da instituição saiu do projeto | — | — | — |
| ~~0.5~~ | ~~Decidir retenção e exclusão de conversa~~ — **CONCLUÍDA em 2026-09-17, virou a D33**: sem prazo de expiração, exclusão imediata e real, aviso no topo da gaveta. Destrava C8 e C9 | — | Pedro | — |

**A 0.5 foi respondida em 2026-09-17 e virou a D33.** O parágrafo abaixo fica
como registro de por que ela existia e do que ela bloqueava.

**A 0.5 subiu de P2 para P1** ao ser escrita a EPIC do assistente. Ela é o
mesmo tipo de item que a 0.2a era: bloqueio externo, do usuário, que não sai
sozinho com o tempo. Três perguntas precisam de resposta antes de a primeira
conversa ser gravada — por quanto tempo fica guardada, se o usuário pode apagar
e se apagar significa sumir, e o que a tela diz sobre isso.

O que ela **não** bloqueia: a função de chat, as tools, o prompt, a verificação
de linguagem e o anexo pontual. Tudo isso funciona com a conversa em memória,
como já funciona hoje. A EPIC separa as duas coisas exatamente por isso.

**0.2 virou o item mais urgente do projeto, e se dividiu em quatro** depois da
D16. Era P0 por ser irreversível; agora é P0 e imediato, porque a fase seguinte
grava contra esse formato, e corrigir esquema depois significa migrar dado de
saúde já persistido.

A divisão reflete um achado do levantamento: **nem o LOINC nem o UCUM convertem
`ng/mL` em `nmol/L`.** Eles dão identidade e sintaxe de unidade. A conversão
massa ↔ molar depende da massa molar do analito, informação química.

**Atualização depois de 0.2b e 0.2c escritas:** a 0.2c saiu bem menor do que a
estimativa. A conversão massa ↔ mol é uma fórmula só, e a única informação por
analito é a massa molar — 22 números para a cobertura proposta, não uma linha
por par de unidades. O trabalho real migrou para os casos que fogem à fórmula
(glicada, hemoglobina, miliequivalentes, enzimas, contagens, unidades
internacionais), documentados em `conversao-unidades.md`.

**0.4 foi cancelada.** O provedor deixou de ser uma pergunta: é o Bedrock, do
mesmo jeito que a feature de wearable já usa, sem alternativa e sem adapter de
troca. Ver D14. O que era o maior item de espera externa do projeto simplesmente
desapareceu.

---

## Fase 1 — Frente 1: a IA da tela de exames

A IA atua **na entrada de documentos da tela de exames** — a porta principal,
onde o usuário anexa e classifica como Exame ou Receita. Copia o molde da
`analyze-health-import`, que já resolveu quase tudo que ela precisa.

O anexo do chat **não é esta fase**: ele é uso pontual, não persiste dado
clínico, e pertence à Frente 2. Ver D15.

| # | Tarefa | P | Depende de |
|---|---|---|---|
| 1.1 | OCR no upload (Textract), guardando o texto bruto para rastreabilidade | P1 | — |
| 1.2 | Extração estruturada via Bedrock com saída forçada por tool e validada por zod | P1 | 0.2, 1.1 |
| 1.3 | Mapeamento texto → código LOINC pelo modelo, mais conversão de unidade | P1 | 0.2b, 0.2c, 1.2 |
| 1.4 | Model `LabResult` + gravação idempotente (reenviar o mesmo PDF não duplica) | P1 | 0.2d, 1.3 |
| 1.5 | Revisão pelo usuário quando a confiança da extração for baixa | P1 | 1.4 |
| 1.6 | Série temporal por analito — **EPIC própria**, `specs/06-ia-leitura-exames/serie-por-analito/`, porque é tela nova (regra 6) | P1 | 1.4 |
| 1.7 | Tratamento diferenciado por classificação: Exame rende analitos; Receita rende medicamento, posologia e validade | P1 | 1.2 |

**Marco de encerramento da fase:** o usuário sobe o PDF do exame de março e o de
setembro, e vê a vitamina D dos dois lado a lado, com a mesma unidade, a faixa
de cada laboratório e o documento de origem de cada número.

**Revisão de 2026-09-16.** Uma revisão completa do material contra o código e
contra a tabela de disponibilidade de recursos do Bedrock encontrou seis
defeitos e dois achados de arquitetura. Os quatro defeitos mais sérios tinham o
mesmo formato — **gravam número errado sem levantar erro** — e viraram D21 a
D24. Os dois achados (saída estruturada e PDF nativo são GA no Bedrock) viraram
cenários de medição na Tarefa 1. A química das 22 massas molares foi conferida
uma a uma e fechou.

**O risco da fase não é o OCR, é a normalização (1.3).** "Vitamina D",
"25-OH-Vitamina D" e "Calcidiol" são o mesmo analito; `ng/mL` e `nmol/L` são a
mesma grandeza em escalas diferentes. Sem 1.3, a comparação compara coisas que
não se comparam — e uma comparação errada sobre dado de saúde é pior que
nenhuma comparação.

Laudo brasileiro não traz código LOINC, traz texto em português. O mapeamento de
texto para código é tarefa do modelo, com uma lista curta de candidatos na
chamada e confiança declarada na saída — o que torna 1.3 e 1.5 duas metades da
mesma coisa, e não etapas independentes.

**1.5 existe porque extração por modelo erra.** Gravar um número errado num
histórico de saúde sem que ninguém revise é o modo de falha mais grave das duas
frentes. Confiança baixa não grava calado: pergunta.

### O que a fase herda pronta

| `analyze-health-import` | extração de documento |
|---|---|
| lê arquivo do S3 | igual |
| identifica o tipo pelo conteúdo, nunca pelo nome | Textract no lugar do farejador de CSV |
| normaliza unidade e fuso | normaliza unidade e nome de analito |
| chama o Bedrock com saída forçada por tool | igual |
| valida com zod, uma fonte de verdade para schema e validação | igual |
| corta campo longo antes de validar, repara só erro estrutural | igual |
| grava com `UpdateCommand`, nunca `PutCommand` | igual |
| guardrail na entrada e na saída | igual, possivelmente o mesmo |

O genuinamente novo é o OCR, o mapeamento para LOINC e a tabela de conversão de unidade.

---

## Fase 2 — Frente 2: a IA de comunicação

Entra com dado de exame já normalizado no banco, o que muda o que ela consegue
responder.

**Toda a Fase 2 é uma EPIC só:** `specs/07-ia-conversa/assistente-conversacional/`.
A regra 6 fala de telas, e a tela é uma — a 4a, que já existe implementada com
respostas mockadas. Esta fase troca o que está atrás dela.

| # | Tarefa | P | Depende de |
|---|---|---|---|
| 2.1 | Models `ChatConversation` + `ChatMessage` no DynamoDB, escopo por dono | P1 | ~~0.5~~ — **destravada pela D33** |
| 2.2 | Função `chat-assistant` com endereço direto, fora do AppSync (D12) | P1 | — |
| 2.3 | Prompt de sistema com as regras de linguagem + testes que provam as regras | P1 | 0.3 |
| 2.4 | Tools de leitura: perfil, exames, consultas, remédios, vacinas | P1 | 2.2 |
| 2.5 | Tool de analitos devolvendo série temporal por analito | P1 | 1.4, 2.4 |
| 2.6 | Tool de wearable lendo `HealthImport`; nenhuma importação é ausência de dado | P1 | 2.2 |
| 2.7 | Trocar o mock em `aiAssistantService.ts`; histórico com fonte real | P1 | 2.1, 2.4 |
| 2.8 | Anexo pontual no chat: o documento entra naquela conversa e não vira dado clínico (D15) | P1 | 2.2 |

**Marco de encerramento da fase:** o usuário pergunta "como está minha vitamina
D comparada ao exame anterior, e meu sono piorou no mesmo período?", e recebe
resposta construída sobre número rastreável dos dois lados, com encaminhamento a
um profissional de saúde.

**Sobre 2.8, e por que ela é bem menor do que parece:** o anexo do chat não
extrai, não normaliza e não grava. Ele passa o documento pelo OCR já construído
em 1.1 e entrega o texto ao modelo naquela conversa. É a diferença entre "quero
que este exame passe a fazer parte do meu histórico", que é a tela de exames, e
"me explica este papel aqui", que é o chat.

O caminho de gravar de verdade continua existindo e é o botão de anexo que já
está em `ChatBotScreen.tsx`, que hoje leva para `/add-exam`. Ele não some: quem
quer registrar o documento é mandado para a porta que registra.

---

## Fase 3 — Cruzamento e avaliação

| # | Tarefa | P | Depende de |
|---|---|---|---|
| 3.1 | Cruzamento entre exame, wearable e perfil numa mesma resposta — **absorvida** pela EPIC do assistente (tarefas C3 e C10): com as duas tools existindo, o cruzamento não é código novo, é uma pergunta que passa a ter resposta | P2 | 2.5, 2.6 |
| 3.2 | Avaliação de qualidade das respostas e medição de custo por conversa | P2 | 2.7 |

**Duas comparações mensais diferentes, e elas não são intercambiáveis.**

| | Wearable | Exame |
|---|---|---|
| o que compara | passos, sono, batimento, estresse | vitamina C, cálcio, hemoglobina |
| densidade | medida quase todo dia | esparsa, às vezes duas no ano |
| existe hoje? | sim, `monthly` no `AnalysisSummary` | não — é o que a Fase 1 constrói |
| carrega faixa de referência? | não | sim, e ela varia entre laboratórios |

A da esquerda vem de graça com a tool de wearable e é bem-vinda, mas não
substitui a outra e não deve ser apresentada como se fosse.

---

## Fase 4 — Encerramento acadêmico

| # | Tarefa | P | Depende de |
|---|---|---|---|
| 4.1 | Documentação de limitações e do que a IA deliberadamente não faz | P1 | — |
| 4.2 | Registro escrito da avaliação de provedores e do porquê de cada recusa | P1 | — |

4.2 existe porque a avaliação foi feita de verdade — servidor da instituição,
AgentCore, agentes clássicos do Bedrock, adapter de dois provedores, LangChain e
LangGraph — e cada recusa tem motivo técnico registrado em
`01-estudos/provedor-llm.md` e no log de decisões. Isso é material do TCC tanto
quanto a escolha.

---

## Justificativa da ordem de prioridade

**Contratos antes de código.** O formato de analitos é um acordo com quem vai
querer comparar daqui a três meses. Acordo furado descoberto tarde custa muito
mais que acordo escrito cedo.

**A Frente 1 vem primeiro — e essa ordem é o inverso da primeira versão deste
documento.** A ordem original punha o chat primeiro, com três razões. A mais
forte era: a incógnita compartilhada pelas duas frentes é o provedor de LLM, e
provar essa canalização no consumidor mais simples sairia mais barato que
descobrir o problema no meio de uma pipeline de extração.

Essa razão caiu. A feature de wearable já invoca o Bedrock em produção neste
repositório, com modelo escolhido por motivo escrito, saída forçada por tool,
validação por schema, guardrail por infraestrutura como código e 222 testes. A
canalização não precisa mais ser provada — precisa ser copiada.

Sem ela, sobraram duas razões fracas (a tela de chat já existe mockada; o chat
tem algum valor sem exame extraído) contra uma forte: **a comparação mês a mês
de analito, que é o que o usuário mais quer, depende inteiramente da Frente 1.**
Um chat sem ela responde "quando foi minha consulta", não a pergunta que
motivou o projeto.

**A Frente 1 também ficou mais barata do que a estimativa original**, porque o
molde existe e foi testado. O que sobra de genuinamente novo é o OCR e a
normalização de analito.

**A Frente 2 ganha com a espera.** Ela entra com `LabResult` já no banco, e a
tool de analitos passa a existir desde o primeiro dia do chat real, em vez de
ser acrescentada depois.

---

## Recomendação que acompanha toda entrega deste roadmap

Nenhuma das duas frentes produz conclusão médica. As duas produzem organização
de informação e observações informativas, sempre com encaminhamento a um
profissional de saúde para avaliar o quadro. Isso é requisito de interface pela
regra 4 da constituição do projeto, não uma cortesia de texto.
