# Notas de implementação

Achados, armadilhas e medições encontradas durante a construção. Preenchido à
medida que o trabalho acontece — não é planejamento, é o que se descobriu.

## Do levantamento do repositório (2026-09-15)

- A tela de chat já existe e está inteiramente mockada. A fronteira com o
  provedor está isolada de propósito em `src/services/aiAssistantService.ts`,
  com um comentário registrando que a troca por IA real exigiria confirmação
  explícita por causa da decisão de privacidade. A troca é por substituição
  desse serviço; tela e hook não mudam de contrato.
- `useChatBot.ts` devolve `historyGroups` sempre vazio, de propósito, com o
  comentário explicando que nenhuma conversa é persistida ainda. O painel de
  histórico existe na interface e está pronto para receber fonte real.
- `MedicalDocument` guarda apenas metadados: tipo, nome, data, validade e a
  chave no S3. O conteúdo do arquivo não é lido por nada hoje.
- ~~`healthAppConnectService.ts` devolve `'unavailable'`~~ — **superado no mesmo
  dia**: a feature de wearable do Arturo foi mergeada em `dev` e substituiu esse
  trecho morto. Ver abaixo.

## Da leitura da feature de wearable (commits `3e1a42c` … `7f18aae`)

O que herdamos como precedente, e que economiza boa parte do nosso trabalho:

- **Bedrock com saída forçada por tool.** `anthropic.claude-sonnet-4-6` pelo
  identificador de perfil de inferência `us.anthropic.claude-sonnet-4-6`. O
  comentário no `backend.ts` registra que o identificador base não é aceito para
  invocação sob demanda, e que isso foi descoberto invocando a função de
  produção. Anotar antes de repetir o erro.
- **Escolha de modelo com motivo escrito.** Sonnet em vez de Opus porque a tool
  forçada é incompatível com raciocínio estendido nos modelos da Anthropic, e o
  Opus liga isso por padrão. Repetir a escolha dele em vez de redescobrir o
  erro 400.
- **Uma fonte de verdade para o schema.** O mesmo objeto zod valida a resposta e
  gera o schema da tool. Copiar.
- **Reparo antes de rejeitar.** A saída passa por um corte de campos longos
  antes da validação, e só erro estrutural aciona a tentativa de reparo. O
  comentário distingue com cuidado o que é encurtar texto já escrito do que
  seria inventar conteúdo.
- **Limites de campo calibrados com dado real**, com o histórico das correções
  escrito no próprio arquivo — inclusive o caso do export de 7,7 anos que
  estourou o limite duas vezes seguidas.
- **A função escreve com `UpdateCommand`, nunca `PutCommand`**, para não apagar
  os campos que o resolver do AppSync preencheu. Mesma armadilha nos espera.
- **O resolver do AppSync tem teto de 30 segundos**, por isso a análise é
  disparada de forma assíncrona e o aplicativo consulta por repetição. Um laço
  de tools passa desse teto com facilidade. Foi o que motivou a D12. **Item a
  verificar cedo.**
- **As funções existentes já estabelecem o padrão** de acesso a dado, inclusive
  o detalhe de que a permissão de execução não carrega a identidade do usuário
  — por isso algumas leem o DynamoDB diretamente, com o nome da tabela vindo por
  variável de ambiente.
- 18 arquivos de lógica pura com teste, 222 testes no total. O padrão de
  qualidade da casa para uma feature de IA neste repositório está posto.
- O projeto exige Node 20 para publicar o ambiente do Amplify; versões mais
  novas quebram a publicação.
- Antes de considerar qualquer coisa pronta: `npm run validate`.

### Pendência registrada por ele que pode nos afetar

O commit menciona a conta AWS aguardando um formulário de uso de modelos da
Anthropic. O comentário mais recente no `backend.ts`, de 2026-09-15, diz que a
invocação foi confirmada na função de produção — provavelmente resolvido, mas
confirmar antes de assumir.

## A medir quando houver o que medir

- [ ] Latência de uma resposta de chat com laço de tools
- [ ] Tokens por conversa
- [ ] Custo por conversa e por documento extraído
- [ ] Taxa de acerto da extração contra documentos conferidos à mão

---

## Revisão completa de 2026-09-16

Revisão de todo o material de IA contra o código do repositório, contra a tabela
de disponibilidade de recursos por plataforma e contra referência de química.

