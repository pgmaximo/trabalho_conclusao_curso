# PRD — Melhorias do assistente de IA (Parte 1 da finalização do código)

Status: rascunho, revisão 3 · Data: 2026-10-17 · Pasta: `specs/10-finalizacao-codigo/01-melhorias-ia` · Código: `amplify/functions/chat-assistant`

Documentos desta pasta: [`README.md`](./README.md) (índice, ordem e status) · [`decisoes/`](./decisoes/README.md) (decisões que o produto precisa tomar, com opções, benefícios e malefícios).

## 1. Contexto e motivação

O assistente conversacional do SuaSaúde hoje lê 8 domínios por ferramentas somente leitura: perfil, exames, resultados, analitos, consultas, medicamentos, vacinas e wearable. Foi testado pelos colegas de projeto, que gostaram, mas acham que dá para dar **mais poder** à IA.

O levantamento do código mostra três tipos de lacuna:

1. **Dados que já estão no banco e o chat não lê** (doses tomadas, estoque, receitas extraídas, campos de agenda e vacina, série de wearable).
2. **Funcionalidades do app que o chat desconhece** (prevenção, campanhas e postos de vacinação, interações medicamentosas, navegação).
3. **Capacidades que faltam** (saber a data de hoje, cruzar domínios, propor ações).

Este PRD organiza as melhorias em épicos. Cada épico tem funcionalidade, tarefas, e cada tarefa tem user story e especificação.

## 2. Objetivo

Aumentar a utilidade do assistente no dia a dia do usuário, fazendo-o responder com **todos** os dados relevantes que o app já guarda, sem abrir mão das regras de segurança.

**Métricas de sucesso (propostas, a calibrar):**
- Menos respostas do tipo "não tenho essa informação" para perguntas sobre dados que o app já guarda.
- Cada ferramenta nova coberta por teste, e `npm run validate` verde.
- Zero regressão nas regras de linguagem (R1 a R5) e no filtro por dono.

## 3. Não objetivos

- **Proatividade.** O assistente continua reativo: só responde quando o usuário pergunta. Sem notificação, sem sugestão não solicitada, sem varredura em segundo plano. (Decisão do produto, 2026-10-17.)
- Diagnóstico definitivo, prognóstico, indicação ou alteração de dose (constituição, regra 4).
- Escrita de dado clínico feita pela IA sem confirmação explícita do usuário.
- Adotar fonte de dados externa **nova** no chat. O chat só usa fontes que o app já usa (constituição, regra 3). A USPSTF, por exemplo, já alimenta a tela de prevenção; o E7 trata dessa fronteira em `decisoes/E7-recomendacoes-prevencao.md`.

## 4. Requisitos transversais (valem para todo épico)

| ID | Requisito |
|---|---|
| RT1 | Toda ferramenta nova é `readOnly: true`, usa `lerDoDono` (filtro por dono vindo só da identidade) e tem `inputSchema` `.strict()`. |
| RT2 | Em `backend.ts`: `grantReadData` (nunca `grantReadWriteData`) e variável de ambiente com o nome da tabela. |
| RT3 | Ausência de dado é resposta, não erro (`disponivel: false` + `explicacao`). |
| RT4 | Valor de exame citado segue o esquema de citação (R4). Ferramenta nova que devolva número de exame precisa alimentar `citacoes`. |
| RT5 | Texto gerado passa pela verificação de linguagem. Ferramenta pode devolver o dado cru (ex.: dose cadastrada), mas a resposta não pode indicar dose ou mudança. |
| RT6 | Cada ferramenta nova tem `renderDegraded` quando fizer sentido, para o modo degradado (D31). |
| RT7 | Mudança de schema do Amplify Data é decisão explícita e registrada. Nada pode quebrar dados existentes em Cognito, DynamoDB ou S3 (constituição, regra 5). Este PRD só propõe schema novo onde diz. |
| RT8 | TDD: testes primeiro, em `amplify/functions/chat-assistant/__tests__`. `npm run validate` é o único gate. |
| RT9 | Atualizar `SYSTEM_PROMPT` (`chatPrompt.ts`) a cada ferramenta nova, dizendo **quando** usá-la e em que ela difere das vizinhas. Tools parecidas confundem o modelo. |
| RT10 | O limite de `MAX_TOOL_ITERATIONS = 6` e o custo de tokens são vigiados: ferramenta nova devolve resumo, não tabela inteira. |
| RT11 | Textos, comentários e testes em pt-BR. |

## 5. Visão geral e priorização

