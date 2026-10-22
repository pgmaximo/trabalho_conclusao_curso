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

## Última medição por épico

| Épico | Resultado | Observação |
|---|---|---|
| E1 | 5/6 aprovadas, 1 degradada (#2, R3) | E1 #2 ainda não remedido depois da DS5 |
| E2 | 9/9 | |
| E3 | 6/6 | IAM ok, 0 AccessDenied |
| E4 | 5/5 + releitura real ok | itens antigos somem ao reler; IAM ok |
| E5 | 6/6 (1 na 2ª geração) | |
| E6 | 4/5 + IAM ok | dados do relógio sintéticos |
| E7 | 4/6 | #1 caiu na reserva (A10); #2 estourou o teto de 150 s do roteiro local |
| E8 | 6/7 | #4 "bairro centro" não remedido |
| E9 | 8/9 | H11 caiu na reserva (A10) |
| E10 | 3/3 | panorama 229 tokens, comparação 151 (metas < 400 e < 600) |
| E11 | 4/5 com cartão em 3 de 3 pedidos com dado | sobra: "Nada foi salvo" duplicado; "sexta de manhã" sem data |
| E12 | 3/3 + histórico longo ok | 131 conversas, 120 mensagens, 0 sobras ao excluir |

## Pendências

Estado em 2026-10-22, depois da leva DS10 a DS12 (commit único com A3, A6, A7, A8, A10, os guardrails e a troca de modelos).

1. **Medir de novo no sandbox**, com os modelos novos (DS12). Vale para todos os épicos, e em especial para os itens que ainda não passaram:
   - E1 #2;
   - E7 #1 e #2;
   - E8 #4;
   - E9 H11;
   - E11: "Nada foi salvo" duplicado e "sexta de manhã" sem data.
2. **Conferir o wearable e a extração reais** no Sonnet 5.5. O wearable trocou a tool forçada pela saída estruturada.
3. **Conferências que só o aparelho faz:**
   - tocar em "Abrir formulário" (E11);
   - GPS na tela de Vacinação (E8);
   - marcar dose pela tela (E3).
4. **E6 com dados reais do relógio:** até aqui, só dados sintéticos.

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
