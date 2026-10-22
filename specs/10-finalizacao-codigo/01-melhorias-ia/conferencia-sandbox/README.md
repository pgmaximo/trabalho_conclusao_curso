# Conferência no sandbox — E1 a E12

Estado em **2026-10-22**. Esta pasta reúne a conferência da Parte 1 no sandbox da AWS (`amplify-tcc-pedro-sandbox-12a5bc5141`): o que foi testado, o que foi achado, o que já foi corrigido, o que está pendente e como repetir. As decisões de cada correção (DS1 a DS9, com opções e medições) estão em [`../decisoes/conferencia-no-sandbox.md`](../decisoes/conferencia-no-sandbox.md).

```
conferencia-sandbox/
├── README.md     ← este arquivo
└── roteiro/      ← os scripts que semeiam o sandbox e fazem as perguntas dos roteiros
```

## Como foi conferido

- **Suíte local:** `npm run validate` passou na primeira rodada (231 suítes, 3998 testes) e a cada correção até a DS5 (último: 4075 testes). A partir de 2026-10-21, a pedido do usuário, o `validate` completo **não é rodado**: a verificação é `npx jest` dos arquivos tocados e `npm run typecheck:backend` quando muda o backend.
- **Sandbox:** deploy com `npx ampx sandbox --once --outputs-out-dir <pasta de dados>`, sem tocar no `amplify_outputs.json` do projeto (que aponta para a main).
- **Contas de teste** no pool do sandbox: `sdd-teste-a@example.test` (E1 a E8, E10 a E12) e `sdd-teste-b@example.test` (E9). As senhas ficam no `test-users.json` da pasta de dados, **fora do git**.
- **Dados semeados** (`roteiro/seed.mjs`): perfil, 4 remédios (Losartana a cada 8 h, Metformina com estoque baixo, Omeprazol seg/qua/sex com anotação, Vitamina D sem unidade), doses marcadas, consultas (inclusive com "Dra. Ana"), vacinas (gripe com lote, Hepatite B 2/3, dT), exame de sangue com colesterol, receitas lidas, exame em leitura e laudo descritivo; na conta B, Marevan e Losartana em uso e Metformina encerrada. Importação do relógio pela pipeline real com 74 dias sintéticos (`gen-wearable.mjs` + `wearable.mjs`) e cache de postos de Campinas e Belém (`sites.mjs`).
- **Perguntas:** as dos roteiros de cada `tasks.md` (E1 a E12), feitas pelo **mesmo handler do Lambda rodando local** (`roteiro/run.sh`), contra as tabelas, o S3 e o Bedrock do sandbox, com o rastro das ferramentas chamadas, do tamanho das saídas e do trace do guardrail. A rede desta máquina bloqueia `bedrock-runtime`; o roteiro usa o endpoint FIPS (`AWS_USE_FIPS_ENDPOINT=true`). As leituras sensíveis a IAM foram conferidas no Lambda implantado e com `aws iam simulate-principal-policy`.

## Achados

