# TASKS: Editar Perfil — Scroll Único

Pré-requisito comum a T3/T7: decisão de schema compartilhada com a Tela 2a (`specs/02-perfil-home-agenda/wizard-perfil-saude/plan.md` §2) precisa estar aprovada e executada **uma única vez** (não duplicar em 2a e 4c).

## Copy e estrutura (regra 1 — sem dependência de schema)

- [ ] **T1. Corrigir ordem e rótulo dos chips de sexo biológico.** Em `src/screens/EditProfileScreen.tsx`, mudar `SEX_OPTIONS` de `[Feminino, Masculino, Prefiro não informar]` para `[Masculino, Feminino, Outro]` (ordem e rótulo do Canvas 4c). O `value` interno pode continuar `'prefer_not_to_say'` até T3/T7 mudarem o schema — só copy/ordem nesta task.
- [ ] **T2. Corrigir rótulo "Atividade física".** Em `EditProfileScreen.tsx`, trocar o texto "Pratica atividade física?" por "Atividade física" (forma nominal curta, igual ao Canvas 4c — não à interrogativa da Tela 2a).
- [ ] **T3. Mudar campo de altura para centímetros inteiros diretos.** Remover `formatHeightInput` (vírgula decimal) e `helperText="Em metros"`; pedir "165" cm inteiro, placeholder igual ao Canvas. Ajustar `heightCmToMeters`/`metersToHeightCm` (ou equivalente) em `src/app/edit-profile.tsx` para trabalhar direto em cm, coordenando com a mesma correção da Tela 2a para não haver dois formatos de altura no app.
- [ ] **T4. Adicionar o link "Alterar foto" ausente no JSX.** Abaixo do `Avatar` em `EditProfileScreen.tsx`, renderizar o texto "Alterar foto" (600 16px, `#1B63C4`) conforme o Canvas — hoje nem existe no componente. Comportamento ao tocar: ver T5.
- [ ] **T5. Implementar estado "em breve"/desabilitado explícito para "Alterar foto".** Enquanto o upload real (T9) não estiver pronto, o toque no link deve mostrar feedback explícito (ex.: toast/alert "Em breve você poderá trocar sua foto por aqui.") — nunca fingir sucesso, nunca ficar sem handler nenhum. Cobre o cenário "tentar trocar foto (pendência)" do `spec.md`.

## Validação e correção de comportamento

- [ ] **T6. Confirmar validação de campo obrigatório vazio.** `validate()` em `EditProfileScreen.tsx` já cobre `fullName`/`birthDate` — escrever/atualizar teste (manual ou automatizado, conforme convenção do projeto) cobrindo o cenário "campo obrigatório vazio" do `spec.md` (erro inline, sem chamada ao Amplify).
- [ ] **T7. Confirmar reset de `pregnancyStatus` ao trocar sexo.** Já implementado (`update('pregnancyStatus', 'unknown')` no `onChange` do chip de sexo) — validar que o comportamento sobrevive às mudanças de T1 (reordenação de `SEX_OPTIONS`) e ao valor "Outro" quando T9-schema mapear `prefer_not_to_say`/"Outro" corretamente.

## Dependente da decisão de schema compartilhada (2a + 4c)

- [ ] **T8. [BLOQUEADO por decisão de schema — coordenar com Tela 2a]** Após `sex` ser estendido para `a.enum(['Masculino', 'Feminino', 'Outro'])` em `amplify/data/schemas/user.ts` (implementado uma única vez, ver `plan.md` §2), atualizar o mapeamento em `edit-profile.tsx` (`userToFormState`/`formStateToProfileValues`) e `EditProfileScreen.tsx` para usar o valor real `'Outro'` em vez de descartar `prefer_not_to_say` silenciosamente. Testar que o valor é lido corretamente ao reabrir a tela após salvar "Outro".
- [ ] **T9. [BLOQUEADO por decisão de schema — coordenar com Tela 2a] Corrigir sobrescrita silenciosa de campos clínicos.** Quando `chronicConditions`/`medications`/`allergies` existirem no schema (decisão de 2a), ajustar `formStateToProfileValues()` em `edit-profile.tsx` para **não enviar** esses 3 campos como `''` a partir de 4c (que não os coleta) — omitir do payload de update ou repassar os valores existentes do perfil carregado, nunca sobrescrever com vazio. Escrever teste cobrindo: usuário preenche condições crônicas em 2a → edita só o peso em 4c → condições crônicas continuam intactas após salvar.

## Upload de avatar (capacidade nova, escopo próprio — não bloqueia o restante do EPIC)

- [ ] **T10. Investigar origem atual de `photoUrl`.** Confirmar se `UserContext.photoUrl` vem de algum atributo do Cognito hoje ou é puramente não-persistido (ver `plan.md` §6, risco). Documentar achado antes de iniciar T11.
- [ ] **T11. Decidir e documentar onde a referência da foto será persistida** (novo campo em `UserProfile` vs. key previsível no S3 vs. atributo Cognito) — decisão explícita de schema/design de dados (regra 5), registrar antes de implementar.
- [ ] **T12. Implementar upload real via Amplify Storage.** Reaproveitar o padrão já usado em `src/services/examService.ts` (`uploadData`/`getUrl`/`remove` de `aws-amplify/storage`) para um novo caminho `avatars/{identityId}/...`; verificar se `expo-image-picker` (ou lib equivalente já usada em outra tela de upload, ex. 3b) já está instalada antes de adicionar dependência nova (regra 3).
- [ ] **T13. Substituir o estado "em breve" de T5 pelo fluxo real** (abrir picker → upload → atualizar `photoUrl`/referência → refletir no `Avatar` imediatamente e persistir no `UserProfile`/Storage).
- [ ] **T14. Cobrir estado de erro de upload** (falha de rede, permissão de câmera/galeria negada) com mensagem específica, sem deixar o avatar em estado inconsistente (ex.: preview trocado localmente mas upload falhou).

## Verificação final

- [ ] **T15. Revisar os 4 cenários do `spec.md`** (editar e salvar com sucesso; campo obrigatório vazio; sexo Feminino mostra gravidez; tentar trocar foto) manualmente em light e dark mode antes de considerar o EPIC concluído.
- [ ] **T16. Confirmar com o EPIC da Tela 2a que a decisão de schema foi aplicada de forma idêntica nas duas telas** (mesmo enum `sex`, mesmas 3 colunas clínicas, mesmo commit/PR da Fase 3) antes de fechar T8/T9.