**Conferido e correto:** as 22 massas molares, uma a uma, e os sete fatores da
tabela de conversão por análise dimensional. Glicose 180,16 → 0,0555;
creatinina 113,12 → 88,4; vitamina D 400,64 → 2,496; B12 1355,37 → 0,738;
folato 441,40 → 2,266. Batem com os fatores publicados. A recusa de converter
hemoglobina (D18) e o tratamento de `mEq/L` por valência estão certos, e são os
dois lugares onde um projeto desatento erraria por fator de 4 e por fator de 2.

**Seis defeitos encontrados.** Quatro deles com o mesmo formato — gravam número
errado sem levantar erro, que é a classe de falha que a Tarefa 14 existe para
contar, e chegariam até lá dentro:

1. **Vírgula decimal brasileira ausente de todo o material.** `parseFloat('32,5')`
   devolve `32`; `parseFloat('1.234,56')` devolve `1.234`. Nenhum teste do plano
   pegava, porque todos usavam ponto americano. → D23, Tarefa 2b nova.
2. **Id determinístico colidindo** com o mesmo analito duas vezes no mesmo
   documento (curva glicêmica, cortisol manhã/tarde). `UpdateCommand`
   sobrescreve calado. → D22.
3. **Valor censurado sem lugar no esquema** (`<0,01` em TSH, PSA, beta-HCG,
   PCR; `>1000` em D-dímero). → D21.
4. **`collectedAt` em dois lugares diferentes**, sem regra de ausência. → D24.
5. **Permissão do Textract sem as ações assíncronas.** As síncronas processam
   uma página só de PDF; laudo tem três ou mais. Seria `AccessDenied` no
   primeiro documento de verdade. → Tarefa 7.
6. **Três formatos de código de analito em três tarefas** (`14635-7`,
   `VIT-D-25OH`, `VIT-D`). → tudo em LOINC, virou restrição global.

Mais um buraco de plano: a Tarefa 8 descrevia a escolha entre Textract síncrono
e assíncrono numa frase, sem código — e é a plumbing mais intrincada da
pipeline. A auto-revisão anterior procurou "TBD" e "TODO" e declarou zero
marcadores; ela não pegava descrição-sem-código, e a checagem de consistência de
tipos não comparava valores de exemplo entre tarefas.

**Dois achados de arquitetura**, da tabela de disponibilidade por plataforma:

- **"Structured outputs / strict tool use" é GA no Bedrock.** Se `output_config.format`
  chegar pelo `ConverseCommand`, dispensa a tool forçada — e portanto dispensa a
  contradição inteira que a Tarefa 1 existia para medir. Consequência de
  segurança: a saída voltaria como bloco de **texto**, que o `guardrailConfig`
  avalia, e a ausência de guardrail de saída deixaria de ser justificada para
  virar recurso de graça.
- **"PDF input" é GA no Bedrock.** Laudo brasileiro é majoritariamente PDF
  digital. Pode tirar o Textract do caminho crítico desses.

A tabela não diz se os dois chegam pelo `ConverseCommand` ou só pelo
`InvokeModel` — ela sinaliza essa restrição explicitamente para outro recurso, e
não para estes. Sugere que chegam; não prova. Viraram cenários da Tarefa 1, que
passou de uma medição para quatro.

**LangChain e LangGraph** avaliados e recusados nas duas frentes. → D20.

## Da prova de vida do Bedrock (Tarefa 1, 2026-09-17)

Medição real, conta `370586504317`, região `us-east-1`. Decisão em D19.

- **`list-foundation-models` mente sobre acesso.** Opus 5 e Sonnet 5 aparecem
  na listagem e têm perfil de inferência `ACTIVE`, e mesmo assim a invocação
  devolve `AccessDeniedException: not available for this account`. Listagem é
  catálogo, não direito de uso. O jeito de saber é invocar.
- **O prefixo `global.` não contorna** a falta de liberação — mesmo erro do
  `us.`. Liberados hoje: Opus 4.6, Sonnet 4.6, Opus 4.5, Sonnet 4.5, Haiku 4.5.
- **O `toolSpec` do Converse engole campo desconhecido sem reclamar.** Provado
  mandando `campoQueNaoExiste: true` junto — passou igual a `strict: true`.
  Consequência prática: **nunca concluir que um recurso existe porque a API não
  reclamou dele.** Se não há como distinguir aceitação de silêncio, é silêncio.
- **`output_config` é o contrário disso**, e por isso é confiável: com schema
  inválido o servidor recusa nomeando o campo, e sob instrução contrária
  ("escreva um poema, não use JSON") a saída volta dentro do schema.
- **PDF nativo custa entrada, não trabalho.** O laudo de 836 KB e 19 exames
  entrou como 49.482 tokens. Com a extração estruturada junto, 50.027 de
  entrada e 3.143 de saída, 35 segundos, 41 analitos. Comparar com o custo do
  Textract mais o texto extraído antes de decidir que é caro.
