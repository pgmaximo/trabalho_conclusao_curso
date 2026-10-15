# PLAN: Editar Perfil — Scroll Único

## 1. Diagnóstico — o que já existe vs. o que falta

`EditProfileScreen.tsx` + `edit-profile.tsx` já implementam uma tela de scroll único fiel na estrutura geral ao Canvas 4c (cabeçalho com voltar, avatar, campos pessoais, chips de sexo, pergunta condicional de gravidez, medidas, card "Hábitos", botão salvar) — muito mais próximo do alvo do que uma tela do zero. O gap é em copy/ordem de chips, formato de altura, e principalmente numa capacidade que nunca existiu: upload de foto. Diff campo a campo:

| Elemento do Canvas 4c | Existe hoje? | Divergência |
|---|---|---|
| Avatar 80×80 + "Alterar foto" | Parcial | `Avatar` é renderizado (lê `photoUrl`/iniciais), mas o link "Alterar foto" **não existe no JSX atual** — só há o avatar e o e-mail abaixo dele. Nenhum `onPress` de troca de foto. |
| Nome completo / Data de nascimento | Sim | Fiel. |
| Sexo biológico — 3 chips mesma linha, ordem Masculino→Feminino→Outro, rótulo "Outro" | Parcial | Hoje é `PillGroup` com ordem Feminino→Masculino→"Prefiro não informar" (rótulo diferente de "Outro"). Estrutura de chips (3 na mesma linha) já bate; ordem e rótulo não. |
| Pergunta condicional "Está grávida atualmente?" | Sim | `showPregnancy = biologicalSex === 'female'` já implementa exatamente o `sc-if` do Canvas. Fiel, incluindo o reset da resposta ao trocar de sexo (`update('pregnancyStatus', 'unknown')`). |
| Altura (cm) / Peso (kg), placeholders diretos em cm/kg | Parcial | Peso já é kg inteiro, fiel. Altura pede metros decimais ("1,72", helper "Em metros") em vez de centímetros diretos ("165") — mesma divergência já identificada e resolvida na Tela 2a. |
| Card "Hábitos" com 4 perguntas nominais curtas + 3 chips (Sim/Não/Não informar) | Sim | Rótulos batem quase exatamente com o Canvas 4c ("Tabagismo", "Atividade sexual", "Consumo de álcool"); um rótulo está com a forma interrogativa da Tela 2a por engano ("Pratica atividade física?" em vez de "Atividade física") — inconsistência a corrigir para bater com o Canvas 4c especificamente. |
| Botão "Salvar alterações" full-width, 56px | Sim | Fiel, incluindo estado de loading (`ActivityIndicator`). |

### Resumo do gap real
1. **"Alterar foto" nunca foi implementado como affordance de UI, e não existe capacidade de upload de avatar no backend (bloqueante para fidelidade, não bloqueante para o restante da tela funcionar).**
2. **Sexo biológico "Outro" perdido** — mesma causa raiz da Tela 2a (schema `sex` só tem 2 valores); aqui a UI usa um rótulo diferente ("Prefiro não informar") do que o Canvas 4c pede ("Outro"), mas o problema de fundo (schema) é idêntico ao já registrado para 2a.
3. **Divergências de copy/ordem menores**: ordem dos chips de sexo, rótulo "Atividade física" (não interrogativo), formato de altura em cm.
4. **Risco de regressão em campos não editados nesta tela** (histórico clínico), caso o schema seja estendido pela Tela 2a antes desta.

## 2. Decisão de schema (regra 5) — MESMA decisão da Tela 2a, não uma nova

Este EPIC **não propõe uma segunda decisão de schema independente**. A Tela 2a (`specs/02-perfil-home-agenda/wizard-perfil-saude/plan.md` §2) já identificou e recomendou:
- Estender `sex: a.enum(['Masculino', 'Feminino'])` para `a.enum(['Masculino', 'Feminino', 'Outro'])`.
- Adicionar `chronicConditions: a.string()`, `medications: a.string()`, `allergies: a.string()` ao `UserProfile`.

