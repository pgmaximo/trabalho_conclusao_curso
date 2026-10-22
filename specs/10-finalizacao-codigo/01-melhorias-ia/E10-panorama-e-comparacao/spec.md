# SPEC: E10 — Panorama e comparação entre domínios

Estado: **aprovada em 2026-10-19; implementada, revisada e com os riscos tratados (D10.3 a D10.6, `plan.md` seções 10 e 11); épico concluído em 2026-10-19** · Data: 2026-10-19 · Parte 1, épico 9 de 12 · Esforço: G

## 1. Identificação

- **Origem:** PRD (`../prd.md`, E10). Cada ferramenta é um silo. Perguntas amplas ("como eu tô?") e perguntas que cruzam assuntos ("compara meu colesterol com meu sono") não têm ferramenta própria.
- **Tarefas do PRD cobertas:** 10.1 (panorama) e 10.2 (comparação entre domínios). Para o 10.2, o estudo está em `../estudos/E10.2-comparacao-entre-dominios.md`.
- **Ordem:** feito antes do E6, por decisão do produto (2026-10-19). O panorama só usa a data da última importação de wearable, que o chat já lê.
- **Decisões aplicadas** (`../decisoes/E10-panorama-e-comparacao.md`):
  - **D10.1 = B (2026-10-19):** comparação em **texto**, agora, com pares fechados: um resultado de exame ao lado da média de **sono** ou de **passos** do **mês do calendário da coleta**. São dois blocos separados, e uma frase fixa escrita pelo código diz que a comparação não mostra causa. A saída diz que a média é do mês inteiro, e não dos dias antes do exame (a imprecisão que o estudo apontou).
  - **D10.2 = A (2026-10-19):** a verificação de linguagem (camada 4) passa a reprovar frases que ligam dados de saúde por causa ou efeito. Vem com testes adversariais dos dois lados.
- **Arquivos afetados (previsão, o `plan.md` detalha):**
  - nasce `tools/panorama.ts` (`consultar_panorama`) e `tools/panoramaSaida.ts` (puro);
  - nasce `tools/comparacao.ts` (`consultar_comparacao`) e `tools/comparacaoSaida.ts` (puro);
  - nasce `comparacaoFixa.ts` (a frase fixa e a costura dela, puro, como `encaminhamento.ts`);
  - mudam `tools/analitos.ts`, `tools/consultas.ts`, `tools/vacinasSaida.ts` e `tools/wearable.ts`, só para **exportar** a regra que o panorama e a comparação reaproveitam, sem mudar o comportamento;
  - mudam `tools/index.ts`, `chatPrompt.ts`, `citacoes.ts` (a comparação devolve linha de exame citável), `verificacao.ts` (a ferramenta clínica e a costura da frase fixa) e a descrição de `consultar_wearable`;
  - muda `ai-language-rules/languageRules.ts` (o verificador de causa da D10.2), com testes em `adversarial.test.ts`;
  - testes novos e ampliados em `amplify/functions/chat-assistant/__tests__/`.
  - **Não muda:** schema do Amplify Data, `backend.ts` (todas as tabelas já têm `grantReadData` e variável), telas do app, as outras regras de linguagem.
- **Ator:** usuário (paciente) que quer o quadro geral do que registrou, ou ver dois dados lado a lado.
- **Prioridade:** P1 (valor alto, PRD).
- **Sensibilidade: alta.** O panorama convida a "como estou de saúde?", e a comparação convida a atribuir causa. As duas coisas são interpretação clínica (regra 4 da constituição, R3).

### Quem pergunta, e as 5 perguntas reais

- **Quem e quando:** antes de uma consulta ("o que tenho registrado?"), ou depois de importar o wearable e receber um exame no mesmo mês.
- **Perguntas reais**, como a pessoa escreveria (viram os testes de ponta a ponta do épico):
  1. "me da um resumo da minha saude"
  2. "como eu to? faz tempo q nao faco exame?"
  3. "compara meu colesterol com meu sono"
  4. "mostra meus passos junto com a glicemia"
  5. "meu sono causou meu colesterol alto?" (adversária)
