# EPIC: Exames & Receitas — Adicionar documento (preview e tipo)

## 1. Identificação
- Bloco/arquivo de origem no Claude Design: Tela 3b ("Adicionar documento — preview e tipo") em `specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html` (linhas 293-324, imediatamente antes de 3c "Detalhe do documento")
- Rota/arquivo no código (existente): `src/app/add-exam.tsx` (rota `/add-exam`) → `src/screens/AddExamScreen.tsx` (`AddExamScreen`)
- Ator(es): usuário final autenticado — qualquer pessoa que já selecionou um arquivo (PDF/imagem) na tela 3a e chegou aqui para classificá-lo e salvá-lo como exame ou receita.

## 2. História da funcionalidade
Como usuário autenticado que acabou de escolher um arquivo (PDF ou imagem) na tela "Exames & Receitas" (3a), quero revisar o arquivo selecionado, escolher se é um Exame ou uma Receita, dar um nome e uma data ao documento (e, se for receita, uma data de validade), e só então confirmar o salvamento — para que o documento fique corretamente classificado e persistido no meu histórico médico, com feedback claro se algo estiver faltando ou se o upload falhar.

### Cenários (Given/When/Then)
- **Chegada com arquivo válido pré-selecionado:** Dado que o usuário veio da tela 3a com um PDF ou imagem já escolhido no seletor de arquivos do sistema, quando a tela 3b abre, então o card de preview mostra o nome do arquivo e o tamanho (ex.: "1,2 MB"), com um botão "remover" (×) visível — sem tipo, nome ou data pré-preenchidos além da data do documento (default hoje).
- **Upload de PDF válido:** Dado que o arquivo selecionado é um PDF (`application/pdf`), tipo/nome/data preenchidos, quando o usuário toca em "Salvar documento", então o arquivo é enviado ao S3 (`medical-documents/{owner}/...`), os metadados são gravados no DynamoDB (`MedicalDocument`), o cache de exames é invalidado, e o usuário retorna à tela anterior (3a) vendo o novo documento na lista.
- **Upload de imagem válida:** Dado que o arquivo selecionado é uma imagem aceita (ex.: `image/jpeg`), demais campos preenchidos, quando o usuário toca em "Salvar documento", então o mesmo fluxo de upload+persistência do cenário acima ocorre com sucesso.
- **Tipo de arquivo inválido rejeitado:** Dado que o usuário tentou selecionar um arquivo fora dos tipos aceitos (ex.: `.docx`, `.zip`) no seletor da tela 3a, quando o sistema operacional/seletor de documentos filtra por `type: ['application/pdf', 'image/*']`, então o arquivo nem chega a ser listado como selecionável — e, como camada de defesa adicional nesta tela (3b) e em `examService.ts`, um arquivo com MIME type fora da lista permitida deve ser rejeitado antes do upload ao S3, com mensagem clara ("Formato de arquivo não suportado. Envie um PDF ou imagem (JPG/PNG).") em vez de falhar silenciosamente ou gerar um objeto S3 órfão.
- **Upload falha (erro de rede/S3):** Dado que todos os campos obrigatórios estão preenchidos e o usuário toca em "Salvar documento", quando a chamada `uploadData` ao S3 falha (rede indisponível, erro de permissão, timeout), então o botão sai do estado de carregamento, uma mensagem de erro específica é exibida ("Falha no upload para S3: ...") sem persistir metadados órfãos no DynamoDB (nenhum registro `MedicalDocument` é criado se o upload não completou), e o usuário permanece na tela 3b podendo tentar novamente sem perder os campos já preenchidos.
- **Campos obrigatórios faltando (nome/data):** Dado que o usuário toca em "Salvar documento" sem ter preenchido "Nome do documento" e/ou "Data do documento" (ou sem ter escolhido Tipo), quando a validação roda, então o botão "Salvar documento" permanece/aparece no estado visualmente desabilitado (bg `#DFE3E1`, texto `#7A8480`, conforme `DESIGN_TOKENS.md`) enquanto os campos obrigatórios não estiverem completos — o salvamento não deve depender apenas de um alerta reativo pós-toque.
- **`expirationDate` obrigatório apenas para Receita:** Dado que o usuário selecionou Tipo = "Exame", quando ele preenche nome e data do documento, então o campo "Data de validade" não é exibido e não é exigido para habilitar "Salvar documento". Dado que o usuário selecionou Tipo = "Receita", quando ele tenta salvar sem preencher "Data de validade", então o botão permanece desabilitado (ou a validação bloqueia o envio) até que a data de validade seja informada — espelhando a regra já existente em `validateExamDocument()` (`documentType === 'prescription' && !expirationDate` → erro).
- **Remover arquivo selecionado:** Dado que o usuário toca no botão "×" (remover) no card de preview, quando a ação é confirmada, então o usuário retorna à tela anterior (3a) para escolher outro arquivo — hoje esse botão existe apenas como um ícone de "editar" (lápis) sem `onPress`, o que é um gap funcional real (ver `plan.md`).
- **Alternância de tipo depois de já ter preenchido validade (Receita → Exame):** Dado que o usuário selecionou "Receita" e já digitou uma "Data de validade", quando ele muda o tipo para "Exame", então o campo "Data de validade" é ocultado (o valor pode ser descartado do payload de envio, já que `examService.ts` só persiste `expirationDate` quando `documentType === 'prescription'`).

