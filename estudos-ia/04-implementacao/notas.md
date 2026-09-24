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

**Apurado em 2026-09-18** — diagnóstico inteiro em
`estudos-ia/01-estudos/textract-por-que-nao-temos-acesso.md`. A hipótese do
usuário **se sustenta**, e quatro concorrentes foram descartadas com medição e
não com argumento:

| Hipótese | Veredito | O que a mediu |
|---|---|---|
| região errada | descartada | `us-east-1` e `us-west-2` dão o mesmo erro |
| permissão de IAM | descartada | o erro não é `AccessDenied`, e a recusa acontece antes do IAM |
| cota inicial zerada | descartada | Service Quotas responde 200 com os valores padrão |
| SCP / conta de laboratório | descartada | `AWSOrganizationsNotInUseException` — a conta não está em organização |

O que sobra: `accountPlanType: FREE`. A mesma credencial invoca Bedrock, S3 e
Rekognition; Textract, Comprehend e Transcribe recusam no nível da conta. **Não
é prova**, e vale dizer por quê: a AWS não publica a lista nominal de serviços
excluídos do plano gratuito. É a explicação mais econômica dos dados, e o
documento traz o passo a passo para fechar de vez.

**Detalhe que muda uma suposição comum do projeto:** `sa-east-1` (São Paulo)
**não tem Textract** — o endpoint nem resolve. Mudar para a região brasileira,
que seria o reflexo natural de quem pensa em latência ou em residência de dado,
tiraria o serviço em vez de trazer.

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

### A conferência dos critérios de aceite, enfim feita (2026-09-18)

Era a caixa aberta no cabeçalho de **todas** as cinco `tasks.md` desde o Bloco B.
Foi feita contra o código e os testes que existem, critério a critério, nas cinco
EPICs de IA. Resultado agregado:

| EPIC | Com teste | Sem teste | **Não cumprido** | Não verificável |
|---|---|---|---|---|
| extração de documentos | 22 | 3 | 0 | 1 |
| série por analito | 14 | 1 | 0 | 1 |
| regras de linguagem | 7 | 4 | 1 (parcial) | 1 |
| assistente conversacional | 28 | 2 | **1** | 2 |
| memória do usuário | 22 | 3 | 0 | 2 |

**O achado grave, e ele é na regra central: a R4 é verificada em um sentido só.**

Citação **inventada** é pega — `citacoesConferem` reprova o que aponta para linha
que nenhuma ferramenta devolveu. Citação **omitida** passa: `[].every(...)` é
`true`, `chatAnswerSchema` não tem `refine` ligando dígito no texto à presença de
citação, e `languageRules.ts` não registra verificador de R4. Uma resposta com
"sua vitamina D foi 22 ng/mL" e `citacoes: []` volta como `APROVADA`.

E a spec do assistente afirmava, literalmente, *"coberto por teste sobre o schema
de saída"*. **Esse teste não existe.** Hoje a R4, no sentido da omissão, é
sustentada só pelo prompt — que é exatamente o que a §2 da EPIC de regras diz não
bastar. Corrigido na spec em vez de propagado; a implementação é tarefa própria,
porque o risco dela é falso positivo ("sua consulta é dia 12" tem dígito e não é
medida) e isso merece decisão registrada.

**Quatro afirmações falsas de documentação, todas corrigidas no lugar:**

1. A da R4, acima.
2. `memoria-do-usuario/spec.md` dizia que `Agora não` "não volta a propor o mesmo
   fato — coberto por teste", e só a primeira metade tinha teste. A segunda foi
   escrita (`chatbot-screen.test.tsx`) e conferida por mutação.
3. A mesma spec dizia "coberto pelo teste já existente, **que não é alterado**"
   sobre a varredura de escrita. Ele **foi** alterado, pela X2 desta própria
   EPIC, e para melhor. Uma spec que descreve o passado errado é uma spec que a
   próxima EPIC cita como fato.
4. `regras-de-linguagem/spec.md` promete conjunto adversarial com uma tentativa
   **por regra**; há tentativas para R1, R2 e R3, e nenhuma para R4 nem R5.

**Três lacunas sem teste que valem registro:**

- A herança da data do formulário com aviso (D24) vive em
  `extract-document-data/handler.ts`, que é o maior arquivo da feature **sem
  arquivo de teste** (214 linhas).