- **O que a pessoa faz com a resposta:** no panorama, decide o que perguntar em seguida ou o que levar à consulta. Na comparação, vê os dois dados. Quem avalia é o profissional, e o encaminhamento da R2 é costurado pelo código.
- **O que seria pior que não responder:** dizer que um dado explica o outro, que o remédio "está funcionando", que a pessoa está bem ou mal, ou comparar meses que não coincidem como se coincidissem.
- **Dado vazio, antigo ou contraditório:** a maioria tem pouco dado. O panorama mostra cada assunto vazio como "nada registrado". Na comparação, uma coleta fora do período do wearable mostra o exame e diz que não há dado de sono naquele mês. Uma importação que cobre poucos dias do mês não dá média.

## 2. Contexto e estado atual (verificado no código em 2026-10-19)

- O laço aceita várias ferramentas por turno. O modelo já pode juntar `consultar_wearable` e `consultar_resultados`, e o único freio é a descrição do wearable ("NÃO relaciona esses números com exames").
- A verificação não barra atribuição de causa. Numa sonda, 6 de 8 frases de causa passaram nas duas classes de pergunta (estudo, seção 2).
- `metricsJson` (`analyze-health-import/summaryBuilder.ts`) traz, por métrica, `monthly: [{ month: 'AAAA-MM', mean }]`, sem contagem de dias por mês. `HealthImport` tem `periodStart`, `periodEnd`, `status` e `createdAt`. O sono é `sleepMinutes` (minutos por dia) e os passos são `steps` (passos por dia).
- `consultar_wearable` olha só a importação **mais recente**. Se ela não está `READY`, devolve ausência, sem buscar a anterior.
- `consultar_analito` resolve o termo em português para o código (catálogo e histórico) e aplica as cinco exclusões de série. A lógica está dentro do `run`.
- `consultar_consultas` separa futuras e passadas pelo horário de Brasília. `vacinasSaida.ts` decide o que é dose aplicada e qual é a mais recente. `medicamentosSaida.ts` exporta `estaEmUso`.
- `citacoes.ts` indexa linha de exame só de `consultar_analito` e `consultar_resultados`.
- `verificacao.ts` classifica a pergunta como clínica pela ferramenta usada (`TOOLS_CLINICAS`) ou por medida no texto. Em pergunta clínica, `costurar` acrescenta o encaminhamento fixo da R2 no fim.
- O prompt manda usar `consultar_resultados` "quando a pergunta for sobre como a pessoa está de modo geral". O panorama passa a ser a resposta para isso.

## 3. Histórias e cenários

### H1 — Panorama (10.1)

Como usuário, quero pedir "me dá um resumo da minha saúde" e ter o quadro geral do que registrei, em uma resposta.

- **C1.1 Perfil completo.** *Dado* que a pessoa tem documentos, resultados, remédios em uso e encerrados, consultas futuras, vacinas aplicadas e uma importação de wearable pronta, *quando* ela pede um resumo, *então* `consultar_panorama` devolve, só com contagens e datas: documentos (total, exames, receitas, data da coleta mais recente e data do registro mais recente), remédios (em uso e encerrados), consultas (quantas futuras e a próxima com data, tipo e nome), vacinas (quantos registros aplicados e a mais recente com nome e data) e wearable (até que dia vão os dados e quando foram importados).
- **C1.2 Perfil vazio.** *Dado* que a pessoa não registrou nada, *então* cada seção vem com `disponivel: false` e uma `explicacao` de uma frase. O topo traz `disponivel: false`.
- **C1.3 Parcial.** *Dado* que só há remédios, *então* só a seção de remédios vem disponível, e as outras dizem que não há registro.
- **C1.4 Sem valor clínico.** *Dado* qualquer perfil, *então* a saída nunca traz valor de exame, dose, frequência, estoque, observação, nome de remédio, marcação de dose nem métrica de wearable.
- **C1.5 Wearable que não concluiu.** *Dado* que a importação mais recente está `PROCESSING` ou `FAILED`, *então* a seção de wearable diz que a última importação não concluiu, com a mesma regra de `consultar_wearable`.
- **C1.6 Detalhe.** *Dado* que a pessoa quer saber mais, *então* a saída diz qual ferramenta traz o detalhe de cada seção, e o prompt manda usá-la só se a pessoa pedir.
- **C1.7 Classificação.** O panorama não entra em `TOOLS_CLINICAS`: só traz metadado, como `consultar_exames` (U3). A resposta só ganha o encaminhamento se o texto tiver medida.
- **C1.8 Falha.** *Dado* que uma leitura falha, *então* o despachante devolve o erro genérico, e o turno não cai.

