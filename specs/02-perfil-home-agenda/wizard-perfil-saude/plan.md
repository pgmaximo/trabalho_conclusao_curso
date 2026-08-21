# PLAN: Perfil de Saúde — Wizard 4 Etapas

## 1. Diagnóstico — o que já existe vs. o que falta

`OnboardingScreen.tsx` **já é** um wizard de 4 etapas com barra de progresso, navegação Voltar/Continuar e uma etapa de revisão — estruturalmente muito mais próximo do Canvas 2a do que uma tela feita do zero. O gap real está em copy (textos exatos exigidos pela regra 1 e, principalmente, pela regra 4 — LGPD), estrutura de alguns blocos e, mais grave, em dados coletados na UI que nunca chegam ao banco. Diff etapa a etapa:

### Etapa 1 — Dados pessoais
| Elemento do Canvas 2a | Existe hoje? | Divergência |
|---|---|---|
| "Nome completo", "Data de nascimento" | Sim | Fiel. |
| Sexo biológico — 3 chips na mesma linha (Masculino/Feminino/Outro) | Parcial | Hoje são 2 `SexCard` (ícone grande, Feminino primeiro depois Masculino) + 1 `preferNotCard` separado abaixo rotulado "Desejo não informar". O Canvas mostra 3 chips **iguais**, mesma linha, ordem Masculino→Feminino→Outro, sem um card visualmente distinto para a 3ª opção. **Gap real de estrutura e copy** ("Outro" vs. "Desejo não informar"). |
| Pergunta condicional de gravidez | Sim | `values.biologicalSex === 'female'` controla a exibição — equivalente ao `showPregnant` do Canvas. Fiel. |
| "Altura (cm)" / "Peso (kg)", placeholders "165"/"68" | Parcial | Peso está fiel (kg, inteiro). Altura hoje pede metros decimais ("Ex.: 1,65", unit "m", helper "Use vírgula decimal") em vez de centímetros inteiros como o Canvas — só funciona porque `parseHeightCm()` detecta valores `<= 3` e multiplica por 100 antes de salvar. **Gap de copy/UX**, não de dado final (o `heightCm` salvo bate com o schema). |

### Etapa 2 — Histórico clínico
| Elemento do Canvas 2a | Existe hoje? | Divergência |
|---|---|---|
| Banner LGPD específico (texto sobre sigilo clínico) **antes** do card | **Não** | `ClinicalStep` usa `PrivacyNotice` (texto genérico `PROFILE_SETUP_NOTICE_TEXT`) posicionado **depois** dos 3 campos, não antes. O texto também não é o do Canvas (ver §2 abaixo — violação de regra 4). |
| 3 textareas: condições crônicas, medicamentos, alergias | Sim (UI) | Campos existem no formulário e no `profileSetupSchema` (zod), renderizam corretamente. |
| Persistência dos 3 campos no `UserProfile` | **Não** | `buildAmplifyUserProfileInput()` (`profileSetupPayload.ts`) não inclui `chronicConditions`/`medications`/`allergies` no objeto retornado, e `AmplifyUserProfileInput`/`UserProfile` (schema) não têm essas colunas. **O usuário preenche, mas o dado nunca é salvo** — nem erro nem aviso disso hoje. |

### Etapa 3 — Hábitos
| Elemento do Canvas 2a | Existe hoje? | Divergência |
|---|---|---|
| Banner LGPD específico (texto sobre respostas opcionais) **antes** do card | **Não** | `HabitsStep` também usa `PrivacyNotice` genérico, posicionado depois dos 4 blocos de pergunta. Mesmo texto do banner da Etapa 2 hoje (deveria ser diferente). |
| 4 perguntas na forma interrogativa exata, ordem: fumar → sexualmente ativo → atividade física → álcool | Parcial | Ordem bate. Rótulos hoje são nominais curtos ("Tabagismo", "Atividade sexual", "Pratica atividade física?" — este já está correto —, "Consumo de álcool") em vez da forma interrogativa completa do Canvas ("Você fuma?", "Você é sexualmente ativo(a)?", "Consome bebida alcoólica?"). |
| 3 chips por pergunta (Sim/Não/Prefiro não informar) | Sim | `AnswerCards`/`ANSWER_OPTIONS` já implementam exatamente essas 3 opções. Fiel. |

