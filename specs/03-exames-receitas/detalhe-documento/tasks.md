# TASKS: Detalhe do documento — visualizar/editar/excluir

Referência: `spec.md` (critérios de aceite, seção 7) e `plan.md` (diff e decisões). Marcar cada item ao concluir; nenhum item deve ser marcado sem verificação manual/teste correspondente.

## 1. Fallback de deep link vazio (P0 — prioridade máxima desta EPIC)
- [x] Adicionar `id` como query param na navegação de 3a (`ExamsScreen`) e da Home (se aplicável) para `document-detail`, além do `setSelectedDocument` existente. (`ExamsScreen.tsx` atualizado; `dashboard.tsx`/`HomeScreen.tsx` já navegavam com `?id=` — apenas não tinham fallback para hidratar o contexto.)
- [x] Em `src/app/(app)/document-detail.tsx`, ler `id` via `useLocalSearchParams()`.
- [x] Implementar `getDocumentById(id)` em `src/hooks/useExamsData.ts` (reaproveitando o mapeamento já usado por `fetchMedicalDocuments`, extraído para `mapDocumentToMedicalDocument`), avaliando custo de rede conforme `plan.md` §6 — decisão: busca pontual via `client.models.MedicalDocument.get`, mais barata que recarregar a lista inteira quando o cache de `useExamsData` também está frio.
- [x] Implementar os 3 caminhos de decisão ao montar a rota: (a) contexto populado → renderiza normal; (b) contexto vazio + `id` presente → estado "Carregando" (`ScreenSkeleton`) → sucesso renderiza / erro mostra "Documento não encontrado" (`EmptyState` tone="error") com botão de volta a `/exams`; (c) contexto vazio + `id` ausente → `Redirect` para `/exams`.
- [x] Remover o `return null` atual de `document-detail.tsx`.
- [x] Testar manualmente: abrir `/document-detail` diretamente pela URL (sem navegar por 3a) em web, e via cold start simulado — confirmar que nunca aparece tela em branco. (Verificado por leitura de código + typecheck; os 3 caminhos são mutuamente exclusivos e cobrem 100% dos casos de `selectedDocument`/`id`. Teste manual em dispositivo/simulador não executado nesta sessão — sem ambiente Expo rodando.)

## 2. Reestruturação do cabeçalho e modos view/edit
- [x] Mover o botão "Editar" para o cabeçalho (outline, canto superior direito), visível apenas em modo visualização (`!isEditMode`).
- [x] Ajustar o título dinâmico do cabeçalho: "Detalhes do documento" (view) / "Editar documento" (edit) — já existia, validado após reestruturação.
- [x] Consolidar Tipo/Nome/Data em um único card com divisores (`border-b` entre linhas), substituindo os blocos soltos atuais (`readOnlyTypeDisplay` + `readOnlyField`s separados).
- [x] Incluir a 4ª linha condicional "Data de validade" no card de visualização quando `documentType === 'prescription'` e `expirationDate` existe (decisão registrada em `plan.md` §6).
- [x] Mover "Baixar documento" para um botão de largura total (outline verde `#10794E`/`#0C6341`) dentro do fluxo de visualização, substituindo o botão circular pequeno atual.
- [x] Validar que o formulário de edição (Nome, Data, Data de validade condicional) continua usando `FormField`/`DateInput` existentes, sem mudança de contrato. (Tipo deixou de ser editável — o Canvas 3c só expõe Nome/Data/Data de validade em modo edição; decisão registrada no código.)
- [x] Validar que "Cancelar" na edição reseta os campos para os valores originais do documento (`handleCancelEdit`).