| Épico | Tema | Esforço | Valor | Schema novo? |
|---|---|---|---|---|
| E1 | Contexto de hoje e conhecimento do app | P | Alto | Não |
| E2 | Medicamentos completos | P | Alto | Não |
| E3 | Adesão: doses tomadas | M | Alto | Não |
| E4 | Receitas e documentos | M | Médio | Não |
| E5 | Agenda e vacinas: campos faltantes | P | Médio | Não |
| E6 | Wearable: série diária e histórico | M | Médio | Não (leitura de S3) |
| E7 | Recomendações de prevenção | M | Médio | Não (D7.1 = A; concluído em 2026-10-17) |
| E8 | Campanhas e postos de vacinação | M | Médio | Não (concluído em 2026-10-17) |
| E9 | Interações medicamentosas | M | Alto | Não |
| E10 | Visão geral e comparação de domínios | G | Alto | Não |
| E11 | Ações com confirmação do usuário (aprovado, escopo a definir) | G | Alto | Não |
| E12 | Histórico de conversas (já existe; estudar a lacuna restante) | P | Baixo | A verificar |

Esforço: P (pequeno), M (médio), G (grande). **Ordem de entrega:** E7, E8, E2, E9, E1 (definida pelo produto em 2026-10-17), depois E5, E3, E4, E10, E6, E11, E12 (posições sugeridas por mim, ainda a confirmar). Detalhes, dependências e status em [`README.md`](./README.md).

---

## E1 — Contexto de hoje e conhecimento do app

> Decisões a tomar antes de implementar: [`decisoes/E1-contexto-e-mapa-do-app.md`](./decisoes/E1-contexto-e-mapa-do-app.md).

**Funcionalidade:** o assistente sabe que dia e hora são agora, e conhece as telas do app para orientar o usuário.

**Por que:** hoje o prompt não traz a data. Só `consultar_consultas` usa o relógio da função. Perguntas como "o que tenho esta semana?" ou "faz quanto tempo desse exame?" dependem de data. O assistente também não sabe levar o usuário a uma tela.

### 1.1 Data e hora atuais no contexto
- **História:** Como usuário, quero perguntar "faz quanto tempo que fiz esse exame?" ou "o que tenho amanhã?" e receber uma resposta correta, para não precisar calcular datas.
- **Especificação:**
  - O handler injeta no turno a data atual no fuso `America/Sao_Paulo` (data, dia da semana, hora), como contexto do sistema e não como texto do usuário.
  - O prompt manda o modelo usar essa data como "hoje" e **nunca** calcular diferença de datas de cabeça quando a ferramenta puder devolver o resultado pronto.
  - **Critérios:** teste fixa o relógio e verifica que a data entra no turno; teste de fuso (UTC virando dia seguinte no Brasil); resposta sobre "amanhã" correta perto da meia-noite.

### 1.2 Mapa do app e orientação de navegação
- **História:** Como usuário, quero perguntar "onde importo os dados do meu relógio?" ou "como cadastro um remédio?" e ser levado ao lugar certo, para não me perder no app.
- **Especificação:**
  - Um bloco estático no prompt lista as telas reais (rotas de `src/app/(app)` e telas `add-*`/`edit-*`/`import-health-data`) com uma linha sobre o que cada uma faz.
  - A resposta nomeia a tela e o caminho em texto puro (ex.: "Mais > Importar dados de saúde"). Sem link clicável nesta fase.
  - **Critérios:** teste valida que toda rota citada no mapa existe em `src/app`; o assistente não inventa tela que não existe; texto puro, sem marcação.
  - **Decisão aberta:** deep link clicável na bolha fica fora desta fase e pode virar tarefa do E11.

---

## E2 — Medicamentos completos

> Decisões a tomar antes de implementar: [`decisoes/E2-medicamentos-completos.md`](./decisoes/E2-medicamentos-completos.md).

**Funcionalidade:** `consultar_medicamentos` passa a devolver tudo o que o cadastro guarda.

**Por que:** hoje devolve só nome, dose, horários e período. Fora ficam frequência, forma, unidade, observações e estoque.

### 2.1 Frequência, forma, unidade e observações
- **História:** Como usuário, quero perguntar "tomo algum remédio só em dias específicos?" ou "esse remédio é a cada quantas horas?", para ter a resposta sem abrir a tela.
- **Especificação:**
  - Acrescentar à saída: `frequencia` (`DAILY`, `SPECIFIC_DAYS`, `EVERY_X_HOURS`), `diasDaSemana`, `intervaloHoras`, `forma`, `unidade`, `observacoes`.
  - Traduzir enums para pt-BR legível na saída (ex.: `EVERY_X_HOURS` vira "a cada X horas"), no mesmo espírito de `unidadeLegivel`.
  - Campo ausente vira `null`, nunca omitido em silêncio.
  - **Critérios:** teste com os três tipos de frequência; `renderDegraded` continua sem dose (decisão registrada na tool); a resposta não sugere mudança de frequência.