- A autorização por dono dos dois models de chat não tem o equivalente do
  `schemaDeMemoria.test.ts`, que a EPIC da memória escreveu para os dela.
- "O módulo de regras não importa nada" é verdade e **não tem trava**. A EPIC da
  memória escreveu essa trava para o módulo dela; esta não tem, e um `import`
  acrescentado amanhã quebraria a D30 em silêncio.

**Dois achados fora dos critérios:**

- **Cinco arquivos de teste do backend digitam 29 códigos LOINC à mão**, contra a
  D27, que diz em título que isto vale para exemplo em teste. O padrão certo já
  existe no repositório (`__tests__/lab-result-grouping.test.ts` importa o
  catálogo e busca por rótulo). E não há **teste de deriva**: nada regenera o
  catálogo a partir do CSV para comparar com o arquivo versionado, então um
  dígito trocado à mão passa por tudo — que é o modo de falha que a própria spec
  descreve.
- A tela de série lista a coleta censurada com data, motivo e atalho, **sem o
  valor**, enquanto a spec promete "com o sinal preservado". O sinal só aparece
  na tela de detalhe do documento.

## Primeira conversa real — os números da L7 e da C10 (2026-09-18)

Cinco turnos, com um laudo do Delboni de 46 linhas no histórico. Análise turno a
turno em `estudos-ia/01-estudos/conversa-real-2026-09-18.md`; aqui ficam só as
medições, que é o que a L7 e a C10 pediram.

**É a primeira medição do laço contra uso real**, e ela só existe porque o
registro de reprovação entrou em `verificacao.ts` horas antes. Até então a
reprovação não deixava rastro nenhum, e a distribuição por regra que a C10 pede
era impossível de levantar.

### Reprovações por regra

| | |
|---|---|
| turnos | 5 |
| reprovadas na 1ª geração | 2 |
| reprovadas na 2ª geração | 1 |
| **R2** | **2 de 2** — 100% das reprovações |
| R1, R3, R4 | zero |
| citações conferindo | 5 de 5 |

**Falso positivo: 2 de 2.** Nenhuma das duas reprovações era sobre saúde. As
duas foram ausência de encaminhamento em resposta que não trazia medida — a R2
classifica por QUAL TOOL RODOU, e `consultar_exames` está na lista clínica
embora devolva só nome, tipo e data.

Uma delas custou a resposta inteira: "faça uma visão de todos" foi reprovada
duas vezes e caiu no degradado.

### O gatilho da D31

A segunda geração salvou **1 de 2 (50%)**. O gatilho reabre a D31 abaixo de um
terço, então **não disparou**. Amostra pequena demais para decidir — é o
primeiro ponto da série, não a série.

### Duração por turno

De 5,0 s a 16,5 s. Os dois turnos com duas gerações foram os mais longos (16,5 s
e 9,9 s); os de uma geração ficaram entre 5,0 s e 7,5 s. Memória máxima: 118 MB
de 1024 MB concedidos — **o teto está com folga de quase dez vezes**, e vale
olhar quando o custo for revisto.

Custo em tokens não foi medido neste turno: a função não registra o consumo por
chamada. Se a C10 precisa do custo por turno, isso é trabalho a fazer — o dado
existe na resposta do Bedrock e não é escrito em lugar nenhum.

## O laboratório funciona, e a faixa de referência não (2026-09-19)

Reprocessamento do laudo do Delboni contra o sandbox publicado às 12:51, com os
campos `s3Key` e `laboratorio` já no schema. Invocação direta da Lambda, com o
documento que já estava no histórico.

### O que passou

| | |
|---|---|
| `laboratorio` | **"Delboni Medicina Diagnóstica"** — lido do PDF, como está escrito |
| linhas antes | 46 |
| linhas depois | **48** |
| tokens | 56.826 de entrada, 5.161 de saída |

**As 48 linhas provam a idempotência**, e é a primeira vez que ela é exercitada
contra o serviço: a segunda passagem somou duas linhas que faltavam e não
duplicou nenhuma das 46. O id determinístico a partir do arquivo e a gravação
por `UpdateCommand` fizeram o que a tarefa 6 prometia.

