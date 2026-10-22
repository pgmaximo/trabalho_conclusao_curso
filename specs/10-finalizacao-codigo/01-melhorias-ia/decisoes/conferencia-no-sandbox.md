# Decisões da conferência no sandbox (E1 a E12)

Nasceram na conferência de 2026-10-20 (sandbox `pedro`, roteiros dos `tasks.md` de E1 a E12). Duas decisões: DS1 e DS2, as duas sobre o guardrail do chat. Decididas pelo usuário em 2026-10-20.

## O que a conferência mostrou

O chat reusava o guardrail da análise de wearables (`health-insights`). Com o trace ligado só no roteiro local:

- O tópico `prescricao-de-medicamento` barrou a **pergunta** da pessoa (entrada) em E1#5 ("como cadastro um remedio novo"), E2#1 a #4, E2#6, E4#2 e E11#2 ("me lembra de tomar vitamina d as 8h"); e a **resposta** (saída) que só repetia o cadastro, em E2#1 a #3 e E4#1 na primeira rodada.
- O filtro PII `NAME` (ANONYMIZE) pegou "Ana" (Dra. Ana, nas consultas) em E1#1, E1#2 e E5#1, e "Losartana" em E3#6. Anonimizar também devolve `stopReason: guardrail_intervened`, e o laço (`conversationLoop.ts`) trata toda intervenção como bloqueio: a pessoa recebeu "Não consigo responder a essa mensagem".

## DS1 — Os tópicos de dose e diagnóstico

**Decidido: A, depois B (2026-10-20).** Primeiro A: guardrail próprio do chat, com os dois tópicos só na saída e a definição de prescrição excluindo "repetir o que a própria pessoa cadastrou". A medição mostrou que a entrada deixou de barrar, mas a saída continuou barrando 7 respostas legítimas, entre elas "a Losartana está cadastrada a cada 8 horas" e a própria recusa de dobrar a dose. Pelo plano registrado aqui, o usuário passou para B: o guardrail do chat fica sem tópicos. Dose e diagnóstico continuam proibidos pela **R3**, que é determinística e conhece o valor cadastrado (D2.4). A R1 é a palavra vetada, não diagnóstico. O guardrail do wearable não muda.

- C (desligar a entrada no guardrail compartilhado) foi recusada: muda o wearable e não resolve a saída.

**Achado do deploy da B.** A `CfnGuardrailVersion` só publica versão nova quando as propriedades dela mudam. Mudar a configuração atualizava só o DRAFT, e o chat seguia na versão 1, ainda com os tópicos. A versão do chat agora leva na descrição a impressão digital da configuração (sha256), e cada mudança vira versão nova. Os guardrails do wearable e da extração têm o mesmo defeito latente: qualquer mudança feita neles depois do primeiro deploy não chegou às funções. Isso não foi corrigido aqui.

**Medição** (31 perguntas de E1, E2, E4, E5 e E11, roteiro local com trace do guardrail, uma por vez):

| | Antes | DS1 = A | DS1 = B |
|---|---|---|---|
| Aprovadas (na 1ª ou na 2ª geração) | 18 | 17 | 26 |
| Barradas pelo guardrail | 11 | 7 | 0 |
| Degradadas pelas regras (R3/R5) ou pela forma | 2 | 7 | 5 |

Nenhuma resposta aprovada na B indica dose ou diagnóstico. As 5 que sobraram são reprovações da R3 em texto legítimo (agenda da semana, "5 comprimidos registrados", doses da hepatite B), o achado A9 do relatório.

## DS2 — O filtro de nome

**Decidido: A.** Sem `NAME` no guardrail do chat; email, telefone e CPF continuam anonimizados. No chat, o nome é dado da própria pessoa (o profissional da consulta, o remédio cadastrado).

- B (aceitar no código a intervenção que só anonimizou) foi recusada: exige ligar o trace, que o código proíbe em produção, e a resposta sairia com o marcador no lugar do nome.
- C (manter) foi recusada: toda resposta com nome de pessoa ficaria indisponível.

## Implementação