### Etapa 4 — Revisão
| Elemento do Canvas 2a | Existe hoje? | Divergência |
|---|---|---|
| 3 linhas agrupadas por seção (Pessoais/Clínico/Hábitos) com resumo + link "Editar" que pula para a etapa (`gotoStep1/2/3`) | **Não** | `ProfileSetupReview` renderiza uma **lista plana** de 6 pares label/valor (`Data de nascimento`, `Sexo biologico`, `Gravidez atual`, `Tabagismo`, `Atividade sexual`, `Atividade fisica`) — sem agrupamento por seção, sem link de edição, e **faltam 7 campos**: nome completo, altura, peso, consumo de álcool, condições crônicas, medicamentos, alergias. Isso é o maior gap estrutural do EPIC. |
| Banner verde de confirmação "Isso nos ajuda a te dar alertas de prevenção mais precisos." | **Não** | Etapa de revisão hoje reusa o mesmo `PrivacyNotice` genérico (banner âmbar/laranja de aviso, não o banner verde de confirmação do Canvas), e com o texto errado (mesmo problema de regra 4). |
| Rótulo dinâmico do botão principal muda para "Concluir"/"Concluir perfil" só na última etapa | Sim | `Footer` já faz isso (`isLastStep ? 'Concluir perfil' : 'Continuar'`). Fiel. |

### Estrutura geral (cabeçalho, progresso, navegação)
Cabeçalho com "Etapa N de 4" + barra de progresso de 4 segmentos, navegação Voltar/Continuar preservando estado entre etapas — tudo já implementado e fiel ao Canvas (`Header`, `StepNavigation` fazem esse papel, embora `StepNavigation` adicione uma navegação por abas clicáveis não desenhada explicitamente no Canvas — ver §4 riscos).

### Resumo do gap real
1. **LGPD (regra 4, bloqueante):** um único texto de aviso genérico e sem menção a LGPD é usado nas Etapas 2, 3 e na revisão, no lugar de 2 textos distintos e explicitamente ligados à LGPD exigidos pelo Canvas.
2. **Persistência incompleta (regra 2, bloqueante):** 3 campos de texto clínico são coletados e validados na UI mas nunca chegam ao `UserProfile` — perdidos silenciosamente a cada onboarding.
3. **Sexo biológico "Outro" perdido (regra 2):** o schema real só aceita `Masculino`/`Feminino`; a 3ª opção da UI (`prefer_not_to_say`, mapeada visualmente como "Outro" no Canvas) é descartada no payload.
4. **Revisão incompleta e sem navegação por seção (regra 1):** falta agrupar por seção, adicionar links "Editar" que voltam para a etapa certa, e exibir os 13 campos coletados (hoje só 6 aparecem).
5. **Divergências de copy menores (regra 1):** rótulos de sexo biológico, rótulos das perguntas de hábitos, unidade do campo de altura.

## 2. Decisão de schema (regra 5 da constituição)

> **`RESOLVIDO`** — decisão confirmada e implementada como parte da EPIC de Editar Perfil (4c), que compartilha o mesmo `UserProfile`/`buildAmplifyUserProfileInput` (`specs/04-ia-perfil-vacinacao/editar-perfil/tasks.md` T8/T9): `sex` estendido para `a.enum(['Masculino', 'Feminino', 'Outro'])`, e `chronicConditions`/`medications`/`allergies` (`a.string()`) adicionados. Nenhuma mudança de código foi necessária nesta tela (2a) além da já existente: `OnboardingScreen.tsx` já chamava `saveUserProfile(values)` com o formulário completo (`ProfileSetupFormValues`, incluindo os 3 campos clínicos e `biologicalSex`), então a correção em `profileSetupPayload.ts` — camada compartilhada pelas duas telas — já passou a persistir os dados de 2a automaticamente.

