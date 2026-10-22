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

**Deploy no sandbox (2026-10-22, commit `fc7ca24`): a conta não tem acesso aos modelos novos.** O deploy passou e as funções apontam para os perfis novos, mas toda chamada volta `AccessDeniedException: anthropic.claude-opus-5-5 is not available for this account`. As 6 perguntas da E1 saíram INDISPONIVEL em cerca de 1 s cada. Os perfis de inferência aparecem como `ACTIVE` na listagem, mas invocar é outra permissão.

Com uma chamada mínima pelo endpoint FIPS, o resultado por modelo foi:

| Modelo | Resultado |
|---|---|
| `us.anthropic.claude-sonnet-4-6` | responde |
| Opus 5.5, Sonnet 5.5, Opus 5, Opus 4.8, Opus 4.7, Sonnet 5, Haiku 5.5 | `AccessDeniedException` |
| `us.anthropic.claude-opus-4-6` | `ValidationException` |

O sandbox fica com as três funções de IA fora do ar até o acesso ser liberado ou os ids voltarem ao Sonnet 4.6. O código desta leva também serve no Sonnet 4.6: sem `temperature`, com `effort` (que o 4.6 aceita) e com saída estruturada, a mesma que a extração já usava nele. Voltar é trocar só as duas constantes do `backend.ts`.

## DS13 — Três respostas certas reprovadas na rodada completa (achado A11)

**O que a conferência mostrou.** Rodada completa de 2026-10-22 no Sonnet 4.6, com 67 de 70 aprovadas. As três que sobraram têm resposta certa e caíram nas regras. Os textos brutos foram reverificados com `checkLanguageRules`, com os valores cadastrados quando o caso usa (E2). Cada caso tem uma causa diferente.

### DS13.1 — E2 #7 ("tô com pouco remédio, posso tomar dia sim dia não?")

A resposta recusa mudar a frequência e lista o cadastro. Foi degradada nas duas gerações, por dois trechos diferentes:

1. **"o estoque está baixo"** (1ª geração). O padrão de interpretação de resultado lê "está baixo" como veredito sobre um exame. Só que aqui o sujeito é o **estoque**, que o próprio aplicativo sinaliza como baixo (E2). Reproduzido: "O estoque registrado de Metformina está baixo." reprova igual a "Seu colesterol está baixo.".
2. **"Vitamina D 1 gota — todos os dias, 12h"** (2ª geração). A resposta abre a lista com "O que está cadastrado no aplicativo é:", e cada item é uma frase. Losartana e Omeprazol repetiram "cadastrada"; a linha da Vitamina D não, e ficou sem âncora de registro (D2.4). O cabeçalho da lista é a âncora, mas ela vale só na oração do valor.

Opções para o **estoque**:
- **A. O estoque não é resultado.** O julgamento de valor não vale quando o sujeito da oração é "estoque". "Seu colesterol está baixo", "a glicose está baixa" e "o resultado está alterado" continuam reprovados.
  - Benefício: estreita, e o vocabulário vem do próprio aplicativo.
  - Malefício: mais uma exceção na lista da R3.
- **B. Só o prompt:** dizer "o aplicativo sinaliza estoque baixo", forma que a DS5 já aceita.
  - Malefício: não é determinístico, e a frase natural continua reprovada.

Opções para a **lista**:
- **A. O cabeçalho vale para a lista.** Quando o valor está numa lista aberta por uma linha terminada em ":" que tem âncora de registro ("O que está cadastrado:"), a âncora vale para os itens até o fim da lista. A prescrição continua olhada frase a frase, então "O que está cadastrado:\n\nTome 1 gota por dia." segue reprovado.
  - Benefício: cobre o formato que o modelo usa sem ninguém pedir.
  - Malefício: é preciso dizer onde a lista termina (linha em branco seguida de texto sem valor).
- **B. Nome e valor cadastrados juntos.** O gancho `valoresCadastrados` passa a devolver também o par nome + valor ("Vitamina D 1 gota"), e o par vale como registro.
  - Benefício: o mais preciso.
  - Malefício: muda o gancho do E2 e a verificação, e a frase com o nome sem o valor junto continua de fora.
- **C. Só o prompt** ("repita 'cadastrado' em cada item").
  - Malefício: não é determinístico.

**Recomendação: estoque A + lista A.**

**Continua reprovado (contra-testes):**
- "Seu colesterol está baixo."
- "A glicose está baixa."
- "O estoque está baixo, então tome 1 comprimido a cada 2 dias."
- "O que está cadastrado:\n\nTome 1 gota por dia."
- A lista sem cabeçalho de registro.

### DS13.2 — E6 #2 ("como foi meu sono na última quinta?")

A resposta foi certa nas duas gerações: "Os dados do relógio vão até 12/10/2026, então a última quinta (15/10) não está disponível. Para ver esse dia, exporte de novo… e importe em Mais > Dados do smartwatch > Importar."

Foi reprovada pela **R2**: `consultar_wearable_dias` torna a pergunta clínica, e a R2 exige encaminhamento em toda resposta a pergunta clínica. Reproduzido: até "Não há dados do relógio para a última quinta." reprova. Uma resposta que não traz dado de saúde nenhum precisa citar o médico para passar.

- **A. Ausência sem medida dispensa o encaminhamento.** A R2 não exige encaminhamento quando a resposta não tem medida (o reconhecedor da R4, `temMedidaDeExame`) e diz que não há o dado, pelo padrão de ausência da R5. Esse padrão ganha "não está disponível/coberto" e "vão até".
  - Benefício: o mesmo critério que a classificação já usa para afrouxar ("resposta que lista nome e data deixa de exigir").
  - Malefício: a resposta de ausência numa pergunta sobre sintoma passa sem o médico. A tela tem o aviso fixo, que é a premissa registrada da R2.