### 2.2 Estoque do medicamento
- **História:** Como usuário, quero perguntar "meu remédio está acabando?", para repor a tempo.
- **Especificação:**
  - Acrescentar `estoqueAtual`, `estoqueInicial`, `limiteDeEstoqueBaixo` e `estoqueBaixo` (booleano calculado na ferramenta: `estoqueAtual <= limite`, falso quando o limite é ausente).
  - Não estimar "dias restantes" nesta tarefa; se vier a existir, é cálculo determinístico na ferramenta, nunca do modelo.
  - **Critérios:** teste de limite ausente (nunca alerta); teste de estoque zero; o prompt manda dizer que é o estoque **registrado** pelo usuário.

---

## E3 — Adesão: doses tomadas

**Funcionalidade:** nova ferramenta `consultar_doses_tomadas`, lendo `MedicineDoseLog`.

**Por que:** o assistente sabe o horário cadastrado, mas não sabe se a pessoa tomou. Não responde "esqueci alguma dose?" nem "estou tomando direitinho?".

### 3.1 Ferramenta de histórico de doses
- **História:** Como usuário, quero perguntar "tomei meu remédio hoje?" e "quantas doses perdi esta semana?", para acompanhar minha rotina.
- **Especificação:**
  - Entrada opcional: `medicineId` ou nome, e janela (`dias`, máximo definido; padrão 7).
  - Cruza os horários esperados (frequência do `Medicine`) com os registros de `MedicineDoseLog` e devolve, por medicamento e dia, **tomadas** e **sem registro**.
  - O cálculo de "esperado versus registrado" é feito na ferramenta (determinístico), não pelo modelo.
  - Tabela nova no `backend.ts` com `grantReadData` e a env `MEDICINE_DOSE_LOG_TABLE_NAME`.
  - Usa o índice `medicineId` + `scheduledDate` quando houver id; `lerDoDono` caso contrário. Atenção ao crescimento da tabela (ver risco R3).
  - **Critérios:** teste de dose tomada, dose esperada sem registro, medicamento encerrado dentro da janela, e `SPECIFIC_DAYS`.

### 3.2 Linguagem segura para adesão
- **História:** Como usuário, quero um retorno neutro sobre minha adesão, sem julgamento nem orientação de dose.
- **Especificação:**
  - O prompt diz: "sem registro" não é "não tomou" (a pessoa pode ter tomado e não marcado).
  - A resposta nunca orienta compensar dose perdida, dobrar dose ou mudar horário. Em caso de dúvida sobre isso, encaminha ao profissional (R2).
  - **Critérios:** casos adversos na suíte de linguagem ("esqueci a dose, tomo duas agora?") caem no encaminhamento.

---

## E4 — Receitas e documentos

**Funcionalidade:** o assistente enxerga o que foi extraído das receitas e o estado de revisão dos documentos.

**Por que:** `PrescriptionItem` existe e o chat nunca o vê. O usuário não consegue perguntar "o que dizia minha receita?".

### 4.1 Ferramenta de itens de receita
- **História:** Como usuário, quero perguntar "o que o médico receitou na minha última receita?", para lembrar sem reabrir o papel.
- **Especificação:**
  - Nova ferramenta `consultar_receitas`: por documento, devolve `medicationLabel`, `dose`, `unit`, `frequency`, `duration` e `reviewStatus`.
  - Itens com `reviewStatus` pendente de conferência vêm marcados como "aguardando conferência" e a resposta os trata como não confirmados (mesmo princípio dos resultados de exame).
  - **Não** cria nem altera `Medicine`. A spec de extração proíbe isso (ação de risco alto).
  - **Critérios:** teste de item pendente, de item confirmado e de documento sem itens; teste de que a ferramenta não grava.

### 4.2 Situação da leitura dos documentos
- **História:** Como usuário, quero saber "meu exame já foi lido?" ou "por que não aparece valor?", para entender o que está pendente.
- **Especificação:**
  - Em `consultar_exames`, acrescentar o estado da extração (`PENDING`, `PROCESSING`, `READY`, `FAILED`, conforme o schema) em linguagem simples.
  - O texto bruto extraído (`rawText`) **não** vai ao modelo nesta fase: é grande, e os valores já chegam estruturados.
  - **Critérios:** teste dos quatro estados; a resposta nunca promete prazo de conclusão.

---

## E5 — Agenda e vacinas: campos faltantes

**Funcionalidade:** devolver os campos que as ferramentas hoje ignoram.

### 5.1 Observações do agendamento
- **História:** Como usuário, quero perguntar "o que anotei na minha consulta de quinta?", para lembrar do preparo.
- **Especificação:** `consultar_consultas` passa a incluir `observacoes`. Campo nulo vira `null`. **Critério:** teste com e sem observação.

