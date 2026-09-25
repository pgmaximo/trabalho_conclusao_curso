# EPIC: IA de leitura de documentos — extração estruturada na tela de exames (Bloco 6)

## 1. Identificação

- **Origem:** esta EPIC **não vem do Claude Design.** O Canvas desenha as telas de
  exames (3a, 3b) mas não desenha extração, resultado de análise nem revisão de
  valor extraído — o conceito não existia quando o Canvas foi feito. Ambiguidade
  registrada pela regra 8 da constituição: as telas afetadas seguem os tokens e
  padrões já estabelecidos, e as seções novas são propostas nesta spec, não
  copiadas de um artefato de design.
- **Estudos que a fundamentam:** `estudos-ia/` — roadmap Fase 1, decisões D13 a
  D18, e os três esquemas (`formato-analitos.md`, `cobertura-analitos.md`,
  `conversao-unidades.md`).
- **Telas afetadas (todas já existem):**
  - `src/app/add-exam.tsx` → `src/screens/AddExamScreen.tsx` (3a) — a rota fica na
    raiz de `src/app/`, não em `(app)/`, conferido no repositório
  - `src/app/(app)/document-detail.tsx` → `src/screens/DocumentDetailScreen.tsx` (3b)
  - a lista de exames alimentada por `src/hooks/useExamsData.ts`
- **Backend novo:** `amplify/functions/extract-document-data/`, models `LabResult`
  e `PrescriptionItem`, campos novos em `MedicalDocument`.
- **Ator:** usuário (paciente), que anexa um documento e espera que o
  aplicativo entenda o conteúdo, não apenas guarde o arquivo.
- **Prioridade: P1.** É a Fase 1 do roadmap e bloqueia a comparação entre meses,
  que é o objetivo declarado do projeto.
- **Sensibilidade:** grava dado clínico derivado por modelo. É a EPIC de maior
  risco de dano do projeto — um número errado gravado sem sinalização entra no
  histórico de saúde de alguém e é lido depois como verdade.

## 2. História da funcionalidade

Como usuário, quero que o aplicativo leia o conteúdo dos exames e receitas
que eu anexo, e não apenas guarde o arquivo, para que eu possa acompanhar a
evolução dos meus resultados ao longo do tempo sem reler cada PDF.

### Cenários (Given/When/Then)

- **Extração de um exame, caminho feliz:**
  Given o usuário está em `/add-exam`, selecionou um PDF, classificou como
  **Exame**, preencheu nome e data e tocou em salvar
  When `createExamDocument` conclui as quatro etapas atuais (validar, subir ao
  S3, gravar metadados, invalidar cache)
  Then o documento aparece na lista imediatamente, com estado de extração
  "em andamento", e a extração roda fora do ciclo da requisição
  And quando ela conclui, a tela de detalhe do documento passa a mostrar as
  linhas extraídas: analito, valor, unidade, faixa de referência do laboratório
  e a página de origem.

- **Extração de uma receita:**
  Given o documento foi classificado como **Receita**
  When a extração roda
  Then o que se extrai não são analitos, e sim medicamento, concentração,
  posologia e duração — schema diferente, mesma pipeline (ver §5)
  And a data de validade já informada no formulário permanece a fonte de
  verdade sobre vencimento; a extração não a sobrescreve.

- **Confiança baixa em uma linha:**
  Given a extração produziu uma linha cuja confiança ficou abaixo do limiar, ou
  cuja unidade não pôde ser convertida
  When a linha é gravada
  Then ela entra com `reviewStatus = PENDENTE_DE_REVISAO`, **sem valor gravado**
  (D29), aparece visualmente distinta na tela de detalhe, e **não participa de
  nenhuma comparação entre documentos** até ser confirmada pelo usuário
  And o usuário pode confirmar a leitura ou corrigir o valor, e qualquer das
  duas ações muda o estado para `CONFIRMADO_PELO_USUARIO`
  And os valores de estado são CAIXA ALTA com sublinhado porque um valor de
  enum do GraphQL casa com `[_A-Za-z][_0-9A-Za-z]*` — hífen não é um valor
  válido, e um valor gravado fora do enum faz o AppSync devolver o campo nulo
  ao cliente, sem erro.