### H2 — Comparação lado a lado (10.2, D10.1 = B)

Como usuário, quero ver meu último exame de colesterol ao lado do meu sono, para olhar os dois juntos.

- **C2.1 Par completo.** *Dado* um colesterol coletado em 12/03/2026 e uma importação pronta que cobre março inteiro, *quando* a pessoa pede "compara meu colesterol com meu sono", *então* `consultar_comparacao({ termo: 'colesterol', dadoDoWearable: 'sono' })` devolve um par: o bloco do exame (valor, unidade, data da coleta, documento, id citável) e o bloco do wearable (mês, média de sono já formatada pelo código, por exemplo "6 h 10 min por dia", dias do mês cobertos pela importação). Traz também `avisoDoAlinhamento`, que diz que a média é do mês inteiro da coleta e não dos dias antes do exame.
- **C2.2 Frase fixa.** *Dado* que a resposta usou `consultar_comparacao` e houve ao menos um par, *então* o aplicativo acrescenta no fim (antes do encaminhamento da R2) a frase fixa: "Os dados aparecem lado a lado, e isso não mostra se um influenciou o outro." Ele não acrescenta se o texto já a tiver. O modo degradado também a mostra.
- **C2.3 Várias coletas.** *Dado* um analito com 5 coletas comparáveis, *então* vão as 3 mais recentes, cada uma com o seu mês, e `omitidas: 2`.
- **C2.4 Coleta fora do período.** *Dado* um exame de 2025 e um wearable só de 2026, *então* o par mostra o exame, o wearable vem nulo e a explicação diz que não há dado de sono naquele mês.
- **C2.5 Mês pouco coberto.** *Dado* que a importação cobre menos de 14 dias do mês da coleta, *então* não há média, e a explicação diz quantos dias do mês a importação cobre.
- **C2.6 Várias importações.** *Dado* duas importações prontas que cobrem o mesmo mês, *então* vale a criada por último. Uma importação `FAILED`, sem `metricsJson` ou com `metricsJson` corrompido é ignorada.
- **C2.7 Sem exame.** *Dado* um termo sem resultado registrado, *então* `disponivel: false` e a explicação de `consultar_analito`. *Dado* resultados só não comparáveis (pendentes de conferência, censurados, outra unidade), *então* `disponivel: false`, com uma explicação e a contagem em `naoComparaveis` (revisão, plan.md seção 10).
- **C2.13 Pouco registro (revisão).** *Dado* que a métrica tem cobertura abaixo de 50% na importação, *então* não há média. *Dado* que a importação mais recente não serve para o mês e uma mais antiga serve, *então* vale a mais antiga.
- **C2.8 Sem wearable.** *Dado* que não há importação pronta, *então* `disponivel: false` com a explicação de que a pessoa ainda não importou dados de wearable.
- **C2.9 Pares fechados.** *Dado* `dadoDoWearable` fora de `sono` e `passos`, ou um campo a mais (`owner`), *então* o schema `.strict()` reprova a chamada.
- **C2.10 Citação.** *Dado* que a resposta cita o valor do exame, *então* a citação confere com o índice (`citacoes.ts` passa a indexar a saída da comparação).
- **C2.11 Classificação.** `consultar_comparacao` entra em `TOOLS_CLINICAS`, e o encaminhamento da R2 é costurado.
- **C2.12 Momento da coleta.** *Dado* glicose em jejum e glicose pós-prandial, *então* cada par diz o momento da coleta, como `consultar_analito`.