### 5.2 Detalhes da vacina
- **História:** Como usuário, quero perguntar "qual foi o lote da minha dose?" e "quando é meu próximo reforço?", para ter o dado do cartão à mão.
- **Especificação:**
  - `consultar_vacinas` passa a incluir `lote`, `fabricante`, `observacoes`, `intervaloDeReforcoAnos`, `fazParteDeCampanha` e `totalDeDosesDaSerie`.
  - Data prevista de reforço, se mostrada, é cálculo determinístico na ferramenta (`aplicadaEm` + intervalo), nunca do modelo.
  - Mantém a restrição da ferramenta: não diz se a carteira está completa.
  - **Critérios:** teste de registro legado sem `catalogId` (campos ausentes não quebram); teste de reforço calculado.

---

## E6 — Wearable: série diária e histórico

**Funcionalidade:** o assistente enxerga mais do que o resumo da última importação.

**Por que:** hoje só lê `metricsJson` da última importação concluída. Não compara períodos nem olha dia a dia.

### 6.1 Histórico de importações
- **História:** Como usuário, quero perguntar "como meu sono mudou em relação à importação anterior?", para ver tendência.
- **Especificação:**
  - Nova ferramenta (ou parâmetro) que lista as importações concluídas com período e resumo, da mais recente à mais antiga, com teto de quantidade.
  - A comparação entre períodos é feita pela ferramenta quando possível; o modelo descreve, não calcula.
  - **Critérios:** teste com 0, 1 e N importações; importação `FAILED` ou corrompida é ignorada com aviso; períodos de tamanhos diferentes são sinalizados como não diretamente comparáveis.

### 6.2 Série diária
- **História:** Como usuário, quero perguntar "como foi meu sono na última quinta?", para ver um dia específico.
- **Contexto verificado no código:** não há conexão direta com wearable. O usuário exporta os arquivos do app de saúde do celular (Samsung Health ou Apple Health) e importa pela tela de importação (`import-health-data`). A função `analyze-health-import` processa e grava, em `HealthImport`, o resumo (`metricsJson`), os insights já gerados (`insightsJson`), os avisos (`warnings`) e a chave `resultArtifactKey`, que aponta para o `result.json` com a **série diária completa no S3**. Portanto os dados são sempre um retrato do dia da exportação, e a série diária **não** está no DynamoDB.
- **Especificação:**
  - Dar ao chat `grantRead` restrito ao prefixo `health-imports/*` do bucket (o chat hoje só lê DynamoDB). A chave vem **sempre** de `HealthImport` lido pelo dono, nunca da entrada do modelo. O prefixo já inclui o `identityId` do dono, e a ferramenta valida que a chave pertence à identidade antes de ler.
  - Nova ferramenta (ou parâmetro) que devolve um recorte pedido (dia ou intervalo curto, com teto de dias), nunca o arquivo inteiro (RT10).
  - A resposta sempre diz até que data vai a importação ("seus dados vão até DD/MM"), porque o dado não é ao vivo.
  - Reaproveitar também `insightsJson` e `warnings`: o app já os mostra, e o chat deve ser coerente com a tela.
  - **Critérios:** teste de chave de outro dono rejeitada; `result.json` ausente ou corrompido vira ausência de dado; dia fora do período devolve "sem dado neste dia".

---

## E7 — Recomendações de prevenção

> Decisões a tomar antes de implementar: [`decisoes/E7-recomendacoes-prevencao.md`](./decisoes/E7-recomendacoes-prevencao.md).

**Funcionalidade:** o assistente conhece as recomendações de prevenção que o app já mostra.

**Por que:** a tela de prevenção filtra recomendações (USPSTF) por idade, sexo e IMC. O chat não sabe o que a tela mostra.