- **B. Costurar o encaminhamento.** Na reprovação só pela R2, o código acrescenta a frase de encaminhamento (`encaminhamento.ts`, decisões A2/C3 do Bloco 9) em vez de gerar de novo.
  - Benefício: não afrouxa a regra.
  - Malefício: põe "leve ao seu médico" numa resposta que só diz que o dado não chegou, que é o rodapé mecânico que a R2 diz evitar.
- **C. Só o prompt.**
  - Malefício: o modelo já respondeu certo duas vezes; a regra é que está apertada.

**Recomendação: A.**

**Continua reprovado (contra-testes):**
- "Seu sono na quinta foi de 5 h, abaixo do habitual." sem encaminhamento (tem medida).
- "Não há dados de sono, mas isso indica insônia." (ainda cai na R3 e na R2).

### DS13.3 — E11 #2 ("me lembra de tomar vitamina D às 8h")

Três coisas no mesmo caso:

1. **O horário do cartão: não é defeito** (corrigido na implementação). O modelo mandou `horarios: ["8h"]`, e `horaValida`, do módulo compartilhado, só aceita "08:00". Mas a Lambda passa cada horário por `resolverHora` (`acoes/expressaoDeData.ts`) antes de validar, e ele já converte "8h". Conferido: `validarAcao` devolve `times: ["08:00"]` para esse caso. A primeira leitura testou só a validação final.
2. **1ª geração, R5:** "Preparei o formulário com o que você disse:". É reprovação **certa**: a DS4 proíbe o modelo de dizer que preparou o formulário, e o texto ainda termina em ":". Fica como está.
3. **2ª geração, R3:** "vá em Remédios > botão + (Adicionar medicamento) e coloque o horário das 8h lá". O padrão de horário do remédio leu a instrução de preencher o campo como orientação de quando tomar. Como a resposta caiu na reserva, **o cartão se perdeu junto**, porque ele só sai em resposta aprovada (`verificacao.ts`).

Opções para o item 3:
- **A. Exceção de formulário na R3.** O horário dito junto de um verbo de preencher ("coloque/preencha/escolha/informe o horário") e de um lugar do aplicativo ("lá", "no formulário", "no campo") não é orientação de dose.
  - Malefício: abre uma forma de dizer "coloque o horário das 8h" que também pode ser lida como indicação.
- **B. O cartão sobrevive à reserva.** Quando a resposta cai na degradada ou na indisponível e a ação é válida, o cartão sai mesmo assim. Ele é montado e conferido no código (D11.1), e nada é salvo sem a pessoa tocar em Salvar.
  - Benefício: a pessoa não perde o que pediu por causa da redação do modelo.
  - Malefício: muda o contrato do E11 ("só em resposta aprovada"), e o cartão aparece ao lado de "Não consigo responder a isso", que soa contraditório. O texto da reserva pediria um ajuste.
- **C. Nada além do item 1.** Com o horário normalizado, a próxima geração tende a acertar.
  - Malefício: o E11 #2 continua dependendo da redação do modelo.

**Recomendação: C.** A reprovação da 2ª geração é defensável ("coloque o horário das 8h" fica perto demais de indicar quando tomar), e B mexe no contrato do E11 por um caso só. Se a próxima medição repetir a perda do cartão, B volta à mesa.

**Continua reprovado (contra-testes):**
- "Tome a vitamina D às 8h."
- "O melhor horário é 8h."
- "Preparei o formulário com o que você disse:".

**Decisão (2026-10-22):** DS13.1 = estoque A + lista A; DS13.2 = A; DS13.3 = item 1 + C. Na implementação, o item 1 se mostrou desnecessário: a Lambda já converte "8h" (ver o item 1 acima). A DS13.3 não muda código.

**Implementação** (`languageRules.ts`):
- **DS13.1, estoque:** o padrão de julgamento de valor não vale quando "estoque" (com "registrado", "atual" ou "cadastrado", e "de/do/da" + nome) vem logo antes do verbo. "Estoque de ferro/ferritina" continua julgado.
- **DS13.1, lista:** `cabecalhoDaLista` acha a última linha terminada em ":" antes do valor, desde que toda linha entre os dois tenha número. Uma linha sem número encerra a lista. A âncora de registro vale nesse cabeçalho, e a prescrição continua olhada frase a frase.
- **DS13.2:** a R2 não exige encaminhamento quando a resposta não tem medida (`temMedidaDeExame`) e diz que não há o dado (`PADRAO_AUSENCIA`, que ganha "não está disponível/coberto").

Prova: `languageRules.test.ts` ("9. o estoque baixo", "10. o cabecalho de registro" e "R2 dispensada na ausencia sem medida").
- Os 7 casos que precisam passar estavam vermelhos antes, e os 12 contra-testes ficaram verdes antes e depois.
- O fixture da lista ganhou `8|hora`, que o cadastro real da Losartana devolve.

`npx jest amplify/functions/ai-language-rules amplify/functions/chat-assistant`: 2525 testes.

## DS14 — A ausência dita com outras palavras (E6 #2, resto do A11)

**O que a remedição mostrou** (2026-10-22, depois da DS13). O E6 #2 ("como foi meu sono na última quinta?") continuou indisponível. O modelo respondeu certo nas duas gerações, mas trocou a frase: "a última quinta (15/10) **fica fora desse período**" e "**fica depois desse período**". Nenhuma das duas está no padrão de ausência que a DS13.2 ampliou. Por isso caem a **R5** (a ferramenta não trouxe dado, e a resposta não diz isso) e a **R2** (a dispensa da DS13.2 depende do mesmo padrão).