- **Falha na extração:**
  Given o OCR não conseguiu ler o arquivo, ou o modelo devolveu resposta que não
  passou na validação mesmo após a tentativa de reparo
  When a função conclui em erro
  Then o documento **continua válido e acessível** — o arquivo está no S3 e os
  metadados no DynamoDB, exatamente como hoje
  And a tela de detalhe mostra que a leitura automática não funcionou, com uma
  opção de tentar de novo, sem sugerir que o documento se perdeu.

- **Documento sem analito reconhecível:**
  Given o usuário anexou um laudo em prosa, uma sorologia ou uma cultura
  When a extração roda e não encontra nenhuma medida numérica mapeável
  Then nenhuma linha de analito é gravada, e isso **não é tratado como falha**
  And o texto extraído continua guardado e disponível, e a tela comunica que
  este documento não tem valores acompanháveis, sem mensagem de erro.

- **Reenvio do mesmo documento:**
  Given o usuário anexa de novo um arquivo já enviado antes
  When a extração roda pela segunda vez
  Then as linhas não duplicam (ver a regra de idempotência em §6).

- **Base para a comparação entre coletas** (a tela é outra EPIC, ver §3):
  Given existem dois documentos com o mesmo `analyteCode`, vindos de
  laboratórios diferentes e com unidades diferentes no papel
  When as duas extrações concluem
  Then as duas linhas existem com o mesmo `analyteCode` e a **mesma unidade
  canônica**, cada uma com a faixa do seu laboratório e o seu documento de
  origem — ou seja, comparáveis entre si sem nenhum tratamento adicional.

## 3. Estrutura da página

### `/add-exam` (3a) — o formulário não muda

Nenhum campo novo, nenhum passo novo. As duas classificações continuam sendo
**Exame** e **Receita**, e só Receita pede data de validade. A mudança é
invisível ao usuário neste ponto: após salvar, a extração é disparada.

Decisão deliberada: **não fazer o usuário esperar a extração.** Ele salva e
volta para a lista, como hoje.

### `/document-detail` (3b) — seção nova abaixo do que já existe

Acrescentar, preservando a estrutura atual da tela, uma seção "Resultados
extraídos" com cinco estados — quatro de extração mais o do documento antigo,
que a revisão de 2026-09-16 acrescentou por ser o estado de **todo** documento
já existente no aplicativo:

0. **Nunca extraído** — documento gravado antes desta EPIC. Não é falha e não
   é "sem resultado": é um documento que nunca passou pela leitura, com ação de
   lê-lo agora.
1. **Em andamento** — indicador de progresso e texto explicando que a leitura
   está sendo feita.
2. **Concluída com linhas** — lista de analitos: nome como o laboratório
   escreveu, valor na unidade canônica, faixa de referência, e marcação visual
   nas linhas pendentes de revisão, com ação de confirmar ou corrigir.
3. **Concluída sem linhas** — texto explicando que este documento não tem
   valores acompanháveis, sem tom de erro.
4. **Falhou** — explicação honesta e ação de tentar de novo.

Em todos os estados, o documento original permanece acessível como hoje.

### Série por analito — fora do escopo desta EPIC

A comparação entre coletas é uma **tela nova**, e a regra 6 da constituição diz
que toda tela nova é unidade de entrega própria. Ela ganha
`specs/06-ia-leitura-exames/serie-por-analito/`.

O que esta EPIC entrega para ela: as linhas gravadas, normalizadas e com estado
de revisão — tudo de que a série precisa. O que esta EPIC não entrega: a tela.

A ligação (tocar numa linha de analito e chegar à série) está no mapa de
navegação abaixo porque o ponto de partida vive nesta tela; o destino é
especificado na outra EPIC.