Também confirma a instabilidade de cobertura já registrada: o mesmo arquivo, o
mesmo prompt, e duas linhas a mais. **O modelo é bom transcritor e mau
inventariante** — e reprocessar é o conserto, não o problema.

### O que NÃO passou, e ninguém tinha visto

**14 das 48 linhas ficaram sem faixa de referência nenhuma.** Não é falha de
leitura: o laudo brasileiro simplesmente não apresenta essas faixas como dois
números.

| Analito | Como o laudo apresenta |
|---|---|
| Colesterol total, LDL, não-HDL | tabela por risco cardiovascular |
| HDL | prosa — "Superior a 40 mg/dL" |
| VLDL | "não apresenta intervalo de referência definido" |
| Triglicérides | depende de jejum ou não jejum |
| Hemoglobina glicada | tabela categórica — Normal / Risco / DM |
| **Vitamina D (25-OH)** | tabela por faixa etária e grupo de risco |
| Testosterona (total, livre, biodisponível) | tabela por faixa etária e sexo |
| Glicose Média Estimada | calculada, sem faixa no laudo |
| `*eGFR` | texto: "Superior a 90 mL/min/1,73m²" |

**O perfil lipídico inteiro ficou sem faixa. E a vitamina D também** — que é o
analito que originou o projeto e o que a S8 usa para conferir "faixa de CADA
laboratório". A promessa da S8 vale para glicose e hemograma, e **não vale para
o painel que mais gente olha**.

O esquema espera `referenceLow` e `referenceHigh`, dois números. A realidade do
papel tem pelo menos cinco formas: dois números, só limite superior, só limite
inferior, tabela por faixa etária ou sexo, e tabela categórica. **Quatro delas
não cabem no esquema**, e a linha sai sem faixa em vez de sair errada — que é o
comportamento certo, e é uma lacuna de esquema, não um defeito de leitura.

Isto é tarefa própria, e ela não existia: **a faixa de referência precisa poder
ser texto além de número**, no espírito do `rawValue`. Sem isso, a tela mostra
um valor sem nada ao lado justamente nos exames em que a faixa é a informação
que a pessoa procura.

### Um achado menor, e ele é de fronteira

Um dos avisos diz: *"Vitamina C: intervalo difere por sexo; foi utilizado o
intervalo masculino pois o paciente é do sexo masculino."*

O modelo **escolheu entre duas faixas** usando o sexo do paciente, que ele leu
do próprio laudo. A escolha é mecânica e ele a declarou — o comportamento é o
melhor possível dentro do que o esquema permite. Mas é o modelo decidindo qual
faixa se aplica, e isso é um passo na direção da interpretação.

Vale uma decisão registrada: ou o esquema guarda a faixa como o papel a
apresenta, e ninguém escolhe, ou a escolha fica e passa a ser declarada por
campo em vez de por aviso em prosa.

## Bloco 9 — a faixa que não cabia em dois números (2026-09-19)

Blocos 1 a 4 da EPIC `specs/08-ia-fechamento/lacunas-e-decisoes/`, executados
depois das cinco decisões aceitas. Os blocos 5 e 6 — o encaminhamento costurado
e as datas — dependem delas e ficaram para a sessão seguinte.

`npm run validate` verde: **1244 testes em 110 suítes**, contra 1221/109 na
abertura.

### O que mudou, e contra o que foi medido

| Achado | Estado |
|---|---|
| **F3** — limite único ("Superior a 40 mg/dL") entrava vazio | instrução no prompt; 2 das 12 linhas perdidas não precisavam de campo nenhum |
| **F2** — a tela afirmava que o laboratório não informou faixa | passou a dizer que **o laudo** não trouxe |
| **F1** — tabela não cabe em dois números | `rawReferenceText` da extração até as duas telas e as duas tools |
| **F4** — o modelo escolhia a faixa por sexo | proibido no prompt, e **contado** no log em vez de reprovado |

### Os números da lacuna, para comparar depois

Do reprocessamento de 2026-09-19: **48 linhas, 14 sem faixa**. Duas dessas
ausências são corretas (VLDL e glicose média estimada não têm faixa no papel);
**doze eram lacuna nossa** — 2 de limite único e 10 de tabela.

O alvo do próximo reprocessamento, que é do usuário, está escrito como critério
de aceite: **menos de 3 linhas sem faixa nem texto**. É o número que diz se a
instrução de prompt pegou — e ele mede o modelo, não o código.

