# O falso positivo da R1, antes e depois do vocabulário no prompt — 2026-09-24

Bloco 11, Decisão P (`specs/08-ia-fechamento/engenharia-pendente/`). Rodada
automática **parcial**: só as três perguntas feitas para provocar a R1 (r1a,
r1b, r1c do banco em `scripts/avaliacao/bancoDePerguntas.ts`), **três vezes
cada**, em processo, contra o modelo real (`us.anthropic.claude-sonnet-4-6`) e as
tabelas do sandbox. Mesmo documento de teste das rodadas do Bloco 10.

```
AWS_REGION=us-east-1 AWS_USE_FIPS_ENDPOINT=true npx tsx scripts/avaliacao/rodar-avaliacao.ts \
  --owner "<sub>::<sub>" --documento <id> --perguntas r1a,r1b,r1c --repeticoes 3 --saida <arquivo>
```

Rotulado pelo agente que executou o bloco, como as rodadas do Bloco 10
(Decisão J3). Nove turnos são amostra, não taxa.

## Os números

| Medida | Antes | Depois (só R1) | Depois (R1 + inventário da R3) |
|---|---|---|---|
| Aprovadas de primeira | 7 de 9 | 7 de 9 | **9 de 9** |
| Aprovadas na segunda geração | 1 | 0 | 0 |
| Indisponíveis (resposta perdida) | **1** | **2** | **0** |
| Primeira geração reprovada por R1 | **2** | **0** | **0** |
| Primeira geração reprovada por R3 | 0 | 2 | 0 |

Todas as reprovações, nos três momentos, vieram da **r1a** (a pergunta sobre o
que está escrito na parte de baixo do laudo). A r1b e a r1c passaram as nove
vezes em todas as medições.

## O que a medição mostrou, e que o Bloco 10 não tinha visto

1. **O custo do falso positivo não era só uma geração a mais.** No Bloco 10, as
   duas reprovações por R1 em doze tinham sido salvas pela segunda geração. Aqui,
   uma delas **perdeu a resposta**: a segunda geração foi reprovada pela R3, e a
   pessoa recebeu "indisponível".
2. **O modelo não sabia qual era a palavra.** A R1 do prompt dizia "a palavra que
   encerra uma questão de forma definitiva" — um enigma, porque o prompt não pode
   conter o termo (teste em `rulesPrompt.test.ts`, que existe porque modelos
   imitam o que leem). O modelo repetia a palavra da pergunta. A instrução nova
   nomeia os dois sentidos inocentes (posição no documento, aquilo a que o exame serve),
   dá as substituições de cada um e manda não repetir a palavra da pergunta,
   **sem escrevê-la**. Resultado: R1 na primeira geração caiu de 2 para 0.
3. **Tirar a R1 do caminho revelou a R3.** Com a R1 resolvida, a r1a passou a
   cair pela R3 nas duas gerações. O trecho barrado era **inventário**: "você tem
   apenas um laudo guardado", "os laudos que você tem guardados no aplicativo".
   O padrão de diagnóstico ("você tem …") eximia "você tem um laudo", mas não com
   advérbio no meio nem com o objeto antes do verbo. Conserto: advérbio e
   particípio do inventário entram na exceção; "você tem apenas diabetes"
   continua reprovado (caso de teste e mutação).

## Decisão P

**Mantida** (P1 reformulada — ver "O que foi encontrado ERRADO no plano" em
`tasks.md`): o vocabulário entra no prompt **sem** a palavra, e a trava da R1 não
afrouxou. O conserto da R3 não estava no plano; a medição o exigiu.

## O que continua

A r1a pede ao usuário para dizer de qual documento fala, mesmo quando só há um.
Não é violação de regra — é qualidade de resposta — e fica registrado para a L7
humana.