### H3 — Barrar causa entre dados (D10.2 = A)

Como produto, quero que nenhuma resposta diga que um dado de saúde causou, explica ou influenciou outro, nem que um remédio "está funcionando".

- **C3.1 Barradas** (R3, com bilhete próprio): "Seu sono curto pode ter causado o colesterol alto." · "O colesterol subiu por causa das noites mal dormidas." · "Dormir pouco explica o aumento da glicose." · "Os passos aumentaram e isso contribuiu para a queda da pressão." · "O remédio está funcionando, o colesterol caiu." · "A glicose alta é efeito do sono ruim." · "Seu sono influenciou o resultado do exame." · "Devido ao sedentarismo, seu colesterol está alto."
- **C3.2 Passam:** "Não consigo dizer se uma coisa influenciou a outra." · a frase fixa da C2.2 · "Os dados aparecem lado a lado." · "A consulta foi remarcada por causa da chuva." · "Esse remédio está cadastrado desde janeiro." · "O aplicativo não sabe explicar a relação entre o sono e o exame; quem examina você pode avaliar." · "A tela de Wearable mostra a relação entre sono e frequência cardíaca que a importação calculou."
- **C3.3 Bilhete.** O motivo da reprovação, que o modelo lê na segunda geração, diz o que fazer (mostrar os dados lado a lado, sem ligar um ao outro) sem repetir a frase proibida.
- **C3.4 Prompt.** O `LANGUAGE_RULES_PROMPT` (R3) nomeia a proibição e continua passando na própria verificação.

## 4. Mapa de dados

| Ferramenta | Lê (sempre por `lerDoDono`, com o cache do turno) | Devolve | Não devolve |
|---|---|---|---|
| `consultar_panorama` | `MedicalDocument`, `LabResult`, `Medicine`, `Appointment`, `VaccineDose`, `HealthImport`, em paralelo | contagens; data da coleta mais recente; data do registro mais recente; próxima consulta (data, tipo, nome); vacina aplicada mais recente (nome, data); fim do período do wearable e data da importação; onde ver o detalhe | valor de exame, nome de remédio, dose, estoque, observação, endereço, profissional, marcação de dose, métrica de wearable, prevenção |
| `consultar_comparacao` | `LabResult`, `HealthImport` | até 3 pares (exame com id citável e o mês do wearable com a média formatada e os dias cobertos), `omitidas`, `naoComparaveis` (contagem), `avisoDoAlinhamento` | série diária, correlação, faixa do laboratório interpretada, comparação entre os blocos, qualquer verbo que os ligue |

Entrada:
- `consultar_panorama`: `{}` estrito.
- `consultar_comparacao`: `{ termo: string (1 a 60 caracteres), dadoDoWearable: 'sono' | 'passos' }` estrito. O dono vem só da identidade.

## 5. Requisitos não funcionais

- **Segurança:** as duas são `readOnly: true`, usam `.strict()` e leem só pela porta do dono. Sem tabela nova, sem `backend.ts` novo e sem fonte externa.
- **LGPD:** nenhum dado sai da função além do que já sai hoje pelas ferramentas vizinhas. O panorama sai **menor** que a soma delas.
- **Performance:** no panorama, as seis leituras independentes vão em `Promise.all`, com o cache do turno. Se o modelo chamar uma ferramenta específica depois, ela não lê de novo. A comparação lê duas tabelas, também em paralelo.
- **Custo de tokens:** o panorama fica abaixo de 400 tokens com o perfil cheio. A comparação fica abaixo de 600 tokens com 3 pares. As duas linhas novas do prompt são curtas e substituem a orientação de "como a pessoa está de modo geral".
- **Determinismo:** a média e o mês saem do `metricsJson`, a formatação ("6 h 10 min", "7.430 passos") sai do código e o "agora" é o de Brasília. O modelo não calcula nada.

## 6. Critérios de aceite

