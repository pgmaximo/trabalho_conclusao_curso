# 10 — Finalização do código

Esta pasta reúne tudo o que falta para **fechar o código** do SuaSaúde. Ela vem depois das fases 00 a 09 e não reabre nenhuma delas: cada melhoria aqui é aditiva e respeita a constituição (`specs/constitution.md`), principalmente a regra 4 (a IA nunca dá diagnóstico definitivo) e a regra 5 (nada quebra dado existente).

## Estrutura

```
specs/10-finalizacao-codigo/
├── README.md                  ← este arquivo: o que é a fase e como ela está organizada
├── PROMPT-PADRAO.md           ← o prompt que se manda ao agente com @ para executar um épico (SDD completo)
├── 01-melhorias-ia/           ← PARTE 1 (em andamento): dar mais poder ao assistente de IA
│   ├── README.md              ← índice, ordem de entrega, dependências e status de cada épico
│   ├── prd.md                 ← o PRD: 12 épicos, cada um com tarefas, história de usuário e especificação
│   └── decisoes/              ← decisões que o produto precisa tomar, uma por épico
│       ├── README.md          ← índice e status das decisões
│       ├── E7-recomendacoes-prevencao.md
│       ├── E8-campanhas-e-postos.md
│       ├── E2-medicamentos-completos.md
│       ├── E9-interacoes-medicamentosas.md
│       └── E1-contexto-e-mapa-do-app.md
└── 02-ui-usabilidade/         ← PARTE 2 (ainda não iniciada): melhorias de UI e usabilidade
    └── README.md
```

## Partes da fase

| Parte | Tema | Estado |
|---|---|---|
| 01 | Melhorias do assistente de IA (mais acesso aos dados e funções do app) | Em andamento: PRD escrito, decisões sendo tomadas |
| 02 | Melhorias de UI e usabilidade do aplicativo | Só começa **depois** que todos os épicos da Parte 1 terminarem |

## Como iniciar um épico

Em uma conversa nova (`/clear`), mande `@specs/10-finalizacao-codigo/PROMPT-PADRAO.md` (opcionalmente com o épico, ex.: `E7`). O prompt faz o agente atuar como desenvolvedor sênior e conduzir o épico por **decisões → especificação → planejamento → desenvolvimento com TDD → teste → review → fechamento**, parando nos portões de aprovação. Um épico por conversa.

## Como o trabalho flui dentro de cada parte

1. **PRD** (`prd.md`): define os épicos, as tarefas e o que cada uma entrega.
2. **Decisões** (`decisoes/`): antes de implementar um épico que tenha decisão aberta, ela é explicada (o que decidir, por quê, benefícios e malefícios de cada opção) e fechada pelo produto. A decisão tomada fica registrada no próprio arquivo.
3. **Especificação do épico**: ao começar um épico, cria-se a pasta dele dentro da parte (por exemplo `01-melhorias-ia/E7-recomendacoes-prevencao/`) com `spec.md`, `plan.md` e `tasks.md`, seguindo o padrão das fases anteriores. A pasta só nasce quando o épico começa.
4. **Implementação com TDD**: testes primeiro. `npm run validate` é o único gate de conclusão.
5. **Status**: o `README.md` da parte é atualizado quando um épico muda de estado.

## Regras que valem para a fase inteira

- Textos, comentários e testes em pt-BR.
- Nada de dado mockado deixado no app (`docs/DADOS_MOCKADOS.md` registra as exceções).
- Mudança de schema do Amplify Data é decisão explícita, registrada antes de ser feita.
- Nada de credencial, `.env*`, `.aws/` ou `.amplify/` no repositório.
- O assistente continua **reativo**: só responde quando perguntado.