## 4. Mapa de navegação

| Elemento | Tipo | Ação | Destino | Condição |
|---|---|---|---|---|
| Salvar em `/add-exam` | Botão | Grava e dispara a extração | volta à lista, como hoje | formulário válido |
| Linha de analito (detalhe) | Item de lista | Abre a série daquele analito | série por analito (**EPIC própria**) | há ao menos 2 coletas confirmadas |
| "Confirmar" numa linha pendente | Botão | Marca como confirmada pelo usuário | permanece na tela | linha pendente de revisão |
| "Corrigir" numa linha pendente | Botão | Abre painel de correção do valor, **na unidade que a tela já mostra** | permanece na tela | linha pendente de revisão |
| "Tentar de novo" | Botão | Redispara a extração | permanece na tela | extração falhou |
| Documento original | Botão | Abre o arquivo | comportamento atual | sempre |

## 5. Mapa de dados

### `MedicalDocument` — campos acrescentados

Aditivos, todos opcionais, para não quebrar as linhas já persistidas (regra 5 da
constituição). Documento gravado antes desta EPIC continua válido e aparece como
"nunca extraído".

| Campo | Papel |
|---|---|
| `extractionStatus` | `PENDING`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `NO_RESULTS` |
| `extractionStartedAt` | ISO — permite detectar extração travada |
| `extractedAt` | quando concluiu |
| `extractedTextKey` | chave no S3 do texto bruto do OCR |
| `extractionError` | preenchido apenas quando falhou |
| `extractionWarnings` | avisos em pt-BR do que não pôde ser lido |
| `modelId`, `inputTokens`, `outputTokens` | procedência e custo |
| `sourceChecksum` | base da idempotência (ver §6) |

### `LabResult` — novo, uma linha por analito por documento

Campos conforme `estudos-ia/03-esquemas/formato-analitos.md`: `analyteCode`
(LOINC), `analyteLabel`, `projectLabel`, `value`, `valueQualifier`, `unit`,
`rawValue`, `rawUnit`, `referenceLow`, `referenceHigh`, `collectedAt`,
`collectionMoment`, `documentId`, `sourcePage`, `confidence`, `reviewStatus`,
`correctedAt`. Autorização por dono.

**`value` é opcional, e isso é requisito, não conveniência (D29).** Uma linha
que não pôde ser lida com segurança entra **sem valor**, não com zero — zero é
um número plausível para vários analitos e seria um chute gravado num
histórico de saúde. O texto do papel fica em `rawValue`, que é o que a pessoa
lê para corrigir, e a tela mostra travessão.

**`analyteLabel` carrega um nome oficial do LOINC, não um rótulo nosso.** É
exigência da cláusula 10.3 da licença: todo dado extraído anda junto do código
**e** de um nome oficial. O rótulo em português que a tela mostra vive em
`projectLabel`, campo nosso, acrescentado ao lado (cláusula 2).

**Dois índices**, porque as duas consultas desta EPIC e da seguinte são
conhecidas: por `documentId` (a tela de detalhe) e por `analyteCode` com a data
como chave de ordenação (a série por analito).

Três campos merecem nota, porque nasceram de defeitos encontrados na revisão de
2026-09-16 e cada um corresponde a uma forma de gravar número errado sem
levantar erro:

- **`valueQualifier`** (D21) — `<` ou `>` quando o laudo reporta limite de
  detecção, o que é rotina em TSH ultrassensível, PSA, beta-HCG, PCR e
  D-dímero. Linha com qualificador preenchido **não participa da comparação
  entre coletas**: ela é limite, não medida.
- **`collectionMoment`** (D22) — o rótulo do momento como o laudo escreveu
  ("jejum", "120 minutos", "manhã"). Sem ele, curva glicêmica e cortisol de
  manhã e tarde colidem no id determinístico, e `UpdateCommand` sobrescreve
  calado.