### 7.1 Ferramenta de prevenção
- **História:** Como usuário, quero perguntar "que exames de prevenção valem para minha idade?", para me preparar para a consulta.
- **Contexto verificado no código:** a recomendação **não está no banco**. A Lambda `get-prevention-recommendations` busca o dataset inteiro na API da USPSTF a cada chamada (com `USPSTF_API_KEY`, sem cache), filtra pelo perfil (`uspstfFilter.ts`) e traduz cada texto pela API gratuita MyMemory (cota anônima de 5.000 palavras por dia por IP). Ela é um resolver do AppSync (lê `event.identity`, teto de 30 s), e não foi feita para ser chamada por outra função.
- **Especificação (sujeita às decisões D7.1 e D7.2):**
  - Nova ferramenta `consultar_prevencao`, somente leitura, sem entrada (o perfil vem da identidade). Devolve as recomendações aplicáveis ao perfil: nota (`grade`), título, texto, ano e faixa etária/sexo a que se aplicam.
  - `profileComplete = false` (ou perfil sem os campos usados no filtro) vira resposta: "preencha seu perfil para ver recomendações".
  - A resposta trata o conteúdo como **recomendação geral de uma fonte externa, o mesmo que o app mostra na tela de Prevenção**, e nunca como indicação individual. Sempre cita a fonte (USPSTF), a nota e o ano, e encaminha ao profissional (R2). Nunca diz "você deve fazer".
  - Falha ou indisponibilidade da API vira ausência de dado (RT3), com orientação para a tela de Prevenção.
  - **Critérios:** teste de perfil incompleto, de falha da API, de perfil que casa com nenhuma recomendação; casos adversos na suíte de linguagem ("preciso fazer mamografia?" não vira indicação); o filtro usado no chat e o da tela são o mesmo código, provado por teste.

---

## E8 — Campanhas e postos de vacinação

> Decisões a tomar antes de implementar: [`decisoes/E8-campanhas-e-postos.md`](./decisoes/E8-campanhas-e-postos.md).

**Funcionalidade:** o assistente responde sobre campanhas ativas e onde se vacinar.

### 8.1 Campanhas de vacinação
- **História:** Como usuário, quero perguntar "tem campanha de vacinação agora?", para aproveitar.
- **Especificação:**
  - **Verificado no código:** `VaccinationCampaignCache` tem chave `uf` (ou `NACIONAL`), `payload` e `expiresAt` em epoch seconds. A leitura é um `GetItem` por chave, sem Scan.
  - Nova ferramenta `consultar_campanhas`, lendo esse cache (`CAMPAIGN_CACHE_TABLE_NAME`) com `grantReadData`. Cache vazio ou vencido vira ausência de dado, sem chamada externa (não objetivo 3). Como o cache só é preenchido quando algum usuário abre a tela de campanhas, o chat pode encontrá-lo vazio: a resposta diz isso e indica a tela de vacinação.
  - Informa a data de atualização do cache.
  - A tabela é global (não tem dono). A ferramenta lê por chave, sem filtro de dono, e isso exige uma **exceção documentada** em `ownerScopedRead.ts` (função própria de leitura por chave, só para dado público). Não relaxar `lerDoDono`.
  - A UF vem do usuário na conversa ou assume `NACIONAL`. O perfil não guarda UF nem município.
  - **Critérios:** teste de cache vazio, vencido e válido; a resposta não afirma disponibilidade em um posto específico.

### 8.2 Postos de vacinação
- **História:** Como usuário, quero perguntar "onde posso me vacinar perto de mim?", para ir ao posto certo.
- **Verificado no código:** `VaccinationSiteCache` tem chave `codigoMunicipio` (código IBGE), TTL de cerca de 7 dias, e guarda a lista de unidades CNES (nome, bairro, logradouro, coordenadas). A distância (`distanciaKm`) depende de latitude e longitude **do aparelho**, que o app obtém por `locationService`. O perfil do usuário **não** tem município, UF nem localização, então o chat não sabe onde o usuário está.
- **Especificação:**
  - Nova ferramenta `consultar_postos`, que recebe `codigoMunicipio` e lê o cache por `GetItem` (`SITE_CACHE_TABLE_NAME`), sem Scan. Cache vazio ou vencido vira ausência de dado e orienta a abrir a tela de vacinação, que busca e preenche o cache.
  - **Como o chat obtém o município:** decisão D8.1 em [`decisoes/E8-campanhas-e-postos.md`](./decisoes/E8-campanhas-e-postos.md).
  - Sem município disponível, a ferramenta não chuta: pede ao usuário que abra a tela de vacinação ou informe a cidade.
  - A distância não é calculada no chat nesta fase (exigiria a coordenada do usuário em cada turno).
  - **Critérios:** teste de município sem cache, com cache vencido e com cache válido; a resposta não afirma que o posto aplica determinada vacina nem que está aberto agora.

---

## E9 — Interações medicamentosas

> Decisões a tomar antes de implementar: [`decisoes/E9-interacoes-medicamentosas.md`](./decisoes/E9-interacoes-medicamentosas.md).

**Funcionalidade:** o assistente usa o dataset curado de interações que o app já tem em `src/data`.

**Por que:** o dado existe e é local (sem API externa), mas o chat não o usa.

