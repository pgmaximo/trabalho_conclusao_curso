# Site da feira e pesquisa de opinião: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao site do QR code a cara do app, com uma pesquisa de opinião de 11 perguntas que grava respostas anônimas na AWS e um painel para o grupo ler.

**Architecture:** O site continua HTML estático gerado por `scripts/site-publico/paginas.mjs` e publicado em zip no Amplify Hosting. Uma stack CloudFormation nova e separada (`suasaude-pesquisa`) guarda a tabela DynamoDB e uma Lambda com Function URL. A lista de perguntas é um módulo único usado pelo gerador de páginas e pela validação da Lambda.

**Tech Stack:** Node 20 (módulos `.mjs`), Jest (preset jest-expo, já transforma `.mjs`), AWS CLI, CloudFormation em JSON, DynamoDB, Lambda `nodejs20.x`, HTML/CSS/JS puro. Sem React, Tailwind nem bundler.

**Spec:** `docs/superpowers/specs/2026-10-24-site-feira-pesquisa-design.md`

## Global Constraints

- Endereço do site: `https://main.d3fx6eabnu0fdd.amplifyapp.com`. Amplify app `d3fx6eabnu0fdd`, branch `main`, região `us-east-1`, conta `370586504317`.
- Nomes de arquivo que não mudam: `index.html`, `baixar.html`, `privacidade.html`, `termos.html`. O texto de Termos e Política (`src/data/termosEPrivacidade.ts`) não é alterado.
- Stack nova `suasaude-pesquisa`, tabela `suasaude-feira-respostas` (chave `id`, sob demanda), Lambda com Function URL `AuthType NONE`, CORS só para o endereço do site, concorrência reservada 5.
- Não tocar em `amplify/`, em stacks `amplify-*`, nem nos user pools `us-east-1_7NZ46CF7S` (produção) e `us-east-1_CFEpevMNE` (sandbox). Não rodar `ampx`.
- A senha do painel nunca entra em arquivo versionado nem em teste: só pela variável de ambiente `PESQUISA_SENHA`, como parâmetro `NoEcho` da stack.
- A Lambda não registra o evento da requisição nos logs, não grava IP e não usa cookies.
- A pesquisa tem 11 perguntas (4 sobre o que achou, 3 de contexto e barreiras, 4 sobre a pessoa), uma por tela, mais uma tela de abertura que não é pergunta. **Não há telas de reação por funcionalidade**: o grupo apresenta o app antes. Escala de `usaria`: `Não usaria`, `Usaria pouco`, `Não sei`, `Usaria`, `Usaria muito`; escala de `impressao`: `Não gostei`, `Gostei pouco`, `Não sei`, `Gostei`, `Gostei muito`. Códigos e listas fechadas conforme a seção 5.1 do spec.
- Anúncios e venda de dados não aparecem em nenhuma opção da pesquisa.
- Download do APK nos dois lugares (início e fim), com clique registrado com `origem` `inicio` ou `fim`. O link do APK continua só na constante `APK` de `scripts/publicar-site-publico.mjs`.
- Visual: cores dos tokens do app (`#10794E`, `#E8F5EE`, `#F7F8F7`, `#141817`, `#55605C`, `#FFFFFF`, e a versão escura de `themeTokens.json`), IBM Plex Sans hospedada no zip, texto de 17 a 18 px, botões de resposta com 56 px ou mais, `prefers-color-scheme` e `prefers-reduced-motion` respeitados.
- Hero de `baixar.html`: título de no máximo 2 linhas, subtexto de no máximo 20 palavras, os dois botões visíveis sem rolar.
- Páginas novas sem travessão (`—` e `–`), sem ponto médio como separador e com no máximo um rótulo em caixa-alta em todo o site.
- Strings e comentários em português do Brasil; comentários no estilo do repositório (cabeçalho "Resumo do arquivo").
- Regras do projeto: TDD com falha vista de verdade antes de implementar; um EPIC por vez e parar ao fim para revisão; rodar só os testes tocados (o `npm run validate` só com autorização do Pedro); **não commitar**: ao fim de cada EPIC, mostrar a mensagem de commit e esperar aprovação; nunca dar push.

