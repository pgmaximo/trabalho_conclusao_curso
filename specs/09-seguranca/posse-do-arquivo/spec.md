# EPIC: A função confere de quem é o arquivo antes de lê-lo

## 1. Identificação

- **Origem:** achado de segurança em revisão de código, **pré-existente**. Não
  veio de teste, de medição nem de incidente. Nenhum arquivo foi lido
  indevidamente até onde se sabe; esta EPIC fecha a porta antes que alguém a use.
- **Relação com as EPICs entregues:** `extracao-de-documentos` (06) criou a
  leitura; o conserto de 2026-09-18 (`documentKey.ts`) fez a Lambda **ler** a
  chave gravada pelo upload em vez de remontá-la; `conversa-sobre-o-exame` (07)
  criou o anexo pontual do chat (D15). **Nada disso é refeito.** Esta EPIC
  acrescenta a conferência de posse nos dois leitores.
- **Backend afetado:** `amplify/functions/extract-document-data/`
  (`handler.ts`, `s3Reader.ts`, `documentKey.ts`, `motivoDeFalha.ts`, e um
  módulo novo), `amplify/functions/chat-assistant/anexoPontual.ts` e um
  módulo puro novo em `amplify/storage/`.
- **App afetado:** `src/services/upload.ts` e
  `src/services/chatAttachmentService.ts` (quem envia o arquivo). Nenhuma tela
  muda de layout; muda uma frase da lista fechada de falhas.
- **Não afetado:** `amplify/backend.ts`. As permissões das funções continuam as
  mesmas, e o conserto não depende de mexer nelas (ver §5.3).
- **Ator:** duas pessoas com conta no aplicativo, A e B. A tenta fazer a função
  ler um arquivo de B.
- **Prioridade: P1.** A exploração é improvável (§2.3), mas o que falta é
  **autorização**, e não um detalhe de robustez. Pela regra do `auth.ts` do chat,
  um caminho que confia em identificador escolhido pelo chamador é uma porta
  aberta, "e nenhuma camada posterior recupera isso".
- **Sensibilidade: alta.** O dado do outro lado da porta é laudo de exame.

---

## 2. O achado

### 2.1 O caminho, passo a passo

1. `MedicalDocument` tem `allow.owner()`
   (`amplify/data/schemas/medical-documents.ts`). A pessoa cria e edita as
   **próprias** linhas, **e escreve o campo `s3Key` com o valor que quiser**.
2. A mutation `startDocumentExtraction` confere que o documento é de quem chama
   (`row.owner !== owner`), e está certa. Mas confere a **linha**, e não o
   **arquivo** para o qual a linha aponta.
3. A `extract-document-data` lê `s3Key` da linha e valida só a **forma**
   (`chaveDoDocumento`: prefixo `medical-documents/`, sem `..`).
4. O papel da Lambda tem leitura em `medical-documents/*` **inteiro**
   (`grantReadWrite(extractDocumentDataLambda, 'medical-documents/*')`). O IAM da
   função não passa pela política por dono do bucket, que vale para a
   credencial **da pessoa**, e não para a da função.
5. Então A cria uma linha sua com
   `s3Key = medical-documents/<identityId de B>/exams/<arquivo de B>`, dispara a
   leitura, e **os valores do laudo de B viram linhas de A**, legíveis por A na
   tela e na conversa.

### 2.2 O anexo do chat tem a mesma forma

`lerAnexo` recebe a chave **do corpo da requisição** e confere só a forma
(`chaveDeAnexoValida`: `chat-attachments/<um segmento>/<arquivo>`). A função do
chat lê `chat-attachments/*` inteiro. A manda a chave de um anexo de B, e o
modelo **lê o documento de B** e responde sobre ele para A. Nada fica gravado,
mas o conteúdo é entregue a quem não é dono.

O `lerAnexo` já recebe a identidade de quem chama (`_identity`), e **não a usa**.
O sublinhado é a marca do defeito.

### 2.3 Por que a exploração é improvável, e por que isso não basta

A precisa conhecer o **identityId** de B (um UUID do pool de identidades) **e** o
nome do arquivo no bucket, que também carrega um UUID (exames) ou um carimbo de
tempo com seis caracteres aleatórios (anexos). Nenhuma tela mostra essas chaves
para outra pessoa. Um vazamento de log, um print de tela ou um bug futuro que as
exponha basta para abrir a porta. A autorização não pode depender de a chave
ser segredo.

