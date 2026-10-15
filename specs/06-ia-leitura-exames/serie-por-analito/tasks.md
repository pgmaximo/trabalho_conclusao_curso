# TASKS: Série por analito (Bloco 6)

Passo a passo com código e teste: `docs/superpowers/plans/2026-09-16-serie-por-analito.md`. Esta lista é o acompanhamento.

## Estado

Marcado em 2026-09-17, contra o codigo no branch `sistema_ia`. As caixas
fechadas tem commit, de `c3d066b` (S1 e S2) a `830e752` (S7).

**O que continua aberto e de quem:** a S8 e do usuario, e a conferencia dos
criterios de aceite um a um nao foi feita.

## Dependência

- [x] A EPIC de extração precisa ter concluído até a **T7** (schema e índices) e a **T10** (gravação), porque esta EPIC lê `LabResult` pelo índice `analyteCode`/`collectedAt`. Não depende das telas da EPIC anterior (T11 a T13).

## Lógica pura (teste antes da implementação, sem React e sem AWS)

- [x] S1 — `buildAnalyteSeries`: agrupa por `(analyteCode, collectionMoment)`, ordena por data de coleta, devolve `points` e `excluded`.
- [x] S1 — Linha `PENDENTE_DE_REVISAO` sai da série **com motivo registrado**, nunca em silêncio.
- [x] S1 — Linha com `value` nulo sai com motivo — nunca plotada como zero (D29).
- [x] S1 — Linha com qualificador (`<0,01`) sai do traço **e continua listada** como limite (D21).
- [x] S1 — Linha com unidade diferente da série sai com motivo; a tela não converte (D29).
- [x] S1 — Glicose em jejum e de 120 minutos produzem **duas séries**, não uma serra (D22).
- [x] S1 — Duas coletas na mesma data desempatam por momento e depois por id — nunca por valor.
- [x] S2 — `sharedReferenceRange`: devolve a faixa quando **todos** os pontos concordam, e nulo quando qualquer um diverge.
- [x] S2 — Faixa parcial (só limite inferior) conta como faixa e é comparada como tal.

## Consulta

- [x] S3 — `listLabResultsByAnalyte` pelo índice `analyteCode`/`collectedAt`, com paginação como defesa.
- [x] S3 — `listAnalytesWithResults`: os analitos que têm ao menos uma linha, com contagem de coletas, para o seletor.
- [x] S3 — Cache e invalidação no mesmo padrão de `useExamsData`; a série invalida quando uma extração conclui ou uma linha é corrigida.

## Tela

- [x] S4 — `AnalyteSeriesScreen` com os quatro estados: sem nenhum exame, sem linha confirmada, uma coleta só, e série com dois ou mais pontos.
- [x] S4 — Seletor de analito; abre já escolhido quando vem da tela de detalhe.
- [x] S4 — Seletor de momento **só quando há mais de um** `collectionMoment`.
- [x] S5 — Gráfico com um traço, cor primária, **todos os pontos rotulados com a data** (mitigação do eixo por índice).
- [x] S5 — Linha de referência tudo-ou-nada: desenhada só quando todos os pontos concordam.
- [x] S5 — Buraco quebra o traço; nenhum ponto interpolado — teste sobre `buildLinePath`.
- [x] S6 — Lista das coletas com data, momento, valor, faixa daquele laboratório, o que estava no papel e atalho para o documento.
- [x] S6 — Aviso do que ficou de fora, com contagem, motivo e atalho para o documento da linha pendente.
- [x] S6 — Encaminhamento a um profissional de saúde, sempre visível.

## Verificações que são a razão de existir desta EPIC

- [x] S7 — Teste que prova que nenhuma copy classifica o valor, diz melhorou/piorou, calcula tendência ou nomeia condição.
- [x] S7 — Teste que prova que nenhuma copy usa o termo vetado nem suas derivações.
- [x] S7 — Teste que prova que nenhuma cor da tela comunica julgamento sobre o valor.
- [ ] S8 — Conferência contra o caso que motivou o projeto: subir o exame de março e o de setembro e ver a vitamina D dos dois lado a lado, mesma unidade, faixa de cada laboratório, documento de origem de cada número.

## Encerramento

- [x] Nenhuma dependência nova foi acrescentada.
- [x] `chartScale.ts` não foi modificado.
- [x] Critérios de aceite da `spec.md` conferidos um a um, em 2026-09-18: **14
      com teste, 1 sem teste, 0 não cumpridos, 1 não verificável**. Uma
      divergência real entre spec e tela: a spec promete que o valor censurado
      apareça "com o sinal preservado", e a tela lista a coleta excluída com
      data, motivo e atalho, **sem o valor**. Tarefa própria.
- [x] `npm run validate` passa.
