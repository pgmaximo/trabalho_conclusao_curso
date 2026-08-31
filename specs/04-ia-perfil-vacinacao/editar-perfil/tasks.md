# TASKS: Editar Perfil — Scroll Único

> **Status: CONCLUÍDO.** Decisão de schema compartilhada com a Tela 2a aprovada (regra 5) e executada uma única vez em `src/services/profileSetupPayload.ts` (`buildAmplifyUserProfileInput`), consumida por ambas as telas via `saveUserProfile()` — ver `specs/design/GAP_ANALYSIS.md` pendências #10/#11/#25/#27.

Pré-requisito comum a T3/T7: decisão de schema compartilhada com a Tela 2a (`specs/02-perfil-home-agenda/wizard-perfil-saude/plan.md` §2) precisa estar aprovada e executada **uma única vez** (não duplicar em 2a e 4c).

## Copy e estrutura (regra 1 — sem dependência de schema)

- [x] **T1. Corrigir ordem e rótulo dos chips de sexo biológico.** Em `src/screens/EditProfileScreen.tsx`, mudar `SEX_OPTIONS` de `[Feminino, Masculino, Prefiro não informar]` para `[Masculino, Feminino, Outro]` (ordem e rótulo do Canvas 4c). O `value` interno pode continuar `'prefer_not_to_say'` até T3/T7 mudarem o schema — só copy/ordem nesta task.
- [x] **T2. Corrigir rótulo "Atividade física".** Em `EditProfileScreen.tsx`, trocar o texto "Pratica atividade física?" por "Atividade física" (forma nominal curta, igual ao Canvas 4c — não à interrogativa da Tela 2a).
- [x] **T3. Mudar campo de altura para centímetros inteiros diretos.** Removido `formatHeightInput` (vírgula decimal) e `helperText="Em metros"`; agora pede cm inteiro (placeholder "165"). `heightCmToMeters` virou `heightCmToText` em `src/app/edit-profile.tsx` (round direto, sem conversão para metros). Não foi necessário tocar `profileSetupPayload.ts`: `parseHeightCm` já trata `valor > 3` como cm — a Tela 2a (que ainda envia metros com vírgula) continua funcionando sem alteração.
- [x] **T4. Adicionar o link "Alterar foto" ausente no JSX.** Abaixo do `Avatar` em `EditProfileScreen.tsx`, renderizado o texto "Alterar foto" conforme o Canvas.
- [x] **T5. Implementar estado "em breve"/desabilitado explícito para "Alterar foto".** Toque exibe `Alert.alert('Alterar foto', 'Em breve você poderá trocar sua foto por aqui.')` — nunca finge sucesso.

## Validação e correção de comportamento

- [x] **T6. Confirmar validação de campo obrigatório vazio.** Coberto por teste automatizado novo em `__tests__/edit-profile-screen.test.tsx` ("blocks saving and shows an inline error when a required field is empty").
- [x] **T7. Confirmar reset de `pregnancyStatus` ao trocar sexo.** Coberto por teste automatizado novo em `__tests__/edit-profile-screen.test.tsx` ("shows the pregnancy question only for Feminino and resets it when switching away"), validando que o comportamento sobrevive à reordenação de T1.

## Dependente da decisão de schema compartilhada (2a + 4c)

- [x] **T8.** `sex` estendido para `a.enum(['Masculino', 'Feminino', 'Outro'])` em `amplify/data/schemas/user.ts`. `mapBiologicalSex()` (`profileSetupPayload.ts`) mapeia o valor interno compartilhado `'prefer_not_to_say'` → `'Outro'` — nenhuma mudança necessária em `edit-profile.tsx`/`EditProfileScreen.tsx` além disso, pois ambos já usavam esse mesmo valor interno (T1). `UserContext.mapGender`/`UserProfile.gender` estendidos com `'other'` para o round-trip de leitura (reabrir a tela após salvar "Outro" mostra o chip correto).
- [x] **T9. Corrigir sobrescrita silenciosa de campos clínicos.** `chronicConditions`/`medications`/`allergies` adicionados ao schema; `buildAmplifyUserProfileInput()` só inclui os 3 campos no payload quando não-vazios (`.trim()`), então o payload de 4c (que sempre envia `''`) nunca inclui essas chaves — `update()` do Amplify não as sobrescreve. Coberto por `__tests__/profile-setup-payload.test.ts` ("omits chronic condition fields when empty, so an update never wipes existing values").

## Upload de avatar (capacidade nova, escopo próprio — não bloqueia o restante do EPIC)

- [x] **T10. Investigar origem atual de `photoUrl`.** Achado: `UserContext.photoUrl` (`src/contexts/UserContext.tsx:28`) já traz o comentário `ATTENTION: photoUrl reservado para upload futuro de foto — não implementado`. Confirmado por busca em todo `src/`: nenhum lugar do código popula `photoUrl` a partir de Cognito, DynamoDB ou S3 — é um campo puramente não-persistido/reservado hoje. T11 segue bloqueada aguardando decisão explícita de onde essa referência será persistida.
- [x] **T11. Decisão registrada:** novo campo `photoKey: a.string()` em `UserProfile` (não key S3 previsível sem persistência, não atributo Cognito) — path fixo `avatars/{owner}/profile.jpg` em `amplify/storage/resource.ts` (nova regra de acesso `allow.authenticated.to(['read','write','delete'])`, mesmo padrão de `medical-documents/{owner}/*`).
- [x] **T12. Upload real via Amplify Storage implementado** em `src/services/avatarService.ts` (`uploadAvatarPhoto`/`getAvatarDisplayUrl`), reaproveitando literalmente o padrão de `examService.ts` (`uploadData`/`getUrl`). `expo-image-picker` já estava instalado (`~17.0.11`, usado em `ExamsScreen.tsx`) — nenhuma dependência nova.
- [x] **T13. Fluxo real substituindo o estado "em breve"**: `EditProfileScreen.handleChangePhoto` abre `ImagePicker.launchImageLibraryAsync` → `onUploadPhoto` (prop, implementada em `edit-profile.tsx`) → `avatarService.uploadAvatarPhoto` → `profileSetupRepository.updateUserPhotoKey` → `refreshUser()`. `UserContext` resolve a key para URL assinada de exibição a cada fetch.
- [x] **T14. Estados de erro cobertos**: permissão de galeria negada mostra alerta específico sem tentar upload; falha no upload reverte o preview otimista local (nunca deixa o avatar "preso" numa foto não persistida) e mostra alerta com a mensagem real do erro. Cobertos por 3 testes novos em `__tests__/edit-profile-screen.test.tsx`.

## Verificação final

- [x] **T15. Revisar os 4 cenários do `spec.md`**: cobertos por testes automatizados (`__tests__/edit-profile-screen.test.tsx`, `__tests__/profile-setup-payload.test.ts`) e revisão de código; sem execução visual em dispositivo/simulador neste ambiente (sem acesso a ferramenta de browser/simulador) — validação visual manual (claro/escuro) fica como follow-up antes da apresentação do TCC.
- [x] **T16. Confirmado**: mesmo enum `sex` (`'Masculino'|'Feminino'|'Outro'`), mesmas 3 colunas clínicas, mesma função `buildAmplifyUserProfileInput` consumida por 2a (`profile-setup.tsx`) e 4c (`edit-profile.tsx`) — não há duas implementações divergentes, ambas passam pelo mesmo `saveUserProfile()`.
