# SPEC: E4 — Receitas e documentos

Estado: **aprovada em 2026-10-19; implementada e revisada (seção 9); épico concluído em 2026-10-19** · Data: 2026-10-19 · Parte 1, épico 8 de 12 · Esforço: M

## 1. Identificação

- **Origem:** PRD (`../prd.md`, E4). `PrescriptionItem` existe e o chat nunca o vê; e o chat não sabe dizer se um documento já foi lido, então "por que não aparece valor?" fica sem resposta.
- **Tarefas do PRD cobertas:** 4.1 (itens de receita) e 4.2 (situação da leitura dos documentos).
- **Decisões aplicadas** (`../decisoes/E4-receitas-e-documentos.md`):
  - **D4.1 = A (2026-10-19):** o chat mostra os itens lidos das receitas, mesmo sem tela que os mostre, e **todo** item vai como leitura automática do papel; só `CONFIRMADO_PELO_USUARIO` conta como conferido (hoje, nenhum item chega lá). A resposta manda conferir na foto da receita.
  - **D4.2 = A (2026-10-19):** ao modelo vai só o **nome** do remédio, sem concentração, e se o papel trazia posologia. Dose, unidade, frequência, duração e o texto bruto **não** saem da ferramenta. A R3 não muda.
- **Correção do PRD (verificada no código):** a 4.2 citava `READY`, que não existe em `EXTRACTION_STATUS`. Os estados reais são `PENDING`, `PROCESSING`, `SUCCEEDED`, `NO_RESULTS`, `FAILED` e o nulo de documento que nunca passou pela leitura.
- **Arquivos afetados (previsão, o `plan.md` detalha):**
  - nasce `tools/receitas.ts` (`consultar_receitas`) e `tools/receitasSaida.ts` (puro: linhas do banco → saída);
  - nasce `tools/situacaoDaLeitura.ts` (puro: documento → situação da leitura em linguagem simples), usado por `consultar_exames` e `consultar_receitas`;
  - muda `tools/exames.ts` (situação da leitura por documento);
  - muda `tools/ownerScopedRead.ts` (o índice `documentId` de `PrescriptionItem` entra na lista fechada da porta por índice);
  - muda `tools/index.ts`, `chatPrompt.ts`, `amplify/backend.ts` (tabela `PrescriptionItem` só leitura, `Query` no índice);
  - testes novos e ampliados em `amplify/functions/chat-assistant/__tests__/`.
  - **Não muda:** schema do Amplify Data, telas do app, regras de linguagem (R1 a R5), a Lambda de extração.
- **Ator:** usuário (paciente) que guardou uma receita ou um exame e quer lembrar do conteúdo ou entender por que um valor não aparece.
- **Prioridade:** P2 (valor médio).
- **Sensibilidade: alta.** Receita é prescrição: nome de remédio lido por OCR pode estar errado, e posologia dita pelo assistente é exatamente o que a regra 4 da constituição e a R3 proíbem.

### Quem pergunta, e as 5 perguntas reais

**Quem e quando:** na farmácia, sem o papel na mão; em casa, ao organizar os remédios depois de uma consulta; logo depois de fotografar um exame, esperando o resultado aparecer. Muitos são idosos, com baixo letramento digital.

As cinco perguntas, como ela escreveria (viram os testes de ponta a ponta na conferência do sandbox):

1. "o que o medico receitou na minha ultima receita"
2. "quais remedios tavam na receita do cardiologista"
3. "meu exame de sangue ja foi lido?"
4. "pq nao aparece os valores do meu exame"
5. "de quanto em quanto tempo eu tomo o remedio da receita" (adversária: pede posologia)

**O que a pessoa faz com a resposta:** compra ou separa o remédio, ou espera a leitura terminar e abre o documento. Como a leitura é automática e não conferida, a resposta sempre aponta para a foto da receita, e a forma de usar fica com a receita e com quem receitou.

**O que seria pior que não responder:** dizer um nome de remédio como certo quando o OCR o leu errado; dizer dose ou intervalo lidos do papel, que viram orientação do assistente; prometer quando a leitura vai terminar; inventar por que um valor não apareceu.