### O que este bloco NÃO prova

Nenhum teste daqui prova que o modelo **obedece**. Eles provam que o caminho
existe: o campo atravessa a extração, a normalização, a gravação, a leitura, as
duas telas e as duas tools, e o texto nunca é convertido em nenhum ponto. Se o
modelo continuar deixando a faixa em branco, a tela continuará honesta e vazia.

**A publicação é pré-requisito da medição:** o schema do `LabResult` mudou, e
até o sandbox ser republicado (Node 20) a extração grava sem o campo.

### Um defeito de método, pego pelo próprio ciclo

O plano deste bloco afirmava que `formatarFaixa` tinha teste. Não tinha — a
função existia, estava correta e **desprotegida**. É a mesma forma dos três
achados que fundaram a auditoria das regras, num plano escrito depois dela:
"funciona" lido como "está coberto". Quatro casos entraram, e o do limite único
é o que sustenta o F3 na tela.

### Blocos 5 e 6 — o encaminhamento e as datas (2026-09-19)

Executados depois dos blocos 1 a 4, na mesma data, com as cinco decisões
aceitas. `npm run validate` verde: **1280 testes em 113 suítes**, contra
1244/110 no fim do bloco anterior.

| Decisão | O que entrou |
|---|---|
| **A2** | a R2 sozinha não derruba mais nada: o aplicativo acrescenta a frase que falta e entrega a resposta, sem segunda geração |
| **C3** | o encaminhamento saiu das mãos do modelo — uma frase fixa, provada contra as cinco regras |
| **B5** | o campo do formulário mudou de nome nas duas telas; o preenchimento com hoje **continua** |
| **B2** | a divergência entre a data guardada e a coleta do laudo virou aviso |

### O que isto muda na medição da L7, e precisa estar escrito antes dela

A L7 vai medir um sistema com **duas diferenças** em relação ao de 2026-09-18:

1. **A reprovação por R2 praticamente deixa de existir.** Ela era 100% das
   reprovações medidas. O que sobrar de reprovação na próxima rodada é R1, R3,
   R4 ou R5 — e é isso que torna a rodada nova informativa, em vez de uma
   repetição da primeira.
2. **O sinal sobre a R2 mudou de lado.** Não se conta mais quantas vezes o
   modelo esqueceu o encaminhamento; conta-se quantas vezes ele o escreveu
   **mesmo instruído a não escrever** — o evento `encaminhamento-do-modelo`. Um
   número alto ali não é defeito de segurança: é instrução de prompt que não
   pegou, e ela tem conserto barato.

**O gatilho da D31 passa a medir um conjunto menor.** Ele continua de pé — a
segunda geração salvando menos de um terço reabre a decisão —, mas agora sobre
as reprovações que restaram, que são as que importam.

### Custo, e ele caiu

Cada reprovação por R2 custava uma geração inteira: o turno 2 da conversa real
gastou duas gerações e 16,5 s, e terminou no degradado. Sob a A2 esse turno
custa **uma** geração e nenhuma resposta perdida. A confirmação em número é da
próxima rodada — aqui fica a previsão escrita, para poder ser desmentida.

## O reprocessamento do laudo contra o código do Bloco 9 (2026-09-20)

Sandbox republicado (deploy em 160,6 s) e a Lambda invocada diretamente com o
mesmo documento do histórico — `28a15365-6094-4b41-a0c9-a8a4323da390`, o laudo
do Delboni. **É a primeira medição do Bloco 9 contra o serviço real**, e ela
existe para confrontar o que os testes NÃO provam: que o modelo obedece.

Linha de base medida no banco antes da invocação, e não citada do estudo.

### O número que a EPIC prometeu

| | Antes | Depois |
|---|---|---|
| linhas | 48 | **48** |
| com os dois números | 33 | 31 |
| com um lado só | 1 | 1 |
| com faixa em texto | 0 | **14** |
| **sem faixa nenhuma** | **14** | **2** |

**O critério de aceite pedia menos de 3. Deu 2.**

As duas que sobraram são **Testosterona Livre Calculada** e **Glicose Média
Estimada** — as duas são valores *calculados*, e o laudo não traz faixa para
nenhuma delas. O modelo disse isso num aviso, em vez de deixar o vazio sem
explicação: *"não há intervalo de referência definido no laudo para este
analito calculado"*.