`amplify/backend.ts`: stack `chat-assistant-guardrail`, `ChatAssistantGuardrail` (sem tópicos, sem `NAME`) e a versão dele, com a impressão digital da configuração; o chat lê o id e a versão desse guardrail e só tem `ApplyGuardrail` nele. Prova: `amplify/functions/chat-assistant/__tests__/infraGuardrail.test.ts`, 8 testes. Cada mudança teve o teste vermelho antes: A (6 vermelhos), B ("sem tópicos" vermelho) e versão ("muda junto com a configuração" vermelho). O teste de guarda do wearable e o de que a R3 reprova os exemplos dos tópicos passaram antes e depois. `npm run validate`: 232 suítes, 4006 testes. Deploy no sandbox `pedro`: o chat lê o guardrail `a3vly0qfkyzf`, versão 2.

## DS3 — Resposta sem conteúdo aprovada (achado A4)

**O que a conferência mostrou.** Em 400 turnos, 12 respostas aprovadas não diziam nada: `"string"` (E4#1, com proposta de memória `{"texto":"string","tipo":"COMO_ME_CHAMAR"}`), `"..."` (E4#8, E2#8) e a abertura que anuncia uma lista que não veio (E3#4, nas 3 rodadas; E11#1 e #3). Com a saída bruta capturada no roteiro local, apareceram duas causas:

1. **A saída estruturada preenche o schema mecanicamente.** O modelo devolve o nome do tipo (`"string"`), o marcador do exemplo do prompt (`"..."`) ou `""` em `texto`, às vezes junto de uma `acao` com todos os campos vazios que ninguém pediu. O vazio já era reprovado (`min(1)`); os marcadores não.
2. **A ação crua ligava a regra da passiva.** `comAcaoProposta` usava `answer.acao !== undefined`, a ação como o modelo mandou. Na E3#4, uma ação de lembrete não pedida fez a R5 reprovar "o das 8h foi marcado", que é dado de `consultar_doses_tomadas`. A segunda geração "consertou" apagando tudo depois de "Aqui está o que o aplicativo registrou nos últimos 7 dias (14/10 a 20/10):", e isso foi aprovado.

**Decidido: A + B (2026-10-20).**

- **A.** `checkLanguageRules` trata como R5, igual à resposta vazia, o texto sem letra nem número, igual a um marcador do schema (`string`, `texto`, `null`, `undefined`) ou terminado em ":". A resposta vai para a segunda geração e, depois, para a degradada. A proposta de memória com marcador é recusada pela mesma verificação, que `validarProposta` já chama.
- **B.** A passiva de cadastro só é barrada quando a ação é válida (`acaoAceitavel`), isto é, quando o cartão vai sair.
- Recusadas: só A (a E3#4 continuaria reprovada sem motivo) e adiar B para o A5.

Prova: `ai-language-rules/__tests__/languageRules.test.ts` ("resposta sem conteúdo é R5", 12 casos vermelhos antes, mais o de guarda das respostas curtas de verdade), `chat-assistant/__tests__/propostaValida.test.ts` (2) e `acaoNaVerificacao.test.ts` ("ação que não sobrevive não reprova a passiva honesta"). `npm run validate`: 4021 testes.

**O que fica para o A5.** O modelo manda `acao` sem pedido e, quando a pessoa pede, a ação nem sempre sai (E11#1 e #3 escreveram "Preparei as informações para facilitar:" sem cartão).

## DS4 — O cartão de ação que não aparecia (achado A5)

**O que a conferência mostrou.** Nas rodadas da E11, nenhum cartão saiu, e o texto prometia o formulário ("Preparei as informações para facilitar:", "Deixei o formulário pré-preenchido", "O formulário já vai aberto"). Com a saída bruta capturada, ficou claro que **a saída estruturada escreve as chaves em ordem alfabética**, e não na ordem do schema. `acao` vinha antes de `texto`: o modelo tinha de decidir a ação antes de escrever a resposta, pulava o campo e prometia o formulário no texto. Dentro da ação, `tipo` vinha quase por último; depois de escrever `tipo`, `hora`, `nome` e `quando` já tinham passado. Dois experimentos no roteiro local, sem mudar o código, renomeando os campos só no schema enviado: com a ação depois do texto, o modelo passou a mandar a ação, mas só com o `tipo` (1 cartão quase vazio em 3 pedidos); com o `tipo` primeiro, 3 cartões em 3, com nome, profissional e data.

**Decidido: A, ordem no fio, e a checagem na R5 (2026-10-20).**

- **Ordem no fio** (`chatSchema.ts`): só o JSON Schema do `output_config` usa nomes com prefixo numérico, que ordenam como o envelope quer (`1_citacoes`, `2_texto`, `3_memoria`, `4_acao`; na ação, `1_tipo` a `8_horarios`). `extrairResposta` traduz de volta antes do zod; sem saída estruturada, os nomes do prompt continuam valendo. O desenho do E11 (campo no envelope, D11.1) não muda.
- **Formulário prometido** (`languageRules.ts`, R5, ligada pela verificação com `vetarFormulario`): o texto do modelo não diz que preparou, deixou ou vai abrir o formulário, nem que ele "já vai aberto/preenchido", com ou sem cartão. A frase do aplicativo (`TEXTO_DA_ACAO`) só é descontada quando o cartão sai, então os dois testes do contrato do E11 continuam valendo. A oferta condicional ("me diga a data e eu preparo o formulário") e o "não preparei nada" passam.
- Recusadas: B (ferramenta `propor_acao`: muda a D11.1 e custa uma ida a mais ao modelo) e C (tirar a saída estruturada: reabre as falhas de formato da D19).

**Medição depois do deploy** (E1, E4, E10, E11, E12; 22 perguntas): cartão em 3 de 3 pedidos com dado (E11#1 "dra ana · 20/10 · 14:00", #2 "vitamina d · 08:00", #3 "Exame de sangue · laboratório da rua 7 · EXAME"); E11#4 ("preciso marcar o cardiologista", sem dado) sem cartão, como a spec pede; nenhuma promessa de formulário sem cartão; citações de exame continuam saindo (E10). 20 de 22 aprovadas; as 2 degradadas são da R3 (A9).

**Sobras menores, não tratadas:** "Nada foi salvo" duas vezes quando o modelo também escreve (E11#1); "sexta de manhã" não virou data no cartão (E11#3).

Prova: `chat-assistant/__tests__/ordemNoFio.test.ts` (5; antes da implementação a suíte nem compilava, porque `schemaDaResposta` não existia), `ai-language-rules/__tests__/languageRules.test.ts` ("o texto do modelo não fala do formulário pronto", 6 casos vermelhos antes, mais as guardas) e `acaoNaVerificacao.test.ts` (3 novos, vermelhos antes). `npm run validate`: 4037 testes.

## DS5 — A R3 reprovando texto legítimo (achado A9)

**O que a conferência mostrou.** Respostas corretas caíam na segunda geração ou na degradada porque a R3 reprovava frases legítimas. Com a saída bruta, cada reprovação foi refeita contra a verificação e caiu em uma de cinco famílias:

1. **Inventário contado por extenso.** "Esta semana você tem **dois** compromissos", "Você tem **duas** receitas guardadas" (E1#2, E4#2) — o "você tem" só aceitava algarismo antes do inventário; e "você tem **uma anotação**" (E2#3) — anotação não estava no inventário.
2. **O aviso honesto da E3 com advérbio.** "não quer dizer **necessariamente** que você não tomou" (E3#2b, E3#3).
3. **O encaminhamento.** "o médico… **orienta sobre como usar** cada remédio" (E4#1), "não consigo orientar sobre dose ou **como tomar** um remédio" (E2#6).
4. **Valor cadastrado com palavra neutra na frase** (a D2.4 caía): "registrada como 1 gota, **tomada** todos os dias" (E11#5), "o **aplicativo** já indica estoque baixo" (E2#5). Nesta, um defeito antigo: **"aplicativo" casava com o radical de "aplicar"** na lista de prescrição, então todo valor dito "no aplicativo" perdia a exceção.
5. **A série da vacina.** "a série da Hepatite B está registrada com **3 doses**" (E5#5) — a ferramenta de vacinas não dizia à verificação quais contagens vêm do registro.

**Decidido: A, correção estreita por família (2026-10-21).** A família 5 apareceu na captura da E5#5, depois da decisão, e foi tratada no mesmo princípio da 4 (valor do registro, D2.4).

- 1: contagem por extenso (dois a dez) entre "você tem" e o inventário; `anotação` no inventário.
- 2: "necessariamente" aceito no "não quer dizer / não significa / não garante que".
- 3: o padrão de tomar/usar ganha exceção quando o verbo vem depois de "orient… como".
- 4: na frase do valor cadastrado, o particípio "tomado/a" (sem "ser" antes) e a palavra "aplicativo" (com "indica/sinaliza/mostra" depois) não contam como prescrição.
- 5: `consultar_vacinas` ganha o gancho `valoresCadastrados` (total da série, número da dose aplicada e quantas faltam), como `consultar_medicamentos`.
- Recusadas: só as famílias 1 a 3 (deixava a D2.4 quebrada em "no aplicativo") e só o prompt.

**Continua reprovado, com teste ao lado de cada família:** "Você tem diabetes", "Você tem duas doenças crônicas", "Você não tomou a Losartana das 8h", "Tome o remédio de 8 em 8 horas", "Você deve tomar o remédio em jejum", "…e deve ser tomada todos os dias", "eu indico tomar 5 comprimidos", "aplique 5 mL por dia", e a série da vacina sem o valor vindo da ferramenta.

**Medição** (E1 a E5 e E11, 37 perguntas, antes do ajuste do "aplicativo"): aprovadas na 1ª geração 28 → 33; na 2ª, 5 → 3; degradadas 4 → 1. A que sobrou (E2#5) era o "aplicativo", corrigido em seguida.

Prova: `ai-language-rules/__tests__/languageRules.test.ts` ("R3 sem falso positivo nas frases da conferência", 16 vermelhos antes e os contra-testes verdes antes e depois), `chat-assistant/__tests__/vacinasSaida.test.ts` (3) e `vacinasTool.test.ts` (1).

### DS5, ampliação (2026-10-21)

**O que a remedição mostrou.** Com as cinco correções estreitas, o modelo reescreveu as recusas certas, e a R3 voltou a reprovar: "Não consigo **orientar sobre tomar** mais de uma dose de uma vez — … é o médico" (E2#6), "**alterar a forma de usar** um medicamento… é decisão de quem prescreveu" (E2#7), e na carteira "Há **2 doses aplicadas**" (E5#5). A causa: o padrão de tomar e usar não tinha a exceção de recusa e devolução que os outros padrões da R3 têm, e a âncora de registro não conhecia "aplicada".

**Decidido pelo usuário:** o padrão de tomar e usar ganha a mesma exceção dos outros padrões (`DEVOLVE_O_USO` = recusa, pergunta, condição e "sobre", de `DEVOLVE_A_DOSE_ESQUECIDA`, mais o "orienta sobre como"), e "aplicada" entra na âncora de registro (o particípio "aplicada", sem "ser" antes, também deixa de contar como prescrição na frase do valor cadastrado).

**Continua reprovado (contra-testes):** "Não consigo ver seu histórico, então tome 2 comprimidos de uma vez" (a recusa em outra oração), "Você pode tomar 2 comprimidos de uma vez", "Tome 2 comprimidos de uma vez", "As 2 doses devem ser aplicadas até dezembro", e "Há 2 doses aplicadas" sem o valor vindo da ferramenta. A exceção vale só ANTES do verbo, como nos outros padrões.

**Medição** (E2 e E5, 15 perguntas, depois do deploy): 15 aprovadas, 13 na 1ª geração e 2 na 2ª, nenhuma degradada. E2#6 e E2#7 aprovadas de primeira com a recusa certa.

Prova: `languageRules.test.ts` (9 novos: os 3 de frase que passa vermelhos antes; contra-testes verdes antes e depois). `npm run validate`: 4075 testes.

## DS6 — A chave da USPSTF recusada vira "recomendação" (achado A3)

**O que a conferência mostrou.** O segredo `USPSTF_API_KEY` do sandbox estava errado (44 caracteres; o da main e o do Artur têm 22). Com a chave recusada, a API responde **200** com um dataset de uma só "recomendação", nota A, cujo título é o aviso "Starting 2021-03-01, USPSTF recommendations data requires an API key". O cliente aceitava, e a tela de Prevenção e o chat a mostravam como recomendação. O sinal confiável é o campo `apiKeyWarning`, que só vem nesse caso: conferido com a chave válida (142 recomendações, 2,98 MB, sem o campo).

**Decidido (2026-10-21):** o valor da main foi copiado para o segredo do sandbox (SSM, sem exibir; hashes conferidos), e `uspstfClient.ts` passa a lançar quando a resposta traz `apiKeyWarning`, sem a chave na mensagem. A tela mostra o erro que já mostrava para falha da fonte, e o chat diz que a fonte está indisponível.

Prova: `uspstf-shared/__tests__/uspstfClient.test.ts` ("chave recusada pela API", vermelho antes). Medido: E7#1 voltou com "72 recomendações para o seu grupo".

## DS7 — Throttling do Bedrock (achado A6)

**O que a conferência mostrou.** A cota da conta é de **10 chamadas por minuto** ao Sonnet 4.6 (`L-00FF3314`, cross-region; ajustável; um pedido anterior de 10.000 foi fechado sem aumento). Cada turno do chat usa de 2 a 4 chamadas, então a conta inteira atende uns 3 a 5 turnos por minuto, e com duas pessoas ao mesmo tempo o Bedrock devolve `ThrottlingException`. A pessoa lia "Não consegui montar uma resposta agora", como se a pergunta fosse o problema.

**Decidido (2026-10-21):** o usuário pede o aumento da cota no Service Quotas. No código, a `ThrottlingException` na primeira geração vira "Muita gente está usando o assistente agora. Tente de novo em um minuto.", status INDISPONIVEL, sem dado por baixo; o nome do erro não vai para o texto. Outras falhas continuam com a mensagem de sempre.

Prova: `conversationLoop.test.ts` e `verificacao.test.ts` ("sobrecarga do modelo", vermelhos antes; o de outra falha é guarda).

## DS8 — O nome que o modelo esquece de conferir (achado A7)

**O que a conferência mostrou.** Em "a médica passou claritromicina, tem problema com a sinvastatina?", o modelo mandou só `candidatos: ["claritromicina"]`. A sinvastatina, citada e não cadastrada, ficou de fora, e a resposta disse que a lista não trazia alerta — o par existe, grave (rabdomiólise).

**Decidido (2026-10-21):** a mensagem da pessoa entra no contexto do turno (`falaDaPessoa`), e `consultar_interacoes` junta aos candidatos do modelo os nomes da lista do aplicativo (canônicos e apelidos) ditos nela, como palavra inteira. Lista fechada: nome fora dela não entra por aqui, e "aasmática" não é AAS.

Prova: `interacoesTool.test.ts` (vermelho antes; o de "aasmática" é guarda) e `conversationLoop.test.ts` (a fala chega às ferramentas). Medido: E9#5 com o alerta grave de rabdomiólise.

## DS9 — O laço que repete a mesma consulta (achado A8)

**O que a conferência mostrou.** "Mas é seguro tomar junto, né?" fez o modelo chamar `consultar_interacoes` com a mesma entrada até o teto de iterações, e a degradada repetiu o mesmo bloco cinco vezes. Depois da primeira correção, a repetição já não rodava a ferramenta, mas a E9 H10 e a E7 #2 ainda caíam na reserva: o modelo ignorava o aviso duas ou três vezes, e a resposta certa era reprovada pela R3 em duas frases — "**Não tenho como dizer** que é seguro" (a recusa com "que" não absolvia) e "Como **você tem 54 anos**, esse grupo inclui sua faixa etária" (a idade lida como diagnóstico).

**Decidido (2026-10-21):**
- A mesma ferramenta, com a mesma entrada, no mesmo turno não roda de novo: a chamada recebe "já foi consultada… Não chame de novo: responda agora com o que já tem", e o transcript não ganha cópia.
- A degradada não repete bloco idêntico.
- R3: "não tenho como" entra nas recusas; a recusa colada a "dizer/afirmar/garantir que" absolve a garantia que vem logo depois; "você tem N anos" entra no inventário, e não com "e" logo depois.

**Continua reprovado (contra-testes):** "É seguro tomar junto.", "Você pode tomar junto, é seguro.", "Você tem 54 anos e diabetes.", "Você tem diabetes há 5 anos."

Prova: `conversationLoop.test.ts` (a repetição; o teste antigo do registro de leituras passou a usar duas ferramentas diferentes, porque chamava a mesma com a mesma entrada), `degradedAnswer.test.ts` e `languageRules.test.ts` ("não tenho como e a idade", vermelhos antes; contra-testes verdes antes e depois).

**Verificação desta etapa:** testes dos arquivos tocados e `npm run typecheck:backend`. O `npm run validate` completo **não foi rodado** (pedido do usuário em 2026-10-21, até nova ordem).

**Medição depois do deploy (E7 e E9, 2026-10-21):** E9 com 8 de 9 aprovadas; E9 H10 ("mas é seguro tomar junto?") aprovada com "Não consigo dizer se é seguro… alerta grave… quem pode orientar é o médico"; E9 #5 com o alerta grave de rabdomiólise. E7 com 4 de 6 aprovadas; E7 #2 estourou o teto de 150 s do roteiro local (rede da máquina, não o chat). O modelo ainda repete a consulta (E9 H10 chamou quatro vezes), mas a ferramenta roda uma só.

## DS10 — Mais dois falsos positivos da R3 (achado A10)

**O que a conferência mostrou.** Duas respostas certas caíram na reserva (E9 H11 e E7 #1). Os textos brutos da medição de 2026-10-21 foram reverificados com `checkLanguageRules`, agora passando `valoresCadastrados` (Marevan com `dosage: '5 mg'` gera a chave `5|mg`, como no turno real). São duas causas, e a primeira não é a que estava anotada.

1. **"em uso" não é registro (E9 H11).** As duas frases reprovadas foram "os remédios que você **tem em uso**: Marevan 5mg e Losartana" e "os dois remédios que você **tem em uso** cadastrados".
   - A dose no nome **não** é o problema. "Marevan 5mg e Losartana estão cadastrados" passa, porque "5mg" casa com a chave `5|mg` do campo da dose. O que faltava era a **âncora de registro** da D2.4: na frase, só "em uso" dizia que aquilo era cadastro, e "em uso" não é âncora. Sem âncora, "5mg" é dose indicada.
   - "Você **tem em uso**" cai no padrão de diagnóstico ("você tem…"). O inventário aceita "você tem 3 medicamentos" e "que você tem cadastrados", mas não "em uso" logo depois do verbo.
2. **O "e" sem acento é lido como "é" (E7 #1).** O trecho reprovado foi "com risco aumentado **e baixo** risco de efeitos adversos". O padrão de interpretação de resultado exige verbo de estado antes do adjetivo, e `VERBO_DE_ESTADO` aceita `[eé]`: a conjunção "e" vira o verbo "é", e "e baixo" vira "é baixo". "Benefício substancial **e alta** certeza", que é o texto da nota A da USPSTF, cai do mesmo jeito. A palavra "risco" não tem nada a ver com isso.

### DS10.1 — "em uso" como cadastro

- **A. "em uso" passa a valer como inventário e como âncora.** Depois de "você tem", "em uso" é inventário do aplicativo, como o particípio "cadastrados". Na frase do valor, "em uso" passa a ser âncora de registro da D2.4. Uma frase com prescrição continua barrada pela `PRESCRICAO_NA_FRASE`: "mantenha os 5 mg em uso" e "os 5 mg em uso podem subir" seguem reprovadas.
  - Benefício: é estreita, do mesmo tipo das correções da DS5, e resolve as duas frases da H11.
  - Malefício: o diagnóstico perde mais uma forma ("você tem em uso…"). Mas nenhuma doença cabe depois de "em uso", e os contra-testes ficam ao lado.
- **B. A + valores do nome.** `valoresCadastradosDosMedicamentos` passa a ler também a dose escrita no nome ("Marevan 5mg"), além do campo da dose.
  - Benefício: cobre o caso em que o nome traz uma dose e o campo da dose traz outra ("Marevan 5mg" cadastrado com "1 comprimido").
  - Malefício: esse caso não apareceu, e ele abre mais um valor por remédio para a exceção. O nome é texto livre da pessoa.
- **C. Só o prompt** ("diga cadastrados, e não em uso").
  - Malefício: não é determinístico, e a forma natural da frase continua reprovada.

**Recomendação: A.** É o que a medição mostrou. B espera um caso real.

**Continua reprovado (contra-testes):**
- "Você tem diabetes."
- "Você tem pressão alta."
- "Mantenha os 5 mg em uso."
- "Os 5 mg em uso podem subir para 10 mg."
- "Tome 5mg dos remédios em uso."

### DS10.2 — O "e" sem acento

- **A. Só "é" com acento é verbo de estado.**
  - Benefício: é a mudança mais simples, e o modelo escreve com acento em todas as respostas medidas.
  - Malefício: "Seu colesterol e alto." (sem acento) deixa de ser reprovado.
- **B. Lista de substantivos depois do adjetivo.** Adjetivo seguido de "risco", "certeza", "chance" ou "probabilidade" não é veredito.
  - Malefício: "Seu resultado é alto risco", com acento, passa a valer. Além disso, a lista fecha só os casos vistos, e o próximo atributivo cai de novo.
- **C. O "e" sem acento só é verbo quando o adjetivo fecha a oração.** O adjetivo precisa vir seguido de pontuação, do fim do texto ou de conector. "e baixo risco de…" e "e alta certeza" passam. "Seu colesterol e alto." continua reprovado. O "é" com acento não muda.
  - Benefício: cobre qualquer adjetivo atributivo depois da conjunção, sem lista, e mantém tudo o que A tiraria.
  - Malefício: "seu colesterol e alto demais", sem acento e com palavra depois, passa.

**Recomendação: C.** Ela corrige a causa (a conjunção) sem afrouxar o verbo acentuado.

**Continua reprovado (contra-testes):**
- "Seu colesterol é alto."
- "Seu colesterol e alto."
- "O resultado está um pouco elevado."
- "O exame é alto risco."
- "Seu exame veio alterado, e baixo."

**Decisão (2026-10-22):** DS10.1 = A e DS10.2 = C. A exceção de B espera um caso real, e a lista de palavras de B (DS10.2) foi recusada.

**Implementação.** `languageRules.ts`:
- **DS10.1:** "em uso" entra no inventário do "você tem", na `ANCORA_DE_REGISTRO` e na `NEUTRO_NA_FRASE`. "Uso" casava com o radical de "usar" na lista de prescrição, e sem isso a âncora sozinha não bastava.
- **DS10.2:** o padrão de interpretação de resultado não aceita o "e" sem acento quando o adjetivo é seguido de palavra que não seja conector.

Prova: `languageRules.test.ts` ("7. em uso" e "8. a conjuncao e"). Os 6 casos que precisam passar estavam vermelhos antes, e os 12 contra-testes ficaram verdes antes e depois. `npx jest amplify/functions/ai-language-rules amplify/functions/chat-assistant`: 2498 testes.

## DS11 — A versão dos guardrails do wearable e da extração

**Corrigido (2026-10-22),** pedido do usuário. É o defeito que a DS1 achou no chat e deixou latente nos outros dois. As configurações dos guardrails `HealthInsightsGuardrail` e `DocumentExtractionGuardrail` viram objetos (`configuracaoDoGuardrailDoWearable`, `configuracaoDoGuardrailDaExtracao`). A versão de cada um leva na descrição a impressão digital da configuração, como a do chat. O conteúdo dos dois guardrails não mudou, mas o primeiro deploy publica uma versão nova de cada um.

Prova: `infraGuardrail.test.ts` ("a versao … muda junto com a configuracao", 2 casos vermelhos antes) e `npm run typecheck:backend`.

## A cota do Bedrock (A6, DS7)

O aumento da `L-00FF3314` **não foi liberado**. A cota fica em **10 chamadas por minuto**, como limite conhecido do projeto. Com 2 a 4 chamadas por turno, isso dá de 3 a 5 turnos por minuto na conta inteira. Acima disso, a pessoa recebe o aviso da DS7.

A `L-00FF3314` é a cota do Sonnet 4.6. Com a troca de modelos da DS12, cada modelo novo tem a sua cota no Service Quotas, e o valor dela ainda não foi conferido.

## DS12 — Troca de modelos: Claude Opus 5.5 no chat e Claude Sonnet 5.5 como padrão

**Decidido pelo usuário (2026-10-22).** O assistente de chat passa ao **Claude Opus 5.5** (`us.anthropic.claude-opus-5-5`). A análise do wearable e a extração de documentos usavam o Sonnet 4.6 e passam ao modelo padrão, o **Claude Sonnet 5.5** (`us.anthropic.claude-sonnet-5-5`).

Os dois modelos novos têm três diferenças que quebram as chamadas atuais:
- o thinking fica sempre ligado;
- `toolChoice` forçado (`any`/`tool`) dá erro 400;
- `temperature` fora do padrão dá erro 400.

O que mudou em cada função:

- **Chat** (`conversationLoop.ts`):
  - sai `temperature` nas duas gerações (0,3 e 0,1); a segunda geração continua diferente da primeira pela correção que recebe;
  - esforço explícito `low`, porque o padrão do Opus 5.5 é `medium` e o turno (2 a 4 idas ao modelo) precisa caber nos 90 s que o aplicativo espera;
  - o teto de saída sobe de 4.000 para 16.000 tokens, porque o thinking divide esse teto com a resposta;
  - o chat não forçava tool, e a mensagem do modelo já voltava inteira ao laço, com o bloco de raciocínio. Há um teste de guarda para isso.
- **Wearable** (`analyze-health-import/bedrockClient.ts`):
  - a tool forçada `registrar_analise` dá lugar à saída estruturada (`output_config`), o mesmo mecanismo que a extração mediu na D19, com o schema saindo do mesmo zod;
  - a resposta passa a vir num bloco de texto, e texto que não é JSON vira falha de formato, que vai para o reparo;
  - esforço `low`, sem `temperature`, teto de 24.000 tokens.
- **Extração** (`extract-document-data/bedrockClient.ts`): já usava a saída estruturada. Sai `temperature` (era 0), o esforço fica explícito em `medium` (o padrão do Sonnet 5.5 é `high`) e o teto de saída vai a 32.000 tokens.
- **`backend.ts`**: `CHAT_BASE_MODEL_ID` e o perfil de inferência do chat, com as duas ARNs (perfil e modelo) na permissão do chat. `BEDROCK_BASE_MODEL_ID` passa a `anthropic.claude-sonnet-5-5`.

Prova: os testes abaixo estavam vermelhos antes da mudança.
- `conversationLoop.test.ts` ("a chamada ao Claude Opus 5.5", 3 vermelhos; o do raciocínio é guarda);
- `analyze-health-import/__tests__/bedrockClient.test.ts` (novo, 3 vermelhos);
- `extract-document-data/__tests__/bedrockClient.test.ts` (1 vermelho; o do raciocínio é guarda);
- `infraGuardrail.test.ts` (2 vermelhos).

`npx jest amplify`: 3147 testes. `npm run typecheck:backend` passou.

**O que só o sandbox mostra:**
- se a conta tem acesso liberado aos dois modelos;
- a cota de cada um;
- se o Bedrock aceita `effort` e o `output_config` do wearable com o schema convertido;
- a latência do chat com thinking.