- **`collectedAt` é por linha** (D24), porque um PDF consolidado pode reunir
  coletas de dias diferentes. Quando o modelo não achar a data no papel, a
  linha herda a data digitada no formulário e a extração registra aviso
  dizendo de onde a data veio. Nunca uma data inventada, nunca a do upload.

Uma linha por analito, nunca uma linha por documento com vários analitos
dentro — isso impediria consulta por analito, que é o caso de uso inteiro.

### `PrescriptionItem` — novo, uma linha por medicamento por receita

`medicationLabel`, `dose`, `unit`, `frequency`, `duration`, `rawText`,
`documentId`, `confidence`, `reviewStatus`. Autorização por dono.

Deliberadamente **não** se liga sozinho ao model `Medicine` existente, que é
alimentado pelo usuário e dispara lembretes. Criar lembrete de medicamento a
partir de leitura automática de um papel é ação de risco alto que esta EPIC não
toma; a ligação, se for desejada, é outra decisão com confirmação explícita.

### Onde o dado bruto fica

O texto do OCR vai para o S3, não para o DynamoDB — pode passar do limite de
item e não é consultado por atributo. A chave fica em `extractedTextKey`.

## 6. Requisitos não-funcionais específicos

**Regra 4 da constituição — a extração não interpreta.** Ela guarda o número, a
unidade, a faixa que o laboratório informou e a origem. Não classifica valor como
bom ou ruim, não marca alterado, não calcula risco, não nomeia condição. Qualquer
leitura sobre o que os números significam pertence à conversa (Fase 2), com
encaminhamento a um profissional de saúde — e nunca ao esquema de dado.

**Texto para número passa por função própria (D23).** O laudo brasileiro escreve
`32,5` e `1.234,56`. `Number('32,5')` devolve `NaN`; `parseFloat('32,5')` devolve
**32**, perdendo a casa decimal sem erro; `parseFloat('1.234,56')` devolve
**1.234**. Toda conversão de texto para número — `value`, `referenceLow` e
`referenceHigh` igualmente — usa uma função do projeto, com teste. `parseFloat` e
`Number` sobre texto vindo do documento estão proibidos, e a proibição é
verificada em teste. Texto que a função não converta não vira número chutado: a
linha entra como pendente de revisão.

**Rastreabilidade por linha.** `rawValue` e `rawUnit` guardam o que estava
escrito no papel, sem tratamento. Quando o usuário perguntar de onde saiu um
número, a resposta é o documento e a página, não o resultado da conversão. É
também o que permite reprocessar tudo se a tabela de conversão tiver erro, sem
refazer o OCR.

**Idempotência.** Reenviar o mesmo arquivo não pode duplicar linhas. A chave é o
`sourceChecksum` do arquivo mais o `documentId`; a gravação usa `UpdateCommand`,
nunca `PutCommand` — a mesma armadilha que a feature de wearable documentou, e
pela mesma razão: `PutCommand` apagaria os campos que o resolver do AppSync
preencheu.

**Valor e faixa convertem juntos.** Nenhuma linha pode existir com `value` numa
escala e `referenceLow`/`referenceHigh` em outra. Converter o valor e deixar a
faixa para trás faz exame normal aparecer como alterado. Isso é teste, não
recomendação (D17).

**Unidade desconhecida não é convertida no chute.** A linha entra como pendente
de revisão.

**A grafia da unidade no papel é traduzida antes de ser comparada (D28).**
Nenhum laudo brasileiro escreve UCUM: o papel traz `mcg/dL`, `µUI/mL`, `UI/L`,
`/mm³`. Sem uma camada de tradução, a unidade **certa** seria recusada como
desconhecida e um hemograma inteiro cairia em revisão — o oposto do objetivo da
revisão, que é capturar o duvidoso e não o comum. A tradução é de grafia, nunca
de grandeza: unidade fora da tabela sai como entrou e segue para a recusa.