### 9.1 Dataset compartilhado entre app e função
- **História:** Como mantenedor, quero uma fonte única do dataset de interações, para app e assistente não divergirem.
- **Contexto verificado no código:** o dataset (`pairs.ts`, `aliases.ts`, `normalizeDrugName.ts`) e o serviço (`drugInteractionService.ts`) são TypeScript puro, hoje em `src/`. O backend nunca importa de `src/`, mas o app já importa de `amplify/functions/*` por caminho relativo (ex.: `unidadeLegivel`, `motivoDeFalha`).
- **Especificação (sujeita à decisão D9.1):** mover a lógica para um módulo compartilhado importável pelos dois lados, sem mudar o comportamento do app.
  - **Critérios:** `typecheck` e `typecheck:backend` verdes; os testes existentes de `pairs`, `normalizeDrugName` e `drugInteractionService` passam sem alteração de asserção; a tela de medicamentos continua mostrando os mesmos alertas.

### 9.2 Ferramenta de interações
- **História:** Como usuário, quero perguntar "posso tomar esses remédios juntos?", para saber se há um alerta registrado.
- **Especificação:**
  - Nova ferramenta `consultar_interacoes`, que cruza **os medicamentos cadastrados e ativos** do usuário (e, conforme a decisão D9.2, medicamentos que ele citar na conversa) com o dataset e devolve só pares **existentes no dataset**, com a gravidade e o texto curados.
  - Nome que o dataset não reconhece **não** é tratado como "sem interação": a ferramenta lista os nomes não reconhecidos e a resposta diz que não pôde verificá-los (decisão D9.3).
  - Resposta de "nenhuma interação encontrada" diz que isso vale **só para a base curada do app** e não garante segurança. Nunca afirma "pode tomar junto".
  - Nunca recomenda suspender, trocar ou ajustar. Em qualquer dúvida, encaminha ao profissional (R2).
  - **Critérios:** teste com par conhecido, sem par, medicamento encerrado (ignorado), e nome com variação de grafia; casos adversos na suíte de linguagem.

---

## E10 — Visão geral e cruzamento de domínios

**Funcionalidade:** o assistente responde perguntas amplas ("como estou?") juntando domínios, sem interpretar clinicamente.

**Por que:** cada ferramenta é um silo, e a de wearable proíbe relacionar com exames. Perguntas reais costumam cruzar assuntos.

### 10.1 Ferramenta de panorama
- **História:** Como usuário, quero perguntar "me dá um resumo da minha saúde", para ter o quadro geral em uma resposta.
- **Especificação:**
  - Nova ferramenta `consultar_panorama`, que devolve contagens e datas, **sem valores clínicos**: nº de documentos e data do último exame, medicamentos ativos, próxima consulta, última vacina aplicada, última importação de wearable.
  - Resolve com poucas leituras em paralelo, para respeitar o limite de iterações (RT10).
  - **Critérios:** teste com perfil vazio (tudo `disponivel: false`) e perfil completo; a resposta aponta para as ferramentas específicas quando o usuário quiser detalhes.

### 10.2 Comparação entre domínios (em estudo)
- **História:** Como usuário, quero comparar meu último exame com minha rotina de sono, para ver os dados lado a lado.
- **Decisão do produto (2026-10-17):** há risco de interferência clínica, mas vale **estudar uma forma de comparar e apresentar** ao usuário. Esta tarefa começa por um estudo, não por código.
- **Especificação do estudo (entregável: documento curto em `specs/10-finalizacao-codigo/01-melhorias-ia/estudos/`):**
  - Levantar quais pares de domínios têm comparação útil e defensável (ex.: valores de um exame e a média de sono do mesmo período; adesão a um medicamento e a data de um exame).
  - Para cada par, definir uma **forma de apresentação que não interprete**: dois blocos separados, cada um com data e origem, e uma frase fixa de que a comparação é visual e não indica causa. Avaliar também uma apresentação em tela (cartão ou gráfico com os dois períodos) em vez de só texto, porque texto carrega mais autoridade que um ponto num gráfico.
  - Definir o **alinhamento de período** (comparar janelas do mesmo intervalo de datas) e o que acontece quando os períodos não coincidem.
  - Testar contra a regra 4 e as regras R1 a R5 com casos adversos ("meu sono causou meu colesterol alto?").
  - A restrição atual de `consultar_wearable` ("NÃO relaciona com exames") **permanece** até o estudo ser aprovado.
  - **Critério de saída:** decisão registrada de implementar (com o formato escolhido), implementar só o panorama (10.1) ou descartar.

---

## E11 — Ações com confirmação do usuário

**Funcionalidade:** o assistente propõe uma ação e o **usuário** confirma e executa. A função continua sem escrever.

**Por que:** hoje o assistente diz o que fazer, mas não ajuda a fazer. A decisão D9 impede a IA de gravar dado clínico, e este épico respeita isso reutilizando o desenho da memória: a IA **propõe**, o app **mostra com botões**, a pessoa **decide**, e a gravação sai do cliente pelos serviços de `src/services`.

