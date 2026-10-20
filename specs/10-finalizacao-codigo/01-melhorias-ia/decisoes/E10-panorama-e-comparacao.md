# Decisões do E10 — Panorama e comparação entre domínios

Épico: [E10 no PRD](../prd.md) · Ordem de entrega: 9º · Estudo: [`estudos/E10.2-comparacao-entre-dominios.md`](../estudos/E10.2-comparacao-entre-dominios.md) · Duas decisões: D10.1 e D10.2 (as duas nasceram no estudo)

**Ordem (2026-10-19):** o README dizia que o E10.1 vem depois do E6. O produto decidiu fazer o E10 agora. O panorama só precisa da data da última importação de wearable, que o chat já lê. O E6 acrescenta histórico e série diária, que o panorama não usa.

## O que o código faz hoje (verificado em 2026-10-19)

Resumo da seção 2 do estudo:

- O modelo já pode chamar duas ferramentas no mesmo turno (por exemplo, wearable e resultados) e escrever as duas juntas. O freio é só a descrição de `consultar_wearable`.
- A verificação de linguagem (`ai-language-rules/languageRules.ts`) não barra atribuição de causa entre dados ("pode ter causado", "por causa de", "explica", "contribuiu", "está funcionando"). Só barra "melhorou" e "piorou".
- O chat não lê a série diária do wearable (E6.2), e a Parte 1 não muda tela.

---

## D10.1 — O que fazer com a comparação entre domínios (10.2)

**O que decidir:** o critério de saída do 10.2 no PRD. Implementar a comparação, implementar só o panorama, ou descartar.

### Opção A — Só o panorama agora; comparação depois do E6 e em tela *(recomendada)*

O E10 entrega `consultar_panorama` (10.1) e a guarda da D10.2. A comparação exame × wearable fica registrada com o formato do estudo (dois blocos, frase fixa do código, janela de 28 dias fixada no código). Ela volta depois do E6.2, como cartão em tela na Parte 2.

**Benefícios**
- Não entrega uma comparação imprecisa: a média mensal não coincide com a data da coleta.
- Segue o próprio PRD: a forma neutra é visual, e o texto carrega mais autoridade.
- Épico menor e de risco baixo. O formato já fica pronto para quando houver série diária.

**Malefícios**
- A pessoa que pedir "compara meu exame com meu sono" continua recebendo as duas coisas separadas, sem janela alinhada.
- A comparação depende de dois trabalhos futuros (E6.2 e Parte 2).

### Opção B — Comparação em texto agora

Nova ferramenta `consultar_comparacao` com pares fechados: valor de exame × média de sono ou passos do mês da coleta (dado do `metricsJson`). Dois blocos e a frase fixa acrescentada pelo código.

**Benefícios**
- Responde já a história do 10.2.

**Malefícios**
- O mês do calendário não é a janela da coleta (estudo, seção 5). O alinhamento é impreciso, e a apresentação parece mais rigorosa do que é.
- É texto, a forma de maior autoridade. Vai ser refeita quando houver série diária e tela.
- Mais uma ferramenta para o modelo escolher, e mais prompt em todo turno.

### Opção C — Descartar a comparação

Fica só o panorama. O 10.2 sai do PRD.

**Benefícios**
- Nenhum risco novo e nenhum trabalho futuro.

**Malefícios**
- Joga fora um formato que o estudo mostrou ser viável com série diária e tela.
- Não muda o risco que já existe hoje (ver D10.2).

**Recomendação:** A. O único par útil e defensável precisa de janela diária e de tela, e nenhuma das duas existe nesta parte.

**Decisão:** B — comparação em texto agora (produto, 2026-10-19). A recomendação era A. Com B, o alinhamento é pelo **mês do calendário da coleta**, o único que o chat lê hoje (`metricsJson.monthly`). A imprecisão apontada no estudo (seção 5) não some: a ferramenta diz na saída que a média é do mês inteiro, não dos dias antes do exame. A janela de 28 dias do estudo fica para quando houver série diária (E6.2).

**Efeito no PRD:** A: o 10.2 vira "registrado, aguarda E6.2 e Parte 2". B: o 10.2 ganha a especificação da ferramenta. C: o 10.2 sai do PRD.

---

## D10.2 — Barrar atribuição de causa entre dados de saúde

**O que decidir:** se a verificação (camada 4) passa a reprovar frases que ligam dois dados por causa e efeito. O risco existe hoje, com ou sem comparação.

### Opção A — Reprovar na verificação, com testes adversariais *(recomendada)*

Um verificador novo na R3 em `languageRules.ts` reprova frases que ligam dado de saúde por causa ou efeito: "causou", "pode ter causado", "por causa de", "explica", "contribuiu para", "influenciou", "é efeito de", "está funcionando". Continuam passando as frases honestas: "não consigo dizer se uma coisa influenciou a outra", datas lado a lado, cadastro sem juízo de eficácia. Tudo com casos na suíte `adversarial.test.ts`, os dois lados.

**Benefícios**
- Fecha uma brecha real, medida na sonda: 6 de 8 frases de causa passam hoje.
- Mesmo desenho das guardas anteriores (D3.4, D9.4): prompt e verificação dizem a mesma coisa.
- Protege o panorama: "como estou?" é a pergunta que mais convida a ligar assuntos.

**Malefícios**
- Risco de falso positivo, por exemplo "por causa de" em frase operacional ("a consulta foi remarcada por causa da chuva"). A mitigação é exigir que a frase ligue dois termos de saúde, e cobrir esses casos com testes.
- Uma resposta reprovada vira resposta degradada. Isso custa um pouco de utilidade quando o modelo erra.

