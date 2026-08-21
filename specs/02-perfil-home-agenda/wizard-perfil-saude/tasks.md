# TASKS: Perfil de Saúde — Wizard 4 Etapas

## Preparação
- [ ] Confirmar com o time a decisão de schema (`plan.md` §2): estender `UserProfile.sex` para `['Masculino', 'Feminino', 'Outro']` e adicionar `chronicConditions`/`medications`/`allergies` (`a.string()`), vs. alternativa de remover esses campos da UI. Não avançar nas tarefas de persistência abaixo sem essa decisão.
- [ ] Confirmar se `EditProfileScreen.tsx` (tela 4c) reaproveita `profileSetupSchema`/`AmplifyUserProfileInput`/`buildAmplifyUserProfileInput` — se sim, qualquer mudança de contrato feita aqui precisa ser validada também nessa tela (fora do escopo de implementação deste EPIC, mas não pode quebrá-la).
- [ ] Verificar se já existe no design system um componente/variante de banner "sucesso" (verde) reaproveitável antes de criar um novo componente para a Etapa 4 (regra 3 da constituição).

## Schema Amplify (`amplify/data/schemas/user.ts`)
- [ ] Estender `sex: a.enum(['Masculino', 'Feminino'])` para `a.enum(['Masculino', 'Feminino', 'Outro'])`.
- [ ] Adicionar `chronicConditions: a.string()`, `medications: a.string()`, `allergies: a.string()` ao model `UserProfile`.
- [ ] Rodar `ampx sandbox` (Node 20, ver `MEMORY.md`) e confirmar que o schema sintetiza sem erro e sem afetar dados existentes.

## Camada de payload (`src/services/profileSetupPayload.ts`)
- [ ] Atualizar `AmplifyUserProfileInput` com `sex?: 'Masculino' | 'Feminino' | 'Outro'` e `chronicConditions?: string`, `medications?: string`, `allergies?: string`.
- [ ] Atualizar `mapBiologicalSex()` para mapear `'prefer_not_to_say'` → `'Outro'` em vez de `undefined`.
- [ ] Atualizar `buildAmplifyUserProfileInput()` para incluir `chronicConditions`/`medications`/`allergies` (trim, omitir se vazio, igual ao padrão já usado para os demais campos opcionais).

## Etapa 1 — Dados pessoais (`PersonalStep` em `OnboardingScreen.tsx`)
- [ ] Substituir os 2 `SexCard` + 1 `preferNotCard` por 3 chips na mesma linha (Masculino/Feminino/Outro), reaproveitando o padrão visual de `AnswerCards`/`answerCard` (borda+bg+texto verde quando selecionado).
- [ ] Preservar o efeito colateral existente: selecionar "Masculino" ou "Outro" deve resetar `pregnancyStatus` para `'unknown'`.
- [ ] Trocar o campo "Altura" de metros decimais (placeholder "1,65", unit "m") para centímetros inteiros (placeholder "165", sem unit "m"), alinhado ao Canvas e a `heightCm: a.integer()`.
- [ ] Simplificar/remover a lógica de `parseHeightCm()` que multiplica por 100 quando o valor é `<= 3` (não é mais necessária se a entrada já é sempre em cm).
- [ ] Atualizar `formatHeightInput()` (hoje formata com vírgula decimal) para aceitar apenas dígitos inteiros, coerente com o novo campo.

## Etapa 2 — Histórico clínico (`ClinicalStep`)
- [ ] Criar/parametrizar o banner LGPD com o texto exato: "Suas informações clínicas são sigilosas e usadas só para orientações personalizadas, conforme a LGPD."
- [ ] Mover o banner para **antes** do card "Histórico clínico" (hoje está depois dos campos).
- [ ] Confirmar que os 3 textareas (condições crônicas, medicamentos, alergias) continuam opcionais e com os placeholders do Canvas.

## Etapa 3 — Hábitos (`HabitsStep`)
- [ ] Criar/parametrizar o banner LGPD com o texto exato: "Essas respostas são opcionais e protegidas pela LGPD. Responda com o que preferir." (diferente do texto da Etapa 2).
- [ ] Mover o banner para **antes** do bloco de perguntas (hoje está depois).
- [ ] Atualizar os rótulos das 4 perguntas para a forma interrogativa exata do Canvas: "Você fuma?", "Você é sexualmente ativo(a)?", "Pratica atividade física?" (já correto), "Consome bebida alcoólica?".

## Etapa 4 — Revisão (`ReviewStep` / `ProfileSetupReview`)
- [ ] Reestruturar a revisão em 3 blocos agrupados — "Pessoais" (nome, nascimento, sexo, gravidez, altura, peso), "Clínico" (condições, medicamentos, alergias), "Hábitos" (fumo, atividade sexual, atividade física, álcool) — cada um com resumo textual curto, em vez da lista plana de 6 campos atual.
- [ ] Adicionar link "Editar" (600 16px, `#1B63C4`) em cada bloco, chamando a navegação de etapa já existente (`setCurrentStep`/equivalente a `gotoStep1`/`gotoStep2`/`gotoStep3`) sem perder dados preenchidos.
- [ ] Substituir o uso de `PrivacyNotice` genérico na Etapa 4 pelo banner verde de confirmação (bg `#E8F5EE`, borda `#C7E8D6`, ícone check) com o texto "Isso nos ajuda a te dar alertas de prevenção mais precisos.".
- [ ] Confirmar que os 13 campos coletados no wizard aparecem em algum dos 3 blocos (nenhum campo preenchido fica de fora da revisão).

## Copy / componente de aviso compartilhado
- [ ] Substituir `PROFILE_SETUP_NOTICE_TEXT` único por dois textos fixos por etapa (ver Etapas 2 e 3 acima), removendo o texto genérico atual que não menciona LGPD.
- [ ] Se optar por um componente único parametrizado (`tone: 'info' | 'success'`), reaproveitar tokens de cor já existentes no tema em vez de hardcodar hex novos.

## Testes / verificação manual
- [ ] Testar o fluxo completo das 4 etapas com dados válidos, incluindo os novos campos persistidos (condições/medicamentos/alergias, sexo "Outro") — confirmar no DynamoDB (via console/Amplify Studio ou log) que o registro `UserProfile` contém os valores esperados.
- [ ] Testar que voltar (`Voltar`) e usar os links "Editar" da Etapa 4 preserva todos os campos já preenchidos, em qualquer combinação de etapas.
- [ ] Testar a pergunta condicional de gravidez aparecendo/sumindo corretamente ao trocar entre Masculino/Feminino/Outro.
- [ ] Testar em light e dark mode: banners LGPD (azul) e de confirmação (verde), chips selecionados/não selecionados, textareas.
- [ ] Testar falha de salvamento (ex.: sessão expirada) na Etapa 4 — usuário permanece na tela com mensagem de erro específica, sem perder o preenchimento.
- [ ] Confirmar que `EditProfileScreen.tsx` (4c) continua funcionando após as mudanças de schema/payload (mesmo que sua implementação completa seja outro EPIC).
- [ ] Confirmar que nenhuma tela fora de `OnboardingScreen.tsx`/`profile-setup.tsx`/`profileSetupPayload.ts`/`profileSetupRepository.ts`/`amplify/data/schemas/user.ts`/componentes de `src/components/profileSetup/` foi alterada neste EPIC.
