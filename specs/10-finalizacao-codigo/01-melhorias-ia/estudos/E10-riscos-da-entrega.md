# Estudo — Os quatro riscos da entrega do E10

Épico: [E10](../E10-panorama-e-comparacao/spec.md) · Data: 2026-10-19 · Pedido do produto, antes de aprovar a entrega: estudar e desenvolver solução para os riscos que o review deixou.

Cada risco tem: o que o código faz (verificado), o tamanho medido, as opções com benefícios e malefícios, e a recomendação. As escolhas ficam em [`decisoes/E10-panorama-e-comparacao.md`](../decisoes/E10-panorama-e-comparacao.md) (D10.3 a D10.5).

---

## Risco A — Frases de causa que a guarda não pega (o maior)

**Medido em 2026-10-19.** Uma sonda passou 46 frases de causa pela verificação. Elas estão separadas em seis famílias gramaticais, e o resultado foi:

| Família | Exemplo | Passam hoje |
|---|---|---|
| Verbo causativo | "O pouco sono provocou o aumento do colesterol." | 14 de 14 |
| Substantivo de causa | "O colesterol alto é consequência do sono ruim." | 8 de 9 |
| Locução prepositiva | "O colesterol subiu em função do sono ruim." | 4 de 4 |
| Conjunção causal | "Seu colesterol subiu porque você dormiu pouco." | 7 de 8 |
| Correlação dita como explicação | "A glicose alta se deve ao sono curto." | 5 de 5 |
| Eficácia de tratamento | "O remédio controlou sua glicose." | 6 de 6 |

**44 de 46 passam.** A lista fechada da D10.2 pega as frases exatas dos testes e quase nada fora delas. As 10 frases honestas do corpus passam (0 de 10 barradas).

**Por que a lista de conectores falha.** O português tem dezenas de formas de dizer causa: verbo, substantivo, locução, conjunção. Uma lista de expressões completas não acompanha isso. Duas coisas, porém, se repetem em toda frase de causa entre dados:

1. a frase fala de **dois domínios de saúde** (sono, atividade, remédio, medida);
2. há uma **palavra que relaciona** os dois.

O que separa a frase honesta da proibida é que a honesta usa a relação para explicar a **ausência de dado** ("não aparece porque a importação cobre poucos dias"), e não um dado pelo outro.

### Opções

**A1 — Léxico amplo por radical, dois domínios, exceção de ausência *(recomendada)*.**
- Troca a lista fechada por famílias de radicais (provoc-, ger-, result- em, acarret-, afet-, interfer-, impact-, prejudic-, favorec-, ajud-, motivo, consequência, reflexo, fruto, responsável, fator, culpa, razão, em função de, em decorrência de, porque, pois, já que, com isso, consequentemente, então, tem a ver, ligado a, se deve, justific-; eficácia: resolv-, control-, normaliz-, baix-/reduz- com remédio como sujeito, "com o remédio").
- Continua exigindo dois domínios na mesma frase.
- Ganha uma exceção de **ausência**: "não há", "não cobre", "ficou de fora", "poucos dias", "sem dado", "não aparece".
- O domínio do remédio passa a reconhecer também os nomes do dataset de interações (losartana, warfarina...), além de "remédio" e "medicamento".
- O corpus das 46 frases e as 10 honestas viram teste permanente, com meta de 46 de 46 barradas e 0 de 10 honestas barradas, além de todas as suítes atuais verdes.
- *Benefícios:* determinístico, barato, testável, e no mesmo desenho das outras regras.
- *Malefícios:* mais falso positivo possível, por exemplo uma frase honesta com dois domínios e "então" que não fala de ausência. A frase barrada vira segunda geração, com bilhete, e não resposta perdida.

**A2 — Classificador por modelo (Bedrock) só nos turnos que cruzam domínios.**
- *Benefícios:* entende paráfrase que nenhuma lista prevê.
- *Malefícios:* não é determinístico, custa uma chamada a mais e latência, e o resultado não se prova por teste. Também foge do desenho da camada 4, que é verificação determinística.

**A3 — Manter a lista e só acrescentar as frases medidas.**
- *Benefícios:* menor mudança.
- *Malefícios:* é a abordagem que deu 2 de 46, com remendo por frase.

**Recomendação: A1.** A2 pode vir depois, se a telemetria de reprovação mostrar paráfrase escapando.

---

## Risco B — O panorama pode contar a menos sem avisar

**Verificado no código.** `lerDoDono` faz `Scan` com filtro de dono e para em `MAX_PAGINAS = 10`. Cada página lê até 1 MB **da tabela inteira**, de todos os usuários, antes do filtro. Passadas 10 páginas, as linhas do dono que estão depois **nunca são vistas**, e nada avisa.