### Opção B — Só no prompt

Uma linha nova no `SYSTEM_PROMPT` proibindo ligar dados por causa.

**Benefícios**
- Custo de código quase zero.

**Malefícios**
- Camada 1 sozinha é o que já existe hoje (a descrição de `consultar_wearable`), e a sonda mostra que ela não é verificada.
- Foge do padrão da base, em que toda regra do prompt tem verificação que a cobra.

### Opção C — Não mexer

**Benefícios**
- Nenhum.

**Malefícios**
- A brecha continua, e o panorama a deixa mais provável.

**Recomendação:** A.

**Decisão:** A — reprovar na verificação, com testes adversariais (produto, 2026-10-19).

**Efeito no PRD:** A: o E10 ganha a tarefa da guarda (RT5) e casos adversos na suíte. B: só muda o prompt. C: nada.

---

## D10.3 a D10.5 — Os riscos da entrega (nasceram na revisão)

Antes de aprovar a entrega, o produto pediu solução para os riscos que o review deixou. O estudo, com as medidas, as opções e os malefícios, está em [`estudos/E10-riscos-da-entrega.md`](../estudos/E10-riscos-da-entrega.md). O quarto risco, as citações reconhecidas pelo nome da ferramenta, é técnico: vira um gancho do `ChatTool`, sem decisão de produto.

| Decisão | O que decidir | Escolha | Data |
|---|---|---|---|
| **D10.3** | Como fechar a guarda de causa. A sonda mediu 44 de 46 frases de causa passando. | **A1**: léxico amplo por radical, dois domínios na frase e exceção quando a frase explica ausência de dado, com o corpus como teste permanente. | 2026-10-19 |
| **D10.4** | O panorama conta a menos sem avisar quando a tabela passa do teto de leitura. | **B1**: a leitura sinaliza o corte e o panorama e a comparação avisam ("pelo menos N"). O índice por dono fica registrado como dívida. | 2026-10-19 |
| **D10.5** | A janela da comparação até o E6.2. | **C1**: o mês, entre o da coleta e o anterior, que mais cobre as 4 semanas antes do exame, e a saída diz qual. No E6.2, a janela troca pelos 28 dias reais. | 2026-10-19 |

**Efeito no PRD:**
- O E6.2 ganha o requisito de trocar a janela da comparação pelos 28 dias.
- A dívida do índice por dono entra na seção de riscos, com o gatilho: alguma tabela acima de alguns MB.

## D10.6 — O resíduo da guarda de causa (nasceu no resultado da D10.3)

As sondas cegas mostraram que o léxico (D10.3) pega perto de metade das frases de causa nunca vistas. As opções estão no estudo [`estudos/E10-riscos-da-entrega.md`](../estudos/E10-riscos-da-entrega.md): (1) "uma frase, um domínio" nos turnos que cruzam domínios, ou (2) um classificador por modelo.

**Decisão:** 1, "uma frase, um domínio" (produto, 2026-10-19). Nos turnos que usam a comparação, ou o wearable junto com valor de exame:
- a frase que fala de dois domínios de saúde é reescrita;
- uma frase com um conector de causa junto de qualquer dado de saúde também é reescrita, o que pega a anáfora ("isso explica o colesterol");
- passam a explicação de falta de dado ou do mês usado, a recusa de ligar os dados e o encaminhamento.

**Efeito no PRD:** o risco R8 é mitigado (ver o resultado no estudo).

## D10.7 e D10.8 — Ajustes da guarda de causa (nasceram na revisão do E6, 2026-10-20)

O `/code-review` do E6 achou três pontos nas regras do E10. Um era furo e foi fechado sem decisão, porque só aperta: a explicação de falta de dado absolvia a frase inteira, e "não há dados de passos naquele mês, mas o sono causou o colesterol alto" passava. Agora ela vale só na oração do conector. Os outros dois pediam decisão:

| Decisão | O que decidir | Escolha | Data |
|---|---|---|---|
| **D10.7** | A guarda de causa barrava frases de apresentação do assistente, como "Por isso, mostro o exame de colesterol e o remédio cadastrado lado a lado", e forçava uma nova geração. | **Exceção estreita**: "por isso", "com isso", "assim" e "então" seguidos logo de uma ação do assistente ("mostro", "listo", "trago", "vou mostrar"...) não contam como causa. "Mostro **que**" continua barrado, e os verbos de causa da mesma frase são julgados à parte. Na memória, nada muda: a proposta que liga dois dados é descartada em silêncio, e o remédio já é registro, e não memória. | 2026-10-20 |
| **D10.8** | "Uma frase, um domínio" valia só para exame com relógio. Um turno com relógio e remédio ("meu sono mudou depois da losartana?") ficava só com o léxico. | **Por domínio da ferramenta**: o turno cruza quando usa ferramentas de dois domínios entre exame, relógio e remédio (`consultar_medicamentos`, `consultar_doses_tomadas`, `consultar_receitas`), além da comparação. `consultar_interacoes` fica de fora, para não reescrever o alerta curado do E9. O prompt avisa o modelo antes (cada dado na sua frase, sem "porque" ou "por isso" ligando uma à outra), para a primeira resposta já sair certa. | 2026-10-20 |

**Custo aceito na D10.8:** nesses turnos, uma frase honesta como "a dose das 20h está pendente porque o horário ainda não chegou" é reescrita, pois a anáfora não distingue motivo operacional de causa. O prompt pede o fato sem conector ("está pendente: esse horário ainda não chegou"), e essa forma passa. Os testes estão em `corpusDeCausa.test.ts`, `umaFraseUmDominio.test.ts`, `verificacao.test.ts` e `propostaValida.test.ts`.