| # | Achado | Estado | Onde |
|---|---|---|---|
| A1 | Guardrail barrava pergunta e resposta legítimas sobre o próprio remédio | ✅ corrigido | DS1 (commit `6a32fe4`) |
| A2 | Filtro de nome do guardrail ("Dra. Ana", "Losartana") virava bloqueio | ✅ corrigido | DS2 (`6a32fe4`) |
| — | A versão do guardrail não acompanhava a configuração (CfnGuardrailVersion) | ✅ corrigido no chat (`6a32fe4`); ✅ corrigido no wearable e na extração | DS1 |
| A4 | Resposta sem conteúdo ("string", "...", abertura terminada em ":") aprovada | ✅ corrigido | DS3 (`6a32fe4`) |
| A5 | Cartão de ação nunca aparecia (saída estruturada em ordem alfabética) e o texto prometia o formulário | ✅ corrigido | DS4 (`6a32fe4`) |
| A9 | R3 reprovando texto legítimo (cinco famílias + ampliação) | ✅ corrigido | DS5 (`6a32fe4`) |
| A3 | Chave USPSTF recusada virava "recomendação nota A" na tela e no chat | ✅ corrigido | DS6 |
| A6 | Cota do Bedrock (10 chamadas/min) estourando com 2 pessoas | ✅ aviso honesto; a cota **fica em 10/min**, limite conhecido (o aumento não foi liberado) | DS7 |
| A7 | Interação não conferida quando o modelo esquece um nome citado | ✅ corrigido | DS8 |
| A8 | Laço repetindo a mesma consulta e degradada repetida; R3 em "não tenho como dizer que", "você tem 54 anos" | ✅ corrigido | DS9 |
| A10 | Mais dois falsos positivos da R3: "você **tem em uso**: Marevan 5mg" sem âncora de registro (E9 H11); a conjunção "**e** baixo risco" lida como "é baixo" (E7 #1) | ✅ corrigido | DS10 |
| A11 | Três respostas certas ainda reprovadas (rodada completa de 2026-10-22): "o **estoque está baixo**" lido como interpretação de resultado e "Vitamina D 1 gota — todos os dias" sem âncora de registro (E2 #7, R3); resposta sobre dados do relógio fora do período reprovada por falta de encaminhamento (E6 #2, R2); "Preparei o formulário com o que você disse:" (R5) e, na 2ª geração, "coloque o horário das 8h" (R3), com o cartão perdido junto (E11 #2) | ✅ E2 #7 e E11 #2 aprovados no sandbox (DS13, commit `6803866`); ✅ E6 #2 aprovado no sandbox (commit `eb00624`), mas por "ainda não está disponível", que a DS13.2 já reconhece: a costura da C1 não foi exercitada no sandbox, só nos testes | DS13, DS14 |
| A12 | Achados da remedição de E6, E7 e E9 (2026-10-22, depois da DS14): (1) R3 em "no seu perfil consta que você **tem 54 anos e sexo feminino**" (E7 #2): a exceção da idade (DS9) cai com "e" depois, de propósito, por "você tem 54 anos e diabetes"; (2) o encaminhamento é costurado em toda resposta clínica sem um, inclusive na que só diz que o dado não existe (E6 #2 saiu com "Para avaliar o que isso significa para você, procure um profissional de saúde."); (3) latências de 25 a 148 s e TIMEOUT no roteiro local (E7 #4, 150 s): o CloudWatch mostra que a lentidão é do Bedrock (`InvocationLatency` de 3 s para até 80 s de média), não da rede local | ✅ DS15.1 confirmada no sandbox (E7 #2 aprovado, commit `02345fd`); ✅ DS15.3 funcionando (5 chamadas cortadas aos 40 s, 4 com o aviso de sobrecarga); ✅ DS15.2 confirmada no sandbox (E6 #2 aprovado sem o encaminhamento costurado, 11:37) | DS15 |
| A13 | Achados da remedição de E6 e E7 com o código da DS15 (2026-10-22, 11:37–11:48): (1) R3 em "Você tem **60 recomendações** adaptadas…" (E7 #2): "recomendações" não está no inventário do "você tem"; (2) o guardrail do chat bloqueou a saída do E7 #5 ("o que o app mostra na parte de prevenção?") pelo filtro de conteúdo **SEXUAL** (confiança MÉDIA): a lista da USPSTF traz rastreamento de clamídia, gonorreia, sífilis e HIV em "mulheres sexualmente ativas", o mesmo tipo de falso positivo que a D20 viu na sorologia da extração; (3) a lentidão segue o **formato da chamada do chat**, e não o momento: no CloudWatch, as chamadas mínimas das 11:33 levaram 1,8 s de média, e as do chat das 11:38 às 11:43 levaram 16,6 e 20,4 s (máximo 81 s) | ✅ corrigido no código (DS16.1 contagem de recomendações; DS16.2 SEXUAL só na entrada; DS16.3 cache de prompt, e o experimento mostrou que o formato da chamada não explica o episódio lento); falta deploy e medição | DS16 |
| — | Chat no Claude Opus 4.6 (pedido do usuário, 2026-10-22): rodada completa com 64 de 70 aprovadas (Sonnet 4.6: 67), latência mediana de 10,8 s (Sonnet: 9,2 s), 3 ThrottlingException por causa da cota de 5 req/min do Opus 4.6 (Sonnet: 10) | ❌ recusado; o chat voltou ao Sonnet 4.6 | DS17 |

## Última medição por épico

Rodada completa de **2026-10-22** (commit `addebdb`, os três modelos no **Sonnet 4.6**: a conta não tem acesso ao Opus 5.5 nem ao Sonnet 5.5, ver DS12). Os 70 casos de E1 a E12 rodaram em sequência, com 10 s de pausa entre perguntas e nenhum estouro de cota. Resultado: **67 aprovadas** (4 delas na 2ª geração), 1 degradada e 2 indisponíveis. Depois da DS13, E2, E6 e E11 foram medidos de novo: **18 de 19**, com só o E6 #2 de fora. Nessa remedição as latências subiram (de 5 a 102 s, contra 4 a 31 s na rodada completa), sem mudança de modelo nem de laço; a causa provável é a rede local e o endpoint FIPS, ainda não confirmada.

| Épico | Resultado | Observação |
|---|---|---|
| E1 | 6/6 | E1 #2 aprovado (DS5) |
| E2 | 9/9 (2 na 2ª geração) | #7 aprovado depois da DS13 (2026-10-22) |
| E3 | 6/6 | |
| E4 | 5/5 | |
| E5 | 6/6 (2 na 2ª geração) | |
| E6 | 5/5 depois da DS14; 4/5 depois da DS15 (2ª medição, 11:37) | #2 aprovado sem o encaminhamento costurado (DS15.2); #4 cortado pelo limite de 40 s; dados do relógio sintéticos |
| E7 | 6/6 na rodada completa; 2/6 depois da DS15 (2ª medição, 11:37) | #1 e #4 cortados pelo limite de 40 s; #2 degradado (A13, "você tem 60 recomendações"); #5 barrado pelo filtro SEXUAL do guardrail (A13); #3 e #cache aprovados |
| E8 | 7/7 | #4 "bairro centro" aprovado |
| E9 | 9/9 | H11 aprovado (DS10); 9/9 de novo depois da DS14 |
| E10 | 3/3 | |
| E11 | 5/5 (1 na 2ª geração) | #2 aprovado com o cartão `Vitamina D · 08:00` (a Lambda já converte "8h"); "Nada foi salvo" sai uma vez só; "sexta de manhã" chega como `quando: "sexta"` |
| E12 | 3/3 | |

## Pendências

Estado em 2026-10-22, depois da rodada completa no Sonnet 4.6.

1. **A13:** deploy da DS16 e remedição de E7 (#2 e #5), conferindo no rastro o `cacheReadInputTokens` a partir da segunda ida ao modelo.
2. **Perfil `global.` (DS15.3):** medido com chamadas mínimas em 2026-10-22: 1,31 s contra 1,84 s do `us.` (média do Bedrock), mais estável, mas fora de um episódio lento e sem o formato da chamada do chat. Falta medir a chamada real nos dois perfis durante um episódio lento (exige trocar o perfil num sandbox) e decidir sobre a inferência fora dos EUA.
3. **Acesso aos modelos novos (do usuário):** pedir a liberação do Opus 5.5 e do Sonnet 5.5 no Bedrock. Quando sair, basta trocar `CHAT_BASE_MODEL_ID` e `BEDROCK_BASE_MODEL_ID` no `backend.ts` (DS12), fazer o deploy e medir de novo, com a latência do chat.
4. **Conferir o wearable e a extração reais** depois da DS12: o wearable trocou a tool forçada pela saída estruturada, e nenhuma importação real passou por ele ainda.
5. **Conferências que só o aparelho faz:**
   - tocar em "Abrir formulário" (E11);
   - GPS na tela de Vacinação (E8);
   - marcar dose pela tela (E3).
6. **E6 com dados reais do relógio:** até aqui, só dados sintéticos.

A cota do Bedrock fica em 10 chamadas por minuto, como limite conhecido (A6). O `npm run validate` completo não está sendo rodado por enquanto, por decisão do usuário, para agilizar; a verificação é por arquivos tocados e `typecheck:backend`.

## Como repetir

Pré-requisitos: Node 20 (`nvm use 20.20.1`), credenciais da AWS (`CLIAmplify`) e o segredo `USPSTF_API_KEY` no sandbox. A **pasta de dados** (fora do git) guarda `outputs/amplify_outputs.json` (do deploy) e `test-users.json` (`{"A":{"email","password"},"B":{...}}`).

```bash
# 1. deploy do sandbox, com as saídas na pasta de dados
npx ampx sandbox --once --outputs-out-dir <pasta-de-dados>/outputs

# 2. semear (contas criadas antes com admin-create-user + admin-set-user-password)
PASTA_DE_DADOS=<pasta-de-dados> node specs/10-finalizacao-codigo/01-melhorias-ia/conferencia-sandbox/roteiro/seed.mjs

# 3. perguntas de alguns épicos (só os afetados), uma por vez
PAUSA_MS=3000 bash specs/10-finalizacao-codigo/01-melhorias-ia/conferencia-sandbox/roteiro/run.sh <pasta-de-dados> E7,E9
```

Os resultados vão para `<pasta-de-dados>/resultados-local.json` (resposta, status da verificação, ferramentas chamadas, tamanho das saídas e logs). `r3.mts` refaz a verificação de linguagem sobre os textos reprovados e mostra o trecho e o motivo; `e12-historico.cts` testa o histórico longo pelo `chatHistoryService` do app.

**Cuidados aprendidos:** rodar deploy e medição em sequência só se o deploy passar (no Windows, o build pode falhar com `EPERM` numa pasta `bundling-temp-*` presa; apagar a pasta e repetir); não rodar duas medições ao mesmo tempo (a cota de 10/min estoura); o roteiro tem teto de 150 s por pergunta, porque a rede local já segurou uma chamada por mais de 30 min.