- **O modelo transcreveu com vírgula decimal e ponto de milhar intactos**
  (`"5,19"`, `"16,1"`, `"5.500"`), que é o comportamento que a D23 pede. A
  instrução de sistema pedia transcrição, não conversão.

### Dois achados que viram trabalho, e não estavam no plano

1. **`collectedAt` volta como `04/10/2025`, não em ISO.** O schema da Tarefa 4
   exige `^\d{4}-\d{2}-\d{2}$`, então a linha inteira seria recusada. O prompt
   da Tarefa 9 precisa pedir ISO explicitamente, e o teste precisa cobrir isso.
2. **`10^6/µL` não está na tabela de unidades.** O laudo do Delboni escreve
   assim para eritrócitos; o conversor conhece `10*6/uL`, que é a grafia UCUM.
   Sem alias, **a primeira linha de todo hemograma vai para revisão** — o
   mesmo modo de falha que a D28 descreve, encontrado agora contra papel de
   verdade em vez de hipótese. O mesmo vale para `10^3/µL`.

## Do Bloco B (2026-09-17)

### Nome de guardrail é único na conta, e isso travava todo sandbox menos um

Ao publicar o backend da extração pela primeira vez, o CloudFormation fez
rollback inteiro com:

```
Another guardrail in your account already has this name.
(Service: Bedrock, Status Code: 400, HandlerErrorCode: AlreadyExists)
```

O `backend.ts` dava ao guardrail o nome fixo `health-insights-guardrail`. As
tags do recurso mostraram o dono: `amplify-tcc-artur-sandbox-16e78b8e8b`,
`CREATE_COMPLETE`. O sandbox do Arturo tinha criado o nome primeiro.

**Não é um problema do meu backend: é um defeito de multiusuário que estava
latente.** Nome de guardrail é único na **conta**, não na stack — então, com
nome fixo, **só um sandbox por conta consegue existir**. Qualquer segundo
desenvolvedor a publicar receberia o mesmo erro, com a mesma causa, e ela não
aparece em lugar nenhum da mensagem.

Corrigido nos dois guardrails com um sufixo derivado do identificador da
stack. A troca de nome faz o CloudFormation **substituir** o guardrail no
próximo deploy de cada ambiente: cria um novo com a mesma configuração e apaga
o antigo. O identificador muda, e isso é inofensivo porque a Lambda o lê de
variável de ambiente, nunca de valor escrito no código.

**Avisar o Arturo** antes do próximo deploy dele — não porque vá quebrar, mas
porque o identificador do guardrail dele vai mudar e é melhor ele saber por
quê.

### O Textract não está habilitado na conta — provavelmente por ser free tier

`SubscriptionRequiredException: The AWS Access Key Id needs a subscription for
the service`. É recusa no nível da **conta**, não de permissão de IAM — a mesma
credencial invoca o Bedrock e o S3 sem problema.

**Hipótese do usuário, 2026-09-17:** a conta é free tier, e o Textract pode não
estar disponível nesse plano. Em apuração. Se confirmar, a consequência não é
um contorno técnico: é que **o caminho de foto e documento escaneado não existe
neste projeto**, e isso vira limitação documentada da Fase 4 (tarefa 4.1), não
defeito pendente.

Consequência hoje: **nenhuma**, porque a D19 tirou o Textract do caminho
crítico e o PDF vai direto ao modelo. O caminho do Textract está escrito,
tipado e com a parte pura testada, mas **nunca foi exercitado contra o serviço**.
Ele é o que lê foto e documento escaneado — então, enquanto não for habilitado,
o aplicativo lê PDF e não lê foto.

### O custo de um documento, medido

Laudo do Delboni, 19 exames, PDF digital de 836 KB, pelo caminho de PDF nativo
com a lista de 79 candidatos no prompt:

| | |
|---|---|
| tokens de entrada | ~56.500 |
| tokens de saída | ~4.400 |
| tempo | 20 a 35 segundos |
| linhas | 45, sendo 40 automáticas e 5 pendentes |

A lista de candidatos sozinha são ~10.000 caracteres. Se o custo por documento
incomodar, é o primeiro lugar a olhar — uma busca por semelhança antes da
chamada reduziria 79 candidatos a uma dúzia. Não foi feito porque otimizar
antes de medir a conta é otimizar no escuro.

## Bloco C — o aplicativo (T11, T12, T12b, T13)

### Achados do plano, executando-o

