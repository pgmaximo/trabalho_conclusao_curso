# O que será construído — o projeto das duas frentes de IA

**Escrito em 2026-09-16, depois de as cinco EPICs ficarem prontas.** Este
documento é a leitura de cima: o que o aplicativo passa a fazer, em que ordem
isso é construído, e o que ele deliberadamente não faz. Ele não substitui as
specs — aponta para elas.

Quem chega agora deve ler este arquivo primeiro, e depois só a spec da EPIC que
vai construir.

---

## 1. O objetivo, em uma frase

**Fazer o aplicativo entender o conteúdo dos exames que o usuário guarda, para
que ele possa acompanhar a evolução dos próprios resultados e conversar sobre
eles — sem que nada disso vire um diagnóstico.**

Hoje o aplicativo guarda o arquivo. `MedicalDocument` tem tipo, nome, data,
validade e a chave no S3, e o PDF fica no bucket sem que nada o abra. O usuário
que quiser comparar a vitamina D de março com a de setembro abre dois PDFs.

## 2. O que muda para a pessoa

Quatro coisas, nesta ordem de aparecimento:

**Ela anexa um exame e o aplicativo lê.** Nada muda no formulário. Ela salva e
volta para a lista, como hoje. Minutos depois, a tela de detalhe do documento
mostra os analitos: nome, valor, unidade, a faixa daquele laboratório e a
página de origem.

**Ela confere o que o aplicativo não teve certeza de ler.** Linha com leitura
duvidosa aparece marcada, com o que estava escrito no papel ao lado, e dois
botões: confirmar ou corrigir. Enquanto ela não decide, aquela linha **não
entra em comparação nenhuma**.

**Ela vê a evolução.** Tocando numa linha, chega a uma tela que põe as coletas
daquele analito lado a lado — mesma unidade, cada ponto com a faixa do seu
laboratório e o documento de onde veio.

**Ela pergunta.** O chat, que hoje devolve quatro frases fixas, passa a
responder sobre os dados dela, citando a origem de cada número.

## 3. O que será construído, EPIC por EPIC

Cinco unidades de entrega. As quatro primeiras são novas; a quinta já estava
construída e só ganhou documentação.

### 3.1 Extração de documentos — `specs/06-ia-leitura-exames/extracao-de-documentos/`

**A maior e a de maior risco.** É ela que grava dado clínico derivado por
modelo.

| | |
|---|---|
| Plano técnico | `docs/superpowers/plans/2026-09-16-extracao-documentos-bedrock.md` |
| Tarefas | 16 (1, 2, 2b, 3 a 13, 12b, 14) |
| Backend novo | `extract-document-data/` e `start-document-extraction/` |
| Dado novo | models `LabResult` e `PrescriptionItem`; dez campos opcionais em `MedicalDocument` |
| Telas | `/add-exam` sem mudança visível; `/document-detail` ganha seção com cinco estados |

**A canalização, do arquivo à linha no banco:**

1. O usuário salva o documento. As quatro etapas de hoje continuam iguais.
2. Uma quinta etapa dispara, **isolada**: se ela falhar, o documento continua
   salvo e acessível exatamente como antes.
3. **OCR pelo Textract.** As chamadas síncronas processam **uma página só** de
   PDF — laudo de laboratório tem três, quatro, dez. O caminho assíncrono não é
   refinamento, é o caminho normal.
4. **Bedrock com saída forçada por tool**, validada por zod, com o texto do
   documento dentro do bloco protegido contra instrução plantada. O modelo
   **transcreve**; ele não converte e não interpreta.
5. **Normalização**: o texto vira número por função própria, a unidade do papel
   é traduzida para o token do conversor, e valor e faixa convertem **numa só
   passagem**.
6. **Gravação idempotente**: id determinístico por documento, arquivo, analito e
   momento da coleta, com `UpdateCommand`. Reenviar o mesmo PDF reescreve, não
   duplica.

**O vocabulário já está no repositório.** 79 analitos com código LOINC oficial,
extraídos por script do release 2.83, com nome em português e sinônimos do
próprio LOINC. Nenhum código é digitado à mão, **nem em exemplo de teste**.

### 3.2 Série por analito — `specs/06-ia-leitura-exames/serie-por-analito/`

| | |
|---|---|
| Plano técnico | `docs/superpowers/plans/2026-09-16-serie-por-analito.md` |
| Tarefas | 8 (S1 a S8) |
| Dado | **nenhum.** Só lê o que a EPIC anterior gravou |
| Dependências novas | **nenhuma.** O gráfico já existe no repositório |