**Dado vazio, antigo ou contraditório:** a maioria das pessoas não tem receita guardada; documentos antigos não têm `extractionStatus` (nunca lidos); receita lida pode não ter item nenhum (`NO_RESULTS`) ou ter item sem posologia. Documento sem tipo (`documentType` nulo) não conta como receita.

## 2. Contexto e estado atual (verificado no código em 2026-10-19)

- `PrescriptionItem` (`amplify/data/schemas/medical-documents.ts`): `documentId`, `medicationLabel` (obrigatório), `dose`, `unit`, `frequency`, `duration` (texto do papel), `rawText`, `confidence`, `reviewStatus`. Índice `documentId`, gerado como `prescriptionItemsByDocumentId` (conferido em `amplify_outputs.json`).
- A Lambda `extract-document-data` grava os itens: confiança abaixo do limite → `PENDENTE_DE_REVISAO`, senão `AUTO` (`prescriptionNormalizer.ts`). Receita sem item nenhum termina em `NO_RESULTS`.
- **Achado A1:** o app não lista `PrescriptionItem` em nenhuma tela e não tem como conferir um item (base da D4.1). A tela do documento (`DocumentDetailScreen`) mostra um resumo e o botão "Baixar documento", **não** a imagem (corrigido na revisão), e a seção "Resultados extraídos" lê só `LabResult`.
- **Achado A2:** `medicationLabel` pode vir com a concentração colada ("Losartana 50mg"). A R3 reprova "50 mg" na resposta. `removerDose` (`drug-interactions-shared/normalizeDrugName.ts`) já tira concentração e parênteses do nome, e o E9 a usa para mostrar o nome sem dose.
- `consultar_exames` (`tools/exames.ts`) lista documentos (nome, tipo, datas, laboratório) e não diz nada da leitura.
- A tela do documento (`ExtractedResultsSection.tsx`) tem um texto por estado: em andamento ("Estamos lendo o documento"), `NO_RESULTS` ("não tem valores acompanháveis — laudos descritivos, culturas e sorologias"), `FAILED` (o motivo, quando é frase da lista fechada `motivoDeFalha.ts`, senão uma frase genérica, e o botão "Tentar de novo"), nunca lido ("guardado antes da leitura automática existir", botão "Ler agora"), e "O que ficou de fora" com os avisos da leitura.
- **Achado A3:** um `PROCESSING` com início há mais de 11 minutos está travado, não rodando (`JANELA_DE_TRAVAMENTO_MS` em `start-document-extraction/handler.ts`; a Lambda tem teto de 10 minutos). A constante é privada daquele arquivo.
- **Achado A4:** os avisos da leitura (`extractionWarnings`) misturam frases do sistema com avisos escritos pelo modelo de extração a partir do papel. Texto vindo do papel é dado de terceiro e pode carregar instrução plantada; por isso ele não vai ao modelo do chat (ver H8).
- `lerDoDonoPorIndice` (E3) exige uma faixa na chave de ordenação. O índice de `PrescriptionItem` não tem chave de ordenação.

## 3. Histórias e cenários

**Histórias (PRD 4.1 e 4.2):** como usuário, quero perguntar "o que o médico receitou na minha última receita?", para lembrar sem reabrir o papel. Como usuário, quero saber "meu exame já foi lido?" ou "por que não aparece valor?", para entender o que está pendente.

- **H1 — Itens da última receita.**
  Given a pessoa guardou uma receita, lida, com dois itens `AUTO` ("Losartana 50mg", "Hidroclorotiazida") com dose e frequência no papel
  When ela pergunta "o que o medico receitou na minha ultima receita"
  Then `consultar_receitas` devolve a receita com os itens `Losartana` e `Hidroclorotiazida`, `temPosologiaNoPapel: true`, `conferidoPelaPessoa: false`
  And a resposta lista os dois nomes, diz que foram lidos automaticamente da foto e que vale conferir na receita, em "Exames > tocar na receita".

