# PLAN: Exames & Receitas — Adicionar documento (preview e tipo)

## 1. Diagnóstico — o que já existe vs. o que falta

`src/screens/AddExamScreen.tsx` (atual) já implementa boa parte da estrutura funcional descrita no Canvas 3b — os quatro grupos de campo (preview, tipo, nome, datas) existem — mas diverge em pontos concretos de comportamento e visual. Comparação elemento a elemento:

| Elemento do Canvas 3b | Existe hoje em `AddExamScreen.tsx`? | Divergência |
|---|---|---|
| Card de preview (nome + tamanho + ícone) | **Sim** — `fileCard`/`filePreview`, mostra `fileName` e `(fileSize / 1024).toFixed(1)} KB` | Divergência de unidade: Canvas mostra "1,2 MB" (megabytes), código sempre mostra KB mesmo para arquivos grandes — não é formatação adaptativa. Gap cosmético, fácil de corrigir. |
| Botão "×" remover arquivo no card | **Não funcional** — existe um `Pressable` (`reuploadButton`) com ícone `create-outline` (lápis), mas **sem `onPress`** | **Gap real**: o botão não faz nada hoje. O Canvas define claramente um "×" que remove o arquivo selecionado (o glifo `×`, não um lápis de edição — não há conceito de "reenviar" em 3b, o fluxo de reenvio pertence à 3a). Precisa virar um `Ionicons name="close"` com `onPress` que descarta a seleção (`router.back()` para 3a, já que não há como trocar de arquivo nesta tela sem reabrir o picker). |
| Toggle "Tipo de documento" (Exame/Receita) | **Sim, funcionalmente equivalente** — dois `Pressable` com estado `documentType === 'exam' \| 'prescription'` | Divergência visual: Canvas usa blocos simples (altura 56px, só texto, borda/bg/texto dinâmicos) — código atual usa blocos mais altos (`paddingVertical: SIZES.large`) com ícones (`flask-outline`/`medkit-outline`) acima do texto. Não é uma regra de conteúdo (ainda comunica seleção com borda+bg+texto, respeitando "nunca cor sozinha"), mas diverge da altura/densidade do Canvas. Recomendação: ajustar para altura ~56px e remover ou manter ícones como melhoria intencional documentada (ambiguidade — ver §4). |
| Nenhum tipo pré-selecionado ao abrir | **Sim** — `useState<DocumentTypeState>(null)` | Fiel ao Canvas (nenhum toggle vem marcado por padrão). |
| Campo "Nome do documento" | **Sim** — `FormField` | Fiel; placeholder atual ("ex: Hemograma, Tomografia, Receita de Amoxicilina") é mais longo que o do Canvas ("Ex.: Hemograma completo") — divergência de copy, não de comportamento. |
| Campo "Data do documento" | **Sim** — `DateInput`, default `getTodayDate()` | Fiel ao padrão visual; Canvas não deixa claro se vem pré-preenchida com a data de hoje (`addDocDate` sem valor inicial explícito no markup) — interpretação atual (default hoje) é razoável e documentada como decisão (regra 8 da constituição). |
| Campo condicional "Data de validade" (`sc-if addShowExpiry`) | **Sim** — `documentType === 'prescription' && <DateInput .../>` | Fiel — mesma lógica condicional do Canvas. |
| Botão "Salvar documento" com estilo dinâmico habilitado/desabilitado (`addSaveBg`/`addSaveFg`) | **Não** — hoje usa o componente `Button` compartilhado com `disabled={isSubmitting}` **apenas** (bloqueia só durante o próprio submit, não por campos faltando) | **Gap real, o mais importante do EPIC**: o botão está sempre com a aparência "habilitado" (verde) mesmo com `documentType`, `documentName` ou `documentDate` vazios. A única validação de campos obrigatórios ocorre dentro de `createExamDocument()` → `validateExamDocument()`, que lança uma exceção capturada em `AddExamScreen.handleSubmit` e mostrada via `alert()` **depois** que o usuário já tocou "Salvar" — replica exatamente o padrão "reativo" que a EPIC de Cadastro (1d) já identificou e corrigiu para o botão "Criar conta". O Canvas exige o padrão preventivo (botão cinza + só habilita quando os campos obrigatórios estão completos), não implementado aqui. |
| Header (seta `‹` 48×48 + título, sem subtítulo) | **Parcialmente** — existe seta de voltar, mas em círculo 40×40 sem borda (`backButton`), e há um subtítulo extra "Configure os detalhes do seu arquivo" que não existe no Canvas | Divergência estrutural pequena — alinhar ao Canvas é direto (ajustar dimensões/borda do botão de voltar, remover subtítulo) ou documentar como melhoria intencional (ambiguidade, ver §4). |
| Card informativo de segurança no rodapé ("Seus documentos serão salvos de forma segura...") | **Existe no código, não existe no Canvas 3b** | Elemento adicionado além do design — não é um erro de fidelidade grave (é informativo, não contradiz nenhuma regra), mas diverge da regra 1 da constituição ("fidelidade... equivalente, não apenas parecido"). Decisão proposta: manter como melhoria intencional documentada (LGPD/transparência), já que reforça a regra 4 da constituição sobre dados sensíveis — mas registrar a exceção explicitamente. |

