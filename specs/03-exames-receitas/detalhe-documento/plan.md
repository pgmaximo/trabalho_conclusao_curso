# PLAN: Detalhe do documento — visualizar/editar/excluir

## 1. Diff — Canvas 3c × `DocumentDetailScreen.tsx` atual

| Aspecto | Canvas 3c (alvo) | `src/screens/DocumentDetailScreen.tsx` (atual) | Gap |
|---|---|---|---|
| Modos visualização/edição/exclusão | 4 estados explícitos via `sc-if`: `docViewMode`, `docEditing`, `docNotConfirmingDelete`, `docConfirmDelete` | Já existe `isEditMode` (bool) controlando view vs. edit, e `isDeleting` (bool de loading, não de "confirmação aberta") | **Parcial.** View/Edit já existem e funcionam. O 4º estado (`docConfirmDelete` — painel de confirmação inline) **não existe**; hoje a confirmação é feita via `Alert.alert`/`window.confirm` nativo (`confirmDeletion()`), não um painel na própria tela. |
| Botão "Editar" no cabeçalho | Botão outline no canto superior direito do header, visível só em `docViewMode` | Não existe no cabeçalho — hoje "Editar documento" é um botão de largura total no rodapé, junto de "Deletar documento" | **Gap de estrutura.** Precisa mover o gatilho de edição para o cabeçalho (outline, `#1B63C4`) e reorganizar os botões de rodapé para bater com o Canvas (rodapé passa a ter só "Baixar documento" + "Excluir documento" em view, "Cancelar"/"Salvar" em edit). |
| Card somente-leitura (Tipo/Nome/Data) | Um único card com 3 linhas rotuladas empilhadas, separadas por divisor | Hoje são blocos separados: um "tipo" com ícone+texto fora de card, e campos "readOnlyField" individuais (não um card único com divisores) | **Gap visual/estrutural**, sem gap de dado — os mesmos 3 campos já são exibidos, só não no layout de card único do Canvas. Ajustar em implementação, não é mudança de contrato de dados. |
| Botão "Baixar documento" | Outline verde, largura total, dentro do fluxo de visualização, com ícone de seta | Existe hoje como botão circular pequeno (36×36, "⬇️") dentro do card de preview do arquivo, não como botão de largura total separado | **Gap visual.** Comportamento (`getDocumentDownloadUrl` + `Linking.openURL`) já está correto — só precisa virar um botão de largura total no lugar certo do fluxo. |
| Confirmação de exclusão | Painel inline (`#FDECEA`/`#F3C9C5`, ícone "!", texto padrão, botões Cancelar/Excluir 52px) — mesmo padrão reutilizado em 2e/3g, documentado em `DESIGN_TOKENS.md` §4 | `confirmDeletion()` usa `Alert.alert` (nativo iOS/Android) ou `window.confirm` (web) — **não** é o painel inline do Canvas | **Maior gap funcional/visual.** Precisa substituir `confirmDeletion()` por um estado `isConfirmingDelete` que renderiza o painel inline, e mover a chamada real a `deleteExamDocument` para o botão "Excluir" do painel. |
| Exclusão remove S3 + DynamoDB | Não desenhado no Canvas (é comportamento de backend, fora do escopo visual) — mas exigido pela regra 5 da constituição e pelo prompt deste EPIC | `deleteExamDocument(documentId, s3FileName)` em `src/services/examService.ts` **já remove dos dois lados**: (1) `remove({ path: 'medical-documents/{owner}/${s3FileName}' })` no S3, depois (2) `client.models.MedicalDocument.delete({ id: documentId })` no DynamoDB — nessa ordem, com erro propagado se qualquer etapa falhar | **Sem gap funcional — já implementado corretamente hoje.** Confirmado por leitura direta do código (`examService.ts` linhas 362-395). Este EPIC não precisa alterar `examService.ts` para este ponto; só precisa preservá-lo. |
| Invalidação de cache pós-edição/exclusão | Não desenhado no Canvas (comportamento de dados) | `handleSave()` chama `invalidateExamsCache()` após `updateExamDocument` (linha 73); `deleteExamDocument()` já chama `invalidateExamsCache()` internamente antes de retornar (linha 388 de `examService.ts`) | **Sem gap — já implementado em ambos os fluxos.** Preservar exatamente como está. |
| Fallback de deep link vazio | Não desenhado no Canvas (é uma tela sempre populada nos mocks do design) — mas é uma pendência técnica explícita em `GAP_ANALYSIS.md`/`CODE_INVENTORY.md` §6 | `src/app/(app)/document-detail.tsx`: `if (!selectedDocument) { return null; }` — tela em branco se o `DocumentContext` estiver vazio | **Gap real, confirmado.** Não há `id` de rota, não há fetch alternativo, não há redirect. Esta é a pendência priorizada P0 pelo prompt deste EPIC — ver seção 3. |
| Console.logs de debug | N/A | `DocumentDetailScreen.tsx` tem `console.log`s de depuração no mount e em `handleDelete` (linhas 57-59, 85-87, 92, 96) | Não é um gap de design, mas deve ser removido/limpo durante a implementação (higiene de código, não bloqueante para a spec). |

