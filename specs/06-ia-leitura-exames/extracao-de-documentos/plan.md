# PLAN: IA de leitura de documentos — extração estruturada (Bloco 6)

Plano técnico completo (estrutura de arquivos, 14 tarefas com teste antes da implementação, código): `docs/superpowers/plans/2026-09-16-extracao-documentos-bedrock.md`. Este arquivo registra as decisões desta EPIC especificamente exigidas pela constituição (regras 3, 5, 8).

## 1. Diagnóstico — estado atual vs. proposto

Hoje o app guarda o arquivo e os metadados, e **ninguém lê o conteúdo**. `MedicalDocument` tem tipo, nome, data, validade e a chave no S3; o PDF fica no bucket sem que nada o abra. `createExamDocument` (`src/services/examService.ts:312-346`) faz quatro etapas — validar, subir ao S3, gravar metadados, invalidar cache — e termina.

Esta EPIC acrescenta uma quinta etapa, disparada de forma assíncrona e **isolada do caminho crítico**: se ela falhar, as quatro anteriores continuam valendo e o documento permanece acessível como hoje.

O desenho não é novo no repositório. A `analyze-health-import`, mergeada em `dev` em 2026-09-15, já faz exatamente esta forma de trabalho — ler arquivo do S3, chamar o Bedrock com saída forçada por tool, validar com zod, gravar direto no DynamoDB. Esta EPIC copia esse molde. O genuinamente novo é o OCR, o mapeamento para código de analito e a conversão de unidade.

## 2. Novas dependências (regra 3 da constituição)

| Pacote | Escopo | Por quê | Alternativa considerada |
|---|---|---|---|
| `@aws-sdk/client-textract` | devDep (backend) | OCR de PDF e imagem. Único caminho gerenciado na conta que já existe | Biblioteca de OCR em processo (Tesseract): exigiria empacotar binário na Lambda, e a qualidade em laudo de laboratório é sensivelmente pior |
| `@aws-sdk/client-bedrock-runtime` | devDep (backend) | Já é dependência da feature de wearable — reaproveitada, não acrescentada | — |
| `@aws-sdk/client-s3`, `@aws-sdk/client-lambda`, `aws-cdk-lib` | devDep (backend) | Idem: já explícitas no repositório | — |

Nenhuma dependência nova no app. Os quatro estados da seção de resultados usam componentes e tokens que já existem.

**Recusado — cliente Anthropic para Bedrock.** Existe um cliente dedicado do fornecedor para o Bedrock, e ele seria o caminho recomendado num projeto novo. Recusado aqui por duas razões: o repositório já tem `ConverseCommand` funcionando e testado, e o `guardrailConfig` — central ao desenho de segurança desta EPIC — é recurso do Bedrock exposto por essa via. Trocar de cliente custaria a canalização já provada em troca de nada que esta EPIC precise.

## 3. Decisões de schema e arquitetura (regra 5 — nunca efeito colateral)

- **Todo campo novo em `MedicalDocument` é opcional.** Documento gravado antes desta EPIC continua válido e aparece como nunca extraído. Sem migração destrutiva.
- **`LabResult` e `PrescriptionItem` são models separados, com uma linha por analito e por medicamento.** Nunca uma linha por documento com vários valores dentro — isso impediria consulta por analito, que é o caso de uso inteiro.
- **A função cria a linha de `LabResult`, diferente de `HealthImport`,** em que o cliente cria e a função atualiza. Consequência: a função precisa preencher `owner`, `__typename` e `createdAt` ela mesma, ou o cliente do Amplify não consegue ler a linha.
- **Gravação com `UpdateCommand` e id determinístico** (documento + soma do arquivo + código do analito). É o que torna o reprocessamento idempotente sem consulta prévia, e o que evita a armadilha do `PutCommand` que a feature de wearable documentou.
- **`PrescriptionItem` não alimenta `Medicine`.** Criar lembrete de medicamento a partir da leitura automática de um papel é ação de risco alto que esta EPIC não toma. A ligação, se for desejada, é decisão separada com confirmação explícita.
- **Mutation, não query** (`startDocumentExtraction`), pelo mesmo critério que `startHealthAnalysis` registra: muda estado e dispara efeito colateral.
- **A função fica em `resourceGroupName: 'data'`.** No grupo padrão, o grant de tabela numa direção e o nome da função na outra causam dependência cíclica entre as stacks — problema já verificado na feature de wearable.
- **Repetição da invocação assíncrona zerada.** Segunda camada de defesa contra pagar o modelo duas ou três vezes pelo mesmo documento. A função nunca lança: `try`/`catch` cobre o corpo inteiro e marca falha no `catch`.
- **A grafia da unidade é traduzida antes de ser comparada** (D28). O laudo brasileiro nunca escreve UCUM, e o sinal de micro aparece em três pontos de código diferentes conforme a fonte do PDF. Sem essa camada, a unidade certa é recusada como desconhecida e um hemograma inteiro cai em revisão.
- **`value` é opcional; linha sem leitura segura entra sem valor, nunca com zero** (D29). E a conversão de unidade acontece num lugar só — o aplicativo não converte.
- **O catálogo de analitos é gerado por script, não digitado** (D27). O arquivo emitido é versionado junto com o gerador: fazer a publicação depender de rodar um script trocaria um problema conhecido por um pior.
- **Todo número vindo do documento passa por uma função de conversão do projeto** (D23). `parseFloat` e `Number` sobre texto do documento estão proibidos e a proibição é teste. O laudo brasileiro escreve `32,5`, e `parseFloat('32,5')` devolve `32` sem levantar erro.
- **`valueQualifier` na linha** (D21): `<` ou `>` quando o laudo reporta limite de detecção. Linha com qualificador existe, é rastreável, e **não participa da comparação entre coletas**.
- **`collectionMoment` entra no id determinístico** (D22). Sem ele, curva glicêmica e cortisol de manhã e tarde colidem, e `UpdateCommand` sobrescreve sem levantar erro.
- **`collectedAt` é da linha, com reserva na data do formulário** (D24), porque um PDF consolidado pode reunir coletas de dias diferentes.
- **Sem segunda chamada de guardrail sobre a saída — condicionado à medição da Tarefa 1.** A `analyze-health-import` precisa dela porque sua saída é prosa que vai para a tela, e o `guardrailConfig` do Converse avalia blocos de texto, não o bloco de tool. A nossa saída é número, unidade e código — não há prosa para filtrar. O guardrail de **entrada** continua, e é o que importa: um PDF pode conter instruções plantadas, e esse é o vetor de ataque real desta pipeline.

  **A condição.** Este raciocínio vale enquanto a saída vier num bloco de tool. Se a Tarefa 1 medir que a saída estruturada (`output_config.format`) funciona no Bedrock pelo `ConverseCommand`, a saída passa a voltar como **bloco de texto** — e o `guardrailConfig` passa a avaliá-la. Deixa de ser ausência justificada e vira recurso de graça. A Tarefa 1 registra qual dos dois mundos é o nosso.
