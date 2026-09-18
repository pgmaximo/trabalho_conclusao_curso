# TASKS: Regras de linguagem da IA (Bloco 7)

Passo a passo com código e teste: `docs/superpowers/plans/2026-09-16-regras-de-linguagem.md`. Esta lista é o acompanhamento.

## Estado

Marcado em 2026-09-17, contra o codigo no branch `sistema_ia`. As caixas
fechadas de L1 a L6 estao em `878c850`.

**O que continua aberto e de quem:** a L7 e do usuario; a conferencia dos
criterios de aceite um a um nao foi feita; e a tarefa 0.3 do roadmap so pode
ser marcada como concluida depois da L7.

## Dependência

- [x] Nenhuma. Esta EPIC é módulo puro e pode ser a primeira coisa construída de toda a Fase 2 — e deve ser, porque bloqueia a EPIC da conversa.

## O verificador

- [x] L1 — `checkLanguageRules(texto, { questionKind, temOrigem })` devolve `{ ok: true }` ou a lista de violações, cada uma com regra, motivo em pt-BR e o trecho. O `temOrigem` entrou em 2026-09-18 com o verificador de R4; ausente significa "sem origem".
- [x] L1 — O verificador **nunca altera** o texto recebido — coberto por teste.
- [x] L1 — Nunca lança: texto vazio, nulo ou gigante devolve resultado tipado.
- [x] L2 — R1: o termo vetado é reprovado em todas as flexões e derivações, por raiz e não por igualdade.
- [x] L2 — R1 não reprova palavra que apenas contém a raiz por acaso (falso positivo conhecido, com teste que fixa o limite).
- [x] L3 — R3: posologia reprovada — "tome 500 mg", "2 comprimidos ao dia", "de 8 em 8 horas", "suspenda o remédio", "aumente a dose".
- [x] L3 — R3: diagnóstico fechado reprovado, **inclusive o que descarta gravidade** ("não é nada grave").
- [x] L3 — R3: sugestão pequena de baixo risco **aprovada** — prova que a verificação não barra tudo.
- [x] L4 — R2: pergunta clínica sem encaminhamento reprovada; pergunta operacional sem encaminhamento aprovada.
- [x] L4 — O tipo da pergunta é parâmetro de quem chama, nunca inferido pelo verificador.

## A fonte única do texto das regras

- [x] L5 — `LANGUAGE_RULES_PROMPT`: as regras em texto, exportadas, para entrar no prompt de sistema.
- [x] L5 — Teste que prova que o bloco do prompt cita as cinco regras — o prompt e a verificação não podem divergir em silêncio.

## O conjunto adversarial

- [x] L6 — No mínimo uma tentativa por regra, escrita para arrancar a violação, rodando em `npm run validate` **sem chamar o modelo**. Estava marcado sem ser verdade: cobria R1, R2 e R3. Fechado em 2026-09-18 com as tentativas de R4 e de R5, mais uma asserção que exige o conjunto {R1..R5} e impede a lacuna de voltar em silêncio.
- [x] L6 — Casos de fronteira documentados: o que a verificação reprova e não deveria, e o que ela deixa passar e deveria pegar.

## Conferência contra a realidade

- [ ] L7 — Rodar o verificador contra respostas **reais** do modelo, de no mínimo vinte perguntas, e contar: quantas foram reprovadas com razão, quantas sem razão, e quantas passaram e não deveriam.
- [ ] L7 — Cada padrão novo descoberto vira caso de teste **antes** de virar linha de regra.
- [ ] L7 — Registrar as medições em `estudos-ia/04-implementacao/notas.md`.

## Encerramento

- [x] O módulo não importa nada.
- [x] Nenhuma dependência nova foi acrescentada.
- [x] Critérios de aceite da `spec.md` conferidos um a um, em 2026-09-18: **7
      com teste, 4 sem teste, 1 parcial, 1 não verificável**. O parcial era o
      conjunto adversarial, sem tentativa de R4 nem de R5. Dos sem teste, o que
      mais incomoda é que "o módulo não importa nada" é verdade e **não tem
      trava** — a EPIC da memória escreveu essa trava para o módulo dela
      (`memoriaRegras.test.ts`), e esta não tem.
- [x] **O parcial foi fechado em 2026-09-18**, no mesmo dia: verificador de R4
      registrado em `VERIFICADORES`, tentativas de R4 e de R5 no conjunto
      adversarial, e a asserção de uma tentativa por regra. O módulo continua sem
      importar nada. `npm run validate`: **94 suítes, 1057 testes**.
- [ ] A trava de "não importa nada" continua faltando, e o verificador de R4 não
      a torna menos necessária: ele é o quarto verificador a depender dela.
- [ ] A tarefa 0.3 do roadmap é marcada como concluída.
- [x] `npm run validate` passa.
