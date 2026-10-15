# estudos-ia — casa única dos estudos de Inteligência Artificial do SuaSaúde

Pasta única para tudo que diz respeito às duas frentes de IA do TCC: estudos,
desenhos, esquemas de dados e notas de implementação. Nada de IA é estudado
fora daqui.

## Por que uma pasta separada de `specs/`

`specs/` guarda **o que já foi decidido e vai ser construído**, no formato da
constituição do projeto (`spec.md` + `plan.md` + `tasks.md` por tela). Esta
pasta guarda **o pensamento que acontece antes disso**: estudo comparativo,
contrato negociado com terceiro, esquema de dado em discussão, medição.

Fluxo: estudo aqui → decisão registrada em `00-visao/decisoes.md` → spec
formal em `specs/` → código.

## Hierarquia

```
estudos-ia/
├── README.md                     ← este arquivo
├── 00-visao/                     visão geral e direção
│   ├── o-que-sera-construido.md  ← COMECE AQUI: o projeto inteiro numa leitura
│   ├── roadmap.md                fases, tarefas, prioridade e justificativa
│   ├── arquitetura-geral.md      as três IAs e como se ligam ao app de hoje
│   └── decisoes.md               log de decisões tomadas (e as derrubadas)
├── 01-estudos/                   investigação antes de decidir
│   ├── provedor-llm.md           avaliação encerrada: Bedrock, e o porquê das recusas
│   ├── regras-de-linguagem.md    o que a IA pode e não pode dizer
│   └── resposta-reprovada.md     o que fazer quando a verificação barra (D31)
├── 02-designs/                   fluxos e desenhos
│   └── fluxos-de-dados.md        quem escreve, quem lê, em que ordem
├── 03-esquemas/                  contratos de dado (o que não pode divergir)
│   ├── contrato-wearable-healthimport.md   o que o Arturo entregou
│   ├── cobertura-analitos.md     quais exames a normalização cobre
│   ├── conversao-unidades.md     massas molares e os casos que fogem à regra
│   └── formato-analitos.md       o estilo uniforme de extração
├── 04-implementacao/             notas de quem está construindo
│   └── notas.md                  achados, armadilhas, medições
└── 05-vocabularios/              LOINC e UCUM dentro do repositório
    ├── licencas.md               o que cada licença permite (tarefa 0.2a)
    ├── pendencias.md             os 5 analitos que pedem decisão humana
    ├── loinc/                    extrato de 79 analitos + script + licença
    └── ucum/                     a obra inteira, sem alteração, + licença
```

## Estado

| Frente | Dono | Estado |
|---|---|---|
| Wearable → `HealthImport` no DynamoDB | Arturo | **entregue**, mergeada em `dev` em 2026-09-15 |
| Frente 1 — IA de leitura de documentos | Pedro | **spec pronta**, nada implementado |
| Frente 2 — IA de comunicação com o usuário | Pedro | **spec pronta**, nada implementado |

**Desde 2026-09-16 as duas frentes têm spec completa.** Toda tarefa do roadmap
que produz software virou EPIC rastreável em `specs/`, no formato que a regra 6
da constituição exige. O que fazer com isso está em
`00-visao/o-que-sera-construido.md`; o passo a passo com código, em
`docs/superpowers/plans/2026-09-16-*.md`.

| EPIC | Onde | Tarefas |
|---|---|---|
| Extração de documentos | `specs/06-ia-leitura-exames/extracao-de-documentos/` | 16 |
| Série por analito | `specs/06-ia-leitura-exames/serie-por-analito/` | 8 |
| Regras de linguagem | `specs/07-ia-conversa/regras-de-linguagem/` | 7 |
| Assistente conversacional | `specs/07-ia-conversa/assistente-conversacional/` | 11 |

## Regra de segurança que atravessa tudo

Nenhum documento, prompt ou resposta produzida por estas IAs pode apresentar
conclusão médica fechada. Toda saída ao usuário encaminha a um profissional de
saúde. Detalhamento em `01-estudos/regras-de-linguagem.md`.