- **A segurança é estrutural antes de ser textual.** O schema de saída não tem campo de interpretação, gravidade ou "alterado", e `additionalProperties: false` impede o modelo de acrescentar um. O modelo não pode dizer o que não recebeu onde dizer.

## 4. Ambiguidades documentadas (regra 8)

- **Sem Canvas de origem.** O design desenha as telas de exames, mas não desenha extração, resultado nem revisão de valor — o conceito não existia quando o Canvas foi feito. As seções novas seguem os tokens estabelecidos, sem comparação contra tela desenhada.
- **O modelo não está escolhido, está medido.** O comentário em `amplify/backend.ts:103-107` afirma que tool forçada é incompatível com raciocínio estendido nos modelos da Anthropic, e foi por isso que a feature de wearable trocou de modelo. A documentação atual do fornecedor diz que tool forçada só é recusada em dois modelos, nenhum deles em jogo aqui. **A Tarefa 1 do plano técnico mede os dois casos antes de qualquer parser ser escrito.** Se o resultado divergir do comentário existente, a divergência é registrada e levada ao Arturo — não corrigida por cima do que ele mediu.
- **Desligar o raciocínio para forçar um modelo a caber está proibido nesta EPIC.** A documentação do fornecedor descreve dois modos de falha com raciocínio desligado: a chamada de tool escrita no texto visível em vez de emitida como bloco (a chamada nunca roda, nenhum erro é levantado) e vazamento de marcação interna. Numa pipeline de saída forçada, os dois são silenciosos.
- **Saída estruturada e PDF nativo são GA no Bedrock, e não se sabe se chegam pelo `ConverseCommand`.** A tabela de disponibilidade por plataforma marca os dois como disponíveis no Bedrock, e sinaliza explicitamente a restrição "só pelo `InvokeModel`" para outro recurso — e não para estes. Sugere que chegam; não prova. A Tarefa 1 mede os dois, porque cada um encurta uma parte diferente do plano: a saída estruturada dispensa a tool forçada, e o PDF nativo tira o Textract do caminho crítico do laudo digital.
- **LangChain e LangGraph foram avaliados e recusados nas duas frentes** (D20). Na extração, a pipeline é uma reta e um grafo de estados é custo puro. No chat, a recusa é mais discutível: o laço de tools e a persistência por identificador de linha seriam caso real, mas a camada de segurança se apoia em `guardrailConfig` e `toolChoice` nativos do Bedrock, não existe checkpointer oficial para DynamoDB, e a tela precisa de linhas de conversa que o cliente do Amplify leia.
- **O limiar de confiança nasce provisório.** `0.85` na Tarefa 5, com comentário dizendo que é provisório, substituído na Tarefa 14 pelo valor medido contra laudos reais. Enquanto não houver medição, o lado conservador: mandar para revisão na dúvida.
- **A cobertura de analitos é um recorte, não o vocabulário inteiro.** Painéis de rotina brasileiros, pouco mais de 70 analitos (`estudos-ia/03-esquemas/cobertura-analitos.md`). Exame sem valor numérico — cultura, sorologia, laudo em prosa — não entra na tabela de analitos; fica no texto extraído, e isso não é tratado como falha.
- **Bloqueio externo.** A Tarefa 3 depende de aceitar a licença do LOINC e do UCUM e conferir as condições de redistribuição (tarefa 0.2a do roadmap), que é do usuário. As tarefas 2, 4, 6, 7 e 8 não dependem dela e podem correr antes.

## 5. Limites e custo

Os limites de upload já existentes continuam valendo e não mudam: 10 MB por arquivo, extensões `pdf`, `jpg`, `jpeg`, `png` (`src/services/examService.ts`).

Dois limites novos, do lado da extração:

- **`maxTokens` sempre explícito** na chamada ao Bedrock. Deixar em branco reserva a cota máxima do modelo e é a causa principal de estrangulamento sem motivo aparente — armadilha já documentada na feature de wearable.
- **Teto de tempo da função em 10 minutos.** OCR mais chamada ao modelo mais uma tentativa de reparo. O app para de consultar em 6 minutos e mostra estado de travado, mesma regra da importação de wearable.

Custo por documento fica na casa de centavos, e é medido na Tarefa 14 junto com a calibração do limiar.