## 2. Confirmação: exclusão já limpa S3 + DynamoDB hoje

Resposta direta ao pedido do prompt: **sim, `deleteExamDocument` já remove tanto o arquivo do S3 quanto a linha do DynamoDB hoje**, na ordem S3 → DynamoDB, com invalidação de cache ao final. Não é um gap funcional deste EPIC. O único risco documentado (não bloqueante, ver `spec.md` §6) é a ausência de rollback: se o S3 for removido mas o DynamoDB falhar, o registro órfão permanece no banco apontando para um arquivo que não existe mais — cenário raro, propagado como erro para a UI, mas não tratado com compensação automática. Registrar como limitação conhecida, não como trabalho deste EPIC (mudança de schema/transação é decisão maior, fora do escopo de "fidelidade de UI").

## 3. Correção do fallback de deep link vazio

Duas opções avaliadas:

**Opção A — Redirect simples para `/exams`** (menor esforço, resolve o requisito mínimo do prompt/spec):
```tsx
// src/app/(app)/document-detail.tsx
if (!selectedDocument) {
  return <Redirect href="/exams" />;
}
```
Prós: elimina a tela em branco com uma linha, sem exigir nova query de rede. Contras: perde o documento se o usuário realmente tinha um deep link válido para um `id` específico (ex.: notificação push, link compartilhado) — silenciosamente manda para a lista sem explicar por quê.

**Opção B — `id` de rota + fetch quando o contexto está vazio** (mais completo, alinhado ao espírito "nunca tela em branco, nunca redirect sem explicação" do prompt):
1. Ao navegar de 3a/Home para `document-detail`, além de `setSelectedDocument(doc)`, passar também `?id={doc.id}` na URL (`router.push({ pathname: '/document-detail', params: { id: doc.id } })`).
2. Em `document-detail.tsx`, ler `id` via `useLocalSearchParams()`.
3. Se `selectedDocument` existe no contexto **e** bate com `id` (ou `id` ausente, fluxo de navegação interna normal) → renderiza normalmente (caminho atual, sem mudança de comportamento).
4. Se `selectedDocument` está vazio mas `id` está presente na URL (deep link/cold start) → dispara uma busca pontual (reaproveitando `client.models.MedicalDocument.get({ id })` via Amplify, ou filtrando o resultado já cacheado de `useExamsData`) enquanto mostra o estado "Carregando" padrão (`DESIGN_TOKENS.md` §4); em sucesso, popula `setSelectedDocument` e renderiza; em erro/não encontrado, mostra o estado "Erro" padrão ("Documento não encontrado" + botão "Voltar para Exames").
5. Se **nem** `selectedDocument` **nem** `id` estão presentes (acesso direto à rota sem nenhum contexto) → `Redirect` para `/exams`.

**Decisão desta spec: Opção B**, por ser a única que atende literalmente ao critério de aceite "redirecionar para 3a **ou** mostrar um estado de erro claro, nunca uma tela em branco" nos dois sub-casos (com e sem `id` resolvível), e por ser consistente com a regra 1 da constituição (fidelidade ao padrão de 4 estados já documentado para todo o app). Custo extra: precisa de uma função de busca por `id` — pode ser um novo `getDocumentById(id)` em `examService.ts` (usando `client.models.MedicalDocument.get`) ou reaproveitar o array já carregado por `useExamsData` quando disponível (mais barato, evita nova chamada de rede se a lista já estiver em cache). Detalhar a escolha final em `tasks.md`.

Nenhuma mudança de schema é necessária — `MedicalDocument.id` já existe e já é a chave usada por `update`/`delete`.

## 4. Substituir o diálogo de exclusão nativo pelo padrão inline