**Decisão do produto (2026-10-17):** o desenho "IA propõe, usuário clica em salvar" está **aprovado**. Ainda **não** estão definidos *onde* a confirmação acontece (formulário existente pré-preenchido, cartão na própria conversa ou outro) nem *quais ações* entram. Ao chegar neste épico, o primeiro passo é um estudo cuidadoso desses dois pontos, e as tarefas 11.2 a 11.4 abaixo são **candidatas**, não escopo fechado.

### 11.1 Contrato de proposta de ação
- **História:** Como usuário, quero que o assistente me ofereça "Quer que eu abra o formulário de nova consulta com estes dados?", para economizar digitação sem perder o controle.
- **Especificação:**
  - Estender o envelope de resposta (como `memoria`) com um campo opcional `acaoProposta`: `tipo` (lista fechada, ex.: `ABRIR_NOVO_AGENDAMENTO`, `ABRIR_NOVO_LEMBRETE`) e `campos` pré-preenchidos.
  - Validação estrita no servidor (schema zod, tipos fechados, no estilo de `propostaValida.ts`). Proposta inválida é descartada em silêncio.
  - A função **não grava**. O app abre o formulário existente já preenchido; o usuário revisa e salva pelo fluxo normal.
  - **Critérios:** teste de que `CHAT_TOOLS` segue 100% `readOnly`; proposta com tipo desconhecido é descartada; no máximo uma proposta por resposta.

### 11.2 Proposta de novo agendamento
- **História:** Como usuário, quero dizer "marca retorno com a dra. Ana dia 20 às 14h" e ver o formulário pronto, para só confirmar.
- **Especificação:**
  - O assistente extrai nome, data, hora e profissional da fala do usuário (nunca de dados vindos de ferramenta ou de documento) e propõe `ABRIR_NOVO_AGENDAMENTO`.
  - O app abre `add-appointment` com os campos preenchidos. Data ambígua ("sexta") é resolvida com a data de hoje (E1.1) e **mostrada** ao usuário para conferência.
  - **Critérios:** campo faltante fica vazio, não inventado; nada é salvo sem o toque do usuário no formulário.

### 11.3 Proposta de novo lembrete de medicamento
- **História:** Como usuário, quero pedir "me lembra de tomar vitamina D às 8h" e revisar o cadastro pronto.
- **Especificação:**
  - Propõe `ABRIR_NOVO_LEMBRETE` com nome e horário **ditos pelo usuário**. A **dose nunca é sugerida pela IA**: se o usuário não informar, o campo fica vazio.
  - **Critérios:** teste de que dose só aparece quando veio literalmente da fala do usuário; caso adverso ("qual dose devo tomar?") não gera proposta e encaminha ao profissional.

### 11.4 Registro de dose tomada (a avaliar)
- **História:** Como usuário, quero dizer "tomei o remédio das 8h" e confirmar o registro com um toque.
- **Especificação:** mesmo contrato de 11.1, tipo `CONFIRMAR_DOSE_TOMADA`, exibido como cartão com botões Confirmar e Cancelar. O registro usa o serviço existente do cliente (id determinístico, evita duplicar). **Fora do escopo da primeira entrega**; entra só se 11.1 a 11.3 funcionarem bem.

---

## E12 — Histórico de conversas

**Funcionalidade:** o usuário consegue retomar o que conversou antes.

**Achado (2026-10-17, depois do PRD ter sido escrito):** o histórico **já é persistido**. A spec `specs/07-ia-conversa/memoria-do-usuario/spec.md` registra que a conversa é persistida (entrega C8/C9), o app tem `src/services/chatHistoryService.ts` e `src/components/HistoryDrawer.tsx` (gaveta de histórico), e o Assistente reabre a conversa que estava aberta. Portanto a premissa original deste épico ("o app talvez guarde só em memória") não vale. O que resta é decidir se há lacuna real.

### 12.1 Levantamento do que falta
- **História:** Como time, queremos saber o que a persistência atual **não** cobre, para decidir se o épico vale a pena.
- **Especificação:** ler `chatHistoryService.ts`, `HistoryDrawer.tsx`, `ChatBotScreen.tsx` e a spec da conversa, e listar o que o usuário não consegue fazer hoje (ex.: buscar numa conversa antiga; o assistente consultar o que foi dito em outra conversa). Entrega: nota curta em `specs/10-finalizacao-codigo/01-melhorias-ia/estudos/`. **Critério:** decisão registrada de seguir, adiar ou descartar 12.2. Se não houver lacuna, o épico é encerrado como "já atendido".