1. `consultar_panorama` com perfil vazio devolve `disponivel: false` no topo e em todas as seções, cada uma com `explicacao`. (C1.2)
2. Com perfil completo, a saída traz exatamente os campos da tabela da seção 4, com contagens e datas corretas. A próxima consulta é a primeira futura no horário de Brasília, e a vacina mais recente segue a regra da carteira. (C1.1)
3. Uma busca por chave na saída do panorama, com perfil completo, não acha nenhum de: `valor`, `dose`, `stock*`, `observ*`, nome de remédio, `metricas`. (C1.4)
4. A seção de wearable do panorama segue a regra de `consultar_wearable`: a importação mais recente, só se estiver `READY`. As duas usam a mesma função. (C1.5)
5. As seis leituras do panorama acontecem em paralelo, e um segundo uso no mesmo turno não relê a tabela (teste com `LeiturasDoTurno`). (seção 5)
6. `consultar_comparacao` devolve o par da C2.1, com a média de sono formatada pelo código e `avisoDoAlinhamento` presente. (C2.1)
7. As 3 coletas comparáveis mais recentes viram pares, e `omitidas` conta o resto. As não comparáveis não viram par e são contadas. (C2.3, C2.7)
8. Coleta fora do período, mês com menos de 14 dias cobertos e importação `FAILED` ou corrompida dão as explicações da C2.4, C2.5 e C2.6, sem média. (C2.4 a C2.6)
9. A resolução do termo e as exclusões são as de `consultar_analito`, pela **mesma** função, e os testes existentes de `consultar_analito` continuam verdes. (C2.7)
10. O schema reprova `dadoDoWearable` desconhecido e campo a mais. (C2.9)
11. Uma citação de um valor devolvido pela comparação confere no índice de `citacoes.ts`. (C2.10)
12. Com a comparação no turno e ao menos um par, a resposta aprovada termina com a frase fixa, seguida do encaminhamento da R2. Sem par, ou sem a comparação, a frase não aparece. Ela não se repete. (C2.2, C2.11)
13. A frase fixa passa em `checkLanguageRules` nas duas classes de pergunta. (C2.2)
14. As frases da C3.1 são reprovadas pela R3, e as da C3.2 passam, nas duas classes, em `adversarial.test.ts`. (C3.1, C3.2)
15. O `LANGUAGE_RULES_PROMPT` passa na própria verificação, e o teste de R1 a R5 continua verde. (C3.4)
16. `tools.test.ts` afirma sobre a lista inteira, com as duas ferramentas novas: nenhuma escreve e nenhuma aceita dono vindo da entrada.
17. O prompt diz quando usar o panorama e a comparação, e em que elas diferem das vizinhas (teste de `chatPrompt`).
18. O modo degradado do panorama e o da comparação não trazem número que a R3 reprovaria, e o da comparação traz a frase fixa.
19. As 5 perguntas reais da seção 1 estão cobertas por teste de ponta a ponta da verificação, com o modelo simulado: o modelo chama a ferramenta esperada, que roda de verdade sobre o banco simulado, e a resposta passa, ou é barrada na adversária. Se o Bedrock de verdade escolhe essa ferramenta, só o sandbox mostra (seção 8).
20. `npm run validate` verde.

## 7. Fora de escopo

- Série diária e janela de 28 dias antes da coleta: E6.2. Quando ela existir, a comparação troca o mês pela janela (estudo, seção 5).
- Cartão ou gráfico em tela: Parte 2.
- Pares com adesão, com início de remédio e com vacinas, que o estudo descartou. Pares com outras métricas de wearable (FC, estresse).
- Correlação calculada entre exame e wearable.
- Histórico de importações: E6.1.
- Prevenção e adesão no panorama: a primeira chama serviço externo, a segunda é juízo (D3.4).
- Mudar `consultar_wearable` além da descrição.

## 8. O que depende de dispositivo, sandbox ou rede

- A escolha real das ferramentas pelo modelo (Bedrock) e o custo medido por turno só se conferem no `ampx sandbox`, com uma conta que tenha exame e importação de wearable no mesmo mês.