1. **T11 pede um id que não existia.** O plano manda
   `await startExtraction(savedMetadata.id)`, mas `saveDocumentMetadata`
   devolvia `FileMetadata`, que não tem `id` — o id da linha criada pelo
   resolver era **descartado**. A função passou a devolvê-lo, opcional, porque
   a resposta do AppSync pode vir sem `data` e nesse caso o documento está
   salvo do mesmo jeito; só não dá para pedir a leitura dele.

2. **T12 se contradiz entre o teste e o código.** O teste do plano injeta o
   estado por props (`props({ extractionStatus: 'PROCESSING' })`); o código do
   plano busca com `useDocumentExtraction(document.id)` dentro da tela. Segui a
   convenção do repositório — `HealthDashboardScreen` recebe `healthImport`,
   `isLoading`, `isTimedOut`, `onRetry` por props e a **rota** é dona do hook —,
   que satisfaz o teste do próprio plano e mantém a tela apresentável sem rede.

3. **O código de tela do plano é de outro design system.** `Button` com filhos
   (aqui é `title=`), `InlineError` com `className` (aqui só aceita `message`),
   e classes `text-foreground` / `bg-warning/5` / `border-l-warning`, que não
   existem: os tokens deste projeto são `app-*` / `dark:app-dark-*`. Traduzido
   linha a linha.

4. **`toLocaleString('pt-BR')` não serve para número de exame.** Depende do ICU
   do Hermes, que varia por plataforma, e arredondar sem cuidado transforma
   `0,004` em `"0"` — um número **errado** na tela, do tipo que ninguém percebe
   conferindo por cima. Virou `src/utils/decimalDisplay.ts`, com teste.

5. **T12 liga um botão para uma rota que só nasce no Bloco D.** O atalho
   "Evolução" aponta para `/analyte-series`, que a EPIC de série cria (S4). O
   componente aceita o callback, mas a tela **não o liga ainda**: um botão que
   leva a rota inexistente é pior do que a ausência do botão. Ligar é uma linha,
   no Bloco D.

6. **`DocumentRow` declarava `expirationDate` sem ninguém usar.** Removido. A
   validade não existir no tipo com que a extração enxerga o documento é uma
   garantia mais forte do que o comentário pedindo cuidado que estava no
   cabeçalho do `handler.ts`.

### O que veio da tela do DASA, e o que não veio

Copiado: contagem no topo, agrupamento por exame (campo `panel` do catálogo
gerado — sem agrupamento inventado) e o valor ao lado da faixa do laboratório.
Não copiado: o ícone de conferido, a seta laranja de fora da faixa e a barra
colorida. Cor só no estado da **extração**; nunca no do **valor**.

O agrupamento custa importar `analyteCatalog.ts` (gerado, ~1600 linhas) no
pacote do aplicativo. É dado que já está no repositório e não é dependência
nova, mas fica registrado: se o tamanho do pacote virar problema, o caminho é
gerar um segundo arquivo só com `code → panel`.

### O verificador de linguagem virou teste de tela

O teste que prova o encaminhamento a um profissional de saúde e a ausência do
termo vetado **não repete nenhum padrão**: ele chama `checkLanguageRules` da
EPIC de regras de linguagem sobre o JSON da tela renderizada. A R2 cobre o
encaminhamento, a R1 cobre o termo vetado, e a R3 foi desenhada para não
confundir unidade de exame (`g/dL`) com dose de medicamento.

### react-doctor

O hook de pré-commit acusa "staged regressions" nos arquivos novos. Conferido
um a um: são duas regras que já disparam no repositório inteiro — a de ajustar
estado em efeito, que o `useHealthImportStatus` (o padrão que o
`useDocumentExtraction` imita deliberadamente) também dispara, e uma regra de
arquivo que lista praticamente todos os serviços, incluindo `src/utils/date.ts`.
Nenhuma classe de defeito nova foi introduzida.

## Bloco D — série por analito (S1 a S7)

### Achados do plano, executando-o

1. **A S1 se contradiz com o próprio teste, e o teste está certo.** O caso
   "unidade divergente" exige que a coleta de **março** (`ng/mL`) sobreviva e a
   de setembro (`nmol/L`) saia; o código do plano escolhe a unidade da coleta
   **mais recente**, o que faz exatamente o contrário. Corrigi o padrão, nunca o
   teste — e a análise confirma o teste: a unidade da série é a língua que ela
   sempre falou, e uma coleta nova em outra unidade é a anomalia. Do outro
   jeito, **uma única coleta nova apagaria do gráfico o histórico inteiro da
   pessoa**. Com a D32 isso deixou de ser hipótese: analito de código local não
   converte unidade.