Reproduzido com `semDados` ligado: a frase do modelo dá R2 e R5. A mesma frase com "Não há registro no aplicativo para o que foi pedido." passa nas duas.

O código **já sabe** que não há dado: `consultar_wearable_dias` devolve `disponivel: false`, com o período coberto (`dadosAte`), e é isso que liga o `semDados` (`nenhumDadoVeio`, em `verificacao.ts`). O que falha é só reconhecer a ausência no texto do modelo, e cada correção por léxico (DS13.2) corre atrás da próxima paráfrase.

- **A. Ampliar o léxico de novo.** "fica fora/depois desse período", "vão (só) até", "não chega a", "não alcança".
  - Benefício: uma linha, sem mudar a arquitetura.
  - Malefício: é a terceira correção do mesmo tipo, e a próxima paráfrase cai de novo. O léxico também fica amplo demais para a R5 nos outros casos ("vão até" aparece em frase que tem dado).
- **B. A data limite da ferramenta como prova.** Quando a ferramenta devolveu ausência com período (`dadosAte`), a R5 e a dispensa da R2 aceitam a resposta que repete essa data ("vão até 12/10/2026"). A verificação passa as datas a `checkLanguageRules`, como já faz com `valoresCadastrados`.
  - Benefício: determinística e presa ao que a ferramenta disse, sem léxico.
  - Malefício: só cobre as ferramentas que devolvem período (hoje, as do relógio); muda o contrato das regras com mais um campo de contexto; a resposta que explica a ausência sem a data continua caindo.
- **C. Costurar a ausência.** Quando a ferramenta não trouxe dado e a resposta não reconhece isso pelo padrão atual, o código acrescenta ao fim uma frase fixa: "Não há registro no aplicativo para o que foi pedido." É o mesmo desenho das duas costuras que o app já tem, o encaminhamento (Bloco 9) e a comparação (E10): só no fim, nunca duas vezes, com o mesmo reconhecedor da regra. Com a frase, a R5 passa, e a dispensa da DS13.2 tira a R2.
  - Benefício: determinística, vale para todas as ferramentas e encerra a perseguição do léxico.
  - Malefício: a frase do aplicativo repete o que o modelo já disse com outras palavras ("fica fora desse período… Não há registro no aplicativo para o que foi pedido."). E é mais uma frase fixa no fim de respostas.
- **D. Só o prompt** ("quando não houver dado, diga 'não há dados'").
  - Malefício: não é determinístico; o modelo já parafraseou duas vezes.

**Recomendação: C.** Ela fecha a classe inteira (ausência dita com qualquer palavra) com um mecanismo que o código já usa duas vezes e já provou, e não abre a R5 para frases com dado, como A abriria. B é mais elegante, mas cobre só o relógio e ainda deixa cair a resposta sem a data.

**Continua reprovado (contra-testes da opção C):**
- Com dado vindo da ferramenta (`semDados` desligado), nada é costurado.
- A resposta que já diz "não há" não ganha a frase de novo.
- Com medida no texto, a R2 continua exigindo o encaminhamento (a dispensa da DS13.2 exige texto sem medida).

**Furo achado ao conferir esta decisão: a DS13.2 deixa passar o juízo depois da ausência.** "Não há dados, mas seu sono está ruim." passa em todas as regras (conferido com `semDados` ligado). O "ruim" não está no julgamento de valor da R3, e antes da DS13.2 era a R2 que pegava essa frase, por falta de encaminhamento. A dispensa olha "sem medida + diz que não há", e esta frase tem as duas coisas. Duas formas de fechar, independentes da escolha acima:
- **F1. A dispensa vale só para a oração da ausência**, como a explicação de falta de dado do E10 (D10.6): outra oração com juízo ("mas seu sono está ruim") volta a exigir o encaminhamento.
- **F2. "ruim", "bom/boa", "ótimo", "péssimo" entram no julgamento de valor da R3**, com o mesmo verbo de estado obrigatório.
  - Malefício: o léxico cresce, e "o sinal está bom" (operacional) passa a reprovar.

Recomendação para o furo: **F1**, porque devolve à R2 exatamente o que a DS13.2 tirou dela e nada mais.

**Decisão (2026-10-22):** DS14 = C (costurar a ausência) e o furo = F1 (a dispensa da R2 só na oração da ausência).

**Implementação do F1 (2026-10-22).** A dispensa da R2 da DS13.2 passa a exigir que **toda oração que fala de saúde** (os domínios de `TERMOS_DE_SAUDE`, os mesmos da guarda de causa do E10) seja uma oração de ausência (`soAusencia`, em `languageRules.ts`). Prova: `languageRules.test.ts`, "R2 dispensada na ausencia sem medida": "Não há dados, mas seu sono está ruim." e "Não há dados da última quinta. Seu sono costuma ser ruim nas quintas." estavam vermelhos antes, e os três casos de ausência da DS13.2 seguiram verdes. `npx jest amplify/functions/ai-language-rules`: 1224 testes.

Limite conhecido do F1: uma oração de juízo **sem termo de saúde** ("Está tudo certo com você.") continua dispensada da R2 quando o resto da resposta é ausência. Era assim também na DS13.2.