## Review Focus

1. Comentário livre com HTML ou `<script>`: o painel precisa mostrar como texto (Task 6).
2. Corpo inválido: JSON quebrado, base64, corpo enorme, campo desconhecido, valor fora da lista: a Lambda responde 400 sem lançar exceção (Task 2).
3. Mesma resposta enviada duas vezes (voltar, reenviar, recarregar a aba): atualiza o mesmo `id`, nunca duplica (Tasks 2 e 5).
4. Sem rede ou sem endereço da Function URL: a pesquisa mostra "Tentar de novo" sem perder respostas, e o download continua funcionando (Task 5).
5. Opções exclusivas em múltipla escolha (`nao_guardo`, `nenhuma`) marcadas junto com outras, e mais de 3 marcadas em `chamaram_atencao`: o formulário desmarca ou bloqueia, e a validação recusa a combinação (Tasks 1 e 5).

---

## EPIC 1: Perguntas e Lambda (só código e testes, sem AWS)

### Task 1: Módulo das perguntas e validação

**Files:**
- Create: `infra/site-pesquisa/pesquisa.mjs`
- Test: `__tests__/pesquisaPerguntas.test.ts`

**Interfaces:**
- Produces:
  - `VERSAO_DO_FORMULARIO: string` (`'1'`)
  - `ESCALA_IMPRESSAO` e `ESCALA_USO: readonly { codigo: string; texto: string }[]` (5 itens cada, ordem do spec)
  - `FUNCIONALIDADES: readonly { id: string; nome: string }[]` (7: `exames`, `assistente`, `remedios`, `vacinas`, `prevencao`, `agenda`, `smartwatch`; só o nome, sem frase)
  - `PERGUNTAS: readonly Pergunta[]`, 11 itens em ordem de tela, com `Pergunta = { id: string; bloco: 'A' | 'B' | 'C'; tipo: 'unica' | 'multipla' | 'texto'; titulo: string; apoio?: string; opcoes?: { codigo: string; texto: string }[]; exclusivas?: string[]; max?: number }`. Ids: `impressao`, `usaria`, `frequencia`, `chamaram_atencao` (`max: 3`, exclusiva `nenhuma`), `guarda_hoje`, `barreiras`, `modelo`, `idade`, `celular`, `remedio_em_casa`, `comentario`.
  - `validarEnvio(corpo: unknown): { ok: true; valor: { id: string; etapa: number; concluido: boolean; respostas: Record<string, string | string[]> } } | { ok: false; erro: string }`

- [ ] **Step 1: Write the failing tests** em `__tests__/pesquisaPerguntas.test.ts`:
  - `tem 11 perguntas, na ordem do spec, e nenhuma é de reação por funcionalidade`
  - `os códigos de cada pergunta batem com a seção 5.1 do spec` (compara listas literais de `impressao`, `usaria`, `frequencia`, `chamaram_atencao`, `guarda_hoje`, `barreiras`, `modelo`, `idade`, `celular`, `remedio_em_casa`)
  - `nenhuma opção de modelo fala em anúncio ou venda de dados` (varre `texto` e `codigo` de `modelo` por `/an[uú]ncio|public|vend/i`)
  - `aceita um envio parcial válido` (id UUID v4, `etapa: 3`, `concluido: false`, 3 respostas)
  - `recusa` (um caso por linha, `ok === false`): id que não é UUID; chave de resposta desconhecida; código fora da lista; `etapa` fora de 0..11; `chamaram_atencao` com 4 itens; `chamaram_atencao` com `['nenhuma','agenda']`; `comentario` com 281 caracteres; `guarda_hoje` com `['nao_guardo','papel']`; `barreiras` com `['nenhuma','privacidade']`; múltipla com item repetido; `respostas` que não é objeto; corpo que não é objeto
  - `aceita comentário de 280 caracteres e preserva HTML como texto` (`<script>` volta idêntico, sem alteração)