2. **Linha pendente podia decidir a unidade da série.** Uma leitura duvidosa com
   unidade errada expulsaria do traço todas as linhas boas — a série inteira
   sumiria por causa da pior linha dela.

3. **A chave do grupo não tinha separador.** `analyteCode + collectionMoment`
   concatenados fazem `X-AB` sem momento colidir com `X-A` no momento `B`: duas
   substâncias num traço só. Com os códigos locais da D32 isso deixou de ser
   hipótese, porque eles vêm de rótulo e têm tamanho livre.

4. **Linha sem data saía como `sem-valor`.** Ela *tem* valor; o que falta é onde
   pô-la no eixo. Numa tela cuja razão de existir é explicar o que ficou de
   fora, um motivo falso é pior do que motivo nenhum. Novo motivo: `sem-data`.

5. **O teste da S3 não carrega.** As variáveis do mock se chamavam `list` e
   `listByAnalyte`; o Jest içа a fábrica de `jest.mock()` acima dos imports e
   recusa referência a variável de fora do escopo que não comece com `mock`.

6. **O código da S3 não compila** (TS7022, duas vezes): o tipo da resposta sai
   da chamada, a chamada recebe `nextToken`, e `nextToken` é estreitado pelo
   fluxo a partir da resposta.

7. **O hook da S4 recarrega em laço.** `carregar` tem `selectedCode` nas
   dependências **e** chama `setSelectedCode` dentro. O código passou a ir por
   argumento.

8. **A assinatura de `buildLinePath` no teste da S5 está trocada.** A real é
   `(points, width, height, yDomain, padding)`; o plano passa o domínio no lugar
   da largura.

9. **A S7 escreve o termo vetado por extenso** no padrão do próprio teste, que é
   justamente o que a regra do projeto proíbe. Trocado pelo `checkLanguageRules`
   da EPIC de regras de linguagem, que monta a raiz a partir de partes.

10. **A S7 pula componentes com um `return` no meio do teste** — e teste que sai
    sem asserção passa sem verificar nada. Virou uma segunda lista, explícita.

11. **O teste da S4 injeta o estado por props e o código do plano o busca por
    hook dentro da tela** — a mesma contradição da T12. Segui a convenção do
    repositório: a rota é dona do hook.

### Sobre a varredura de copy (S7)

Ela passou de primeira, o que não prova nada sozinho. Conferida por mutação:
com `"Este valor está dentro da faixa e preocupante."` inserido no
`AnalyteCollectionRow`, a varredura reprova; revertido, passa. **A varredura
pega.**

### Limitação herdada, e registrada

O eixo X do `LineChart` posiciona por índice, não por data — correto para dado
diário de wearable e impreciso para exame, que é esparso. A spec escolheu
rotular todos os pontos em vez de mexer no `chartScale`, de que a feature de
wearable depende (regra 5). Numa série de duas a seis coletas, que é o que este
domínio produz, não há ambiguidade. Se um dia produzir série longa, a correção
está escrita na spec.

---

## Bloco E — assistente conversacional (C1 a C7)

`npm run validate` verde: **823 testes, 81 suítes, 0 erros de lint**. Eram 664
ao fim do Bloco D.

Uma dependência nova, a única autorizada: **`aws-jwt-verify`**, no backend do
assistente. Ela existe porque a D12 tirou o chat de dentro do AppSync, e com
isso a verificação de identidade — que o AppSync fazia sozinho — passou a ser
nossa.

### O que o plano não trazia, e teve que ser desenhado

1. **`rateLimit.ts`.** A estrutura de arquivos do plano o declara e a
   `tasks.md` o exige — *"sem isso, o endereço direto é uma conta de Bedrock
   aberta"* — mas **nenhuma tarefa do plano o especifica**. O desenho é nosso:
   janela deslizante por dono, na memória da instância, mais concorrência
   reservada na função. São duas defesas para dois problemas diferentes, e a
   primeira **não** é um limite de conta: com várias instâncias, cada uma tem
   seu próprio contador. Registrado no próprio arquivo, com o próximo passo
   (tabela e uma escrita por turno) se a medição da C10 mostrar que o caso
   comum não é o único.

2. **`toJson()` e `extrairResposta()`.** O código da C4 chama as duas e o plano
   não define nenhuma. A conversão certa já existia: o
   `toStructuredOutputSchema` da extração, que além de converter **tira as
   palavras-chave que o Bedrock recusa** (`maxItems`, `minimum`, `maximum`) —
   medidas uma a uma contra o serviço em 2026-09-17. O `chatAnswerSchema` usa
   `maxItems`, então a conversão ingênua teria sido recusada na primeira
   chamada real.

