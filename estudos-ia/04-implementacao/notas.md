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