### Resumo do gap real de comportamento (não apenas visual)
1. **Botão "remover" no preview não tem ação** (`onPress` ausente) — hoje é UI morta.
2. **Botão "Salvar documento" não reflete estado de validade do formulário** — sempre parece habilitado; validação só aparece via `alert()` reativo pós-toque, igual ao gap já corrigido em Cadastro (1d). Este é o gap mais próximo do "núcleo do MVP" citado em `GAP_ANALYSIS.md` (P0).
3. **Sem revalidação de tipo de arquivo em `examService.ts`/`AddExamScreen.tsx`** — a única barreira contra arquivos fora de PDF/imagem é o filtro `type: ['application/pdf', 'image/*']` do `DocumentPicker.getDocumentAsync()` **na tela 3a** (`ExamsScreen.tsx`, linha ~55). `AddExamScreen` recebe `fileName`/`filePath`/`fileSize` como params de rota já confiando cegamente nesse filtro do picker — não há checagem de extensão/MIME antes de `uploadFileToS3()`. Ver §2 (Requisitos não-funcionais) do `spec.md`.
4. **Sem limite de tamanho de arquivo em lugar nenhum do código** — busca completa em `examService.ts`, `ExamsScreen.tsx`, `AddExamScreen.tsx`, `amplify/storage/resource.ts` não encontrou nenhuma constante ou checagem de tamanho máximo. Este é o maior gap de robustez do EPIC: hoje um usuário pode selecionar um arquivo arbitrariamente grande e o único limite prático seria um timeout de rede não tratado especificamente.

## 2. Validação de tipo de arquivo — estado real (não presumido)

Verificado em `src/screens/ExamsScreen.tsx` (linha 55-58) e `src/screens/ChatBotScreen.tsx` (linha 52-53, uso similar para outro fluxo de upload):

```ts
const result = await DocumentPicker.getDocumentAsync({
  type: ['application/pdf', 'image/*'],
  copyToCacheDirectory: false,
});
```

Isso restringe a **seleção** no picker nativo, mas:
- `image/*` aceita qualquer subtipo de imagem (incluindo formatos não desejados como `image/heic`, `image/webp`, `image/gif`), não apenas JPG/PNG — mais permissivo do que "JPG/PDF" citado no prompt original desta tarefa.
- Nenhuma camada depois do picker (nem `AddExamScreen.tsx`, nem `examService.ts`) valida `fileName`/extensão/MIME novamente antes de `uploadFileToS3()`. O `Blob` é montado a partir de `filePath` sem checagem de tipo.
- Em `amplify/storage/resource.ts`, as regras de acesso (`allow.authenticated.to(['read','write','delete'])`) não impõem nenhuma restrição de content-type no bucket S3 — a validação de tipo, se reforçada, precisa ser client-side (ou em uma função Lambda/trigger, fora de escopo deste EPIC pela regra 3 da constituição de não expandir a stack sem justificativa).

**Conclusão**: a validação de tipo de arquivo hoje é **incompleta** — existe só como filtro de conveniência do seletor nativo, contornável (ex.: em alguns pickers/plataformas o filtro é apenas uma sugestão de UI, não uma garantia; e mesmo quando efetivo, `image/*` é mais amplo que "JPG apenas"). Este EPIC deve adicionar uma segunda camada de validação explícita em `examService.ts` (ex.: nova função `validateFileType(fileName: string): boolean` checando extensão contra uma allowlist `['pdf', 'jpg', 'jpeg', 'png']`), chamada em `createExamDocument()` antes do upload.

## 3. Validação de tamanho de arquivo — não encontrada, precisa ser introduzida

Nenhum limite de tamanho existe hoje. Proposta técnica (a confirmar com o time, registrada como decisão de escopo):
- Limite: **10 MB** por arquivo (`MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024`), valor razoável para documentos médicos escaneados/fotografados sem estar documentado em nenhuma fonte do design (o Canvas não especifica um limite — ambiguidade documentada, regra 8 da constituição).
- Ponto de checagem: `AddExamScreen.tsx` já recebe `fileSize` como param de rota (vindo do `DocumentPicker.getDocumentAsync()` result, campo `asset.size`) — a validação pode ocorrer **antes mesmo de navegar para 3b** (em `ExamsScreen.tsx`, rejeitando a seleção com um alerta) e/ou como segunda camada em `examService.ts`/`validateExamDocument()`, consistente com a validação de tipo (defesa em profundidade, mesmo padrão já usado no EPIC de Cadastro para `mismatch`/`notAllOk`).