**Essas duas telas (2a e 4c) leem e escrevem o mesmo `UserProfile` via a mesma camada (`profileSetupRepository.ts` → `buildAmplifyUserProfileInput()` em `profileSetupPayload.ts`, e o mesmo tipo `ProfileSetupFormValues`).** Se o enum `sex` for estendido, ambas as telas devem passar a oferecer "Outro" com o mesmo valor de schema, no mesmo commit/PR da Fase 3 — nunca uma tela migrada e a outra não, o que deixaria o app com dois comportamentos divergentes para o mesmo campo do mesmo modelo. Recomendação deste plano: implementar a mudança de schema uma única vez, no Bloco 2 (Tela 2a, que já tem a decisão detalhada), e ajustar 4c no mesmo momento para consumir o enum estendido — não duplicar a decisão aqui.

**Ponto de atenção específico de 4c**: a Tela 4c **não coleta** `chronicConditions`/`medications`/`allergies` (não estão no Canvas 4c). Hoje `formStateToProfileValues()` em `edit-profile.tsx` monta esses 3 campos como string vazia `''` incondicionalmente (linhas 64-66 do arquivo atual). Se/quando o schema ganhar essas colunas, **isso vira um bug de sobrescrita silenciosa**: um usuário que preencheu condições crônicas no onboarding (2a) e depois só editar o peso em 4c apagaria o histórico clínico ao salvar. A correção (Fase 3, junto da extensão de schema) é fazer `buildAmplifyUserProfileInput()`/`formStateToProfileValues()` omitirem esses 3 campos do payload de update quando a origem é 4c, em vez de enviá-los como string vazia — ou buscar e repassar os valores existentes do perfil antes de montar o payload. Documentar esta correção como item obrigatório da mesma Fase 3 que implementa a extensão de schema, não como faixa separada.

## 3. Decisão nova deste EPIC — upload de avatar ("Alterar foto")

Investigação feita neste `plan.md` (não repete a de 2a, que não cobre isso):
- `UserContext.tsx` linha 27-28 já documenta `photoUrl?: string;` como **"reservado para upload futuro de foto — não implementado"**. Nenhuma tela escreve nesse campo hoje.
- `EditProfileScreen.tsx` recebe `photoUrl` como prop somente-leitura (repassada ao `Avatar`) — não existe nenhum `onPress`/handler de "Alterar foto" no JSX atual; o próprio link visual do Canvas nem está renderizado.
- O app **já usa Amplify Storage (S3)** em outro fluxo: `src/services/examService.ts` importa `uploadData`, `getUrl`, `remove` de `aws-amplify/storage` para persistir documentos médicos (linhas 10, 191, 209). Isso confirma que o bucket/gateway de Storage já está configurado no projeto (regra 3 — stack existente antes de expandida) e que o padrão técnico para "subir um arquivo do usuário e guardar a referência" já existe e pode ser replicado para avatar, em vez de introduzir uma lib nova.
- Não existe hoje nenhum model/campo Amplify Data (`amplify/data/schemas/user.ts`) para o avatar além do `photoUrl` do lado do `UserContext` (que por sua vez não está confirmado como persistido — precisa checagem se `photoUrl` é derivado do Cognito, de um campo do `UserProfile`, ou é puramente client-side hoje; não foi encontrado nenhuma coluna `photoUrl`/`avatarKey` no schema de `UserProfile` lido em `amplify/data/schemas/user.ts`).

**Conclusão: upload de avatar é uma capacidade nova, não uma mudança de UI (regra 2 e regra 5).** Marcar como pendência técnica explícita:
- **Opção recomendada (Fase 3, escopo próprio, não bloqueante para o resto de 4c):** adicionar um path de avatar no Amplify Storage (ex.: `avatars/{identityId}/profile.jpg`), um botão "Alterar foto" que abre `expo-image-picker` (já verificar se está instalado — se não, é a única lib nova genuinamente necessária neste EPIC, justificar em regra 3), faz upload via `uploadData` e persiste a referência — o que exige também decidir onde a referência fica: novo campo `avatarKey`/`photoUrl` em `UserProfile` (decisão de schema adicional, regra 5) ou resolvido via `getUrl` on-demand a partir de uma key previsível.
- **Enquanto isso não for implementado:** "Alterar foto" deve ser renderizado no JSX (hoje nem está) como um estado desabilitado/"em breve" explícito — nunca simular a troca localmente sem persistir, e nunca deixar o link sem handler algum sem indicação visual de que é inerte (viola regra 2 — nada pode parecer funcional e não ser).

