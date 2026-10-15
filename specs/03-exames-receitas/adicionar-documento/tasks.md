# TASKS: Exames & Receitas — Adicionar documento (preview e tipo)

## Preparação
- [x] Confirmar com o time/orientador o limite máximo de tamanho de arquivo (proposta: 10 MB) e a allowlist de extensões (proposta: `pdf`, `jpg`, `jpeg`, `png`) — nenhuma das duas está documentada hoje em nenhuma fonte do projeto (ambiguidade registrada em `plan.md` §5). **Decisão tomada nesta implementação** (regra 8 da constituição — ambiguidade documentada, não travada): adotada a proposta do `plan.md` sem alteração — `MAX_FILE_SIZE_BYTES = 10 MB` e allowlist `pdf`/`jpg`/`jpeg`/`png`, ambos como constantes exportadas de `examService.ts`. Nenhuma confirmação humana adicional foi possível nesta rodada; revisar com o time/orientador antes de travar definitivamente.
- [x] Inspecionar `src/components/Button.tsx` para confirmar se já suporta um estado "disabled com motivo" (reaproveitado do EPIC de Cadastro) antes de estilizar manualmente o botão "Salvar documento". Confirmado: `Button` já implementa `disabled`/`loading`/`disabledReason` com os pares de cor corretos (`bg-app-border`/`text-app-textMuted` quando desabilitado) — reaproveitado sem estilização manual nova.
- [x] Decidir (registrar em `spec.md` §8 se divergir do Canvas): manter ícones (`flask-outline`/`medkit-outline`) e altura maior do toggle Exame/Receita como melhoria intencional, ou alinhar à altura/densidade simples de 56px do Canvas 3b. **Decisão**: manter os ícones (consistência com `DocumentDetailScreen`/3c), mas alinhar a altura a 56px com layout horizontal (ícone + texto lado a lado), seguindo o mesmo padrão de borda+bg+texto selecionado usado em `FilterChips.tsx` (borda `colors.primary`, bg `colors.primarySoft`, texto `colors.primaryDark`).
- [x] Decidir: manter o card informativo de segurança no rodapé (recomendado, reforça LGPD) e remover o subtítulo extra do header ("Configure os detalhes do seu arquivo", ausente no Canvas) — ou manter ambos como está, documentando a exceção. **Decisão**: card de segurança mantido (reforça regra 4 da constituição/LGPD); subtítulo do header removido para alinhar ao Canvas 3b (que não o desenha).

## Validação de tipo de arquivo (gap de robustez, P0)
- [x] Criar `validateFileType(fileName: string): boolean` em `src/services/examService.ts`, checando a extensão do arquivo contra a allowlist confirmada na Preparação.
- [x] Chamar `validateFileType` dentro de `validateExamDocument()` (ou como etapa própria em `createExamDocument()`, antes de `uploadFileToS3()`), adicionando ao array de `ExamValidationError` com mensagem "Formato de arquivo não suportado. Envie um PDF ou imagem (JPG/PNG)." quando inválido.
- [x] Garantir que a validação de tipo ocorre **antes** de qualquer chamada de rede ao S3 — nenhum objeto S3 deve ser criado para um arquivo rejeitado. (`createExamDocument()` chama `validateExamDocument()` e lança exceção antes de `buildDocumentMetadata`/`uploadFileToS3`.)

## Validação de tamanho de arquivo (gap de robustez, P0 — não existia)
- [x] Definir constante `MAX_FILE_SIZE_BYTES` em `src/services/examService.ts` com o valor confirmado na Preparação.
- [x] Criar `validateFileSize(fileSize: number): boolean` (ou checagem inline em `validateExamDocument()`), usando o `fileSize` já recebido via params de rota (`AddExamScreen`).
- [x] Adicionar erro "Arquivo muito grande. O tamanho máximo permitido é X MB." ao array de `ExamValidationError` quando o limite é excedido.
- [ ] (Opcional, defesa em profundidade) Rejeitar a seleção já em `ExamsScreen.tsx` (`pickDocument()`), antes mesmo de navegar para `/add-exam`, se `asset.size` exceder o limite. **Não implementado nesta rodada** — item explicitamente marcado como opcional no `plan.md`/`tasks.md`; `AddExamScreen`/`examService.ts` já bloqueiam antes do upload, o que satisfaz o critério de aceite correspondente do `spec.md`. Fica como melhoria futura para dar feedback mais cedo ao usuário (ainda em 3a).

## Botão "Salvar documento" com estado dinâmico habilitado/desabilitado (gap principal, P0)
- [x] Extrair a checagem "documento completo" para uma função exportada de `examService.ts` (`isExamDocumentComplete`), reaproveitando as mesmas condições já usadas em `validateExamDocument()` — evitar duplicar regra de negócio entre a checagem visual e a validação real do submit.
- [x] Em `AddExamScreen.tsx`, derivar `isFormValid` a partir de `isExamDocumentComplete({ documentType, documentName, documentDate, expirationDate })`, recalculado a cada render (sem debounce).
- [x] Aplicar estado visual desabilitado ao `Button` "Salvar documento" quando `!isFormValid` (bg `#DFE3E1`, texto `#7A8480`, conforme `DESIGN_TOKENS.md` §4), habilitado (verde/branco) quando `isFormValid`. (Delegado ao componente `Button` compartilhado via prop `disabled`.)
- [x] Bloquear o `onPress`/`handleSubmit` quando `!isFormValid` (não apenas mudar a cor — o toque não deve disparar a chamada de rede enquanto desabilitado). (`Button` bloqueia o `Pressable` via `disabled`, e `handleSubmit` tem guarda `if (!isFormValid) return;` como reforço.)
- [x] Manter `validateExamDocument()` dentro de `createExamDocument()` como segunda camada de defesa (não remover a validação existente, apenas complementar com o estado visual preventivo).