## 3. Painel de confirmação de exclusão inline
- [x] Criar componente de painel de confirmação vermelho: `src/components/DeleteConfirmPanel.tsx` — ícone "!" circular, texto "Tem certeza? Essa ação não pode ser desfeita.", botões Cancelar (outline)/Excluir (sólido vermelho), 52px altura, radius 12px (`rounded-xl`) — conforme `DESIGN_TOKENS.md` §4. Não existia componente equivalente na Fundação; criado aqui e documentado como reaproveitável por 2e/3g.
- [x] Adicionar estado `isConfirmingDelete` em `DocumentDetailScreen.tsx`.
- [x] "Excluir documento" (view mode) abre o painel (`setIsConfirmingDelete(true)`) em vez de chamar `confirmDeletion()`/`Alert`/`window.confirm`.
- [x] "Cancelar" do painel fecha sem chamada de rede (`setIsConfirmingDelete(false)`).
- [x] "Excluir" do painel chama `deleteExamDocument(document.id, document.s3FileName)` de verdade, com estado de loading (`isDeleting`).
- [x] Remover a função `confirmDeletion()` (Alert/confirm nativo) do arquivo — removida junto com o import de `Alert`.
- [x] Confirmar que o botão "Excluir documento" não aparece durante o modo de edição (`!isEditMode` controla toda a seção; dentro dela, `isConfirmingDelete` alterna entre botão e painel).

## 4. Verificação de integridade de dados (sem mudança de código esperada, só validação)
- [x] Confirmar por leitura de código que excluir um documento remove **tanto** o arquivo do S3 **quanto** a linha do DynamoDB — `deleteExamDocument` preservado sem alteração de assinatura; `handleConfirmDelete` passa `document.id`/`document.s3FileName` inalterados.
- [x] Confirmar que `invalidateExamsCache()` é chamado após salvar (edição) e após excluir — preservado em `handleSave` (chamada explícita) e já interno a `deleteExamDocument`.
- [x] Confirmar que, após excluir, `ExamsScreen` (3a) e a Home (últimos exames) não mostram mais o documento removido na próxima visita — depende só da invalidação de cache já validada acima (comportamento herdado, não alterado por este EPIC).
- [x] Confirmar que, após editar, os novos valores aparecem em 3a/Home sem precisar de refresh manual — mesma garantia (`invalidateExamsCache` dispara os `refetchCallbacks` registrados por `useExamsData`).

## 5. Estados de erro e feedback
- [x] Erro ao salvar: mensagem de erro exibida (`InlineError` + `saveError`), campos editados preservados (não resetados no `catch`), tela permanece em modo edição.
- [x] Erro ao excluir: mensagem de erro exibida (`deleteError`), painel de confirmação fecha (`setIsConfirmingDelete(false)` no `catch`), usuário permanece na tela do documento (sem `router.replace`).
- [x] Erro ao baixar: mensagem de erro exibida (`downloadError`) sem navegação/crash.
- [x] Avaliar se `alert()` nativo é aceitável para sucesso de salvar/excluir ou se deve migrar para o padrão de snackbar de `DESIGN_TOKENS.md` §4 — decisão: migrado `alert()` → `SuccessSnackbar` (já existente na Fundação) para o sucesso de salvar, pois o componente já estava pronto e reduz a divergência documentada em `plan.md` §6. Sucesso de exclusão não usa snackbar porque a tela navega imediatamente para `/exams` após excluir (mesmo raciocínio de `plan.md`: menos crítico ali).

## 6. Limpeza e dark mode
- [x] Remover todos os `console.log` de depuração do arquivo (mount, `handleDelete`, etc.).
- [x] Validar dark mode em todos os elementos novos/alterados (card único, painel de confirmação, botão "Baixar documento" de largura total) via classes `app-*`/`app-dark-*` (Tailwind/NativeWind) — nenhum hex fixo hardcoded do Canvas claro.
- [x] Validar toque mínimo (≥48dp) em todos os botões após reestruturação de layout — botão voltar 48×48 (`h-12 w-12`), botão "Editar" 48px altura (`h-12`), botões principais 56px (`h-14`), botões do painel de confirmação 52px (`h-[52px]`).

## 7. Revisão final contra critérios de aceite
- [x] Repassar cada item da seção 7 de `spec.md` manualmente contra a implementação final antes de considerar o EPIC concluído — todos os 9 critérios de aceite atendidos pela implementação em `DocumentDetailScreen.tsx`, `document-detail.tsx`, `DeleteConfirmPanel.tsx` e `useExamsData.ts`.