Hoje `confirmDeletion()` (linhas 30-43 de `DocumentDetailScreen.tsx`) usa `Alert.alert` (nativo) ou `window.confirm` (web) — funcional, mas não corresponde ao Canvas 3c nem ao padrão documentado em `DESIGN_TOKENS.md` §4 ("Confirmation/delete dialogs"), que já foi implementado como painel inline em outras specs do mesmo padrão (2e, 3g — quando implementadas). Proposta:
- Introduzir estado `isConfirmingDelete: boolean`.
- Botão "Excluir documento" (view mode, fora de edição) → `setIsConfirmingDelete(true)` em vez de chamar `confirmDeletion()` diretamente.
- Renderizar o painel vermelho inline quando `isConfirmingDelete === true`, com "Cancelar" (`setIsConfirmingDelete(false)`) e "Excluir" (chama `deleteExamDocument` de verdade, com loading `isDeleting`).
- Remover `confirmDeletion()`/`Alert`/`window.confirm` deste fluxo específico — não há motivo para manter dois mecanismos de confirmação simultâneos, e o painel inline é mais fiel ao design system do app (regra 1 da constituição).
- Reaproveitar o mesmo padrão de card vermelho já usado (ou a ser usado) por 2e/3g, para não duplicar estilo — se um componente `DeleteConfirmPanel` compartilhado ainda não existir na Fundação, este EPIC pode ser o primeiro a criá-lo em `src/components/`, documentando essa decisão de reuso (regra 3 da constituição: só introduzir componente novo se preencher lacuna real).

## 5. Reaproveitamento de componentes existentes

- `Card`, `Button`, `FormField`, `DateInput` já são usados em `DocumentDetailScreen.tsx` e cobrem a maior parte da reestruturação de layout — não é necessário criar componentes novos além do possível `DeleteConfirmPanel` (item 4).
- `useThemeColors()` já é usado para todo o styling — preservar para dark mode.
- `getDocumentDownloadUrl`, `updateExamDocument`, `deleteExamDocument`, `invalidateExamsCache` de `examService.ts`/`useExamsData.ts` são reaproveitados sem alteração de assinatura.

## 6. Riscos e decisões

- **Risco de custo de rede extra na Opção B**: buscar o documento por `id` quando o contexto está vazio pode duplicar uma chamada já coberta por `useExamsData` se a lista de exames já estiver em memória/cache. Mitigar checando primeiro se há um cache de exames carregado (via hook) antes de disparar uma nova query individual — detalhar em `tasks.md`, não bloqueante para a spec.
- **Ambiguidade sobre Data de validade no card somente-leitura**: o Canvas 3c mostra só 3 linhas fixas (Tipo/Nome/Data) no card de visualização, sem uma 4ª linha explícita para "Data de validade" mesmo quando o documento é uma receita — mas o modo edição do Canvas 1e (referência genérica de padrão) e o comportamento já implementado hoje (`expirationDate && (...)`) mostram esse campo condicionalmente. **Decisão (regra 8 da constituição): manter a 4ª linha condicional no card de visualização quando `documentType === 'prescription'` e `expirationDate` existe**, seguindo o mesmo padrão visual das outras 3 linhas — mais coerente com o restante do app (3b/AddExamScreen já trata esse campo como condicional) do que omitir um dado real existente.
- **Snackbar de sucesso vs. `alert()` nativo**: o código atual usa `alert()` do navegador (funciona em web, mas não é idiomático em React Native puro) para sucesso de salvar/excluir. `DESIGN_TOKENS.md` §4 documenta um padrão de snackbar verde-escuro para sucesso, "4s no rodapé, acima da barra de abas". Recomendação: migrar para esse padrão de snackbar **se** já existir um componente compartilhado da Fundação (`Snackbar`/`Toast`); caso contrário, manter `alert()` como comportamento temporário documentado (não bloqueante para este EPIC, já que a exclusão navega imediatamente para 3a após sucesso, tornando o snackbar menos crítico ali do que no fluxo de salvar).
- **Limpeza de `console.log`s de depuração**: remover os logs de debug (`console.log('=== DocumentDetailScreen Mounted ===')` etc.) durante a implementação — não é uma decisão de design, é higiene de código.
- **Escopo explicitamente fora deste EPIC**: alterar `updateExamDocument`/`deleteExamDocument` em `examService.ts` (já corretos); trocar o arquivo/preview real do documento por uma miniatura de fato renderizada (o Canvas usa um placeholder hachurado decorativo, preservar como placeholder); criar o componente `DeleteConfirmPanel` compartilhado como uma tarefa de Fundação formal (pode nascer aqui, mas sua generalização para 2e/3g é decisão de quem implementar essas specs).