- [ ] **Step 2: Run** `npx jest pesquisaPerguntas` e confirmar FAIL por módulo inexistente (falha de verdade, não "nenhum teste encontrado").

- [ ] **Step 3: Implement** `pesquisa.mjs` com os exports acima. Os textos das frases das funcionalidades seguem a tabela do spec 5.1 e não prometem nada que o app não faça. `validarEnvio` não lança exceção para nenhuma entrada.

- [ ] **Step 4: Run** `npx jest pesquisaPerguntas` e confirmar PASS. Mutação: trocar `max` de `comentario` por 281 e ver o teste de 281 caracteres reprovar; desfazer.

### Task 2: Lambda (handler e repositório)

**Files:**
- Create: `infra/site-pesquisa/index.mjs`, `infra/site-pesquisa/repositorio.mjs`
- Test: `__tests__/pesquisaHandler.test.ts`

**Interfaces:**
- Consumes: `validarEnvio`, `VERSAO_DO_FORMULARIO` (Task 1).
- Produces:
  - `criarHandler(deps: { repositorio: Repositorio; senha: string; agora: () => Date; novoId: () => string }): (evento: EventoFunctionUrl) => Promise<{ statusCode: number; headers: Record<string, string>; body: string }>`
  - `Repositorio = { gravarResposta(item): Promise<void>; gravarClique(item): Promise<void>; listar(): Promise<object[]> }`
  - `handler` (export do Lambda): monta o repositório real (DynamoDB Document Client, importado só dentro dele, por `import()` dinâmico) lendo `process.env.TABELA` e `process.env.CHAVE_RESULTADOS`.
  - Evento: formato v2 da Function URL (`requestContext.http.method`, `headers` em minúsculas, `body` string, `isBase64Encoded`).

- [ ] **Step 1: Write the failing tests** com um repositório falso em memória:
  - `salvar grava a resposta com versão, criadoEm e atualizadoEm` (200 `{ ok: true }`)
  - `salvar duas vezes o mesmo id mantém o criadoEm e troca o resto` (o falso reproduz o `if_not_exists`: o teste confere que o handler passa `criadoEm` só na primeira gravação, via campo `primeira: boolean` do item)
  - `campo isca site preenchido responde 200 e não grava`
  - `clique grava origem inicio ou fim e recusa outra origem`
  - `listar sem a chave responde 401; com a chave errada responde 401; com a certa devolve { itens }`
  - `corpo inválido responde 400 sem lançar`: JSON quebrado, `body` ausente, base64 com `isBase64Encoded`, corpo com mais de 16 KB, ação desconhecida (404), método diferente de POST (405)
  - `não registra o evento nos logs` (espia `console.log`, `console.info`, `console.error` e confere que nenhum recebe o corpo, o cabeçalho nem o IP)

- [ ] **Step 2: Run** `npx jest pesquisaHandler` e confirmar FAIL por módulo inexistente.

- [ ] **Step 3: Implement** `index.mjs` (`criarHandler` e `handler`) e `repositorio.mjs` (`criarRepositorio(clienteDynamo, tabela)`: `UpdateItem` com `SET criadoEm = if_not_exists(criadoEm, :c)` para respostas, `PutItem` para cliques com id `clique-<novoId>`, `Scan` com paginação para `listar`). Comparar a chave com `crypto.timingSafeEqual`. Não adicionar cabeçalhos CORS na Lambda (o CORS é da Function URL).

- [ ] **Step 4: Run** `npx jest pesquisaHandler pesquisaPerguntas` e confirmar PASS. Mutação: remover a checagem da chave em `listar` e ver o teste de 401 reprovar; desfazer.

**Fim do EPIC 1:** relatório de fim de bloco (inclusive "o que achei de errado no plano") e mensagem de commit proposta. Parar.

---

## EPIC 2: Stack e script de implantação (ainda sem implantar)

### Task 3: Template CloudFormation, zip compartilhado e scripts

