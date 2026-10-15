# Arquitetura geral — três IAs, um app

## As três peças e seus donos

| Peça | Dono | Entrada | Saída | Estado |
|---|---|---|---|---|
| IA de wearable | Arturo | export de app de saúde (CSV/JSON/ZIP) | `HealthImport` no DynamoDB | **entregue e mergeada em `dev`** |
| IA da tela de exames (Frente 1) | Pedro | PDF/imagem anexado na tela de exames | linhas normalizadas no DynamoDB | estudo |
| IA de comunicação (Frente 2) | Pedro | pergunta do usuário | resposta em texto | estudo |

A Frente 2 não produz dado novo de saúde: ela **lê** o que as outras duas
gravaram, mais o que o usuário já preencheu no app. Essa separação é
deliberada — uma IA que conversa e ao mesmo tempo grava dado clínico é uma
superfície de erro difícil de auditar.

## O que o app já tem hoje (e que a Frente 2 lê sem depender de ninguém)

Levantado no repositório em setembro de 2026:

| Fonte | Onde | Conteúdo |
|---|---|---|
| `UserProfile` | DynamoDB | nome, nascimento, sexo, peso, altura, tabagismo, atividade física, álcool, gestação, condições crônicas, medicações, alergias |
| `MedicalDocument` | DynamoDB | metadados de exame e receita: tipo, nome, data, validade, chave no S3 |
| arquivos de exame | S3 `medical-documents/{entity_id}/*` | o PDF ou imagem em si — hoje ninguém lê o conteúdo |
| `Appointment` | DynamoDB | consultas |
| `Medicine` | DynamoDB | remédios e lembretes |
| vacinação | DynamoDB | carteira e campanhas |
| `HealthImport` | DynamoDB | **wearable, já analisado**: resumo estatístico de até 29 métricas, correlações, e a análise gerada por modelo |
| série diária do wearable | S3, chave em `resultArtifactKey` | granularidade de dia, se precisarmos |

A linha do wearable deixou de ser lacuna em 2026-09-15. Ela é hoje a fonte mais
rica que a IA de comunicação tem — mais rica que os metadados de exame, que só
dizem que o documento existe.

## Ligação com o código atual

O chat já existe e está inteiramente mockado, com a fronteira isolada de
propósito:

- `src/app/(app)/ai.tsx` → `src/screens/ChatBotScreen.tsx`
- `src/hooks/useChatBot.ts` — estado da conversa, sem persistência
- `src/services/aiAssistantService.ts` — devolve uma de quatro frases fixas

O arquivo de serviço se autodocumenta como mock e diz que a troca por IA real
exigiria confirmação explícita, por causa da decisão de privacidade. Essa
confirmação foi dada. A troca é por substituição desse serviço; a tela e o
hook não mudam de contrato.

A spec da tela (`specs/04-ia-perfil-vacinacao/assistente-ia/spec.md`) deixou
duas pendências registradas que este trabalho resolve: provedor de IA real e
persistência de histórico.

## Onde a inferência roda

Lambda do Amplify Gen 2, no padrão das funções que já existem em
`amplify/functions/` — agora seis, sendo que duas delas (`start-health-analysis`
e `analyze-health-import`) já fazem exatamente o tipo de trabalho que a nossa
função vai fazer, inclusive a invocação do Bedrock e a validação da saída do
modelo por schema. Esse é o precedente a seguir.

A inferência é do Amazon Bedrock, com o SDK nativo, saída forçada por tool e
validação por schema — sem segundo provedor e sem adapter de troca (D14).

Foram avaliados e recusados: o servidor de IA da instituição, o AgentCore da AWS
e os agentes clássicos do Bedrock. Cada recusa tem motivo técnico registrado em
`01-estudos/provedor-llm.md`.

## Fronteira de responsabilidade entre as frentes

```
   Arturo — entregue            Pedro — Frente 1            Pedro — Frente 2
 ┌────────────────────┐      ┌──────────────────┐         ┌────────────────┐
 │ export de app de   │      │ OCR + extração   │         │  chat          │
 │ saúde → S3         │      │ estruturada      │         │                │
 │ analyze-health-    │      │ (mesmo desenho)  │         └───────┬────────┘
 │ import + Bedrock   │      └────────┬─────────┘                 │ tools
 └─────────┬──────────┘               │ LabResult                 │ (só leitura)
           │ HealthImport             ▼                           │
           └────────────────▶┌────────────────┐◀─────────────────┘
                             │    DynamoDB    │
                             └────────────────┘
```

Duas regras que esse desenho impõe:

1. **A Frente 2 só lê.** Ela não grava dado clínico. O que ela grava é a
   própria conversa.
2. **A Frente 1 grava por uma porta só: a tela de exames.** É lá que o usuário
   anexa e classifica como Exame ou Receita, e é de lá que a extração persiste.
   O anexo no chat é outra coisa — uso pontual, sem gravar dado clínico (D15).
   Se um dia houver uma segunda porta que grave, ela entra nesta mesma
   pipeline: duas pipelines produziriam dois estilos de dado, que é
   precisamente o que a comparação mês a mês não tolera.