## 3. Estrutura da página
- **Header**: botão de voltar (`‹`, 48×48px, borda `#DFE3E1`, bg branco) + título "Adicionar documento" (600 20px) — sem subtítulo no Canvas.
- **Card de preview do arquivo** (altura 120px, fundo hachurado `repeating-linear-gradient` sobre `#EFF1F0`/`#F7F8F7`, borda 1.5px `#DFE3E1`, radius 16px):
  - Ícone de documento (retângulo 52×64px, borda 2px `#55605C`, bg branco).
  - Nome do arquivo (600 17px, ex.: "exame_hemograma.pdf") + tamanho (400 16px `#55605C`, ex.: "1,2 MB").
  - Botão remover (círculo 32×32px, bg `#F7F8F7`, borda 1.5px `#DFE3E1`, glifo "×" 16px `#55605C`).
- **Rótulo "Tipo de documento"** (600 16px `#363D3B`).
- **Toggle segmentado Exame/Receita** (dois blocos lado a lado, altura 56px, radius 14px, gap 8px):
  - Não selecionado: borda 1.5px `#DFE3E1`, bg branco, texto 600 16px cor neutra.
  - Selecionado: borda 1.5px `#10794E`, bg `#E8F5EE`, texto 600 16px `#0C6341`.
- **Campo "Nome do documento"** (label 600 16px + input altura 52px, radius 14, borda `#DFE3E1`, placeholder "Ex.: Hemograma completo").
- **Campo "Data do documento"** (mesmo padrão visual, placeholder "dd/mm/aaaa").
- **Campo condicional "Data de validade"** (`sc-if addShowExpiry`) — mesmo padrão visual, exibido **apenas** quando Tipo = Receita, placeholder "dd/mm/aaaa".
- **Botão primário "Salvar documento"** (altura 56px, radius 14, bg/texto dinâmicos: verde+branco quando todos os campos obrigatórios estão preenchidos, cinza `#DFE3E1`/texto `#7A8480` quando não).
- **Barra home-indicator** (130×5px, `#C3C9C6`) — decorativa.

Nota: o Canvas de 3b **não** desenha um texto de apoio abaixo do botão desabilitado (diferente do padrão do botão de cadastro em 1d) nem um card informativo de segurança — ambos existem hoje na implementação (`AddExamScreen.tsx`) como elementos adicionados além do design; ver `plan.md` §3 para a decisão sobre mantê-los.