**Files:**
- Create: `infra/site-pesquisa/template.json`, `scripts/implantar-pesquisa.mjs`, `scripts/exportar-pesquisa.mjs`, `scripts/site-publico/zip.mjs`
- Modify: `scripts/publicar-site-publico.mjs` (extrair `crc32` e `criarZip` para `zip.mjs`, sem mudar o comportamento), `package.json` (scripts `pesquisa:implantar`, `pesquisa:exportar`)
- Test: `__tests__/pesquisaTemplate.test.ts`, `__tests__/siteZip.test.ts`

**Interfaces:**
- Produces: `criarZip(arquivos: Record<string, Buffer>): Buffer` em `zip.mjs` (mesma função que hoje está no publicador).
- Produces: template com parâmetro `ChaveResultados` (`NoEcho`, sem `Default`), saída `FunctionUrl`, Lambda com `Handler: index.handler`, runtime `nodejs20.x`, código inicial mínimo embutido (`ZipFile`) que o script de implantação substitui pelo zip real contendo `index.mjs`, `pesquisa.mjs` e `repositorio.mjs`.

- [ ] **Step 1: Write the failing tests**:
  - `siteZip`: `criarZip` gera um zip que o `unzip -t` ou um leitor mínimo no teste reabre, com os nomes e os bytes intactos (nome com acento incluído).
  - `pesquisaTemplate` (lê `template.json` com `JSON.parse`): tabela com `BillingMode` `PAY_PER_REQUEST` e chave `id`; Function URL com `AuthType` `NONE` e `Cors.AllowOrigins` exatamente `["https://main.d3fx6eabnu0fdd.amplifyapp.com"]`; `ReservedConcurrentExecutions` igual a 5; `ChaveResultados` com `NoEcho: true` e sem `Default`; a política da Lambda tem só `dynamodb:UpdateItem`, `dynamodb:PutItem` e `dynamodb:Scan` no ARN da tabela (nada de `*`, de `Delete` nem de recurso `*`); nenhuma chave `DeletionPolicy` ausente na tabela (usar `Retain`).

- [ ] **Step 2: Run** `npx jest siteZip pesquisaTemplate` e confirmar FAIL.

- [ ] **Step 3: Implement** `zip.mjs` (extração), `template.json`, e os dois scripts.
  - `implantar-pesquisa.mjs`: exige `PESQUISA_SENHA` (aborta com mensagem se faltar); lê a conta com `aws sts get-caller-identity` e aborta se não for `370586504317`; grava em memória o estado das stacks `amplify-*`; roda `aws cloudformation deploy --stack-name suasaude-pesquisa --capabilities CAPABILITY_IAM --parameter-overrides ChaveResultados=...` (a senha vai por variável, nunca impressa); sobe o zip com `aws lambda update-function-code` e espera `aws lambda wait function-updated`; imprime a `FunctionUrl`; compara o estado das stacks `amplify-*` antes e depois e falha se mudou; confere `aws cognito-idp describe-user-pool` dos dois pools.
  - `exportar-pesquisa.mjs`: faz o `Scan` pela AWS CLI e grava um CSV local (usa `paraCsv` da Task 6).

- [ ] **Step 4: Run** `npx jest siteZip pesquisaTemplate sitePublico` e confirmar PASS (o `sitePublico` existente prova que a extração do zip não quebrou nada). Mutação: trocar `Retain` e ver o teste do template reprovar; desfazer.

**Fim do EPIC 2:** relatório e mensagem de commit. Parar. **Ainda não implantar.**

---

## EPIC 3: Páginas

### Task 4: Visual novo, `baixar.html`, `index.html` e páginas de documento

**Files:**
- Create: `scripts/site-publico/estilo.mjs` (CSS e layout comuns), `scripts/site-publico/ativos.mjs`
- Modify: `scripts/site-publico/paginas.mjs`, `__tests__/sitePublico.test.ts`
- Test: `__tests__/sitePublico.test.ts`