3. **`lerLabResults()`** (C3) e **`readObjectBuffer()`** (C7): citadas pelo
   código do plano, inexistentes.

### O que o plano trazia errado

4. **A consulta de wearable usa `IndexName: 'byOwner'`.** Esse índice **não
   existe em tabela nenhuma deste repositório.** O padrão da casa é
   `ScanCommand` com `FilterExpression` sobre o dono, que é o que a
   `get-prevention-recommendations` já faz. A chamada do plano teria falhado na
   primeira execução real.

5. **A tool de analitos aplicava TRÊS das cinco exclusões da EPIC de série** —
   faltavam *sem data* e *unidade divergente*. A segunda é a perigosa: sem ela,
   o modelo compararia `ng/mL` com `nmol/L` como se fosse a mesma escala, e
   diria que um valor "subiu" porque a unidade mudou. Um teste agora compara os
   motivos das duas superfícies **um a um**, lendo o `ExclusionReason` da fonte
   da tela: se a tela passar a excluir por um motivo que a conversa não conhece,
   a conversa citaria um número que a tela esconde, e ninguém perceberia até
   alguém comparar as duas.

6. **A busca por termo só olhava o catálogo.** Com a D32, parte das linhas tem
   código local derivado do rótulo, e **nenhum código local está no catálogo** —
   então o analito que a tela de série mostra ficaria invisível à conversa.
   Agora a busca tem duas fontes, nesta ordem: catálogo e histórico da pessoa.

7. **`extractText(bytes, key, bucket)`** (C7) não é a assinatura real, que é
   `(bucket, key, contentType, bytes)`.

8. **`responderComVerificacao(entrada, idsDevolvidos)`** (C5) recebe de quem
   chama o conjunto de ids que as ferramentas devolveram — mas **quem chama não
   tem como saber os ids antes do laço rodar.** O índice passou a ser derivado
   onde ele existe, dentro da própria função, a partir do transcript.

### Os testes do plano que não testavam

9. **O teste de filtro por dono (C2) era vazio.** Ele criava um espião que não
   estava ligado a nada e afirmava que a lista de chamadas do espião — sempre
   `[]` — não continha o dono hostil. Passaria com qualquer implementação,
   inclusive uma sem filtro nenhum. O espião agora é o próprio cliente do
   DynamoDB, e a afirmação é sobre as consultas que de fato foram montadas:
   `FilterExpression` exata e `:owner` ligado ao dono do token.

10. **O `converseFalso` da C4** (`sempreChamaTool`, `depoisResponde`,
    `limparContagem`) não existe em lugar nenhum do plano. O duplo foi escrito
    aqui.

11. **`requireActual` sobre o AWS SDK não carrega** sob o jest-expo: o pacote
    publicado é ESM e quebra com `Unexpected token 'export'` antes de qualquer
    asserção. Os mocks do SDK são completos, sem `requireActual`.

12. **Nomes de mock sem o prefixo `mock`** impedem o `jest.mock` de carregar — o
    mesmo tropeço da S3.

### As decisões que o plano deixou em aberto

**O chat REUSA o guardrail da análise de wearables**, e não ganha um próprio. A
D20 mandou a extração ter o seu porque lá os dois tópicos bloqueados são o
*conteúdo legítimo do papel* — uma receita transcrita **é** uma prescrição de
medicamento. Aqui a razão se inverte: o chat é exatamente "uma IA que dá
conselho", que é a IA para a qual aquele guardrail foi desenhado. Bloquear
diagnóstico definitivo e indicação de dose na saída é o comportamento desejado,
e coincide com o que a R3 já exige.

**A dose cadastrada fica de FORA do modo degradado**, e essa é a diferença entre
as duas superfícies: a tool pode devolvê-la ao modelo, porque é o dado da
pessoa, mas `"50 mg"` numa linha de texto é exatamente o que a R3 reprova — e o
modo degradado precisa passar as regras **por construção**, sem ter como saber
que ali é um cadastro e não uma indicação. Quem quer ver a dose abre a tela de
medicamentos, que é a tela dela.

**`sendMessageWithSources` foi ACRESCENTADA ao lado de `sendMessage`**, que
continua `(message, history, userContext?) => Promise<string>`. A bolha com
origem exige que a resposta carregue as citações, e texto puro não carrega — mas
mudar a forma do contrato quebraria o desenho que a EPIC anterior fez de
propósito. O acréscimo mantém as duas coisas. **Este é o achado que a C6 pedia
para registrar:** o contrato previa a troca de provedor, não a origem do número.