## 4. Abordagem técnica

1. **Não introduzir biblioteca nova** (regra 3 da constituição) — todos os gaps são resolvidos com state React local e pequenas funções puras em `examService.ts`:
   - Botão desabilitado dinâmico: derivar `isFormValid = Boolean(documentType && documentName.trim() && documentDate && (documentType !== 'prescription' || expirationDate))` em `AddExamScreen.tsx`, reaproveitando exatamente a mesma lógica que `validateExamDocument()` já expressa no service — evitar duplicar regras (extrair para uma função exportada de `examService.ts`, ex. `isExamDocumentComplete(input): boolean`, usada tanto no client-side quanto internamente por `validateExamDocument`).
   - Verificar se `Button` (componente compartilhado, já usado no EPIC de Cadastro) suporta um estado "disabled com motivo" — reaproveitar antes de estilizar manualmente.
   - Botão remover arquivo: adicionar `onPress={() => router.back()}` ao ícone existente, trocando `create-outline` (lápis) por `close`/`close-circle-outline` (×) para bater com o glifo do Canvas.
2. **Validação de tipo de arquivo**: nova função `validateFileType(fileName: string): boolean` em `examService.ts` (allowlist de extensões `pdf`, `jpg`, `jpeg`, `png`), chamada em `validateExamDocument()` ou como etapa própria em `createExamDocument()` antes de `uploadFileToS3()`. Mensagem de erro amigável, nunca a exceção crua do fetch/upload.
3. **Validação de tamanho de arquivo**: nova constante `MAX_FILE_SIZE_BYTES` + checagem em `validateExamDocument()` (ou função irmã `validateFileSize`), usando o `fileSize` já recebido via params de rota — sem necessidade de ler o arquivo de novo.
4. **Formatação adaptativa de tamanho no preview**: pequena função de formatação (KB abaixo de 1024 KB, MB acima) para bater com o "1,2 MB" do Canvas, em vez do KB fixo atual.
5. **Nenhuma mudança de schema/backend necessária** — `MedicalDocument` (DynamoDB) e `medical-documents/{owner}/*` (S3) já suportam o fluxo; este EPIC é validação client-side + UI, não uma mudança de modelo de dados.
6. **Header e card informativo**: ajustes visuais (dimensão do botão de voltar, remoção/manutenção do subtítulo e do card de segurança) ficam como decisão de produto a confirmar — recomendação é alinhar ao Canvas removendo o subtítulo extra, mas manter o card informativo de segurança como melhoria intencional documentada (reforça LGPD/regra 4 da constituição), já que remover uma informação de transparência ao usuário não tem benefício claro.

## 5. Riscos / pontos de atenção
- A allowlist de extensões de arquivo (`pdf`, `jpg`, `jpeg`, `png`) é uma interpretação de "JPG/PDF" combinada com o filtro `image/*` já existente no picker — se o time quiser aceitar outros formatos de imagem (ex. `heic`, comum em iPhones), essa lista precisa ser revisada antes de travar a validação, para não quebrar uploads que hoje passam pelo picker mas seriam rejeitados pela nova checagem client-side.
- O limite de 10 MB é uma proposta sem confirmação no design ou em qualquer doc do projeto — deve ser validado com o time/orientador do TCC antes de travar definitivamente (ambiguidade documentada, regra 8).
- Se `Button` (componente compartilhado) precisar ganhar um novo estado "disabled com motivo" para esta tela, isso afeta outras telas que já o consomem (mesmo risco já registrado no EPIC de Cadastro) — não duplicar lógica de "botão cinza" isoladamente dentro de `AddExamScreen.tsx`.
- Extrair a lógica de "documento completo" (`isExamDocumentComplete`) para `examService.ts` evita duplicação entre a checagem visual do botão (client-side, antes do toque) e a validação de negócio (`validateExamDocument`, chamada dentro de `createExamDocument`) — importante manter as duas em sincronia; um teste ou comentário cruzado evita divergência futura.
- O botão "remover arquivo" navegando via `router.back()` assume que a pilha de navegação sempre tem 3a como tela anterior — válido hoje (única origem de `/add-exam` é o bottom sheet de 3a), mas se outra origem for adicionada no futuro isso precisa ser revisitado.