**É o marco de encerramento da Fase 1** do roadmap, e é inteiramente de
leitura. O trabalho não está em desenhar o gráfico — está em **decidir o que
pode ser comparado**, e isso é um módulo puro testado sem React.

Três regras que a EPIC existe para cumprir:

- **Nada sai da série em silêncio.** Toda linha que existe e não vira ponto
  entra numa lista de excluídas, com o motivo, e a tela diz quantas são.
- **A linha de referência é tudo ou nada.** Desenhada só quando todos os pontos
  trazem a mesma faixa. Desenhar a faixa de um laboratório por cima dos pontos
  de outro é a forma mais convincente de mentir num gráfico.
- **A série é por analito E por momento da coleta.** Glicose em jejum e glicose
  de 120 minutos são a mesma substância medida em condições que não se comparam.

### 3.3 Regras de linguagem — `specs/07-ia-conversa/regras-de-linguagem/`

| | |
|---|---|
| Plano técnico | `docs/superpowers/plans/2026-09-16-regras-de-linguagem.md` |
| Tarefas | 7 (L1 a L7) |
| Entrega | um módulo puro, sem nenhuma importação |
| Dependências novas | nenhuma |

**A menor das quatro, e a que trava as outras.** Ela transforma as cinco regras
de linguagem — hoje escritas em prosa — numa verificação executável.

Das cinco camadas de proteção que o estudo descreve, **três já existem** e
vieram da feature de wearable do Arturo: vocabulário restrito no schema,
encaminhamento como campo obrigatório, e o guardrail do Bedrock criado por
infraestrutura como código. Esta EPIC entrega as duas que faltam: a
**verificação determinística** e o **conjunto adversarial**.

Duas propriedades que são contrato: ela **reprova e nunca reescreve**, e **na
dúvida, reprova**.

### 3.4 Assistente conversacional — `specs/07-ia-conversa/assistente-conversacional/`

| | |
|---|---|
| Plano técnico | `docs/superpowers/plans/2026-09-16-assistente-conversacional.md` |
| Tarefas | 11 (C1 a C10, mais C5b) |
| Backend novo | `chat-assistant/`, com **endereço direto**, fora do AppSync |
| Dado novo | models `ChatConversation` e `ChatMessage` |
| Telas | a 4a já existe; esta EPIC troca o que está atrás dela |

**Primeiro endereço direto de função do repositório**, porque o resolver do
AppSync corta em 30 segundos e um laço de tools passa disso. Consequência: a
verificação de identidade, a origem cruzada e o limite de chamadas passam a ser
nossos.

**Sete ferramentas de leitura** — perfil, exames, analitos, consultas,
medicamentos, vacinas, wearable. **Nenhuma escreve**, e isso é afirmado por
teste sobre a lista, não por revisão de código.

**Quando a verificação de linguagem reprova**, o caminho é: gerar de novo uma
vez → mostrar o dado sem prosa → indisponibilidade honesta. Nunca remendar,
nunca exibir com aviso.

### 3.5 Campanhas de vacinação — já construída

`specs/04-ia-perfil-vacinacao/campanhas-vacinacao/` tinha spec e não tinha
`plan.md` nem `tasks.md`, o que contrariava a regra 6 da constituição. Os dois
foram escritos de forma **retroativa**, conferidos contra o código que já está
mergeado. Nada a implementar.

## 4. O fluxo do dado, de ponta a ponta

```
  PDF/foto ──► S3 ──► Textract ──► texto com página
                                        │
                                        ▼
                              Bedrock (tool forçada)
                                        │
                     ┌──────────────────┴──────────────────┐
                     ▼                                     ▼
              linhas de analito                    itens de receita
                     │                                     │
              parseDecimal                                 │
              tradução de unidade                          │
              conversão (valor + faixa juntos)             │
                     │                                     │
                     ▼                                     ▼
               LabResult ◄── correção humana        PrescriptionItem
                     │                              (nunca vira Medicine)
        ┌────────────┴────────────┐
        ▼                         ▼
  série por analito        tool do chat ──► Bedrock ──► verificação ──► tela
```

**Quem escreve o quê:** a extração escreve `LabResult`, `PrescriptionItem` e os
campos de estado em `MedicalDocument`. A série **não escreve nada**. O chat
escreve **apenas a própria conversa**.

## 5. A arquitetura de segurança

Ela não é uma camada — são várias, e cada uma falha de um jeito diferente.

**Estrutural, antes de textual.** O schema de saída da extração não tem campo
de interpretação, de gravidade ou de "alterado", e `additionalProperties: false`
impede o modelo de acrescentar um. **O modelo não pode dizer o que não recebeu
onde dizer.**

**Cinco camadas na conversa:** vocabulário restrito, encaminhamento como campo
obrigatório, guardrail do Bedrock, verificação determinística e conjunto
adversarial.