**Interfaces:**
- Consumes: nada novo.
- Produces:
  - `ATIVOS: Record<string, string>` em `ativos.mjs`: nome publicado → caminho de origem relativo à raiz do repositório. Inclui as fontes `fonts/IBMPlexSans-400.ttf`, `fonts/IBMPlexSans-600.ttf`, `fonts/IBMPlexSans-700.ttf` (de `node_modules/@expo-google-fonts/ibm-plex-sans`), `logo.svg` (de `assets/images/logos/logo horizontal - HD.svg`), `favicon.png` e `telas/inicio.png` (o único print do app, no hero).
  - `gerarPaginas(dados)` com `dados.pesquisa?: { endpoint: string }` novo. Com `apk` e `pesquisa` presentes, devolve também `opiniao.html` e `resultados.html`.
  - Elementos que as tarefas seguintes usam: botões de download com `data-baixar="inicio"` e `data-baixar="fim"`.

- [ ] **Step 1: Write the failing tests** (atualizar o teste existente, que hoje afirma conjuntos exatos de arquivos):
  - o conjunto de páginas com `apk` e `pesquisa` é `baixar, index, opiniao, privacidade, resultados, termos`; sem `pesquisa` continua como hoje
  - `baixar.html` tem `data-baixar="inicio"` apontando para o APK, um link para `opiniao.html`, o aviso "Só para Android" e a imagem `telas/inicio.png` com texto alternativo
  - o `<h1>` de `baixar.html` tem no máximo 60 caracteres e o primeiro `<p class="lead">` tem no máximo 20 palavras
  - toda referência relativa (`src=`, `href=` para fonte/imagem, `url(`) das páginas geradas existe em `ATIVOS` ou é uma das páginas
  - `index.html`, `baixar.html`, `opiniao.html`, `resultados.html` não contêm `—` nem `–`
  - `privacidade.html` e `termos.html` continuam passando nos testes de conteúdo integral que já existem
  - `resultados.html` tem `<meta name="robots" content="noindex">`

- [ ] **Step 2: Run** `npx jest sitePublico` e confirmar FAIL nos casos novos.

- [ ] **Step 3: Implement** o layout novo (cabeçalho com `logo.svg`, rodapé sem ponto médio como separador, fonte Plex via `@font-face` com `font-display: swap`, tokens claro e escuro) e `baixar.html`/`index.html` conforme a seção 6.3 do spec. `paginaDeDownload` mantém os passos de instalação. A detecção de iPhone é um `<script>` curto que só troca o aviso e desabilita o botão; falha de detecção não bloqueia.

- [ ] **Step 4: Run** `npx jest sitePublico` e confirmar PASS.

### Task 5: `opiniao.html` e o fluxo da pesquisa

**Files:**
- Create: `infra/site-pesquisa/fluxo.mjs`
- Modify: `scripts/site-publico/paginas.mjs` (função `paginaDaPesquisa`)
- Test: `__tests__/pesquisaFluxo.test.ts`, `__tests__/sitePublico.test.ts`

**Interfaces:**
- Consumes: `PERGUNTAS`, `FUNCIONALIDADES`, `ESCALA_IMPRESSAO`, `ESCALA_USO` (Task 1); `ATIVOS` (Task 4).
- Produces em `fluxo.mjs` (funções puras, sem DOM, para o gerador embuti-las no HTML; `tela` vai de 0 a 10, uma por pergunta; a tela de abertura e a de agradecimento são só HTML):
  - `estadoInicial(): { tela: number; respostas: Record<string, string | string[]> }`
  - `escolher(estado, perguntaId: string, codigo: string): estado` (aplica a regra de opções exclusivas, de seleção única/múltipla e o `max` de `chamaram_atencao`: o quarto toque é ignorado)
  - `podeAvancar(estado, pergunta): boolean` (texto é opcional; as demais exigem resposta)
  - `avancar(estado): estado` e `voltar(estado): estado` (limites 0..10; `voltar` mantém as respostas)
  - `montarEnvio(estado, id: string): { acao: 'salvar'; id: string; etapa: number; concluido: boolean; respostas: object; site: '' }`

