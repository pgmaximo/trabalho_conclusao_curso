# TASKS: Regras de linguagem da IA (Bloco 7)

Passo a passo com código e teste: `docs/superpowers/plans/2026-09-16-regras-de-linguagem.md`. Esta lista é o acompanhamento.

## Dependência

- [ ] Nenhuma. Esta EPIC é módulo puro e pode ser a primeira coisa construída de toda a Fase 2 — e deve ser, porque bloqueia a EPIC da conversa.

## O verificador

- [ ] L1 — `checkLanguageRules(texto, { questionKind })` devolve `{ ok: true }` ou a lista de violações, cada uma com regra, motivo em pt-BR e o trecho.
- [ ] L1 — O verificador **nunca altera** o texto recebido — coberto por teste.
- [ ] L1 — Nunca lança: texto vazio, nulo ou gigante devolve resultado tipado.
- [ ] L2 — R1: o termo vetado é reprovado em todas as flexões e derivações, por raiz e não por igualdade.
- [ ] L2 — R1 não reprova palavra que apenas contém a raiz por acaso (falso positivo conhecido, com teste que fixa o limite).
- [ ] L3 — R3: posologia reprovada — "tome 500 mg", "2 comprimidos ao dia", "de 8 em 8 horas", "suspenda o remédio", "aumente a dose".
- [ ] L3 — R3: diagnóstico fechado reprovado, **inclusive o que descarta gravidade** ("não é nada grave").
- [ ] L3 — R3: sugestão pequena de baixo risco **aprovada** — prova que a verificação não barra tudo.
- [ ] L4 — R2: pergunta clínica sem encaminhamento reprovada; pergunta operacional sem encaminhamento aprovada.
- [ ] L4 — O tipo da pergunta é parâmetro de quem chama, nunca inferido pelo verificador.

## A fonte única do texto das regras

- [ ] L5 — `LANGUAGE_RULES_PROMPT`: as regras em texto, exportadas, para entrar no prompt de sistema.
- [ ] L5 — Teste que prova que o bloco do prompt cita as cinco regras — o prompt e a verificação não podem divergir em silêncio.

## O conjunto adversarial

- [ ] L6 — No mínimo uma tentativa por regra, escrita para arrancar a violação, rodando em `npm run validate` **sem chamar o modelo**.
- [ ] L6 — Casos de fronteira documentados: o que a verificação reprova e não deveria, e o que ela deixa passar e deveria pegar.

## Conferência contra a realidade

- [ ] L7 — Rodar o verificador contra respostas **reais** do modelo, de no mínimo vinte perguntas, e contar: quantas foram reprovadas com razão, quantas sem razão, e quantas passaram e não deveriam.
- [ ] L7 — Cada padrão novo descoberto vira caso de teste **antes** de virar linha de regra.
- [ ] L7 — Registrar as medições em `estudos-ia/04-implementacao/notas.md`.

## Encerramento

- [ ] O módulo não importa nada.
- [ ] Nenhuma dependência nova foi acrescentada.
- [ ] Critérios de aceite da `spec.md` conferidos um a um.
- [ ] A tarefa 0.3 do roadmap é marcada como concluída.
- [ ] `npm run validate` passa.