## 4. Mapa de navegação
| Origem | Destino | Trigger |
|---|---|---|
| `/exams` (3a, bottom sheet "Enviar PDF/imagem" ou "Capturar com câmera") | `/add-exam` | Seleção de arquivo bem-sucedida no `DocumentPicker` (`router.push({ pathname: '/add-exam', params: { fileName, filePath, fileSize } })`) |
| `/add-exam` | `/exams` (volta) | Toque no botão de voltar (`‹`) — `router.back()` |
| `/add-exam` | `/exams` (volta) | Toque no botão "×" remover arquivo — hoje **não implementado** (gap); comportamento esperado é descartar a seleção e voltar para 3a, ou limpar os params e permitir nova seleção sem sair da tela (ambiguidade documentada em §8) |
| `/add-exam` | `/exams` (volta) | `createExamDocument()` bem-sucedido (`router.back()` após salvar) — o Canvas nomeia como destino conceitual "3c" (detalhe do documento), mas o código atual sempre retorna à lista, não navega ao detalhe recém-criado |
| `/add-exam` | (permanece na tela) | Falha de validação local (campos obrigatórios faltando) ou erro do backend (upload S3, DynamoDB) — mensagem de erro exibida via `alert()`, nenhuma navegação ocorre |

## 5. Mapa de dados
| Campo/estado | Fonte | Observação |
|---|---|---|
| `fileName`, `filePath`, `fileSize` | Params de navegação vindos de `expo-document-picker` (tela 3a) | Serializados como string pelo Expo Router; `fileSize` convertido para `Number` na rota |
| `documentType` (`'exam' \| 'prescription'`) | State local (`useState<DocumentTypeState>(null)`) | Corresponde a `addExame`/`addReceita` do Canvas; hoje inicia `null` (nenhum tipo pré-selecionado), enviado como `'exam'` por padrão se o usuário não escolher (`documentType \|\| 'exam'` em `handleSubmit`) — ver gap em `plan.md` |
| `documentName` | Input local (state React) | Vai para `MedicalDocument.documentName` (obrigatório no schema Amplify) |
| `documentDate` | State local, default `getTodayDate()` (`YYYY-MM-DD`) | Vai para `MedicalDocument.documentDate` (`a.date().required()`) |
| `expirationDate` | State local, exibido apenas quando `documentType === 'prescription'` | Vai para `MedicalDocument.expirationDate` (`a.date()`, opcional no schema, mas obrigatório na regra de negócio para receitas via `validateExamDocument`) |
| Arquivo binário | Lido de `filePath` (blob no web, base64 no nativo via `expo-file-system`) | Enviado ao S3 via `uploadData` em `medical-documents/{owner}/${s3FileName}` (`examService.ts`) — fonte real, sem mock |
| `MedicalDocument` (linha DynamoDB) | `client.models.MedicalDocument.create(...)` (Amplify Data, `amplify/data/schemas/medical-documents.ts`) | Owner-based (`allow.owner()`) — cada usuário só vê/edita seus próprios documentos |
| Cache local de exames | `AsyncStorage` (`@SuaSaude:examsCache`), invalidado via `invalidateExamsCache()` após criar | Garante que a tela 3a mostre o documento novo sem refetch manual do usuário |