**48 linhas de novo, zero duplicadas.** É a terceira passagem do mesmo arquivo,
e a idempotência do id determinístico se sustentou.

Custo: **62.893 tokens de entrada e 5.340 de saída** (era 56.826/5.161), 111,5 s
de execução, 124 MB de 1024. O prompt cresceu ~10% de entrada — é o preço das
instruções novas, e ele está medido em vez de suposto.

### O F4 funcionou, e é o achado mais forte desta rodada

**Zero eventos `faixa-escolhida-pelo-modelo` no CloudWatch, e nenhum dos quatro
avisos declara escolha de faixa.**

Na passagem de 2026-09-19 havia este aviso, que originou a decisão D37:

> "Vitamina C: intervalo difere por sexo; foi utilizado o intervalo masculino
> pois o paciente é do sexo masculino."

Agora a mesma linha entra assim, com as duas faixas e sem ninguém escolher:

> `Homens: 0,2 a 2,1 mg/dL | Mulheres: 0,3 a 2,7 mg/dL`

**Duas linhas trocaram dois números por texto, e isso é a decisão funcionando —
não um defeito.** Zinco Sanguíneo e Vitamina C tinham faixa numérica *porque o
modelo escolhia uma linha da tabela*. Agora transcrevem a tabela inteira. O
preço é real e está declarado: essas duas perderam a faixa de fundo do gráfico
de série. Menos bonito, e verdadeiro.

### A qualidade da transcrição, lida uma a uma

O perfil lipídico inteiro e a vitamina D — os dois casos que motivaram a EPIC —
entraram com a tabela do papel:

- **Vitamina D:** *"População saudável abaixo de 60 anos: Superior a 20 ng/mL |
  População acima de 60 anos e grupos de risco*: 30 a 60 ng/mL"*
- **Hemoglobina glicada:** as três categorias, Normal / Risco / Diabetes
- **Triglicérides e colesterol:** as linhas de jejum e não jejum, separadas

**O melhor comportamento da rodada** foi no Zinco: o laudo tem um erro de
digitação — *"70,0 a 120,"*, vírgula sem número depois. O modelo transcreveu
exatamente assim **e registrou o aviso** dizendo que era possível erro
tipográfico do laudo. Transcreveu o papel errado em vez de consertá-lo por
conta própria, que é precisamente o contrato desta feature.

### Dois achados desta medição, e nenhum estava previsto

**1. A regra do limite único (F3) não pegou.** Ela existia para os dois casos
que já cabiam no esquema, e os dois foram para o texto:

| Caso | Esperado | O que veio |
|---|---|---|
| HDL | `rawReferenceLow: 40` | texto, com as linhas de jejum e não jejum |
| `*eGFR` | `rawReferenceLow: 90` | texto: *"Superior a 90 mL/min/1,73m²"* |

No HDL o texto é defensável — o laudo apresenta a faixa numa tabela por jejum, e
tabela se transcreve. **No `*eGFR` não é:** é uma frase de um lado só, que era
exatamente o alvo da instrução. A consequência é pequena e concreta: a banda de
fundo do gráfico não aparece para ele, e apareceria.

Não é urgente e não vale mexer no prompt por um caso. Fica registrado para a
próxima rodada decidir com dois laudos, e não com um.

**2. O teto de 400 caracteres produziu abreviação num caso.** A tabela da
testosterona total é a maior do laudo, e o modelo a comprimiu em vez de copiar:

> `Masc: 16-21a: 118,22-948,56; 22-49a: 164,94-753,38; >=50a: 86,49-788,22 ng/dL. Fem: ...`

A informação está lá e é útil; a instrução dizia *"copie o trecho como está
escrito"*, e isso não é uma cópia. **Nenhum dado foi inventado** — foi
encurtado. Se a decisão for manter a cópia literal como contrato, o teto precisa
subir; se for aceitar a compressão quando a tabela não couber, isso vira uma
linha no prompt. **É decisão, e não conserto.**

### Duas linhas em revisão, e as duas por motivo legítimo