## 4. Correções de copy (regra 1)

1. **Ordem e rótulo dos chips de sexo biológico**: mudar `SEX_OPTIONS` em `EditProfileScreen.tsx` de `[Feminino, Masculino, Prefiro não informar]` para `[Masculino, Feminino, Outro]` (ordem e rótulo exatos do Canvas 4c, mesmo valor de mapeamento de dado usado hoje — só copy/ordem, sem impacto de schema até a decisão do §2 ser executada).
2. **Rótulo "Atividade física"**: em `EditProfileScreen.tsx`, trocar o texto "Pratica atividade física?" (forma interrogativa, usada por engano — cópia cruzada da Tela 2a) para "Atividade física" (nominal curto, forma exata do Canvas 4c).
3. **Altura em centímetros**: mudar `FormField` de altura para pedir "165" (cm inteiro), remover `helperText="Em metros"` e a formatação `formatHeightInput` (vírgula decimal); ajustar `heightCmToMeters`/inverso em `edit-profile.tsx` para trabalhar direto em cm (mesma simplificação já proposta para a Tela 2a — `plan.md` de 2a, §4 item 3).
4. **"Alterar foto"**: adicionar o link de texto "Alterar foto" (600 16px, `#1B63C4`) abaixo do avatar, ausente hoje no JSX — mesmo antes da capacidade real existir, para não deixar a estrutura visual divergente do Canvas (regra 1), desde que o estado "em breve"/desabilitado (§3) seja explícito.

## 5. Abordagem técnica

1. **Não introduzir biblioteca nova** para os itens de copy (§4) — só JSX/estado local de `EditProfileScreen.tsx`.
2. **Upload de avatar (§3)** é a única frente deste EPIC que pode justificar uma lib nova (`expo-image-picker`, se ainda não instalado) — checar `package.json` antes de decidir; se já existir alguma lib de picker de imagem em uso em outra tela (ex. upload de documento em 3b), reaproveitar o mesmo padrão em vez de escolher uma nova (regra 3).
3. **Schema (`sex` enum + 3 colunas clínicas)**: não implementar aqui — depende da decisão já registrada em `specs/02-perfil-home-agenda/wizard-perfil-saude/plan.md` §2, executada uma única vez para as duas telas.
4. **Payload de update em 4c**: ajustar `formStateToProfileValues()` (`edit-profile.tsx`) para não sobrescrever `chronicConditions`/`medications`/`allergies` com string vazia — no mesmo commit que estender o schema (ver §2).
5. **Nenhuma mudança fora do escopo**: não tocar em `OnboardingScreen.tsx`/`profile-setup.tsx` (Tela 2a, EPIC próprio) além de coordenar a decisão de schema compartilhada.

## 6. Riscos / pontos de atenção
- **A extensão do schema `sex` deve ser feita uma única vez e consumida por ambas as telas (2a e 4c) no mesmo PR/deploy** — implementar em uma tela e não na outra deixa o app com um enum "Outro" que só uma tela consegue produzir, mas ambas leem, gerando inconsistência visível na revisão (2a) e na edição (4c) do mesmo dado.
- **Risco de sobrescrita silenciosa de campos clínicos ao salvar por 4c** (ver §2) é o achado mais importante deste `plan.md` — deve virar item de teste automatizado/manual explícito na Fase 3, não só uma nota de texto.
- **Upload de avatar depende de decisão de produto sobre onde a referência da imagem vive** (novo campo em `UserProfile` vs. key previsível no S3) — não deve ser implementado "de passagem" junto com as correções de copy triviais deste EPIC; tratar como sub-entrega própria dentro da Fase 3, com seu próprio critério de pronto.
- Verificar se `photoUrl` hoje vem de algum lugar real (Cognito attributes?) antes de assumir que é 100% não persistido — se vier de Cognito, o "upload" pode significar atualizar um atributo do usuário em vez de (ou além de) S3; isso muda a decisão técnica do §3 e deve ser confirmado no início da implementação, não assumido.