**Tamanho.** Isso só acontece com a tabela acima de cerca de 10 MB. A maior é `LabResult`, com cerca de 0,5 KB por linha, ou seja, perto de 20 mil linhas somando todos os usuários. Nenhuma tabela tem índice por dono (conferido em `amplify/data/schemas/`).

O risco não é só do panorama: toda ferramenta do chat lê assim. No panorama ele aparece mais, porque a saída é uma **contagem**, e contagem truncada parece exata.

### Opções

**B1 — Sinalizar o corte *(recomendada agora)*.**
- `lerDoDono` ganha uma versão irmã que também diz se parou no teto (`incompleta`). O registro do turno guarda essa informação.
- O panorama e a comparação passam a devolver `leituraIncompleta: true`, e o prompt manda dizer "pelo menos N".
- *Benefícios:* honesto, pequeno, sem mudança de schema, e as outras ferramentas não mudam.
- *Malefícios:* não lê mais nada; só deixa de mentir.

**B2 — Índice por dono (GSI `owner`) e `Query` em vez de `Scan`.**
- *Benefícios:* resolve na raiz. Lê só as linhas do dono, fica mais barato e o teto deixa de importar.
- *Malefícios:* mudança de schema em 6 tabelas, que exige decisão explícita (constituição, regra 5, e RT7). Também traz risco de deploy: o Amplify cria um GSI por vez, com preenchimento sobre os dados existentes, e o campo `owner` hoje é implícito. Vale para o chat inteiro, não para o E10.

**B3 — Aumentar o teto.** Só move o problema, e custa latência.

**Recomendação: B1 agora**, e B2 registrado como dívida no PRD, com o gatilho: fazer quando alguma tabela passar de alguns MB.

---

## Risco C — A comparação usa o mês do calendário, não os dias antes do exame

**Verificado.** Hoje o par usa o mês do calendário da coleta. Para uma coleta no dia 2, quase todo o mês usado é **depois** do exame. A janela certa (os 28 dias antes da coleta) precisa da série dia a dia, que está no `result.json` do S3. Esse arquivo é gravado em `health-imports/{identityId}/{importId}/result.json`, e lê-lo é o E6.2.

### Opções

**C1 — Agora: o mês que mais cobre as 4 semanas antes da coleta; no E6.2, a janela de 28 dias *(recomendada)*.**
- Regra determinística: entre o mês da coleta e o mês anterior, vale o que tem mais dias dentro dos 28 dias antes da coleta. Uma coleta em 12/03 usa fevereiro; uma em 20/03 usa março.
- A saída diz qual mês foi usado e por quê.
- No E6.2 (o próximo da fila), a janela troca pelos 28 dias de verdade. Isso fica escrito como requisito do E6.2 no PRD.
- *Benefícios:* melhora o alinhamento já, sem S3, e não refaz trabalho.
- *Malefícios:* continua sendo uma aproximação até o E6, e muda um detalhe da D10.1, que dizia "mês da coleta".

**C2 — Manter o mês da coleta até o E6.2.**
- *Benefícios:* nenhum código novo.
- *Malefícios:* fica a pior aproximação, a do caso do dia 2.

**C3 — Trazer para o E10 a leitura do `result.json` (parte do E6.2).**
- *Benefícios:* janela de 28 dias de verdade já.
- *Malefícios:* traz para este épico uma permissão de leitura do S3 no chat, com validação de chave, que o E6 já especifica. O épico cresce, e o E6 seria feito pela metade em dois lugares.

**Recomendação: C1.**

---

## Risco D — Citações reconhecidas pelo nome da ferramenta

**Verificado.** `citacoes.ts` tem um ramo por nome (`consultar_resultados`, `consultar_analito` e, desde o E10, `consultar_comparacao`), cada um lendo a forma da saída de outro arquivo. Se a saída mudar, a citação some sem erro. O próprio `tools/tipos.ts` já recusa esse desenho para `renderDegraded` e `valoresCadastrados`.

### Solução (técnica, sem decisão de produto)

Um gancho `linhasCitaveis?: (output) => Citation[]` no `ChatTool`, implementado por quem produz a saída (analitos, resultados, comparação). `indexarLinhasCitaveis` passa a só percorrer as saídas. A função que monta uma citação vai para um módulo puro próprio, para não criar ciclo de importação. Os testes atuais de `citacoes.test.ts` continuam valendo, e um teste novo afirma que toda ferramenta que devolve valor de exame declara o gancho.

Vou fazer, porque não muda o comportamento.

---

## Resultado (2026-10-19, depois das decisões D10.3 a D10.5)