- [ ] **Step 1: Write the failing tests** em `pesquisaFluxo`:
  - `escolher em escala troca a resposta anterior`
  - `escolher em múltipla marca e desmarca`
  - `marcar nenhuma desmarca as outras e marcar outra desmarca nenhuma` (para `nao_guardo` e `nenhuma`)
  - `chamaram_atencao não passa de 3 escolhas` (o quarto toque não muda o estado; desmarcar uma libera de novo)
  - `voltar e avançar mantêm as respostas`
  - `podeAvancar é falso sem resposta e verdadeiro no comentário vazio`
  - `montarEnvio passa em validarEnvio` (para estados parcial e completo, `concluido` só na tela 10)
  - em `sitePublico`: `opiniao.html` contém o endpoint, uma pergunta por tela (as 11 como dados), a tela de abertura com o texto do spec, o botão "Tentar de novo", o aviso de pesquisa anônima, o `data-baixar="fim"`, `prefers-reduced-motion`, e rótulo `<label>`/`role` correto nas opções.

- [ ] **Step 2: Run** `npx jest pesquisaFluxo sitePublico` e confirmar FAIL.

- [ ] **Step 3: Implement** `fluxo.mjs` e `paginaDaPesquisa`. O `<script>` da página (JS puro) cuida de: sortear o `id` com `crypto.randomUUID()` e guardá-lo em `sessionStorage`; enviar a cada avanço; em erro mostrar "Tentar de novo" mantendo as respostas na tela; registrar `clique` ao tocar em `data-baixar`; avanço automático em escolha única depois de ~250 ms; deslizar a tela e encher a barra só se não houver `prefers-reduced-motion`. Quando `pesquisa.endpoint` for o valor de marcação, o envio mostra o erro de envio em vez de falhar em silêncio.

- [ ] **Step 4: Run** `npx jest pesquisaFluxo sitePublico` e confirmar PASS. Mutação: tirar a regra de exclusivas de `escolher` e ver o teste reprovar; desfazer.

### Task 6: Painel `resultados.html`, agregação e CSV

**Files:**
- Create: `infra/site-pesquisa/agregar.mjs`
- Modify: `scripts/site-publico/paginas.mjs` (função `paginaDosResultados`)
- Test: `__tests__/pesquisaAgregar.test.ts`, `__tests__/sitePublico.test.ts`

**Interfaces:**
- Consumes: `PERGUNTAS`, `FUNCIONALIDADES` (Task 1).
- Produces em `agregar.mjs` (puras, embutidas no HTML):
  - `agregar(itens: object[]): { respondentes: number; concluidas: number; unicas: Record<string, Record<string, number>>; multiplas: Record<string, Record<string, number>>; porIdade: Record<string, { total: number; usariaAlto: number }>; comentarios: string[]; cliques: { inicio: number; fim: number } }` (`unicas` cobre `impressao`, `usaria`, `frequencia`, `modelo`, `idade`, `celular`, `remedio_em_casa`; `multiplas` cobre `chamaram_atencao`, `guarda_hoje`, `barreiras`; `porIdade` cruza a faixa de idade com `usaria` igual a `usaria` ou `usaria_muito`)
  - `paraCsv(itens: object[]): string` (uma linha por resposta, colunas fixas na ordem de `PERGUNTAS`, aspas e quebras de linha escapadas)
  - `escaparHtml(texto: string): string`

- [ ] **Step 1: Write the failing tests**:
  - `agregar conta respostas parciais e concluídas separadamente` e ignora itens `tipo: 'clique'` nas contagens de respostas
  - `agregar soma cliques por origem`
  - `agregar cruza idade com "usaria" ou "usaria muito"` (um caso numérico pequeno e conferível à mão)
  - `paraCsv escapa vírgula, aspas e quebra de linha do comentário`
  - `escaparHtml neutraliza <script> e aspas`
  - em `sitePublico`: `resultados.html` não contém a senha nem nenhum literal de senha, pede a chave antes de buscar, manda o cabeçalho `x-chave`, e insere comentários só por `textContent` ou por `escaparHtml` (o teste procura `innerHTML` junto de `comentarios` e falha se não houver escape).