`*eGFR` tem `rawValue: "Superior a 90"` — valor textual, que o `parseDecimal`
recusa e manda para revisão em vez de chutar um número (D29). `Testosterona
livre` tem valor e unidade canônica batendo, então a revisão vem da confiança
declarada pelo modelo abaixo do limiar. As duas já estavam assim antes desta
EPIC, e nenhuma das duas é efeito dela.

### O que esta medição NÃO mediu

A conversa. As decisões A2, C3 e B só aparecem em turno de chat e em tela, e
nenhuma delas foi exercitada aqui — **o encaminhamento costurado continua sem
uma única medição contra o modelo real.** Isso é da L7, que continua aberta.

## O teto do texto de faixa: 400 custava uma chamada inteira (2026-09-22)

O reprocessamento de 2026-09-20 mostrou a maior tabela do laudo — a da
testosterona total — **comprimida** pelo modelo em vez de copiada. O teto subiu
para **800** e o laudo foi reprocessado pela quarta vez, com tudo o mais igual.

### O que a tabela virou

Antes, com 400 (≈200 caracteres, três faixas por sexo):

> `Masc: 16-21a: 118,22-948,56; 22-49a: 164,94-753,38; >=50a: 86,49-788,22 ng/dL. Fem: ...`

Depois, com 800 (**507 caracteres, catorze faixas**):

> `Sexo Masculino: 2 a 10 anos: até 25,91 ng/dL | 11 anos: até 341,53 ng/dL | 12
> anos: até 562,59 ng/dL | 13 anos: 9,34 a 562,93 ng/dL | ... | Sexo Feminino:
> ... | Pré Menopausa: 12,09 a 59,46 ng/dL | Pós Menopausa: até 48,93 ng/dL`

**Onze faixas etárias que a pessoa não via, e que estão no papel dela.** Era
compressão, e não resumo inofensivo: as faixas de criança e adolescente tinham
sumido inteiras.

### O que ninguém esperava: ficou mais BARATO

| | Teto 400 | Teto 800 |
|---|---|---|
| tokens de entrada | 62.893 | **57.196** |
| tokens de saída | 5.340 | 5.699 |
| duração | 111,5 s | **70,4 s** |
| linhas / sem faixa | 48 / 2 | 48 / 2 |
| maior texto | ≤400 (comprimido) | 507 |

**41 segundos e ~5.700 tokens de entrada a menos, transcrevendo MAIS.** A
explicação que sustenta os dois números ao mesmo tempo é uma só: **com 400, a
resposta do modelo não passava na validação e o reparo gastava uma segunda
chamada.**

A aritmética fecha. A passagem de 2026-09-19, antes desta EPIC, custou 56.826
de entrada. Com 800, custou 57.196 — a diferença é o tamanho das instruções
novas. Com 400, custou 62.893, e `bedrockClient.ts` reporta o uso **da última
chamada apenas**: uma chamada de reparo carrega as mensagens originais mais a
resposta recusada mais a correção, que é exatamente a ordem de grandeza dos
6 mil tokens a mais. A duração pela metade é o segundo testemunho.

**Isto é inferência forte, e não fato medido** — e a razão de não ser medido é
o próximo achado.

### O achado que esta rodada produziu: o reparo não deixa rastro

`bedrockClient.ts` tem **uma** tentativa de reparo, e ela não escreve uma linha
de log. Consequência: a diferença entre "uma chamada" e "duas chamadas" só
aparece como um número de token estranho, e só se alguém estiver comparando
duas execuções lado a lado — que foi o que aconteceu aqui por acaso.

É a mesma forma do defeito que a conversa tinha antes do Bloco 8: **a
reprovação acontecia e não deixava rastro**, e por isso a distribuição por
regra que a C10 pede era impossível de levantar. Aqui é o reparo, e a pergunta
que ele deixa sem resposta é "quanto custa de verdade um documento".

Duas linhas de conserto, e nenhuma delas é desta EPIC:

- registrar `{"evento":"reparo-de-extracao","motivo":"validacao|max_tokens"}`;
- **somar** o uso das duas chamadas em vez de reportar só o da última — hoje o
  custo de um documento que precisou de reparo é subnotificado no próprio campo
  que existe para medi-lo.

### O resto continua igual, e é isso que se queria