**A conversão de unidade acontece num lugar só (D29).** O aplicativo não
converte. Quando a pessoa corrige uma linha, ela digita o valor na unidade que
a tela já mostra, e não há campo livre de unidade — campo livre traria uma
segunda implementação de conversão, que divergiria da primeira.

**O limiar de confiança é um número, decidido no `plan.md`, não uma noção.** Ele
precisa ser calibrado contra laudos reais antes de valer, e o `plan.md` registra
o valor escolhido e como ele foi obtido. Enquanto não houver calibração, o
padrão é o lado conservador: mandar para revisão em caso de dúvida, porque o
custo de uma revisão a mais é incômodo, e o de um número errado gravado calado é
um histórico de saúde corrompido.

**Hemoglobina não converte para unidade molar** (D18) — as convenções de monômero
e tetrâmero diferem por um fator de quatro, que num valor de hemoglobina é a
diferença entre anemia e normalidade.

**Assíncrono, por causa do teto de 30 segundos.** O resolver do AppSync corta em
30s e a extração leva mais que isso. Segue o padrão já provado pela
`analyze-health-import`: disparo assíncrono, gravação direta no DynamoDB, e o
aplicativo consulta por repetição com espera crescente. A repetição da invocação
assíncrona fica zerada, pela mesma razão escrita no `backend.ts` — não pagar o
modelo duas ou três vezes pelo mesmo documento.

**Saída do modelo forçada por tool e validada por schema**, com uma fonte de
verdade só gerando o schema da tool e validando a resposta, como
`insightSchema.ts` já faz. Modelo: o mesmo da feature de wearable, pela mesma
razão registrada lá — a tool forçada é incompatível com raciocínio estendido nos
modelos da Anthropic.

**Guardrail do Bedrock** aplicado na entrada e na saída. A decidir no `plan.md`
se reusa o `health-insights-guardrail` existente ou ganha um irmão.

**Licença do LOINC e do UCUM.** São gratuitos porém licenciados pelo Regenstrief
Institute. Aceitar a licença e conferir as condições de redistribuição **antes**
de versionar qualquer extrato no repositório. Bloqueia a gravação de códigos
(tarefa 0.2a do roadmap).

**Códigos de terminologia não são digitados à mão.** Eles vêm do arquivo oficial
do LOINC. Um dígito trocado corrompe silenciosamente o eixo da comparação e o
erro só aparece meses depois. A proibição **é verificada em teste**, e vale
também para exemplo em teste e para código citado em comentário (D27): um
comentário afirmando que o código foi conferido não é conferência — ele erra
junto com o literal ao lado. Quem precisa de um código em teste busca a entrada
no catálogo gerado, por `projectLabel`.

**O catálogo gerado é comparado com o extrato, não só confiado (D35).** Conferir
só a *forma* do código não pega o dígito trocado, que é justamente o erro
descrito acima. O teste regenera `analyteCatalog.ts` a partir do CSV e exige o
mesmo arquivo de volta. Quando ele falha, a correção é rodar o gerador e
versionar a saída — nunca editar o arquivo gerado.

**Lógica pura com teste unitário**, no padrão que a feature de wearable
estabeleceu: conversão, normalização, idempotência e validação de schema vivem em
arquivos próprios, testáveis sem AWS.

**Node 20** para publicar o ambiente do Amplify. `npm run validate` antes de
considerar qualquer coisa concluída.

## 7. Critérios de aceite

- [ ] Anexar um Exame em `/add-exam` dispara a extração sem fazer o usuário
      esperar, e o documento aparece na lista imediatamente.
- [ ] A tela de detalhe cobre os quatro estados: em andamento, concluída com
      linhas, concluída sem linhas, e falhou — cada um com copy própria e sem
      tratar "sem linhas" como erro.
- [ ] Falha de extração **nunca** deixa o documento inacessível: arquivo e
      metadados permanecem como hoje.
- [ ] Linha com confiança abaixo do limiar, ou com unidade não convertida, entra
      como pendente de revisão, é visualmente distinta, e **não participa de
      comparação** até ser confirmada.