- **H2 — Item de leitura duvidosa.**
  Given um item está `PENDENTE_DE_REVISAO`
  Then ele vem com `leituraDuvidosa: true`
  And a resposta diz que aquele nome pode ter sido lido errado e deve ser conferido no papel.

- **H3 — Posologia pedida (adversário).**
  Given a receita tem `frequency: "de 8 em 8 horas"` e `dose: "50"`
  When a pessoa pergunta "de quanto em quanto tempo eu tomo o remedio da receita"
  Then a saída da ferramenta não contém `dose`, `unit`, `frequency`, `duration`, `rawText` nem o número 8 ou 50
  And a resposta diz que a forma de usar está escrita na receita e que quem receitou ou o farmacêutico orienta, sem número.
  And se o modelo ainda assim escrever "de 8 em 8 horas" ou "50 mg", a R3 reprova (comportamento atual, não muda).

- **H4 — Receita sem itens.**
  Given a receita foi lida e não rendeu item (`NO_RESULTS`), ou ainda não foi lida
  Then ela vem com `itens: []` e a situação da leitura em linguagem simples
  And a resposta não inventa remédio e diz o que a pessoa pode fazer (abrir a foto; "Ler agora" ou "Tentar de novo" na tela do documento, conforme o estado).

- **H5 — Nenhuma receita.**
  Given a pessoa não tem documento do tipo receita
  Then `disponivel: false` e `explicacao` diz que não há receita guardada
  And a resposta diz onde guardar uma ("Exames > botão +").

- **H6 — Situação da leitura de um exame.**
  Given um exame em cada estado
  When a pessoa pergunta "meu exame de sangue ja foi lido?"
  Then `consultar_exames` devolve, por documento, a `leitura` com uma das situações: `nunca_lido`, `na_fila`, `lendo`, `demorando`, `lido`, `sem_valores`, `falhou`
  And a resposta diz a situação com as palavras da tela, **sem prometer prazo** ("em alguns minutos", "logo", "até amanhã" não aparecem na saída da ferramenta).

- **H7 — Leitura travada.**
  Given um documento em `PROCESSING` com início há mais de 11 minutos, ou `PENDING` há mais de 11 minutos
  Then a situação é `demorando`
  And a resposta diz que está demorando mais que o normal e que dá para abrir o documento e tentar de novo.

- **H8 — Por que não aparece valor.**
  Given um exame `FAILED` com motivo da lista fechada, ou `NO_RESULTS`, ou `SUCCEEDED` com avisos
  When a pessoa pergunta "pq nao aparece os valores do meu exame"
  Then em `FAILED` a saída traz o motivo **só** se ele for frase da lista fechada (`ehCopyDeFalha`); senão, uma frase genérica
  And em `NO_RESULTS` a saída explica que o documento não tem valores acompanháveis, como a tela
  And com avisos, a saída traz **só a contagem** (`avisosDaLeitura`), e a resposta manda ver "O que ficou de fora" na tela do documento. O texto dos avisos não vai ao modelo.

- **H9 — Dado de outra pessoa (adversário).**
  Given a tabela tem receitas e itens de outro dono
  Then nenhuma leitura de `consultar_receitas` monta consulta com dono que não seja o do token
  And um item devolvido pelo índice com outro dono é descartado.

- **H10 — A ferramenta não grava.**
  Then `consultar_receitas` é `readOnly: true`, só usa as portas de leitura, e a função não ganha permissão de escrita em `PrescriptionItem` nem em `Medicine`.

- **H11 — Modo degradado.**
  Given o turno cai no modo degradado depois de `consultar_receitas`
  Then o bloco mostra a receita e os nomes dos remédios, com "lido da foto, sem conferência", sem dose nem intervalo.

## 4. Mapa de dados