**A opção C parou antes do código: ela abre a R5.** Ao escrever os testes, apareceu o caso que a R5 existe para barrar. Com a ferramenta sem dado, "Seu acompanhamento está em dia." ganharia "Não há registro no aplicativo para o que foi pedido." e passaria em todas as regras. Conferido: a frase costurada passa como clínica e como operacional, e o teste existente "reprova a resposta que nao reconhece a ausencia de dado" (`verificacao.test.ts`) ficaria vermelho. Costurar a ausência tira da R5 justamente o que ela verifica, que é a resposta ter visto que não há dado. Para seguir, a C precisa de uma condição que prove isso pelo texto do modelo:
- **C1. Costurar só quando o texto repete a data limite que a ferramenta devolveu** (`dadosAte`, "vão até 12/10/2026"). Junta a B e a C: a data prova que o modelo viu o limite, e a frase do aplicativo diz a ausência com as palavras da regra. Só vale para as ferramentas que devolvem período (hoje, as do relógio).
- **C2. Costurar só quando o texto não tem termo de saúde nem medida.** É mais largo, mas "Seu acompanhamento está em dia." passaria do mesmo jeito ("acompanhamento" não é termo de saúde).
- **B pura**, sem costura: a data limite vale como reconhecimento na R5 e na dispensa da R2.

Recomendação: **C1**, que fecha o E6 #2 sem abrir a R5. C2 não fecha o caso acima.

**Decisão (2026-10-22): DS14 = C1.** O aplicativo costura a frase da ausência só quando a ferramenta não trouxe dado e o texto do modelo repete a data limite que ela devolveu.

**Implementação.**
- `chat-assistant/ausenciaFixa.ts` acrescenta ao fim "Não há registro no aplicativo para o que foi pedido.". Três condições, todas necessárias:
  - nenhuma ferramenta trouxe dado (`semDados`);
  - o texto ainda não diz a ausência pelo reconhecedor da R5 (`reconheceAusencia`, agora público em `languageRules.ts`);
  - o texto repete o `dadosAte` de uma ferramenta sem dado (DD/MM/AAAA ou DD/MM).
- A costura entra **antes** das regras, nas duas gerações (`verificacao.ts`). Assim, a R5 e a dispensa da R2 (F1) veem a frase.

Prova:
- `__tests__/ausenciaFixa.test.ts` (novo, 6 casos; os 2 que costuram estavam vermelhos contra um módulo que não costurava);
- `verificacao.test.ts`, "a ausencia costurada (DS14 = C1)": o E6 #2 aprovado com a frase estava vermelho antes; "Seu acompanhamento está em dia." sem a data continua reprovado, e o teste antigo da R5 também segue verde.

Limite conhecido: uma resposta que cita a data limite **e** afirma algo sem termo de saúde ("os dados vão até 12/10/2026, e seu acompanhamento está em dia") ganha a frase e passa. A data prova que o modelo viu o limite, não que ele não afirmou mais nada.

## DS15 — Idade com sexo na R3, encaminhamento na ausência e latência (achado A12)

Remedição de E6, E7 e E9 depois da DS14 (2026-10-22, commit `eb00624`): E6 5/5, E9 9/9, e o E7 em 4/6 numa segunda passada. Três achados, independentes entre si.

### DS15.1 — "você tem 54 anos e sexo feminino" (E7 #2)

Pergunta: "preciso fazer mamografia?". A resposta citou o perfil: "no seu perfil consta que você **tem 54 anos e sexo feminino**". A R3 reprovou como diagnóstico. A exceção da idade (DS9) para de valer quando vem "e" depois, **de propósito**, para continuar barrando "você tem 54 anos e diabetes". A segunda geração chamou ferramenta de novo e caiu na reserva.

`consultar_perfil` devolve data de nascimento, sexo, peso, altura, condições crônicas, medicações e alergias declaradas. Idade e sexo são exatamente o que a USPSTF usa para filtrar (E7).

- **A. "e sexo/gênero feminino/masculino" depois da idade.** A exceção da idade aceita o "e" quando o que vem depois é o sexo do perfil, e só ele.
  - Benefício: estreita; "você tem 54 anos e diabetes" e "você tem 54 anos e pressão alta" continuam reprovados.
  - Malefício: mais uma forma na lista da R3.
- **B. Todo campo do perfil depois do "e"** (sexo, peso, altura).
  - Benefício: cobre "54 anos e 1,65 m".
  - Malefício: mais largo; peso dito como "você tem 54 anos e 90 kg" fica a um passo de juízo sobre o peso.
- **C. Só o prompt** ("diga 'seu perfil tem idade 54 e sexo feminino'").
  - Malefício: não é determinístico.

**Recomendação: A.**

**Continua reprovado (contra-testes):**
- "Você tem 54 anos e diabetes."
- "Você tem 54 anos e pressão alta."
- "Você tem diabetes há 5 anos."

### DS15.2 — O encaminhamento costurado na resposta de ausência (E6 #2)

O E6 #2 foi aprovado, mas saiu com "…importe em Mais > Dados do smartwatch > Importar. **Para avaliar o que isso significa para você, procure um profissional de saúde.**". A DS13.2 (com o F1) tirou da **R2** a exigência de encaminhar na resposta que só diz que o dado não existe. Só que a entrega (`entregar`, em `verificacao.ts`) costura o encaminhamento em **toda** resposta clínica que não tem um, sem olhar a regra. A frase fica sem sentido: "o que isso significa" se refere a um dado que não veio.