Duas mudanças de schema são necessárias para não continuar perdendo dado (item 2 e 3 do resumo acima). Ambas alteram `amplify/data/schemas/user.ts` (`UserProfile`), que hoje é:
```ts
UserProfile: a.model({
  fullName: a.string().required(),
  birthDate: a.date().required(),
  sex: a.enum(['Masculino', 'Feminino']),
  weightKg: a.float(),
  heightCm: a.integer(),
  isSmoker: a.boolean(),
  sexuallyActive: a.boolean(),
  physicalActivity: a.boolean(),
  alcoholConsumption: a.boolean(),
  pregnancy: a.boolean(),
}).authorization((allow) => [allow.owner()]),
```

**Proposta:**
- Adicionar 3 colunas de texto opcional: `chronicConditions: a.string()`, `medications: a.string()`, `allergies: a.string()`. Compatível com `owner()` já existente, sem impacto em dados já persistidos (colunas novas, opcionais, `sandbox`/`ampx` regenera o schema sem migração destrutiva).
- Estender `sex` para `a.enum(['Masculino', 'Feminino', 'Outro'])`, mapeando o valor de formulário `prefer_not_to_say` → `'Outro'` em `mapBiologicalSex()` (`profileSetupPayload.ts`), em vez de descartá-lo.

Essa é uma decisão explícita de schema, não um efeito colateral de UI (regra 5) — deve ser revisada/aprovada antes da implementação, já que qualquer alteração em `UserProfile` corre via `ampx sandbox`/deploy e afeta o modelo real no DynamoDB (regra 5: "não pode ser corrompido por refatoração de UI"). Alternativa caso o time decida **não** expandir o schema agora: remover os 3 campos de texto clínico e a opção "Outro"/"prefer_not_to_say" da UI até haver destino real — mas isso reduz fidelidade ao Canvas (regra 1) e precisa ser documentado como ambiguidade resolvida (regra 8) no `spec.md` se escolhido. Este plano recomenda estender o schema, por já existir precedente direto (regra 5 permite mudança de schema quando é decisão explícita e documentada — este é exatamente esse caso).

## 3. Correção de copy LGPD (regra 4 — prioridade máxima)

`PROFILE_SETUP_NOTICE_TEXT` (`src/components/profileSetup/ProfileSetupNotice.tsx`) precisa deixar de ser um texto único reaproveitado em 3 lugares. Substituir por dois textos fixos, cada um citado literalmente do Canvas 2a:
- Etapa 2 (Histórico clínico): `"Suas informações clínicas são sigilosas e usadas só para orientações personalizadas, conforme a LGPD."`
- Etapa 3 (Hábitos): `"Essas respostas são opcionais e protegidas pela LGPD. Responda com o que preferir."`

A Etapa 4 não deve mais reusar `PrivacyNotice` — precisa de um componente/bloco novo (ou variante de cor) para o banner **verde** de confirmação com texto `"Isso nos ajuda a te dar alertas de prevenção mais precisos."`, visualmente distinto do banner azul de LGPD (paleta `success` de `DESIGN_TOKENS.md`: bg `#E8F5EE`, borda `#C7E8D6`, texto `#0C6341`).

Abordagem: manter um único componente `LgpdNotice` parametrizado por `text`/`tone` (`'info' | 'success'`), reaproveitando os tokens já existentes no tema (`colors.noticeSoft`/`colors.noticeBorder` para info; adicionar/reutilizar tom de sucesso já usado em outras telas do app, se existir componente de banner de sucesso reaproveitável — verificar antes de criar um novo, regra 3).

## 4. Abordagem técnica