| Ferramenta | Lê | De onde | Devolve | **Não** devolve |
|---|---|---|---|---|
| `consultar_receitas` (nova) | documentos do tipo `prescription` | `MedicalDocument` por `lerDoDono` | até **5** receitas, mais recentes por `documentDate`: `documentId`, `titulo`, `dataDaReceita`, `validaAte` (`expirationDate`), `leitura` (situação), `itens`, `itensOmitidos`; e `receitasOmitidas` | `s3Key`, `extractedTextKey`, `modelId`, tokens, `extractionError` cru |
| | itens de cada receita | `PrescriptionItem` pelo índice `documentId`, em paralelo, pela porta por índice | até **15** itens por receita: `remedio` (`medicationLabel` sem concentração, por `removerDose`, cortado em 80 caracteres), `temPosologiaNoPapel` (algum de `dose`, `unit`, `frequency`, `duration` preenchido), `conferidoPelaPessoa` (`CONFIRMADO_PELO_USUARIO`), `leituraDuvidosa` (`PENDENTE_DE_REVISAO`) | `dose`, `unit`, `frequency`, `duration`, `rawText`, `confidence` |
| `consultar_exames` (muda) | o mesmo de hoje | `MedicalDocument`, `LabResult` | o de hoje e, por documento, `leitura`: `{ situacao, motivoDaFalha?, avisosDaLeitura? }` | texto dos avisos, erro técnico |

**Situação da leitura** (módulo puro, uma regra para as duas ferramentas):

| Estado no banco | Condição | `situacao` |
|---|---|---|
| nulo | | `nunca_lido` |
| `PENDING` | início há até 11 min, ou sem data | `na_fila` |
| `PROCESSING` | início há até 11 min, ou sem data | `lendo` |
| `PENDING` ou `PROCESSING` | início há mais de 11 min | `demorando` |
| `SUCCEEDED` | | `lido` |
| `NO_RESULTS` | | `sem_valores` |
| `FAILED` | | `falhou`, com `motivoDaFalha` só se for frase da lista fechada |
| qualquer outro valor | | `desconhecida` (não vira `nunca_lido`), e a resposta diz que não sabe a situação |

`avisosDaLeitura` (número) aparece só quando maior que zero. A saída explica as situações **uma vez**, num campo `explicacaoDaLeitura`, e não por documento.

## 5. Requisitos não funcionais

- **Segurança:** `readOnly: true`, `inputSchema` `z.object({}).strict()`. Dono só do token, nas duas leituras. A porta por índice ganha a entrada `ITENS_POR_RECEITA` na lista fechada `INDICES_DO_DONO`; a re-checagem de dono depois da consulta continua valendo. `backend.ts`: `grantReadData` em `PrescriptionItem` e `dynamodb:Query` só em `<tabela>/index/*`. Nada de escrita.
- **LGPD e regra 4:** dose e intervalo lidos do papel não saem da ferramenta (D4.2). O nome do remédio vai sem concentração. Nenhum texto que veio do papel além do nome do remédio chega ao modelo (A4).
- **Performance:** uma leitura de documentos (Scan com dono, como hoje) e até 5 `Query` em paralelo (`Promise.all`), uma por receita. Nada de Scan em `PrescriptionItem`. `consultar_exames` não ganha leitura nova: a situação sai de campos que ela já lê.
- **Custo de tokens:** saída com teto (5 receitas × 15 itens, nomes curtos, três booleanos por item). As explicações vão uma vez por saída. O prompt ganha duas frases curtas.
- **Tempo:** sem fonte externa e sem I/O além do DynamoDB.

## 6. Critérios de aceite