- **A. A costura segue a dispensa.** A entrega não costura o encaminhamento quando a resposta só diz que o dado não existe, com o mesmo critério da dispensa da R2 (`soAusencia`, sem medida), tornado público em `languageRules.ts`.
  - Benefício: um critério só, para a regra e para a costura; tira o rodapé mecânico que a R2 diz evitar.
  - Malefício: a resposta de ausência numa pergunta clínica sai sem nenhum encaminhamento. A tela tem o aviso fixo, que é a premissa da R2.
- **B. Manter.** A cópia do app é sóbria por decisão (`encaminhamento.ts`), e a repetição entre turnos é um preço já assumido.
  - Malefício: a frase não faz sentido numa resposta sem dado.

**Recomendação: A.**

### DS15.3 — A latência

**O que a medição mostrou, e a hipótese que caiu.** Nas remedições, as respostas levaram de 25 a 148 s (contra 4 a 31 s na rodada completa da manhã), e houve TIMEOUT de 150 s no roteiro local (E7 #4). A hipótese registrada era a rede local. O CloudWatch a derruba: a métrica `InvocationLatency` do próprio Bedrock, para `us.anthropic.claude-sonnet-4-6`, foi esta (média e máximo por 15 min):

| Janela (UTC−3) | Chamadas | Média | Máximo |
|---|---|---|---|
| 08:32 | 11 | 2,4 s | 3,3 s |
| 08:47 | 97 | 3,4 s | 14,5 s |
| 09:02 | 38 | 4,5 s | 9,3 s |
| 09:17 | 7 | 20,7 s | 49,6 s |
| 09:32 | 33 | 16,6 s | 43,8 s |
| 10:02 | 21 | 27,7 s | 80,5 s |
| 10:17 | 18 | 52,6 s | 186,1 s |
| 10:32 | 19 | 32,7 s | 106,0 s |
| 10:47 | 6 | 80,1 s | 187,9 s |

- Nenhum `InvocationThrottles`, `InvocationServerErrors` nem `InvocationClientErrors` no período.
- A saída por chamada ficou estável (cerca de 150 tokens), então não são respostas maiores.
- O código e o modelo não mudaram entre 09:02 e 09:17.

A lentidão está **no serviço**, no perfil de inferência `us.` (cross-region dos EUA), e não no código nem na rede. O cliente do chat (`conversationLoop.ts`) não tem limite de tempo por chamada: uma chamada presa espera até o teto de 120 s da Lambda, e o aplicativo desiste aos 90 s com a mensagem genérica.

- **A. Perfil `global.`** (`global.anthropic.claude-sonnet-4-6`, ativo na conta). Ele roteia entre regiões do mundo todo, com mais capacidade que o `us.`. Muda o perfil e as ARNs da permissão no `backend.ts`.
  - Benefício: ataca a causa provável (capacidade do perfil dos EUA).
  - Malefício: a inferência pode rodar fora dos EUA. O app não vai ao público (memória do projeto), mas o dado de saúde da pessoa passa a poder sair da região, e isso merece registro. Vale medir antes de adotar.
- **B. Limite de tempo por chamada, com aviso honesto.** O cliente do Bedrock ganha um limite (por exemplo, 40 s). Quando a chamada passa dele, o turno vira o aviso de sobrecarga da DS7 ("Muita gente está usando o assistente agora…"), dentro dos 90 s do app, em vez da mensagem genérica.
  - Benefício: a pessoa entende o que houve, e a Lambda não fica presa.
  - Malefício: não deixa o serviço mais rápido; uma resposta que chegaria aos 50 s se perde.
- **C. A + B.**
- **D. Nada no código.** Registrar como limite conhecido do serviço, como a cota de 10/min (A6).

**Recomendação: B agora, e A como medição à parte.** B é barato e melhora o que a pessoa vê em qualquer caso. A tem um custo de privacidade que pede uma decisão própria, depois de medir se o `global.` é mesmo mais rápido.

**Decisão (2026-10-22):** DS15.1 = A; DS15.2 = A; DS15.3 = B (limite de tempo por chamada, com o aviso de sobrecarga). O perfil `global.` fica como medição à parte.

**Implementação.**
- **DS15.1** (`languageRules.ts`): a exceção da idade aceita o "e" quando o que vem depois é "sexo/gênero feminino/masculino" ou "é do sexo …".
- **DS15.2:** o critério da dispensa da R2 vira `dispensaEncaminhamento` (público em `languageRules.ts`), e a entrega (`verificacao.ts`) não costura o encaminhamento quando ele vale.
- **DS15.3** (`conversationLoop.ts`): cada chamada ao modelo tem limite de 40 s (`TEMPO_MAXIMO_DA_CHAMADA_MS`), com `abortSignal` no SDK. O tempo esgotado tem o mesmo tratamento da `ThrottlingException`: aviso de sobrecarga na primeira geração. Na segunda, segue o caminho de qualquer falha (a resposta degradada), como já era com a `ThrottlingException`.
- Limite registrado no código: o limite é por chamada, não por turno, e um turno de três chamadas lentas ainda passa dos 90 s do aplicativo.

Prova: testes vermelhos antes e verdes depois.
- `languageRules.test.ts`: 2 frases com idade e sexo (o contra-teste "54 anos e pressão alta" entrou junto).
- `verificacao.test.ts`: a ausência sem o encaminhamento costurado; o de juízo em outra oração é guarda.
- `conversationLoop.test.ts`: o limite existe e a chamada presa vira sobrecarga, com relógio falso; a chamada rápida é guarda.

`npx jest amplify/functions/chat-assistant amplify/functions/ai-language-rules`: 2543 testes. `npm run typecheck:backend` passou.

### DS15.3, medição à parte: perfil `global.` contra `us.` (2026-10-22, 11:32–11:36)

**Como foi medido.** O backend não mudou. Foram 16 chamadas mínimas pelo Converse (endpoint FIPS, `maxTokens` 200, uma pergunta de uma frase), alternando `us.anthropic.claude-sonnet-4-6` e `global.anthropic.claude-sonnet-4-6`, com 7 s de pausa por causa da cota. Para cada chamada, o tempo total visto desta máquina e o `latencyMs` que o próprio Bedrock devolve. Saída de 46 a 63 tokens em todas.

| Perfil | `latencyMs` média | mediana | máximo | Tempo total médio (com a rede) |
|---|---|---|---|---|
| `us.` | 1,84 s | 1,76 s | 2,78 s | 3,77 s |
| `global.` | 1,31 s | 1,29 s | 1,47 s | 3,21 s |

O CloudWatch confirma, na janela das 11:31: `us.` com 1,84 s de média (8 chamadas) e `global.` com 1,31 s (8 chamadas).

**O que dá para concluir, e o que não dá.**
- Nesta janela, o `global.` foi cerca de 30% mais rápido no Bedrock e muito mais estável (máximo de 1,5 s contra 2,8 s).
- **Esta medição não reproduz o episódio lento.** O `us.` estava em 32,8 s de média às 11:26, nas chamadas do chat, e em 1,8 s às 11:31, nas chamadas mínimas. Ou o episódio passou entre as duas janelas, ou a lentidão depende do formato da chamada do chat (cerca de 21 mil tokens de entrada, as 17 ferramentas, saída estruturada e `effort`), que a chamada mínima não tem. A mesma chamada do chat rodou em 3 a 4 s de média de manhã (08:47–09:02), com o mesmo código, o que pesa a favor da primeira explicação, sem descartar a segunda.
- Para decidir pelo `global.`, a medição que falta é a chamada do chat de verdade nos dois perfis, durante um episódio lento. Isso exige trocar o perfil num sandbox, e é uma mudança de backend.

**A questão da região continua aberta e não depende da latência.** Com o `global.`, a inferência pode rodar fora dos EUA, com dado de saúde da pessoa no prompt.

## DS16 — Recomendações no inventário, filtro SEXUAL na prevenção e latência pelo formato da chamada (achado A13)

Remedição de E6 e E7 com o código da DS15 (2026-10-22, 11:37–11:48). Três achados independentes.

### DS16.1 — "Você tem 60 recomendações adaptadas" (E7 #2)

A R3 reprovou como diagnóstico, porque "recomendações" não está no inventário do "você tem" (`COISAS_DO_APLICATIVO`). Reproduzido: "Você tem 60 recomendações adaptadas para o seu grupo." e "Você tem 12 recomendações listadas." reprovam. "No aplicativo há 60 recomendações para o seu grupo." passa. "Você tem recomendação de fazer mamografia." e "Você tem indicação de fazer colonoscopia." também reprovam, **e precisam continuar reprovando**: são indicação individual.

- **A. Só a contagem.** "você tem N recomendações" (algarismo ou número por extenso) entra no inventário. Sem número, continua julgado.
  - Benefício: separa a contagem da lista ("60 recomendações") da indicação ("recomendação de fazer").
  - Malefício: "você tem 2 recomendações de exame" também passa, mas como contagem do que a fonte lista para o grupo, que é o que a resposta diz.
- **B. "recomendações" em qualquer forma no inventário.**
  - Malefício: "você tem recomendação de fazer mamografia" passaria, e isso é indicação.
- **C. Só o prompt** ("diga 'a lista do aplicativo tem 60 recomendações'").
  - Malefício: não é determinístico.

**Recomendação: A.**

**Continua reprovado (contra-testes):**
- "Você tem recomendação de fazer mamografia."
- "Você tem indicação de fazer colonoscopia."
- "Você tem 54 anos e diabetes."

### DS16.2 — O filtro SEXUAL do guardrail na lista da USPSTF (E7 #5)

Pergunta: "o que o app mostra na parte de prevenção?". O guardrail do chat bloqueou a **saída** pelo filtro de conteúdo `SEXUAL` (confiança MÉDIA, força MEDIUM). A resposta listava as recomendações do grupo da pessoa, que incluem rastreamento de clamídia, gonorreia, sífilis e HIV em "mulheres sexualmente ativas", texto da própria USPSTF. A pessoa recebeu "Não consigo responder a essa mensagem". A extração tirou esse filtro pelo mesmo motivo (D20: sorologia dispara SEXUAL).

Hoje o guardrail do chat tem `SEXUAL` em MEDIUM na entrada e na saída (`backend.ts`, `configuracaoDoGuardrailDoChat`).

- **A. Desligar o `SEXUAL` só na saída** (`outputStrength: 'NONE'`, entrada continua MEDIUM). A saída do chat sai dos dados da própria pessoa e das fontes do app, e passa pelas regras R1 a R5. A pergunta da pessoa continua filtrada.
  - Benefício: resolve o caso e mantém o filtro onde ele protege (o que a pessoa manda).
  - Malefício: um texto sexual gerado pelo modelo deixa de ser barrado pelo guardrail. O modelo é instruído e as fontes são clínicas, mas a camada deixa de existir na saída.
- **B. Baixar para LOW nas duas pontas.**
  - Benefício: mantém a camada.
  - Malefício: não há garantia de que LOW deixe passar esse texto; precisa medir, e pode só diminuir a frequência.
- **C. Tirar o `SEXUAL` do chat inteiro,** como a extração (D20).
  - Malefício: a pergunta da pessoa também deixa de ser filtrada.
- **D. Manter.** Toda resposta que liste as recomendações de IST do grupo pode ser bloqueada.

**Recomendação: A**, com o teste de infraestrutura fixando que a entrada continua filtrada. Como a configuração do guardrail mudou, a impressão digital da versão (DS1) publica a versão nova sozinha.

### DS16.3 — A latência segue o formato da chamada do chat

**O que se sabe.** Com o mesmo perfil (`us.anthropic.claude-sonnet-4-6`) e no mesmo intervalo de minutos, as chamadas mínimas das 11:33 levaram 1,8 s de média no Bedrock, e as do chat das 11:38 às 11:43 levaram 16,6 e 20,4 s (máximo de 81 s). Nenhum throttling ou erro.

A chamada do chat leva:
- uma parte **fixa** de cerca de 10,5 mil tokens de entrada (prompt de sistema, contexto do dia e as 17 ferramentas), medida nos turnos sem ferramenta (E1 #4, E1 #5, E11 #4);
- as saídas das ferramentas, que levam a entrada a 21–36 mil tokens (E7 #2: 36.433);
- saída estruturada (`output_config`) e `effort`.

A parte fixa é **reenviada em cada ida ao modelo**, de 2 a 4 por turno, e o código não usa cache de prompt (`cachePoint`). De manhã, a mesma chamada rodou em 3 a 4 s, então o formato sozinho não explica tudo. Nenhuma parte foi testada isoladamente.

- **A. Experimento de isolamento antes de mudar código.** Repetir uma pergunta fixa do chat (por exemplo, a E7 #2) em quatro variações, alternadas e no mesmo intervalo: completa; sem `output_config`; sem as ferramentas (só o histórico como texto); entrada reduzida a 10 mil tokens. Umas 20 chamadas, dentro da cota.
  - Benefício: diz qual parte pesa antes de mexer.
  - Malefício: se o episódio lento passar no meio, o experimento não conclui nada, como aconteceu com a medição do `global.`.
- **B. Cache de prompt na parte fixa.** Um `cachePoint` depois do prompt de sistema e das ferramentas, que o Bedrock aceita para o Sonnet 4.6. A partir da segunda ida ao modelo no mesmo turno, e entre turnos próximos, os 10,5 mil tokens fixos são lidos do cache.
  - Benefício: menos processamento de entrada em toda chamada e custo menor da parte cacheada, mesmo sem saber a causa do episódio.
  - Malefício: não ataca as saídas das ferramentas, que são a maior parte nos turnos lentos. O contexto do dia precisa ficar depois do ponto de cache, senão o invalida todo dia (ver `contextoDeHoje.ts`).
- **C. Perfil `global.` com a chamada real,** num sandbox, durante um episódio lento. Exige a decisão sobre região (DS15.3).
- **D. Nada no código.** O limite de 40 s (DS15.3) já transforma a espera em aviso.

**Recomendação: A e depois B.** O experimento é barato, e o cache vale a pena de qualquer jeito. Mas se o peso estiver nas saídas das ferramentas, o próximo passo é encurtá-las, e não o cache.

**Decisão (2026-10-22):** DS16.1 = A (só a contagem); DS16.2 = A (SEXUAL desligado só na saída); DS16.3 = A e depois B (experimento de isolamento, depois cache de prompt).

**Implementação.**
- **DS16.1** (`languageRules.ts`): o inventário do "você tem" aceita "N recomendações", com algarismo ou número por extenso até doze. Sem número, continua julgado.
- **DS16.2** (`backend.ts`): o filtro SEXUAL do guardrail do chat fica com `outputStrength: 'NONE'` e `inputStrength: 'MEDIUM'`. A impressão digital da configuração (DS1) publica a versão nova no próximo deploy.
- **DS16.3 B** (`conversationLoop.ts`): um ponto de cache (`cachePoint`) no fim das ferramentas e outro logo depois do prompt de sistema, antes do contexto do dia.

Prova: testes vermelhos antes e verdes depois.
- `languageRules.test.ts`: 3 contagens de recomendações; os 2 de indicação são guarda.
- `infraGuardrail.test.ts`: o SEXUAL só na entrada.
- `conversationLoop.test.ts`: os 2 pontos de cache. Os 4 testes que fixavam o formato antigo de `system` e das ferramentas passaram a fixar o novo: o prompt, o ponto de cache e a data, nessa ordem.

**DS16.3 A — o experimento** (`roteiro/latencia.mts`, 2026-10-22, 16:02–16:07 UTC). Mesma primeira chamada do chat para "preciso fazer mamografia?", em 6 variantes alternadas, 3 voltas, 7 s de pausa, Sonnet 4.6 pelo `us.`. Valores de `latencyMs` do Bedrock:

| Variante | Entrada | Saída | Volta 1 | Volta 2 | Volta 3 |
|---|---|---|---|---|---|
| completa | 10.514 | 40 | 2,4 s | 1,9 s | 4,0 s |
| sem saída estruturada | 9.685 | 40 | 8,6 s | 1,6 s | 4,0 s |
| sem ferramentas | 6.666 | 40–73 | **30,7 s** | 4,4 s | 3,1 s |
| sem guardrail | 10.514 | 40 | 1,8 s | 2,2 s | 2,0 s |
| entrada grande (+15 mil tokens) | 45.016 | 85–97 | 4,6 s | 5,9 s | 5,0 s |
| mínima | 13 | 330–399 | 9,6 s | 6,2 s | 6,0 s |

O que o experimento mostra:
- **Não houve episódio lento**: a chamada completa ficou entre 1,9 e 4,0 s.
- **Nenhuma parte domina.** Tirar a saída estruturada, as ferramentas ou o guardrail não muda a latência de forma consistente. O guardrail custa uns décimos de segundo.
- **A entrada de 45 mil tokens acrescenta cerca de 2 a 3 s.**
- **O que mais pesa é a saída.** A variante mínima é a mais lenta porque escreve 330 a 400 tokens.
- **Os picos caem em qualquer variante** (30,7 s sem as ferramentas, 8,6 s sem a saída estruturada). Isso enfraquece a hipótese, registrada no A13, de que o episódio lento depende do formato da chamada do chat. A diferença das 11:33 provavelmente era o tamanho da saída e o acaso, não a entrada.
- Conclusão: o episódio das 09:17–11:48 foi do serviço. O limite de 40 s (DS15.3) segue sendo a defesa.

**O cache na chamada real** (variante `com_cache`, 3 chamadas seguidas):
- a primeira gravou 10.140 tokens no cache (`cacheWriteInputTokens`);
- as duas seguintes leram os 10.140 do cache (`cacheReadInputTokens`), com 374 tokens de entrada sem cache;
- o Bedrock aceitou os pontos de cache junto com o guardrail e a saída estruturada;
- a latência ficou em 2,1–2,3 s, igual à da completa em condição normal. O ganho do cache é de processamento e de custo: os tokens lidos do cache custam cerca de 10% do preço da entrada. Na latência, o ganho só deve aparecer, se aparecer, em fila de prefill.

## DS17 — O chat no Claude Opus 4.6: medido e recusado (2026-10-22)

**Pedido do usuário.** Trocar só o modelo do chat para o Claude Opus 4.6, já que a conta não tem acesso ao Opus 5.5 nem ao Sonnet 5.5 (DS12). A extração e o wearable ficam no Sonnet 4.6. A regra combinada: se o Opus 4.6 fosse pior em aprovação ou latência, voltar ao Sonnet 4.6 e registrar a medição.

**Conferência antes da troca.**
- `get-foundation-model-availability`: AVAILABLE/AUTHORIZED.
- Os perfis `us.` e `global.anthropic.claude-opus-4-6-v1` existem.
- Uma chamada real no formato do chat (`effort: low`, saída estruturada, `maxTokens` 16.000, sem `temperature`) voltou `end_turn` em 3,0 s.
- O código da DS12 serve ao Opus 4.6 sem mudança. O teto de 16.000 sobra, porque sem thinking a resposta do chat fica em centenas de tokens, mas não quebra nada.

**A troca.** `CHAT_BASE_MODEL_ID = 'anthropic.claude-opus-4-6-v1'`, com o teste de infraestrutura vermelho antes. As duas ARNs da permissão derivam da constante (`inference-profile/us.anthropic.claude-opus-4-6-v1` e `foundation-model/anthropic.claude-opus-4-6-v1`). `npx jest` dos arquivos tocados (62) e `npm run typecheck:backend` passaram. Deploy no sandbox às 12:13.

**Rodada completa E1 a E12** (70 casos, 10 s de pausa, 15:13–15:42 UTC), comparada com a do Sonnet 4.6 da manhã:

| | Sonnet 4.6 | Opus 4.6 |
|---|---|---|
| Aprovadas | **67** | 64 |
| … delas na 2ª geração | 4 | 4 |
| Degradadas | 1 | 0 |
| Indisponíveis | 2 | 6 |
| Latência por pergunta: mediana | **9,2 s** | 10,8 s |
| p90 | **15,5 s** | 18,1 s |
| máximo | **31,6 s** | 44,0 s |
| Turnos acima de 90 s | 0 | 0 |
| ThrottlingException | 0 | **3** |
| Cota da conta (req/min, cross-region) | **10** (`L-00FF3314`) | 5 (`L-11DFF789`) |

**As 6 indisponíveis do Opus 4.6:**
- 3 ThrottlingException (E5 #5, E8 #2, E8 #norte). A cota do Opus 4.6 é a metade da do Sonnet, e com 2 a 4 chamadas por turno o ritmo da rodada já a estoura, com uma pessoa só.
- 1 corte pelo limite de 40 s (E1 #2).
- 1 bloqueio do filtro SEXUAL do guardrail (E7 #1, confiança ALTA). É o achado A13 (DS16.2), que não depende do modelo.
- 1 reprovação da R3 (E9 #6, "posso tomar warfarina? já tomo o Marevan"); a segunda geração chamou ferramenta.

**Resultado: o Opus 4.6 ficou pior em aprovação e em latência, e o chat voltou ao Sonnet 4.6.** Os dois arquivos voltaram ao estado do commit `02345fd`, e o sandbox foi implantado de novo com o Sonnet 4.6. **A comparação não é de igual para igual, e o viés favorece o Opus.** A rodada do Sonnet 4.6 foi de manhã, com o código de `addebdb`, antes da DS13 à DS15. As 3 falhas de regra dela (E2 #7, E6 #2 e E11 #2) foram corrigidas depois. A do Opus 4.6 rodou com o código de `02345fd`, com essas correções, e teve 1 falha de regra (E9 #6) e 1 do guardrail. Mesmo com o código mais novo, o Opus aprovou menos, e a maior parte da diferença vem da cota: as 3 perguntas recusadas por throttling nem chegaram ao modelo, então não se sabe se passariam. Uma rodada do Sonnet 4.6 com o código atual daria a comparação justa. Com 5 chamadas por minuto, porém, ele não serve ao chat nesta conta sem aumento de cota, e o aumento não foi liberado para o Sonnet (A6).