### 2.4 Os dois comentários que estão errados

- `documentKey.ts`: *"O fechamento de verdade e a politica do bucket."*
- `anexoPontual.ts`: *"o fechamento de verdade e a politica do bucket, que so
  concede leitura sob `chat-attachments/`"*.

A política do bucket (`allow.entity('identity')`) restringe a **pessoa**. A
função tem um papel próprio, com permissão sobre o prefixo inteiro, e é esse papel
que abre o objeto. O segundo comentário confunde "a função não lê fora de
`chat-attachments/`", que é verdade, com "a função não lê o anexo de outra
pessoa", que é falso.

---

## 3. Por que a solução mais direta não existe

A conferência natural seria "o identityId na chave é o de quem chama". A função
**não tem** esse identityId:

- o `owner` da linha e o token do chat carregam o `sub` do **pool de usuários**;
- a pasta do S3 é nomeada pelo `identityId` do **pool de identidades**;
- nenhuma API do Cognito converte `sub` em `identityId` sem o token de quem
  entrou. O cabeçalho de `documentKey.ts` conta o defeito de 2026-09-18, que
  nasceu exatamente de tratar um como o outro.

A informação que falta precisa, então, **viajar com o arquivo**, gravada por
alguém em quem se pode confiar.

---

## 4. O que muda para a pessoa

### Hoje

| A pessoa faz | E recebe |
|---|---|
| envia um laudo | a leitura, como antes |
| anexa um laudo no chat | a resposta sobre ele |
| (A) cria linha com a chave de um laudo de B e dispara a leitura | **os valores de B, gravados como seus** |
| (A) manda no chat a chave de um anexo de B | **uma resposta sobre o documento de B** |

### Depois desta EPIC

| A pessoa faz | E recebe |
|---|---|
| envia um laudo | a leitura, como antes |
| anexa um laudo no chat | a resposta sobre ele, como antes |
| (A) cria linha com a chave de um laudo de B e dispara a leitura | falha com motivo, **sem que o arquivo chegue ao modelo**, e nada gravado |
| (A) manda no chat a chave de um anexo de B | a resposta **sem o anexo**, como qualquer anexo ilegível hoje |
| toca em "Tentar de novo" num documento enviado **antes** desta EPIC | *"Este arquivo foi enviado antes de o aplicativo registrar quem o enviou. Envie o arquivo de novo para que ele possa ser lido."* |

**O que continua igual, e é obrigação desta EPIC que continue:** todo documento
já lido mantém as linhas que tem, e continua listado, aberto e baixado como
antes. A conversa continua lendo resultados do banco, e não do arquivo. Nenhum
envio novo fica mais lento de forma perceptível: a mudança é um cabeçalho a mais
no mesmo `PutObject`.

---

## 5. O desenho

### 5.1 O contrato: um metadado de objeto com o `sub` de quem enviou

Todo arquivo que o aplicativo envia para `medical-documents/`,
`chat-attachments/` e `health-imports/` passa a levar o metadado de objeto do S3

```
x-amz-meta-sub-de-quem-enviou: <sub do pool de usuários de quem enviou>
```

gravado pelo próprio `uploadData` do Amplify (`options.metadata`). O nome da
chave mora em **uma constante só**, num módulo puro importado pelo aplicativo e
pelas duas funções. Um nome escrito duas vezes divergiria em silêncio, e a
divergência apareceria como "todo documento falha".

**Por que o metadado é confiável, e é o argumento central desta EPIC:** só o
dono escreve na própria pasta. A regra `medical-documents/{entity_id}/*` com
`allow.entity('identity')` vira uma política de IAM que só concede `PutObject`
sob o identityId de quem está autenticado. Então o metadado de um objeto na
pasta de B **foi escrito por B**. B pode escrever o que quiser nele, inclusive o
`sub` de A, mas isso seria B entregando o próprio arquivo a A, e não A tomando o
arquivo de B. O que o metadado garante é exatamente o que falta: **o objeto
concorda em ser lido para aquele dono**.

### 5.2 A conferência, nos dois leitores

- **Extração:** o `sub` esperado sai do `owner` da linha (`<sub>::<username>`,
  o formato que o `start-document-extraction` já usa para conferir a linha).
  Metadado igual: segue. Metadado ausente ou diferente: `markFailed` com o
  motivo novo, **antes** de os bytes irem ao modelo e antes de qualquer
  gravação.