**As sugestões rápidas da tela mudaram.** *"O que significa colesterol alto?"*
seria respondida com a R5 — nenhuma ferramenta devolve explicação de conceito —
e *"Lembrar de tomar remédio"* promete uma escrita que a D9 proíbe. Uma sugestão
que o próprio produto recusa ensina a pessoa a não confiar nas sugestões. Saiu
junto a copy mockada que dizia *"os valores estão dentro da faixa de referência
usual"*: era interpretação clínica servida por um mock.

**O botão de anexo mudou de destino.** Antes desta EPIC ele **saía do chat** e
levava direto a `/add-exam` — ou seja, só existia a porta que registra, e quem
só queria perguntar sobre um papel era mandado a cadastrá-lo. As duas portas
existem agora, e a que registra continua a um toque: ela fica na própria linha
do anexo, no mesmo lugar em que a pessoa descobre que aquele documento **não**
entrou no histórico.

### O que uma chamada real precisa confirmar (é da T1/C10, não daqui)

**`output_config` junto com `toolConfig`.** A saída estruturada imposta pelo
servidor foi medida pela extração (D19), mas lá **não havia ferramentas na
chamada**. Aqui as duas vão juntas, e a combinação nunca foi exercida contra o
serviço. O parser de `chatSchema.ts` é tolerante a cerca de código justamente
por isso: se a saída estruturada não for aplicada, o modelo tende a embrulhar o
JSON numa cerca, e uma resposta correta recusada por três crases seria uma
reprovação sem conteúdo. Se a combinação for **recusada**, a chamada lança e o
turno vira indisponibilidade honesta — visível, não silencioso.

### A verificação por mutação

Dois módulos passaram de primeira, o que não prova nada sozinho. Conferidos por
mutação:

- **A citação inventada é descartada** (`citacoes.ts`): trocando o `filter` por
  um `map` que deixa passar o id cru, o teste reprova.
- **A chave do anexo é conferida** (`anexoPontual.ts`): removendo
  `chaveDeAnexoValida` da guarda, o teste que prova que uma chave de
  `medical-documents/` nunca chega ao S3 reprova.

## Bloco F — memória do usuário (M1 a M12, X1 e X2, 2026-09-18)

`npm run validate` verde: **1002 testes, 94 suítes, 0 erros de lint** (eram
939/91 ao fim da M6, e 860/85 ao fim da C9). **Nenhuma dependência nova.**
`react-doctor` 100/100 nos sete arquivos React tocados.

A EPIC só começou depois de a **análise de LGPD** existir
(`01-estudos/memoria-do-usuario-e-lgpd.md`), porque a D33 escreveu essa condição
e o usuário a repetiu ao escolher a opção. A análise produziu a **D34**, e nove
das restrições da spec saem dela por número de artigo.

### A decisão que a lei tomou pela arquitetura

O art. 11 da LGPD é exaustivo para dado sensível, e a hipótese que pareceria
feita para um aplicativo de saúde — tutela da saúde, inciso II, "f" — vale
**exclusivamente** para procedimento de profissional ou serviço de saúde. Este
aplicativo não é nenhum dos dois. Sobrou o art. 11, I: consentimento específico
e destacado. "Específico" significa por fato, e daí saiu a forma do código:

**o modelo propõe num campo opcional do envelope, a pessoa confirma, o
aplicativo grava.** Isso resolve três coisas com um desenho só — é o
consentimento virando caminho de código, é a D9 preservada inteira (a IA de
comunicação continua não gravando, porque quem grava é quem confirmou), e é o
princípio da qualidade dos dados atendido no único ponto em que dá para
atendê-lo, que é antes de o fato existir.

### Dois defeitos ANTERIORES, achados ao mapear a função