1. **Não introduzir biblioteca nova** (regra 3) — todos os gaps são de estrutura JSX/copy e de schema Amplify já usado no projeto.
2. **Sexo biológico**: reestruturar `PersonalStep` para renderizar 3 chips (`Masculino`/`Feminino`/`Outro`) na mesma linha, reaproveitando o padrão visual de `answerCard`/`AnswerCards` (borda+bg+texto verde quando selecionado) em vez do par `SexCard` + `preferNotCard` atual. Atualizar `biologicalSexOptions` em `forms_profile_setup.ts` se o rótulo precisar mudar de `prefer_not_to_say` para refletir "Outro" (decisão de nomenclatura interna, sem impacto de contrato se só o label de UI mudar).
3. **Altura**: mudar o campo para pedir centímetros inteiros diretamente (placeholder "165", sem unit "m", sem conversão automática de decimal), alinhando com `heightCm: a.integer()` e o Canvas — simplifica `parseHeightCm()` (não precisa mais detectar "valor `<=3` é metro").
4. **Banners LGPD por etapa**: criar/parametrizar componente de aviso conforme §3, aplicado **antes** do card de cada etapa 2 e 3 (hoje está depois), e um banner verde de sucesso na Etapa 4.
5. **Persistência dos campos clínicos e "Outro"**: após decisão de schema (§2), atualizar `amplify/data/schemas/user.ts`, `AmplifyUserProfileInput` e `buildAmplifyUserProfileInput()` em `profileSetupPayload.ts` para incluir `chronicConditions`/`medications`/`allergies` e mapear `'prefer_not_to_say'` → `'Outro'`.
6. **Revisão agrupada por seção com "Editar"**: reescrever `ProfileSetupReview` (ou substituir por 3 blocos dedicados dentro de `ReviewStep`) para agrupar em "Pessoais" (nome, nascimento, sexo, gravidez, altura, peso), "Clínico" (condições, medicamentos, alergias) e "Hábitos" (fumo, atividade sexual, atividade física, álcool), cada bloco com um resumo textual curto (ex.: `"Feminino · 28 anos · 1,65m · 68kg"`) e um link "Editar" que chama `setCurrentStep(0|1|2)` (já existe `selectStep`/`gotoStep`-equivalente parcial via `StepNavigation`, reaproveitar a mesma função).
7. **Rótulos das perguntas de hábitos**: atualizar os `title` passados para `AnswerCards` em `HabitsStep` para a forma interrogativa exata do Canvas.
8. **Nenhuma mudança fora do escopo**: não tocar em `EditProfileScreen.tsx` (tela de edição pós-onboarding, tem EPIC próprio no `GAP_ANALYSIS.md` — 4c) nem em outras rotas.

## 5. Riscos / pontos de atenção
- **Mudança de schema (`sex` enum + 3 colunas novas) é uma decisão que precisa de aprovação explícita antes da implementação** — segue regra 5 da constituição; não deve ser feita "de passagem" junto com a correção de copy.
- `StepNavigation` (abas clicáveis no topo permitindo pular etapas já visitadas) não existe explicitamente no Canvas 2a, que só mostra a barra de progresso de 4 segmentos sem abas interativas. Não é uma regressão funcional (é uma melhoria de navegação), mas deve ser registrado como divergência intencional (regra 8) no `spec.md` se mantido, ou removido para fidelidade estrita ao Canvas — decisão de produto a confirmar, não bloqueia o restante do EPIC.
- Ao reestruturar o seletor de sexo biológico (3 chips iguais), garantir que a lógica que zera `pregnancyStatus` ao trocar para "Masculino"/"Outro" (hoje em `onPress` dos cards) seja preservada — não é só um reskin visual, tem efeito colateral de estado.
- Alterar `parseHeightCm()`/campo de altura afeta qualquer perfil que hoje tenha sido salvo assumindo entrada em metros — como o valor final gravado no banco já é sempre `heightCm` em centímetros (a conversão é só de entrada), não há migração de dado necessária, só mudança de UI.
- `EditProfileScreen.tsx` (tela 4c) provavelmente reusa os mesmos componentes/validação (`profileSetupSchema`, `AnswerCards`, etc.) — qualquer mudança de contrato de dados (schema Amplify, `ProfileSetupFormValues`) deve ser checada contra essa tela antes de ser considerada concluída, mesmo que a implementação de 4c em si esteja fora deste EPIC.