- **Chat:** o `sub` esperado sai **do token** (`identity.sub`), nunca do corpo,
  pela regra do `auth.ts`. Metadado ausente ou diferente: o anexo vira ausência
  (`null`), o mesmo caminho que um anexo ilegível já percorre. O turno não cai.

Nos dois casos a conferência mora numa função **fora do handler**, testável, e
o handler só a chama. Uma varredura em teste trava que nenhum arquivo das duas
funções chama o leitor do S3 por outro caminho.

### 5.3 Alternativas recusadas

| Alternativa | Por que não |
|---|---|
| Mandar o identityId junto na mutation ou no corpo do chat | É identificador escolhido pelo chamador, e é justamente isso que falha hoje. |
| Trocar a autorização da mutation para o pool de identidades (IAM), que expõe o `cognitoIdentityId` | A função passaria a saber o identityId e deixaria de saber o `sub`, e a conferência de dono da **linha**, que hoje funciona, se perderia. Duas autorizações misturadas no mesmo modelo, para trocar uma lacuna por outra. |
| Estreitar o IAM da função por pessoa (política de sessão com o prefixo do identityId) | Precisa do identityId, que a função não tem. |
| Uma Lambda de upload que recebe o arquivo e o grava no lugar certo | Troca o caminho de envio inteiro, com os dois ramos (web e nativo) e o upload em partes, para obter a mesma garantia que um cabeçalho dá. |
| Metadado com o identityId, e não com o `sub` | A função não tem o identityId de ninguém para comparar. O `sub` ela tem, e dos dois lados. |

### 5.4 Os objetos antigos, sem metadado

**Decidido: falham fechado.** Um objeto sem o metadado é tratado como de outro
dono. A frase para a pessoa pede o reenvio (motivo novo
`arquivo-sem-dono`), no mesmo desenho do `arquivo-sem-chave` que o conserto de
2026-09-18 já usa para linhas antigas.

**O alcance real, medido no código, e ele é pequeno:**

- documento **já lido** (`SUCCEEDED`, `NO_RESULTS`) não tem botão de releitura
  nesta versão do aplicativo. As linhas estão no banco e continuam lá;
- documento que **falhou** antes desta EPIC mostra "Tentar de novo". Esse passa a
  falhar com o motivo novo, e a frase diz o que fazer;
- documento de **antes de 2026-09-18** já falha com `arquivo-sem-chave`, e
  continua assim. A chave ausente é conferida primeiro;
- **anexo do chat** não tem legado: ele é enviado no mesmo turno em que é lido;
- **importação de wearable** não tem legado: cada importação é lida uma vez só,
  na criação.

**Recusado, e por quê:**

| Alternativa | Por que não |
|---|---|
| Aceitar objeto sem metadado se for anterior à data da publicação (`LastModified`) | Deixa a porta aberta exatamente para os arquivos que já existem, que são os únicos que um atacante pode mirar hoje. |
| Um script que grava o metadado nos objetos antigos | O único lugar que associa uma pasta de identityId a um `sub` é o `s3Key` das linhas, **o dado não confiável do achado**. Preencher o metadado a partir dele repetiria o defeito com um passo a mais. Sem API que converta um no outro, o script dependeria de conferência manual, pasta por pasta, para poupar o reenvio de poucos documentos de contas de teste. |
| Aceitar o objeto antigo e só registrar no log | É o comportamento atual, com um log a mais. |

**O que isto implica para quem vier depois (Bloco 11, regravação):** se a
releitura de um documento já lido passar a existir, o documento antigo falhará
nela, e a tela de `FAILED` esconde a seção de resultados. A conferência de posse
precisa continuar **antes** de qualquer escrita ou apagamento de linha, para que
a falha não custe dado. Registrado também no `plan.md`.

---

## 6. Mapa de dados

| Onde | Campo | Quem escreve | Quem lê |
|---|---|---|---|
| objeto S3 em `medical-documents/`, `chat-attachments/`, `health-imports/` | metadado `sub-de-quem-enviou` | o aplicativo, no `uploadData`, com o `userId` de `getCurrentUser()` | `extract-document-data` e `chat-assistant` |
| `MedicalDocument.extractionError` | copy de `arquivo-sem-dono` | `extract-document-data` | a tela de detalhe, pela lista fechada |

Nenhum campo novo no DynamoDB. Nenhuma alteração de esquema do Amplify Data.