### 12.2 Retomar conversa anterior (condicional)
- **História:** Como usuário, quero perguntar "o que você me disse ontem sobre meu exame?", para não repetir a conversa.
- **Especificação:** definida após 12.1. Ressalva de privacidade: histórico de conversa pode conter dado sensível, e deve respeitar a mesma proteção por dono e a opção de apagar do usuário. Não confundir com a **memória** (fatos que o usuário aprovou).

---

## 6. Riscos

| ID | Risco | Mitigação |
|---|---|---|
| R1 | Mais ferramentas confundem o modelo na escolha. | RT9: descrições curtas e contrastantes, e testes de roteamento por pergunta. |
| R2 | Mais dado no contexto aumenta custo e latência e estoura as 6 iterações. | RT10, E10.1 (panorama), resumos em vez de tabelas. |
| R3 | `Scan` com filtro de dono não escala (ex.: log de doses cresce todo dia). | Usar índices existentes (`medicineId` + data); janela obrigatória; reavaliar chave composta se medir lentidão. Mudança de schema é decisão explícita (RT7). |
| R4 | Dado ampliado empurra a IA para além do informativo (adesão, interação, cruzamento). | RT5, E3.2, E9.2, E10.2, e casos adversos na suíte de linguagem. |
| R5 | Dataset duplicado entre `src/` e `amplify/` diverge. | E9.1. |
| R6 | Ação proposta pela IA vira escrita sem consentimento. | E11: função segue `readOnly`; gravação só no cliente, após toque do usuário. |

## 7. Decisões

**Fechadas (2026-10-17):**
1. **Proatividade:** fora de escopo. O assistente só responde quando perguntado.
2. **E11:** aprovado o desenho "IA propõe, usuário confirma e salva". Falta decidir onde e quais ações (estudo ao chegar no épico).
3. **E10.2:** manter o interesse em comparar domínios, mas só após estudo de formato (ver 10.2). Nada muda no comportamento atual até lá.
4. **Ordem de entrega:** E7, E8, E2, E9, E1 primeiro.

**Abertas, com análise completa (opções, benefícios, malefícios e recomendação) em [`decisoes/`](./decisoes/README.md):**

| Épico | Decisões | Documento |
|---|---|---|
| E7 | D7.1 fonte dos dados no chat; D7.2 idioma e texto; D7.3 reforço da R3 — **fechadas em 2026-10-17 (A · A · A)** | `E7-recomendacoes-prevencao.md` |
| E8 | D8.1 como o chat obtém o município; D8.2 campanhas com cache vazio; D8.3 leitura de tabela pública; P1 campanhas pelo calendário e D8.4 reforço da R3 para vacina (nasceram na spec) — **fechadas em 2026-10-17 (A · A · A · A · A)**. Com P1 = A, 8.1 não lê o cache de campanhas: usa o calendário da tela (ver spec do E8). | `E8-campanhas-e-postos.md` |
| E2 | D2.1 estoque; D2.2 observações; D2.3 "tomado hoje" | `E2-medicamentos-completos.md` |
| E9 | D9.1 onde mora o dataset; D9.2 medicamento citado na conversa; D9.3 nome não reconhecido | `E9-interacoes-medicamentosas.md` |
| E1 | D1.1 onde entra a data; D1.2 fuso; D1.3 mapa do app | `E1-contexto-e-mapa-do-app.md` |

## 8. Verificações feitas e pendentes

**Feitas no código:**
- **Wearable:** não há conexão direta. O usuário exporta pelo app de saúde do celular e importa pela tela do app. A série diária completa fica em `result.json` no S3 (`resultArtifactKey`), e o resumo e os insights ficam em `HealthImport` (ver E6.2).
- **Caches de vacinação:** `VaccinationCampaignCache` é indexado por `uf`, `VaccinationSiteCache` por `codigoMunicipio`, ambos com `expiresAt`. Leitura por chave, sem Scan. O perfil não guarda município (ver E8).
- **Prevenção:** a Lambda busca a USPSTF ao vivo a cada chamada e traduz por MyMemory; não há cache (ver E7).
- **Interações:** dataset e serviço são TypeScript puro em `src/`; o app já importa de `amplify/functions/*`, o contrário não existe (ver E9).

**Pendentes (fazer ao chegar no épico):**
- Qual lacuna real resta no histórico de conversas, já que ele é persistido (E12.1).
- Valores reais dos enums de status de extração de documento (E4.2) e a lista de rotas do mapa do app (E1.2).
- Tamanho real da resposta da API da USPSTF e latência medida (E7). Continua pendente depois da entrega: depende do sandbox, roteiro em `E7-recomendacoes-prevencao/tasks.md`.

## 9. Fora desta versão

- **Proatividade** (notificação, sugestão espontânea, resumo automático): mantido como não objetivo.
- Link clicável de navegação dentro da bolha.
- Leitura do texto bruto extraído dos documentos.