1. `consultar_receitas` está em `CHAT_TOOLS`, é `readOnly: true`, tem `inputSchema` `.strict()` e recusa qualquer campo de entrada (ex.: `owner`).
2. Com uma receita de dois itens `AUTO`, a saída traz os dois nomes, `temPosologiaNoPapel` correto e `conferidoPelaPessoa: false` (H1).
3. Item `PENDENTE_DE_REVISAO` sai com `leituraDuvidosa: true`; item `CONFIRMADO_PELO_USUARIO` sai com `conferidoPelaPessoa: true` (H2).
4. A saída serializada de `consultar_receitas` não contém as chaves `dose`, `unit`, `frequency`, `duration`, `rawText`, `confidence`, nem os valores desses campos do item de teste (H3).
5. "Losartana 50mg" sai como "Losartana"; nome com mais de 80 caracteres sai cortado (A2).
6. Receita sem item sai com `itens: []` e a situação da leitura; sem nenhuma receita, `disponivel: false` com `explicacao` (H4, H5).
7. Documento com `documentType` diferente de `prescription` (exame ou nulo) não entra em `consultar_receitas`.
8. Mais de 5 receitas: saem as 5 mais recentes e `receitasOmitidas` conta o resto. Mais de 15 itens numa receita: saem 15 e `itensOmitidos` conta o resto.
9. Os itens são lidos pela porta por índice (`QueryCommand` em `prescriptionItemsByDocumentId`, chave `documentId`, filtro de dono do token), um por receita; nenhuma `ScanCommand` na tabela de itens. Item com outro dono vindo do índice é descartado (H9).
10. O módulo de situação da leitura devolve a situação certa para cada linha da tabela da seção 4, incluindo os dois casos de travado (11 min) e o valor fora da lista (H6, H7).
11. Em `FAILED`, `motivoDaFalha` só aparece quando o texto gravado é frase da lista fechada; um erro técnico gravado não aparece em nenhum campo da saída (H8).
12. `consultar_exames` devolve `leitura` por documento e `avisosDaLeitura` só como número; o texto dos avisos não aparece na saída (H8).
13. Nenhum texto de saída das duas ferramentas promete prazo: a saída não contém as palavras inteiras "minuto(s)", "logo", "em breve", "hora(s)" nem "amanhã" (H6).
14. `renderDegraded` de `consultar_receitas` mostra receita e nomes sem dose nem intervalo, e o bloco passa por `checkLanguageRules` sem violação (H11).
15. Casos de linguagem (testes com `checkLanguageRules`): "Na receita de 10/10 aparecem losartana e hidroclorotiazida, lidas automaticamente da foto; confira no papel" passa; "Tome losartana de 8 em 8 horas, como diz a receita" e "A receita diz 50 mg de losartana" são reprovadas pela R3.
16. `tools.test.ts`: a lista inteira continua sem escrita e sem dono hostil, com `PRESCRIPTION_ITEM_TABLE_NAME` nas variáveis.
17. `backend.ts`: `PrescriptionItem` no laço de `grantReadData`, `PRESCRIPTION_ITEM_TABLE_NAME` no ambiente do chat, `dynamodb:Query` só em `index/*` da tabela (teste de infra no padrão de `infraDoses.test.ts`).
18. `chatPrompt.ts` diz quando usar `consultar_receitas` (o que a receita trazia) e em que ela difere de `consultar_medicamentos` (o que a pessoa cadastrou) e de `consultar_exames` (que documentos existem e se já foram lidos); e diz para tratar todo item como leitura da foto, não falar de dose nem intervalo da receita, e não prometer prazo de leitura.
19. `npm run validate` verde.

## 7. Fora de escopo

- Tela que lista ou confere itens de receita (Parte 2; D4.1).
- Posologia da receita no chat (D4.2).
- Transformar item de receita em medicamento cadastrado ou lembrete (proibido pela spec de extração).
- Texto bruto extraído (`rawText`, `extractedTextKey`) e o texto dos avisos da leitura.
- Disparar ou refazer a leitura pelo chat (o chat só lê).
- A seção "Resultados extraídos" mostrar "0 valores lidos" numa receita lida: defeito da tela, registrado aqui, fora deste épico.
- ~~Itens de leituras antigas~~: entrou no fechamento (seção 10, D4.3).

## 8. O que depende de dispositivo, sandbox ou rede

- As cinco perguntas da seção 1 contra o modelo real, com receitas e exames reais, só no `ampx sandbox`.
- A permissão `Query` no índice de `PrescriptionItem` e o nome real do índice no ambiente implantado só se provam no sandbox; os testes provam a política montada e o nome lido de `amplify_outputs.json`.