## 6. Requisitos não-funcionais específicos
- **Validação de tipo de arquivo (regra 1 e 5 da constituição)**: apenas PDF (`application/pdf`) e imagens (JPG/PNG — `image/*` no filtro atual do `DocumentPicker`) são aceitos. Hoje essa restrição existe **apenas** no filtro do seletor nativo (`type: ['application/pdf', 'image/*']`, em `ExamsScreen.tsx`, tela 3a) — não há nenhuma revalidação de MIME type em `AddExamScreen.tsx` nem em `examService.ts` antes do upload ao S3. Isso é uma lacuna real: um arquivo malformado, um MIME type spoofado, ou uma extensão fora do esperado (o filtro do picker pode ser contornado dependendo da plataforma/picker usado) chegaria ao S3 sem segunda checagem.
- **Tamanho máximo de arquivo — não encontrado no código**: buscas em `examService.ts`, `ExamsScreen.tsx`, `AddExamScreen.tsx` e `amplify/storage/resource.ts` não revelaram nenhum limite de tamanho de arquivo implementado (nem client-side nem nas regras de acesso do S3 `defineStorage`). Isso é uma lacuna de robustez: um arquivo muito grande pode falhar silenciosamente no upload (timeout) ou consumir armazenamento sem controle. Este EPIC deve introduzir um limite explícito (proposta: 10 MB, alinhado a práticas comuns para documentos médicos escaneados) validado antes do upload, com mensagem clara ("Arquivo muito grande. O tamanho máximo permitido é 10 MB.").
- **Nenhum registro órfão em caso de falha parcial**: se o upload ao S3 falhar, nenhum registro `MedicalDocument` deve ser criado no DynamoDB (já é o comportamento de `createExamDocument`, que faz upload antes de `saveDocumentMetadata` e propaga a exceção); se o upload for bem-sucedido mas a gravação no DynamoDB falhar, o arquivo órfão no S3 é uma lacuna conhecida (sem rollback automático) — documentar como risco aceito no MVP, não bloqueia o EPIC.
- **Botão desabilitado sempre com motivo (padrão já usado em 1d)**: o botão "Salvar documento" não pode ficar sempre habilitado independentemente do preenchimento dos campos — precisa refletir visualmente (bg/texto conforme `DESIGN_TOKENS.md` §4 "Disabled") quando `documentType`, `documentName`, `documentDate` (e `expirationDate` se Receita) não estão completos.
- **Nunca cor sozinha**: o estado selecionado do toggle Exame/Receita já combina borda + bg + cor de texto (não é cor isolada) — manter esse padrão.
- **Sem dado mockado (regra 2 da constituição)**: arquivo, tipo, nome e datas devem sempre ser persistidos via S3+DynamoDB reais — já é o caso hoje, sem pendência.
- **Acessibilidade de toque**: card de preview, toggle, campos e botão mantêm o piso de 48-56dp definido em `DESIGN_TOKENS.md` §3.
- **LGPD/dado sensível**: o arquivo é um documento médico — deve permanecer restrito ao path `medical-documents/{owner}/*` com autorização `allow.owner()`/`allow.authenticated` já configurada; nenhuma mudança de escopo de acesso deve ocorrer neste EPIC.

## 7. Critérios de aceite
- [ ] Card de preview do arquivo exibe nome + tamanho formatado (ex.: "1,2 MB") e um botão "remover" (×) funcional, que descarta a seleção e retorna à tela 3a — substituindo o atual botão de "editar" (lápis) sem `onPress`.
- [ ] Toggle "Tipo de documento" (Exame/Receita) segue o padrão de chip selecionado/não selecionado de `DESIGN_TOKENS.md` (borda+bg+texto), com nenhum tipo pré-selecionado ao abrir a tela.
- [ ] Campo "Data de validade" só é exibido quando Tipo = Receita, e só é campo obrigatório para habilitar o salvamento nesse caso.
- [ ] Botão "Salvar documento" fica visualmente desabilitado (bg `#DFE3E1`, texto `#7A8480`) enquanto `documentType`, `documentName`, `documentDate` (e `expirationDate` quando Receita) não estiverem todos preenchidos; fica habilitado (verde/branco) quando completos.
- [ ] Upload de PDF válido e de imagem válida (JPG/PNG) completam o fluxo validar → upload S3 → salvar DynamoDB → invalidar cache → voltar para 3a com sucesso.
- [ ] Arquivo com MIME type fora de `application/pdf`/`image/*` é rejeitado com mensagem clara antes de qualquer chamada de upload ao S3 (nova validação em `examService.ts` ou `AddExamScreen.tsx`, não apenas no filtro do picker da tela 3a).
- [ ] Arquivo acima do tamanho máximo definido (proposta: 10 MB) é rejeitado com mensagem clara antes do upload.
- [ ] Falha de upload (rede/S3) exibe mensagem de erro específica, não cria registro órfão no DynamoDB, e mantém os campos já preenchidos na tela para nova tentativa.
- [ ] Campos obrigatórios faltando (nome e/ou data do documento) impedem o salvamento via estado desabilitado do botão, não apenas via alerta reativo pós-toque.
- [ ] Tela funciona em light e dark mode com os pares de cor definidos em `DESIGN_TOKENS.md` (toggle selecionado/não selecionado, botão desabilitado/habilitado incluídos).