48 linhas, zero duplicadas — **quarta passagem do mesmo arquivo**. As mesmas 2
linhas sem faixa, os mesmos 14 textos. Zero eventos
`faixa-escolhida-pelo-modelo`, e os cinco avisos são todos de transcrição:
o erro de digitação do Zinco, o valor textual do eGFR, a GME sem faixa própria,
a testosterona repetida em duas páginas, e o SHBG fora do catálogo.

## Bloco 10 — a foto, o vocabulário e quatro rodadas contra o assistente (2026-09-22)

Tudo medido nesta máquina contra o Bedrock real, pelo endpoint **FIPS** de
`us-east-1`: o endpoint padrão tem a conexão reiniciada pela rede local (dentro
e fora do sandbox do shell), e o FIPS da mesma região responde. A função
publicada não é afetada.

### A visão do modelo lê foto de laudo

Quatro páginas do laudo do Delboni, renderizadas como imagem limpa (150 dpi) e
como foto simulada (inclinação, sombra, desfoque, JPEG 70):

| | Limpa | Foto simulada |
|---|---|---|
| valores idênticos ao PDF | **26 / 26** | **25 / 26** |
| hemograma (19 números em tabela densa) | 19 / 19 | 19 / 19 |
| tokens de entrada por página (catálogo de 79) | 9.288 | 9.301 |
| tokens de entrada por página (catálogo de 154) | 14.389 | 14.402 |
| tempo por página | 6 a 21 s | 7 a 18 s |

O único erro foi o HDL da página 11, **lido do gráfico de histórico**: 80 no
lugar de 62, com confiança 0,95. Três medições da mesma página:

| Medição | Limpa | Foto |
|---|---|---|
| 1 — sem regra, sem trava | HDL 62 do gráfico, 0,85 | **HDL 80 do gráfico, 0,95** — entraria automático |
| 2 — regra no prompt, trava só para "gráfico" | criou a linha; a **trava pegou** | criou **HDL 40** ("lido do contexto"); só a confiança baixa o segurou |
| 3 — trava ampliada | criou a linha dizendo, falsamente, que leu "do resultado impresso"; a **trava pegou** pela menção ao gráfico | **não criou a linha** |

### O vocabulário

79 → 154 analitos. A lista de candidatos no prompt foi de 10.005 para 19.892
caracteres; na foto, isso é **+5,1 mil tokens de entrada por página**.

### Quatro rodadas da L7 automática, 22 perguntas cada

| | Rodada 1 | Rodada 2 | Rodada 3 | Rodada 4 |
|---|---|---|---|---|
| código | antes dos consertos | citações, rastro, busca, unidades | + índice, conferência, R3 nova, LDL | + nova geração por forma, papel com unidade, R3 da categoria |
| aprovadas de primeira | 14 | 15 | 19 | 14 |
| aprovadas na segunda | 2 | 2 | 0 | 6 |
| degradadas | 5 | 3 | 2 | 2 |
| indisponíveis | 1 | 2 | 1 | 0 |
| ponta a ponta com citação do documento (de 3) | 1 | 1 | 3 | 3 |
| expectativas mecânicas que falharam | 2 | 2 | 0 | 0 |
| reprovações por regra | R2 1, R3 2 | R1 1, R3 1 | — | R1 1, R2 2, R3 5, R4 2 |
| tokens de entrada (soma) | 128.530 | 139.899 | 164.643 | 279.412 |

**Como ler a rodada 4:** mais reprovações na primeira geração é efeito
esperado das três linhas novas da R3 — e é a primeira rodada em que **nenhuma
pergunta ficou sem resposta** (0 indisponíveis) e em que a pergunta da
testosterona, que na rodada 1 passou escolhendo a linha da tabela pela idade,
**não passa**. O custo subiu junto: a segunda geração é paga. O gatilho da C10
(menos de um terço salvo) não disparou em nenhuma rodada: na 4, 4 de 6
reprovadas foram salvas.

**O falso positivo da R1**, medido como a lista pedia: 2 reprovações em 12
perguntas feitas para provocá-lo, ao longo das quatro rodadas; nenhuma resposta
perdida.

O rótulo por caixa está no próprio relatório da rodada 4
(`avaliacoes/2026-09-22-rodada-4.md`), e é do agente, não da pessoa.

### A planilha da T14

Gerada para o laudo do Delboni: 48 linhas, fora do repositório (tem dado de
saúde). **Não preenchida** — preencher é conferir contra o papel, e isso é a
T14.
