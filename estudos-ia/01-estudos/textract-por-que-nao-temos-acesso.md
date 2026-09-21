# Por que não temos acesso ao Textract (diagnóstico, 2026-09-18)

Pergunta do usuário: **"o projeto integrou o Textract, mas eu não tenho acesso.
Por quê?"**

Resposta curta, e ela foi **medida nesta sessão**: a conta recusa o Textract no
nível da **conta**, não da permissão, não da região e não da cota. A mesma
recusa aparece em Comprehend e Transcribe, e **não** aparece em Bedrock,
Rekognition, S3 ou Service Quotas. A conta está no **plano gratuito** (`FREE`)
da AWS, e esse plano não dá acesso a um subconjunto de serviços. Essa é a causa
mais provável, e o que falta para fechá-la é uma resposta do Suporte da AWS ou a
troca para o plano pago — as duas coisas dependem do dono da conta, não do
código.

**Consequência prática hoje: nenhuma para o PDF, tudo para a foto.** A D19 já
tirou o Textract do caminho crítico do laudo digital. O que não existe neste
projeto enquanto isso não mudar é a leitura de **foto e documento escaneado**.

---

## 1. O que o repositório já faz

### Qual API é chamada, e como

`amplify/functions/extract-document-data/textractClient.ts` implementa **as duas
rotas**:

| Rota | API | Modo | Quando roda |
|---|---|---|---|
| imagem / tipo desconhecido | `DetectDocumentText` | **síncrona**, bytes na requisição | `chooseReadingPath(contentType) === 'textract-sincrono'` |
| PDF | `StartDocumentTextDetection` + `GetDocumentTextDetection` | **assíncrona**, objeto lido do S3 | fall-through do mesmo `extractText` |

O caminho assíncrono é completo: espera crescente de 2s a 15s, teto de 5 minutos
(metade do teto de 600s da Lambda) e paginação de `NextToken` até o fim. Nada de
`AnalyzeDocument` é chamado em lugar nenhum — ele só existe na política de IAM.

`documentText.ts` guarda a parte pura (`chooseReadingPath`, `blocksToExtractedText`)
separada do SDK, e essa é a única parte coberta por teste. **A parte que fala com
o serviço nunca foi exercitada contra o serviço.**

### O que o handler realmente usa

`handler.ts` decide antes de chamar:

```
chooseReadingPath(contentType) === 'modelo-direto'  →  source = { kind: 'pdf', bytes }
                                                        (vai direto ao Bedrock)
senão                                                →  extractText(...)  (Textract)
```

Ou seja: **no fluxo da tela de exames, o Textract só é alcançado por arquivo que
não seja `application/pdf`** — foto, escaneado, ou tipo que o S3 não soube
declarar. O ramo assíncrono de `textractClient.ts` é inalcançável por esse
caminho.

### Achado lateral, e ele é um defeito de verdade

`amplify/functions/chat-assistant/anexoPontual.ts` chama `extractText()` **sem
consultar `chooseReadingPath` antes**. Como `extractText` manda tudo que não for
`textract-sincrono` para `detectarPdfAssincrono`, **um PDF anexado no chat vai
para o Textract assíncrono** — contrariando o comentário do próprio arquivo, que
diz que PDF vai direto ao modelo.

Duas consequências, nenhuma delas corrigida aqui (isto é diagnóstico):

1. O anexo do chat **não usa a visão do modelo**; ele usa OCR e entrega texto.
2. Se o Textract fosse habilitado amanhã, o anexo PDF do chat **ainda falharia**:
   a política do `chatAssistantLambda` (`backend.ts:626`) concede só
   `DetectDocumentText` e `AnalyzeDocument`. Faltam as duas ações assíncronas.
   O erro seria `AccessDenied` — e o comentário ao lado da política diz
   explicitamente que o caminho assíncrono foi excluído de propósito.

### As permissões de IAM concedidas

`amplify/backend.ts:311-330` — `extractDocumentDataLambda`, as **quatro** ações,
`Resource: "*"`:

```
textract:DetectDocumentText
textract:AnalyzeDocument
textract:StartDocumentTextDetection
textract:GetDocumentTextDetection
```

`amplify/backend.ts:620-629` — `chatAssistantLambda`, **duas** ações síncronas.

A política da função de extração cobre exatamente o que o código chama. **IAM
não é o problema.**