- [ ] **Step 2: Run** `npx jest pesquisaAgregar sitePublico` e confirmar FAIL.

- [ ] **Step 3: Implement** `agregar.mjs` e `paginaDosResultados`: total e concluídas em destaque, barras de `impressao` e `usaria`, as funcionalidades que mais chamaram atenção (sem trilha de fundo), frequência, onde guarda hoje, barreiras, modelo, perfil (idade, celular, quem toma remédio em casa), cruzamento da idade com "usaria", lista de comentários, cliques por origem e botão "Baixar CSV". Sempre contagem absoluta ao lado de qualquer percentual, sem casas decimais. A chave digitada fica só em `sessionStorage`. `scripts/exportar-pesquisa.mjs` usa `paraCsv`.

- [ ] **Step 4: Run** `npx jest pesquisaAgregar sitePublico` e confirmar PASS. Mutação: trocar `escaparHtml` por identidade e ver o teste do `<script>` reprovar; desfazer.

**Fim do EPIC 3:** relatório e mensagem de commit. Parar.

---

## EPIC 4: Print do app (uma imagem)

### Task 7: Capturar o print do hero

**Files:**
- Create: `assets/site/telas/inicio.png`

- [ ] **Step 1:** Subir `npm run web -- --port 8098` (sem `CI=1`) e abrir `http://localhost:8098/dev-preview?screen=home-with-data`.
- [ ] **Step 2:** Capturar com `npm run preview:screenshot -- "http://localhost:8098/dev-preview?screen=home-with-data" assets/site/telas/inicio.png` (viewport 390×844) e abrir o arquivo: sem mensagem de erro, sem dado pessoal real (o preview usa a pessoa fictícia do arquivo), texto legível. Não é preciso mudar `src/app/dev-preview.tsx`. Se a tela não renderizar bem, parar e pedir um print do celular ao Pedro.
- [ ] **Step 3:** Rodar `npx jest sitePublico` e acrescentar o caso `todo caminho de origem em ATIVOS existe em disco`, vendo-o falhar antes de capturar e passar depois.

**Fim do EPIC 4:** relatório, o print para o Pedro olhar, e mensagem de commit. Parar.

---

## EPIC 5: Publicação, implantação e conferência

### Task 8: Publicador usa os ativos e o endereço real da Function URL

**Files:**
- Modify: `scripts/publicar-site-publico.mjs`
- Test: `__tests__/sitePublico.test.ts` (só a parte pura, se houver)

- [ ] **Step 1:** O publicador lê a `FunctionUrl` da saída da stack (`aws cloudformation describe-stacks --stack-name suasaude-pesquisa`). Se a stack não existir, usa o valor de marcação, avisa em letras claras que a pesquisa ainda não grava e segue.
- [ ] **Step 2:** Os arquivos do zip passam a ser as páginas mais tudo de `ATIVOS` (lidos do disco); a mensagem final lista também `opiniao.html` e `resultados.html`.
- [ ] **Step 3:** Rodar `npx jest sitePublico siteZip` e confirmar PASS. Rodar `node scripts/publicar-site-publico.mjs` **não** é feito aqui (publicação é a Task 9).

### Task 9: Implantar, publicar e conferir (permissão do Pedro dada em 2026-10-24)