**Risco A (A1, feito).**
- A guarda passou a ser léxico por família, com dois domínios de saúde na frase e uma exceção quando a frase explica a falta de dado ou o mês usado.
- Os sinais do relógio (estresse, batimentos) viraram um domínio à parte. O remédio também reconhece os nomes do dataset do E9. Entraram ainda o verbo de mudança com um dado de saúde como objeto ("elevou sua pressão") e o remédio como sujeito ("o remédio baixou seu colesterol").
- O corpus permanente (`ai-language-rules/__tests__/corpusDeCausa.test.ts`) tem 62 frases de causa, todas barradas, e 19 honestas, todas aprovadas, nas duas classes de pergunta. Os textos do E9 e as suítes antigas continuam verdes.
- **Medida honesta (sondas cegas, com frases escritas sem olhar a regra):**
  - sonda 1: 9 de 15 barradas e 0 de 10 honestas barradas. Depois disso, as lacunas estruturais dela entraram na regra.
  - sonda 2, nova e aplicada depois de todos os ajustes: **7 de 15 barradas e 1 de 10 honestas barradas**. A honesta barrada era a explicação do mês da comparação, e foi corrigida.
- **Conclusão:** frente a frase nunca vista, o léxico pega perto de metade (antes, cerca de 4%). O que escapa são famílias abertas ("veio do", "trouxe", "pesou no", "é a explicação para", "tem relação com", "surtindo efeito", "por ter dormido") e nomes de remédio fora do dataset.
- **Esse é o limite do método:** cada sonda nova acha famílias novas. Há duas saídas estruturais, que pedem decisão:
  - **(i)** nos turnos que cruzam domínios (comparação, ou wearable junto com exame), a regra "uma frase, um domínio": cada dado em sua frase, e a frase que junta dois domínios é reprovada, salvo as explicações de falta de dado. É determinística e não depende de léxico. O custo é reescrita mais frequente nesses turnos, e ela não pega anáfora ("isso explica o colesterol", na frase seguinte);
  - **(ii)** o classificador por modelo (A2), só nesses turnos.

**Risco B (B1, feito).**
- `lerDoDonoComCorte` diz quando a leitura parou no teto, e o registro do turno guarda o sinal.
- O panorama e a comparação devolvem `leituraIncompleta: true`, e o prompt manda dizer "pelo menos".
- `lerDoDono` não mudou para as outras ferramentas.

**Risco C (C1, feito).**
- A comparação usa o mês, entre o da coleta e o anterior, com mais dias nas 4 semanas antes do exame: o da coleta a partir do dia 15, e no empate fica ele.
- O `avisoDoAlinhamento` e o prompt dizem qual mês e por quê.
- A janela de 28 dias reais entrou como requisito do E6.2 no PRD.

**Risco D (feito por outro caminho).**
- O gancho `linhasCitaveis` foi estudado e descartado: `citacoes.ts` teria de carregar o registro de ferramentas, e com ele o SDK. Isso quebraria a separação dos testes puros (`verificacao.test.ts`, `citacoes.test.ts`).
- No lugar dele entrou um teste de ida e volta sobre a **lista inteira** (`__tests__/citacoesDaLista.test.ts`): cada ferramenta roda de verdade sobre um banco com uma linha de exame, e, se o id da linha aparece na saída, ele precisa estar no índice de citação.
- Uma mutação conferiu que o teste pega a citação perdida: tirar o ramo da comparação o faz falhar.
- Ele também pega uma ferramenta nova que devolva valor de exame sem entrar no índice.

## Resultado da D10.6, "uma frase, um domínio" (2026-10-19)

- **Implementação:**
  - `verificarUmaFraseUmDominio` em `languageRules.ts`, com a opção `cruzaDominios`;
  - `verificacao.ts` liga a opção quando o turno usou a comparação, ou o wearable junto com `consultar_analito` ou `consultar_resultados`;
  - o prompt manda escrever cada dado na sua própria frase.
- **Medido em sondas cegas novas, num turno que cruza domínios, antes de qualquer ajuste:**
  - sonda 3: **7 de 10** frases de causa barradas e **0 de 8** honestas barradas. Escaparam "noites" (fora do domínio do sono) e as duas anáforas;
  - para a anáfora, entrou a regra "conector de causa junto de qualquer dado de saúde", só nesses turnos;
  - sonda 4: **7 de 8** frases de causa barradas e **1 de 8** honestas barradas ("não há exame de março" faltava na lista de falta de dado; "isso ajudou o exame" escapou). As duas lacunas foram corrigidas e entraram no teste permanente.
- **Limite que fica:**
  - fora dos turnos que cruzam domínios, só o léxico atua;
  - dentro deles, ainda escapa a paráfrase de um domínio só, sem nenhum conector conhecido;
  - frase honesta que junta assuntos de outro jeito é reescrita: custa uma geração, mas não perde a resposta.