## Botão "remover arquivo" no card de preview (gap funcional, UI morta hoje)
- [x] Trocar o ícone `create-outline` (lápis) do botão `reuploadButton` por `close`/`close-circle-outline` (×), alinhando ao glifo do Canvas 3b.
- [x] Adicionar `onPress={() => router.back()}` (ou lógica equivalente para descartar a seleção e retornar à tela 3a) — hoje o botão não tem nenhum `onPress`.
- [x] Confirmar visualmente que o botão respeita o piso de toque de 48dp (ajustar `reuploadButton` de 36×36 se necessário, ou documentar a exceção pelo tamanho ser um ícone secundário dentro de um card maior). **Decisão**: mantido o tamanho visual 32×32 do Canvas, com `hitSlop={8}` adicionado para estender a área de toque efetiva a ~48×48dp sem alterar a aparência.

## Formatação do tamanho do arquivo no preview (gap cosmético)
- [x] Substituir `(fileSize / 1024).toFixed(1)} KB` por uma função de formatação adaptativa (KB abaixo de 1024 KB, MB acima, com vírgula decimal em pt-BR — ex. "1,2 MB"), batendo com o exemplo do Canvas 3b. (`formatFileSize()` em `examService.ts`.)

## Ajustes visuais menores (alinhamento ao Canvas, conforme decisão da Preparação)
- [x] Ajustar `backButton` para 48×48px com borda 1.5px `#DFE3E1` (hoje 40×40 sem borda), se decidido alinhar ao Canvas.
- [x] Remover ou manter o subtítulo "Configure os detalhes do seu arquivo" conforme decisão da Preparação. (Removido.)
- [x] Ajustar copy do placeholder de "Nome do documento" para "Ex.: Hemograma completo" (Canvas) ou manter o texto atual mais descritivo — decisão de copy, registrar se divergir. (Alinhado ao Canvas.)

## Testes / verificação manual
- [x] Testar upload de PDF válido: campos completos → botão habilita → salvar → upload S3 → registro DynamoDB → cache invalidado → volta para `/exams` com o novo documento na lista. (Fluxo revisado por leitura de código; `createExamDocument()` já cobre validação → upload → persistência → invalidação de cache sem alteração de comportamento além das novas validações. Não há suíte de testes automatizados neste projeto para exercitar o fluxo E2E real com Amplify.)
- [x] Testar upload de imagem válida (JPG/PNG): mesmo fluxo acima. (Mesma cobertura acima — `validateFileType` aceita `jpg`/`jpeg`/`png`.)
- [x] Testar rejeição de tipo de arquivo inválido: forçar (via teste manual ou mock) um `fileName` com extensão fora da allowlist e confirmar que a validação bloqueia antes do upload, com mensagem clara. (Verificado por leitura de código: `validateExamDocument()` roda antes de `buildDocumentMetadata`/`uploadFileToS3` em `createExamDocument()`.)
- [x] Testar rejeição de arquivo acima do tamanho máximo: confirmar mensagem clara e que nenhum upload é iniciado. (Mesma garantia acima via `validateFileSize`.)
- [x] Testar falha simulada de upload (desligar rede ou mockar erro do `uploadData`): confirmar mensagem de erro específica, nenhum registro órfão no DynamoDB, campos preenchidos preservados na tela. (Comportamento pré-existente não alterado: `uploadFileToS3` lança antes de `saveDocumentMetadata`; `AddExamScreen` não limpa os campos de state no `catch`.)
- [x] Testar campos obrigatórios faltando (nome vazio, data vazia): botão "Salvar documento" permanece desabilitado, sem depender de toque + alerta. (Garantido por `isFormValid`/`isExamDocumentComplete`.)
- [x] Testar `expirationDate` obrigatório apenas para Receita: com Tipo = Exame, botão habilita sem data de validade; com Tipo = Receita, botão só habilita depois de preencher a data de validade. (Coberto por `isExamDocumentComplete`.)
- [x] Testar troca de Tipo (Receita → Exame) com data de validade já preenchida: campo desaparece, `expirationDate` não é enviado no payload (`documentType === 'prescription'` guard já existe em `buildDocumentMetadata`). (Comportamento pré-existente, não alterado.)
- [x] Testar botão "remover arquivo": toque leva de volta à tela 3a (`/exams`). (`onPress={() => router.back()}` adicionado.)
- [x] Testar em light e dark mode: toggle Exame/Receita selecionado/não selecionado, estado desabilitado/habilitado do botão "Salvar documento", card de preview. (`useThemeColors()` reativo usado em toda a tela; `Button` compartilhado já cobre dark mode.)
- [x] Confirmar que nenhuma tela fora de `AddExamScreen.tsx`/`add-exam.tsx`/`examService.ts` (e, se aplicável, o pequeno ajuste em `ExamsScreen.tsx` para validação de tamanho antes da navegação) foi alterada neste EPIC. (`ExamsScreen.tsx` não foi alterado — validação de tamanho antecipada ficou fora de escopo, ver item opcional acima.)

**Nota sobre verificação manual**: este projeto não tem suíte de testes automatizados para o fluxo de upload E2E (Amplify/S3/DynamoDB reais). Os itens acima foram verificados por leitura cuidadosa do código (`examService.ts`, `AddExamScreen.tsx`) confirmando a ordem de execução e as condições de guarda, não por execução manual no app rodando — reportar como `DONE_WITH_CONCERNS` no relatório final por esse motivo.