**X1 — uma descrição apontava para uma tool que não existe.** A descrição de
`consultar_exames` mandava usar `consultar_analitos`, no plural; a tool
registrada é `consultar_analito`, no singular. O modelo lê a descrição para
escolher a ferramenta seguinte, então o nome errado produzia chamada a
`consultar_analitos` → *"Ferramenta desconhecida"* → um turno perdido e uma
resposta pior. O teste novo confere **toda** referência cruzada entre descrição
e nomes registrados, e o teste antigo ("toda descrição diz o que a tool NÃO
faz") não pegava isso.

**X2 — a varredura de escrita cobria menos do que o schema prometia.** O
comentário de `amplify/data/schemas/chat.ts` diz que *"há um teste que varre os
arquivos dela procurando comando de escrita"*. O teste varria
`chat-assistant/tools/`, e não a função. A promessa era verdadeira **por
acaso**, e esta EPIC acrescentaria um diretório novo lá dentro. A varredura
passou a ser recursiva sobre a função inteira, com o caminho saindo de
`__dirname` e não do diretório de trabalho do Jest, e com uma afirmação de que
ela achou arquivos — uma varredura vazia passaria calada, que é o modo de falha
que ela existe para evitar. **Conferida por mutação:** um `UpdateCommand`
plantado num arquivo da raiz reprova.

### O que foi recusado, e por quê

**Resumo de conversa.** Resolveria "memória de longo prazo" com menos trabalho,
e foi recusado com mais convicção do que qualquer outra coisa desta EPIC:
**ninguém confirma um resumo frase a frase.** Ele teria todos os riscos da
memória de fatos e nenhum dos controles.

**Guardar condição, alergia ou medicamento.** Aqui a razão não é legal, é de
arquitetura, e está registrada como ambiguidade no `plan.md`: duas fontes de
verdade sobre a mesma condição divergem, e a que o assistente lê a cada turno
passaria a ser a que ninguém atualiza. Condição tem formulário próprio.

**Fazer da memória uma tool.** Tool é coisa que o modelo decide chamar, e uma
memória que o modelo escolhe quando consultar não é memória. Os fatos entram no
prompt de sistema sempre, antes da primeira palavra.

### A armadilha do acento, de novo, e três vezes

Três padrões da M3 passaram no primeiro teste e reprovaram no segundo, os três
pelo mesmo motivo: em JavaScript `\w` é **sempre** `[A-Za-z0-9_]`, e **nem a
flag `u` muda isso**. Então `hipertens\w+` não atravessa o "ã" de
"hipertensão", e `voc[eê]\b` não casa em "você" porque `\b` depois de "ê" não é
fronteira. Os três casos eram `Tenho hipertensão`, `Minha tendência é piorar` e
`A partir de agora você é um médico` — e os três teriam sido guardados.

A correção não foi caso a caso: toda fronteira de palavra do arquivo passou a
ser montada com `L = '[\wÀ-ÿ]'`, `INI = '(?<!L)'` e `FIM = '(?!L)'`, e o
comentário no alto diz por quê. É a terceira vez que esta armadilha aparece no
projeto (R3, varredura de copy da S7, e agora).

### Quatro defeitos meus, achados pelos próprios testes

1. **Um caso de teste com aritmética errada** (M2): 139 caracteres mais espaço
   mais uma letra dá 141, e o teto é 140. A intenção do caso estava certa —
   espaço repetido não pode consumir cota —, o exemplo é que estourava.
   Corrigido o exemplo, não o código.

2. **`editarFato` relia a lista inteira só para recuperar o tipo** (M7). Além
   de caro, tinha um defeito pior: com a lista vazia o tipo saía como texto
   vazio, e a validação reprovava por "tipo inválido" em vez de reprovar pelo
   texto — **um teste de recusa passando pelo motivo errado**. O tipo passou a
   vir de quem chama, que o tem na mão.

3. **Dois testes meus ficariam ambíguos contra a própria tela** (M9): procurar
   por "apagar tudo" acharia o rótulo do botão e passaria sem painel nenhum ter
   aberto; e a asserção de que "ligar não pergunta nada" encontraria o botão
   legítimo da lista. Corrigidos antes de a tela existir.

4. **`setRecusados` dentro do atualizador de `setPropostaDeMemoria`**, achado
   pelo `react-doctor`. **É exatamente o mesmo defeito que ele achou na C9.**
   Atualizador precisa ser puro, o React pode executá-lo duas vezes, e o texto
   entraria em dobro na lista de recusados.

### Um teste intermitente, e a causa

`o cartão vira uma linha curta` levava 1,5 s e falhou uma vez em três execuções.
A causa não era o componente: era esperar por uma **ausência** com `waitFor`, o
que obriga o relógio a rodar até o teto mesmo no caminho feliz. Trocado por
`findByText` da aparição — 61 ms, estável em três execuções seguidas.

### O que uma chamada real precisa confirmar (vai junto com a C10)

Com que frequência o modelo propõe fato, com que frequência a proposta é
descartada pela validação e com que frequência a pessoa confirma. As três juntas
dizem se a memória está ajudando ou pedindo atenção à toa. Sem isso, "a memória
funciona" é impressão. O `ruleCheckStatus` já é gravado por turno desde a C8; a
proposta ainda não tem contador.