**Por que o nome é minúsculo e com hífen:** o S3 grava a chave de metadado em
minúsculas. Um nome com maiúscula seria salvo de um jeito e procurado de outro,
e **todo** documento falharia. Um teste trava a forma.

---

## 7. Requisitos não-funcionais

- **Nada do arquivo de outra pessoa chega ao modelo.** A conferência acontece
  antes do Bedrock nos dois leitores.
- **O log não carrega identificador de pessoa.** O evento de recusa leva o
  motivo e o `documentId`; nem `sub`, nem chave, nem nome de arquivo.
- **A mesma frase para "sem metadado" e "de outra pessoa".** A pessoa legítima
  com arquivo antigo e quem tenta ler arquivo alheio recebem o mesmo texto; o
  log distingue os dois para quem opera.
- **Custo zero de chamada.** O metadado volta na resposta do mesmo `GetObject`
  que já é feito; nenhum `HeadObject` a mais.
- **Web e nativo.** Os dois ramos do `uploadFileToS3` e o upload em partes do
  Amplify repassam `options.metadata` (conferido no código do
  `@aws-amplify/storage` 6.14: `putObjectJob` e `initialUpload` do multipart).
  O CORS do bucket gerado pelo Amplify aceita qualquer cabeçalho
  (`allowedHeaders: ['*']`), então o `x-amz-meta-*` do navegador passa.

---

## 8. O que esta EPIC NÃO faz

- **Não muda `amplify/backend.ts`.** A `extract-document-data` continua com
  `grantReadWrite` em `medical-documents/*`, embora hoje só leia (`textKey:
  null`). Estreitar para leitura é menor privilégio e vale fazer, mas é outra
  mudança, e o arquivo está em edição pelo Bloco 11.
- **Não põe a conferência na `analyze-health-import`.** A importação já amarra
  cada chave ao `importId` da própria linha (`isFileKeyValid`), que é um UUID
  único na tabela, e não tem o mesmo buraco. O metadado passa a ser gravado
  também lá, porque o `uploadFileToS3` é compartilhado, e isso deixa a
  conferência pronta para ser ligada depois com uma linha, se se quiser a mesma
  garantia nas três portas.
- **Não esconde a existência de um objeto.** Quem acerta uma chave inteira de
  outra pessoa descobre que ela existe: a falha é `arquivo-sem-dono`, e não o
  `leitura-falhou` de uma chave inexistente. Acertar a chave exige adivinhar um
  UUID; o custo de esconder isso (mesma frase para objeto inexistente e para
  falha interna) seria mentir à pessoa legítima sobre por que o documento dela
  falhou.
- **Não trata o avatar.** `avatars/` não é lido por função nenhuma.
- **Não migra objetos antigos** (§5.4).

---

## 9. Critérios de aceite

### O achado

1. Documento cuja chave aponta para um objeto com o metadado de **outro** `sub`
   termina em `FAILED` com a copy de `arquivo-sem-dono`, e os bytes não chegam
   ao modelo.
2. Documento cuja chave aponta para um objeto **sem** o metadado tem o mesmo
   resultado.
3. Anexo do chat de outro dono vira ausência; o turno responde sem ele.
4. O `sub` que o chat compara sai do **token** (`identity.sub`), e não do corpo.
5. Nenhum arquivo de `extract-document-data` ou `chat-assistant` lê o S3 sem
   passar pela conferência (varredura em teste).

### O envio

6. `uploadFileToS3` grava o metadado com o `userId` de quem está autenticado,
   nos dois ramos (web e nativo).
7. `uploadAnexoDoChat` grava o mesmo metadado.
8. O nome da chave é **um só**, minúsculo, e é o mesmo no aplicativo e nas
   funções.

### O legado e a tela

9. A copy nova diz o que houve e o que fazer, e é reconhecida por
   `ehCopyDeFalha` (a tela a mostra, e não a frase genérica).
10. Documento sem `s3Key` continua falhando com `arquivo-sem-chave`, e não com o
    motivo novo.

### Registro

11. Os dois comentários errados (§2.4) são corrigidos.
12. A decisão fica em `estudos-ia/00-visao/decisoes.md`.
13. `npm run validate` passa.
14. **Do usuário, depois da publicação do sandbox:** um laudo novo enviado pelo
    app é lido até `SUCCEEDED`, e o objeto mostra o metadado
    (`aws s3api head-object`). Sem isso, os critérios 1 a 8 provam a lógica, e
    não o encaixe com o S3 real.