### A versão do SDK

`@aws-sdk/client-textract` está em `package.json`. O `plan.md` da EPIC o
registra como devDep de backend, com a justificativa "único caminho gerenciado
na conta que já existe" — uma suposição que esta medição derruba.

---

## 2. Região e conta

Lido de `amplify_outputs.json` (gerado pelo deploy de hoje):

- **Região: `us-east-1`** (N. Virginia). É a mesma em `auth` e em `data`.
- Conta: `370586504317`, já registrada em `04-implementacao/notas.md`.
- A chamada desta sessão saiu pelo usuário IAM `CLIAmplify` — **outro
  principal**, não a role da Lambda. O erro é o mesmo nos dois, e é isso que
  descarta permissão.

---

## 3. As hipóteses, uma a uma

### (a) Região — **descartada**, e com um detalhe que importa

**Medido.** `aws textract list-adapters` (chamada de listagem; não processa
documento, não custa nada):

| Região | Resultado |
|---|---|
| `us-east-1` | `SubscriptionRequiredException` |
| `us-west-2` | `SubscriptionRequiredException` |
| `sa-east-1` | **o endpoint não existe** — `Could not connect to the endpoint URL: https://textract.sa-east-1.amazonaws.com/` |

**A documentação confirma.** A tabela oficial de endpoints do Textract lista 14
regiões comerciais mais duas de GovCloud: `us-east-1`, `us-east-2`, `us-west-1`,
`us-west-2`, `ap-south-1`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`,
`ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`,
`eu-south-2`.

> **`sa-east-1` (São Paulo) NÃO tem Amazon Textract.** Não é cota baixa, não é
> assinatura: não há endpoint.

Isso não explica o sintoma de hoje — o projeto está em `us-east-1`, que tem o
serviço — mas **é uma restrição de arquitetura que precisa ficar escrita**: se
algum dia houver razão de latência ou de residência de dado para mover este
backend para São Paulo, o Textract não vai junto.

Sobre a assimetria síncrono/assíncrono: a tabela de cotas do Textract dá números
diferentes por região (25 TPS de `DetectDocumentText` em `us-east-1` contra 1 TPS
em "Other Regions"), mas **não** mostra região que tenha as síncronas e não tenha
as assíncronas. A premissa de que "as assíncronas estão em menos regiões" não se
sustenta nessa tabela.

### (b) Permissão de IAM — **descartada**, por três razões independentes

1. A política da `extract-document-data` concede as quatro ações (seção 1).
2. O erro é `SubscriptionRequiredException`, **não** `AccessDeniedException`. São
   erros diferentes e vêm de camadas diferentes.
3. A chamada que falhou nesta sessão foi `ListAdapters`, feita pelo usuário IAM
   `CLIAmplify` — que **nem sequer tem** `textract:ListAdapters` concedido
   explicitamente. Se a avaliação de IAM tivesse acontecido, o erro teria sido
   `AccessDenied`. A recusa vem **antes** do IAM.

### (c) Conta nova / cota inicial zerada — **descartada**

**Medido.** `aws service-quotas list-service-quotas --service-code textract
--region us-east-1` respondeu 200, e os valores são os **padrões públicos**, não
zero:

| Cota | Valor na conta | Padrão documentado (`us-east-1`) |
|---|---|---|
| Async `DocumentTextDetection` — jobs concorrentes | 600 | 600 |
| `StartDocumentAnalysis` TPS | 25 | — |
| Async `DocumentAnalysis` — jobs concorrentes | 600 | 600 |

Cota não é o impedimento. E o sintoma de cota é `ThrottlingException` ou
`LimitExceededException`, nunca `SubscriptionRequiredException`.

### (d) SCP / organização / conta de laboratório — **descartada**

**Medido.** `aws organizations describe-organization` →
`AWSOrganizationsNotInUseException: Your account is not a member of an
organization.`

Sem organização não há Service Control Policy. Não é conta AWS Academy nem conta
filha de uma organização com política restritiva.

### (e) Erro de outra natureza lido como falta de acesso — **descartada**

A chamada que falha é `ListAdapters`, que **não recebe documento nenhum**. Não há
formato de arquivo, número de página nem tamanho envolvidos. O erro não pode ser
"PDF de múltiplas páginas na API síncrona" nem "tipo não suportado".

(Registrando o limite real de todo modo, porque ele continua valendo para quando
o serviço existir: as operações **síncronas** do Textract aceitam JPEG, PNG, PDF
e TIFF, e processam **uma página só**; PDF de várias páginas exige a API
assíncrona lendo do S3. O código já trata isso corretamente.)

### (f) A hipótese que sobra: o plano da conta — **sustentada, não provada**

**Medido.** `aws freetier get-account-plan-state`:

```
accountPlanType:              FREE
accountPlanStatus:            ACTIVE
accountPlanRemainingCredits:  117,02 USD
accountPlanExpirationDate:    2026-10-25
```

**Medido.** O mesmo usuário IAM, na mesma região, no mesmo minuto:

| Serviço | Chamada de listagem | Resultado |
|---|---|---|
| Textract | `list-adapters` | `SubscriptionRequiredException` |
| Comprehend | `list-document-classifiers` | `SubscriptionRequiredException` |
| Transcribe | `list-transcription-jobs` | `SubscriptionRequiredException` |
| Rekognition | `list-collections` | **200 OK** |
| Bedrock | invocação real (tarefa 1) | **funciona** |
| S3, DynamoDB, Service Quotas, STS, Free Tier | várias | **funcionam** |

**A documentação diz** (AWS Billing, *Explore AWS services with AWS Free Tier*):

> "free account plans don't have access to certain AWS services that would
> rapidly consume the entire AWS Free Tier credit amount"

e manda consultar as FAQs para a lista. **A lista nominal não é publicada** — nem
a FAQ nem a página de Free Tier enumera os serviços excluídos, e nenhuma das duas
cita o Textract. Então:

- **É fato medido** que a conta está no plano `FREE` e que três serviços recusam
  no nível de conta enquanto outros aceitam.
- **É hipótese**, e a mais econômica, que a recusa venha do plano `FREE`. A AWS
  não publica a lista que provaria isso.

Uma hipótese concorrente, que a medição **não** elimina: contas novas às vezes
precisam de "activation" adicional de serviços específicos, e o mesmo
`SubscriptionRequiredException` aparece em relatos de Textract no re:Post
inclusive com conta já verificada. Como o plano da conta é `FREE` e o prazo dele
vence em 2026-10-25, as duas hipóteses apontam para a mesma ação.

**O que a medição descarta com segurança:** região, IAM, cota e SCP. Restam plano
da conta e ativação pendente — as duas fora do código.

---

## 4. Como confirmar de vez (o usuário executa)

Cada passo é de leitura ou de console; nenhum publica ambiente.

1. **Abrir o console do Textract em `us-east-1`** (https://console.aws.amazon.com/textract/home?region=us-east-1).
   Se a página redirecionar para "Complete your account setup" ou mostrar aviso de
   plano, **isso é a prova direta** e o texto do aviso é a resposta.
2. **Billing → Free Tier → account plan.** Conferir se a tela nomeia serviços
   restritos. Se nomear o Textract, fecha a questão.
3. **Abrir um caso no Suporte da AWS**, categoria *Account and billing*, com o
   texto exato: `SubscriptionRequiredException: The AWS Access Key Id needs a
   subscription for the service`, serviço Amazon Textract, conta e região
   `us-east-1`, e a observação de que Comprehend e Transcribe devolvem o mesmo e
   Bedrock e Rekognition não. Caso de conta e cobrança é atendido no plano
   Basic — este é o passo que dá resposta oficial.
4. **Se o Suporte disser que é o plano:** trocar para o *Paid account plan*
   mantém os créditos restantes e libera os serviços. **É decisão de custo do dono
   da conta, não do código** — e precisa de cartão, com risco de cobrança depois
   que os 117 USD acabarem ou vencerem em 2026-10-25.
5. **Depois de qualquer mudança, reconferir sem gastar:** `aws textract
   list-adapters --region us-east-1`. Ela não processa documento e não custa. Se
   voltar `{"Adapters": []}` em vez do erro, o serviço está liberado.
6. **Só então** medir de verdade: uma `DetectDocumentText` contra uma foto de
   laudo (dentro das 1.000 páginas/mês do trial de 3 meses, se ele estiver
   ativo) e o cruzamento com a leitura do modelo que o estudo
   `leitura-de-documento.md` deixou registrado como **não medido**.

---

## 5. A alternativa: a visão do próprio modelo

O usuário observou, e está certo: *"de forma provisória, os Modelos inseridos nos
agentes têm a capacidade de fazer leitura de imagem e pdf."*

### O que o repositório já faz nesse sentido

**PDF: já está pronto e medido.** `bedrockClient.ts` monta o bloco de documento
do Converse:

```
{ document: { format: 'pdf', name: 'laudo', source: { bytes: source.bytes } } }
```

A D19 mediu contra laudo real: 41 analitos, 35 segundos, vírgula decimal e ponto
de milhar preservados. Esse é o caminho normal da tela de exames hoje.

**Imagem: não existe.** Não há nenhum `{ image: ... }` em lugar nenhum do
backend. Foto de laudo, hoje, só teria o Textract — que é o que não responde.
Fechar esse buraco é **acrescentar um ramo de `ImageBlock`** ao
`blocosDoDocumento`, não trocar de arquitetura.

**Chat: usa OCR, não visão.** Ver o achado da seção 1: `anexoPontual.ts` passa
tudo pelo `extractText`. O anexo do chat não exercita a visão do modelo em
nenhum formato.

### O que o Converse aceita (documentação oficial)

`DocumentBlock.format`, valores válidos:
`pdf | csv | doc | docx | xls | xlsx | html | txt | md`

`ImageBlock.format`, valores válidos:
`png | jpeg | gif | webp`

Restrições documentadas que importam:

- **PDF: máximo de 100 páginas por requisição** nos modelos Claude
  (*API restrictions*, Bedrock User Guide). Laudo de laboratório não chega perto.
- **`DocumentBlock.name`: 1 a 200 caracteres**, só alfanumérico, espaço, hífen,
  parênteses e colchetes. A própria doc avisa que **o campo é vulnerável a
  injeção de prompt** e recomenda nome neutro. O código usa `'laudo'` — correto.
- O tamanho máximo por requisição não está numa página oficial única; relatos
  convergem para poucos MB por arquivo. **Não medimos.** O laudo de 836 KB da
  D19 passou; o teto real deste projeto continua desconhecido.
- **O guardrail não vê o bloco de documento.** Já medido e registrado na D20
  (`guardrailCoverage` protegeu 35 de 62 caracteres, e os 35 eram o texto nosso).
  Vale igual para um bloco de imagem: **a proteção contra instrução plantada
  dentro do papel é a instrução de sistema mais o schema estrito, não o
  guardrail.**

### A diferença que importa para este projeto

| | Textract | Visão do modelo |
|---|---|---|
| devolve | texto por `LINE`, com `Page`, `Geometry` e `Confidence` **por palavra** | interpretação já estruturada |
| rastro | palavra → caixa na página → confiança numérica | nenhum; o número aparece sem origem |
| falha típica | erra caractere — os três pontos de código do micro (`µ`/`μ`/`u`), que a D28 registra como incógnita justamente por não ter sido medido | **omite linha em silêncio** — 47/47/42/47 em quatro execuções |
| erro de número | possível | **nenhum medido em quatro execuções** |
| segunda fonte | independente | é a mesma fonte |

**O que se perde ao trocar um pelo outro:**

1. **A âncora posicional.** O Textract diz *em que ponto da página* está cada
   palavra. O modelo não diz. "De onde saiu esse número" deixa de ter resposta
   verificável mecanicamente.
2. **A confiança por palavra.** O `Confidence` do Textract é um número do
   serviço. A confiança que o projeto usa hoje (`CONFIDENCE_THRESHOLD` em
   `analyteNormalizer.ts`) é do **mapeamento** analito→LOINC, não da leitura do
   caractere. São coisas diferentes, e só uma delas sobrevive.
3. **A segunda fonte independente.** O cruzamento "o texto bruto tem analito que
   o modelo não trouxe?" era o remédio exato para o defeito que
   `leitura-de-documento.md` mediu — a omissão. Sem Textract, o remédio contra
   omissão é só reprocessar e contar.
4. **A tarefa 1.1 do roadmap**, literalmente: *"OCR no upload (Textract),
   guardando o texto bruto para rastreabilidade"*. O artefato `ocr.txt` que
   `writeTextArtifact` grava **não existe** no caminho de PDF nativo, e
   `extractedTextKey` fica vazio. Isso já é verdade hoje, e está escrito no
   comentário do `s3Reader.ts`.

**O que se ganha:** o caminho existe, foi medido, custa entrada de token e não
custa um serviço a mais; preserva vírgula decimal e ponto de milhar, que é
exatamente o que a D23 pede; e dispensa uma dependência que a conta não tem.

### Dá para preservar a rastreabilidade de outro jeito?

Em parte, e o projeto já escolheu o substituto: **`rawValue` e `rawUnit` por
linha**. Cada número gravado carrega a grafia literal que o modelo transcreveu do
papel. Isso permite auditar "o banco diz 5,19 e o papel diz 5,19", que é a
pergunta que mais importa.

O que **não** dá para substituir sem o Textract:

- **posição na página** — nenhum substituto;
- **prova de que nada foi omitido** — só reprocessamento e contagem visível, que
  é o remédio que `leitura-de-documento.md` já prescreveu (o id determinístico da
  tarefa 6 faz a segunda passagem *somar*, não duplicar);
- **texto bruto completo como artefato** — parcialmente recuperável: bastaria uma
  segunda chamada ao modelo pedindo **transcrição literal, sem estrutura**, e
  gravar o resultado em `ocr.txt`. Custa uma invocação a mais por documento e
  **não é fonte independente**, porque é o mesmo modelo. Isso precisa ficar
  escrito onde quer que a rastreabilidade seja reivindicada.

### Veredito

**Viável, e já é a realidade do PDF.** O que falta é o ramo de imagem. Enquanto o
Textract não responder:

- **PDF digital**: funciona hoje, medido, sem mudança.
- **Foto e escaneado**: não funcionam. O conserto é um `ImageBlock` com
  `png|jpeg|gif|webp` — trabalho pequeno, mas **não medido** contra foto de laudo
  de verdade, e a qualidade da leitura de foto pelo modelo continua sendo a
  pergunta aberta que `leitura-de-documento.md` deixou em "o que continua sem
  resposta".
- **Rastreabilidade**: passa a ser `rawValue`/`rawUnit` mais contagem visível de
  linhas. A tarefa 1.1 do roadmap precisa ser reescrita para dizer isso, ou fica
  prometendo um texto bruto que o sistema não produz.

---

## Como isto foi medido

Todas as chamadas desta sessão foram **somente leitura** e nenhuma processou
documento: `sts get-caller-identity`, `freetier get-account-plan-state`,
`service-quotas list-service-quotas`, `organizations describe-organization`,
`textract list-adapters` (us-east-1, us-west-2, sa-east-1),
`comprehend list-document-classifiers`, `transcribe list-transcription-jobs`,
`rekognition list-collections`. Nenhum recurso foi criado, alterado ou apagado.
Nenhum ambiente foi publicado.

## Fontes

- [Amazon Textract endpoints and quotas](https://docs.aws.amazon.com/general/latest/gr/textract.html) — a lista de regiões, e a ausência de `sa-east-1`
- [Explore AWS services with AWS Free Tier](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier.html) — free account plan e serviços sem acesso
- [AWS Free Tier FAQs](https://aws.amazon.com/free/free-tier-faqs/) — não enumera os serviços excluídos
- [DocumentBlock](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_DocumentBlock.html) — formatos e restrição de `name`
- [ImageBlock](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ImageBlock.html) — `png | jpeg | gif | webp`
- [Bedrock API restrictions](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-api-restrictions.html) — 100 páginas de PDF por requisição
- [Access to Textract on Free Version](https://repost.aws/questions/QU0ApvOZQ7RbeXuJGRnqCmDg/access-to-textract-on-free-version) e [Textract not accessible – account already verified](https://repost.aws/questions/QUkxZ21P4ZRPehGKx4mnMVSQ/textract-not-accessible-account-already-verified) — o mesmo erro relatado por terceiros

## Documentos relacionados

- `estudos-ia/01-estudos/leitura-de-documento.md` — a medição de estabilidade, e o cruzamento registrado como não medido
- `estudos-ia/04-implementacao/notas.md` — o primeiro registro do erro, 2026-09-17
- `estudos-ia/00-visao/decisoes.md` — D19 (PDF nativo), D20 (guardrail não vê o documento), D23 (vírgula decimal)
- `estudos-ia/00-visao/roadmap.md` — tarefa 1.1, que promete o texto bruto