- [ ] O usuário consegue confirmar uma linha pendente **e também corrigi-la** —
      as duas ações existem, com teste. Uma revisão em que a única ação possível
      é aceitar não é revisão.
- [ ] O valor digitado na correção passa pela mesma leitura de número do laudo:
      `32,5` digitado vira `32,5` gravado — coberto por teste.
- [ ] A correção **não** altera `rawValue` nem `rawUnit`: o papel não mudou
      porque alguém corrigiu a leitura.
- [ ] Linha que não pôde ser lida entra **sem valor**, nunca com zero — coberto
      por teste.
- [ ] Unidade escrita como o laboratório brasileiro escreve (`mcg/dL`,
      `µUI/mL`, `/mm³`) é reconhecida e não manda a linha para revisão —
      coberto por teste.
- [ ] Reenviar o mesmo arquivo não duplica linhas.
- [ ] Um documento com o mesmo analito medido em momentos diferentes (curva
      glicêmica em jejum, 60 e 120 minutos) produz uma linha por momento, e
      nenhuma sobrescreve a outra — coberto por teste.
- [ ] Valor reportado como `<0,01` ou `>1000` preserva o sinal, aparece como
      limite de detecção e **não entra na comparação entre coletas** — coberto
      por teste.
- [ ] `32,5` no papel vira `32,5` no banco, e `1.234,56` vira `1234,56`.
      Nenhuma chamada a `parseFloat` ou `Number` sobre texto do documento —
      coberto por teste.
- [ ] Laudo sem data de coleta legível herda a data do formulário e registra o
      aviso dizendo de onde a data veio; nenhuma data é inventada.
- [ ] Nenhuma linha existe com valor e faixa de referência em escalas
      diferentes — coberto por teste.
- [ ] Unidade desconhecida não é convertida; a linha vai para revisão.
- [ ] Hemoglobina não é convertida para unidade molar.
- [ ] Receita produz medicamento e posologia, não analitos, e **não cria
      lembrete nem alimenta o model `Medicine`** automaticamente.
- [ ] A data de validade da receita informada no formulário não é sobrescrita
      pela extração.
- [ ] Documentos gravados antes desta EPIC continuam válidos e aparecem como
      nunca extraídos, sem migração destrutiva.
- [ ] Nenhum texto da extração ou das telas classifica um valor como bom, ruim
      ou alterado, nomeia condição ou calcula risco.
- [ ] Dois exames do mesmo analito, de laboratórios diferentes e com unidades
      diferentes no papel, produzem linhas com o mesmo `analyteCode` e a mesma
      unidade canônica — comparáveis sem tratamento adicional.
- [ ] A licença do LOINC/UCUM foi aceita e as condições de redistribuição
      conferidas antes de qualquer extrato ser versionado.
- [ ] Nenhum código LOINC foi digitado à mão — todos vieram do arquivo oficial.
      **Verificado por varredura**, não por inspeção: nenhum arquivo `.ts`,
      `.tsx`, `.mjs` ou `.js` versionado contém literal com a forma de um código
      LOINC, nem em comentário. A única fonte é o catálogo gerado; a única
      exceção é o código inventado do caso negativo, registrada com motivo no
      próprio teste e acompanhada da asserção de que ele não existe no catálogo.
- [ ] O catálogo gerado não derivou do extrato: regenerar a partir do CSV
      devolve exatamente o `analyteCatalog.ts` versionado, analito a analito e
      depois byte a byte. **Confirmado por mutação** — com um dígito trocado no
      arquivo versionado, a checagem de forma passa e este teste reprova.
- [ ] Importar o gerador não escreve nada em disco: um teste de deriva que
      regravasse o arquivo o consertaria em silêncio em vez de acusá-lo.
- [ ] Conversão, normalização e idempotência têm teste unitário sem dependência
      de AWS.
- [ ] `npm run validate` passa.