## 9. O que mudou na revisão (2026-10-19)

- **Nome do remédio sem nenhum número do papel (D4.2):** `removerDose` só corta número seguido de unidade; "AAS 100", "Bisoprolol 2,5mg" (sobrava "2,") e "Paracetamol 750 1cp 8/8h" passavam pela R3, e o modo degradado não passa pela verificação. O nome é cortado na primeira palavra que começa por dígito, e o que sobra pendurado ("de", vírgula) sai. "B12" e "D3" ficam.
- **O mesmo remédio lido duas vezes sai uma vez,** com os avisos juntados pelo lado cauteloso (duvidosa se alguma leitura foi; conferido só se todas foram).
- **Motivo de falha sem prazo (CA-13):** a frase da falha genérica ("tente de novo em alguns minutos") não vai ao modelo.
- **Explicação das situações:** `nunca_lido` não afirma que o documento é antigo; `sem_valores` diz o que é numa receita; `demorando` avisa que a tela pode ainda mostrar que está lendo; `falhou` diz que itens ou valores já mostrados são da leitura anterior. A explicação só vai quando há documento.
- **Caminho da receita:** a tela não mostra a imagem; o aviso e o prompt dizem "Exames > tocar no documento > Baixar documento", e "arquivo" no lugar de "foto" (pode ser PDF).
- **Prompt:** receitas contrastadas também com `consultar_exames`; `validaAte` dita como data registrada, sem dizer se ainda vale.
- **Modo degradado:** receita sem item diz a situação da leitura, e a data sai em DD/MM/AAAA, como nas outras ferramentas.
- **Travado:** a regra (e não só a janela de 11 min) é uma só para o chat e a Lambda de início (`passouDaJanelaDeTravamento`); antes, no instante exato das 11 min, as duas discordavam. `PENDING` com início vazio ou ilegível cai para `createdAt`. Documento sem id não vira consulta.

## 10. Riscos corrigidos no fechamento (2026-10-19, a pedido do usuário)

- **Itens de leituras antigas (D4.3 = A):** a `extract-document-data` passa a apagar, na releitura de receita que deu certo, os itens que a leitura nova não gravou, depois de gravar os novos, sem tocar no que a pessoa conferiu nem em linha de outro dono, e nunca quando a leitura nova pode estar incompleta (PDF dividido com parte que falhou) ou não gravou item (`regravacaoDaReceita.ts`, `listarItensDaReceita`, permissão de `Query` no índice dos itens). O chat esconde os itens velhos que já estavam no banco: em leitura concluída (`SUCCEEDED` ou `NO_RESULTS`), só sai item com `updatedAt` a partir do início da última leitura; sem data para comparar, o item fica; numa releitura que falhou, os itens da leitura anterior continuam, como na tela. **Este é o único ponto do E4 que muda a Lambda de extração**, por decisão registrada.
- **Número colado a pontuação:** "AAS-100", "Clav.125", "Losartana:50" também perdem o número (revisão das correções).
- **Combinação no nome:** "Amoxicilina 875 + Clavulanato 125mg" sai "Amoxicilina + Clavulanato": cada parte separada por "+" é limpa sozinha. Nenhum número do papel sai.
- **Leitura dupla:** a porta do dono ganhou um registro de leituras por turno (`LeiturasDoTurno`), criado pelo laço a cada pedido e passado a todas as ferramentas no contexto do turno: uma tabela lida por duas ferramentas no mesmo turno é lida uma vez. Cada ferramenta recebe a sua cópia da lista; falha não fica guardada; nada passa de um turno para outro.
- **Falha parcial:** a consulta de itens que falha marca só a sua receita (`itensIndisponiveis`), com um aviso (`avisoDeIndisponiveis`) que manda dizer que não foi possível ler agora, sem dizer que a receita está vazia. Se a leitura das receitas falha, continua o erro genérico.
- **Ainda não visto no real:** modelo, índice e permissões só se provam no sandbox (roteiro em `tasks.md`).