- [ ] **Step 1: Conferir o que existe antes.** `aws cloudformation list-stacks` das stacks `amplify-*` (guardar a lista com estados) e `aws cognito-idp describe-user-pool` dos dois pools.
- [ ] **Step 2: Implantar.** Com `PESQUISA_SENHA` definida no ambiente (valor passado pelo Pedro, nunca escrito em arquivo): `npm run pesquisa:implantar`. Esperado: stack `suasaude-pesquisa` em `CREATE_COMPLETE`, a `FunctionUrl` impressa, e o script informa que as stacks `amplify-*` e os dois pools estão idênticos ao "antes".
- [ ] **Step 3: Teste de fumaça por `curl`** contra a `FunctionUrl`: `salvar` válido devolve 200; valor fora da lista devolve 400; `listar` sem chave devolve 401; `listar` com a chave devolve o item gravado; `clique` devolve 200. Depois apagar os itens de teste com `aws dynamodb delete-item` (só os criados aqui) e confirmar que a tabela voltou a zero itens.
- [ ] **Step 4: Publicar o site.** `npm run site:publicar`; confirmar `SUCCEED` e abrir `baixar.html`, `opiniao.html`, `resultados.html`, `index.html`, `privacidade.html`, `termos.html` publicados.
- [ ] **Step 5: Conferir no navegador** pela skill `/browse` (nunca as ferramentas do Chrome direto), em celular (390×844) e desktop, tema claro e escuro: o hero cabe sem rolar; responder as 11 perguntas até o fim; o item aparece no painel; baixar nos dois lugares registra `inicio` e `fim`; erro de envio (cortar a rede) mostra "Tentar de novo" e não perde respostas; com `prefers-reduced-motion` não há deslizamento; contraste e foco de teclado visíveis. Apagar as respostas de teste depois.
- [ ] **Step 6: Conferir de novo o "antes e depois"** do Step 1 (stacks `amplify-*` e user pools) e registrar no relatório.
- [ ] **Step 7: Confirmar que a senha não vazou:** `git grep -n -F "$PESQUISA_SENHA"` e `git status` não mostram a senha em nenhum arquivo.

**Fim do EPIC 5:** relatório de fim de bloco (com a seção "o que achei de errado no plano") e mensagem de commit. Parar.

---

## EPIC 6: Quadro do critério de viabilidade (só depois de o grupo fechar o critério)

### Task 10: Conferência do critério no painel

**Files:**
- Create: `infra/site-pesquisa/criterio.mjs`
- Modify: `scripts/site-publico/paginas.mjs` (painel)
- Test: `__tests__/pesquisaCriterio.test.ts`

**Interfaces:**
- Consumes: saída de `agregar` (Task 6).
- Produces: `CRITERIO: readonly { id: string; descricao: string; cumprido(agregado): boolean }[]` e `avaliar(agregado): { regras: { id: string; cumprido: boolean }[]; semDados: boolean }`, com o piso de respondentes concluídos definido pelo grupo.

- [ ] **Step 1:** Receber do Pedro as regras e o piso de respondentes. **Não inventar regras.**
- [ ] **Step 2:** Escrever os testes (um caso por regra, mais "abaixo do piso devolve `semDados`"), ver FALHAR, implementar `criterio.mjs`, ver PASSAR, e mostrar o quadro no painel.

---

## Auto-revisão

- **Cobertura do spec:** seções 5.1 (Task 1), 5.2 e 5.3 (Tasks 2, 5, 6, 10), 6.1 a 6.3 (Tasks 4 e 5), 6.4 (Task 7, um só print), 7 (Tasks 2, 3, 8, 9), 8 (estrutura dos EPICs). O download nos dois lugares está nas Tasks 4 e 5 e testado na Task 9.
- **Mudança em relação ao spec:** `pesquisa.mjs` mora em `infra/site-pesquisa/` (e não em `scripts/site-publico/`) para que os imports sejam iguais no repositório e dentro do zip da Lambda, que leva `index.mjs`, `pesquisa.mjs` e `repositorio.mjs` lado a lado. O template é JSON (e não YAML) para o teste poder lê-lo sem biblioteca.
- **Consistência de nomes:** `validarEnvio`, `criarHandler`, `Repositorio`, `estadoInicial/escolher/podeAvancar/avancar/voltar/montarEnvio`, `agregar/paraCsv/escaparHtml`, `ATIVOS`, `criarZip` usados com a mesma grafia em todas as tarefas.