**Na dúvida, não grava número.** Linha que não pôde ser lida com segurança entra
**sem valor** — nunca com zero, que é um número plausível para vários analitos.

**O dono vem do token.** No chat, nenhum identificador vindo do corpo da
requisição é aceito. Um endereço direto que confia no corpo é uma porta para ler
dado de saúde de outra pessoa.

**Rastreabilidade por linha.** `rawValue` e `rawUnit` guardam o que estava no
papel, sem tratamento. Quando alguém perguntar de onde saiu um número, a
resposta é o documento e a página — não o resultado da conta.

## 6. O que o projeto deliberadamente NÃO faz

Esta lista vale tanto quanto a anterior, e é material do TCC.

- **Não diagnostica, não classifica valor e não calcula risco.** Nem em texto,
  nem em cor de gráfico.
- **Não cria lembrete de medicamento a partir de uma receita lida.** Um
  `PrescriptionItem` nunca vira um `Medicine`.
- **Não sobrescreve a validade da receita** informada pela pessoa.
- **Não converte hemoglobina para unidade molar** — as convenções de monômero e
  tetrâmero diferem por um fator de quatro.
- **Não compara linha pendente de revisão**, nem valor censurado (`<0,01`), que
  é limite e não medida.
- **Não interpola** um buraco na série.
- **Não guarda dado clínico do anexo do chat.** "Me explica este papel" e "quero
  que este exame entre no meu histórico" são portas diferentes.
- **Não integra com a carteira oficial de vacinação** — exige credenciamento
  institucional no DATASUS.
- **Não transmite a resposta por eventos** nesta versão.

## 7. Ordem de construção, e o que trava o quê

```
  regras-de-linguagem (L1–L6)      ←── comece aqui: puro, sem dependência
            │
            ├──────────────► guardrail da extração
            │
  extração T1 (medir o Bedrock) ──► D19: qual modelo
            │
  extração T2, T2b, T3, T4, T6 ────► lógica pura, sem AWS
            │
  extração T7 (schema) ──► T8, T9, T10 ──► T11, T12, T12b, T13
            │                                      │
            │                                      ▼
            │                              série por analito (S1–S8)
            │
            └──► extração T14 (conferir contra laudo real)
                                                   │
                            assistente C1–C7, C10 ─┘
                                   │
                            C8, C9 ◄── travadas pela tarefa 0.5
```

**O que está travado agora, e por quem:**

| Item | Trava | Dono |
|---|---|---|
| Tarefa **0.5** — retenção e exclusão de conversa | C8 e C9, e só elas | você + orientador |
| **D19** — qual modelo | nada; é a T1 que o mede | medição |
| **0.2c** — as 22 massas molares | nada; proposta escrita, aguarda sua revisão | você |
| **5 pendências** de analitos | a T14, não a T3 | você |
| Aviso da cláusula 10.1 do LOINC | a publicação do app | você, mais tarde |

## 8. Os números que este trabalho vai produzir

Um TCC precisa de medida, não de impressão. As tarefas de medição existem para
produzir estes números:

| Número | Onde é medido | Por que ele importa |
|---|---|---|
| Linhas que **passaram como corretas estando erradas** | extração T14 | é o único modo de falha que corrompe o histórico em silêncio |
| Custo por documento e por turno de conversa | T14 e C10 | viabilidade real da canalização |
| Quantos cenários de saída o Bedrock aceita, por modelo | T1 | vira a D19, com números |
| Frequência da reprovação pela verificação de linguagem | C10 | mede se uma camada determinística sobre um modelo é necessária — e quanto custa |
| Quantas reprovações são **falso positivo** | C10 | o custo escondido da assimetria escolhida |

O quarto e o quinto respondem uma pergunta que o trabalho deveria responder:
**com que frequência uma camada determinística precisa barrar um modelo, e o
que acontece depois.**

## 9. Onde está cada coisa

| Quero… | Vá para |
|---|---|
| a ordem das fases e as prioridades | `00-visao/roadmap.md` |
| por que uma decisão foi tomada | `00-visao/decisoes.md` (D1 a D31) |
| o que a IA pode e não pode dizer | `01-estudos/regras-de-linguagem.md` |
| por que o provedor é o Bedrock | `01-estudos/provedor-llm.md` |
| o que fazer quando a verificação reprova | `01-estudos/resposta-reprovada.md` |
| quais analitos, com que código | `05-vocabularios/loinc/` |
| o que cada licença permite | `05-vocabularios/licencas.md` |
| o passo a passo com código | `docs/superpowers/plans/2026-09-16-*.md` |
