# Fluxos de dados

## Fluxo 1 — pergunta no chat (Frente 2)

```
usuário digita
   └─▶ ChatBotScreen ─▶ useChatBot ─▶ aiAssistantService
          └─▶ função chat-assistant
                 1. carrega a conversa do DynamoDB
                 2. monta o prompt de sistema com as regras de linguagem
                 3. chama o modelo com as tools disponíveis
                 4. o modelo pede tools; a função executa e devolve
                 5. repete até o modelo responder em texto
                 6. verifica a resposta contra as regras de linguagem
                 7. grava pergunta e resposta na conversa
          └─▶ texto de volta à tela
```

Ponto que merece atenção: o passo 4 é um laço. Ele precisa de um teto de
iterações, senão uma sequência de chamadas de tool que não converge consome
tempo e tokens até o tempo limite da função.

Outro ponto: o passo 6 pode reprovar a resposta. O que o usuário vê nesse caso
ainda não foi decidido — está registrado como pendência em
`01-estudos/regras-de-linguagem.md`.

## Fluxo 2 — upload de documento (Frente 1)

```
upload pelo chat  ──┐
                    ├─▶ uma pipeline ─▶ S3 ─▶ OCR ─▶ extração ─▶ normalização
upload pelas       ─┘                                                │
páginas atuais                                                       ▼
                                                      linhas gravadas no DynamoDB
                                                      (com confiança e origem)
                                                                     │
                                      confiança baixa ───────────────┘
                                              └─▶ usuário revisa antes de valer
```

A convergência dos dois pontos de entrada numa pipeline só é requisito, não
detalhe: duas pipelines produziriam dois estilos de dado, que é exatamente o
que a comparação mês a mês não tolera.

## Fluxo 3 — comparação mês a mês (Fase 3)

```
"como está minha vitamina D comparada ao mês passado?"
   └─▶ tool de analitos: busca por analyteCode, ordena por collectedAt
          └─▶ devolve a série com valor, unidade canônica, faixa e origem
                 └─▶ o modelo descreve a variação observada
                        └─▶ encaminha a leitura do quadro a um profissional
```

Três coisas que este fluxo exige, e que justificam a ordem do roadmap: código
de analito normalizado, unidade canônica, e origem rastreável por linha.
Nenhuma das três existe sem a Fase 0 fechada.

## Fluxo 4 — wearable (já existe, entregue pelo Arturo)

```
usuário exporta do app de saúde
   └─▶ upload para S3 health-imports/{entity_id}/{importId}/
          └─▶ mutation startHealthAnalysis (PENDING → PROCESSING)
                 └─▶ invocação assíncrona de analyze-health-import
                        1. descompacta com lista de permissão
                        2. identifica cada arquivo pela primeira linha,
                           nunca pelo nome
                        3. normaliza unidade e fuso, deduplica por aparelho
                        4. agrega por dia, valida sanidade
                        5. monta estatística e correlações defasadas
                        6. chama o Bedrock com saída forçada por tool
                           e guardrail na entrada e na saída
                        7. valida com zod e grava no DynamoDB
          └─▶ o aplicativo consulta por repetição, com espera crescente

nossa IA ─▶ lê HealthImport (DynamoDB), não o S3
               └─▶ nenhuma importação é ausência de dado, não erro
```

O passo 6 é o precedente direto do que a Frente 2 vai fazer, e o passo 7 é o
precedente direto do que a Frente 1 vai fazer. Nenhum dos dois precisa ser
inventado aqui.

Vale registrar duas decisões do Arturo que herdamos como restrição:

- **A consulta é por repetição, nunca por assinatura de evento.** A função
  escreve direto no DynamoDB e passa por fora do AppSync, então a assinatura
  não dispara. Se a nossa frente fizer qualquer trabalho longo fora do ciclo da
  requisição, cai na mesma restrição.
- **A invocação assíncrona tem repetição zerada.** O motivo está escrito no
  `backend.ts`: é a segunda camada de defesa contra pagar o modelo duas ou três
  vezes pela mesma importação. Mesmo cuidado se a nossa função vier a ser
  invocada assim.
